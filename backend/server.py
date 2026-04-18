"""CreatorHub backend - FastAPI + MongoDB"""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, UploadFile, File, Query, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import jwt
import bcrypt
import uuid
import asyncio
import requests
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_REFRESH_SECRET = os.environ['JWT_REFRESH_SECRET']
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
APP_NAME = os.environ.get('APP_NAME', 'creatorhub')
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"

app = FastAPI(title="CreatorHub API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("creatorhub")

# =============== PERMISSIONS ===============
ALL_PERMISSIONS = [
    "dashboard_view", "analytics_view",
    "posts_view", "posts_edit",
    "tasks_view", "tasks_edit",
    "calendar_view",
    "automations_view", "automations_edit",
    "brand_deals_view", "brand_deals_edit",
    "ai_insights_view",
    "media_vault_view", "media_vault_edit",
    "team_view", "team_edit",
    "settings_view", "settings_edit",
]

ROLE_PERMISSIONS: Dict[str, List[str]] = {
    "owner": ALL_PERMISSIONS + ["workspace_manage", "transfer_ownership"],
    "admin": ALL_PERMISSIONS + ["workspace_manage"],
    "editor": [
        "dashboard_view", "analytics_view",
        "posts_view", "posts_edit",
        "tasks_view", "tasks_edit",
        "calendar_view",
        "automations_view", "automations_edit",
        "brand_deals_view", "brand_deals_edit",
        "ai_insights_view",
        "media_vault_view", "media_vault_edit",
    ],
    "scheduler": [
        "posts_view", "posts_edit",
        "tasks_view", "tasks_edit",
    ],
    "analyst": [
        "analytics_view",
        "posts_view",
        "tasks_view",
        "brand_deals_view",
    ],
    "viewer": [
        "dashboard_view",
        "posts_view",
    ],
}

def effective_permissions(role: str, custom: Optional[Dict[str, bool]] = None) -> List[str]:
    base = set(ROLE_PERMISSIONS.get(role, []))
    if custom:
        for k, v in custom.items():
            if v and k in ALL_PERMISSIONS + ["workspace_manage", "transfer_ownership"]:
                base.add(k)
            elif not v and k in base:
                base.discard(k)
    return sorted(base)

# =============== AUTH HELPERS ===============
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

def create_access_token(user_id: str, workspace_id: str) -> str:
    payload = {
        "sub": user_id,
        "ws": workspace_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
        "iat": datetime.now(timezone.utc),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def create_refresh_token(user_id: str, workspace_id: str) -> str:
    payload = {
        "sub": user_id,
        "ws": workspace_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=30),
        "iat": datetime.now(timezone.utc),
        "type": "refresh",
    }
    return jwt.encode(payload, JWT_REFRESH_SECRET, algorithm="HS256")

async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Dict[str, Any]:
    if not credentials:
        raise HTTPException(401, "Missing auth token")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(401, "User not found")
    user["permissions"] = effective_permissions(user["role"], user.get("custom_permissions"))
    return user

def require_permission(perm: str):
    async def _check(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        if user["role"] == "owner":
            return user
        if perm not in user["permissions"]:
            raise HTTPException(403, f"Permission '{perm}' required")
        return user
    return _check

# =============== MODELS ===============
class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    workspace_name: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class ChangePasswordRequest(BaseModel):
    current_password: Optional[str] = None
    new_password: str

class TaskIn(BaseModel):
    name: str
    type: str = "to-do"
    priority: str = "medium"
    date: str  # YYYY-MM-DD
    time: Optional[str] = "09:00"
    platform: Optional[str] = "both"
    notes: Optional[str] = ""
    assigned_to: Optional[str] = None

class TeamInviteIn(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = ""
    job_title: Optional[str] = ""
    temp_password: str
    role: str
    custom_permissions: Optional[Dict[str, bool]] = None

class TeamUpdateIn(BaseModel):
    role: Optional[str] = None
    custom_permissions: Optional[Dict[str, bool]] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    job_title: Optional[str] = None

class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    currency: Optional[str] = None
    timezone: Optional[str] = None
    date_format: Optional[str] = None

# =============== STORAGE ===============
_storage_key = None
def init_storage():
    global _storage_key
    if _storage_key:
        return _storage_key
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_LLM_KEY}, timeout=30)
        resp.raise_for_status()
        _storage_key = resp.json()["storage_key"]
        return _storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        return None

# =============== ROUTES: AUTH ===============
@api_router.post("/auth/signup")
async def signup(data: SignupRequest):
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(400, "Email already registered")
    workspace_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())
    ws_name = data.workspace_name or f"{data.name}'s Workspace"
    now = datetime.now(timezone.utc).isoformat()
    workspace = {
        "id": workspace_id,
        "name": ws_name,
        "owner_id": user_id,
        "currency": "USD",
        "timezone": "UTC",
        "date_format": "MM/DD/YYYY",
        "created_at": now,
    }
    user = {
        "id": user_id,
        "workspace_id": workspace_id,
        "name": data.name,
        "email": data.email.lower(),
        "password_hash": hash_password(data.password),
        "phone": "",
        "job_title": "Owner",
        "role": "owner",
        "custom_permissions": {},
        "status": "active",
        "must_change_password": False,
        "avatar_url": "",
        "last_active": now,
        "created_at": now,
    }
    await db.workspaces.insert_one(workspace)
    await db.users.insert_one(user)
    access = create_access_token(user_id, workspace_id)
    refresh = create_refresh_token(user_id, workspace_id)
    user_out = {k: v for k, v in user.items() if k not in ("password_hash", "_id")}
    user_out["permissions"] = effective_permissions(user["role"])
    return {"access_token": access, "refresh_token": refresh, "user": user_out}

@api_router.post("/auth/login")
async def login(data: LoginRequest):
    user = await db.users.find_one({"email": data.email.lower()})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    await db.users.update_one({"id": user["id"]}, {"$set": {"last_active": datetime.now(timezone.utc).isoformat(), "status": "active"}})
    access = create_access_token(user["id"], user["workspace_id"])
    refresh = create_refresh_token(user["id"], user["workspace_id"])
    user_out = {k: v for k, v in user.items() if k not in ("password_hash", "_id")}
    user_out["permissions"] = effective_permissions(user["role"], user.get("custom_permissions"))
    return {"access_token": access, "refresh_token": refresh, "user": user_out}

@api_router.post("/auth/refresh")
async def refresh_token(data: Dict[str, str]):
    token = data.get("refresh_token")
    if not token:
        raise HTTPException(400, "refresh_token required")
    try:
        payload = jwt.decode(token, JWT_REFRESH_SECRET, algorithms=["HS256"])
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid refresh token")
    access = create_access_token(payload["sub"], payload["ws"])
    return {"access_token": access}

@api_router.post("/auth/logout")
async def logout(user: Dict = Depends(get_current_user)):
    return {"ok": True}

@api_router.get("/auth/me")
async def me(user: Dict = Depends(get_current_user)):
    return user

@api_router.put("/auth/change-password")
async def change_password(data: ChangePasswordRequest, user: Dict = Depends(get_current_user)):
    full = await db.users.find_one({"id": user["id"]})
    if full.get("must_change_password"):
        pass  # skip current_password check on first login
    elif not data.current_password or not verify_password(data.current_password, full["password_hash"]):
        raise HTTPException(400, "Current password incorrect")
    if len(data.new_password) < 6:
        raise HTTPException(400, "Password too short (min 6 chars)")
    await db.users.update_one({"id": user["id"]}, {"$set": {
        "password_hash": hash_password(data.new_password),
        "must_change_password": False,
    }})
    return {"ok": True}

# =============== ROUTES: WORKSPACE & CONNECTIONS ===============
@api_router.get("/workspace")
async def get_workspace(user: Dict = Depends(get_current_user)):
    ws = await db.workspaces.find_one({"id": user["workspace_id"]}, {"_id": 0})
    return ws

@api_router.put("/workspace")
async def update_workspace(data: WorkspaceUpdate, user: Dict = Depends(require_permission("settings_edit"))):
    updates = {k: v for k, v in data.model_dump(exclude_none=True).items()}
    if updates:
        await db.workspaces.update_one({"id": user["workspace_id"]}, {"$set": updates})
    ws = await db.workspaces.find_one({"id": user["workspace_id"]}, {"_id": 0})
    return ws

@api_router.get("/connections")
async def list_connections(user: Dict = Depends(get_current_user)):
    conns = await db.platform_connections.find({"workspace_id": user["workspace_id"]}, {"_id": 0}).to_list(100)
    return conns

@api_router.post("/connections/{platform}/connect")
async def connect_mock(platform: str, user: Dict = Depends(require_permission("settings_edit"))):
    if platform not in ("instagram", "linkedin"):
        raise HTTPException(400, "Invalid platform")
    now = datetime.now(timezone.utc).isoformat()
    handle = "@janedoe" if platform == "instagram" else "Jane Doe"
    follower = 84200 if platform == "instagram" else 12400
    existing = await db.platform_connections.find_one({"workspace_id": user["workspace_id"], "platform": platform})
    if existing:
        await db.platform_connections.update_one(
            {"id": existing["id"]},
            {"$set": {"status": "connected", "last_synced_at": now}}
        )
    else:
        await db.platform_connections.insert_one({
            "id": str(uuid.uuid4()),
            "workspace_id": user["workspace_id"],
            "platform": platform,
            "account_handle": handle,
            "follower_count": follower,
            "status": "connected",
            "connected_at": now,
            "last_synced_at": now,
        })
    return {"ok": True, "platform": platform}

@api_router.delete("/connections/{platform}")
async def disconnect(platform: str, user: Dict = Depends(require_permission("settings_edit"))):
    await db.platform_connections.update_one(
        {"workspace_id": user["workspace_id"], "platform": platform},
        {"$set": {"status": "disconnected"}}
    )
    return {"ok": True}

@api_router.post("/connections/{platform}/sync")
async def sync_platform(platform: str, user: Dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    await db.platform_connections.update_one(
        {"workspace_id": user["workspace_id"], "platform": platform},
        {"$set": {"last_synced_at": now}}
    )
    return {"ok": True, "synced_at": now}

# =============== ROUTES: ANALYTICS ===============
@api_router.get("/analytics")
async def get_analytics(platform: str = "instagram", range_val: str = Query("30d", alias="range"), user: Dict = Depends(require_permission("analytics_view"))):
    days = {"7d": 7, "30d": 30, "90d": 90, "all": 365}.get(range_val, 30)
    since = (datetime.now(timezone.utc) - timedelta(days=days)).date().isoformat()
    snaps = await db.analytics_snapshots.find(
        {"workspace_id": user["workspace_id"], "platform": platform, "date": {"$gte": since}},
        {"_id": 0}
    ).sort("date", 1).to_list(500)
    prev_since = (datetime.now(timezone.utc) - timedelta(days=days * 2)).date().isoformat()
    prev_snaps = await db.analytics_snapshots.find(
        {"workspace_id": user["workspace_id"], "platform": platform, "date": {"$gte": prev_since, "$lt": since}},
        {"_id": 0}
    ).to_list(500)

    def total(lst, key):
        return sum(s.get(key, 0) for s in lst)

    def delta(curr, prev):
        if prev == 0:
            return 100 if curr else 0
        return round(((curr - prev) / prev) * 100, 1)

    curr_views = total(snaps, "views")
    prev_views = total(prev_snaps, "views")
    curr_reach = total(snaps, "reach")
    prev_reach = total(prev_snaps, "reach")
    curr_impr = total(snaps, "impressions")
    prev_impr = total(prev_snaps, "impressions")
    curr_prof = total(snaps, "profile_visits")
    prev_prof = total(prev_snaps, "profile_visits")
    curr_links = total(snaps, "link_clicks")
    prev_links = total(prev_snaps, "link_clicks")
    curr_new = total(snaps, "new_followers")
    prev_new = total(prev_snaps, "new_followers")

    engagement = round(sum(s.get("engagement_rate", 0) for s in snaps) / max(len(snaps), 1), 2)
    prev_engagement = round(sum(s.get("engagement_rate", 0) for s in prev_snaps) / max(len(prev_snaps), 1), 2)

    posts_count = await db.posts.count_documents({"workspace_id": user["workspace_id"], "platform": platform})
    avg_views = round(curr_views / max(posts_count, 1))

    # Weekly bars - last 8 weeks
    weekly = []
    for i in range(8):
        wstart = (datetime.now(timezone.utc) - timedelta(days=(7 - i) * 7)).date()
        wend = wstart + timedelta(days=7)
        wsnaps = [s for s in snaps if wstart.isoformat() <= s["date"] < wend.isoformat()]
        weekly.append({"week": f"W{i+1}", "views": total(wsnaps, "views")})

    # sparklines: last 7 days of views for stat cards
    spark = [{"d": s["date"], "v": s.get("views", 0)} for s in snaps[-7:]]

    # audience snapshot
    conn = await db.platform_connections.find_one({"workspace_id": user["workspace_id"], "platform": platform}, {"_id": 0})

    return {
        "stats": {
            "total_views": {"value": curr_views, "delta": delta(curr_views, prev_views)},
            "avg_views": {"value": avg_views, "delta": delta(avg_views, prev_views // max(posts_count, 1) if prev_snaps else 0)},
            "engagement_rate": {"value": engagement, "delta": delta(engagement, prev_engagement)},
            "new_followers": {"value": curr_new, "delta": delta(curr_new, prev_new)},
            "reach": {"value": curr_reach, "delta": delta(curr_reach, prev_reach)},
            "impressions": {"value": curr_impr, "delta": delta(curr_impr, prev_impr)},
            "profile_visits": {"value": curr_prof, "delta": delta(curr_prof, prev_prof)},
            "link_clicks": {"value": curr_links, "delta": delta(curr_links, prev_links)},
            "comments": {"value": total(snaps, "comments"), "delta": delta(total(snaps, "comments"), total(prev_snaps, "comments"))},
            "saves": {"value": total(snaps, "saves"), "delta": delta(total(snaps, "saves"), total(prev_snaps, "saves"))},
        },
        "weekly_views": weekly,
        "spark": spark,
        "follower_growth": [{"date": s["date"], "followers": s.get("followers", conn.get("follower_count", 0) if conn else 0)} for s in snaps],
        "platform": platform,
        "account_handle": conn.get("account_handle") if conn else None,
        "follower_count": conn.get("follower_count") if conn else 0,
        "last_synced_at": conn.get("last_synced_at") if conn else None,
    }

@api_router.get("/analytics/posts")
async def analytics_posts(
    platform: Optional[str] = None,
    type: Optional[str] = None,
    sort: str = "date",
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    user: Dict = Depends(require_permission("posts_view"))
):
    q: Dict[str, Any] = {"workspace_id": user["workspace_id"]}
    if platform and platform != "all":
        q["platform"] = platform
    if type and type != "all":
        q["type"] = type
    if search:
        q["title"] = {"$regex": search, "$options": "i"}
    sort_map = {"date": ("published_at", -1), "views": ("views", -1), "engagement": ("engagement_rate", -1), "saves": ("saves", -1)}
    sort_field, sort_dir = sort_map.get(sort, ("published_at", -1))
    total = await db.posts.count_documents(q)
    posts = await db.posts.find(q, {"_id": 0}).sort(sort_field, sort_dir).skip((page - 1) * page_size).limit(page_size).to_list(page_size)
    return {"posts": posts, "total": total, "page": page, "page_size": page_size}

@api_router.get("/analytics/audience")
async def analytics_audience(platform: str = "instagram", user: Dict = Depends(require_permission("analytics_view"))):
    # Hard-seeded audience data per platform
    ig = {
        "countries": [{"name": "United States", "flag": "🇺🇸", "pct": 42},
                      {"name": "United Kingdom", "flag": "🇬🇧", "pct": 18},
                      {"name": "Canada", "flag": "🇨🇦", "pct": 12},
                      {"name": "Australia", "flag": "🇦🇺", "pct": 9},
                      {"name": "Germany", "flag": "🇩🇪", "pct": 7}],
        "age_gender": [
            {"age": "18-24", "female": 22, "male": 8},
            {"age": "25-34", "female": 28, "male": 14},
            {"age": "35-44", "female": 11, "male": 9},
            {"age": "45+", "female": 5, "male": 3},
        ],
        "best_times": [{"slot": "Tue 7–9 PM", "score": 94}, {"slot": "Thu 6–8 PM", "score": 88}, {"slot": "Sun 10 AM", "score": 81}],
        "content_perf": [
            {"type": "Reels", "engagement": 7.8},
            {"type": "Carousels", "engagement": 5.2},
            {"type": "Photos", "engagement": 3.1},
            {"type": "Stories", "engagement": 4.4},
        ],
    }
    li = {
        "countries": [{"name": "United States", "flag": "🇺🇸", "pct": 51},
                      {"name": "India", "flag": "🇮🇳", "pct": 16},
                      {"name": "United Kingdom", "flag": "🇬🇧", "pct": 13},
                      {"name": "Germany", "flag": "🇩🇪", "pct": 8},
                      {"name": "Canada", "flag": "🇨🇦", "pct": 6}],
        "age_gender": [
            {"age": "18-24", "female": 4, "male": 6},
            {"age": "25-34", "female": 22, "male": 26},
            {"age": "35-44", "female": 16, "male": 18},
            {"age": "45+", "female": 3, "male": 5},
        ],
        "best_times": [{"slot": "Tue 8–10 AM", "score": 96}, {"slot": "Wed 12–1 PM", "score": 89}, {"slot": "Thu 5 PM", "score": 82}],
        "content_perf": [
            {"type": "Videos", "engagement": 6.2},
            {"type": "Carousels", "engagement": 8.1},
            {"type": "Photos", "engagement": 2.9},
            {"type": "Articles", "engagement": 4.1},
        ],
    }
    return ig if platform == "instagram" else li

# =============== ROUTES: POSTS ===============
@api_router.get("/posts/{post_id}")
async def get_post(post_id: str, user: Dict = Depends(require_permission("posts_view"))):
    post = await db.posts.find_one({"id": post_id, "workspace_id": user["workspace_id"]}, {"_id": 0})
    if not post:
        raise HTTPException(404, "Post not found")
    # hourly performance (mock generated)
    import random
    random.seed(hash(post_id) % 10000)
    hourly = [{"h": i, "v": random.randint(100, int(post.get("views", 1000) / 12))} for i in range(24)]
    post["hourly"] = hourly
    return post

# =============== ROUTES: TASKS (atomic calendar sync) ===============
@api_router.get("/tasks")
async def list_tasks(user: Dict = Depends(require_permission("tasks_view"))):
    tasks = await db.tasks.find({"workspace_id": user["workspace_id"]}, {"_id": 0}).to_list(500)
    today = datetime.now(timezone.utc).date().isoformat()
    overdue = [t for t in tasks if t.get("status") != "completed" and t.get("date", "") < today]
    today_list = [t for t in tasks if t.get("status") != "completed" and t.get("date", "") == today]
    upcoming = [t for t in tasks if t.get("status") != "completed" and t.get("date", "") > today]
    completed = [t for t in tasks if t.get("status") == "completed"]
    overdue.sort(key=lambda x: x.get("date", ""))
    today_list.sort(key=lambda x: x.get("time", ""))
    upcoming.sort(key=lambda x: x.get("date", ""))
    completed.sort(key=lambda x: x.get("date", ""), reverse=True)
    stats = {
        "total_this_week": len([t for t in tasks if t.get("date", "") >= today]),
        "completed": len(completed),
        "overdue": len(overdue),
        "due_today": len(today_list),
        "completion_rate": round(len(completed) / max(len(tasks), 1) * 100),
    }
    return {"overdue": overdue, "today": today_list, "upcoming": upcoming, "completed": completed, "stats": stats}

@api_router.post("/tasks")
async def create_task(data: TaskIn, user: Dict = Depends(require_permission("tasks_edit"))):
    task_id = str(uuid.uuid4())
    event_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    task_doc = {
        "id": task_id,
        "workspace_id": user["workspace_id"],
        "created_by": user["id"],
        "assigned_to": data.assigned_to or user["id"],
        "name": data.name,
        "type": data.type,
        "priority": data.priority,
        "date": data.date,
        "time": data.time or "09:00",
        "platform": data.platform or "both",
        "notes": data.notes or "",
        "status": "pending",
        "calendar_event_id": event_id,
        "created_at": now,
    }
    event_doc = {
        "id": event_id,
        "workspace_id": user["workspace_id"],
        "task_id": task_id,
        "title": data.name,
        "type": data.type,
        "date": data.date,
        "time": data.time or "09:00",
        "platform": data.platform or "both",
        "created_at": now,
    }
    try:
        await db.tasks.insert_one(task_doc)
        await db.calendar_events.insert_one(event_doc)
    except Exception as e:
        # rollback
        await db.tasks.delete_one({"id": task_id})
        await db.calendar_events.delete_one({"id": event_id})
        raise HTTPException(500, f"Failed to create task: {e}")
    task_doc.pop("_id", None)
    return task_doc

@api_router.put("/tasks/{task_id}")
async def update_task(task_id: str, data: Dict[str, Any], user: Dict = Depends(require_permission("tasks_edit"))):
    task = await db.tasks.find_one({"id": task_id, "workspace_id": user["workspace_id"]})
    if not task:
        raise HTTPException(404, "Task not found")
    allowed = {"name", "type", "priority", "date", "time", "platform", "notes", "status", "assigned_to"}
    updates = {k: v for k, v in data.items() if k in allowed}
    await db.tasks.update_one({"id": task_id}, {"$set": updates})
    if any(k in updates for k in ("name", "type", "date", "time", "platform")):
        ev_update = {
            "title": updates.get("name", task["name"]),
            "type": updates.get("type", task["type"]),
            "date": updates.get("date", task["date"]),
            "time": updates.get("time", task["time"]),
            "platform": updates.get("platform", task["platform"]),
        }
        await db.calendar_events.update_one({"id": task["calendar_event_id"]}, {"$set": ev_update})
    updated = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    return updated

@api_router.put("/tasks/{task_id}/complete")
async def complete_task(task_id: str, user: Dict = Depends(require_permission("tasks_edit"))):
    task = await db.tasks.find_one({"id": task_id, "workspace_id": user["workspace_id"]})
    if not task:
        raise HTTPException(404, "Task not found")
    new_status = "pending" if task.get("status") == "completed" else "completed"
    await db.tasks.update_one({"id": task_id}, {"$set": {"status": new_status}})
    return {"ok": True, "status": new_status}

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user: Dict = Depends(require_permission("tasks_edit"))):
    task = await db.tasks.find_one({"id": task_id, "workspace_id": user["workspace_id"]})
    if not task:
        raise HTTPException(404, "Task not found")
    await db.tasks.delete_one({"id": task_id})
    await db.calendar_events.delete_one({"id": task.get("calendar_event_id", "")})
    return {"ok": True}

# =============== ROUTES: CALENDAR ===============
@api_router.get("/calendar")
async def calendar_month(month: int, year: int, user: Dict = Depends(require_permission("calendar_view"))):
    start = f"{year:04d}-{month:02d}-01"
    if month == 12:
        end = f"{year+1:04d}-01-01"
    else:
        end = f"{year:04d}-{month+1:02d}-01"
    events = await db.calendar_events.find(
        {"workspace_id": user["workspace_id"], "date": {"$gte": start, "$lt": end}},
        {"_id": 0}
    ).to_list(500)
    return {"events": events}

@api_router.get("/calendar/day")
async def calendar_day(date: str, user: Dict = Depends(require_permission("calendar_view"))):
    events = await db.calendar_events.find(
        {"workspace_id": user["workspace_id"], "date": date},
        {"_id": 0}
    ).sort("time", 1).to_list(200)
    return {"events": events}

# =============== ROUTES: TEAM ===============
@api_router.get("/team")
async def list_team(user: Dict = Depends(require_permission("team_view"))):
    members = await db.users.find(
        {"workspace_id": user["workspace_id"]},
        {"_id": 0, "password_hash": 0}
    ).to_list(200)
    for m in members:
        m["permissions"] = effective_permissions(m["role"], m.get("custom_permissions"))
    invites = await db.team_invites.find(
        {"workspace_id": user["workspace_id"], "status": "pending"},
        {"_id": 0}
    ).to_list(100)
    today = datetime.now(timezone.utc).date().isoformat()
    active_today = sum(1 for m in members if (m.get("last_active", "") or "").startswith(today))
    stats = {"total": len(members), "pending": len(invites), "active_today": active_today}
    return {"members": members, "invites": invites, "stats": stats}

@api_router.post("/team/invite")
async def invite_member(data: TeamInviteIn, user: Dict = Depends(require_permission("team_edit"))):
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(400, "Email already in use")
    if data.role not in ROLE_PERMISSIONS:
        raise HTTPException(400, "Invalid role")
    # enforce: cannot grant what you don't have
    granter_perms = set(effective_permissions(user["role"], user.get("custom_permissions")))
    role_perms = set(ROLE_PERMISSIONS[data.role])
    custom = data.custom_permissions or {}
    for perm, on in custom.items():
        if on and perm not in granter_perms and user["role"] != "owner":
            raise HTTPException(403, f"You cannot grant '{perm}' — you don't have it.")
    now = datetime.now(timezone.utc).isoformat()
    user_id = str(uuid.uuid4())
    member = {
        "id": user_id,
        "workspace_id": user["workspace_id"],
        "name": data.name,
        "email": data.email.lower(),
        "password_hash": hash_password(data.temp_password),
        "phone": data.phone or "",
        "job_title": data.job_title or "",
        "role": data.role,
        "custom_permissions": custom,
        "status": "active",
        "must_change_password": True,
        "avatar_url": "",
        "last_active": now,
        "created_at": now,
    }
    await db.users.insert_one(member)
    await db.team_invites.insert_one({
        "id": str(uuid.uuid4()),
        "workspace_id": user["workspace_id"],
        "email": data.email.lower(),
        "role": data.role,
        "custom_permissions": custom,
        "sent_at": now,
        "accepted_at": None,
        "status": "sent",
        "user_id": user_id,
    })
    out = {k: v for k, v in member.items() if k not in ("password_hash", "_id")}
    out["permissions"] = effective_permissions(member["role"], member.get("custom_permissions"))
    out["temp_password"] = data.temp_password  # returned once for "copy credentials"
    return out

@api_router.put("/team/{user_id}")
async def update_member(user_id: str, data: TeamUpdateIn, user: Dict = Depends(require_permission("team_edit"))):
    target = await db.users.find_one({"id": user_id, "workspace_id": user["workspace_id"]})
    if not target:
        raise HTTPException(404, "Member not found")
    if target.get("role") == "owner" and user["role"] != "owner":
        raise HTTPException(403, "Only owner can modify owner")
    updates = {k: v for k, v in data.model_dump(exclude_none=True).items()}
    if "role" in updates and updates["role"] not in ROLE_PERMISSIONS:
        raise HTTPException(400, "Invalid role")
    if "custom_permissions" in updates:
        granter_perms = set(effective_permissions(user["role"], user.get("custom_permissions")))
        for perm, on in updates["custom_permissions"].items():
            if on and perm not in granter_perms and user["role"] != "owner":
                raise HTTPException(403, f"You cannot grant '{perm}'.")
    if updates:
        await db.users.update_one({"id": user_id}, {"$set": updates})
    m = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    m["permissions"] = effective_permissions(m["role"], m.get("custom_permissions"))
    return m

@api_router.delete("/team/{user_id}")
async def remove_member(user_id: str, user: Dict = Depends(require_permission("team_edit"))):
    target = await db.users.find_one({"id": user_id, "workspace_id": user["workspace_id"]})
    if not target:
        raise HTTPException(404, "Member not found")
    if target.get("role") == "owner":
        raise HTTPException(403, "Cannot remove owner")
    await db.users.delete_one({"id": user_id})
    await db.team_invites.delete_many({"user_id": user_id})
    return {"ok": True}

@api_router.get("/team/{user_id}/activity")
async def member_activity(user_id: str, user: Dict = Depends(require_permission("team_view"))):
    # Return mock recent activity
    activities = [
        {"action": "Published Instagram Reel — 'Morning Routine'", "at": "Today 11:42am"},
        {"action": "Completed task — 'Reply to Nike brief'", "at": "Today 9:18am"},
        {"action": "Updated caption template — 'Promo launch'", "at": "Yesterday 4:30pm"},
        {"action": "Created calendar event — 'Samsung call'", "at": "Yesterday 10:05am"},
        {"action": "Logged in", "at": "2 days ago"},
    ]
    return {"activity": activities}

@api_router.get("/team/permissions/catalog")
async def permissions_catalog(user: Dict = Depends(get_current_user)):
    groups = {
        "Analytics": ["dashboard_view", "analytics_view"],
        "Posts & content": ["posts_view", "posts_edit"],
        "Automations": ["automations_view", "automations_edit"],
        "Tasks & calendar": ["tasks_view", "tasks_edit", "calendar_view"],
        "Brand deals": ["brand_deals_view", "brand_deals_edit"],
        "AI & media": ["ai_insights_view", "media_vault_view", "media_vault_edit"],
        "Team & settings": ["team_view", "team_edit", "settings_view", "settings_edit"],
    }
    granter_perms = effective_permissions(user["role"], user.get("custom_permissions"))
    return {
        "groups": groups,
        "role_defaults": ROLE_PERMISSIONS,
        "granter_permissions": granter_perms,
    }

# =============== ROUTES: BRAND DEALS (basic, read for analyst) ===============
@api_router.get("/deals")
async def list_deals(user: Dict = Depends(require_permission("brand_deals_view"))):
    deals = await db.brand_deals.find({"workspace_id": user["workspace_id"]}, {"_id": 0}).to_list(200)
    pipeline_value = sum(d.get("value", 0) for d in deals if d.get("stage") not in ("completed",))
    signed = [d for d in deals if d.get("stage") == "signed"]
    avg_size = round(sum(d.get("value", 0) for d in deals) / max(len(deals), 1))
    return {
        "deals": deals,
        "stats": {
            "pipeline_value": pipeline_value,
            "signed_this_month": len(signed),
            "avg_deal_size": avg_size,
            "avg_response_time": "6h",
        },
    }

# =============== ROUTES: AI INSIGHTS (Claude Sonnet 4.5) ===============
@api_router.get("/insights")
async def get_insights(platform: str = "instagram", user: Dict = Depends(require_permission("ai_insights_view"))):
    # Build analytics context
    snaps = await db.analytics_snapshots.find(
        {"workspace_id": user["workspace_id"], "platform": platform},
        {"_id": 0}
    ).sort("date", -1).limit(30).to_list(30)
    posts = await db.posts.find({"workspace_id": user["workspace_id"], "platform": platform}, {"_id": 0}).limit(10).to_list(10)

    # Fallback static insights if LLM fails
    fallback = [
        {"title": "Reels outperform carousels 2.5×", "description": f"Your last 3 Reels averaged 8.4% engagement vs 3.1% on photos. Shift 60% of your {platform} content to short-form video this month.", "icon": "trending-up", "color": "#22c55e"},
        {"title": "Best posting window: Tue 7–9 PM", "description": "Posts published in this window got 38% higher reach. Schedule your next 5 posts here.", "icon": "clock", "color": "#7c3aed"},
        {"title": "Hook retention drops at 3s", "description": "Your top Reels kept viewers past second 3. Add a pattern-break before 2s in your next 3 scripts.", "icon": "activity", "color": "#f59e0b"},
        {"title": "Cross-post to LinkedIn", "description": "Your top IG carousel would outperform 82% of your LinkedIn posts based on format fit.", "icon": "share-2", "color": "#0A66C2"},
    ]

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"insights-{user['workspace_id']}-{platform}",
            system_message="You are an expert social media growth analyst for Instagram and LinkedIn creators. Return ONLY a JSON array of 4 insights with keys: title (short punchy), description (2-3 lines with specific data points), type (one of: posting_time, content_format, engagement_pattern, cross_platform). No prose outside JSON."
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        summary = {
            "platform": platform,
            "recent_engagement": [s.get("engagement_rate") for s in snaps[:7]],
            "total_views_30d": sum(s.get("views", 0) for s in snaps),
            "avg_new_followers": round(sum(s.get("new_followers", 0) for s in snaps) / max(len(snaps), 1)),
            "top_posts": [{"title": p.get("title"), "type": p.get("type"), "views": p.get("views"), "engagement": p.get("engagement_rate")} for p in posts[:5]],
        }
        msg = UserMessage(text=f"Creator analytics summary:\n{summary}\n\nReturn JSON array of 4 insights.")
        resp = await asyncio.wait_for(chat.send_message(msg), timeout=15)
        import json
        text = resp.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        parsed = json.loads(text.strip())
        if isinstance(parsed, list) and len(parsed) >= 3:
            type_colors = {"posting_time": "#7c3aed", "content_format": "#22c55e", "engagement_pattern": "#f59e0b", "cross_platform": "#0A66C2"}
            type_icons = {"posting_time": "clock", "content_format": "trending-up", "engagement_pattern": "activity", "cross_platform": "share-2"}
            return {"insights": [{**i, "color": type_colors.get(i.get("type", ""), "#7c3aed"), "icon": type_icons.get(i.get("type", ""), "sparkles")} for i in parsed]}
    except Exception as e:
        logger.warning(f"AI insights fallback: {e}")
    return {"insights": fallback}

@api_router.get("/insights/score")
async def get_score(platform: str = "instagram", user: Dict = Depends(require_permission("ai_insights_view"))):
    # Heuristic score
    snaps = await db.analytics_snapshots.find(
        {"workspace_id": user["workspace_id"], "platform": platform},
        {"_id": 0}
    ).sort("date", -1).limit(30).to_list(30)
    consistency = min(100, len(snaps) * 3)
    engagement_avg = sum(s.get("engagement_rate", 0) for s in snaps) / max(len(snaps), 1)
    engagement_quality = min(100, round(engagement_avg * 12))
    content_variety = 78 if platform == "instagram" else 64
    response_time = 82
    score = round((consistency + engagement_quality + content_variety + response_time) / 4)
    label = "Excellent" if score >= 85 else "Good" if score >= 70 else "Fair" if score >= 50 else "Poor"
    return {
        "score": score,
        "label": label,
        "breakdown": [
            {"label": "Posting consistency", "value": consistency},
            {"label": "Engagement quality", "value": engagement_quality},
            {"label": "Content variety", "value": content_variety},
            {"label": "Response time", "value": response_time},
        ],
    }

# =============== ROUTES: DASHBOARD summary ===============
@api_router.get("/dashboard")
async def dashboard(platform: str = "instagram", range_val: str = Query("7d", alias="range"), user: Dict = Depends(get_current_user)):
    if "dashboard_view" not in effective_permissions(user["role"], user.get("custom_permissions")) and user["role"] != "owner":
        raise HTTPException(403, "Permission 'dashboard_view' required")
    days = {"7d": 7, "30d": 30, "90d": 90, "all": 365}.get(range_val, 7)
    since = (datetime.now(timezone.utc) - timedelta(days=days)).date().isoformat()
    snaps = await db.analytics_snapshots.find(
        {"workspace_id": user["workspace_id"], "platform": platform, "date": {"$gte": since}},
        {"_id": 0}
    ).sort("date", 1).to_list(500)

    posts = await db.posts.find({"workspace_id": user["workspace_id"], "platform": platform}, {"_id": 0}).sort("views", -1).limit(1).to_list(1)
    top_post = posts[0] if posts else None

    # Today's tasks
    today = datetime.now(timezone.utc).date().isoformat()
    today_tasks = await db.tasks.find(
        {"workspace_id": user["workspace_id"], "status": {"$ne": "completed"}, "date": {"$lte": today}},
        {"_id": 0}
    ).sort("date", 1).limit(5).to_list(5)
    upcoming_events = await db.calendar_events.find(
        {"workspace_id": user["workspace_id"], "date": {"$gte": today}},
        {"_id": 0}
    ).sort("date", 1).limit(3).to_list(3)

    def total(lst, key): return sum(s.get(key, 0) for s in lst)

    weekly = []
    for i in range(8):
        wstart = (datetime.now(timezone.utc) - timedelta(days=(8 - i) * 7)).date()
        wend = wstart + timedelta(days=7)
        all_snaps = await db.analytics_snapshots.find(
            {"workspace_id": user["workspace_id"], "platform": platform, "date": {"$gte": wstart.isoformat(), "$lt": wend.isoformat()}},
            {"_id": 0}
        ).to_list(100)
        weekly.append({"week": wstart.strftime("%b %d"), "views": total(all_snaps, "views")})

    conn = await db.platform_connections.find_one({"workspace_id": user["workspace_id"], "platform": platform}, {"_id": 0})

    stats = {
        "total_views": {"value": total(snaps, "views"), "delta": 12.4},
        "avg_views": {"value": round(total(snaps, "views") / max(len(snaps), 1)), "delta": 8.1},
        "engagement_rate": {"value": round(sum(s.get("engagement_rate", 0) for s in snaps) / max(len(snaps), 1), 2), "delta": 3.2},
        "new_followers": {"value": total(snaps, "new_followers"), "delta": 18.7},
        "comments": {"value": total(snaps, "comments"), "delta": 6.3},
        "saves": {"value": total(snaps, "saves"), "delta": 14.2},
        "profile_visits": {"value": total(snaps, "profile_visits"), "delta": -2.1},
        "link_clicks": {"value": total(snaps, "link_clicks"), "delta": 9.8},
    }
    # sparklines per stat
    def spark(key):
        return [{"d": s["date"], "v": s.get(key, 0)} for s in snaps[-7:]]
    for k in list(stats.keys()):
        stats[k]["spark"] = spark({"total_views": "views", "avg_views": "views", "engagement_rate": "engagement_rate",
                                    "new_followers": "new_followers", "comments": "comments", "saves": "saves",
                                    "profile_visits": "profile_visits", "link_clicks": "link_clicks"}[k])
    return {
        "stats": stats,
        "weekly_views": weekly,
        "top_post": top_post,
        "today_tasks": today_tasks,
        "upcoming_events": upcoming_events,
        "connection": conn,
    }

# =============== ROUTES: MEDIA ===============
@api_router.get("/media")
async def list_media(user: Dict = Depends(require_permission("media_vault_view"))):
    files = await db.media_files.find({"workspace_id": user["workspace_id"], "is_deleted": {"$ne": True}}, {"_id": 0}).to_list(200)
    total_bytes = sum(f.get("file_size", 0) for f in files)
    return {"files": files, "total_bytes": total_bytes, "limit_bytes": 50 * 1024 * 1024 * 1024}

@api_router.post("/media/upload")
async def upload_media(file: UploadFile = File(...), user: Dict = Depends(require_permission("media_vault_edit"))):
    data = await file.read()
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "bin"
    path = f"{APP_NAME}/uploads/{user['workspace_id']}/{uuid.uuid4()}.{ext}"
    key = init_storage()
    if not key:
        raise HTTPException(500, "Storage unavailable")
    try:
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": file.content_type or "application/octet-stream"},
            data=data, timeout=120
        )
        resp.raise_for_status()
        result = resp.json()
    except Exception as e:
        raise HTTPException(500, f"Upload failed: {e}")
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid.uuid4()),
        "workspace_id": user["workspace_id"],
        "uploaded_by": user["id"],
        "filename": file.filename,
        "file_type": ext,
        "content_type": file.content_type,
        "storage_path": result["path"],
        "file_size": result["size"],
        "is_deleted": False,
        "created_at": now,
    }
    await db.media_files.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.delete("/media/{file_id}")
async def delete_media(file_id: str, user: Dict = Depends(require_permission("media_vault_edit"))):
    await db.media_files.update_one({"id": file_id, "workspace_id": user["workspace_id"]}, {"$set": {"is_deleted": True}})
    return {"ok": True}

@api_router.get("/media/file/{file_id}")
async def get_media_file(file_id: str, auth: str = Query(None)):
    # Use query-param token (for <img src>)
    if not auth:
        raise HTTPException(401, "auth query param required")
    try:
        payload = jwt.decode(auth, JWT_SECRET, algorithms=["HS256"])
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")
    u = await db.users.find_one({"id": payload["sub"]})
    if not u:
        raise HTTPException(401, "User not found")
    record = await db.media_files.find_one({"id": file_id, "workspace_id": u["workspace_id"], "is_deleted": False})
    if not record:
        raise HTTPException(404, "File not found")
    key = init_storage()
    r = requests.get(f"{STORAGE_URL}/objects/{record['storage_path']}", headers={"X-Storage-Key": key}, timeout=60)
    r.raise_for_status()
    return Response(content=r.content, media_type=record.get("content_type", "application/octet-stream"))

# =============== ROUTES: CAPTIONS & HASHTAGS ===============
@api_router.get("/captions")
async def list_captions(user: Dict = Depends(require_permission("media_vault_view"))):
    items = await db.captions.find({"workspace_id": user["workspace_id"]}, {"_id": 0}).to_list(200)
    return items

@api_router.get("/hashtags")
async def list_hashtags(user: Dict = Depends(require_permission("media_vault_view"))):
    items = await db.hashtag_sets.find({"workspace_id": user["workspace_id"]}, {"_id": 0}).to_list(200)
    return items

# =============== INCLUDE & MIDDLEWARE ===============
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    try:
        init_storage()
    except Exception as e:
        logger.warning(f"Storage init failed: {e}")
    # Seed if empty
    count = await db.users.count_documents({})
    if count == 0:
        try:
            from seed_data import seed_all
            await seed_all(db)
            logger.info("Seeded demo data")
        except Exception as e:
            logger.error(f"Seed failed: {e}", exc_info=True)

@app.on_event("shutdown")
async def shutdown():
    client.close()

@api_router.get("/")
async def root():
    return {"message": "CreatorHub API", "version": "1.0"}

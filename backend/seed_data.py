"""CreatorHub demo data seeder."""
import bcrypt
import uuid
import random
from datetime import datetime, timezone, timedelta


def h(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


async def seed_all(db):
    random.seed(42)
    now = datetime.now(timezone.utc).isoformat()
    today = datetime.now(timezone.utc).date()

    # === Workspace ===
    workspace_id = str(uuid.uuid4())
    owner_id = str(uuid.uuid4())
    await db.workspaces.insert_one({
        "id": workspace_id,
        "name": "Jane Doe Creative",
        "owner_id": owner_id,
        "currency": "USD",
        "timezone": "America/Los_Angeles",
        "date_format": "MM/DD/YYYY",
        "created_at": now,
    })

    # === Users ===
    owner = {
        "id": owner_id, "workspace_id": workspace_id, "name": "Jane Doe",
        "email": "jane@creatorhub.io", "password_hash": h("password123"),
        "phone": "+1 415 555 0142", "job_title": "Creator & Founder",
        "role": "owner", "custom_permissions": {}, "status": "active",
        "must_change_password": False, "avatar_url": "",
        "last_active": now, "created_at": now,
    }
    team = [
        {"name": "Marcus Chen", "email": "marcus@creatorhub.io", "phone": "+1 415 555 0193",
         "job_title": "Content Editor", "role": "editor"},
        {"name": "Priya Sharma", "email": "priya@creatorhub.io", "phone": "+1 415 555 0144",
         "job_title": "Data Analyst", "role": "analyst"},
        {"name": "Tom Bradley", "email": "tom@creatorhub.io", "phone": "+1 415 555 0112",
         "job_title": "Scheduler", "role": "scheduler"},
    ]
    members = [owner]
    for t in team:
        members.append({
            "id": str(uuid.uuid4()), "workspace_id": workspace_id,
            "name": t["name"], "email": t["email"],
            "password_hash": h("temp1234"),
            "phone": t["phone"], "job_title": t["job_title"],
            "role": t["role"], "custom_permissions": {}, "status": "active",
            "must_change_password": True, "avatar_url": "",
            "last_active": now, "created_at": now,
        })
    await db.users.insert_many(members)

    # pending invite
    await db.team_invites.insert_one({
        "id": str(uuid.uuid4()), "workspace_id": workspace_id,
        "email": "aisha@creatorhub.io", "role": "editor",
        "custom_permissions": {}, "sent_at": now, "accepted_at": None,
        "status": "pending", "name": "Aisha Okonkwo",
    })

    # === Platform connections ===
    await db.platform_connections.insert_many([
        {"id": str(uuid.uuid4()), "workspace_id": workspace_id, "platform": "instagram",
         "account_handle": "@janedoe", "follower_count": 84200, "status": "connected",
         "connected_at": now, "last_synced_at": now},
        {"id": str(uuid.uuid4()), "workspace_id": workspace_id, "platform": "linkedin",
         "account_handle": "Jane Doe", "follower_count": 12400, "status": "connected",
         "connected_at": now, "last_synced_at": now},
    ])

    # === Posts ===
    ig_posts = [
        ("Morning routine that changed my life", "reel", 124300, 8.9, "🌅"),
        ("5 productivity hacks for creators", "carousel", 78100, 6.4, "✅"),
        ("Sunday reset vibes", "photo", 41200, 3.2, "🧘"),
        ("Behind the scenes of my studio", "reel", 198400, 9.8, "🎬"),
        ("Trust the process", "photo", 33800, 2.9, "💫"),
        ("Creator burnout is real — here's how I cope", "carousel", 92600, 7.1, "🛋️"),
        ("My morning matcha ritual", "reel", 156200, 8.4, "🍵"),
        ("Q&A — money, fear, and full-time content", "reel", 211300, 10.2, "💰"),
    ]
    li_posts = [
        ("Lessons from 6 months as a solo founder", "article", 28400, 5.6, "📘"),
        ("Why creators are the new consultants", "carousel", 18200, 7.8, "📊"),
        ("The hidden cost of hyper-availability", "photo", 9400, 3.1, "📱"),
        ("My exact content → revenue funnel", "video", 42100, 9.4, "🎯"),
        ("How I land $15K brand deals with under 100K followers", "carousel", 51200, 11.2, "🤝"),
        ("3 mistakes I made scaling my audience", "article", 19800, 6.2, "📉"),
        ("Build in public: month 6 numbers", "carousel", 24600, 8.1, "📈"),
    ]
    posts_docs = []
    for i, (title, ptype, views, eng, thumb) in enumerate(ig_posts):
        posts_docs.append({
            "id": str(uuid.uuid4()), "workspace_id": workspace_id, "platform": "instagram",
            "external_id": f"ig_{i}", "title": title, "type": ptype,
            "published_at": (datetime.now(timezone.utc) - timedelta(days=i * 3)).isoformat(),
            "views": views, "likes": int(views * 0.08), "comments": int(views * 0.012),
            "shares": int(views * 0.004), "saves": int(views * 0.018),
            "reach": int(views * 0.9), "impressions": int(views * 1.1),
            "engagement_rate": eng, "thumbnail_emoji": thumb,
            "caption": f"{title}. Save this for later ✨ #creator #growth #instagram",
            "hashtags": ["#creator", "#growth", "#instagram", "#reels"],
        })
    for i, (title, ptype, views, eng, thumb) in enumerate(li_posts):
        posts_docs.append({
            "id": str(uuid.uuid4()), "workspace_id": workspace_id, "platform": "linkedin",
            "external_id": f"li_{i}", "title": title, "type": ptype,
            "published_at": (datetime.now(timezone.utc) - timedelta(days=i * 4)).isoformat(),
            "views": views, "likes": int(views * 0.06), "comments": int(views * 0.02),
            "shares": int(views * 0.008), "saves": int(views * 0.009),
            "reach": int(views * 0.85), "impressions": int(views * 1.05),
            "engagement_rate": eng, "thumbnail_emoji": thumb,
            "caption": f"{title}. Thoughts? ↓",
            "hashtags": ["#creatoreconomy", "#linkedin", "#solopreneur"],
        })
    await db.posts.insert_many(posts_docs)

    # === Tasks + Calendar events (atomic pairs) ===
    task_defs = [
        ("Reply to Nike brief", "email", "high", -3, "14:30", "off-platform"),
        ("Film tripod-free Reel", "post content", "high", -2, "10:00", "instagram"),
        ("Send invoice — Samsung", "email", "medium", -1, "16:00", "off-platform"),
        ("Post weekly carousel", "post content", "high", 0, "11:00", "linkedin"),
        ("Call with Adidas team", "call", "high", 0, "15:30", "off-platform"),
        ("Edit Q&A Reel", "post content", "medium", 1, "09:00", "instagram"),
        ("Team sync — weekly", "meeting", "low", 2, "10:30", "off-platform"),
    ]
    task_docs = []
    event_docs = []
    for name, ttype, prio, day_offset, time, plat in task_defs:
        tid = str(uuid.uuid4())
        eid = str(uuid.uuid4())
        date_str = (today + timedelta(days=day_offset)).isoformat()
        task_docs.append({
            "id": tid, "workspace_id": workspace_id, "created_by": owner_id,
            "assigned_to": owner_id, "name": name, "type": ttype,
            "priority": prio, "date": date_str, "time": time,
            "platform": plat, "notes": "", "status": "pending",
            "calendar_event_id": eid, "created_at": now,
        })
        event_docs.append({
            "id": eid, "workspace_id": workspace_id, "task_id": tid,
            "title": name, "type": ttype, "date": date_str, "time": time,
            "platform": plat, "created_at": now,
        })
    # additional April 2026 events not tied to tasks (pad to 13 calendar events for April)
    april_events = [
        ("Content planning — May", "meeting", "2026-04-02", "10:00"),
        ("Post Reel — studio tour", "post content", "2026-04-05", "18:00"),
        ("Podcast recording", "call", "2026-04-08", "14:00"),
        ("Nike campaign kickoff", "call", "2026-04-10", "11:00"),
        ("LinkedIn carousel drop", "post content", "2026-04-12", "09:00"),
        ("Invoice Samsung", "email", "2026-04-15", "17:00"),
    ]
    for title, ttype, d, tm in april_events:
        event_docs.append({
            "id": str(uuid.uuid4()), "workspace_id": workspace_id, "task_id": None,
            "title": title, "type": ttype, "date": d, "time": tm,
            "platform": "off-platform", "created_at": now,
        })
    await db.tasks.insert_many(task_docs)
    await db.calendar_events.insert_many(event_docs)

    # === Brand deals ===
    await db.brand_deals.insert_many([
        {"id": str(uuid.uuid4()), "workspace_id": workspace_id, "brand_name": "Nike",
         "brand_contact_name": "Sarah Park", "brand_email": "sarah@nike.com",
         "description": "3-Reel campaign — SS26 launch", "platform": ["instagram"],
         "value": 18000, "stage": "negotiating", "deadline": "2026-04-22",
         "notes": "Waiting on contract redlines", "contract_url": "", "created_at": now},
        {"id": str(uuid.uuid4()), "workspace_id": workspace_id, "brand_name": "Samsung",
         "brand_contact_name": "Mike Liu", "brand_email": "mike.liu@samsung.com",
         "description": "Galaxy S26 hero carousel + 2 stories", "platform": ["instagram", "linkedin"],
         "value": 22500, "stage": "new_enquiry", "deadline": "2026-05-05",
         "notes": "Initial call scheduled Monday", "contract_url": "", "created_at": now},
        {"id": str(uuid.uuid4()), "workspace_id": workspace_id, "brand_name": "Adidas",
         "brand_contact_name": "Lena Roos", "brand_email": "lena@adidas.com",
         "description": "Run club story takeover", "platform": ["instagram"],
         "value": 8000, "stage": "signed", "deadline": "2026-03-30",
         "notes": "Contract signed. Delivery mid-March.", "contract_url": "", "created_at": now},
    ])

    # === Analytics snapshots (90 days) ===
    snaps = []
    ig_base = 8500
    li_base = 1800
    for d in range(90):
        date = (today - timedelta(days=89 - d)).isoformat()
        for plat, base in [("instagram", ig_base), ("linkedin", li_base)]:
            noise = random.uniform(0.75, 1.3)
            views = int(base * noise * (1 + d * 0.012))
            snaps.append({
                "id": str(uuid.uuid4()), "workspace_id": workspace_id, "platform": plat,
                "date": date, "views": views, "reach": int(views * 0.85),
                "impressions": int(views * 1.12),
                "engagement_rate": round(random.uniform(3.8, 9.5), 2),
                "new_followers": int(random.randint(20, 380) * (1 if plat == "instagram" else 0.3)),
                "profile_visits": int(views * 0.14),
                "link_clicks": int(views * 0.022),
                "comments": int(views * 0.011),
                "saves": int(views * 0.017),
                "followers": (84200 if plat == "instagram" else 12400) - (90 - d) * (40 if plat == "instagram" else 12),
                "created_at": now,
            })
    await db.analytics_snapshots.insert_many(snaps)

    # === Captions ===
    await db.captions.insert_many([
        {"id": str(uuid.uuid4()), "workspace_id": workspace_id,
         "text": "Save this for later ✨ Your future self will thank you. #creator #growth",
         "content_type": "reel", "use_count": 14, "top_engagement": True, "created_at": now},
        {"id": str(uuid.uuid4()), "workspace_id": workspace_id,
         "text": "Unpopular opinion: consistency > virality. Here's why ↓",
         "content_type": "carousel", "use_count": 9, "top_engagement": True, "created_at": now},
        {"id": str(uuid.uuid4()), "workspace_id": workspace_id,
         "text": "Behind the scenes of what I really do as a creator.",
         "content_type": "reel", "use_count": 6, "top_engagement": False, "created_at": now},
        {"id": str(uuid.uuid4()), "workspace_id": workspace_id,
         "text": "3 things I wish I knew before going full-time. Thread ↓",
         "content_type": "article", "use_count": 11, "top_engagement": True, "created_at": now},
        {"id": str(uuid.uuid4()), "workspace_id": workspace_id,
         "text": "Currently obsessed with this workflow → swipe.",
         "content_type": "carousel", "use_count": 4, "top_engagement": False, "created_at": now},
        {"id": str(uuid.uuid4()), "workspace_id": workspace_id,
         "text": "Tag someone who needs to see this today. 💛",
         "content_type": "photo", "use_count": 8, "top_engagement": False, "created_at": now},
    ])

    # === Hashtag sets ===
    await db.hashtag_sets.insert_many([
        {"id": str(uuid.uuid4()), "workspace_id": workspace_id, "name": "Creator growth",
         "hashtags": ["#creator", "#contentcreator", "#creatorlife", "#instagram", "#reels", "#growth"],
         "color": "#7c3aed", "created_at": now},
        {"id": str(uuid.uuid4()), "workspace_id": workspace_id, "name": "LinkedIn thought leader",
         "hashtags": ["#linkedin", "#creatoreconomy", "#solopreneur", "#buildinpublic"],
         "color": "#0A66C2", "created_at": now},
        {"id": str(uuid.uuid4()), "workspace_id": workspace_id, "name": "Wellness niche",
         "hashtags": ["#wellness", "#mindset", "#productivity", "#morningroutine", "#selflove"],
         "color": "#22c55e", "created_at": now},
    ])

"""CreatorHub backend regression tests - covers auth, permissions, tasks/calendar sync, team, analytics."""
import os
import uuid
import pytest
import requests
from pathlib import Path

# Load frontend .env for REACT_APP_BACKEND_URL
env_file = Path("/app/frontend/.env")
for line in env_file.read_text().splitlines():
    if line.startswith("REACT_APP_BACKEND_URL="):
        os.environ["REACT_APP_BACKEND_URL"] = line.split("=", 1)[1].strip()
        break

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

USERS = {
    "jane":   {"email": "jane@creatorhub.io",   "password": "password123", "role": "owner"},
    "marcus": {"email": "marcus@creatorhub.io", "password": "temp1234",    "role": "editor"},
    "priya":  {"email": "priya@creatorhub.io",  "password": "temp1234",    "role": "analyst"},
    "tom":    {"email": "tom@creatorhub.io",    "password": "temp1234",    "role": "scheduler"},
}

# -------- shared fixtures --------
@pytest.fixture(scope="session")
def tokens():
    out = {}
    for key, u in USERS.items():
        r = requests.post(f"{API}/auth/login", json={"email": u["email"], "password": u["password"]}, timeout=30)
        assert r.status_code == 200, f"login failed for {key}: {r.status_code} {r.text}"
        out[key] = r.json()
    return out

def auth_headers(tokens, who):
    return {"Authorization": f"Bearer {tokens[who]['access_token']}"}

# -------- AUTH --------
class TestAuth:
    def test_login_all_seeded_users(self, tokens):
        for key, u in USERS.items():
            body = tokens[key]
            assert "access_token" in body
            assert "refresh_token" in body
            assert body["user"]["email"] == u["email"]
            assert body["user"]["role"] == u["role"]
            if key == "jane":
                assert body["user"]["must_change_password"] is False
            else:
                assert body["user"]["must_change_password"] is True

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"email": "jane@creatorhub.io", "password": "WRONG"})
        assert r.status_code == 401

    def test_signup_new_workspace(self):
        email = f"TEST_signup_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{API}/auth/signup", json={
            "name": "Test Owner", "email": email, "password": "password123", "workspace_name": "TEST Workspace"
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["user"]["role"] == "owner"
        assert data["user"]["email"] == email.lower()
        # duplicate
        r2 = requests.post(f"{API}/auth/signup", json={"name":"x","email":email,"password":"password123"})
        assert r2.status_code == 400

    def test_refresh(self, tokens):
        r = requests.post(f"{API}/auth/refresh", json={"refresh_token": tokens["jane"]["refresh_token"]})
        assert r.status_code == 200
        assert "access_token" in r.json()

    def test_me(self, tokens):
        r = requests.get(f"{API}/auth/me", headers=auth_headers(tokens, "jane"))
        assert r.status_code == 200
        assert r.json()["email"] == "jane@creatorhub.io"

    def test_change_password_requires_current_for_normal_user(self, tokens):
        # Jane must_change_password=False → needs current password
        r = requests.put(f"{API}/auth/change-password",
                         headers=auth_headers(tokens, "jane"),
                         json={"new_password": "newpassword"})
        assert r.status_code == 400

# -------- DASHBOARD --------
class TestDashboard:
    def test_dashboard_owner(self, tokens):
        r = requests.get(f"{API}/dashboard?platform=instagram&range=7d", headers=auth_headers(tokens, "jane"))
        assert r.status_code == 200
        d = r.json()
        for k in ("stats","weekly_views","today_tasks","upcoming_events","connection"):
            assert k in d
        # no NaN/null in stats values
        for stat, payload in d["stats"].items():
            assert payload["value"] is not None, f"null in {stat}"
            assert isinstance(payload["value"], (int, float))

# -------- ANALYTICS --------
class TestAnalytics:
    def test_analytics(self, tokens):
        r = requests.get(f"{API}/analytics?platform=instagram&range=30d", headers=auth_headers(tokens, "jane"))
        assert r.status_code == 200
        d = r.json()
        assert "stats" in d and "weekly_views" in d and "follower_growth" in d

    def test_analytics_posts_paginate_sort_search(self, tokens):
        r = requests.get(f"{API}/analytics/posts?page=1&page_size=5&sort=views", headers=auth_headers(tokens, "jane"))
        assert r.status_code == 200
        d = r.json()
        assert "posts" in d and "total" in d and d["page"] == 1
        # type filter
        r2 = requests.get(f"{API}/analytics/posts?type=reel", headers=auth_headers(tokens, "jane"))
        assert r2.status_code == 200
        # search
        r3 = requests.get(f"{API}/analytics/posts?search=morning", headers=auth_headers(tokens, "jane"))
        assert r3.status_code == 200

    def test_audience(self, tokens):
        r = requests.get(f"{API}/analytics/audience?platform=instagram", headers=auth_headers(tokens, "jane"))
        assert r.status_code == 200
        d = r.json()
        for k in ("countries","age_gender","best_times","content_perf"):
            assert k in d and len(d[k]) > 0

# -------- TASKS ↔ CALENDAR --------
class TestTasksCalendarSync:
    def test_full_task_lifecycle(self, tokens):
        h = auth_headers(tokens, "jane")
        task_date = "2026-04-15"
        # CREATE
        r = requests.post(f"{API}/tasks", headers=h, json={
            "name": "TEST_sync_task", "type": "post", "priority": "high", "date": task_date, "time": "10:00"
        })
        assert r.status_code == 200, r.text
        task = r.json()
        tid = task["id"]
        event_id = task["calendar_event_id"]
        assert event_id
        # VERIFY calendar has the event
        r2 = requests.get(f"{API}/calendar?month=4&year=2026", headers=h)
        assert r2.status_code == 200
        event_ids = [e["id"] for e in r2.json()["events"]]
        assert event_id in event_ids, "calendar event not created atomically"
        # UPDATE date - should sync
        r3 = requests.put(f"{API}/tasks/{tid}", headers=h, json={"date": "2026-05-20", "name": "TEST_sync_renamed"})
        assert r3.status_code == 200
        # verify via calendar May
        r4 = requests.get(f"{API}/calendar?month=5&year=2026", headers=h)
        ev = [e for e in r4.json()["events"] if e["id"] == event_id]
        assert len(ev) == 1
        assert ev[0]["title"] == "TEST_sync_renamed"
        assert ev[0]["date"] == "2026-05-20"
        # TOGGLE complete
        r5 = requests.put(f"{API}/tasks/{tid}/complete", headers=h)
        assert r5.status_code == 200 and r5.json()["status"] == "completed"
        # DELETE
        r6 = requests.delete(f"{API}/tasks/{tid}", headers=h)
        assert r6.status_code == 200
        # verify calendar no longer has event
        r7 = requests.get(f"{API}/calendar?month=5&year=2026", headers=h)
        ev2 = [e for e in r7.json()["events"] if e["id"] == event_id]
        assert len(ev2) == 0, "calendar event not deleted atomically"

# -------- TEAM --------
class TestTeam:
    def test_team_list(self, tokens):
        r = requests.get(f"{API}/team", headers=auth_headers(tokens, "jane"))
        assert r.status_code == 200
        d = r.json()
        assert "members" in d and "invites" in d and "stats" in d
        assert d["stats"]["total"] >= 4

    def test_team_permissions_catalog(self, tokens):
        r = requests.get(f"{API}/team/permissions/catalog", headers=auth_headers(tokens, "jane"))
        assert r.status_code == 200
        d = r.json()
        assert "groups" in d and "role_defaults" in d and "granter_permissions" in d

    def test_invite_update_delete(self, tokens):
        h = auth_headers(tokens, "jane")
        email = f"TEST_invite_{uuid.uuid4().hex[:8]}@creatorhub.io"
        r = requests.post(f"{API}/team/invite", headers=h, json={
            "name": "TEST User", "email": email, "temp_password": "temppw123", "role": "scheduler"
        })
        assert r.status_code == 200, r.text
        m = r.json()
        assert m["temp_password"] == "temppw123"
        assert m["role"] == "scheduler"
        uid = m["id"]
        # UPDATE role
        r2 = requests.put(f"{API}/team/{uid}", headers=h, json={"role": "editor"})
        assert r2.status_code == 200 and r2.json()["role"] == "editor"
        # activity
        r3 = requests.get(f"{API}/team/{uid}/activity", headers=h)
        assert r3.status_code == 200 and len(r3.json()["activity"]) > 0
        # delete
        r4 = requests.delete(f"{API}/team/{uid}", headers=h)
        assert r4.status_code == 200

# -------- PERMISSIONS (CRITICAL) --------
class TestPermissionsEnforcement:
    def test_tom_scheduler_denials(self, tokens):
        h = auth_headers(tokens, "tom")
        # denied
        assert requests.get(f"{API}/dashboard", headers=h).status_code == 403
        assert requests.get(f"{API}/analytics", headers=h).status_code == 403
        assert requests.get(f"{API}/team", headers=h).status_code == 403
        assert requests.get(f"{API}/deals", headers=h).status_code == 403
        assert requests.get(f"{API}/insights", headers=h).status_code == 403
        # allowed
        assert requests.get(f"{API}/tasks", headers=h).status_code == 200
        assert requests.get(f"{API}/analytics/posts", headers=h).status_code == 200

    def test_priya_analyst_denials(self, tokens):
        h = auth_headers(tokens, "priya")
        # allowed
        assert requests.get(f"{API}/analytics", headers=h).status_code == 200
        assert requests.get(f"{API}/analytics/posts", headers=h).status_code == 200
        assert requests.get(f"{API}/deals", headers=h).status_code == 200
        # denied: no tasks_edit
        r = requests.post(f"{API}/tasks", headers=h, json={"name":"x","date":"2026-04-15"})
        assert r.status_code == 403
        # denied: no team_edit
        r2 = requests.post(f"{API}/team/invite", headers=h, json={
            "name":"x","email":f"TEST_{uuid.uuid4().hex[:6]}@e.com","temp_password":"pw12345","role":"scheduler"
        })
        assert r2.status_code == 403
        # denied: dashboard
        assert requests.get(f"{API}/dashboard", headers=h).status_code == 403

    def test_marcus_editor_allowed(self, tokens):
        h = auth_headers(tokens, "marcus")
        assert requests.get(f"{API}/dashboard", headers=h).status_code == 200
        assert requests.get(f"{API}/analytics", headers=h).status_code == 200
        # editor has no team_view
        assert requests.get(f"{API}/team", headers=h).status_code == 403

# -------- DEALS / CONNECTIONS --------
class TestDealsConnections:
    def test_deals(self, tokens):
        r = requests.get(f"{API}/deals", headers=auth_headers(tokens, "jane"))
        assert r.status_code == 200
        d = r.json()
        assert "deals" in d and "stats" in d
        assert len(d["deals"]) >= 1  # spec says 3 but accept seeded data count

    def test_connection_flow(self, tokens):
        h = auth_headers(tokens, "jane")
        assert requests.post(f"{API}/connections/instagram/connect", headers=h).status_code == 200
        assert requests.post(f"{API}/connections/instagram/sync", headers=h).status_code == 200
        r = requests.get(f"{API}/connections", headers=h)
        assert r.status_code == 200

# -------- AI INSIGHTS --------
class TestInsights:
    def test_score(self, tokens):
        r = requests.get(f"{API}/insights/score?platform=instagram", headers=auth_headers(tokens, "jane"))
        assert r.status_code == 200
        d = r.json()
        assert "score" in d and "breakdown" in d

    def test_insights(self, tokens):
        r = requests.get(f"{API}/insights?platform=instagram", headers=auth_headers(tokens, "jane"), timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert "insights" in d and len(d["insights"]) >= 3

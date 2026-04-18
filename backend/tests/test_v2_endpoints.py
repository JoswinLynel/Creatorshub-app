"""CreatorHub v2 regression tests: Automations, Nav counts, Connections extras, Deals write."""
import os
import uuid
import pytest
import requests
from pathlib import Path

env_file = Path("/app/frontend/.env")
for line in env_file.read_text().splitlines():
    if line.startswith("REACT_APP_BACKEND_URL="):
        os.environ["REACT_APP_BACKEND_URL"] = line.split("=", 1)[1].strip()
        break

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

USERS = {
    "jane":   {"email": "jane@creatorhub.io",   "password": "password123"},
    "marcus": {"email": "marcus@creatorhub.io", "password": "temp1234"},
    "priya":  {"email": "priya@creatorhub.io",  "password": "temp1234"},
    "tom":    {"email": "tom@creatorhub.io",    "password": "temp1234"},
}

@pytest.fixture(scope="session")
def tokens():
    out = {}
    for key, u in USERS.items():
        r = requests.post(f"{API}/auth/login", json=u, timeout=30)
        assert r.status_code == 200, f"login failed for {key}: {r.status_code} {r.text}"
        out[key] = r.json()["access_token"]
    return out

def H(tokens, who):
    return {"Authorization": f"Bearer {tokens[who]}"}


# =============== AUTOMATIONS ===============
class TestAutomations:
    def test_list_automations_seeded(self, tokens):
        r = requests.get(f"{API}/automations", headers=H(tokens, "jane"))
        assert r.status_code == 200, r.text
        body = r.json()
        assert "comment" in body and "schedule" in body
        assert len(body["comment"]) >= 3, f"expected >=3 comment, got {len(body['comment'])}"
        assert len(body["schedule"]) >= 3, f"expected >=3 schedule, got {len(body['schedule'])}"

    def test_create_automation(self, tokens):
        payload = {
            "name": "TEST_Rule_" + uuid.uuid4().hex[:6],
            "platform": "instagram",
            "trigger_type": "comment",
            "keyword": "test",
            "action": "send_dm",
            "message_template": "Hi {name}!",
            "is_active": True,
            "category": "comment",
        }
        r = requests.post(f"{API}/automations", json=payload, headers=H(tokens, "jane"))
        assert r.status_code in (200, 201), r.text
        doc = r.json()
        assert doc["name"] == payload["name"]
        assert "id" in doc
        # GET verify
        g = requests.get(f"{API}/automations", headers=H(tokens, "jane"))
        all_ids = [a["id"] for a in g.json()["comment"] + g.json()["schedule"]]
        assert doc["id"] in all_ids
        pytest.automation_id = doc["id"]

    def test_update_automation(self, tokens):
        aid = getattr(pytest, "automation_id", None)
        if not aid:
            pytest.skip("no automation id from previous test")
        r = requests.put(f"{API}/automations/{aid}", json={"name": "TEST_Updated"}, headers=H(tokens, "jane"))
        assert r.status_code == 200, r.text
        assert r.json()["name"] == "TEST_Updated"

    def test_toggle_automation(self, tokens):
        aid = getattr(pytest, "automation_id", None)
        if not aid:
            pytest.skip("no automation id")
        r = requests.put(f"{API}/automations/{aid}/toggle", headers=H(tokens, "jane"))
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("ok") is True
        assert "is_active" in body
        first_state = body["is_active"]
        # toggle again -> flips
        r2 = requests.put(f"{API}/automations/{aid}/toggle", headers=H(tokens, "jane"))
        assert r2.json()["is_active"] == (not first_state)

    def test_automation_logs(self, tokens):
        r = requests.get(f"{API}/automations/logs", headers=H(tokens, "jane"))
        assert r.status_code == 200, r.text
        logs = r.json()
        # spec says 5 synthesised entries
        assert isinstance(logs, list) or isinstance(logs, dict)
        entries = logs if isinstance(logs, list) else logs.get("logs", logs.get("items", []))
        assert len(entries) >= 1, f"expected log entries, got {len(entries)}"

    def test_delete_automation(self, tokens):
        aid = getattr(pytest, "automation_id", None)
        if not aid:
            pytest.skip("no automation id")
        r = requests.delete(f"{API}/automations/{aid}", headers=H(tokens, "jane"))
        assert r.status_code in (200, 204), r.text
        # verify removed
        g = requests.get(f"{API}/automations", headers=H(tokens, "jane"))
        all_ids = [a["id"] for a in g.json()["comment"] + g.json()["schedule"]]
        assert aid not in all_ids


# =============== PERMISSION ENFORCEMENT ===============
class TestAutomationPermissions:
    def test_scheduler_403_on_automations(self, tokens):
        r = requests.get(f"{API}/automations", headers=H(tokens, "tom"))
        assert r.status_code == 403, f"Tom expected 403, got {r.status_code}"

    def test_analyst_403_on_automations(self, tokens):
        r = requests.get(f"{API}/automations", headers=H(tokens, "priya"))
        assert r.status_code == 403, f"Priya expected 403, got {r.status_code}"

    def test_editor_200_on_automations(self, tokens):
        r = requests.get(f"{API}/automations", headers=H(tokens, "marcus"))
        assert r.status_code == 200, f"Marcus expected 200, got {r.status_code}"

    def test_scheduler_can_access_connections(self, tokens):
        r = requests.get(f"{API}/connections", headers=H(tokens, "tom"))
        assert r.status_code == 200, r.text

    def test_analyst_can_access_connections(self, tokens):
        r = requests.get(f"{API}/connections", headers=H(tokens, "priya"))
        assert r.status_code == 200, r.text


# =============== NAV COUNTS ===============
class TestNavCounts:
    def test_owner_nav_counts(self, tokens):
        r = requests.get(f"{API}/nav/counts", headers=H(tokens, "jane"))
        assert r.status_code == 200, r.text
        body = r.json()
        for k in ("overdue", "today_events", "team", "insights_unread"):
            assert k in body, f"missing key {k}"
            assert isinstance(body[k], int)

    def test_any_authed_user_can_access(self, tokens):
        for who in ("marcus", "priya", "tom"):
            r = requests.get(f"{API}/nav/counts", headers=H(tokens, who))
            assert r.status_code == 200, f"{who}: {r.status_code} {r.text}"


# =============== CONNECTIONS EXTRAS ===============
class TestConnectionsExtras:
    def test_sync_all(self, tokens):
        r = requests.post(f"{API}/connections/sync-all", headers=H(tokens, "jane"))
        assert r.status_code == 200, r.text
        assert r.json().get("ok") is True

    def test_disconnect_alias_and_reconnect(self, tokens):
        # Disconnect Instagram via alias
        r = requests.post(f"{API}/connections/instagram/disconnect", headers=H(tokens, "jane"))
        assert r.status_code == 200, r.text
        # Reconnect for subsequent tests
        r2 = requests.post(f"{API}/connections/instagram/connect", headers=H(tokens, "jane"))
        assert r2.status_code in (200, 201), r2.text


# =============== DEALS WRITE ===============
class TestDealsWrite:
    def test_update_deal_stage_and_notes(self, tokens):
        # Get a deal
        r = requests.get(f"{API}/deals", headers=H(tokens, "jane"))
        assert r.status_code == 200
        deals = r.json()
        if not deals:
            pytest.skip("No deals seeded")
        # deals response could be list or dict
        items = deals if isinstance(deals, list) else deals.get("items", deals.get("deals", []))
        if not items:
            pytest.skip("No deals seeded")
        did = items[0]["id"]
        r2 = requests.put(f"{API}/deals/{did}", json={"stage": "negotiating", "notes": "TEST_note"}, headers=H(tokens, "jane"))
        assert r2.status_code == 200, r2.text
        body = r2.json()
        assert body.get("stage") == "negotiating"
        assert body.get("notes") == "TEST_note"

"""NetMon backend regression tests.

Covers: auth (cookie-based), users, devices CRUD, metrics, alerts, topology,
logs, agents, RBAC.

Runs against REACT_APP_BACKEND_URL (public URL).
"""
import os
import time
import uuid
import pytest
import requests

def _load_url():
    v = os.environ.get("REACT_APP_BACKEND_URL")
    if not v:
        try:
            with open("/app/frontend/.env") as f:
                for line in f:
                    if line.startswith("REACT_APP_BACKEND_URL="):
                        v = line.strip().split("=", 1)[1]
                        break
        except FileNotFoundError:
            pass
    assert v, "REACT_APP_BACKEND_URL not set"
    return v.rstrip("/")

BASE_URL = _load_url()
API = f"{BASE_URL}/api"

ADMIN = {"email": "admin@netmon.io", "password": "Admin@2026"}
VIEWER = {"email": "viewer@netmon.io", "password": "Viewer@2026"}


# ---------- fixtures ----------
@pytest.fixture(scope="session")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json=ADMIN, timeout=15)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="session")
def viewer_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json=VIEWER, timeout=15)
    assert r.status_code == 200, f"viewer login failed: {r.status_code} {r.text}"
    return s


# ---------- health ----------
def test_root_health():
    r = requests.get(f"{API}/", timeout=10)
    assert r.status_code == 200
    d = r.json()
    assert d.get("status") == "ok"
    assert "name" in d


# ---------- auth ----------
class TestAuth:
    def test_login_admin_sets_cookie(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json=ADMIN, timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == ADMIN["email"]
        assert data["role"] == "superadmin"
        # httpOnly cookie should be present
        assert any(c.name in ("access_token", "session", "token") for c in s.cookies), \
            f"no auth cookie set: {list(s.cookies.keys())}"

    def test_me_requires_auth(self):
        r = requests.get(f"{API}/auth/me", timeout=10)
        assert r.status_code in (401, 403)

    def test_me_returns_current_user(self, admin_session):
        r = admin_session.get(f"{API}/auth/me", timeout=10)
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN["email"]

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN["email"], "password": "wrong"}, timeout=10)
        assert r.status_code in (400, 401)

    def test_register_new_user(self):
        email = f"TEST_user_{uuid.uuid4().hex[:8]}@netmon.io"
        r = requests.post(f"{API}/auth/register", json={
            "email": email, "password": "Test@1234", "name": "Test User"
        }, timeout=10)
        assert r.status_code in (200, 201), r.text
        d = r.json()
        assert d["email"] == email.lower()

    def test_logout(self):
        s = requests.Session()
        s.post(f"{API}/auth/login", json=ADMIN, timeout=10)
        r = s.post(f"{API}/auth/logout", timeout=10)
        assert r.status_code in (200, 204)
        r2 = s.get(f"{API}/auth/me", timeout=10)
        assert r2.status_code in (401, 403)


# ---------- devices ----------
class TestDevices:
    def test_list_devices_seeded(self, admin_session):
        r = admin_session.get(f"{API}/devices", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 10, f"expected seeded devices, got {len(data)}"

    def test_create_update_delete_device(self, admin_session):
        payload = {
            "hostname": f"TEST_dev_{uuid.uuid4().hex[:6]}",
            "ip_address": "10.99.99.99",
            "type": "server",
            "status": "online",
        }
        r = admin_session.post(f"{API}/devices", json=payload, timeout=10)
        assert r.status_code in (200, 201), r.text
        dev = r.json()
        did = dev.get("id") or dev.get("_id")
        assert did
        assert dev["hostname"] == payload["hostname"]

        # GET verify persistence
        rl = admin_session.get(f"{API}/devices", timeout=10)
        names = [d.get("hostname") for d in rl.json()]
        assert payload["hostname"] in names

        # PATCH
        r2 = admin_session.patch(f"{API}/devices/{did}", json={"status": "offline"}, timeout=10)
        assert r2.status_code == 200
        assert r2.json()["status"] == "offline"

        # DELETE
        r3 = admin_session.delete(f"{API}/devices/{did}", timeout=10)
        assert r3.status_code in (200, 204)

        rl2 = admin_session.get(f"{API}/devices", timeout=10)
        ids = [d.get("id") for d in rl2.json()]
        assert did not in ids


# ---------- metrics ----------
class TestMetrics:
    def test_overview(self, admin_session):
        r = admin_session.get(f"{API}/metrics/overview", timeout=10)
        assert r.status_code == 200
        d = r.json()
        for k in ("online", "offline", "warning", "uptime_percent", "current_bandwidth_mbps", "total_devices"):
            assert k in d, f"missing key {k}: {d}"

    def test_traffic_timeseries(self, admin_session):
        r = admin_session.get(f"{API}/metrics/traffic?minutes=60", timeout=10)
        assert r.status_code == 200
        arr = r.json()
        assert isinstance(arr, list)
        if arr:
            row = arr[0]
            for k in ("in_mbps", "out_mbps", "total_mbps"):
                assert k in row, f"missing {k} in traffic row: {row}"

    def test_device_metrics(self, admin_session):
        devs = admin_session.get(f"{API}/devices", timeout=10).json()
        assert devs
        did = devs[0].get("id") or devs[0].get("_id")
        r = admin_session.get(f"{API}/metrics/device/{did}?minutes=60", timeout=10)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ---------- alerts ----------
class TestAlerts:
    def test_list_alerts(self, admin_session):
        r = admin_session.get(f"{API}/alerts", timeout=10)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_filter_unresolved(self, admin_session):
        r = admin_session.get(f"{API}/alerts?status=unresolved", timeout=10)
        assert r.status_code == 200
        for a in r.json():
            assert a.get("resolved") in (False, None, 0)

    def test_filter_unacknowledged(self, admin_session):
        r = admin_session.get(f"{API}/alerts?status=unacknowledged", timeout=10)
        assert r.status_code == 200
        for a in r.json():
            assert a.get("acknowledged") in (False, None, 0)

    def test_ack_and_resolve(self, admin_session):
        alerts = admin_session.get(f"{API}/alerts", timeout=10).json()
        if not alerts:
            pytest.skip("no alerts seeded")
        aid = alerts[0].get("id") or alerts[0].get("_id")
        r1 = admin_session.post(f"{API}/alerts/{aid}/ack", timeout=10)
        assert r1.status_code == 200
        assert r1.json().get("acknowledged") is True

        r2 = admin_session.post(f"{API}/alerts/{aid}/resolve", timeout=10)
        assert r2.status_code == 200
        assert r2.json().get("resolved") is True


# ---------- topology ----------
def test_topology(admin_session):
    r = admin_session.get(f"{API}/topology", timeout=10)
    assert r.status_code == 200
    d = r.json()
    assert "nodes" in d and "links" in d
    assert isinstance(d["nodes"], list) and isinstance(d["links"], list)
    assert len(d["nodes"]) > 0


# ---------- logs ----------
def test_logs(admin_session):
    r = admin_session.get(f"{API}/logs", timeout=10)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ---------- users ----------
class TestUsers:
    def test_list_users_admin(self, admin_session):
        r = admin_session.get(f"{API}/users", timeout=10)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_update_my_settings(self, admin_session):
        r = admin_session.patch(f"{API}/users/me/settings",
                                json={"language": "en", "theme": "dark"}, timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d.get("language") == "en"
        assert d.get("theme") == "dark"
        # reset
        admin_session.patch(f"{API}/users/me/settings",
                            json={"language": "id", "theme": "dark"}, timeout=10)


# ---------- agents ----------
class TestAgents:
    def test_create_and_heartbeat(self, admin_session):
        r = admin_session.post(f"{API}/agents", json={"name": f"TEST_agent_{uuid.uuid4().hex[:6]}"}, timeout=10)
        assert r.status_code in (200, 201), r.text
        d = r.json()
        api_key = d.get("api_key") or d.get("key")
        assert api_key, f"no api_key in response: {d}"
        aid = d.get("id") or d.get("_id")

        # heartbeat
        hb = requests.post(f"{API}/agents/heartbeat",
                           headers={"X-Agent-Key": api_key},
                           json={"devices": [{"name": "TEST_hb_dev", "ip": "10.88.88.88", "type": "server", "status": "online"}]},
                           timeout=10)
        assert hb.status_code == 200, hb.text

        # cleanup
        if aid:
            admin_session.delete(f"{API}/agents/{aid}", timeout=10)

    def test_install_script(self, admin_session):
        r = admin_session.get(f"{API}/agents/install-script", timeout=10)
        assert r.status_code == 200
        body = r.text
        assert "python" in body.lower() or "import" in body.lower()


# ---------- RBAC ----------
def test_viewer_cannot_create_device(viewer_session):
    r = viewer_session.post(f"{API}/devices", json={
        "hostname": "TEST_forbidden", "ip_address": "1.2.3.4", "type": "server", "status": "online"
    }, timeout=10)
    assert r.status_code == 403

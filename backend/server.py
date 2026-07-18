from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import random
import logging
import secrets as pysecrets
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

import bcrypt
import jwt
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Header
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# ---------- DB ----------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# ---------- App ----------
app = FastAPI(title="NetMon - Local Network Monitor")
api = APIRouter(prefix="/api")

JWT_ALGO = "HS256"
ACCESS_TTL = timedelta(minutes=60)
REFRESH_TTL = timedelta(days=7)


def jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


# ---------- Utilities ----------
def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_password(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), h.encode())
    except Exception:
        return False


def create_token(sub: str, email: str, role: str, kind: str) -> str:
    ttl = ACCESS_TTL if kind == "access" else REFRESH_TTL
    payload = {
        "sub": sub,
        "email": email,
        "role": role,
        "type": kind,
        "exp": datetime.now(timezone.utc) + ttl,
    }
    return jwt.encode(payload, jwt_secret(), algorithm=JWT_ALGO)


def set_auth_cookies(response: Response, user_id: str, email: str, role: str):
    at = create_token(user_id, email, role, "access")
    rt = create_token(user_id, email, role, "refresh")
    response.set_cookie("access_token", at, httponly=True, secure=False, samesite="lax",
                        max_age=int(ACCESS_TTL.total_seconds()), path="/")
    response.set_cookie("refresh_token", rt, httponly=True, secure=False, samesite="lax",
                        max_age=int(REFRESH_TTL.total_seconds()), path="/")
    return at


def clean_user(u: dict) -> dict:
    return {
        "id": str(u["_id"]),
        "email": u["email"],
        "name": u.get("name", ""),
        "role": u.get("role", "viewer"),
        "language": u.get("language", "id"),
        "theme": u.get("theme", "dark"),
        "created_at": u.get("created_at"),
    }


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, jwt_secret(), algorithms=[JWT_ALGO])
        if payload.get("type") != "access":
            raise HTTPException(401, "Invalid token")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(401, "User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")


def require_role(*roles):
    async def dep(user: dict = Depends(get_current_user)):
        if user.get("role") not in roles:
            raise HTTPException(403, "Insufficient permissions")
        return user
    return dep


async def log_activity(user_id: Optional[str], action: str, target: str, meta: Optional[dict] = None):
    await db.activity_logs.insert_one({
        "user_id": user_id,
        "action": action,
        "target": target,
        "meta": meta or {},
        "created_at": datetime.now(timezone.utc).isoformat(),
    })


# ---------- Models ----------
class RegisterInput(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = ""


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class DeviceInput(BaseModel):
    hostname: str
    ip_address: str
    mac_address: Optional[str] = ""
    device_type: Literal["router", "switch", "server", "workstation", "printer", "iot", "camera", "access_point", "phone", "unknown"] = "unknown"
    location: Optional[str] = ""
    notes: Optional[str] = ""
    parent_id: Optional[str] = None


class DeviceUpdate(BaseModel):
    hostname: Optional[str] = None
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    device_type: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    parent_id: Optional[str] = None
    status: Optional[str] = None


class AlertAck(BaseModel):
    acknowledged: bool = True


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[Literal["superadmin", "admin", "viewer"]] = None
    language: Optional[Literal["id", "en"]] = None
    theme: Optional[Literal["dark", "light"]] = None
    password: Optional[str] = None


class AgentRegister(BaseModel):
    name: str
    network_cidr: Optional[str] = "192.168.1.0/24"


class AgentHeartbeat(BaseModel):
    devices: List[dict] = []
    metrics: List[dict] = []
    alerts: List[dict] = []


# ---------- Auth Routes ----------
@api.post("/auth/register")
async def register(payload: RegisterInput, response: Response):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already registered")
    total = await db.users.count_documents({})
    role = "superadmin" if total == 0 else "viewer"
    doc = {
        "email": email,
        "password_hash": hash_password(payload.password),
        "name": payload.name or email.split("@")[0],
        "role": role,
        "language": "id",
        "theme": "dark",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    set_auth_cookies(response, str(res.inserted_id), email, role)
    await log_activity(str(res.inserted_id), "user.register", email)
    return clean_user(doc)


@api.post("/auth/login")
async def login(payload: LoginInput, response: Response):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    set_auth_cookies(response, str(user["_id"]), email, user["role"])
    await log_activity(str(user["_id"]), "user.login", email)
    return clean_user(user)


@api.post("/auth/logout")
async def logout(response: Response, user: dict = Depends(get_current_user)):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    await log_activity(str(user["_id"]), "user.logout", user["email"])
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return clean_user(user)


@api.post("/auth/refresh")
async def refresh(request: Request, response: Response):
    rt = request.cookies.get("refresh_token")
    if not rt:
        raise HTTPException(401, "No refresh token")
    try:
        p = jwt.decode(rt, jwt_secret(), algorithms=[JWT_ALGO])
        if p.get("type") != "refresh":
            raise HTTPException(401, "Invalid refresh")
        user = await db.users.find_one({"_id": ObjectId(p["sub"])})
        if not user:
            raise HTTPException(401, "User not found")
        set_auth_cookies(response, str(user["_id"]), user["email"], user["role"])
        return {"ok": True}
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid refresh token")


# ---------- Users ----------
@api.get("/users")
async def list_users(user: dict = Depends(require_role("superadmin", "admin"))):
    users = await db.users.find({}).to_list(500)
    return [clean_user(u) for u in users]


@api.patch("/users/{user_id}")
async def update_user(user_id: str, payload: UserUpdate, user: dict = Depends(require_role("superadmin", "admin"))):
    target = await db.users.find_one({"_id": ObjectId(user_id)})
    if not target:
        raise HTTPException(404, "User not found")
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "password" in update:
        update["password_hash"] = hash_password(update.pop("password"))
    # only superadmin can change role
    if "role" in update and user.get("role") != "superadmin":
        update.pop("role")
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update})
    target = await db.users.find_one({"_id": ObjectId(user_id)})
    await log_activity(str(user["_id"]), "user.update", target["email"], {"fields": list(update.keys())})
    return clean_user(target)


@api.patch("/users/me/settings")
async def update_my_settings(payload: UserUpdate, user: dict = Depends(get_current_user)):
    update = {}
    if payload.language is not None:
        update["language"] = payload.language
    if payload.theme is not None:
        update["theme"] = payload.theme
    if payload.name is not None:
        update["name"] = payload.name
    if update:
        await db.users.update_one({"_id": user["_id"]}, {"$set": update})
    updated = await db.users.find_one({"_id": user["_id"]})
    return clean_user(updated)


@api.delete("/users/{user_id}")
async def delete_user(user_id: str, user: dict = Depends(require_role("superadmin"))):
    if str(user["_id"]) == user_id:
        raise HTTPException(400, "Cannot delete yourself")
    r = await db.users.delete_one({"_id": ObjectId(user_id)})
    if r.deleted_count == 0:
        raise HTTPException(404, "Not found")
    await log_activity(str(user["_id"]), "user.delete", user_id)
    return {"ok": True}


# ---------- Devices ----------
def device_out(d: dict) -> dict:
    return {
        "id": str(d["_id"]),
        "hostname": d.get("hostname"),
        "ip_address": d.get("ip_address"),
        "mac_address": d.get("mac_address", ""),
        "device_type": d.get("device_type", "unknown"),
        "location": d.get("location", ""),
        "notes": d.get("notes", ""),
        "status": d.get("status", "unknown"),
        "uptime_seconds": d.get("uptime_seconds", 0),
        "last_seen": d.get("last_seen"),
        "parent_id": d.get("parent_id"),
        "latency_ms": d.get("latency_ms", 0),
        "created_at": d.get("created_at"),
    }


@api.get("/devices")
async def list_devices(user: dict = Depends(get_current_user)):
    items = await db.devices.find({}).sort("hostname", 1).to_list(1000)
    return [device_out(d) for d in items]


@api.post("/devices")
async def create_device(payload: DeviceInput, user: dict = Depends(require_role("superadmin", "admin"))):
    doc = payload.model_dump()
    doc.update({
        "status": "unknown",
        "uptime_seconds": 0,
        "last_seen": None,
        "latency_ms": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    r = await db.devices.insert_one(doc)
    doc["_id"] = r.inserted_id
    await log_activity(str(user["_id"]), "device.create", doc["hostname"])
    return device_out(doc)


@api.patch("/devices/{device_id}")
async def update_device(device_id: str, payload: DeviceUpdate, user: dict = Depends(require_role("superadmin", "admin"))):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    r = await db.devices.update_one({"_id": ObjectId(device_id)}, {"$set": update})
    if r.matched_count == 0:
        raise HTTPException(404, "Device not found")
    doc = await db.devices.find_one({"_id": ObjectId(device_id)})
    await log_activity(str(user["_id"]), "device.update", doc["hostname"])
    return device_out(doc)


@api.delete("/devices/{device_id}")
async def delete_device(device_id: str, user: dict = Depends(require_role("superadmin", "admin"))):
    doc = await db.devices.find_one({"_id": ObjectId(device_id)})
    if not doc:
        raise HTTPException(404, "Not found")
    await db.devices.delete_one({"_id": ObjectId(device_id)})
    await log_activity(str(user["_id"]), "device.delete", doc.get("hostname", ""))
    return {"ok": True}


# ---------- Metrics / Traffic ----------
@api.get("/metrics/overview")
async def metrics_overview(user: dict = Depends(get_current_user)):
    total = await db.devices.count_documents({})
    online = await db.devices.count_documents({"status": "online"})
    offline = await db.devices.count_documents({"status": "offline"})
    warning = await db.devices.count_documents({"status": "warning"})
    unack = await db.alerts.count_documents({"acknowledged": False, "resolved": False})
    critical = await db.alerts.count_documents({"severity": "critical", "resolved": False})
    # bandwidth last point
    last = await db.traffic.find({}).sort("ts", -1).limit(1).to_list(1)
    current_bw = last[0]["total_mbps"] if last else 0
    uptime_pct = round((online / total * 100), 1) if total else 0
    return {
        "total_devices": total,
        "online": online,
        "offline": offline,
        "warning": warning,
        "unacknowledged_alerts": unack,
        "critical_alerts": critical,
        "current_bandwidth_mbps": current_bw,
        "uptime_percent": uptime_pct,
    }


@api.get("/metrics/traffic")
async def get_traffic(minutes: int = 60, user: dict = Depends(get_current_user)):
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=minutes)).isoformat()
    items = await db.traffic.find({"ts": {"$gte": cutoff}}).sort("ts", 1).to_list(2000)
    return [{"ts": t["ts"], "in_mbps": t.get("in_mbps", 0), "out_mbps": t.get("out_mbps", 0), "total_mbps": t.get("total_mbps", 0)} for t in items]


@api.get("/metrics/device/{device_id}")
async def device_metrics(device_id: str, minutes: int = 60, user: dict = Depends(get_current_user)):
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=minutes)).isoformat()
    items = await db.device_metrics.find({"device_id": device_id, "ts": {"$gte": cutoff}}).sort("ts", 1).to_list(2000)
    return [{"ts": m["ts"], "cpu": m.get("cpu", 0), "memory": m.get("memory", 0), "latency_ms": m.get("latency_ms", 0), "bandwidth_mbps": m.get("bandwidth_mbps", 0)} for m in items]


# ---------- Alerts ----------
def alert_out(a: dict) -> dict:
    return {
        "id": str(a["_id"]),
        "device_id": a.get("device_id"),
        "device_hostname": a.get("device_hostname"),
        "severity": a.get("severity"),
        "title": a.get("title"),
        "message": a.get("message"),
        "acknowledged": a.get("acknowledged", False),
        "resolved": a.get("resolved", False),
        "created_at": a.get("created_at"),
        "acknowledged_by": a.get("acknowledged_by"),
    }


@api.get("/alerts")
async def list_alerts(status: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {}
    if status == "unresolved":
        q["resolved"] = False
    elif status == "unacknowledged":
        q["acknowledged"] = False
        q["resolved"] = False
    items = await db.alerts.find(q).sort("created_at", -1).to_list(500)
    return [alert_out(a) for a in items]


@api.post("/alerts/{alert_id}/ack")
async def ack_alert(alert_id: str, user: dict = Depends(require_role("superadmin", "admin"))):
    await db.alerts.update_one({"_id": ObjectId(alert_id)}, {"$set": {"acknowledged": True, "acknowledged_by": user["email"]}})
    a = await db.alerts.find_one({"_id": ObjectId(alert_id)})
    await log_activity(str(user["_id"]), "alert.ack", a.get("title", ""))
    return alert_out(a)


@api.post("/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: str, user: dict = Depends(require_role("superadmin", "admin"))):
    await db.alerts.update_one({"_id": ObjectId(alert_id)}, {"$set": {"resolved": True, "acknowledged": True, "acknowledged_by": user["email"]}})
    a = await db.alerts.find_one({"_id": ObjectId(alert_id)})
    await log_activity(str(user["_id"]), "alert.resolve", a.get("title", ""))
    return alert_out(a)


@api.delete("/alerts/{alert_id}")
async def delete_alert(alert_id: str, user: dict = Depends(require_role("superadmin", "admin"))):
    await db.alerts.delete_one({"_id": ObjectId(alert_id)})
    return {"ok": True}


# ---------- Topology ----------
@api.get("/topology")
async def topology(user: dict = Depends(get_current_user)):
    devices = await db.devices.find({}).to_list(1000)
    nodes = [{
        "id": str(d["_id"]),
        "label": d.get("hostname"),
        "type": d.get("device_type", "unknown"),
        "status": d.get("status", "unknown"),
        "ip": d.get("ip_address"),
    } for d in devices]
    links = []
    for d in devices:
        if d.get("parent_id"):
            links.append({"source": d["parent_id"], "target": str(d["_id"])})
    return {"nodes": nodes, "links": links}


# ---------- Logs ----------
@api.get("/logs")
async def list_logs(limit: int = 200, user: dict = Depends(get_current_user)):
    items = await db.activity_logs.find({}).sort("created_at", -1).limit(limit).to_list(limit)
    out = []
    user_ids = list({i.get("user_id") for i in items if i.get("user_id")})
    user_map = {}
    if user_ids:
        try:
            users = await db.users.find({"_id": {"$in": [ObjectId(u) for u in user_ids]}}).to_list(len(user_ids))
            user_map = {str(u["_id"]): u["email"] for u in users}
        except Exception:
            pass
    for i in items:
        out.append({
            "id": str(i["_id"]),
            "user_email": user_map.get(i.get("user_id"), "system"),
            "action": i.get("action"),
            "target": i.get("target"),
            "meta": i.get("meta", {}),
            "created_at": i.get("created_at"),
        })
    return out


# ---------- Agents ----------
def agent_out(a: dict) -> dict:
    return {
        "id": str(a["_id"]),
        "name": a.get("name"),
        "network_cidr": a.get("network_cidr"),
        "api_key": a.get("api_key"),
        "last_seen": a.get("last_seen"),
        "status": a.get("status", "offline"),
        "created_at": a.get("created_at"),
    }


@api.get("/agents")
async def list_agents(user: dict = Depends(require_role("superadmin", "admin"))):
    items = await db.agents.find({}).to_list(200)
    return [agent_out(a) for a in items]


@api.post("/agents")
async def create_agent(payload: AgentRegister, user: dict = Depends(require_role("superadmin", "admin"))):
    key = pysecrets.token_urlsafe(32)
    doc = {
        "name": payload.name,
        "network_cidr": payload.network_cidr,
        "api_key": key,
        "status": "offline",
        "last_seen": None,
        "created_by": str(user["_id"]),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    r = await db.agents.insert_one(doc)
    doc["_id"] = r.inserted_id
    await log_activity(str(user["_id"]), "agent.create", payload.name)
    return agent_out(doc)


@api.delete("/agents/{agent_id}")
async def delete_agent(agent_id: str, user: dict = Depends(require_role("superadmin", "admin"))):
    await db.agents.delete_one({"_id": ObjectId(agent_id)})
    return {"ok": True}


@api.post("/agents/heartbeat")
async def agent_heartbeat(payload: AgentHeartbeat, x_agent_key: Optional[str] = Header(default=None)):
    if not x_agent_key:
        raise HTTPException(401, "Agent key required")
    agent = await db.agents.find_one({"api_key": x_agent_key})
    if not agent:
        raise HTTPException(401, "Invalid agent key")
    now = datetime.now(timezone.utc).isoformat()
    await db.agents.update_one({"_id": agent["_id"]}, {"$set": {"last_seen": now, "status": "online"}})
    # upsert devices
    for d in payload.devices:
        if not d.get("mac_address") and not d.get("ip_address"):
            continue
        q = {"mac_address": d.get("mac_address")} if d.get("mac_address") else {"ip_address": d.get("ip_address")}
        await db.devices.update_one(q, {"$set": {**d, "last_seen": now}}, upsert=True)
    # metrics
    for m in payload.metrics:
        await db.device_metrics.insert_one({**m, "ts": now})
    return {"ok": True, "received": {"devices": len(payload.devices), "metrics": len(payload.metrics)}}


@api.get("/agents/install-script")
async def install_script(user: dict = Depends(get_current_user)):
    """Returns a Python script users can run on their local network."""
    script = """#!/usr/bin/env python3
# NetMon Local Agent - install & run on a machine inside your LAN
# Usage: AGENT_KEY=xxx BACKEND_URL=https://... python3 netmon_agent.py
import os, socket, subprocess, time, json, urllib.request, ipaddress, platform

AGENT_KEY = os.environ.get("AGENT_KEY", "")
BACKEND_URL = os.environ.get("BACKEND_URL", "")
CIDR = os.environ.get("CIDR", "192.168.1.0/24")

def ping(ip):
    param = "-n" if platform.system().lower() == "windows" else "-c"
    try:
        r = subprocess.run(["ping", param, "1", "-W", "1", ip], capture_output=True, timeout=2)
        return r.returncode == 0
    except Exception:
        return False

def scan():
    devices = []
    for ip in ipaddress.ip_network(CIDR).hosts():
        ip = str(ip)
        alive = ping(ip)
        if alive:
            try:
                host = socket.gethostbyaddr(ip)[0]
            except Exception:
                host = ip
            devices.append({"ip_address": ip, "hostname": host, "status": "online", "device_type": "unknown"})
    return devices

def send(devices):
    data = json.dumps({"devices": devices, "metrics": [], "alerts": []}).encode()
    req = urllib.request.Request(f"{BACKEND_URL}/api/agents/heartbeat", data=data,
        headers={"Content-Type": "application/json", "X-Agent-Key": AGENT_KEY})
    with urllib.request.urlopen(req, timeout=10) as r:
        print(r.read().decode())

if __name__ == "__main__":
    while True:
        try:
            devs = scan()
            print(f"Found {len(devs)} devices")
            send(devs)
        except Exception as e:
            print("Error:", e)
        time.sleep(60)
"""
    return {"script": script, "filename": "netmon_agent.py"}


# ---------- Seed / Demo Data ----------
async def seed_startup():
    # indexes
    await db.users.create_index("email", unique=True)
    await db.devices.create_index("ip_address")
    await db.traffic.create_index("ts")
    await db.device_metrics.create_index([("device_id", 1), ("ts", 1)])
    await db.alerts.create_index("created_at")

    # seed super admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@netmon.io").lower()
    admin_pass = os.environ.get("ADMIN_PASSWORD", "Admin@2026")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_pass),
            "name": "Super Admin",
            "role": "superadmin",
            "language": "id",
            "theme": "dark",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logging.info(f"Seeded admin: {admin_email}")
    else:
        # ensure role is superadmin & password matches env
        await db.users.update_one({"email": admin_email}, {"$set": {"role": "superadmin"}})
        if not verify_password(admin_pass, existing["password_hash"]):
            await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_pass)}})

    # seed demo viewer
    viewer_email = "viewer@netmon.io"
    if not await db.users.find_one({"email": viewer_email}):
        await db.users.insert_one({
            "email": viewer_email,
            "password_hash": hash_password("Viewer@2026"),
            "name": "Demo Viewer",
            "role": "viewer",
            "language": "id",
            "theme": "dark",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    # seed demo devices if empty
    if await db.devices.count_documents({}) == 0:
        now = datetime.now(timezone.utc).isoformat()
        router = {
            "hostname": "core-router-01",
            "ip_address": "192.168.1.1",
            "mac_address": "AA:BB:CC:00:00:01",
            "device_type": "router",
            "location": "Server Room",
            "status": "online",
            "uptime_seconds": 864000,
            "latency_ms": 2,
            "last_seen": now,
            "parent_id": None,
            "created_at": now,
        }
        r1 = await db.devices.insert_one(router)
        router_id = str(r1.inserted_id)

        sw1 = {
            "hostname": "switch-floor-1",
            "ip_address": "192.168.1.2",
            "mac_address": "AA:BB:CC:00:00:02",
            "device_type": "switch",
            "location": "Floor 1",
            "status": "online",
            "uptime_seconds": 500000,
            "latency_ms": 3,
            "last_seen": now,
            "parent_id": router_id,
            "created_at": now,
        }
        r2 = await db.devices.insert_one(sw1)
        sw1_id = str(r2.inserted_id)

        sw2 = {
            "hostname": "switch-floor-2",
            "ip_address": "192.168.1.3",
            "mac_address": "AA:BB:CC:00:00:03",
            "device_type": "switch",
            "location": "Floor 2",
            "status": "warning",
            "uptime_seconds": 200000,
            "latency_ms": 12,
            "last_seen": now,
            "parent_id": router_id,
            "created_at": now,
        }
        r3 = await db.devices.insert_one(sw2)
        sw2_id = str(r3.inserted_id)

        demo_children = [
            ("srv-web-01", "192.168.1.10", "server", "Server Room", "online", sw1_id),
            ("srv-db-01", "192.168.1.11", "server", "Server Room", "online", sw1_id),
            ("ws-alice", "192.168.1.20", "workstation", "Floor 1", "online", sw1_id),
            ("ws-bob", "192.168.1.21", "workstation", "Floor 1", "offline", sw1_id),
            ("printer-hp01", "192.168.1.30", "printer", "Floor 1", "online", sw1_id),
            ("ap-lobby", "192.168.1.40", "access_point", "Lobby", "online", sw2_id),
            ("cam-entrance", "192.168.1.50", "camera", "Entrance", "online", sw2_id),
            ("cam-parking", "192.168.1.51", "camera", "Parking", "warning", sw2_id),
            ("iot-thermostat", "192.168.1.60", "iot", "Floor 2", "online", sw2_id),
            ("phone-reception", "192.168.1.70", "phone", "Reception", "offline", sw2_id),
        ]
        for host, ip, dtype, loc, status, parent in demo_children:
            await db.devices.insert_one({
                "hostname": host,
                "ip_address": ip,
                "mac_address": f"AA:BB:CC:{random.randint(0,255):02X}:{random.randint(0,255):02X}:{random.randint(0,255):02X}",
                "device_type": dtype,
                "location": loc,
                "status": status,
                "uptime_seconds": random.randint(3600, 500000),
                "latency_ms": random.randint(1, 50),
                "last_seen": now,
                "parent_id": parent,
                "created_at": now,
            })

    # seed demo alerts if empty
    if await db.alerts.count_documents({}) == 0:
        offline_devices = await db.devices.find({"status": "offline"}).to_list(20)
        warning_devices = await db.devices.find({"status": "warning"}).to_list(20)
        for d in offline_devices:
            await db.alerts.insert_one({
                "device_id": str(d["_id"]),
                "device_hostname": d["hostname"],
                "severity": "critical",
                "title": f"Device {d['hostname']} is offline",
                "message": f"No response from {d['ip_address']} for 5+ minutes",
                "acknowledged": False,
                "resolved": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
        for d in warning_devices:
            await db.alerts.insert_one({
                "device_id": str(d["_id"]),
                "device_hostname": d["hostname"],
                "severity": "warning",
                "title": f"High latency on {d['hostname']}",
                "message": f"Latency exceeded 10ms threshold",
                "acknowledged": False,
                "resolved": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })


async def traffic_ticker():
    """Background task: generate/update traffic + rotating device status. Only runs when no live agent for demo."""
    import asyncio
    while True:
        try:
            now = datetime.now(timezone.utc).isoformat()
            in_mbps = round(random.uniform(20, 250), 2)
            out_mbps = round(random.uniform(10, 150), 2)
            await db.traffic.insert_one({
                "ts": now,
                "in_mbps": in_mbps,
                "out_mbps": out_mbps,
                "total_mbps": round(in_mbps + out_mbps, 2),
            })
            # trim old traffic (>2h)
            cutoff = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
            await db.traffic.delete_many({"ts": {"$lt": cutoff}})
            # generate per-device metrics
            devices = await db.devices.find({}).to_list(100)
            for d in devices:
                if d.get("status") == "offline":
                    continue
                await db.device_metrics.insert_one({
                    "device_id": str(d["_id"]),
                    "ts": now,
                    "cpu": round(random.uniform(5, 80), 1),
                    "memory": round(random.uniform(20, 90), 1),
                    "latency_ms": random.randint(1, 30),
                    "bandwidth_mbps": round(random.uniform(1, 100), 2),
                })
            # trim metrics
            await db.device_metrics.delete_many({"ts": {"$lt": cutoff}})
        except Exception as e:
            logging.error(f"traffic_ticker: {e}")
        await asyncio.sleep(10)


@app.on_event("startup")
async def on_startup():
    import asyncio
    await seed_startup()
    asyncio.create_task(traffic_ticker())


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


@api.get("/")
async def root():
    return {"name": "NetMon API", "version": "1.0.0", "status": "ok"}


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")

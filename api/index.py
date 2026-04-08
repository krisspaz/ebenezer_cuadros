"""
Sanctuary Church Management – FastAPI Backend
Deployable on Vercel as a Python serverless function.

Environment variables required:
  SUPABASE_URL       – your Supabase project URL
  SUPABASE_SERVICE_KEY – service_role key (full DB access)
  FRONTEND_URL       – comma-separated frontend origins for CORS
                       e.g. "https://myapp.vercel.app"
                       Defaults to "*" if not set (dev only).
  ADMIN_EMAILS       – comma-separated emails auto-granted admin role
                       on first login. e.g. "pastor@iglesia.com"
"""

import os
import random
from datetime import date
from typing import Optional
from collections import defaultdict

from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
from mangum import Mangum

# ── App setup ────────────────────────────────────────────────────────
app = FastAPI(
    title="Sanctuary API",
    description="API de gestión de servicios de iglesia",
    version="1.1.0",
)

# CORS – restrict to specific frontend URL(s) in production
_raw_origins = os.environ.get("FRONTEND_URL", "")
_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]
if not _origins:
    _origins = ["*"]  # dev fallback – set FRONTEND_URL in production!

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Supabase client ──────────────────────────────────────────────────
def get_supabase() -> Client:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise HTTPException(500, "Supabase credentials not configured")
    return create_client(url, key)


def get_calling_user(sb: Client, authorization: Optional[str]):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "No autorizado")
    token = authorization.split(" ", 1)[1]
    try:
        res = sb.auth.get_user(token)
        if not res.user:
            raise HTTPException(401, "Token inválido")
        return res.user
    except Exception:
        raise HTTPException(401, "Token inválido")


def check_admin(sb: Client, user_id: str):
    res = (
        sb.table("user_roles")
        .select("role")
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not res.data or res.data.get("role") != "admin":
        raise HTTPException(403, "Solo administradores pueden realizar esta acción")


# ── Pydantic models ──────────────────────────────────────────────────
class ServiceSlot(BaseModel):
    date: str           # "yyyy-MM-dd"
    service_name: str


class GenerateRequest(BaseModel):
    service_slots: list[ServiceSlot]
    subareas: list[str]          # list of subarea UUIDs


class Assignment(BaseModel):
    date: str
    service_name: str
    subarea_id: str
    person_id: Optional[str] = None
    person_name: Optional[str] = None
    has_conflict: bool = False


class InviteUserRequest(BaseModel):
    email: str
    role: str = "viewer"


class UpdateRoleRequest(BaseModel):
    role: str


# ── Scheduling algorithm ─────────────────────────────────────────────
def run_scheduler(
    service_slots: list[dict],
    subarea_ids: list[str],
    people: list[dict],
    person_skills: dict,
    exceptions: dict,
    person_avail_days: dict,
) -> list[dict]:
    # Shuffle so no one has a fixed-order advantage when counts are tied
    pool    = people[:]
    random.shuffle(pool)
    counts  = {p["id"]: 0 for p in pool}
    results = []

    for slot in service_slots:
        slot_date    = slot["date"]
        service_name = slot["service_name"]
        dow          = date.fromisoformat(slot_date).weekday()  # Mon=0…Sun=6
        # Convert to Sunday=0 … Saturday=6
        dow = (dow + 1) % 7
        used_in_slot: set[str] = set()
        # Shuffle role order each service so no role always consumes multi-skilled people first
        slot_subarea_ids = subarea_ids[:]
        random.shuffle(slot_subarea_ids)

        for subarea_id in slot_subarea_ids:
            eligible = [
                p for p in pool
                if subarea_id in person_skills.get(p["id"], set())
                and slot_date not in exceptions.get(p["id"], set())
                and p["id"] not in used_in_slot
                and (
                    not person_avail_days.get(p["id"])          # no restriction
                    or dow in person_avail_days[p["id"]]        # day is allowed
                )
            ]

            if not eligible:
                results.append({
                    "date": slot_date, "service_name": service_name,
                    "subarea_id": subarea_id, "person_id": None,
                    "person_name": None, "has_conflict": True,
                })
                continue

            min_count  = min(counts[p["id"]] for p in eligible)
            candidates = [p for p in eligible if counts[p["id"]] == min_count]
            chosen     = random.choice(candidates)

            used_in_slot.add(chosen["id"])
            counts[chosen["id"]] += 1

            results.append({
                "date": slot_date, "service_name": service_name,
                "subarea_id": subarea_id, "person_id": chosen["id"],
                "person_name": chosen["name"], "has_conflict": False,
            })

    return results


# ── Health ─────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "ok", "service": "Sanctuary API v1.1"}


@app.get("/health")
def health():
    return {"status": "healthy"}


# ── Role management ───────────────────────────────────────────────────

@app.get("/my-role")
def my_role(authorization: Optional[str] = Header(None)):
    """
    Returns the calling user's role.
    Auto-promotes to admin if:
      - Their email is in ADMIN_EMAILS env var, OR
      - They are the very first user ever (user_roles table is empty).
    """
    sb = get_supabase()
    user = get_calling_user(sb, authorization)
    uid = str(user.id)

    # 1. Check existing role record
    res = (
        sb.table("user_roles")
        .select("role")
        .eq("user_id", uid)
        .maybe_single()
        .execute()
    )
    if res.data:
        return {"role": res.data["role"]}

    # 2. Check ADMIN_EMAILS env var
    admin_emails = [
        e.strip()
        for e in os.environ.get("ADMIN_EMAILS", "").split(",")
        if e.strip()
    ]
    if user.email in admin_emails:
        sb.table("user_roles").insert({"user_id": uid, "role": "admin"}).execute()
        return {"role": "admin"}

    # 3. First user ever → admin
    count_res = (
        sb.table("user_roles")
        .select("user_id", count="exact")
        .execute()
    )
    if (count_res.count or 0) == 0:
        sb.table("user_roles").insert({"user_id": uid, "role": "admin"}).execute()
        return {"role": "admin"}

    # Default: viewer
    return {"role": "viewer"}


@app.get("/users")
def list_users(authorization: Optional[str] = Header(None)):
    """Admin-only: list all auth users with their roles."""
    sb = get_supabase()
    user = get_calling_user(sb, authorization)
    check_admin(sb, str(user.id))

    users_res = sb.auth.admin.list_users()
    roles_res = sb.table("user_roles").select("*").execute()
    roles_by_uid = {r["user_id"]: r["role"] for r in (roles_res.data or [])}

    return [
        {
            "id": str(u.id),
            "email": u.email,
            "role": roles_by_uid.get(str(u.id), "viewer"),
            "created_at": str(u.created_at),
        }
        for u in (users_res or [])
    ]


@app.post("/invite-user")
def invite_user(body: InviteUserRequest, authorization: Optional[str] = Header(None)):
    """Admin-only: invite a new user by email and assign their role."""
    if body.role not in ("admin", "viewer"):
        raise HTTPException(400, "Rol inválido. Debe ser 'admin' o 'viewer'.")
    sb = get_supabase()
    user = get_calling_user(sb, authorization)
    check_admin(sb, str(user.id))

    try:
        result = sb.auth.admin.invite_user_by_email(body.email)
        new_uid = str(result.user.id)
        sb.table("user_roles").upsert({"user_id": new_uid, "role": body.role}).execute()
        return {"ok": True, "user_id": new_uid}
    except Exception as e:
        raise HTTPException(400, f"Error al invitar usuario: {str(e)}")


@app.patch("/user-role/{target_user_id}")
def update_user_role(
    target_user_id: str,
    body: UpdateRoleRequest,
    authorization: Optional[str] = Header(None),
):
    """Admin-only: change an existing user's role."""
    if body.role not in ("admin", "viewer"):
        raise HTTPException(400, "Rol inválido.")
    sb = get_supabase()
    user = get_calling_user(sb, authorization)
    check_admin(sb, str(user.id))

    sb.table("user_roles").upsert({"user_id": target_user_id, "role": body.role}).execute()
    return {"ok": True}


# ── Schedule routes ───────────────────────────────────────────────────

@app.post("/generate-schedule", response_model=list[Assignment])
def generate_schedule(body: GenerateRequest):
    sb = get_supabase()

    people_res = sb.table("people").select("id, name").execute()
    people = people_res.data or []
    if not people:
        raise HTTPException(400, "No hay personas registradas en el sistema.")

    skills_res = sb.table("person_subareas").select("person_id, subarea_id").execute()
    person_skills: dict[str, set[str]] = defaultdict(set)
    for row in (skills_res.data or []):
        person_skills[row["person_id"]].add(row["subarea_id"])

    ex_res = sb.table("availability_exceptions").select("person_id, date").execute()
    exceptions: dict[str, set[str]] = defaultdict(set)
    for row in (ex_res.data or []):
        exceptions[row["person_id"]].add(row["date"])

    avail_res = sb.table("person_available_days").select("person_id, day_of_week").execute()
    person_avail_days: dict[str, set[int]] = defaultdict(set)
    for row in (avail_res.data or []):
        person_avail_days[row["person_id"]].add(row["day_of_week"])

    slots = [{"date": s.date, "service_name": s.service_name} for s in body.service_slots]
    return run_scheduler(slots, body.subareas, people, person_skills, exceptions, person_avail_days)


@app.post("/save-schedule")
def save_schedule(assignments: list[Assignment]):
    sb = get_supabase()

    groups: dict[str, dict] = {}
    for a in assignments:
        key = f"{a.date}__{a.service_name}"
        if key not in groups:
            groups[key] = {"date": a.date, "service_name": a.service_name, "items": []}
        groups[key]["items"].append(a)

    created = 0
    for g in groups.values():
        sch_res = sb.table("schedules").insert(
            {"date": g["date"], "service_name": g["service_name"]}
        ).execute()
        if not sch_res.data:
            continue
        schedule_id = sch_res.data[0]["id"]
        to_insert = [
            {
                "schedule_id": schedule_id,
                "person_id": a.person_id,
                "subarea_id": a.subarea_id,
            }
            for a in g["items"]
            if a.person_id and a.subarea_id
        ]
        if to_insert:
            sb.table("assignments").insert(to_insert).execute()
            created += len(to_insert)

    return {"ok": True, "assignments_created": created}


@app.delete("/schedule/{schedule_id}")
def delete_schedule(schedule_id: str):
    sb = get_supabase()
    # Assignments cascade-delete via FK
    sb.table("schedules").delete().eq("id", schedule_id).execute()
    return {"ok": True}


# ── Vercel handler ───────────────────────────────────────────────────
handler = Mangum(app, lifespan="off")

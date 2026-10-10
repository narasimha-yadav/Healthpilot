from __future__ import annotations

import sqlite3
import hashlib
import secrets
import json
import os
from datetime import date
from pathlib import Path
from typing import Any

from fastapi import File, FastAPI, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="HealthPilot API", version="1.0.0")
DATABASE_PATH = Path(
    os.environ.get(
        "HEALTHPILOT_DATABASE_PATH",
        "/tmp/healthpilot.db"
        if os.environ.get("VERCEL")
        else str(Path(__file__).with_name("healthpilot.db")),
    )
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HealthPilotChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    language: str = Field(default="en", pattern="^(en|te|hi)$")
    person: str = Field(default="me", pattern="^(me|family)$")


class FamilyMemberCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    relation: str = Field(..., min_length=1, max_length=120)
    phone: str = Field(default="", max_length=40)


class AuthRequest(BaseModel):
    identity: str = Field(..., min_length=3, max_length=160)
    password: str = Field(..., min_length=6, max_length=256)


class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=120)
    email: str = Field(..., min_length=3, max_length=160)
    password: str = Field(..., min_length=6, max_length=256)
    phone: str = Field(..., min_length=7, max_length=30)


class PasswordResetRequest(BaseModel):
    identity: str = Field(..., min_length=3, max_length=160)
    code: str = Field(..., min_length=6, max_length=6)
    password: str = Field(..., min_length=6, max_length=256)


class PasswordResetStart(BaseModel):
    identity: str = Field(..., min_length=3, max_length=160)


class AccountVerificationRequest(BaseModel):
    identity: str = Field(..., min_length=3, max_length=160)
    code: str = Field(..., min_length=6, max_length=6)


class AccountVerificationStart(BaseModel):
    identity: str = Field(..., min_length=3, max_length=160)


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 120_000)
    return f"pbkdf2_sha256$120000${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algorithm, rounds, salt_hex, digest_hex = stored.split("$")
        if algorithm != "pbkdf2_sha256":
            return False
        digest = hashlib.pbkdf2_hmac(
            "sha256", password.encode(), bytes.fromhex(salt_hex), int(rounds)
        )
        return secrets.compare_digest(digest.hex(), digest_hex)
    except (ValueError, TypeError):
        return False


def get_database() -> sqlite3.Connection:
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


@app.on_event("startup")
def initialize_database() -> None:
    with get_database() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS family_members (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                owner_identity TEXT NOT NULL DEFAULT 'demo-patient',
                name TEXT NOT NULL,
                relation TEXT NOT NULL,
                phone TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS password_resets (
                identity TEXT PRIMARY KEY COLLATE NOCASE,
                code TEXT NOT NULL,
                expires_at INTEGER NOT NULL
            )
            """
        )
        columns = {row[1] for row in connection.execute("PRAGMA table_info(family_members)")}
        if "owner_identity" not in columns:
            connection.execute(
                "ALTER TABLE family_members ADD COLUMN owner_identity TEXT NOT NULL DEFAULT 'demo-patient'"
            )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                identity TEXT NOT NULL UNIQUE COLLATE NOCASE,
                password_hash TEXT NOT NULL,
                full_name TEXT NOT NULL DEFAULT '',
                email TEXT NOT NULL DEFAULT '',
                phone TEXT NOT NULL DEFAULT '',
                verified INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        user_columns = {row[1] for row in connection.execute("PRAGMA table_info(users)")}
        if "verified" not in user_columns:
            connection.execute("ALTER TABLE users ADD COLUMN verified INTEGER NOT NULL DEFAULT 1")
        for column in ("full_name", "email", "phone"):
            if column not in user_columns:
                connection.execute(f"ALTER TABLE users ADD COLUMN {column} TEXT NOT NULL DEFAULT ''")
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS account_verifications (
                identity TEXT PRIMARY KEY COLLATE NOCASE,
                code TEXT NOT NULL,
                expires_at INTEGER NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS medicine_status (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                owner_identity TEXT NOT NULL,
                medicine_id INTEGER NOT NULL,
                status TEXT NOT NULL CHECK(status IN ('taken', 'missed')),
                status_date TEXT NOT NULL,
                UNIQUE(owner_identity, medicine_id, status_date)
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS health_reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                owner_identity TEXT NOT NULL,
                name TEXT NOT NULL,
                source TEXT NOT NULL,
                results_json TEXT NOT NULL DEFAULT '[]',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS chat_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                owner_identity TEXT NOT NULL,
                sender TEXT NOT NULL CHECK(sender IN ('user', 'ai')),
                message TEXT NOT NULL,
                language TEXT NOT NULL,
                person TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        if connection.execute("SELECT COUNT(*) FROM family_members").fetchone()[0] == 0:
            connection.execute(
                """
                INSERT INTO family_members (name, relation, phone)
                VALUES (?, ?, ?)
                """,
                ("Priya Sharma", "Daughter · Your supporter", ""),
            )
        connection.execute(
            """
            UPDATE family_members
            SET phone = ''
            WHERE name IN (?, ?, ?)
            """,
            ("Priya Sharma", "Owner A Family", "me"),
        )


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "healthy", "service": "HealthPilot backend", "database": "sqlite"}


@app.post("/api/auth/register", status_code=201)
def register(payload: RegisterRequest) -> dict[str, str]:
    identity = payload.email.strip()
    phone = payload.phone.strip()
    if not phone:
        raise HTTPException(status_code=422, detail="Phone number is required.")
    if not identity:
        raise HTTPException(status_code=422, detail="Email or username is required.")
    with get_database() as connection:
        try:
            if phone and connection.execute(
                "SELECT 1 FROM users WHERE phone = ?", (phone,)
            ).fetchone():
                raise HTTPException(
                    status_code=409, detail="That email or phone number is already registered."
                )
            connection.execute(
                """
                INSERT INTO users (identity, password_hash, full_name, email, phone, verified)
                VALUES (?, ?, ?, ?, ?, 0)
                """,
                (identity, hash_password(payload.password), payload.full_name.strip(), identity, phone),
            )
            code = f"{secrets.randbelow(1_000_000):06d}"
            connection.execute(
                """
                INSERT INTO account_verifications (identity, code, expires_at)
                VALUES (?, ?, strftime('%s', 'now') + 900)
                """,
                (identity, code),
            )
        except sqlite3.IntegrityError as error:
            raise HTTPException(
                status_code=409, detail="That email or phone number is already registered."
            ) from error
    return {
        "status": "verification_required",
        "identity": identity,
        "development_code": code,
    }


@app.post("/api/auth/login")
def login(payload: AuthRequest) -> dict[str, str]:
    identity = payload.identity.strip()
    with get_database() as connection:
        user = connection.execute(
            """
            SELECT identity, password_hash, full_name, verified FROM users
            WHERE (identity = ? COLLATE NOCASE OR phone = ?)
            """,
            (identity, identity),
        ).fetchone()
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect email/username or password.")
    if not user["verified"]:
        raise HTTPException(status_code=403, detail="Verify your account before logging in.")
    return {
        "status": "ok",
        "identity": user["identity"],
        "full_name": user["full_name"] or user["identity"],
    }


@app.post("/api/auth/verification/request")
def request_account_verification(payload: AccountVerificationStart) -> dict[str, str]:
    identity = payload.identity.strip()
    with get_database() as connection:
        user = connection.execute(
            "SELECT identity, verified FROM users WHERE identity = ? COLLATE NOCASE",
            (identity,),
        ).fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="No account was found for that email or username.")
        if user["verified"]:
            raise HTTPException(status_code=400, detail="This account is already verified.")
        code = f"{secrets.randbelow(1_000_000):06d}"
        connection.execute(
            """
            INSERT INTO account_verifications (identity, code, expires_at)
            VALUES (?, ?, strftime('%s', 'now') + 900)
            ON CONFLICT(identity) DO UPDATE SET code = excluded.code, expires_at = excluded.expires_at
            """,
            (user["identity"], code),
        )
    return {"status": "code_created", "development_code": code}


@app.post("/api/auth/verification/confirm")
def confirm_account_verification(payload: AccountVerificationRequest) -> dict[str, str]:
    identity = payload.identity.strip()
    with get_database() as connection:
        verification = connection.execute(
            """
            SELECT code FROM account_verifications
            WHERE identity = ? COLLATE NOCASE AND expires_at >= strftime('%s', 'now')
            """,
            (identity,),
        ).fetchone()
        if not verification or not secrets.compare_digest(payload.code, verification["code"]):
            raise HTTPException(status_code=400, detail="The verification code is invalid or expired.")
        connection.execute(
            "UPDATE users SET verified = 1 WHERE identity = ? COLLATE NOCASE",
            (identity,),
        )
        connection.execute(
            "DELETE FROM account_verifications WHERE identity = ? COLLATE NOCASE",
            (identity,),
        )
    return {"status": "verified", "identity": identity}


@app.post("/api/auth/password-reset/request")
def request_password_reset(payload: PasswordResetStart) -> dict[str, str]:
    identity = payload.identity.strip()
    with get_database() as connection:
        user = connection.execute(
            "SELECT identity FROM users WHERE identity = ? COLLATE NOCASE OR phone = ?",
            (identity, identity),
        ).fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="No account was found for that email or username.")
        code = f"{secrets.randbelow(1_000_000):06d}"
        connection.execute(
            """
            INSERT INTO password_resets (identity, code, expires_at)
            VALUES (?, ?, strftime('%s', 'now') + 900)
            ON CONFLICT(identity) DO UPDATE SET code = excluded.code, expires_at = excluded.expires_at
            """,
            (user["identity"], code),
        )
    return {"status": "code_created", "message": "Use the six-digit reset code shown for local development.", "development_code": code}


@app.post("/api/auth/password-reset/confirm")
def confirm_password_reset(payload: PasswordResetRequest) -> dict[str, str]:
    identity = payload.identity.strip()
    with get_database() as connection:
        user = connection.execute(
            "SELECT identity FROM users WHERE identity = ? COLLATE NOCASE OR phone = ?",
            (identity, identity),
        ).fetchone()
        canonical_identity = user["identity"] if user else identity
        reset = connection.execute(
            "SELECT code, expires_at FROM password_resets WHERE identity = ? COLLATE NOCASE",
            (canonical_identity,),
        ).fetchone()
        if not reset or reset["code"] != payload.code or reset["expires_at"] < int(__import__("time").time()):
            raise HTTPException(status_code=400, detail="The reset code is invalid or expired.")
        connection.execute(
            "UPDATE users SET password_hash = ? WHERE identity = ? COLLATE NOCASE",
            (hash_password(payload.password), canonical_identity),
        )
        connection.execute("DELETE FROM password_resets WHERE identity = ? COLLATE NOCASE", (canonical_identity,))
    return {"status": "password_updated"}


def request_identity(identity: str | None) -> str:
    identity = (identity or "").strip()
    if not identity:
        raise HTTPException(status_code=401, detail="Log in to access your family members.")
    return identity


@app.get("/api/healthpilot/medicines")
def list_medicines(identity: str | None = None) -> dict[str, Any]:
    owner = request_identity(identity)
    with get_database() as connection:
        rows = connection.execute(
            """
            SELECT medicine_id, status
            FROM medicine_status
            WHERE owner_identity = ? AND status_date = ?
            """,
            (owner, date.today().isoformat()),
        ).fetchall()
    return {"statuses": [dict(row) for row in rows]}


class MedicineStatusUpdate(BaseModel):
    medicine_id: int = Field(..., ge=1)
    status: str = Field(..., pattern="^(taken|missed)$")


@app.put("/api/healthpilot/medicines/status")
def update_medicine_status(
    payload: MedicineStatusUpdate, identity: str | None = None
) -> dict[str, str]:
    owner = request_identity(identity)
    with get_database() as connection:
        connection.execute(
            """
            INSERT INTO medicine_status (owner_identity, medicine_id, status, status_date)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(owner_identity, medicine_id, status_date)
            DO UPDATE SET status = excluded.status
            """,
            (owner, payload.medicine_id, payload.status, date.today().isoformat()),
        )
    return {"status": "saved"}


@app.delete("/api/healthpilot/medicines/status")
def reset_medicine_status(identity: str | None = None) -> dict[str, str]:
    owner = request_identity(identity)
    with get_database() as connection:
        connection.execute(
            "DELETE FROM medicine_status WHERE owner_identity = ? AND status_date = ?",
            (owner, date.today().isoformat()),
        )
    return {"status": "reset"}


class HealthReportCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    source: str = Field(default="sample", pattern="^(sample|upload)$")
    results: list[list[str]] = Field(default_factory=list)


@app.get("/api/healthpilot/reports")
def list_reports(identity: str | None = None) -> dict[str, Any]:
    owner = request_identity(identity)
    with get_database() as connection:
        rows = connection.execute(
            """
            SELECT id, name, source, results_json, created_at
            FROM health_reports
            WHERE owner_identity = ?
            ORDER BY created_at DESC, id DESC
            """,
            (owner,),
        ).fetchall()
    return {
        "reports": [
            {
                "id": row["id"],
                "name": row["name"],
                "source": row["source"],
                "results": json.loads(row["results_json"]),
                "created_at": row["created_at"],
            }
            for row in rows
        ]
    }


@app.post("/api/healthpilot/reports", status_code=201)
def create_report(payload: HealthReportCreate, identity: str | None = None) -> dict[str, Any]:
    owner = request_identity(identity)
    with get_database() as connection:
        cursor = connection.execute(
            """
            INSERT INTO health_reports (owner_identity, name, source, results_json)
            VALUES (?, ?, ?, ?)
            """,
            (owner, payload.name.strip(), payload.source, json.dumps(payload.results)),
        )
        row = connection.execute(
            "SELECT id, name, source, results_json, created_at FROM health_reports WHERE id = ?",
            (cursor.lastrowid,),
        ).fetchone()
    return {
        "report": {
            "id": row["id"],
            "name": row["name"],
            "source": row["source"],
            "results": json.loads(row["results_json"]),
            "created_at": row["created_at"],
        }
    }


@app.get("/api/healthpilot/family-members")
def list_family_members(identity: str | None = None) -> dict[str, Any]:
    owner = request_identity(identity)
    with get_database() as connection:
        rows = connection.execute(
            "SELECT id, name, relation, phone FROM family_members WHERE owner_identity = ? ORDER BY id",
            (owner,),
        ).fetchall()
    return {"members": [dict(row) for row in rows]}


@app.post("/api/healthpilot/family-members", status_code=201)
def create_family_member(payload: FamilyMemberCreate, identity: str | None = None) -> dict[str, Any]:
    owner = request_identity(identity)
    name = payload.name.strip()
    relation = payload.relation.strip()
    if not name or not relation:
        raise HTTPException(status_code=422, detail="Name and relationship are required.")
    with get_database() as connection:
        cursor = connection.execute(
            "INSERT INTO family_members (owner_identity, name, relation, phone) VALUES (?, ?, ?, ?)",
            (owner, name, relation, payload.phone.strip()),
        )
        row = connection.execute(
            "SELECT id, name, relation, phone FROM family_members WHERE id = ?",
            (cursor.lastrowid,),
        ).fetchone()
    return {"member": dict(row)}


@app.post("/api/healthpilot/chat")
def healthpilot_chat(payload: HealthPilotChatRequest, identity: str | None = None) -> dict[str, str]:
    owner = request_identity(identity)
    message = payload.message.lower()
    emergency_terms = (
        "chest pain",
        "trouble breathing",
        "shortness of breath",
        "fainting",
        "stroke",
        "uncontrolled bleeding",
    )

    if any(term in message for term in emergency_terms):
        replies = {
            "en": "This may be an emergency. Call 108 or 112, or go to the nearest hospital now. Do not wait for a chat reply.",
            "te": "ఇది అత్యవసర పరిస్థితి కావచ్చు. వెంటనే 108 లేదా 112కు కాల్ చేయండి లేదా దగ్గరి ఆసుపత్రికి వెళ్లండి.",
            "hi": "यह आपात स्थिति हो सकती है। अभी 108 या 112 पर कॉल करें या नज़दीकी अस्पताल जाएँ।",
        }
    else:
        replies = {
            "en": "I can explain this in simple words. Follow your doctor's plan, and ask your doctor or pharmacist before changing any medicine or dose.",
            "te": "నేను దీన్ని సులభమైన మాటల్లో వివరిస్తాను. మీ డాక్టర్ ప్రణాళికను అనుసరించండి. మందు లేదా మోతాదును మార్చే ముందు డాక్టర్ లేదా ఫార్మసిస్ట్‌ను అడగండి.",
            "hi": "मैं इसे आसान भाषा में समझा सकता हूँ। अपने डॉक्टर की योजना का पालन करें। दवा या खुराक बदलने से पहले डॉक्टर या फार्मासिस्ट से पूछें।",
        }

    reply = replies[payload.language]
    with get_database() as connection:
        connection.executemany(
            """
            INSERT INTO chat_messages (owner_identity, sender, message, language, person)
            VALUES (?, ?, ?, ?, ?)
            """,
            [
                (owner, "user", payload.message.strip(), payload.language, payload.person),
                (owner, "ai", reply, payload.language, payload.person),
            ],
        )
    return {"reply": reply, "status": "ok", "language": payload.language}


@app.get("/api/healthpilot/chat/history")
def chat_history(identity: str | None = None) -> dict[str, Any]:
    owner = request_identity(identity)
    with get_database() as connection:
        rows = connection.execute(
            """
            SELECT id, sender, message, language, person, created_at
            FROM chat_messages
            WHERE owner_identity = ?
            ORDER BY id
            LIMIT 100
            """,
            (owner,),
        ).fetchall()
    return {"messages": [dict(row) for row in rows]}


@app.post("/api/healthpilot/reports/analyze")
async def analyze_healthpilot_report(
    file: UploadFile = File(...),
    language: str = Form(default="en"),
) -> dict[str, Any]:
    if language not in {"en", "te", "hi"}:
        raise HTTPException(status_code=400, detail="Language must be en, te, or hi")
    if file.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(status_code=415, detail="Upload a JPG, PNG, or WebP medical report image.")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="The uploaded image is empty.")

    raise HTTPException(
        status_code=501,
        detail="Medical report reading is not configured yet. Use the sample report until an approved OCR/AI service is connected.",
    )

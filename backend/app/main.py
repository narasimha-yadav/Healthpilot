from __future__ import annotations

import sqlite3
import hashlib
import secrets
import json
import os
import smtplib
import ssl
import urllib.error
import urllib.request
from datetime import date
from pathlib import Path
from typing import Any
from email.message import EmailMessage

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


def send_verification_email(recipient: str, code: str) -> bool:
    smtp_user = os.environ.get("GMAIL_SMTP_USER")
    smtp_password = os.environ.get("GMAIL_SMTP_APP_PASSWORD")
    if not smtp_user or not smtp_password:
        return False

    message = EmailMessage()
    message["Subject"] = "Your HealthPilot verification code"
    message["From"] = smtp_user
    message["To"] = recipient
    message.set_content(
        f"Your HealthPilot verification code is {code}.\n\n"
        "This code expires in 15 minutes. If you did not create this account, "
        "you can ignore this email."
    )
    context = ssl.create_default_context()
    with smtplib.SMTP("smtp.gmail.com", 587, timeout=15) as server:
        server.starttls(context=context)
        server.login(smtp_user, smtp_password)
        server.send_message(message)
    return True


def send_code_or_raise(recipient: str, code: str) -> None:
    smtp_user = os.environ.get("GMAIL_SMTP_USER")
    smtp_password = os.environ.get("GMAIL_SMTP_APP_PASSWORD")
    if not smtp_user and not smtp_password:
        return
    if not smtp_user or not smtp_password:
        raise HTTPException(
            status_code=503,
            detail="Gmail verification is not configured completely.",
        )
    try:
        send_verification_email(recipient, code)
    except (OSError, smtplib.SMTPException) as error:
        raise HTTPException(
            status_code=503,
            detail="Verification email could not be sent. Please try again later.",
        ) from error


def gemini_reply(message: str, language: str, person: str) -> str | None:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return None

    prompt = (
        "You are HealthPilot, a careful health education assistant. "
        "Give concise, plain-language information, never diagnose, never prescribe, "
        "and tell the user to contact a qualified clinician for personal decisions. "
        "If the user describes an emergency, tell them to call local emergency services "
        "immediately. Reply in the requested language. "
        f"Requested language: {language}. Context person: {person}. User message: {message}"
    )
    body = json.dumps(
        {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.2, "maxOutputTokens": 300},
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        "https://generativelanguage.googleapis.com/v1beta/models/"
        "gemini-2.5-flash:generateContent",
        data=body,
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": api_key,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            result = json.loads(response.read().decode("utf-8"))
        return result["candidates"][0]["content"]["parts"][0]["text"].strip()
    except (
        OSError,
        urllib.error.HTTPError,
        KeyError,
        IndexError,
        TypeError,
        json.JSONDecodeError,
    ):
        return None


def get_database() -> sqlite3.Connection:
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def fallback_health_reply(message: str, language: str) -> str:
    normalized = message.lower()
    if "hba1c" in normalized or "a1c" in normalized:
        return {
            "en": "HbA1c estimates your average blood sugar over roughly the last 2 to 3 months. Ask your doctor about your personal target and whether your result needs follow-up.",
            "te": "HbA1c గత 2 నుంచి 3 నెలల సగటు రక్త చక్కెరను చూపిస్తుంది. మీ లక్ష్యం మరియు తదుపరి చర్యలను మీ డాక్టర్‌తో చర్చించండి.",
            "hi": "HbA1c लगभग पिछले 2 से 3 महीनों की औसत रक्त शर्करा दिखाता है। अपने लक्ष्य और आगे की जाँच के बारे में डॉक्टर से पूछें।",
        }[language]
    if "medicine" in normalized or "dose" in normalized or "tablet" in normalized:
        return {
            "en": "Take medicines exactly as prescribed and do not change a dose without your doctor or pharmacist. Keep a record of doses and side effects.",
            "te": "మందులను డాక్టర్ సూచించిన విధంగానే తీసుకోండి. డాక్టర్ లేదా ఫార్మసిస్ట్‌ను అడగకుండా మోతాదును మార్చవద్దు.",
            "hi": "दवाएँ डॉक्टर के बताए अनुसार लें। डॉक्टर या फार्मासिस्ट से पूछे बिना खुराक न बदलें।",
        }[language]
    return {
        "en": "I can explain health information in simple words. Follow your clinician's plan and ask your doctor or pharmacist before changing any medicine or dose.",
        "te": "నేను ఆరోగ్య సమాచారాన్ని సులభమైన మాటల్లో వివరించగలను. మందు లేదా మోతాదు మార్చే ముందు మీ డాక్టర్ లేదా ఫార్మసిస్ట్‌ను అడగండి.",
        "hi": "मैं स्वास्थ्य जानकारी आसान भाषा में समझा सकता हूँ। दवा या खुराक बदलने से पहले डॉक्टर या फार्मासिस्ट से पूछें।",
    }[language]


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
    return {
        "status": "healthy",
        "service": "HealthPilot backend",
        "database": "sqlite",
        "gemini_configured": str(bool(os.environ.get("GEMINI_API_KEY"))).lower(),
        "email_configured": str(
            bool(
                os.environ.get("GMAIL_SMTP_USER")
                and os.environ.get("GMAIL_SMTP_APP_PASSWORD")
            )
        ).lower(),
    }


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
    send_code_or_raise(identity, code)
    return {
        "status": "verification_required",
        "identity": identity,
        **(
            {"message": "A verification code was sent to your email address."}
            if os.environ.get("GMAIL_SMTP_USER")
            else {"development_code": code}
        ),
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
    send_code_or_raise(user["identity"], code)
    return {
        "status": "code_created",
        **(
            {"message": "A new verification code was sent to your email address."}
            if os.environ.get("GMAIL_SMTP_USER")
            else {"development_code": code}
        ),
    }


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
        replies = None

    reply = (
        replies[payload.language]
        if replies is not None
        else fallback_health_reply(payload.message, payload.language)
    )
    provider = "fallback"
    if not any(term in message for term in emergency_terms):
        ai_reply = gemini_reply(payload.message.strip(), payload.language, payload.person)
        if ai_reply:
            reply = ai_reply
            provider = "gemini"
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
    return {"reply": reply, "status": "ok", "language": payload.language, "provider": provider}


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

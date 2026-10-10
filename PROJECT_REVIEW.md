# HealthPilot Project Review Guide

## 1. Executive summary

HealthPilot is a responsive healthcare companion application built for local
use. It helps a patient or caregiver:

- create and verify a local account;
- log in with a required phone number and password;
- track medicines taken or missed today;
- maintain a private care-circle/family list;
- save health-report history;
- ask safety-focused health questions;
- review chat history;
- use English, Telugu, or Hindi;
- use light or dark mode on phone, tablet, or desktop layouts.

The current implementation is a functional local prototype. It uses React and
Vite in the browser, FastAPI for the HTTP API, and SQLite for permanent local
storage.

## 2. Technology stack

### Frontend

- React 18.3.1
- Vite 5.4.10 or later within the declared range
- JavaScript and JSX
- Custom CSS; no UI framework
- Browser `fetch`, `sessionStorage`, `localStorage`, speech recognition, and
  speech synthesis where supported

### Backend

- FastAPI 0.115.0
- Uvicorn 0.30.6
- Pydantic 2.9.2
- python-multipart 0.0.1
- SQLite through Python's standard `sqlite3` module
- PBKDF2-HMAC-SHA256 password hashing

## 3. Repository structure

```text
bytexl/
├── README.md
├── PROJECT_REVIEW.md
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   ├── public/
│   │   └── altrix-labs-logo.png
│   └── src/
│       ├── App.jsx
│       ├── api.js
│       ├── main.jsx
│       └── styles.css
└── backend/
    ├── requirements.txt
    └── app/
        ├── __init__.py
        ├── main.py
        └── healthpilot.db
```

`App.jsx` contains the primary screens and application state. `api.js` is the
single browser-to-backend API wrapper. `styles.css` contains the responsive
visual system. `main.py` contains the FastAPI application, database
initialization, validation models, and persistence endpoints.

## 4. How to run the project

### Step 1: Install frontend dependencies

```powershell
cd C:\Users\rlnrs\.vscode\cli\bytexl\frontend
npm install
```

### Step 2: Start the backend

The project already has a backend virtual environment. Use it on Windows:

```powershell
cd C:\Users\rlnrs\.vscode\cli\bytexl\backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### Step 3: Start the frontend

Use the package script without adding duplicate Vite arguments:

```powershell
cd C:\Users\rlnrs\.vscode\cli\bytexl\frontend
npm run dev
```

Open <http://127.0.0.1:4173>.

### Step 4: Check backend health

Open <http://127.0.0.1:8000/api/health>. A healthy response is:

```json
{
  "status": "healthy",
  "service": "HealthPilot backend",
  "database": "sqlite"
}
```

## 5. Account flow: step by step

### Create an account

1. Open the **Create Account** tab.
2. Enter full name.
3. Enter email.
4. Enter a required phone number.
5. Enter a password of at least six characters.
6. Confirm the password.
7. Accept the Terms and Conditions checkbox.
8. Submit the form.
9. The backend creates an unverified user and a six-digit local verification
   code.
10. The verification screen opens. In local development, the code is returned
    by the API so the flow can be tested without an email provider.
11. Enter the code and verify the account.

### Log in

1. Open the **Log In** tab.
2. Enter the registered phone number.
3. Enter the password.
4. Optionally select **Remember Me**.
5. Submit the form.
6. The browser session opens the HealthPilot dashboard.

The active identity is held in `sessionStorage` under `healthpilot-user`.
Remember Me stores only an identity value in `localStorage`; it does not store
the password.

### Forgot Password

1. Enter the phone number.
2. Select **Forgot Password?**
3. A six-digit reset code is created.
4. Enter the code and a new password.
5. Submit the reset form.
6. Return to Log In and use the new password.

The local reset code is currently returned by the API. Production must deliver
it through a trusted SMS or email provider instead.

## 6. Main user flows

### Home and medicine adherence

The Home screen displays three sample medicines and today's adherence
percentage. Each medicine supports:

- mark as taken;
- mark as missed;
- reset today's status.

The status is saved by owner, medicine ID, and date. It survives a page refresh
and is isolated by the active account.

### Family support

The Family screen displays the account's care-circle members. A user can add a
member with:

- name;
- relationship;
- optional phone.

The current alert setting controls the missed-dose threshold shown on screen.
Family alerts are currently simulated in the UI and do not send real messages.

### Reports and records

Records display saved health-report metadata and result history. Sample report
content is available for demonstration, and the built-in explanation library
turns extracted values into plain-language guidance. The upload analysis
endpoint validates image uploads but is intentionally not connected to OCR or a
medical model; it returns a clear not-configured response until a real
processing service is selected.

### Ask HealthPilot

The Ask screen sends a question, language, and person context to the backend.
The backend returns a short safety-focused answer and stores both the user
message and AI response in chat history. Emergency phrases such as chest pain,
breathing difficulty, fainting, stroke signs, and uncontrolled bleeding receive
an urgent-care response.

### Accessibility and responsive behavior

- The layout adapts to mobile, tablet, and desktop widths.
- Mobile navigation is presented at the bottom.
- Visible focus states are provided for keyboard users.
- Password fields have show/hide controls.
- Voice controls appear only when browser speech APIs are available.
- Reduced-motion preferences are respected.
- English, Telugu, and Hindi UI options are available.

## Feature brief alignment

| Brief requirement | Status in prototype |
| --- | --- |
| Medical record intelligence and OCR | Text-based extraction and report analysis are implemented. OCR is designed but not running in the demo because no OCR provider is configured. |
| Plain-language AI health summary | Implemented through the built-in explanation library, including English and Telugu responses. |
| Unified health profile / timeline | Implemented with saved report history, timeline views, and cross-record HbA1c trends. |
| Multi-language bonus | Telugu summaries and labels are implemented. Hindi is available in the current interface; Tamil can follow the same translation pattern. |
| ABDM / ABHA bonus | The current model stores structured observations and can be mapped to FHIR-style records. FHIR bundle output and a mock ABHA ID are planned additions, not yet active in the prototype. |
| Architecture diagram | The intended upload, extraction/OCR, normalization, summary, and timeline pipeline is described in the README. |
| Demo | The demo supports sample report analysis, health explanations, report history, trends, medicine adherence, multilingual labels, and family support. |

## 7. Database design

The database file is:

```text
backend/app/healthpilot.db
```

Tables created or migrated by `initialize_database()`:

| Table | Purpose | Important fields |
|---|---|---|
| `users` | Account identity and password data | identity, password_hash, full_name, email, phone, verified |
| `account_verifications` | Temporary account verification codes | identity, code, expires_at |
| `password_resets` | Temporary password reset codes | identity, code, expires_at |
| `family_members` | Account-owned care-circle entries | owner_identity, name, relation, phone |
| `medicine_status` | Daily medicine status | owner_identity, medicine_id, status, status_date |
| `health_reports` | Saved report metadata and result JSON | owner_identity, name, source, results_json |
| `chat_messages` | User and AI conversation history | owner_identity, sender, message, language, person |

Startup migration logic checks existing table columns and adds compatible
columns when needed. This allows older local databases to continue working
after the account and ownership features were added.

## 8. API reference

### Health

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Backend and SQLite health check |

### Authentication

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create an unverified account |
| POST | `/api/auth/login` | Authenticate with phone and password |
| POST | `/api/auth/verification/request` | Create a new verification code |
| POST | `/api/auth/verification/confirm` | Verify an account |
| POST | `/api/auth/password-reset/request` | Create a reset code |
| POST | `/api/auth/password-reset/confirm` | Set a new password |

### Patient data

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/healthpilot/medicines` | Load today's saved medicine statuses |
| PUT | `/api/healthpilot/medicines/status` | Save taken or missed status |
| GET | `/api/healthpilot/reports` | List account reports |
| POST | `/api/healthpilot/reports` | Save report metadata and results |
| GET | `/api/healthpilot/family-members` | List account family members |
| POST | `/api/healthpilot/family-members` | Add a family member |
| POST | `/api/healthpilot/chat` | Ask a HealthPilot question |
| GET | `/api/healthpilot/chat/history` | Load saved chat history |
| POST | `/api/healthpilot/reports/analyze` | Upload analysis placeholder |

The browser sends the active identity as a request parameter and
`X-User-Identity` header. This is sufficient for local demonstration and
account separation, but it is not a production authentication boundary.

## 9. Password security

Passwords are not stored in plain text. The backend:

1. generates a random 16-byte salt;
2. derives a PBKDF2-HMAC-SHA256 digest;
3. uses 120,000 iterations;
4. stores the algorithm, iteration count, salt, and digest;
5. compares login digests with `secrets.compare_digest`.

The browser never stores the password. Production should additionally use
server-issued signed sessions or short-lived access tokens.

## 10. Validation performed

The project has been checked with:

```powershell
cd C:\Users\rlnrs\.vscode\cli\bytexl\frontend
npm run build
```

```powershell
cd C:\Users\rlnrs\.vscode\cli\bytexl\backend
.\.venv\Scripts\python.exe -m py_compile app\main.py
```

The reviewer smoke test should also:

1. load the login page;
2. open Create Account;
3. confirm all six fields are visible;
4. submit invalid data and confirm validation messages;
5. create an account;
6. verify the account code;
7. log in with phone and password;
8. mark a medicine taken;
9. open Family and add a member;
10. open Ask and send a question;
11. log out and log back in;
12. confirm data remains after refresh.

Recent runtime checks confirmed:

- no browser JavaScript exceptions on the tested paths;
- no failed API responses during dashboard, medicine, and Family navigation;
- frontend build passed;
- backend syntax passed;
- `/api/health` returned HTTP 200;
- frontend returned HTTP 200;
- SQLite reported healthy.

## 11. Known limitations

This is not yet a production clinical system. The following are intentionally
local or simulated:

- account identity is client-controlled rather than protected by signed tokens;
- verification codes are returned in API responses;
- password reset codes are returned in API responses;
- Google OAuth is not configured;
- SMS and email delivery are not configured;
- report OCR and medical AI are not configured;
- family alerts do not send real messages;
- medicine definitions are currently sample data;
- no production backup, monitoring, audit log, or deployment configuration is
  included;
- no clinical diagnosis is provided.

Before production, add token-based authentication, HTTPS, secret management,
rate limiting, account lockout controls, provider-backed verification and
reset delivery, database backups, audit logging, monitoring, automated tests,
and a formal clinical/privacy review.

## 12. Reviewer conclusion

The current deliverable is a working local HealthPilot prototype with a
responsive React interface, FastAPI service layer, SQLite persistence, account
verification, phone-based login, password reset, and account-specific health
data. The core flows are implemented and locally validated. Production
readiness requires the security and external-service work listed above.

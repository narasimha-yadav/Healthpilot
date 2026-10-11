# HealthPilot Project Documentation

## 1. Executive summary

HealthPilot is a mobile-first personal health copilot prototype for the Altrix
Labs AI-Powered Personal Health Copilot challenge. It helps people and family
caregivers:

- organize medicines and daily adherence;
- review sample medical records and health trends;
- ask health-education questions in plain language;
- prepare questions for a clinician;
- involve a family supporter; and
- use English, Telugu, Hindi, and Tamil interface options where translations
  are available.

HealthPilot is an educational support tool. It does not diagnose conditions,
prescribe medicines, replace a clinician, or provide emergency care.

## 2. Challenge alignment

| Challenge area | Current implementation |
| --- | --- |
| Medical-record intelligence | Structured sample reports, report history, extracted observations, medicines, dates, and explanations |
| OCR | Upload endpoint and analysis boundary are present; a production OCR provider is not connected in this prototype |
| Plain-language summaries | Built-in health explanations and the Ask HealthPilot assistant |
| Unified health profile | Dashboard, report history, medicine adherence, HbA1c trend, and health timeline |
| Family support | Family-member records and on-screen missed-dose support state |
| Multilingual support | English, Telugu, Hindi, and Tamil UI options; coverage varies by content |
| ABDM/ABHA readiness | Data structures and report flow are designed for future FHIR-style mapping; live ABDM integration is not included |
| Safety | Emergency phrases are handled locally and direct the user to call 108 or 112 |

## 3. User journey

1. Open the public application.
2. Log in or use the demo patient option.
3. Review the dashboard:
   - today's medicine schedule;
   - adherence percentage;
   - family-support status; and
   - latest report summary.
4. Open **Ask HealthPilot** and choose a quick question or type a question.
5. Open **Records** to review report observations, explanations, and trends.
6. Use **Add** to add a report or medicine.
7. Use **Family** to review the supporter relationship.
8. Change language or theme from the application controls.

### Recommended demonstration script

For a short submission demo:

1. Start on the dashboard and point out adherence and the latest report.
2. Open Ask HealthPilot and ask, “What does my HbA1c result mean?”
3. Show the plain-language response and the medical-safety note.
4. Mark one medicine as taken and show the adherence update.
5. Open Records and show the health timeline and HbA1c trend.
6. Switch the interface to Telugu or Hindi.
7. Ask an emergency-style question such as “I have chest pain” and show that
   the local emergency guidance appears without waiting for an AI response.

## 4. Architecture

```text
                    +----------------------+
                    | React/Vite frontend  |
                    | Vercel static site   |
                    +----------+-----------+
                               |
                         REST/JSON + identity
                               |
                    +----------v-----------+
                    | FastAPI backend      |
                    | Vercel serverless    |
                    +----+------+----------+
                         |      |
                   +-----v+   +-v----------------+
                   |SQLite|   | Gemini REST API  |
                   |data  |   | optional provider|
                   +------+   +-----------------+

 Upload/report flow:
 image or sample report -> extraction boundary -> observations/medicines
 -> plain-language explanation -> report history and health timeline
```

### Frontend

The frontend is a React single-page application built with Vite. The main
screen and feature views are implemented in
[`frontend/src/App.jsx`](../frontend/src/App.jsx). API calls are centralized in
[`frontend/src/api.js`](../frontend/src/api.js). The production build is
generated in `frontend/dist`.

### Backend

The backend is a FastAPI application in
[`backend/app/main.py`](../backend/app/main.py). It provides authentication,
verification, password reset, medicines, reports, family members, chat, and
health checks.

### Persistence

SQLite is used for the prototype. Local development stores the database in
`backend/app/healthpilot.db`. Vercel uses `/tmp/healthpilot.db` because the
deployment filesystem is read-only and ephemeral. A production deployment
should replace this with a managed database and migrations.

### Identity

The current prototype uses a lightweight identity value in
`sessionStorage['healthpilot-user']`, sent as the `X-User-Identity` header.
This is sufficient for the demo flow but is not a replacement for a signed
session or token-based production authentication system.

## 5. Repository structure

```text
backend/
  app/main.py           FastAPI application and database access
  requirements.txt      Python dependencies
  Dockerfile            Container definition for backend hosting
frontend/
  src/App.jsx           React screens and user flows
  src/api.js            Frontend API client
  src/styles.css        Application styling
  package.json          Node/Vite project configuration
docs/
  PROJECT_DOCUMENTATION.md
docker-compose.yml      Local two-service development setup
render.yaml             Render deployment blueprint
README.md               Quick-start documentation
```

## 6. Local development

### Prerequisites

- Python 3.12 or newer;
- Node.js 20 or newer;
- npm; and
- Git.

### Start the backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The backend health endpoint is
`http://localhost:8000/api/health`.

### Start the frontend

In a second terminal:

```powershell
cd frontend
npm install
$env:VITE_API_URL="http://localhost:8000"
npm run dev
```

Open the Vite URL shown in the terminal.

### Docker Compose

From the repository root:

```powershell
docker compose up
```

The compose setup exposes the backend on port `8000` and the frontend on
port `5173`.

## 7. Environment variables

### Frontend

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | Yes for deployment | Public URL of the FastAPI backend |

### Backend

| Variable | Required | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | Optional | Enables the Gemini REST integration |
| `GEMINI_MODEL` | Optional | Gemini model name; defaults to `gemini-2.5-flash` |
| `GMAIL_SMTP_USER` | Optional | Gmail account used for verification mail |
| `GMAIL_SMTP_APP_PASSWORD` | Optional | Gmail App Password, never a normal Gmail password |

Never commit these values or paste them into source control, issues, screenshots,
or chat.

## 8. API reference

All endpoints are under the `/api` prefix.

### Health

```text
GET /api/health
```

Returns service status, database status, and safe Boolean-style integration
indicators. It never returns a secret.

### Authentication

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/verification/request
POST /api/auth/verification/confirm
POST /api/auth/password-reset/request
POST /api/auth/password-reset/confirm
```

### Medicines

```text
GET    /api/healthpilot/medicines
PUT    /api/healthpilot/medicines/status
DELETE /api/healthpilot/medicines/status
```

### Reports and analysis

```text
GET  /api/healthpilot/reports
POST /api/healthpilot/reports
POST /api/healthpilot/reports/analyze
```

The report-analysis endpoint accepts JPG, PNG, or WebP images. A live OCR
provider is not connected in the current prototype.

### Family support

```text
GET  /api/healthpilot/family-members
POST /api/healthpilot/family-members
```

### Ask HealthPilot

```text
POST /api/healthpilot/chat
GET  /api/healthpilot/chat/history
```

Requests should include the `X-User-Identity` header when a user is logged in.
The response includes a `provider` field:

- `gemini` means the upstream Gemini request succeeded;
- `fallback` means the safe local answer was used.

Emergency phrases are answered locally before any external AI request.

## 9. Deployment

The current public prototype uses separate Vercel projects:

- Frontend: [healthpilot-orpin.vercel.app](https://healthpilot-orpin.vercel.app/)
- Backend: [healthpilot-lkzr.vercel.app](https://healthpilot-lkzr.vercel.app/)
- Backend health: [healthpilot-lkzr.vercel.app/api/health](https://healthpilot-lkzr.vercel.app/api/health)

### Vercel deployment checklist

1. Deploy `frontend` as a Vite project.
2. Set `VITE_API_URL` to the backend production URL.
3. Deploy `backend` as a Python project with root directory `backend`.
4. Add `GEMINI_API_KEY` as a **Secret** in **Production**.
5. Leave the Git branch field empty for Production variables.
6. Redeploy after changing environment variables.
7. Confirm `/api/health` returns HTTP 200.
8. Test a chat request and inspect the `provider` value.

The repository also contains a Render blueprint in
[`render.yaml`](../render.yaml) and an Azure Container Apps Dockerfile in
[`backend/Dockerfile`](../backend/Dockerfile).

## 10. Verification status

The latest verification completed:

- frontend Vite production build: passed;
- backend Python syntax compilation: passed;
- editor diagnostics for touched files: no errors;
- public frontend smoke test: passed;
- backend health endpoint: HTTP 200;
- database health: passed;
- chat endpoint identity-header fix: passed;
- emergency guidance path: implemented locally;
- Gmail SMTP: not configured;
- OCR provider: not connected;
- live Gemini key presence: configured;
- latest smoke chat provider: `fallback`, so live Gemini success still needs
  confirmation with a valid key/API configuration.

## 11. Security and medical-safety notes

- Passwords are stored as salted PBKDF2-SHA256 hashes.
- API secrets are read by the backend and are not sent to the browser.
- Emergency guidance does not depend on an external AI service.
- The app uses plain-language education rather than diagnosis or prescribing.
- Production use requires stronger authentication, authorization, audit logging,
  encrypted managed storage, secret rotation, rate limiting, and privacy
  controls appropriate for health data.
- Do not use sample data or the prototype database for real patient records.

## 12. Future roadmap

1. Connect a production OCR/document AI provider.
2. Add a managed database and schema migrations.
3. Replace the demo identity header with secure signed sessions.
4. Add FHIR resource mapping and ABDM/ABHA consent-aware integration.
5. Add real family notifications with explicit user consent.
6. Add automated tests for authentication, reports, medicine status, and chat.
7. Add observability, rate limits, data retention, and privacy controls.
8. Validate Gemini model/key configuration and add provider health telemetry.

# HealthPilot

HealthPilot is a mobile-first, single-page prototype for the Altrix Labs
Challenge 01 hackathon. It helps older patients and family caregivers
understand reports, organize medicines, and prepare for doctor visits.

## Run locally

```powershell
    cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal. The app is designed around a
maximum-width mobile view, but also adapts to larger screens.

## Fast deployment with Render

The repository includes `render.yaml` for a separate FastAPI web service and
Vite static site. To deploy quickly:

1. Push this project to a GitHub repository.
2. In Render, choose **New → Blueprint** and select the repository.
3. Apply the Blueprint from `render.yaml`.
4. If Render assigns a different backend URL, update `VITE_API_URL` on the
   `healthpilot-web` service and redeploy the static site.

The backend health check is available at `/api/health`. Do not commit
credentials, API keys, or private deployment keys to the repository.

The backend uses a local SQLite database at `backend/app/healthpilot.db`.
Start it with `uvicorn app.main:app --reload` from the `backend` folder.
Family members are saved there and remain available after refreshing the app.
Accounts are saved in the `users` table. Passwords use salted PBKDF2-SHA256
hashes and are never stored as plain text.
New accounts store full name, email, and required phone number, and must be
verified with a six-digit code before login. The login form supports email or
phone number, with phone number as the primary login field. The local
development flow shows the code in the app; email delivery should replace this
before production.
Forgot Password creates a six-digit code in the `password_resets` table. In
local development the code is returned by the API and shown in the reset flow;
an email or SMS provider must replace this behavior before production use.

## Prototype features

- Local email/username registration and login
- Home adherence ring and taken/missed medicine actions
- On-screen family alert when a missed-dose streak reaches its selected rule
- Medical-record report history with sample extraction and plain-language explanations
- Short, safety-focused AI chat with quick questions
- Browser speech recognition and speech synthesis when supported
- HbA1c trend, health timeline, and doctor-visit preparation
- Family supporter settings
- English, Telugu, and Hindi UI text with remembered language choice
- Light and dark themes with reduced-motion support

## Challenge brief alignment

| Brief requirement | Status in this prototype |
| --- | --- |
| Medical record intelligence and OCR | Text-based extraction and report analysis are implemented. The OCR stage is designed but is not connected to a live OCR provider in the demo. |
| Plain-language AI health summary | Implemented through the built-in explanation library, with English and Telugu summaries. |
| Unified health profile and timeline | Implemented through saved report history, health timeline views, and cross-record HbA1c trends. |
| Multi-language bonus | Telugu summaries and labels are implemented. Hindi is available in the interface; Tamil follows the same translation pattern and is a future extension. |
| ABDM / ABHA bonus | The report model is ready to map to FHIR-style records. A mock ABHA identifier and FHIR bundle export are planned for the next prototype increment. |
| Architecture diagram | The proposed upload → extraction/OCR → normalization → summary → timeline pipeline is documented below. |
| Demo | The working demo covers sample report analysis, report history, health summaries, timeline trends, medicine adherence, multilingual labels, and family support. |

### Proposed architecture pipeline

```text
Medical record upload
        ↓
Text extraction or OCR
        ↓
Structured observations, medicines, dates, and diagnoses
        ↓
FHIR-style health record / ABDM-ready profile
        ↓
Plain-language summary and abnormal-value explanation
        ↓
Unified health timeline, trends, and doctor-visit preparation
```

## Important limitations

This is a local prototype with sample patient data. It has no external
Google authentication,
OCR provider, FHIR/ABHA integration, outbound family messaging, or clinical
diagnosis. Uploaded image analysis currently returns a not-configured response;
the sample report remains available for the demo. Family alerts are displayed
on screen only. HealthPilot explains health information and does not replace a
doctor. Users should contact a doctor or pharmacist before changing a medicine
or dose, and call 108 or 112 for a possible emergency.

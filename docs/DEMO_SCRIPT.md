# HealthPilot 2–3 Minute Demo Script

## Before recording

- Open https://healthpilot-orpin.vercel.app/
- Use a clear browser window and close unrelated tabs.
- Use the **Continue as demo patient** button.
- Keep the backend health page available only if a judge asks for it:
  https://healthpilot-lkzr.vercel.app/api/health

## Script

### 0:00–0:15 — Introduction and login

**Action:** Open the public website and click **Continue as demo patient**.

**Say:**

> This is HealthPilot, an AI-powered personal health copilot designed to help
> individuals and family caregivers understand health information and follow
> their care plan. I will demonstrate the working prototype using the public
> demo patient account.

### 0:15–0:35 — Dashboard and medicine adherence

**Action:** Stay on the dashboard. Point to the adherence percentage, today's
medicine list, and family-support card. Click **Mark [medicine] taken** on one
medicine.

**Say:**

> The dashboard brings the user's health journey into one place. It shows
> today's medicines, scheduled times, adherence progress, the latest report,
> and family-support status. When a medicine is marked as taken, the adherence
> indicator updates immediately.

### 0:35–1:00 — Ask HealthPilot

**Action:** Click **Ask**. Click **What does my HbA1c mean?** or type:
`What does my HbA1c result mean?`

**Say:**

> The user can ask a health question in simple language. Here I am asking
> about HbA1c, a common blood-sugar measurement. HealthPilot explains that
> HbA1c reflects average blood sugar over roughly the previous two to three
> months and recommends discussing the personal target and follow-up with a
> doctor.

### 1:00–1:15 — Safety disclaimer

**Action:** Point to the safety note below the chat.

**Say:**

> This is health education, not a diagnosis or prescription. The assistant
> does not tell a user to change a medicine or dose. It directs users to a
> qualified clinician for personal decisions.

### 1:15–1:35 — Records and timeline

**Action:** Click **Records**. Show the sample report, extracted values, report
history, and timeline or HbA1c trend.

**Say:**

> Records turns separate health information into a readable timeline. The
> prototype organizes dates, observations, medicines, and abnormal-value
> explanations so that the user can prepare for a doctor visit and notice
> trends instead of viewing isolated numbers.

### 1:35–1:50 — Language support

**Action:** Use the language selector and choose Telugu or Hindi.

**Say:**

> Health information is easier to use when it is available in a familiar
> language. The interface supports English, Telugu, Hindi, and Tamil options,
> with translation coverage varying by screen and content.

### 1:50–2:10 — Emergency guidance

**Action:** Return to **Ask**, type:
`I have chest pain and trouble breathing`

**Say:**

> Emergency phrases are handled locally before any external AI request. The
> application immediately tells the user to call 108 or 112, or go to the
> nearest hospital. This safety path does not depend on an AI provider or
> network response.

### 2:10–2:40 — Architecture and roadmap

**Action:** Open the **Architecture** screen if available, or show the
architecture diagram from the project documentation.

**Say:**

> The architecture separates the React frontend, FastAPI backend, SQLite
> prototype storage, and optional Gemini integration. The intended production
> data pipeline is upload, OCR or text extraction, structured observations and
> medicines, plain-language explanation, and a unified health timeline.
>
> In this submission, the sample extraction and report experience are working.
> A production OCR provider is not connected yet, so I am not presenting
> sample extraction as live OCR. The data model is designed for future
> FHIR-style resources and ABDM or ABHA readiness, but live ABDM integration,
> consent workflows, and ABHA import are future roadmap items.

## Closing statement

> HealthPilot demonstrates a practical, safe starting point for a personal
> health copilot: it organizes care information, supports medicine adherence,
> explains health concepts clearly, includes family support, and protects
> users with explicit clinical and emergency safeguards. The next milestones
> are production OCR, validated AI-provider responses, managed health-data
> storage, and standards-based FHIR and ABDM integration.

## If a judge asks about Gemini

Use this accurate answer:

> Gemini integration is wired through the backend and the system has a
> safety-focused local fallback. The application reports whether the key is
> configured, and the chat response identifies the provider used. If the
> upstream provider is unavailable, HealthPilot intentionally returns a safe
> fallback rather than failing silently or inventing a result.

## If a judge asks about OCR

Use this accurate answer:

> The report upload and analysis boundary is implemented, and the prototype
> demonstrates structured report data. A live OCR provider for handwritten or
> image-based extraction is planned for the next increment; it is not claimed
> as complete in this version.

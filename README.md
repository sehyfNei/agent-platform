# EcoPrep AI - Economics Dashboard for Competitive Exams

A full-stack website (frontend + backend) for students preparing for competitive exams, focused on easy-to-understand and exam-oriented economics learning.

## What is now fully functional

- **Landing page** with USP, architecture context, and agent overview.
- **AI Assisted Understanding**:
  - Paste a **link** and backend fetches article text + summarizes via Groq.
  - Paste **text** directly and get summary via Groq.
  - Upload **PDF**, extract text in-browser (PDF.js), then summarize via backend/Groq.
- **Economics dashboard** with indicator table.
- **Econometrics dashboard** with model interpretation table.

## Tech Stack

- **Backend**: Node.js built-in `http` server (no npm dependencies required)
- **Frontend**: HTML/CSS/Vanilla JS multi-page app
- **AI provider (live)**: Groq chat completions API
- **Configured sources/targets**: RBI, WEF, govt reports, AngelOne, Yahoo, Zerodha, Railway/Hostinger

## Setup

```bash
# Required for live AI summaries
export GROQ_API_KEY="<your_groq_api_key>"

# Optional model override (default: qwen/qwen3-32b)
export GROQ_MODEL="llama-3.3-70b-versatile"

npm start
```

Then open: `http://localhost:3000`

## API Endpoints

- `GET /api/health`
- `GET /api/agents`
- `GET /api/dashboard/economics`
- `GET /api/dashboard/econometrics`
- `GET /api/config/stack`
- `POST /api/ai/summarize`
  - accepts one of:
    - `{ sourceLink }` (backend fetches article text)
    - `{ inputText }`
    - `{ extractedText }` (from PDF.js frontend extraction)

## Notes

- If `GROQ_API_KEY` is missing, API returns a deterministic fallback summary so the app remains usable.
- Very large/scanned image-only PDFs may not yield extractable text in browser.


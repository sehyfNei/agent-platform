# Agent Platform Replica (Yellow.ai-inspired)

This repository contains a lightweight front-end replica inspired by enterprise conversational AI platforms like Yellow.ai.

## What this prototype includes

- **Dashboard** with operational metrics and recent activity.
- **Agent Builder** with a node palette, editable flow canvas, and properties panel.
- **Knowledge Base** list management for FAQ/article-style content.
- **Channels** overview with connected/not-connected channel states.
- **Analytics** table for intent volume and resolution rates.
- **Deployment and simulation actions** with toast feedback.

## Run locally

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173` in your browser.

## Notes

- Internet access to Yellow.ai was blocked in this environment, so the replica is based on common conversational AI platform UX patterns.
- This is a front-end prototype intended as a foundation for a fuller product (auth, APIs, persistence, multi-tenant data model, NLU pipeline, etc.).

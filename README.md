# AI Agent Platform (Ready-to-Use Local Replica)

This project is a **usable local agent platform demo** inspired by Yellow.ai-style workflows.

Unlike a static mock, this version includes:

- a Python backend API,
- persistent local storage (`data/state.json`),
- interactive UI that reads/writes real state.

## Features

- **Overview**: KPI cards and intent containment bars.
- **Studio**: Create and edit journey steps.
- **Inbox**: Conversation queue + chatbot simulator.
- **Knowledge**: Add knowledge articles.
- **Channels**: Toggle channel connection states.
- **Analytics**: Intent volume/containment/escalation table.
- **Publish Agent**: records deployments with UTC timestamps.
- **Reset Data**: restore default demo data.

## Quick start

```bash
python3 server.py
```

Then open:

- App: `http://127.0.0.1:4173`
- Health: `http://127.0.0.1:4173/api/health`

## API endpoints

- `GET /api/state` — full current state
- `POST /api/flow` — add flow step (`{ label, message? }`)
- `PUT /api/flow/:id` — update step (`{ label, message }`)
- `POST /api/kb` — add knowledge article (`{ title }`)
- `POST /api/chat` — append chat and generate simple bot reply (`{ text }`)
- `PATCH /api/channels/:name` — toggle channel connectivity
- `POST /api/simulate` — increments conversations metric
- `POST /api/deploy` — records deployment entry
- `POST /api/reset` — reset state to defaults

## Data persistence

State is stored in:

- `data/state.json`

You can delete that file or call `POST /api/reset` to restore defaults.

## Notes

- This is designed for local product prototyping and internal demos.
- It can be extended with authentication, RBAC, and real LLM/NLU pipelines.

# AI Agent Platform Replica (Yellow.ai-style)

This repo now includes a richer front-end replica inspired by demos of enterprise platforms like Yellow.ai.

## Included modules

- **Overview**: KPI cards and intent automation bars.
- **Studio**: Node library, journey canvas, and editable step properties.
- **Inbox**: Live queue list plus conversation simulator.
- **Knowledge**: Add/list article sources.
- **Channels**: Omnichannel integration states.
- **Analytics**: Intent table with volume, containment, and escalation.

## Run

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`.

## Scope

- Front-end only (in-memory state, no backend persistence).
- Designed as a high-fidelity UX starting point for real APIs, auth, and orchestration services.

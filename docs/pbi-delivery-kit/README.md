# Power BI Delivery Kit

Reusable Cursor kit that runs a Power BI engagement from requirements through documentation as **one orchestrated tool**, with six specialists and durable per-project handoffs.

## What's included

| Piece | Path |
|-------|------|
| Orchestrator skill | `.cursor/skills/pbi-delivery/` |
| Stage agents 1–6 | `.cursor/agents/pbi-*.md` |
| Shared rules | `.cursor/rules/pbi-delivery-kit.mdc` |
| Project template | `projects/_template/` |

## Stages

1. Requirements & Proposal (`pbi-requirements`)
2. Architecture & Wireframes (`pbi-architecture`)
3. Data Feasibility (`pbi-data-feasibility`)
4. Build Guidance / PBIP edits (`pbi-build-guidance`)
5. QA / Validation (`pbi-qa`)
6. Documentation (`pbi-documentation`)

## How to use (non-technical — recommended)

Open **[Delivery Studio](../../studio/index.html)** — a live chat workspace (upload / talk / download):

1. Click **New project** to start a chat
2. Type notes and upload files in the chat
3. Click **Copy prompt for Cursor** and paste into Cursor Agent (live AI happens there)
4. Paste Cursor’s reply back into Studio to save & download
5. Say `lock` when happy, then continue stages

Details: [`studio/README.md`](../../studio/README.md)

## How to use (Cursor agents)

1. Open this repo in Cursor.
2. Start Agent chat.
3. Run `/pbi-delivery` or say: `Create project supplier-performance and start stage 1`.
4. Place report files under `projects/<name>/report/` (PBIP preferred).
5. After each stage, complete the **Your tasks** checklist and say `lock stage N` — or `jump to stage N` with handoff JSON.

## Power BI file editing (v1)

- **PBIP/TMDL** → Cursor can inspect and edit model text directly.
- **PBIX** → convert to PBIP in Desktop, or use schema paste / optional MCP.
- Details: `.cursor/skills/pbi-delivery/references/power-bi-file-modes.md`

## Multi-project

Each engagement gets `projects/<project-name>/` with its own `stage-status.json` and `handoffs/`.

## Jump to stage

Supported. Provide or paste required upstream JSON; the orchestrator will list any gaps before continuing.

# Project: {{PROJECT_NAME}}

Copy this `_template` folder to `projects/<project-name>/` and replace placeholders.

## Quick start

1. Set `project_name` and `current_stage` in `stage-status.json`.
2. Put your Power BI file under `report/`:
   - **Preferred:** Power BI Project (`.pbip` folder) — Cursor can edit TMDL / report JSON directly.
   - **Alternative:** `.pbix` — convert to PBIP in Desktop (`File → Save as → Power BI project`), or paste schema samples into `handoffs/schema-sample.md`.
3. Start a Cursor Agent chat and run `/pbi-delivery` (or say “run Power BI delivery for `<project-name>`”).
4. You may jump to any stage if you already have upstream handoff JSON.

## Folder layout

```text
projects/<project-name>/
  README.md                 # this file (project notes)
  stage-status.json         # locks, current stage, open questions
  handoffs/
    01-requirements.json
    02-architecture.json
    03-feasibility.json
    04-build-guide.json
    05-qa.json
    06-documentation.md
    schema-sample.md        # optional fallback if no PBIP/MCP
  report/                   # .pbip folder and/or .pbix
  inputs/                   # RSD, PRD, notes, screenshots (optional)
```

## Stage lock rules

- A stage is **open** until you explicitly lock it.
- Downstream stages should not treat upstream JSON as final until `locked: true` in `stage-status.json`.
- Live edits to an earlier stage: unlock that stage, apply the delta, re-lock, then re-check affected downstream stages.

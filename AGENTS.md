# AGENTS.md — Power BI Delivery Kit

This repository includes a reusable **Power BI Delivery Kit** for Cursor.

## Entry point

- Skill: `/pbi-delivery` (`.cursor/skills/pbi-delivery/`)
- Subagents: `.cursor/agents/pbi-*.md` (stages 1–6)
- Projects: `projects/<project-name>/` (copy from `projects/_template/`)

## Orchestration habit

1. Identify or create `projects/<project-name>/`.
2. Run stages with human locks, **or** jump to stage N when upstream handoffs exist.
3. Persist JSON/Markdown handoffs after every stabilization.
4. Always show **Your tasks (now)** so the human knows what to do next.
5. Prefer PBIP in `report/` for direct model edits; otherwise schema sample or MCP.

## Do not

- Invent KPI definitions or schema
- Binary-edit `.pbix`
- Approve production releases in QA
- Mix multiple client projects in one folder

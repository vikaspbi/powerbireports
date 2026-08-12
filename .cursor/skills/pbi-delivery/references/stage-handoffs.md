# Stage handoff contracts

All JSON handoffs live under `projects/<project-name>/handoffs/`.

## Stage 1 — requirements

See template `01-requirements.json`.  
`definition_status`: `Confirmed` | `Ambiguous` | `Missing`  
`proposal` may be `null` for ongoing reports.

## Stage 2 — architecture

`architecture_diagram.content` = Mermaid source string.  
`wireframe_spec[].zones[]` = zone / visual_type / metric / notes.

## Stage 3 — feasibility

`requirement_coverage[].status`: `Found` | `Missing` | `Ambiguous`  
Never add tables/columns not observed.

## Stage 4 — build guide

Maps 1:1 to developer checklist; `dax_measures[].requirement_id` required.  
`meta.applied_to_report` true only if PBIP/MCP edits were actually written.

## Stage 5 — QA

`status`: `Pass` | `Fail` | `Not Tested`  
`release_decision` remains `pending_human` until the user states go/no-go.

## Stage 6 — documentation

Markdown compiled from prior JSON only; flag gaps instead of filling them.

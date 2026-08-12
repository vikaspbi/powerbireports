# Power BI file modes (v1)

## Goal

Use **Cursor-only** edits when possible. Add MCP only when the user cannot provide an editable project folder.

## Mode: PBIP (preferred)

1. In Power BI Desktop: enable Power BI Project save if needed.  
2. `File → Save as → Power BI project files (*.pbip)`.  
3. Copy the `.pbip` folder into `projects/<name>/report/`.  
4. Agent 3 reads TMDL tables/columns; Agent 4 can edit measures/relationships in TMDL.  
5. User reopens/restarts Desktop to reload external TMDL changes.

## Mode: PBIX

- Do not binary-edit `.pbix` in Cursor.  
- Ask user to convert to PBIP into `report/`, **or**  
- Paste schema into `handoffs/schema-sample.md` for feasibility + manual build guide.

## Mode: schema_sample

- User pastes table/column lists (and optional samples).  
- Stage 3–4 produce coverage + guide only (no direct model file edits).

## Mode: MCP (optional)

Use when:

- user cannot export PBIP, and  
- a Power BI / Fabric MCP server is configured in Cursor.

Then Agent 3/4/5 may call MCP tools for inspect/apply/validate. Handoff JSON remains mandatory.

## Decision tree

```text
User has editable PBIP? → yes → pbip mode (Cursor direct)
        ↓ no
MCP available + user wants it? → yes → mcp mode
        ↓ no
User can paste schema? → yes → schema_sample
        ↓ no
Stop and list Your tasks to obtain one of the above
```

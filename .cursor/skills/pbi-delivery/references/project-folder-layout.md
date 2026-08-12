# Project folder layout

```text
projects/
  _template/                          # copy this for each engagement
  <project-name>/
    README.md
    stage-status.json
    inputs/                           # optional: RSD, PRD, notes
    handoffs/
      01-requirements.json
      02-architecture.json
      03-feasibility.json
      04-build-guide.json
      05-qa.json
      06-documentation.md
      schema-sample.md
    report/                           # .pbip and/or .pbix
```

## Creating a project

```bash
cp -R projects/_template projects/<project-name>
# then replace {{PROJECT_NAME}} in files under that folder
```

Or ask the orchestrator: “Create project `sales-analytics` and start stage 1.”

## stage-status.json

Source of truth for locks and current stage. Valid stage statuses:

- `not_started`
- `in_progress`
- `awaiting_user`
- `locked`
- `skipped_jump`
- `stale` (upstream changed; needs refresh)

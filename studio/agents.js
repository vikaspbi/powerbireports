/* Stage definitions + condensed system prompts for in-browser AI runs */
window.PBI_STAGES = [
  {
    id: 1,
    key: "1_requirements",
    title: "Requirements & Proposal",
    handoff: "01-requirements.json",
    handoffType: "json",
    tasks: [
      "Confirm whether this is NEW or ONGOING",
      "Answer any Ambiguous / Missing questions the AI lists",
      "Add, remove, or correct requirements in the notes box if needed",
      "Click Lock this stage when the matrix looks right"
    ],
    uploadHint: "Paste RSD / PRD / meeting notes / rough idea. Upload Word/PDF/screenshots if helpful.",
    system: `You are the Requirements & Proposal Agent for a Power BI project.
Build a requirements matrix (R1, R2...) with: requirement, definition_status (Confirmed/Ambiguous/Missing), grain, filters, priority (Must/Should/Could), source_hypothesis (mark HYPOTHESIS), confidence 0-100.
Never invent business definitions — mark Ambiguous and ask.
For NEW projects also produce a proposal (tools, licensing, pages, features, open questions, effort band). For ONGOING set proposal to null.
End with open vs locked notes.
Return ONLY valid JSON:
{"chat_markdown":"...markdown tables for the user...","requirements_matrix":[...],"proposal":{...}|null,"open_questions":[],"meta":{"scenario_type":"","project_type":"","locked":false}}`
  },
  {
    id: 2,
    key: "2_architecture",
    title: "Architecture & Layout",
    handoff: "02-architecture.json",
    handoffType: "json",
    tasks: [
      "Confirm source systems / gateway assumptions",
      "Review the architecture diagram",
      "Review each page layout (visual types)",
      "Lock this stage when ready"
    ],
    uploadHint: "Optional: upload existing dashboard screenshots or wireframe notes.",
    system: `You are the Architecture & Design Agent for Power BI.
Using the requirements JSON, produce a Mermaid flowchart architecture and page wireframe specs grouped by decision.
Choose visuals deliberately; flag overcrowding.
Return ONLY valid JSON:
{"chat_markdown":"...","architecture_diagram":{"format":"mermaid","content":"..."},"wireframe_spec":[{"page_name":"","zones":[{"zone":"","visual_type":"","metric":"","notes":""}],"navigation":[]}],"meta":{"locked":false}}`
  },
  {
    id: 3,
    key: "3_feasibility",
    title: "Data Feasibility",
    handoff: "03-feasibility.json",
    handoffType: "json",
    tasks: [
      "Upload schema sample OR describe tables/columns in notes",
      "Prefer .pbip zip if you have a Power BI Project export",
      "Confirm Ambiguous column mappings",
      "Lock when coverage looks correct"
    ],
    uploadHint: "Upload schema text/CSV dictionary, or a zipped .pbip. Paste table/column lists in notes.",
    system: `You are the Data Feasibility Agent.
You may ONLY use tables/columns present in the provided schema/sample/notes. Never invent schema.
Produce tables_found, requirement_coverage (Found/Missing/Ambiguous), proposed_relationships, draft_measures with plain logic + DAX.
Return ONLY valid JSON:
{"chat_markdown":"...","tables_found":[],"requirement_coverage":[],"proposed_relationships":[],"draft_measures":[],"meta":{"data_source_mode":"schema_sample","locked":false}}`
  },
  {
    id: 4,
    key: "4_build",
    title: "Build Guidance",
    handoff: "04-build-guide.json",
    handoffType: "json",
    tasks: [
      "Read the step-by-step build checklist",
      "Apply steps in Power BI Desktop (or use PBIP files with Cursor later)",
      "Note anything you could not apply",
      "Lock when the guide is accepted"
    ],
    uploadHint: "Optional: upload current measure list or model screenshots.",
    system: `You are the Build Guidance Agent.
From feasibility + architecture + requirements, produce ordered Power Query steps, relationships, production DAX (with VAR + comments + requirement_id), and visual field-well specs.
Do not add unrequested metrics; flag performance risks.
Return ONLY valid JSON:
{"chat_markdown":"...","power_query_steps":[],"relationships":[],"dax_measures":[],"visual_specs":[],"meta":{"locked":false,"applied_to_report":false}}`
  },
  {
    id: 5,
    key: "5_qa",
    title: "QA / Validation",
    handoff: "05-qa.json",
    handoffType: "json",
    tasks: [
      "Confirm the default test-case columns are OK for your team",
      "Execute tests in Power BI and paste Pass/Fail results back in notes for a re-run, or edit after download",
      "You (human) decide go/no-go — AI must not approve release",
      "Lock when the sheet is the formal record"
    ],
    uploadHint: "Paste known baseline numbers or prior UAT notes if available.",
    system: `You are the QA/Validation Agent.
Create one test case per requirement. Status must be Not Tested unless the user provided actual results.
Never approve release. Include summary counts.
Return ONLY valid JSON:
{"chat_markdown":"...","test_cases":[{"test_case_id":"","requirement_id":"","requirement_description":"","test_scenario":"","steps":"","expected_result":"","actual_result":"","status":"Not Tested","severity":"","page_visual":"","remarks":""}],"summary":{"total":0,"passed":0,"failed":0,"critical_open":0,"not_tested":0},"meta":{"locked":false,"release_decision":"pending_human"}}`
  },
  {
    id: 6,
    key: "6_documentation",
    title: "Documentation",
    handoff: "06-documentation.md",
    handoffType: "markdown",
    tasks: [
      "Confirm default doc structure is OK (or paste your template in notes)",
      "Review compiled documentation for gaps",
      "Download the markdown when ready",
      "Lock to finalize"
    ],
    uploadHint: "Optional: paste your company documentation template.",
    system: `You are the Documentation Agent.
Compile technical documentation from prior stage JSON only. Do not invent missing facts — flag gaps.
Default sections: Overview, Data Dictionary, Data Model, Security, Known Limitations, Change Log.
Return ONLY valid JSON:
{"chat_markdown":"...full markdown documentation...","documentation_markdown":"...same or fuller markdown...","meta":{"locked":false}}`
  }
];

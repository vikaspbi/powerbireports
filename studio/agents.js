/* Stage metadata only — AI runs in Cursor chat, not in this page */
window.PBI_STAGES = [
  {
    id: 1,
    key: "1_requirements",
    title: "Requirements & Proposal",
    handoff: "01-requirements.json",
    handoffType: "json",
    welcome: "Let's capture requirements. Paste your RSD, PRD, meeting notes, or rough idea — and upload any files.",
    tasks: [
      "Tell me if this is NEW or ONGOING (if not already set)",
      "Paste requirements / notes or upload documents",
      "Click Copy prompt for Cursor and paste it into a Cursor Agent chat",
      "Paste Cursor’s reply back here so we can save & download it",
      "Say lock when the matrix looks right"
    ]
  },
  {
    id: 2,
    key: "2_architecture",
    title: "Architecture & Layout",
    handoff: "02-architecture.json",
    handoffType: "json",
    welcome: "Stage 2 — architecture diagram and page layouts. Upload screenshots if you have them, then continue in Cursor.",
    tasks: [
      "Confirm systems / gateway assumptions in chat",
      "Copy prompt for Cursor (includes locked Stage 1 output)",
      "Paste Cursor architecture/wireframe reply back here",
      "Say lock when approved"
    ]
  },
  {
    id: 3,
    key: "3_feasibility",
    title: "Data Feasibility",
    handoff: "03-feasibility.json",
    handoffType: "json",
    welcome: "Stage 3 needs real schema. Upload a schema file, paste table/column lists, or attach a zipped .pbip.",
    tasks: [
      "Upload or paste schema / sample columns",
      "Copy prompt for Cursor",
      "Paste feasibility JSON/markdown back here",
      "Say lock when coverage is accepted"
    ]
  },
  {
    id: 4,
    key: "4_build",
    title: "Build Guidance",
    handoff: "04-build-guide.json",
    handoffType: "json",
    welcome: "Stage 4 turns approved specs into a build guide (and PBIP edits in Cursor when files are present).",
    tasks: [
      "Copy prompt for Cursor",
      "Paste the build guide back here",
      "Apply steps in Power BI Desktop as needed",
      "Say lock when the guide is accepted"
    ]
  },
  {
    id: 5,
    key: "5_qa",
    title: "QA / Validation",
    handoff: "05-qa.json",
    handoffType: "json",
    welcome: "Stage 5 — test cases for every requirement. You decide go/no-go; Cursor only prepares the sheet.",
    tasks: [
      "Copy prompt for Cursor to generate the test sheet",
      "Paste results / update Pass-Fail in chat",
      "You make the release decision",
      "Say lock when the sheet is the formal record"
    ]
  },
  {
    id: 6,
    key: "6_documentation",
    title: "Documentation",
    handoff: "06-documentation.md",
    handoffType: "markdown",
    welcome: "Stage 6 — compile documentation from earlier outputs. Paste your company template if you have one.",
    tasks: [
      "Copy prompt for Cursor",
      "Paste final markdown back here",
      "Download the documentation",
      "Say lock to finalize"
    ]
  }
];

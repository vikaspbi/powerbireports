(() => {
  const DB_NAME = "pbi-delivery-studio";
  const DB_VERSION = 1;
  const LS_PROJECTS = "pbiStudio.projects.v2";

  const $ = (id) => document.getElementById(id);

  const state = {
    projects: loadProjects(),
    currentId: null,
    currentStage: 1,
    pendingFiles: [],
    db: null
  };

  function loadProjects() {
    try {
      const v2 = localStorage.getItem(LS_PROJECTS);
      if (v2) return JSON.parse(v2);
      // migrate v1 if present
      const v1 = JSON.parse(localStorage.getItem("pbiStudio.projects.v1") || "[]");
      return Array.isArray(v1) ? v1.map(migrateProject) : [];
    } catch {
      return [];
    }
  }

  function migrateProject(p) {
    return Object.assign(
      {
        messages: [],
        handoffs: emptyHandoffs(),
        files: [],
        stages: emptyStagesStatus(),
        changelog: []
      },
      p,
      { messages: p.messages || [] }
    );
  }

  function saveProjects() {
    localStorage.setItem(LS_PROJECTS, JSON.stringify(state.projects));
  }

  function toast(msg) {
    const el = $("toast");
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.add("hidden"), 3200);
  }

  function slugify(name) {
    return (
      String(name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 60) || "project"
    );
  }

  function emptyHandoffs() {
    return {
      "01-requirements.json": null,
      "02-architecture.json": null,
      "03-feasibility.json": null,
      "04-build-guide.json": null,
      "05-qa.json": null,
      "06-documentation.md": null
    };
  }

  function emptyStagesStatus() {
    const o = {};
    window.PBI_STAGES.forEach((s) => {
      o[s.key] = { status: "not_started", locked: false, updated_at: null };
    });
    return o;
  }

  function currentProject() {
    return state.projects.find((p) => p.id === state.currentId) || null;
  }

  function stageMeta(id) {
    return window.PBI_STAGES.find((s) => s.id === id);
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatBytes(n) {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("files")) {
          db.createObjectStore("files", { keyPath: "id" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function putFile(record) {
    return new Promise((resolve, reject) => {
      const tx = state.db.transaction("files", "readwrite");
      tx.objectStore("files").put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  function getFile(id) {
    return new Promise((resolve, reject) => {
      const tx = state.db.transaction("files", "readonly");
      const req = tx.objectStore("files").get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  function deleteFilesForProject(projectId) {
    return new Promise((resolve, reject) => {
      const tx = state.db.transaction("files", "readwrite");
      const store = tx.objectStore("files");
      const req = store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) return;
        if (String(cursor.key).startsWith(projectId + "::")) cursor.delete();
        cursor.continue();
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  function addMessage(role, text, extra = {}) {
    const p = currentProject();
    if (!p) return;
    const msg = {
      id: crypto.randomUUID(),
      role,
      text,
      stage: state.currentStage,
      at: new Date().toISOString(),
      fileNames: extra.fileNames || [],
      artifact: extra.artifact || null
    };
    p.messages = p.messages || [];
    p.messages.push(msg);
    p.updated_at = msg.at;
    saveProjects();
    return msg;
  }

  function guideForStage(s, p) {
    const tasks = s.tasks.map((t) => `- ${t}`).join("\n");
    return `${s.welcome}

**Your tasks (now)**
${tasks}

Chat here like normal. When you're ready for the AI work, click **Copy prompt for Cursor**, paste it into Cursor Agent, then paste the reply back into this chat.`;
  }

  function renderHome() {
    $("viewHome").classList.remove("hidden");
    $("viewWorkspace").classList.add("hidden");
    $("btnExportZip").disabled = true;
    const list = $("projectList");
    if (!state.projects.length) {
      list.innerHTML = `<p class="muted">No projects yet. Click <strong>New project</strong> to open a chat.</p>`;
      return;
    }
    list.innerHTML = state.projects
      .slice()
      .sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""))
      .map((p) => {
        const locked = Object.values(p.stages || {}).filter((s) => s.locked).length;
        return `<button type="button" class="project-card" data-id="${p.id}">
          <h4>${escapeHtml(p.name)}</h4>
          <p class="muted">${escapeHtml(p.project_type)} · ${escapeHtml(p.scenario_type)}</p>
          <p>Stage ${p.current_stage}/6 · ${locked} locked · ${(p.messages || []).length} messages</p>
        </button>`;
      })
      .join("");
    list.querySelectorAll(".project-card").forEach((btn) => {
      btn.addEventListener("click", () => openProject(btn.dataset.id));
    });
  }

  function openProject(id, stage) {
    state.currentId = id;
    const p = currentProject();
    if (!p) return renderHome();
    state.currentStage = stage || p.current_stage || 1;
    $("viewHome").classList.add("hidden");
    $("viewWorkspace").classList.remove("hidden");
    $("btnExportZip").disabled = false;
    $("wsProjectName").textContent = p.name;
    $("wsProjectMeta").textContent = `${p.slug} · ${p.project_type}`;
    if (!p.messages || !p.messages.length) {
      const s = stageMeta(state.currentStage);
      addMessage("guide", guideForStage(s, p));
    }
    renderRail();
    renderChat();
    renderDownloads();
  }

  function renderRail() {
    const p = currentProject();
    $("stageRail").innerHTML = window.PBI_STAGES.map((s) => {
      const st = p.stages[s.key] || {};
      const active = s.id === state.currentStage ? "active" : "";
      const locked = st.locked ? "locked" : "";
      const label = st.locked ? "Locked" : p.handoffs?.[s.handoff] ? "Output saved" : "Open";
      return `<button type="button" class="stage-btn ${active} ${locked}" data-stage="${s.id}">
        <strong>${s.id}. ${escapeHtml(s.title)}</strong>
        <span class="s-status">${label}</span>
      </button>`;
    }).join("");
    $("stageRail").querySelectorAll(".stage-btn").forEach((btn) => {
      btn.addEventListener("click", () => switchStage(Number(btn.dataset.stage)));
    });
  }

  function switchStage(id, announce = true) {
    const p = currentProject();
    state.currentStage = id;
    p.current_stage = id;
    p.updated_at = new Date().toISOString();
    saveProjects();
    const s = stageMeta(id);
    $("stageEyebrow").textContent = `Stage ${s.id} of 6`;
    $("stageTitle").textContent = s.title;
    if (announce) addMessage("guide", guideForStage(s, p));
    renderRail();
    renderChat();
    renderDownloads();
  }

  function renderChat() {
    const p = currentProject();
    const s = stageMeta(state.currentStage);
    $("stageEyebrow").textContent = `Stage ${s.id} of 6`;
    $("stageTitle").textContent = s.title;
    const log = $("chatLog");
    log.innerHTML = (p.messages || [])
      .map((m) => {
        const files = (m.fileNames || [])
          .map((n) => `<span class="file-chip">${escapeHtml(n)}</span>`)
          .join("");
        let body;
        if (m.role === "guide" && window.marked) body = window.marked.parse(m.text);
        else if (m.artifact) body = `<p>${escapeHtml(m.text)}</p><pre>${escapeHtml(
          typeof m.artifact === "string" ? m.artifact.slice(0, 4000) : JSON.stringify(m.artifact, null, 2).slice(0, 4000)
        )}</pre>`;
        else body = `<p>${escapeHtml(m.text).replace(/\n/g, "<br>")}</p>`;
        return `<div class="msg ${m.role}">
          <p class="who">${m.role === "user" ? "You" : "Studio guide"} · stage ${m.stage}</p>
          <div>${body}</div>
          ${files ? `<div class="files">${files}</div>` : ""}
        </div>`;
      })
      .join("");
    log.scrollTop = log.scrollHeight;
  }

  function renderDownloads() {
    const p = currentProject();
    const s = stageMeta(state.currentStage);
    const items = [];
    if (p.handoffs?.[s.handoff]) {
      items.push(`<button type="button" data-dl="handoff">Download ${escapeHtml(s.handoff)}</button>`);
    }
    items.push(`<button type="button" data-dl="chat">Download chat transcript</button>`);
    items.push(`<button type="button" data-dl="status">Download stage-status.json</button>`);
    if (p.handoffs?.["06-documentation.md"]) {
      items.push(`<button type="button" data-dl="docs">Download documentation</button>`);
    }
    $("downloadList").innerHTML = items.join("");
    $("downloadList").querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => downloadThing(btn.dataset.dl));
    });
  }

  function downloadText(filename, text, mime) {
    const blob = new Blob([text], { type: mime || "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function buildStatus(p) {
    return {
      project_name: p.slug,
      scenario_type: p.scenario_type,
      project_type: p.project_type,
      current_stage: p.current_stage,
      stages: p.stages,
      changelog: p.changelog || []
    };
  }

  function downloadThing(kind) {
    const p = currentProject();
    const s = stageMeta(state.currentStage);
    if (kind === "handoff") {
      const data = p.handoffs[s.handoff];
      const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
      downloadText(s.handoff, text, s.handoffType === "markdown" ? "text/markdown" : "application/json");
    } else if (kind === "status") {
      downloadText("stage-status.json", JSON.stringify(buildStatus(p), null, 2), "application/json");
    } else if (kind === "docs") {
      downloadText("06-documentation.md", p.handoffs["06-documentation.md"] || "", "text/markdown");
    } else if (kind === "chat") {
      const text = (p.messages || [])
        .map((m) => `[${m.at}] ${m.role.toUpperCase()} (stage ${m.stage})\n${m.text}\n`)
        .join("\n---\n\n");
      downloadText(`${p.slug}-chat.txt`, text);
    }
  }

  function renderPending() {
    $("pendingFiles").innerHTML = state.pendingFiles
      .map((f) => `<span>${escapeHtml(f.name)}</span>`)
      .join("");
  }

  async function queueFiles(fileList) {
    for (const file of Array.from(fileList)) {
      if (file.size > 80 * 1024 * 1024) {
        toast(`${file.name} is over 80MB — try a smaller export or zip`);
        continue;
      }
      state.pendingFiles.push(file);
    }
    renderPending();
  }

  async function persistPendingFiles(p) {
    const names = [];
    for (const file of state.pendingFiles) {
      const id = `${p.id}::${Date.now()}-${file.name}`;
      const buffer = await file.arrayBuffer();
      await putFile({
        id,
        projectId: p.id,
        name: file.name,
        type: file.type,
        size: file.size,
        stage: state.currentStage,
        blob: buffer
      });
      p.files = p.files || [];
      p.files.push({
        id,
        name: file.name,
        type: file.type,
        size: file.size,
        stage: state.currentStage
      });
      names.push(file.name);
    }
    state.pendingFiles = [];
    renderPending();
    return names;
  }

  function extractJson(text) {
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    try {
      return JSON.parse(cleaned);
    } catch (_) {}
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("not json");
  }

  function looksLikeHandoff(text) {
    const t = text.trim();
    if (t.length < 40) return false;
    if (t.startsWith("{") || t.startsWith("```")) return true;
    if (/requirements_matrix|wireframe_spec|tables_found|dax_measures|test_cases|documentation_markdown/.test(t))
      return true;
    if (t.startsWith("#") && t.length > 200) return true;
    return false;
  }

  function saveHandoffFromText(text) {
    const p = currentProject();
    const s = stageMeta(state.currentStage);
    p.handoffs = p.handoffs || emptyHandoffs();
    if (s.handoffType === "markdown") {
      try {
        const parsed = extractJson(text);
        p.handoffs[s.handoff] =
          parsed.documentation_markdown || parsed.chat_markdown || text;
      } catch {
        p.handoffs[s.handoff] = text;
      }
    } else {
      try {
        const parsed = extractJson(text);
        const { chat_markdown, ...rest } = parsed;
        p.handoffs[s.handoff] = Object.keys(rest).length ? rest : parsed;
      } catch {
        // store raw wrapper so user can still download
        p.handoffs[s.handoff] = { raw_text: text, note: "Saved as raw text — not valid JSON" };
      }
    }
    p.stages[s.key].status = "awaiting_user";
    p.stages[s.key].updated_at = new Date().toISOString();
    saveProjects();
  }

  function buildCursorPrompt() {
    const p = currentProject();
    const s = stageMeta(state.currentStage);
    const recent = (p.messages || [])
      .filter((m) => m.role === "user")
      .slice(-12)
      .map((m) => m.text)
      .join("\n\n");
    const files = (p.files || []).map((f) => `- ${f.name} (${formatBytes(f.size)}, stage ${f.stage})`).join("\n");
    const prior = {};
    Object.entries(p.handoffs || {}).forEach(([k, v]) => {
      if (v != null) prior[k] = v;
    });

    return `/pbi-delivery

Project: ${p.name} (${p.slug})
Project type: ${p.project_type}
Scenario: ${p.scenario_type}
Please work on STAGE ${s.id} — ${s.title}.
Use projects/${p.slug}/ if present, or treat this chat package as the source of truth.

Uploaded files in Delivery Studio:
${files || "(none listed)"}

Recent user messages from Studio chat:
${recent || "(none)"}

Known handoffs JSON so far:
${JSON.stringify(prior, null, 2)}

Follow the Power BI Delivery Kit agent for this stage.
After you finish, reply with the stage handoff JSON (and chat-readable markdown).
I will paste your reply back into Delivery Studio to save/download.`;
  }

  async function copyCursorPrompt() {
    const text = buildCursorPrompt();
    try {
      await navigator.clipboard.writeText(text);
      addMessage(
        "guide",
        "Copied a Cursor prompt to your clipboard.\n\n1. Open Cursor Agent chat on this repo\n2. Paste and send\n3. Copy Cursor’s reply\n4. Paste it back into this Studio chat and press Send"
      );
      renderChat();
      toast("Prompt copied — paste into Cursor");
    } catch {
      addMessage("guide", "Could not auto-copy. Here is the prompt:\n\n```\n" + text + "\n```");
      renderChat();
    }
  }

  function lockStage(fromChat = false) {
    const p = currentProject();
    const s = stageMeta(state.currentStage);
    if (!p.handoffs?.[s.handoff]) {
      toast("Save a Cursor output in chat first, then lock");
      addMessage(
        "guide",
        "Nothing to lock yet. Paste the Cursor stage output into chat (JSON/markdown), send it, then say **lock**."
      );
      renderChat();
      return;
    }
    p.stages[s.key].locked = true;
    p.stages[s.key].status = "locked";
    p.stages[s.key].updated_at = new Date().toISOString();
    p.changelog = p.changelog || [];
    p.changelog.push({ at: p.stages[s.key].updated_at, change: `Locked stage ${s.id}` });
    saveProjects();
    addMessage("guide", `Stage ${s.id} is locked.`);
    if (s.id < 6) {
      state.currentStage = s.id + 1;
      p.current_stage = s.id + 1;
      saveProjects();
      const next = stageMeta(state.currentStage);
      addMessage("guide", guideForStage(next, p));
    } else {
      addMessage("guide", "All stages complete. Use **Download project ZIP** to export everything.");
    }
    renderRail();
    renderChat();
    renderDownloads();
    toast(`Stage ${s.id} locked`);
  }

  async function handleSend() {
    const p = currentProject();
    if (!p) return;
    const text = $("composerInput").value.trim();
    const hasFiles = state.pendingFiles.length > 0;
    if (!text && !hasFiles) return;

    const fileNames = await persistPendingFiles(p);
    $("composerInput").value = "";

    const lower = text.toLowerCase().trim();

    // commands
    if (/^lock\b/.test(lower)) {
      if (text || fileNames.length) addMessage("user", text || "(attachments)", { fileNames });
      lockStage(true);
      return;
    }
    if (/^next\b/.test(lower)) {
      addMessage("user", text, { fileNames });
      if (state.currentStage < 6) switchStage(state.currentStage + 1);
      else addMessage("guide", "You are already on the last stage.");
      renderChat();
      return;
    }
    const stageMatch = lower.match(/^stage\s*([1-6])\b/);
    if (stageMatch) {
      addMessage("user", text, { fileNames });
      switchStage(Number(stageMatch[1]));
      return;
    }

    addMessage("user", text || "(uploaded files)", { fileNames });

    if (text && looksLikeHandoff(text)) {
      saveHandoffFromText(text);
      addMessage(
        "guide",
        `Saved this as **${stageMeta(state.currentStage).handoff}**. You can download it from the left panel, or say **lock** to freeze this stage and move on.`,
        { artifact: text.slice(0, 1500) }
      );
      renderRail();
      renderDownloads();
    } else if (fileNames.length && !text) {
      addMessage(
        "guide",
        `Got file(s): ${fileNames.join(", ")}. Click **Copy prompt for Cursor** when you want the AI to use them (attach the same files in Cursor if needed), then paste the reply here.`
      );
    } else {
      addMessage(
        "guide",
        "Noted. Keep chatting, upload more, or click **Copy prompt for Cursor** to make the live AI work happen in Cursor — then paste the result back here to download."
      );
    }
    renderChat();
    saveProjects();
  }

  async function exportZip() {
    const p = currentProject();
    if (!p || !window.JSZip) return;
    const zip = new JSZip();
    const root = `projects/${p.slug}`;
    zip.file(`${root}/stage-status.json`, JSON.stringify(buildStatus(p), null, 2));
    zip.file(`${root}/README.md`, `# ${p.name}\n\nExported from Power BI Delivery Studio chat.\n`);
    const handoffs = zip.folder(`${root}/handoffs`);
    Object.entries(p.handoffs || {}).forEach(([name, value]) => {
      if (value == null) return;
      handoffs.file(name, typeof value === "string" ? value : JSON.stringify(value, null, 2));
    });
    const chatText = (p.messages || [])
      .map((m) => `[${m.at}] ${m.role} (stage ${m.stage})\n${m.text}\n`)
      .join("\n---\n\n");
    handoffs.file("chat-transcript.txt", chatText);
    const inputs = zip.folder(`${root}/inputs`);
    for (const f of p.files || []) {
      const rec = await getFile(f.id);
      if (rec?.blob) inputs.file(f.name, rec.blob);
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${p.slug}-delivery-studio.zip`;
    a.click();
    URL.revokeObjectURL(url);
    toast("ZIP downloaded");
  }

  function createProject(ev) {
    ev.preventDefault();
    const name = $("newName").value.trim();
    if (!name) return;
    const jump = Number($("newJump").value);
    const project = {
      id: crypto.randomUUID(),
      name,
      slug: slugify(name),
      project_type: $("newType").value,
      scenario_type: $("newScenario").value,
      current_stage: jump,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      stages: emptyStagesStatus(),
      handoffs: emptyHandoffs(),
      files: [],
      messages: [],
      changelog: [{ at: new Date().toISOString(), change: "Project chat created" }]
    };
    if (jump > 1) {
      for (let i = 1; i < jump; i++) {
        project.stages[window.PBI_STAGES[i - 1].key].status = "skipped_jump";
      }
    }
    state.projects.push(project);
    saveProjects();
    $("modalNew").close();
    $("formNewProject").reset();
    openProject(project.id, jump);
    toast("Chat started");
  }

  async function deleteProject() {
    const p = currentProject();
    if (!p) return;
    if (!confirm(`Delete project "${p.name}"?`)) return;
    await deleteFilesForProject(p.id);
    state.projects = state.projects.filter((x) => x.id !== p.id);
    saveProjects();
    state.currentId = null;
    renderHome();
    toast("Project deleted");
  }

  function wireEvents() {
    $("btnNewProject").addEventListener("click", () => $("modalNew").showModal());
    $("btnCancelNew").addEventListener("click", () => $("modalNew").close());
    $("formNewProject").addEventListener("submit", createProject);
    $("btnBackHome").addEventListener("click", renderHome);
    $("btnDeleteProject").addEventListener("click", deleteProject);
    $("btnExportZip").addEventListener("click", exportZip);
    $("btnCopyCursor").addEventListener("click", copyCursorPrompt);
    $("btnLockStage").addEventListener("click", () => lockStage(false));
    $("btnSend").addEventListener("click", handleSend);
    $("composerInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });
    $("fileInput").addEventListener("change", (e) => {
      queueFiles(e.target.files);
      e.target.value = "";
    });
  }

  async function init() {
    state.db = await openDb();
    wireEvents();
    renderHome();
  }

  init().catch((err) => {
    console.error(err);
    toast("Studio failed to start — try Chrome or Edge");
  });
})();

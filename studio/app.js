(() => {
  const DB_NAME = "pbi-delivery-studio";
  const DB_VERSION = 1;
  const LS_PROJECTS = "pbiStudio.projects.v1";
  const LS_SETTINGS = "pbiStudio.settings.v1";

  const $ = (id) => document.getElementById(id);

  const state = {
    projects: loadProjects(),
    settings: loadSettings(),
    currentId: null,
    currentStage: 1,
    db: null
  };

  function loadProjects() {
    try { return JSON.parse(localStorage.getItem(LS_PROJECTS) || "[]"); }
    catch { return []; }
  }
  function saveProjects() {
    localStorage.setItem(LS_PROJECTS, JSON.stringify(state.projects));
  }
  function loadSettings() {
    try {
      return Object.assign(
        { apiKey: "", model: "gemini-2.0-flash" },
        JSON.parse(localStorage.getItem(LS_SETTINGS) || "{}")
      );
    } catch {
      return { apiKey: "", model: "gemini-2.0-flash" };
    }
  }
  function saveSettings() {
    localStorage.setItem(LS_SETTINGS, JSON.stringify(state.settings));
  }

  function toast(msg) {
    const el = $("toast");
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.add("hidden"), 3500);
  }

  function slugify(name) {
    return String(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60) || "project";
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

  function fileKey(projectId, name) {
    return `${projectId}::${name}`;
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

  function formatBytes(n) {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  }

  function renderHome() {
    $("viewHome").classList.remove("hidden");
    $("viewWorkspace").classList.add("hidden");
    $("btnExportZip").disabled = true;
    const list = $("projectList");
    if (!state.projects.length) {
      list.innerHTML = `<p class="muted">No projects yet. Click <strong>New project</strong> to start.</p>`;
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
          <p>Stage ${p.current_stage}/6 · ${locked} locked</p>
          <p class="muted small">Updated ${escapeHtml(p.updated_at || "—")}</p>
        </button>`;
      })
      .join("");
    list.querySelectorAll(".project-card").forEach((btn) => {
      btn.addEventListener("click", () => openProject(btn.dataset.id));
    });
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
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
    $("wsProjectMeta").textContent = `${p.slug} · ${p.project_type} · start: ${p.scenario_type}`;
    renderRail();
    renderStage();
  }

  function renderRail() {
    const p = currentProject();
    const rail = $("stageRail");
    rail.innerHTML = window.PBI_STAGES.map((s) => {
      const st = p.stages[s.key] || {};
      const active = s.id === state.currentStage ? "active" : "";
      const locked = st.locked ? "locked" : "";
      const label = st.locked ? "Locked" : st.status === "in_progress" ? "In progress" : "Not started";
      return `<button type="button" class="stage-btn ${active} ${locked}" data-stage="${s.id}">
        <strong>${s.id}. ${escapeHtml(s.title)}</strong>
        <span class="s-status">${label}</span>
      </button>`;
    }).join("");
    rail.querySelectorAll(".stage-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.currentStage = Number(btn.dataset.stage);
        const proj = currentProject();
        proj.current_stage = state.currentStage;
        proj.updated_at = new Date().toISOString();
        saveProjects();
        renderRail();
        renderStage();
      });
    });
  }

  async function renderStage() {
    const p = currentProject();
    const s = window.PBI_STAGES.find((x) => x.id === state.currentStage);
    $("stageEyebrow").textContent = `Stage ${s.id} of 6`;
    $("stageTitle").textContent = s.title;
    $("yourTasks").innerHTML = `<h4>Your tasks (now)</h4><ul>${s.tasks
      .map((t) => `<li>${escapeHtml(t)}</li>`)
      .join("")}</ul><p class="muted small" style="margin:0.6rem 0 0">${escapeHtml(s.uploadHint)}</p>`;

    const noteKey = `notes_stage_${s.id}`;
    $("stageNotes").value = p[noteKey] || "";

    const files = (p.files || []).filter((f) => f.stage === s.id || f.stage === 0);
    $("fileList").innerHTML = files.length
      ? files
          .map(
            (f) => `<li class="file-row" data-fid="${escapeHtml(f.id)}">
            <div><div>${escapeHtml(f.name)}</div><div class="meta">${formatBytes(f.size)} · ${escapeHtml(f.type || "file")}</div></div>
            <button type="button" class="btn ghost" data-del="${escapeHtml(f.id)}">Remove</button>
          </li>`
          )
          .join("")
      : `<li class="muted small">No files uploaded for this stage yet.</li>`;

    $("fileList").querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-del");
        p.files = (p.files || []).filter((f) => f.id !== id);
        await deleteOneFile(id);
        saveProjects();
        renderStage();
        toast("File removed");
      });
    });

    renderDownloads(p, s);
    renderOutput(p, s);
  }

  function renderDownloads(p, s) {
    const items = [];
    const handoff = p.handoffs?.[s.handoff];
    if (handoff) {
      items.push(`<button type="button" data-dl="handoff">${escapeHtml(s.handoff)}</button>`);
    }
    items.push(`<button type="button" data-dl="notes">Stage ${s.id} notes (.txt)</button>`);
    items.push(`<button type="button" data-dl="status">stage-status.json</button>`);
    if (p.handoffs?.["06-documentation.md"]) {
      items.push(`<button type="button" data-dl="docs">Full documentation (.md)</button>`);
    }
    $("downloadList").innerHTML = items.join("") || `<p class="muted small">No outputs yet.</p>`;

    $("downloadList").querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => downloadThing(btn.dataset.dl, s));
    });
  }

  function renderOutput(p, s) {
    const raw = p.handoffs?.[s.handoff];
    const md = p.last_markdown?.[s.id];
    const box = $("stageOutput");
    if (!raw && !md) {
      box.classList.add("muted");
      box.textContent = "Run a stage or paste an output to see it here.";
      return;
    }
    box.classList.remove("muted");
    if (md && window.marked) {
      box.innerHTML = window.marked.parse(md);
    } else if (typeof raw === "string") {
      box.innerHTML = window.marked ? window.marked.parse(raw) : `<pre>${escapeHtml(raw)}</pre>`;
    } else {
      box.innerHTML = `<pre>${escapeHtml(JSON.stringify(raw, null, 2))}</pre>`;
    }
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

  function downloadThing(kind, s) {
    const p = currentProject();
    if (kind === "handoff") {
      const data = p.handoffs[s.handoff];
      const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
      downloadText(s.handoff, text, s.handoffType === "markdown" ? "text/markdown" : "application/json");
    } else if (kind === "notes") {
      downloadText(`stage-${s.id}-notes.txt`, p[`notes_stage_${s.id}`] || "");
    } else if (kind === "status") {
      downloadText("stage-status.json", JSON.stringify(buildStatus(p), null, 2), "application/json");
    } else if (kind === "docs") {
      downloadText("06-documentation.md", p.handoffs["06-documentation.md"] || "", "text/markdown");
    }
  }

  function buildStatus(p) {
    return {
      project_name: p.slug,
      scenario_type: p.scenario_type,
      project_type: p.project_type,
      current_stage: p.current_stage,
      stages: p.stages,
      open_questions: p.open_questions || [],
      changelog: p.changelog || []
    };
  }

  async function deleteOneFile(id) {
    return new Promise((resolve, reject) => {
      const tx = state.db.transaction("files", "readwrite");
      tx.objectStore("files").delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function handleFiles(fileList) {
    const p = currentProject();
    if (!p) return;
    for (const file of Array.from(fileList)) {
      if (file.size > 80 * 1024 * 1024) {
        toast(`${file.name} is over 80MB — skip or zip a smaller export.`);
        continue;
      }
      const id = fileKey(p.id, `${Date.now()}-${file.name}`);
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
    }
    p.updated_at = new Date().toISOString();
    saveProjects();
    renderStage();
    toast("Upload saved in this browser");
  }

  function extractJson(text) {
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    try { return JSON.parse(cleaned); } catch (_) {}
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error("AI response was not valid JSON");
  }

  async function readTextUploads(p, stageId) {
    const parts = [];
    for (const f of p.files || []) {
      if (f.stage !== stageId && f.stage !== 0) continue;
      const lower = f.name.toLowerCase();
      const isText =
        /json|txt|md|csv|tsv|xml|tmdl/.test(lower) ||
        (f.type || "").startsWith("text/") ||
        f.type === "application/json";
      if (!isText) {
        parts.push(`[Binary file uploaded: ${f.name} (${formatBytes(f.size)}) — not inlined]`);
        continue;
      }
      if (f.size > 1.5 * 1024 * 1024) {
        parts.push(`[Text file too large to inline: ${f.name}]`);
        continue;
      }
      const rec = await getFile(f.id);
      if (!rec?.blob) continue;
      const text = new TextDecoder().decode(rec.blob);
      parts.push(`--- FILE: ${f.name} ---\n${text}`);
    }
    return parts.join("\n\n");
  }

  async function runStageAi() {
    const p = currentProject();
    const s = window.PBI_STAGES.find((x) => x.id === state.currentStage);
    if (!state.settings.apiKey) {
      $("modalSettings").showModal();
      toast("Add a Gemini API key to run AI in the Studio (or paste Cursor output instead).");
      return;
    }

    // Persist notes first
    p[`notes_stage_${s.id}`] = $("stageNotes").value;
    saveProjects();

    const prior = {};
    Object.entries(p.handoffs || {}).forEach(([k, v]) => {
      if (v != null) prior[k] = v;
    });

    const uploads = await readTextUploads(p, s.id);
    const userPrompt = [
      `Project name: ${p.name}`,
      `Project type: ${p.project_type}`,
      `Scenario: ${p.scenario_type}`,
      `Current stage: ${s.id} ${s.title}`,
      "",
      "User notes:",
      $("stageNotes").value || "(none)",
      "",
      "Uploaded text files:",
      uploads || "(none)",
      "",
      "Prior handoffs JSON:",
      JSON.stringify(prior, null, 2)
    ].join("\n");

    $("btnRunStage").disabled = true;
    $("btnRunStage").textContent = "Running…";
    toast("Running stage with Gemini…");

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        state.settings.model
      )}:generateContent?key=${encodeURIComponent(state.settings.apiKey)}`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: s.system }] },
          generationConfig: { temperature: 0.2, responseMimeType: "application/json" }
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || `API error ${res.status}`);
      }
      const text = data?.candidates?.[0]?.content?.parts?.map((x) => x.text).join("\n") || "";
      const parsed = extractJson(text);

      p.handoffs = p.handoffs || emptyHandoffs();
      p.last_markdown = p.last_markdown || {};
      p.last_markdown[s.id] = parsed.chat_markdown || parsed.documentation_markdown || "";

      if (s.handoffType === "markdown") {
        p.handoffs[s.handoff] =
          parsed.documentation_markdown || parsed.chat_markdown || "# Documentation\n";
      } else {
        const { chat_markdown, ...rest } = parsed;
        p.handoffs[s.handoff] = rest;
      }

      if (parsed.open_questions) p.open_questions = parsed.open_questions;
      p.stages[s.key].status = "awaiting_user";
      p.stages[s.key].updated_at = new Date().toISOString();
      p.updated_at = p.stages[s.key].updated_at;
      p.changelog = p.changelog || [];
      p.changelog.push({
        at: p.updated_at,
        change: `Ran stage ${s.id} with AI`
      });
      saveProjects();
      renderRail();
      renderStage();
      toast("Stage output ready — review, then Lock when happy");
    } catch (err) {
      console.error(err);
      toast(err.message || "AI run failed");
    } finally {
      $("btnRunStage").disabled = false;
      $("btnRunStage").textContent = "Run this stage with AI";
    }
  }

  function lockStage() {
    const p = currentProject();
    const s = window.PBI_STAGES.find((x) => x.id === state.currentStage);
    if (!p.handoffs?.[s.handoff]) {
      toast("No output to lock yet — run AI or paste an output first");
      return;
    }
    p.stages[s.key].locked = true;
    p.stages[s.key].status = "locked";
    p.stages[s.key].updated_at = new Date().toISOString();
    p.changelog = p.changelog || [];
    p.changelog.push({ at: p.stages[s.key].updated_at, change: `Locked stage ${s.id}` });
    if (s.id < 6) {
      p.current_stage = s.id + 1;
      state.currentStage = s.id + 1;
    }
    p.updated_at = new Date().toISOString();
    saveProjects();
    renderRail();
    renderStage();
    toast(`Stage ${s.id} locked`);
  }

  function savePastedOutput() {
    const p = currentProject();
    const s = window.PBI_STAGES.find((x) => x.id === state.currentStage);
    const raw = $("pasteOutput").value.trim();
    if (!raw) return toast("Paste something first");
    p.handoffs = p.handoffs || emptyHandoffs();
    p.last_markdown = p.last_markdown || {};
    try {
      if (s.handoffType === "markdown") {
        p.handoffs[s.handoff] = raw;
        p.last_markdown[s.id] = raw;
      } else {
        const parsed = extractJson(raw);
        if (parsed.chat_markdown) p.last_markdown[s.id] = parsed.chat_markdown;
        const { chat_markdown, ...rest } = parsed;
        p.handoffs[s.handoff] = Object.keys(rest).length ? rest : parsed;
      }
      p.stages[s.key].status = "awaiting_user";
      p.updated_at = new Date().toISOString();
      saveProjects();
      $("pasteOutput").value = "";
      renderStage();
      toast("Pasted output saved");
    } catch (err) {
      if (s.handoffType === "markdown") {
        p.handoffs[s.handoff] = raw;
        p.last_markdown[s.id] = raw;
        saveProjects();
        renderStage();
        toast("Saved as markdown");
      } else {
        toast("Could not parse JSON — check the paste");
      }
    }
  }

  async function exportZip() {
    const p = currentProject();
    if (!p || !window.JSZip) return;
    const zip = new JSZip();
    const root = `projects/${p.slug}`;
    zip.file(`${root}/stage-status.json`, JSON.stringify(buildStatus(p), null, 2));
    zip.file(
      `${root}/README.md`,
      `# ${p.name}\n\nExported from Power BI Delivery Studio.\n`
    );

    const handoffs = zip.folder(`${root}/handoffs`);
    Object.entries(p.handoffs || {}).forEach(([name, value]) => {
      if (value == null) return;
      handoffs.file(
        name,
        typeof value === "string" ? value : JSON.stringify(value, null, 2)
      );
    });

    for (let i = 1; i <= 6; i++) {
      const notes = p[`notes_stage_${i}`];
      if (notes) handoffs.file(`stage-${i}-notes.txt`, notes);
    }

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
    const id = crypto.randomUUID();
    const jump = Number($("newJump").value);
    const project = {
      id,
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
      last_markdown: {},
      open_questions: [],
      changelog: [{ at: new Date().toISOString(), change: "Project created in Delivery Studio" }]
    };
    if (jump > 1) {
      for (let i = 1; i < jump; i++) {
        const s = window.PBI_STAGES[i - 1];
        project.stages[s.key].status = "skipped_jump";
      }
    }
    state.projects.push(project);
    saveProjects();
    $("modalNew").close();
    $("formNewProject").reset();
    openProject(id, jump);
    toast("Project created");
  }

  async function deleteProject() {
    const p = currentProject();
    if (!p) return;
    if (!confirm(`Delete project "${p.name}"? This cannot be undone.`)) return;
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

    $("btnSettings").addEventListener("click", () => {
      $("apiKey").value = state.settings.apiKey || "";
      $("modelName").value = state.settings.model || "gemini-2.0-flash";
      $("modalSettings").showModal();
    });
    $("formSettings").addEventListener("submit", (e) => {
      e.preventDefault();
      state.settings.apiKey = $("apiKey").value.trim();
      state.settings.model = $("modelName").value;
      saveSettings();
      $("modalSettings").close();
      toast(state.settings.apiKey ? "AI key saved in this browser" : "Saved (no key)");
    });
    $("btnClearKey").addEventListener("click", () => {
      $("apiKey").value = "";
      state.settings.apiKey = "";
      saveSettings();
      toast("API key cleared");
    });

    $("btnBackHome").addEventListener("click", renderHome);
    $("btnDeleteProject").addEventListener("click", deleteProject);
    $("btnExportZip").addEventListener("click", exportZip);
    $("btnRunStage").addEventListener("click", runStageAi);
    $("btnLockStage").addEventListener("click", lockStage);
    $("btnSavePaste").addEventListener("click", savePastedOutput);

    $("stageNotes").addEventListener("change", () => {
      const p = currentProject();
      if (!p) return;
      p[`notes_stage_${state.currentStage}`] = $("stageNotes").value;
      p.updated_at = new Date().toISOString();
      saveProjects();
    });

    const dz = $("dropzone");
    $("fileInput").addEventListener("change", (e) => handleFiles(e.target.files));
    dz.addEventListener("dragover", (e) => {
      e.preventDefault();
      dz.classList.add("drag");
    });
    dz.addEventListener("dragleave", () => dz.classList.remove("drag"));
    dz.addEventListener("drop", (e) => {
      e.preventDefault();
      dz.classList.remove("drag");
      handleFiles(e.dataTransfer.files);
    });
  }

  async function init() {
    state.db = await openDb();
    wireEvents();
    renderHome();
  }

  init().catch((err) => {
    console.error(err);
    toast("Studio failed to start — try a modern browser (Chrome/Edge)");
  });
})();

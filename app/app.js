// GTA 6 Trophy Guide & Tracker — offline, local files only, no network at runtime
// except the one local fetch of data/trophies.json. Progress lives in localStorage.
"use strict";

const STORE_KEY = "gta6-trophy-guide-progress-v1";
const SPOILER_KEY = "gta6-trophy-guide-spoilers-v1";

let trophies = [];
let earned = new Set();
let spoilersOn = false;
let selectedId = null;

const $ = (id) => document.getElementById(id);
const listEl = $("trophyList");
const detailEl = $("detail");

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) earned = new Set(JSON.parse(raw).earned || []);
  } catch (_) { earned = new Set(); }
  spoilersOn = localStorage.getItem(SPOILER_KEY) === "1";
  $("spoilerToggle").checked = spoilersOn;
}

function saveState() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ earned: [...earned].sort(), savedAt: new Date().toISOString() }));
  } catch (_) { /* storage full or unavailable: progress just won't persist */ }
}

function saveSpoiler() {
  try { localStorage.setItem(SPOILER_KEY, spoilersOn ? "1" : "0"); } catch (_) {}
}

function isSpoilerHidden(t) {
  return spoilersOn && t.kind === "story" && !earned.has(t.id);
}

function displayName(t) {
  return isSpoilerHidden(t) ? "Hidden story trophy" : t.name;
}

function displayDesc(t) {
  return isSpoilerHidden(t) ? "Spoilers hidden — earn this trophy to reveal its name and description." : t.description;
}

function gradeLabel(g) {
  return g.charAt(0).toUpperCase() + g.slice(1);
}

function filtered() {
  const q = $("search").value.trim().toLowerCase();
  const kind = $("filterKind").value;
  const grade = $("filterGrade").value;
  const status = $("filterStatus").value;
  return trophies.filter((t) => {
    if (kind === "missable") { if (!t.missable) return false; }
    else if (kind && t.kind !== kind) return false;
    if (grade && t.grade !== grade) return false;
    if (status === "earned" && !earned.has(t.id)) return false;
    if (status === "unearned" && earned.has(t.id)) return false;
    if (q && !(t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))) return false;
    return true;
  });
}

function renderProgress() {
  const n = earned.size;
  const pct = Math.round((n / trophies.length) * 100);
  $("progressFill").style.width = pct + "%";
  $("progressText").textContent = n + " / " + trophies.length + " earned — " + pct + "%";
  const counts = {};
  for (const t of trophies) if (earned.has(t.id)) counts[t.grade] = (counts[t.grade] || 0) + 1;
  $("gradeCounts").textContent = ["platinum", "gold", "silver", "bronze"]
    .map((g) => gradeLabel(g) + " " + (counts[g] || 0))
    .join(" · ");
}

function renderList() {
  const rows = filtered();
  listEl.innerHTML = "";
  if (rows.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No trophies match these filters.";
    li.className = "item";
    listEl.appendChild(li);
    return;
  }
  for (const t of rows) {
    const li = document.createElement("li");
    li.className = "item" + (earned.has(t.id) ? " earned" : "") + (selectedId === t.id ? " selected" : "");
    li.dataset.id = t.id;

    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = earned.has(t.id);
    box.setAttribute("aria-label", "Mark " + t.name + " as earned");
    box.addEventListener("click", (ev) => {
      ev.stopPropagation();
      if (box.checked) earned.add(t.id); else earned.delete(t.id);
      saveState();
      renderProgress();
      renderList();
      renderDetail();
    });

    const body = document.createElement("div");
    const name = document.createElement("div");
    name.className = "name";
    name.textContent = displayName(t);
    const desc = document.createElement("div");
    desc.className = "desc";
    desc.textContent = displayDesc(t);
    const tags = document.createElement("div");
    tags.className = "tags";
    const g = document.createElement("span");
    g.className = "tag grade-" + t.grade;
    g.textContent = gradeLabel(t.grade);
    tags.appendChild(g);
    const k = document.createElement("span");
    k.className = "tag";
    k.textContent = t.kind;
    tags.appendChild(k);
    if (t.hidden) {
      const h = document.createElement("span");
      h.className = "tag hidden";
      h.textContent = "Hidden";
      tags.appendChild(h);
    }
    if (t.missable) {
      const m = document.createElement("span");
      m.className = "tag missable";
      m.textContent = "Missable";
      tags.appendChild(m);
    }
    body.append(name, desc, tags);

    const earnedMark = document.createElement("span");
    earnedMark.className = "tag";
    earnedMark.textContent = earned.has(t.id) ? "Earned" : "Not earned";

    li.append(box, body, earnedMark);
    li.addEventListener("click", () => selectTrophy(t.id, true));
    listEl.appendChild(li);
  }
}

function renderDetail() {
  const t = trophies.find((x) => x.id === selectedId);
  if (!t) {
    detailEl.innerHTML = '<p class="hint">Click a trophy to see its guide and sources here.</p>';
    return;
  }
  detailEl.innerHTML = "";
  const h = document.createElement("h2");
  h.textContent = displayName(t);
  const d = document.createElement("p");
  d.className = "desc";
  d.textContent = displayDesc(t);
  const tags = document.createElement("div");
  tags.className = "tags";
  const g = document.createElement("span");
  g.className = "tag grade-" + t.grade;
  g.textContent = gradeLabel(t.grade);
  tags.appendChild(g);
  const r = document.createElement("span");
  r.className = "tag";
  r.textContent = t.roadmap;
  tags.appendChild(r);
  if (t.missable) {
    const m = document.createElement("span");
    m.className = "tag missable";
    m.textContent = "Possibly missable — see guide";
    tags.appendChild(m);
  }
  detailEl.append(h, d, tags);
  if (isSpoilerHidden(t)) {
    const note = document.createElement("p");
    note.className = "spoiler-note";
    note.textContent = "Spoilers are hidden for this story trophy. Mark it as earned, or turn the spoiler setting off, to reveal the guide.";
    detailEl.appendChild(note);
    return;
  }
  const gh = document.createElement("h3");
  gh.textContent = "How to unlock it";
  const gp = document.createElement("p");
  gp.textContent = t.guide;
  const sh = document.createElement("h3");
  sh.textContent = "Sources";
  const ul = document.createElement("ul");
  ul.className = "sources";
  for (const s of t.sources) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = s.url;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = s.label;
    li.appendChild(a);
    ul.appendChild(li);
  }
  detailEl.append(gh, gp, sh, ul);
}

const STAGE_ORDER = [
  "Stage 1 — Story: play through the chapters",
  "Stage 2 — Side characters",
  "Stage 3 — Activities and challenges",
  "Stage 4 — Robberies and wanted level",
  "Stage 5 — Collectibles and exploration",
  "Stage 6 — Platinum",
];
const STAGE_BLURBS = {
  "Stage 1 — Story: play through the chapters": "Chapters 1–4, the final mission, and the story missions in between. All story trophies are hidden and unlock in order as you play.",
  "Stage 2 — Side characters": "The final mission of each side character's chain (Andy, Kenton, Billy, Randy, Tyrone), Bret's hunt, and 8 stranger mission strands.",
  "Stage 3 — Activities and challenges": "Races, drone races, the shooting range, fishing, arcade games, bowling, stunts and the 50 challenges. Most of it is available from Chapter 2.",
  "Stage 4 — Robberies and wanted level": "Shops, bank vaults, the armored truck, the jewelry store, gang operations, the airport departure and the Rhino. Wanted-level trophies need your partner with you.",
  "Stage 5 — Collectibles and exploration": "Meditation spots (do the Chapter 1 balcony spot before Chapter 1 ends), card sets, WAiNK locations, vehicles, garages and exploring all of Leonida.",
  "Stage 6 — Platinum": "The money goals and 100% completion. A Long Road is the last big trophy; once it pops, the platinum follows.",
};

function renderRoadmap() {
  const ol = $("roadmapStages");
  ol.innerHTML = "";
  for (const stage of STAGE_ORDER) {
    const members = trophies.filter((t) => t.roadmap === stage);
    if (members.length === 0) continue;
    const li = document.createElement("li");
    const h = document.createElement("h3");
    h.textContent = stage + " (" + members.length + " trophies)";
    const blurb = document.createElement("p");
    blurb.textContent = STAGE_BLURBS[stage] || "";
    const names = document.createElement("p");
    names.textContent = members.map((t) => displayName(t)).join(" · ");
    const done = members.filter((t) => earned.has(t.id)).length;
    const count = document.createElement("p");
    count.className = "count";
    count.textContent = done + " / " + members.length + " earned in this stage";
    li.append(h, blurb, names, count);
    ol.appendChild(li);
  }
}

function selectTrophy(id, pushHash) {
  selectedId = id;
  renderList();
  renderDetail();
  if (pushHash) location.hash = "trophy-" + id;
}

function showView(view) {
  const roadmap = view === "roadmap";
  $("viewRoadmap").hidden = !roadmap;
  $("viewChecklist").hidden = roadmap;
  $("tabRoadmap").setAttribute("aria-selected", roadmap ? "true" : "false");
  $("tabChecklist").setAttribute("aria-selected", roadmap ? "false" : "true");
  if (roadmap) renderRoadmap();
}

function applyHash() {
  const h = location.hash.slice(1);
  if (h === "roadmap") { showView("roadmap"); return; }
  showView("checklist");
  if (h.startsWith("trophy-")) {
    const id = h.slice("trophy-".length);
    if (trophies.some((t) => t.id === id)) selectTrophy(id, false);
  }
}

function setStatus(msg) {
  $("statusMsg").textContent = msg;
  setTimeout(() => { if ($("statusMsg").textContent === msg) $("statusMsg").textContent = ""; }, 4000);
}

function exportProgress() {
  const data = { game: "Grand Theft Auto VI", exportedAt: new Date().toISOString(), earned: [...earned].sort() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "gta6-trophy-progress.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  setStatus("Exported " + earned.size + " earned trophies.");
}

function importProgress(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      const ids = Array.isArray(data) ? data : data.earned;
      if (!Array.isArray(ids)) throw new Error("no earned list");
      const valid = new Set(trophies.map((t) => t.id));
      const next = new Set();
      for (const id of ids) if (typeof id === "string" && valid.has(id)) next.add(id);
      earned = next;
      saveState();
      renderProgress();
      renderList();
      renderDetail();
      renderRoadmap();
      setStatus("Imported " + earned.size + " earned trophies.");
    } catch (e) {
      setStatus("Import failed: that file is not a progress export.");
    }
  };
  reader.readAsText(file);
}

async function init() {
  loadState();
  const res = await fetch("data/trophies.json");
  const data = await res.json();
  trophies = data.trophies;
  $("search").addEventListener("input", renderList);
  $("filterKind").addEventListener("change", renderList);
  $("filterGrade").addEventListener("change", renderList);
  $("filterStatus").addEventListener("change", renderList);
  $("spoilerToggle").addEventListener("change", (ev) => {
    spoilersOn = ev.target.checked;
    saveSpoiler();
    renderList();
    renderDetail();
  });
  $("tabChecklist").addEventListener("click", () => { location.hash = ""; showView("checklist"); });
  $("tabRoadmap").addEventListener("click", () => { location.hash = "roadmap"; showView("roadmap"); });
  $("exportBtn").addEventListener("click", exportProgress);
  $("importBtn").addEventListener("click", () => $("importFile").click());
  $("importFile").addEventListener("change", (ev) => {
    if (ev.target.files[0]) importProgress(ev.target.files[0]);
    ev.target.value = "";
  });
  $("resetBtn").addEventListener("click", () => {
    if (!window.confirm("Clear all earned trophies? This cannot be undone.")) return;
    earned = new Set();
    saveState();
    renderProgress();
    renderList();
    renderDetail();
    setStatus("Progress reset.");
  });
  window.addEventListener("hashchange", applyHash);
  renderProgress();
  renderList();
  renderDetail();
  applyHash();
}

init().catch((err) => {
  listEl.innerHTML = "<li class=\"item\">Could not load the trophy data (" + err.message + "). Open this page from its own files with node serve.ts.</li>";
});

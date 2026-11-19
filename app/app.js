// GTA 6 Trophy Guide & Tracker — offline, no network, no build step.
// Loads app/data/trophies.json, renders the checklist, keeps progress in
// localStorage, and routes by hash: #tracker, #roadmap, #trophy-<id>.

const DATA_URL = 'data/trophies.json';
const STORE_KEY = 'gta6-trophy-guide-v1';
const GRADE_LABEL = { platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };
const KIND_LABEL = {
  platinum: 'Platinum', story: 'Story', stranger: 'Stranger', robbery: 'Robbery',
  activity: 'Activity', collectible: 'Collectible', world: 'World',
  completion: 'Completion', secret: 'Secret',
};

const ROADMAP = [
  {
    title: 'Stage 1 — Before you start',
    body: 'Turn off cheats on your trophy save: cheats switch off trophies and saving. Set aside manual save slots — one at the start of every chapter and one untouched save from just before the final mission, because there is no mission replay and no New Game Plus.',
  },
  {
    title: 'Stage 2 — Story, Chapters 1–2',
    body: 'Play the story and take the opening trophies as they come: Gone Fishing, then Chapter 1 and Chapter 2. Do Lucia’s balcony meditation in Chapter 1 for Positive Mental Attitude — the only missable trophy — and keep a Chapter 1 save until it pops. After Breakfast Run you can switch between Jason and Lucia and call the other in as your partner.',
  },
  {
    title: 'Stage 3 — Story, Chapters 3–4',
    body: 'Chapter 3 hands you the robbery tools: the Snap Gun from Yasmani’s Jewelry Jobs opens jewelry stores, and Yago’s street racing strand has a time-sensitive race — save first when the hourglass appears. Chapter 4 brings the bank vaults near its end. Start stranger strands as they appear and sample each activity type once for Master of None.',
  },
  {
    title: 'Stage 4 — Finale and side stories',
    body: 'Make a manual save before the final mission, then finish the story for the gold finale trophy. The 100% checklist appears under Progress, then Stats, only after the credits — but everything you did earlier already counts. Side-story finales for Kenton, Billy, Andy, Randy and Tyrone stay open after the story, so finish them now or fold them into cleanup.',
  },
  {
    title: 'Stage 5 — Open-world cleanup',
    body: 'Sweep Leonida district by district: explore everywhere for The Goodtime State, scan vehicles with WAiNK, snap 100 WAiNK spots, collect card packs, buy all eight garages, register ten cars with Scooter Bros, win a Top Fun drone race at all 14 locations, and finish the 42 Shooting Range gold medals. Combine the sweeps instead of touring the map three times.',
  },
  {
    title: 'Stage 6 — The long grind',
    body: 'Close out the counters: 250 stunts (300 for 100%), 50 challenges (70 for 100%), eight stranger strands, one illegal operation per gang, $250,000 of laundered marked bills, and 200 of the 277 vehicle models. When the 100% checklist is full, A Long Road pops — and with it, the platinum.',
  },
];

const $ = (id) => document.getElementById(id);
const listEl = $('trophy-list');
const detailEl = $('detail');
const trackerView = $('tracker-view');
const roadmapView = $('roadmap-view');
const tabTracker = $('tab-tracker');
const tabRoadmap = $('tab-roadmap');

let trophies = [];
let earned = new Set();
let spoilersOn = false;
let selectedId = null;

function loadStored() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.earned)) earned = new Set(parsed.earned.filter((id) => typeof id === 'string'));
    if (parsed.spoilers === true) spoilersOn = true;
  } catch {
    earned = new Set();
  }
}

function saveStored() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ earned: [...earned].sort(), spoilers: spoilersOn }));
  } catch {
    // Storage full or blocked: progress simply does not persist.
  }
}

function gradeRank(grade) {
  return { platinum: 0, gold: 1, silver: 2, bronze: 3 }[grade] ?? 4;
}

function sortedTrophies() {
  return [...trophies].sort((a, b) => gradeRank(a.grade) - gradeRank(b.grade) || a.name.localeCompare(b.name));
}

function isHiddenFromUser(t) {
  return t.hidden && !spoilersOn && !earned.has(t.id);
}

function currentFilters() {
  return {
    q: $('search').value.trim().toLowerCase(),
    kind: $('filter-kind').value,
    grade: $('filter-grade').value,
    status: $('filter-status').value,
    missable: $('filter-missable').checked,
  };
}

function matchesFilters(t) {
  const f = currentFilters();
  if (f.kind !== 'all' && t.kind !== f.kind) return false;
  if (f.grade !== 'all' && t.grade !== f.grade) return false;
  if (f.status === 'earned' && !earned.has(t.id)) return false;
  if (f.status === 'missing' && earned.has(t.id)) return false;
  if (f.missable && !t.missable) return false;
  if (f.q) {
    const hay = `${t.name} ${t.description} ${t.guide}`.toLowerCase();
    if (!hay.includes(f.q)) return false;
  }
  return true;
}

function gradeBadge(t) {
  const span = document.createElement('span');
  span.className = `grade grade-${t.grade}`;
  span.textContent = GRADE_LABEL[t.grade];
  return span;
}

function renderList() {
  const shown = sortedTrophies().filter(matchesFilters);
  listEl.textContent = '';
  $('list-count').textContent = `Showing ${shown.length} of ${trophies.length} trophies — ${earned.size} earned.`;
  for (const t of shown) {
    const li = document.createElement('li');
    li.className = 'trophy';
    li.id = `trophy-${t.id}`;
    if (earned.has(t.id)) li.classList.add('earned');
    if (t.missable) li.classList.add('missable');
    if (selectedId === t.id) li.classList.add('selected');

    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(t.id);
    box.setAttribute('aria-label', `Mark ${isHiddenFromUser(t) ? 'hidden trophy' : t.name} as earned`);
    box.addEventListener('change', () => {
      if (box.checked) earned.add(t.id);
      else earned.delete(t.id);
      saveStored();
      renderAll();
    });

    const body = document.createElement('button');
    body.type = 'button';
    body.className = 'trophy-body';
    body.addEventListener('click', () => {
      selectedId = t.id;
      location.hash = `#trophy-${t.id}`;
      renderAll();
    });

    const name = document.createElement('span');
    name.className = 'trophy-name';
    name.textContent = isHiddenFromUser(t) ? 'Hidden trophy' : t.name;
    const desc = document.createElement('span');
    desc.className = 'trophy-desc';
    desc.textContent = isHiddenFromUser(t)
      ? 'Story trophy — hidden until earned. Turn on “Show story spoilers” to reveal it.'
      : t.description;
    const meta = document.createElement('span');
    meta.className = 'trophy-meta';
    meta.append(gradeBadge(t));
    const kind = document.createElement('span');
    kind.className = 'kind';
    kind.textContent = KIND_LABEL[t.kind] ?? t.kind;
    meta.append(kind);
    if (t.missable) {
      const flag = document.createElement('span');
      flag.className = 'flag-missable';
      flag.textContent = 'Missable';
      meta.append(flag);
    }
    if (t.hidden && !earned.has(t.id)) {
      const flag = document.createElement('span');
      flag.className = 'flag-hidden';
      flag.textContent = spoilersOn ? 'Hidden' : 'Spoiler hidden';
      meta.append(flag);
    }
    body.append(name, desc, meta);
    li.append(box, body);
    listEl.append(li);
  }
  if (shown.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty';
    empty.textContent = 'No trophies match these filters.';
    listEl.append(empty);
  }
}

function renderProgress() {
  const total = trophies.length;
  const done = earned.size;
  $('progress-fill').style.width = total ? `${Math.round((done / total) * 100)}%` : '0%';
  $('progress-count').textContent = `${done} / ${total} earned`;
  const counts = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const t of trophies) if (earned.has(t.id)) counts[t.grade] += 1;
  $('progress-grade').textContent =
    `${counts.platinum} platinum · ${counts.gold} gold · ${counts.silver} silver · ${counts.bronze} bronze`;
}

function renderDetail() {
  const t = trophies.find((x) => x.id === selectedId);
  detailEl.textContent = '';
  if (!t) {
    const p = document.createElement('p');
    p.className = 'detail-empty';
    p.textContent = 'Select a trophy to read its guide and sources.';
    detailEl.append(p);
    return;
  }
  const hidden = isHiddenFromUser(t);
  const title = document.createElement('h2');
  title.textContent = hidden ? 'Hidden trophy' : t.name;
  detailEl.append(title);
  const meta = document.createElement('p');
  meta.className = 'detail-meta';
  meta.append(gradeBadge(t));
  const kind = document.createElement('span');
  kind.className = 'kind';
  kind.textContent = KIND_LABEL[t.kind] ?? t.kind;
  meta.append(kind);
  if (t.missable) {
    const flag = document.createElement('span');
    flag.className = 'flag-missable';
    flag.textContent = 'Missable — Chapter 1 only';
    meta.append(flag);
  }
  detailEl.append(meta);
  const desc = document.createElement('p');
  desc.className = 'detail-desc';
  desc.textContent = hidden ? 'This is a hidden story trophy. Earn it in the game, or turn on “Show story spoilers”, to reveal its name and description.' : t.description;
  detailEl.append(desc);
  if (!hidden) {
    const guideTitle = document.createElement('h3');
    guideTitle.textContent = 'How to unlock it';
    const guide = document.createElement('p');
    guide.className = 'detail-guide';
    guide.textContent = t.guide;
    detailEl.append(guideTitle, guide);
    const srcTitle = document.createElement('h3');
    srcTitle.textContent = 'Sources';
    const srcList = document.createElement('ul');
    srcList.className = 'sources';
    for (const s of t.sources) {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = s.url;
      link.textContent = s.label;
      link.target = '_blank';
      link.rel = 'noopener';
      item.append(link);
      srcList.append(item);
    }
    detailEl.append(srcTitle, srcList);
  }
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'detail-toggle';
  toggle.textContent = earned.has(t.id) ? 'Mark as not earned' : 'Mark as earned';
  toggle.addEventListener('click', () => {
    if (earned.has(t.id)) earned.delete(t.id);
    else earned.add(t.id);
    saveStored();
    renderAll();
  });
  detailEl.append(toggle);
}

function renderRoadmap() {
  const stages = $('roadmap-stages');
  stages.textContent = '';
  for (const [index, stage] of ROADMAP.entries()) {
    const item = document.createElement('li');
    const title = document.createElement('h3');
    title.textContent = stage.title;
    const body = document.createElement('p');
    body.textContent = stage.body;
    const doneCount = trophies.filter((t) => stageTrophyIds(index).includes(t.id) && earned.has(t.id)).length;
    const totalCount = stageTrophyIds(index).length;
    const count = document.createElement('p');
    count.className = 'stage-count';
    count.textContent = totalCount ? `${doneCount} / ${totalCount} stage trophies earned` : '';
    item.append(title, body, count);
    stages.append(item);
  }
}

function stageTrophyIds(index) {
  const byChapter = (ch) => trophies.filter((t) => t.chapter === ch).map((t) => t.id);
  switch (index) {
    case 0: return ['positive-mental-attitude'];
    case 1: return [...byChapter(1), ...byChapter(2), 'trust'];
    case 2: return [...byChapter(3), ...byChapter(4), 'sneakthief'];
    case 3: return [...byChapter(5), 'this-was-no-boat-accident', 'the-lone-rider', 'road-to-rehabilitation', 'supply-and-demand', 'spin-on-this'];
    case 4: return ['the-goodtime-state', 'whip-it-good', 'you-wainker', 'dont-touch-my-deck', 'little-boxes', 'on-the-spot', 'top-fun', 'the-shootist'];
    case 5: return ['cunning-stunts', 'one-last-thing', 'a-long-road', 'pest-control', 'dime-on-the-dollar', 'strangers-and-freaks', 'vice-got-a-price'];
    default: return [];
  }
}

function renderTabs() {
  const onRoadmap = location.hash === '#roadmap';
  trackerView.hidden = onRoadmap;
  roadmapView.hidden = !onRoadmap;
  tabTracker.classList.toggle('active', !onRoadmap);
  tabRoadmap.classList.toggle('active', onRoadmap);
}

function renderAll() {
  renderList();
  renderProgress();
  renderDetail();
  renderRoadmap();
}

function applyHash() {
  const hash = location.hash;
  if (hash.startsWith('#trophy-')) {
    const id = hash.slice('#trophy-'.length);
    if (trophies.some((t) => t.id === id)) {
      selectedId = id;
      renderTabs();
      renderAll();
      const el = document.getElementById(`trophy-${id}`);
      if (el) el.scrollIntoView({ block: 'nearest' });
      return;
    }
  }
  selectedId = null;
  renderTabs();
  renderAll();
}

function exportProgress() {
  const blob = new Blob([JSON.stringify({ game: 'Grand Theft Auto VI', earned: [...earned].sort(), exported: true }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'gta6-trophy-progress.json';
  link.click();
  URL.revokeObjectURL(url);
}

function importProgress(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const ids = Array.isArray(parsed.earned) ? parsed.earned : Array.isArray(parsed) ? parsed : null;
      if (!ids) throw new Error('no earned list');
      const known = new Set(trophies.map((t) => t.id));
      earned = new Set(ids.filter((id) => typeof id === 'string' && known.has(id)));
      saveStored();
      renderAll();
    } catch {
      alert('That file is not a valid trophy progress export.');
    }
  };
  reader.readAsText(file);
}

async function init() {
  loadStored();
  $('spoiler-toggle').checked = spoilersOn;
  const response = await fetch(DATA_URL);
  const data = await response.json();
  trophies = data.trophies;

  $('search').addEventListener('input', renderList);
  $('filter-kind').addEventListener('change', renderList);
  $('filter-grade').addEventListener('change', renderList);
  $('filter-status').addEventListener('change', renderList);
  $('filter-missable').addEventListener('change', renderList);
  $('spoiler-toggle').addEventListener('change', (event) => {
    spoilersOn = event.target.checked;
    saveStored();
    renderAll();
  });
  $('export-btn').addEventListener('click', exportProgress);
  $('import-btn').addEventListener('click', () => $('import-file').click());
  $('import-file').addEventListener('change', (event) => {
    const file = event.target.files && event.target.files[0];
    if (file) importProgress(file);
    event.target.value = '';
  });
  window.addEventListener('hashchange', applyHash);
  applyHash();
}

init();

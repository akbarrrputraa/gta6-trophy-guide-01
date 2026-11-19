// GTA 6 Trophy Guide — tracker logic.
// Loads app/data/trophies.json (local file, no network), renders the checklist,
// roadmap, filters, spoiler setting and progress saved in localStorage.
// URL params for deep links and screenshots: ?view=roadmap, ?filter=<name>,
// ?spoiler=on, ?open=<trophy id>.

const STORAGE_KEY = 'gta6-trophy-guide-progress-v1';
const STAGES = {
  1: { title: 'Stage 1 — Story playthrough', text: 'Play chapters 1 to 4 and the finale in order. Twelve trophies come from the story alone; finish the missable partner and choice trophies before the final mission, the point of no return.' },
  2: { title: 'Stage 2 — Strangers & side missions', text: 'Complete the stranger strands (Andy, Kenton, Billy, Randy, Tyrone and the rest) and the one-off world moments: partner trophies, the airport departure, the showroom smash and the cocktail on Ocean Beach.' },
  3: { title: 'Stage 3 — Activities & skills', text: 'Sample every activity type, gold all 42 Shooting Range challenges, win drone races at all 14 locations and 20 different races, fish, bowl and chase the 250-stunt total.' },
  4: { title: 'Stage 4 — Collectibles & exploration', text: 'Meditate at all 18 spots, finish 3 card sets, WAiNK It at 100 locations, discover 100 vehicles and explore all 52 areas of Leonida.' },
  5: { title: 'Stage 5 — Cleanup & grind', text: 'Rob 5 bank vaults and one illegal operation per gang, launder $250,000 of Marked Bills, spend $100,000, buy all 8 garages, hit 100% completion — then the platinum pops.' },
};
const KIND_LABELS = { story: 'Story', mission: 'Story', side: 'Side mission', activity: 'Activity', collectible: 'Collectible', exploration: 'Exploration', combat: 'Combat', economy: 'Economy', secret: 'Secret' };

const params = new URLSearchParams(location.search);
let trophies = [];
let state = loadState();
let selectedId = null;
let currentFilter = params.get('filter') || 'all';
let currentView = params.get('view') === 'roadmap' ? 'roadmap' : 'list';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { earned: parsed.earned || {}, spoiler: !!parsed.spoiler };
    }
  } catch { /* corrupted save: start fresh */ }
  return { earned: {}, spoiler: params.get('spoiler') === 'on' };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function isEarned(t) { return !!state.earned[t.id]; }
function isSpoiled(t) {
  return state.spoiler && (t.kind === 'story' || t.kind === 'mission') && !isEarned(t);
}

function gradeLabel(t) { return t.grade.charAt(0).toUpperCase() + t.grade.slice(1); }

function filteredTrophies() {
  const q = (document.getElementById('search').value || '').toLowerCase().trim();
  return trophies.filter((t) => {
    if (currentFilter === 'story' && t.kind !== 'story' && t.kind !== 'mission') return false;
    if (currentFilter === 'missable' && !t.missable) return false;
    if (currentFilter === 'collectible' && t.kind !== 'collectible' && t.kind !== 'exploration') return false;
    if (currentFilter === 'activity' && t.kind !== 'activity') return false;
    if (currentFilter === 'online') return false;
    if (currentFilter === 'earned' && !isEarned(t)) return false;
    if (currentFilter === 'remaining' && isEarned(t)) return false;
    if (q && !(t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || (t.guide || '').toLowerCase().includes(q))) return false;
    return true;
  });
}

function renderProgress() {
  const earned = trophies.filter(isEarned).length;
  document.getElementById('earnedCount').textContent = earned;
  document.getElementById('progressPct').textContent = Math.round((earned / trophies.length) * 100) + '%';
  document.getElementById('progressFill').style.width = (earned / trophies.length) * 100 + '%';
  const byGrade = {};
  trophies.forEach((t) => {
    byGrade[t.grade] = byGrade[t.grade] || [0, 0];
    byGrade[t.grade][1] += 1;
    if (isEarned(t)) byGrade[t.grade][0] += 1;
  });
  document.getElementById('gradeCounts').textContent =
    ['platinum', 'gold', 'silver', 'bronze'].map((g) => `${gradeLabel({ grade: g })} ${byGrade[g][0]}/${byGrade[g][1]}`).join(' · ');
}

function renderList() {
  const list = document.getElementById('trophyList');
  const empty = document.getElementById('emptyState');
  const note = document.getElementById('filterNote');
  const items = filteredTrophies();
  list.innerHTML = '';
  if (currentFilter === 'online') {
    note.hidden = false;
    note.textContent = 'No online trophies: the official GTA VI list of 55 trophies has no online trophy, so there is nothing to filter here. Everything is earned in single-player Leonida.';
  } else if (currentFilter === 'missable') {
    note.hidden = false;
    note.textContent = 'Missable trophies — earn these before the finale, the point of no return. ' + items.length + ' of 55 can be missed.';
  } else {
    note.hidden = true;
  }
  if (items.length === 0) {
    empty.hidden = false;
    empty.textContent = currentFilter === 'online'
      ? 'No online trophies in this list.'
      : 'No trophies match this filter and search. Try clearing the search or choosing another filter.';
  } else {
    empty.hidden = true;
  }
  for (const t of items) {
    const li = document.createElement('li');
    li.className = 'trophy' + (isEarned(t) ? ' earned' : '') + (t.id === selectedId ? ' selected' : '');
    const spoiled = isSpoiled(t);
    li.innerHTML =
      '<input type="checkbox" aria-label="Mark earned">' +
      '<div><div class="trophy-name"></div><div class="trophy-desc"></div><div class="trophy-meta"></div></div>' +
      '<div class="grade-dot"></div>';
    li.querySelector('input').checked = isEarned(t);
    li.querySelector('.trophy-name').textContent = spoiled ? 'Hidden story trophy — earn it to reveal' : t.name;
    li.querySelector('.trophy-desc').textContent = spoiled ? 'Spoiler hidden until earned.' : t.description;
    const meta = li.querySelector('.trophy-meta');
    const badges = [`<span class="badge ${t.grade}">${gradeLabel(t)}</span>`];
    if (t.missable) badges.push('<span class="badge missable">Missable</span>');
    if (t.hidden) badges.push('<span class="badge hidden-flag">Hidden</span>');
    if (t.count) badges.push(`<span class="badge">Count: ${t.count.toLocaleString('en-US')}</span>`);
    badges.push(`<span class="badge stage">${STAGES[t.stage].title.split('—')[0].trim()}</span>`);
    badges.push(`<span class="badge">${KIND_LABELS[t.kind] || t.kind}</span>`);
    meta.innerHTML = badges.join('');
    li.querySelector('.grade-dot').textContent = isEarned(t) ? '✓ Earned' : gradeLabel(t);
    li.querySelector('input').addEventListener('change', (e) => {
      e.stopPropagation();
      if (e.target.checked) state.earned[t.id] = true; else delete state.earned[t.id];
      saveState(); renderAll();
    });
    li.addEventListener('click', () => { selectedId = t.id; renderAll(); });
    list.appendChild(li);
  }
}

function renderDetail() {
  const box = document.getElementById('detail');
  const t = trophies.find((x) => x.id === selectedId);
  if (!t) {
    box.innerHTML = '<p class="detail-empty"><strong>Pick a trophy</strong> to see its guide and sources. The guide explains what to do, where and how — and when it can be missed.</p>';
    return;
  }
  const spoiled = isSpoiled(t);
  const sources = (t.sources || []).map((s) => `<li></li>`).join('');
  box.innerHTML =
    '<h2></h2><p class="official"></p><div class="trophy-meta"></div>' +
    '<h3>Guide</h3><p class="guide-text"></p>' +
    '<h3>Sources</h3><ul class="sources">' + sources + '</ul>' +
    '<h3>Roadmap</h3><p class="roadmap-text"></p>';
  box.querySelector('h2').textContent = spoiled ? 'Hidden story trophy' : t.name;
  box.querySelector('.official').textContent = spoiled ? 'Spoiler hidden until earned.' : t.description;
  const meta = box.querySelector('.trophy-meta');
  meta.innerHTML = `<span class="badge ${t.grade}">${gradeLabel(t)}</span>` +
    (t.missable ? '<span class="badge missable">Missable</span>' : '') +
    (t.hidden ? '<span class="badge hidden-flag">Hidden on PlayStation</span>' : '') +
    (t.count ? `<span class="badge">Count: ${t.count.toLocaleString('en-US')}</span>` : '') +
    `<span class="badge">${KIND_LABELS[t.kind] || t.kind}</span>`;
  box.querySelector('.guide-text').textContent = spoiled
    ? 'Turn off the spoiler setting, or earn this trophy, to read its guide.'
    : t.guide;
  const lis = box.querySelectorAll('.sources li');
  (t.sources || []).forEach((s, i) => { if (lis[i]) lis[i].textContent = s; });
  box.querySelector('.roadmap-text').textContent = STAGES[t.stage].title + ' — ' + STAGES[t.stage].text;
}

function renderRoadmap() {
  const roadmap = document.getElementById('roadmap');
  const list = document.getElementById('trophyList');
  const note = document.getElementById('filterNote');
  if (currentView !== 'roadmap') { roadmap.hidden = true; list.hidden = false; return; }
  roadmap.hidden = false;
  list.hidden = true;
  note.hidden = true;
  roadmap.innerHTML = '';
  for (const stageNum of [1, 2, 3, 4, 5]) {
    const stageTrophies = trophies.filter((t) => t.stage === stageNum);
    const done = stageTrophies.filter(isEarned).length;
    const card = document.createElement('div');
    card.className = 'stage-card';
    card.innerHTML = '<h2><span class="stage-num"></span> </h2><p></p><p class="stage-progress"></p><ul></ul>';
    card.querySelector('.stage-num').textContent = 'Stage ' + stageNum;
    card.querySelector('h2').appendChild(document.createTextNode(STAGES[stageNum].title.split('— ')[1]));
    card.querySelector('p').textContent = STAGES[stageNum].text;
    card.querySelector('.stage-progress').textContent = done + ' / ' + stageTrophies.length + ' earned in this stage';
    const ul = card.querySelector('ul');
    for (const t of stageTrophies) {
      const li = document.createElement('li');
      li.textContent = (isEarned(t) ? '✓ ' : '○ ') + (isSpoiled(t) ? 'Hidden story trophy' : t.name) +
        ' — ' + gradeLabel(t) + (t.missable ? ' — MISSABLE' : '') + (t.count ? ' — ' + t.count.toLocaleString('en-US') : '');
      ul.appendChild(li);
    }
    roadmap.appendChild(card);
  }
}

function renderAll() {
  renderProgress();
  renderRoadmap();
  if (currentView !== 'roadmap') renderList();
  renderDetail();
  document.getElementById('roadmapBtn').textContent = currentView === 'roadmap' ? 'Back to Checklist' : 'Roadmap to Platinum';
  document.querySelectorAll('#filters button').forEach((b) => b.classList.toggle('active', b.dataset.filter === currentFilter));
}

function exportProgress() {
  const blob = new Blob([JSON.stringify({ game: 'Grand Theft Auto VI', exported: new Date().toISOString(), earned: Object.keys(state.earned).map(Number), spoiler: state.spoiler }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importProgress(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      const ids = Array.isArray(data.earned) ? data.earned : Object.keys(data.earned || {});
      state.earned = {};
      for (const id of ids) { const n = Number(id); if (trophies.some((t) => t.id === n)) state.earned[n] = true; }
      if (typeof data.spoiler === 'boolean') state.spoiler = data.spoiler;
      saveState(); renderAll();
    } catch { alert('That file is not a valid progress export.'); }
  };
  reader.readAsText(file);
}

async function init() {
  const res = await fetch('data/trophies.json');
  const data = await res.json();
  trophies = data.trophies;
  const openId = Number(params.get('open'));
  if (openId && trophies.some((t) => t.id === openId)) selectedId = openId;
  else if (trophies.length) selectedId = trophies[0].id;

  document.getElementById('spoilerToggle').checked = state.spoiler;
  document.getElementById('spoilerToggle').addEventListener('change', (e) => { state.spoiler = e.target.checked; saveState(); renderAll(); });
  document.getElementById('filters').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-filter]');
    if (!b) return;
    currentFilter = b.dataset.filter; currentView = 'list'; renderAll();
  });
  document.getElementById('search').addEventListener('input', renderList);
  document.getElementById('roadmapBtn').addEventListener('click', () => {
    currentView = currentView === 'roadmap' ? 'list' : 'roadmap'; renderAll();
  });
  document.getElementById('exportBtn').addEventListener('click', exportProgress);
  document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
  document.getElementById('importFile').addEventListener('change', (e) => { if (e.target.files[0]) importProgress(e.target.files[0]); e.target.value = ''; });
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (confirm('Clear all earned trophies?')) { state.earned = {}; saveState(); renderAll(); }
  });
  renderAll();
}

init();

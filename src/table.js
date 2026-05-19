import { subscribe, filterFeatures } from './state.js';
import { CATEGORY_COLORS } from './categories.js';
import { getMap } from './map.js';
import { openPopup } from './popup.js';

const PAGE_SIZE = 50;

let allFeatures = [];
let filteredFeatures = [];
let keyword = '';
let page = 0;
let featureIndex = {};

function buildIndex(features) {
  featureIndex = {};
  for (const f of features) {
    featureIndex[f.properties.id] = f;
  }
}

function matchesKeyword(p, kw) {
  if (!kw) return true;
  const haystack = [p.notes, p.actor, p.country, p.category]
    .filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(kw);
}

function applyFilters(stateFiltered) {
  const kw = keyword.trim().toLowerCase();
  filteredFeatures = stateFiltered
    .filter(f => matchesKeyword(f.properties, kw))
    .sort((a, b) => {
      const da = a.properties.date || '';
      const db = b.properties.date || '';
      return db.localeCompare(da);
    });
  page = 0;
}

function targetLabel(target) {
  return target === 'anti-china' ? 'Anti-China' : 'Anti-US';
}

function targetClass(target) {
  return target === 'anti-china' ? 'inc-badge-cn' : 'inc-badge-us';
}

function renderRows() {
  const list = document.getElementById('incident-list');
  const count = document.getElementById('incident-count');
  const moreBtn = document.getElementById('incident-more');

  if (!list) return;

  const visible = filteredFeatures.slice(0, (page + 1) * PAGE_SIZE);
  const total = filteredFeatures.length;

  count.textContent = total === 0
    ? 'No incidents found'
    : `Showing ${Math.min(visible.length, total).toLocaleString()} of ${total.toLocaleString()} incidents`;

  list.innerHTML = visible.map(f => {
    const p = f.properties;
    const color = CATEGORY_COLORS[p.category] || '#888';
    const notes = p.notes ? (p.notes.length > 130 ? p.notes.slice(0, 130) + '…' : p.notes) : '';
    const actor = p.actor ? `<span class="inc-actor">${escHtml(p.actor)}</span>` : '';
    return `<div class="inc-row" data-id="${escHtml(p.id)}">
      <span class="inc-dot" style="background:${color}"></span>
      <div class="inc-body">
        <div class="inc-meta">
          <span class="inc-date">${p.date || '—'}</span>
          <span class="inc-country">${escHtml(p.country || '—')}</span>
          <span class="inc-badge ${targetClass(p.target)}">${targetLabel(p.target)}</span>
          <span class="inc-cat">${escHtml(p.category || '—')}</span>
          ${actor}
        </div>
        ${notes ? `<div class="inc-notes">${escHtml(notes)}</div>` : ''}
      </div>
    </div>`;
  }).join('');

  if (moreBtn) {
    moreBtn.style.display = visible.length < total ? 'block' : 'none';
  }

  list.querySelectorAll('.inc-row').forEach(row => {
    row.addEventListener('click', () => {
      const id = row.getAttribute('data-id');
      const feature = featureIndex[id];
      if (!feature) return;
      const map = getMap();
      if (!map) return;
      const [lon, lat] = feature.geometry.coordinates;
      map.flyTo({ center: [lon, lat], zoom: 7, duration: 800 });
      openPopup(map, feature);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

function escHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function initTable(features) {
  allFeatures = features;
  buildIndex(features);

  const stateFiltered = filterFeatures(allFeatures);
  applyFilters(stateFiltered);
  renderRows();

  subscribe(() => {
    const sf = filterFeatures(allFeatures);
    applyFilters(sf);
    renderRows();
  });

  let debounceTimer = null;
  const searchInput = document.getElementById('incident-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        keyword = searchInput.value;
        const sf = filterFeatures(allFeatures);
        applyFilters(sf);
        renderRows();
      }, 200);
    });
  }

  const moreBtn = document.getElementById('incident-more');
  if (moreBtn) {
    moreBtn.addEventListener('click', () => {
      page += 1;
      renderRows();
    });
  }
}

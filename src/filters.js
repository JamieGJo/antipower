import noUiSlider from 'nouislider';
import 'nouislider/dist/nouislider.css';
import { CATEGORIES_ORDERED, CATEGORY_COLORS, categoryFor, SCHEMES, schemeCategoryFor } from './categories.js';
import { state, subscribe, setDataset, setYearRange, toggleCategory, setAllCategories, setShowResponseOnly, setShowFatalitiesOnly, setHideFlagged, setScheme, setSearch, clearSearch } from './state.js';

const MFA_CAT = 'Military Forces Attacks';

const TOPICS = [
  { id: 'israel-gaza', label: 'Israel / Gaza',     terms: ['israel','palestine','gaza','hamas','west bank'] },
  { id: 'terrorism',   label: 'Terrorism',          terms: ['terror'] },
  { id: 'iran',        label: 'Iran / Houthi',      terms: ['iran','irgc','houthi'] },
  { id: 'xinjiang',    label: 'Xinjiang',            terms: ['xinjiang','uyghur','east turkestan','uighur'] },
  { id: 'ukraine',     label: 'Ukraine / Russia',   terms: ['ukraine','russia'] },
  { id: 'trade',       label: 'Trade / Tariffs',    terms: ['tariff','trade war','dumping','sanction'] },
];

export function initFilters(features) {
  initDatasetToggle();
  initYearSlider(features);
  initCategoryList(features);
  initResponseFilter();
  initFatalitiesFilter();
  initFlaggedFilter();
  initCodebookTabs();
  initPanelSearch();
  initTopicButtons();
  initMfaToggle();
}

function initMfaToggle() {
  const toggle = document.getElementById('exclude-mfa-attacks');
  if (!toggle) return;

  toggle.addEventListener('change', (e) => {
    const exclude = e.target.checked;
    toggleCategory(MFA_CAT, !exclude);
    // Keep sidebar checkbox in sync
    const sidebarCb = document.querySelector(`input[data-cat="${MFA_CAT}"]`);
    if (sidebarCb) sidebarCb.checked = !exclude;
  });

  // Keep toolbar toggle in sync when sidebar category list changes state
  subscribe(() => {
    const included = state.enabledCategories.has(MFA_CAT);
    toggle.checked = !included;
  });
}

function initResponseFilter() {
  const cb = document.getElementById('has-response-only');
  if (!cb) return;
  cb.addEventListener('change', (e) => setShowResponseOnly(e.target.checked));
}

function initCodebookTabs() {
  const tabs = document.getElementById('cb-tabs');
  if (!tabs) return;
  const show = (key) => {
    tabs.querySelectorAll('button[data-cb]').forEach((b) => {
      b.classList.toggle('is-active', b.getAttribute('data-cb') === key);
    });
    document.querySelectorAll('[data-cb-pane]').forEach((pane) => {
      pane.hidden = pane.getAttribute('data-cb-pane') !== key;
    });
  };
  tabs.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-cb]');
    if (b) show(b.getAttribute('data-cb'));
  });
  // Follow the category scheme, so the codebook documents what is on the map.
  let last = state.scheme;
  subscribe(() => {
    if (state.scheme === last) return;
    last = state.scheme;
    show(state.scheme);
  });
}

function initFlaggedFilter() {
  const cb = document.getElementById('hide-flagged');
  if (!cb) return;
  cb.addEventListener('change', (e) => setHideFlagged(e.target.checked));
}

function initFatalitiesFilter() {
  const cb = document.getElementById('fatalities-only');
  if (!cb) return;
  cb.addEventListener('change', (e) => setShowFatalitiesOnly(e.target.checked));
}

function initPanelSearch() {
  const input = document.getElementById('panel-search');
  if (!input) return;

  let debounceTimer = null;
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const q = input.value.trim();
      if (q) {
        setSearch(q, q.split(/\s+/));
      } else {
        clearSearch();
      }
    }, 200);
  });

  // Sync input value when state changes (e.g. topic button or bottom search updates it)
  subscribe(() => {
    if (input !== document.activeElement) {
      input.value = state.searchQuery;
    }
    // Update topic chip active states
    document.querySelectorAll('.topic-chip').forEach((btn) => {
      const terms = JSON.parse(btn.dataset.terms || '[]');
      const active = terms.length > 0 &&
        terms.every((t) => state.searchTerms.includes(t));
      btn.classList.toggle('active', active);
    });
  });
}

function initTopicButtons() {
  const container = document.getElementById('topic-chips');
  if (!container) return;

  container.innerHTML = TOPICS.map((t) =>
    `<button class="topic-chip" data-id="${t.id}" data-terms='${JSON.stringify(t.terms)}'>${t.label}</button>`
  ).join('');

  container.querySelectorAll('.topic-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      const terms = JSON.parse(btn.dataset.terms);
      const isActive = btn.classList.contains('active');
      if (isActive) {
        clearSearch();
      } else {
        setSearch(btn.textContent.trim(), terms);
      }
    });
  });
}

function initDatasetToggle() {
  document.querySelectorAll('input[name="dataset"]').forEach((el) => {
    el.addEventListener('change', (e) => setDataset(e.target.value));
  });
}

function initYearSlider(features) {
  const years = features.map((f) => f.properties.year).filter((y) => y != null);
  const yMin = Math.min(...years);
  const yMax = Math.max(...years);
  state.yearMin = yMin;
  state.yearMax = yMax;
  const slider = document.getElementById('year-slider');
  noUiSlider.create(slider, {
    start: [yMin, yMax],
    connect: true,
    step: 1,
    range: { min: yMin, max: yMax },
    format: { to: (v) => Math.round(v), from: (v) => Math.round(v) },
  });
  const minEl = document.getElementById('year-min');
  const maxEl = document.getElementById('year-max');
  minEl.textContent = yMin;
  maxEl.textContent = yMax;
  slider.noUiSlider.on('update', (values) => {
    minEl.textContent = values[0];
    maxEl.textContent = values[1];
  });
  slider.noUiSlider.on('change', (values) => {
    setYearRange(Number(values[0]), Number(values[1]));
  });
}

function initCategoryList(features) {
  const container = document.getElementById('category-list');

  // Re-rendered whenever the scheme changes, so counts/colours/hints follow it.
  function render() {
    const sc = SCHEMES[state.scheme] || SCHEMES.thom;
    const counts = {};
    for (const f of features) {
      const c = schemeCategoryFor(f.properties, state.scheme);
      counts[c] = (counts[c] || 0) + 1;
    }
    container.innerHTML = sc.ordered.map((cat) => {
      const color = sc.colors[cat] || '#999';
      const count = counts[cat] || 0;
      const on = state.enabledCategories.has(cat) ? 'checked' : '';
      return `
      <label class="cat-item">
        <input type="checkbox" data-cat="${cat}" ${on} />
        <span class="cat-swatch" style="background:${color};"></span>
        <span class="cat-label">${cat}</span>
        <span class="cat-count">${count}</span>
      </label>`;
    }).join('');
    container.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.addEventListener('change', (e) => {
        toggleCategory(e.target.getAttribute('data-cat'), e.target.checked);
      });
    });
  }

  render();

  document.getElementById('cat-all').addEventListener('click', () => {
    setAllCategories(true);
    container.querySelectorAll('input[type="checkbox"]').forEach((cb) => { cb.checked = true; });
  });
  document.getElementById('cat-none').addEventListener('click', () => {
    setAllCategories(false);
    container.querySelectorAll('input[type="checkbox"]').forEach((cb) => { cb.checked = false; });
  });

  // Scheme switcher
  const schemeWrap = document.getElementById('scheme-toggle');
  if (schemeWrap) {
    schemeWrap.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-scheme]');
      if (!btn) return;
      setScheme(btn.getAttribute('data-scheme'));
    });
  }

  let renderedScheme = state.scheme;
  subscribe(() => {
    if (state.scheme === renderedScheme) return;
    renderedScheme = state.scheme;
    render();
    if (schemeWrap) {
      schemeWrap.querySelectorAll('button[data-scheme]').forEach((b) => {
        b.classList.toggle('is-active', b.getAttribute('data-scheme') === state.scheme);
      });
    }
  });
}


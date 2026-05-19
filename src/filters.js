import noUiSlider from 'nouislider';
import 'nouislider/dist/nouislider.css';
import { CATEGORIES_ORDERED, CATEGORY_COLORS, categoryFor } from './categories.js';
import { state, subscribe, setDataset, setYearRange, toggleCategory, setAllCategories, setShowResponseOnly } from './state.js';

const MFA_CAT = 'Military Forces Attacks';

export function initFilters(features) {
  initDatasetToggle();
  initYearSlider(features);
  initCategoryList(features);
  initResponseFilter();
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
  // Count by category for display.
  const counts = {};
  for (const f of features) {
    const c = categoryFor(f.properties.category);
    counts[c] = (counts[c] || 0) + 1;
  }
  // Render
  container.innerHTML = CATEGORIES_ORDERED.map((cat) => {
    const color = CATEGORY_COLORS[cat] || '#999';
    const count = counts[cat] || 0;
    return `
      <label class="cat-item">
        <input type="checkbox" data-cat="${cat}" checked />
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
  document.getElementById('cat-all').addEventListener('click', () => {
    setAllCategories(true);
    container.querySelectorAll('input[type="checkbox"]').forEach((cb) => { cb.checked = true; });
  });
  document.getElementById('cat-none').addEventListener('click', () => {
    setAllCategories(false);
    container.querySelectorAll('input[type="checkbox"]').forEach((cb) => { cb.checked = false; });
  });
}

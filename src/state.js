// Tiny reactive store. Subscribers fire on every set().
import { CATEGORIES_ORDERED, categoryFor } from './categories.js';

const listeners = new Set();

export const state = {
  dataset: 'both',           // 'both' | 'anti-china' | 'anti-us'
  yearMin: 1989,
  yearMax: 2025,
  enabledCategories: new Set(CATEGORIES_ORDERED),
  showResponseOnly: false,
};

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function notify() {
  for (const fn of listeners) fn(state);
}

export function setDataset(v) {
  state.dataset = v;
  notify();
}
export function setYearRange(min, max) {
  state.yearMin = min;
  state.yearMax = max;
  notify();
}
export function toggleCategory(c, on) {
  if (on) state.enabledCategories.add(c);
  else state.enabledCategories.delete(c);
  notify();
}
export function setAllCategories(on) {
  if (on) {
    for (const c of CATEGORIES_ORDERED) state.enabledCategories.add(c);
  } else {
    state.enabledCategories.clear();
  }
  notify();
}
export function setShowResponseOnly(v) {
  state.showResponseOnly = v;
  notify();
}

// Apply current state to a feature collection, returning a *new* FeatureCollection.
export function filterFeatures(features) {
  const { dataset, yearMin, yearMax, enabledCategories, showResponseOnly } = state;
  return features.filter((f) => {
    const p = f.properties;
    if (dataset !== 'both' && p.target !== dataset) return false;
    if (p.year != null && (p.year < yearMin || p.year > yearMax)) return false;
    if (!enabledCategories.has(categoryFor(p.category))) return false;
    if (showResponseOnly && !p.cn_resp && !p.us_resp && !p.mfa && !p.media) return false;
    return true;
  });
}

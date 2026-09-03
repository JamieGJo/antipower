// Tiny reactive store. Subscribers fire on every set().
import { CATEGORIES_ORDERED, categoryFor, SCHEMES, schemeCategoryFor } from './categories.js';

const listeners = new Set();

export const state = {
  dataset: 'both',           // 'both' | 'anti-china' | 'anti-us'
  yearMin: 1989,
  yearMax: 2025,
  scheme: 'thom',            // 'thom' (primary) | 'sino' (secondary)
  enabledCategories: new Set(CATEGORIES_ORDERED),
  showResponseOnly: false,
  showFatalitiesOnly: false,
  hideFlagged: false,        // hide events the master flags as not substantively about China/the US
  searchQuery: '',            // display string (shown in inputs)
  searchTerms: [],            // lowercased OR-match terms
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
export function setScheme(key) {
  if (!SCHEMES[key] || state.scheme === key) return;
  state.scheme = key;
  state.enabledCategories = new Set(SCHEMES[key].ordered);
  notify();
}
export function setHideFlagged(v) {
  state.hideFlagged = v;
  notify();
}
export function setShowResponseOnly(v) {
  state.showResponseOnly = v;
  notify();
}
export function setShowFatalitiesOnly(v) {
  state.showFatalitiesOnly = v;
  notify();
}
export function setSearch(query, terms) {
  state.searchQuery = query;
  state.searchTerms = terms.map((t) => t.toLowerCase());
  notify();
}
export function clearSearch() {
  state.searchQuery = '';
  state.searchTerms = [];
  notify();
}

function matchesSearch(p, terms) {
  if (!terms.length) return true;
  const haystack = [p.notes, p.actor, p.country, p.category, p.subcategory]
    .filter(Boolean).join(' ').toLowerCase();
  return terms.some((t) => haystack.includes(t));
}

// Apply current state to a feature collection, returning a *new* FeatureCollection.
export function filterFeatures(features) {
  const { dataset, yearMin, yearMax, enabledCategories, showResponseOnly, showFatalitiesOnly, searchTerms, hideFlagged } = state;
  return features.filter((f) => {
    const p = f.properties;
    if (dataset !== 'both' && p.target !== dataset) return false;
    if (p.year != null && (p.year < yearMin || p.year > yearMax)) return false;
    if (!enabledCategories.has(schemeCategoryFor(p, state.scheme))) return false;
    if (hideFlagged && p.validity && p.validity !== 'VALID') return false;
    if (showResponseOnly && !p.cn_resp && !p.us_resp && !p.mfa && !p.media) return false;
    if (showFatalitiesOnly && !(p.fatalities > 0)) return false;
    if (!matchesSearch(p, searchTerms)) return false;
    return true;
  });
}

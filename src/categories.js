// Merged 9-category scheme.
// The underlying geojson still uses the original 12 split names;
// CATEGORY_REMAP and categoryFor() collapse them everywhere in the UI.
export const CATEGORY_REMAP = {
  'China Domestic (Solidarity)':        'Domestic (Solidarity)',
  'US Domestic (Solidarity)':           'Domestic (Solidarity)',
  'Violence Against Chinese Nationals': 'Violence Against Nationals',
  'Xenophobia/Anti-American':           'Xenophobia/Anti-Immigration',
};

export function categoryFor(raw) {
  return CATEGORY_REMAP[raw] || raw;
}

// Merged display names → colours.
// Old split names are also listed as aliases (same colour) so the map
// layer, which reads raw geojson properties, still resolves correctly.
export const CATEGORY_COLORS = {
  'Political Influence':         '#34495e',
  'Project Grievance':           '#e67e22',
  'Domestic (Solidarity)':       '#c0392b',
  'Sovereignty & Territorial':   '#2c5f8d',
  'Military Forces Attacks':     '#1a5276',
  'Violence Against Nationals':  '#8e3a3a',
  'Diplomatic/Bilateral':        '#5a8b3a',
  'Economic Competition':        '#d4a017',
  'Xenophobia/Anti-Immigration': '#7f5a83',
  'Symbolic/Nationalist':        '#9c8a73',
  // Old aliases (point to merged colour)
  'China Domestic (Solidarity)':        '#c0392b',
  'US Domestic (Solidarity)':           '#c0392b',
  'Violence Against Chinese Nationals': '#8e3a3a',
  'Xenophobia/Anti-American':           '#7f5a83',
};

export const CATEGORIES_ORDERED = [
  'Political Influence',
  'Project Grievance',
  'Domestic (Solidarity)',
  'Sovereignty & Territorial',
  'Military Forces Attacks',
  'Violence Against Nationals',
  'Diplomatic/Bilateral',
  'Economic Competition',
  'Xenophobia/Anti-Immigration',
  'Symbolic/Nationalist',
];

export function colorFor(category) {
  return CATEGORY_COLORS[category] || '#999';
}


// ── Secondary scheme: SINO ───────────────────────────────────────────────────
// SINO_breakdown, with Immigration/Xenophobia split out of Material-Local and the
// three INVALID classes named rather than blank (see sino_category in build_data.py).
// Greens/blues = sovereignty & power, purples = values, ambers = material,
// greys = the three "not substantively about China/the US" classes.
export const SINO_CATEGORY_COLORS = {
  'Sovereignty-Security':   '#1a5276',
  'Sovereignty-Identity':   '#2c5f8d',
  'Power-Political':        '#34495e',
  'Power-Proxy':            '#5d6d7e',
  'Value-Identity':         '#7f5a83',
  'Value-Ideology':         '#a569bd',
  'Material-Local':         '#d4a017',
  'Material-Nationalism':   '#e67e22',
  'Immigration/Xenophobia': '#5a8b3a',
  'Attacks on nationals':   '#8a8a8a',
  'Incidental':             '#b0b0b0',
  'Unclear':                '#9c8a73',
};

export const SINO_CATEGORIES_ORDERED = [
  'Sovereignty-Security',
  'Sovereignty-Identity',
  'Power-Political',
  'Power-Proxy',
  'Value-Identity',
  'Value-Ideology',
  'Material-Local',
  'Material-Nationalism',
  'Immigration/Xenophobia',
  'Attacks on nationals',
  'Incidental',
  'Unclear',
];

// Shown under each SINO category in the sidebar.
export const SINO_CATEGORY_HINTS = {
  'Attacks on nationals': 'Violence against Chinese/US nationals with no established political motive \u2014 robbery, kidnapping, banditry.',
  'Incidental': 'The China/US link is incidental \u2014 e.g. a protest that merely blocked the \u201cPan-American\u201d highway.',
  'Unclear':    'Motive could not be established \u2014 e.g. a national attacked in a conflict zone where sources cannot say whether nationality was the reason.',
};

export const SCHEMES = {
  thom: { key: 'thom', label: 'Thom', prop: 'category',
          ordered: CATEGORIES_ORDERED, colors: CATEGORY_COLORS, remap: true },
  sino: { key: 'sino', label: 'SINO', prop: 'sino_category',
          ordered: SINO_CATEGORIES_ORDERED, colors: SINO_CATEGORY_COLORS, remap: false },
};

export function schemeCategoryFor(p, schemeKey) {
  const sc = SCHEMES[schemeKey] || SCHEMES.thom;
  const raw = p[sc.prop];
  return sc.remap ? categoryFor(raw) : raw;
}

export function schemeColorFor(cat, schemeKey) {
  const sc = SCHEMES[schemeKey] || SCHEMES.thom;
  return sc.colors[cat] || '#999';
}

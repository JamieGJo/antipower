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

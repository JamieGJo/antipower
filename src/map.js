import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { CATEGORY_COLORS } from './categories.js';
import { openPopup } from './popup.js';
import { state, subscribe, filterFeatures } from './state.js';

let mapInstance = null;
let allFeatures = [];
let currentView = 'incidents';

const STYLE_URL = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
const SOURCE_ID = 'events';
const LAYER_CLUSTER = 'events-clusters';
const LAYER_COUNT = 'events-cluster-count';
const LAYER_POINT = 'events-points';
const SOURCE_COUNTRIES = 'country-agg';
const LAYER_COUNTRY_CIRCLES = 'country-circles';
const LAYER_COUNTRY_LABELS = 'country-labels';

function categoryColorExpression() {
  const expr = ['match', ['get', 'category']];
  for (const [cat, color] of Object.entries(CATEGORY_COLORS)) {
    expr.push(cat, color);
  }
  expr.push('#888');
  return expr;
}

// Geographic centroids [lon, lat] for countries likely to appear in the dataset.
// Falls back to average event position for unlisted countries.
const COUNTRY_CENTROIDS = {
  Afghanistan:[65.0,33.0],Albania:[20.0,41.0],Algeria:[3.0,28.0],Angola:[17.5,-11.5],
  Argentina:[-64.0,-34.0],Armenia:[45.0,40.1],Australia:[133.0,-27.0],Austria:[14.5,47.5],
  Azerbaijan:[47.5,40.5],Bangladesh:[90.0,24.0],Belarus:[28.0,53.0],Belgium:[4.5,50.8],
  Benin:[2.3,9.3],Bolivia:[-65.0,-17.0],'Bosnia and Herzegovina':[17.5,44.0],
  Botswana:[24.0,-22.0],Brazil:[-55.0,-10.0],Bulgaria:[25.5,42.8],'Burkina Faso':[-1.6,12.4],
  Burundi:[29.9,-3.3],Cambodia:[105.0,12.5],Cameroon:[12.5,6.0],Canada:[-95.0,60.0],
  'Central African Republic':[21.0,7.0],Chad:[19.0,15.0],Chile:[-71.0,-30.0],
  China:[105.0,35.0],Colombia:[-72.0,4.0],Congo:[15.8,-1.0],'Costa Rica':[-84.0,10.0],
  Croatia:[15.5,45.2],Cuba:[-80.0,22.0],Cyprus:[33.0,35.0],'Czech Republic':[15.5,49.8],
  'Democratic Republic of Congo':[24.0,-4.0],DRC:[24.0,-4.0],Denmark:[10.0,56.0],
  Djibouti:[42.6,11.8],'Dominican Republic':[-70.7,19.0],Ecuador:[-77.5,-2.0],
  Egypt:[30.0,27.0],'El Salvador':[-88.9,13.8],Eritrea:[39.0,15.0],Eswatini:[31.5,-26.5],
  Ethiopia:[40.0,9.0],Fiji:[178.0,-18.0],Finland:[26.0,64.0],France:[2.0,46.0],
  Gabon:[11.8,-1.0],Gambia:[-15.5,13.5],Georgia:[44.0,42.0],Germany:[10.0,51.0],
  Ghana:[-2.0,8.0],Greece:[22.0,39.0],Guatemala:[-90.3,15.5],Guinea:[-10.9,11.0],
  'Guinea-Bissau':[-15.0,12.0],Guyana:[-59.0,5.0],Haiti:[-72.3,19.0],
  Honduras:[-86.5,15.0],Hungary:[19.5,47.0],India:[78.0,22.0],Indonesia:[120.0,-5.0],
  Iran:[53.7,33.0],Iraq:[44.0,33.0],Ireland:[-8.0,53.2],Israel:[35.0,31.5],
  Italy:[12.5,42.5],'Ivory Coast':[-5.5,7.5],"Côte d'Ivoire":[-5.5,7.5],
  "Cote d'Ivoire":[-5.5,7.5],Jamaica:[-77.3,18.0],Japan:[138.0,36.0],
  Jordan:[36.5,31.0],Kazakhstan:[68.0,48.0],Kenya:[38.0,1.0],Kosovo:[20.9,42.6],
  Kuwait:[47.7,29.3],Kyrgyzstan:[74.7,41.2],Laos:[103.0,18.0],Latvia:[25.0,57.0],
  Lebanon:[35.9,33.8],Lesotho:[28.3,-29.5],Liberia:[-9.4,6.4],Libya:[17.0,27.0],
  Lithuania:[24.0,56.0],Luxembourg:[6.2,49.8],Madagascar:[47.0,-20.0],
  Malawi:[34.0,-13.5],Malaysia:[112.5,2.5],Maldives:[73.2,3.2],Mali:[-4.0,17.0],
  Malta:[14.4,35.9],Mauritania:[-12.0,20.0],Mauritius:[57.6,-20.3],Mexico:[-102.0,24.0],
  Moldova:[28.4,47.4],Mongolia:[105.0,46.0],Montenegro:[19.4,42.8],
  Morocco:[-5.0,32.0],Mozambique:[35.0,-18.0],Myanmar:[96.0,20.0],
  Namibia:[17.0,-22.0],Nepal:[84.0,28.0],Netherlands:[5.3,52.3],
  'New Zealand':[173.0,-42.0],Nicaragua:[-85.0,13.0],Niger:[8.1,17.6],
  Nigeria:[8.0,10.0],'North Korea':[127.0,40.0],'North Macedonia':[21.7,41.6],
  Norway:[14.0,65.0],Oman:[57.0,22.0],Pakistan:[70.0,30.0],Palestine:[35.2,31.9],
  Panama:[-80.0,9.0],'Papua New Guinea':[147.0,-6.3],Paraguay:[-58.0,-23.0],
  Peru:[-76.0,-10.0],Philippines:[122.0,13.0],Poland:[20.0,52.0],Portugal:[-8.0,39.5],
  Qatar:[51.2,25.3],Romania:[25.0,46.0],Russia:[100.0,60.0],Rwanda:[29.9,-2.0],
  'Saudi Arabia':[45.0,25.0],Senegal:[-14.4,14.5],Serbia:[21.0,44.0],
  Seychelles:[55.5,-4.7],'Sierra Leone':[-11.8,8.5],Singapore:[103.8,1.35],
  Slovakia:[19.5,48.7],Slovenia:[14.8,46.1],'Solomon Islands':[160.0,-9.0],
  Somalia:[46.0,6.0],'South Africa':[25.0,-29.0],'South Korea':[128.0,36.0],
  'South Sudan':[30.0,7.0],Spain:[-4.0,40.0],'Sri Lanka':[80.8,7.9],Sudan:[30.0,15.0],
  Sweden:[17.0,62.0],Switzerland:[8.3,47.0],Syria:[38.0,35.0],Taiwan:[121.0,23.5],
  Tajikistan:[71.0,39.0],Tanzania:[35.0,-6.0],Thailand:[101.0,15.0],
  'Timor-Leste':[125.7,-8.9],Togo:[1.2,8.6],Tunisia:[9.0,34.0],Turkey:[35.0,39.0],
  Turkmenistan:[60.0,40.0],UAE:[54.0,24.0],'United Arab Emirates':[54.0,24.0],
  Uganda:[32.0,1.4],Ukraine:[32.0,49.0],'United Kingdom':[-2.0,54.0],
  'United States':[-97.0,38.0],Uruguay:[-56.0,-33.0],Uzbekistan:[64.0,41.0],
  Vanuatu:[167.0,-16.0],Venezuela:[-66.0,8.0],Vietnam:[108.0,16.0],
  'Western Sahara':[-13.0,24.5],Yemen:[48.0,16.0],Zambia:[28.0,-14.0],Zimbabwe:[30.0,-20.0],
};

function buildCountryGeoJSON(features) {
  const agg = {};
  for (const f of features) {
    const c = f.properties.country;
    if (!c) continue;
    const [lon, lat] = f.geometry.coordinates;
    if (!agg[c]) agg[c] = { sumLat: 0, sumLon: 0, count: 0, cn: 0, us: 0 };
    agg[c].sumLat += lat;
    agg[c].sumLon += lon;
    agg[c].count++;
    if (f.properties.target === 'anti-china') agg[c].cn++;
    else agg[c].us++;
  }
  const entries = Object.entries(agg);
  const maxCount = entries.length ? Math.max(...entries.map(([, d]) => d.count)) : 1;
  return {
    type: 'FeatureCollection',
    features: entries.map(([country, d]) => {
      const centroid = COUNTRY_CENTROIDS[country] || [d.sumLon / d.count, d.sumLat / d.count];
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: centroid },
        properties: {
          country,
          count: d.count,
          cn: d.cn,
          us: d.us,
          r: Math.round(8 + 40 * Math.sqrt(d.count / maxCount)),
          pct_cn: d.count > 0 ? d.cn / d.count : 0.5,
        },
      };
    }),
  };
}

function showClusterListPopup(map, coordinates, leaves) {
  const rows = leaves.map((f, i) => {
    const p = f.properties;
    const color = CATEGORY_COLORS[p.category] || '#888';
    const label = p.target === 'anti-china' ? 'Anti-China' : 'Anti-US';
    return `
      <div class="cl-row">
        <span class="cl-dot" style="background:${color}"></span>
        <div class="cl-info">
          <span class="cl-date">${p.date || '—'}</span>
          <span class="cl-tag">${label}</span>
          <div class="cl-cat">${p.category || '—'}${p.subcategory ? ' · ' + p.subcategory : ''}</div>
          ${p.actor ? `<div class="cl-actor">${p.actor}</div>` : ''}
        </div>
        <button class="cl-open" data-idx="${i}">Details →</button>
      </div>`;
  }).join('');

  const html = `
    <div class="popup-tabs"><button class="popup-tab active">${leaves.length} events at this location</button></div>
    <div class="popup-body"><div class="cl-list">${rows}</div></div>`;

  const popup = new maplibregl.Popup({ maxWidth: '380px', offset: 12 })
    .setLngLat(coordinates)
    .setHTML(html)
    .addTo(map);

  popup.getElement().querySelectorAll('.cl-open').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.getAttribute('data-idx'));
      popup.remove();
      openPopup(map, leaves[idx]);
    });
  });
}

function setLayerVisibility(map, view) {
  const showEvents = view === 'incidents';
  const vis = (on) => (on ? 'visible' : 'none');
  map.setLayoutProperty(LAYER_CLUSTER, 'visibility', vis(showEvents));
  map.setLayoutProperty(LAYER_COUNT, 'visibility', vis(showEvents));
  map.setLayoutProperty(LAYER_POINT, 'visibility', vis(showEvents));
  map.setLayoutProperty(LAYER_COUNTRY_CIRCLES, 'visibility', vis(!showEvents));
  map.setLayoutProperty(LAYER_COUNTRY_LABELS, 'visibility', vis(!showEvents));
}

export async function initMap(features) {
  allFeatures = features;

  const map = new maplibregl.Map({
    container: 'map',
    style: STYLE_URL,
    center: [40, 25],
    zoom: 1.6,
    minZoom: 1,
    maxZoom: 16,
  });
  mapInstance = map;
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

  await new Promise((resolve) => map.once('load', resolve));

  // ── Event cluster source ──────────────────────────────────────────────────
  map.addSource(SOURCE_ID, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
    cluster: true,
    clusterRadius: 50,
    clusterMaxZoom: 18,
  });

  map.addLayer({
    id: LAYER_CLUSTER,
    type: 'circle',
    source: SOURCE_ID,
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': [
        'step', ['get', 'point_count'],
        '#c89bb6', 10,
        '#a35a87', 50,
        '#7e2358',
      ],
      'circle-radius': [
        'step', ['get', 'point_count'],
        14, 10,
        18, 50,
        24,
      ],
      'circle-opacity': 0.85,
      'circle-stroke-color': '#fff',
      'circle-stroke-width': 1.5,
    },
  });

  map.addLayer({
    id: LAYER_COUNT,
    type: 'symbol',
    source: SOURCE_ID,
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
      'text-size': 12,
    },
    paint: { 'text-color': '#fff' },
  });

  map.addLayer({
    id: LAYER_POINT,
    type: 'circle',
    source: SOURCE_ID,
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': categoryColorExpression(),
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        2, 3,
        6, 5,
        12, 8,
      ],
      'circle-stroke-color': '#fff',
      'circle-stroke-width': 1,
      'circle-opacity': 0.9,
    },
  });

  // ── Country aggregate source ──────────────────────────────────────────────
  map.addSource(SOURCE_COUNTRIES, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  });

  map.addLayer({
    id: LAYER_COUNTRY_CIRCLES,
    type: 'circle',
    source: SOURCE_COUNTRIES,
    layout: { visibility: 'none' },
    paint: {
      'circle-radius': ['get', 'r'],
      'circle-color': ['interpolate', ['linear'], ['get', 'pct_cn'],
        0,   '#1565C0',   // all anti-US → vivid royal blue
        0.5, '#7b2d60',   // equal split → purple
        1,   '#C41E3A',   // all anti-China → vivid crimson
      ],
      'circle-opacity': 0.72,
      'circle-stroke-color': '#fff',
      'circle-stroke-width': 1.5,
    },
  });

  map.addLayer({
    id: LAYER_COUNTRY_LABELS,
    type: 'symbol',
    source: SOURCE_COUNTRIES,
    layout: {
      visibility: 'none',
      'text-field': ['to-string', ['get', 'count']],
      'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
      'text-size': 11,
      'text-anchor': 'center',
      'text-allow-overlap': true,
    },
    paint: { 'text-color': '#fff' },
  });

  // ── Cursor hints ──────────────────────────────────────────────────────────
  for (const layer of [LAYER_POINT, LAYER_CLUSTER, LAYER_COUNTRY_CIRCLES]) {
    map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
  }

  // ── Click: zoom into cluster, or list events if they share exact coordinates ─
  map.on('click', LAYER_CLUSTER, async (e) => {
    const fts = map.queryRenderedFeatures(e.point, { layers: [LAYER_CLUSTER] });
    const feature = fts[0];
    const clusterId = feature.properties.cluster_id;
    const source = map.getSource(SOURCE_ID);
    const expansionZoom = await source.getClusterExpansionZoom(clusterId);

    if (expansionZoom > map.getMaxZoom()) {
      // Same-location events: no zoom level will separate them — show list instead.
      const leaves = await source.getClusterLeaves(clusterId, 50, 0);
      showClusterListPopup(map, feature.geometry.coordinates, leaves);
    } else {
      map.easeTo({ center: feature.geometry.coordinates, zoom: expansionZoom });
    }
  });

  // ── Click: open event popup ───────────────────────────────────────────────
  map.on('click', LAYER_POINT, (e) => {
    openPopup(map, e.features[0]);
  });

  // ── Click: open country summary popup ────────────────────────────────────
  map.on('click', LAYER_COUNTRY_CIRCLES, (e) => {
    const p = e.features[0].properties;
    const pct = p.count > 0 ? Math.round((p.cn / p.count) * 100) : 0;
    new maplibregl.Popup({ maxWidth: '260px', offset: 12 })
      .setLngLat(e.features[0].geometry.coordinates)
      .setHTML(`
        <div style="font-family:Georgia,serif;padding:12px 14px;">
          <strong style="font-size:14px;">${p.country}</strong>
          <div style="font-size:13px;margin:6px 0 4px;">${p.count} events</div>
          <div style="font-size:12px;color:#b5000f;">${p.cn} anti-China (${pct}%)</div>
          <div style="font-size:12px;color:#1a5276;">${p.us} anti-US (${100 - pct}%)</div>
        </div>`)
      .addTo(map);
  });

  // ── View toggle ───────────────────────────────────────────────────────────
  document.querySelectorAll('input[name="view"]').forEach((el) => {
    el.addEventListener('change', (e) => {
      currentView = e.target.value;
      setLayerVisibility(map, currentView);
      if (currentView === 'countries') {
        const filtered = filterFeatures(allFeatures);
        map.getSource(SOURCE_COUNTRIES).setData(buildCountryGeoJSON(filtered));
      }
    });
  });

  // ── Reactive filter updates ───────────────────────────────────────────────
  subscribe(() => {
    const filtered = filterFeatures(allFeatures);
    map.getSource(SOURCE_ID).setData({ type: 'FeatureCollection', features: filtered });
    if (currentView === 'countries') {
      map.getSource(SOURCE_COUNTRIES).setData(buildCountryGeoJSON(filtered));
    }
  });

  // Initial draw
  const filtered = filterFeatures(allFeatures);
  map.getSource(SOURCE_ID).setData({ type: 'FeatureCollection', features: filtered });

  return map;
}

export function getMap() { return mapInstance; }

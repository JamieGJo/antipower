import {
  Chart, BarController, BarElement, LineController, LineElement, PointElement,
  LinearScale, CategoryScale, DoughnutController, ArcElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { subscribe, filterFeatures, state } from './state.js';
import { schemeCategoryFor } from './categories.js';
import { CATEGORY_COLORS, categoryFor } from './categories.js';

Chart.register(
  BarController, BarElement, LineController, LineElement, PointElement,
  LinearScale, CategoryScale, DoughnutController, ArcElement, Tooltip, Legend, Filler
);

const CHART_COLORS = {
  cn: '#b5000f',
  us: '#1a5276',
  cnFill: 'rgba(181,0,15,0.15)',
  usFill: 'rgba(26,82,118,0.15)',
};

// Country → broad region lookup
const COUNTRY_REGION = {
  Angola:'Africa',Benin:'Africa','Burkina Faso':'Africa',Burundi:'Africa',Cameroon:'Africa',
  'Cape Verde':'Africa','Cabo Verde':'Africa','Central African Republic':'Africa',Chad:'Africa',
  Comoros:'Africa',Congo:'Africa',"Côte d'Ivoire":'Africa',"Cote d'Ivoire":'Africa',
  'Ivory Coast':'Africa','Democratic Republic of Congo':'Africa',DRC:'Africa',
  Djibouti:'Africa','Equatorial Guinea':'Africa',Eritrea:'Africa',Eswatini:'Africa',
  Ethiopia:'Africa',Gabon:'Africa',Gambia:'Africa',Ghana:'Africa',Guinea:'Africa',
  'Guinea-Bissau':'Africa',Kenya:'Africa',Lesotho:'Africa',Liberia:'Africa',
  Madagascar:'Africa',Malawi:'Africa',Mali:'Africa',Mauritania:'Africa',Mauritius:'Africa',
  Mozambique:'Africa',Namibia:'Africa',Niger:'Africa',Nigeria:'Africa',Rwanda:'Africa',
  'Sao Tome and Principe':'Africa',Senegal:'Africa',Seychelles:'Africa',
  'Sierra Leone':'Africa',Somalia:'Africa','South Africa':'Africa','South Sudan':'Africa',
  Sudan:'Africa',Tanzania:'Africa',Togo:'Africa',Uganda:'Africa',Zambia:'Africa',Zimbabwe:'Africa',
  Algeria:'N. Africa & M. East',Egypt:'N. Africa & M. East',Libya:'N. Africa & M. East',
  Morocco:'N. Africa & M. East',Tunisia:'N. Africa & M. East','Western Sahara':'N. Africa & M. East',
  Bahrain:'N. Africa & M. East',Iran:'N. Africa & M. East',Iraq:'N. Africa & M. East',
  Israel:'N. Africa & M. East',Jordan:'N. Africa & M. East',Kuwait:'N. Africa & M. East',
  Lebanon:'N. Africa & M. East',Oman:'N. Africa & M. East',Palestine:'N. Africa & M. East',
  Qatar:'N. Africa & M. East','Saudi Arabia':'N. Africa & M. East',Syria:'N. Africa & M. East',
  Turkey:'N. Africa & M. East',UAE:'N. Africa & M. East','United Arab Emirates':'N. Africa & M. East',
  Yemen:'N. Africa & M. East',
  Albania:'Europe',Armenia:'Europe',Austria:'Europe',Azerbaijan:'Europe',Belarus:'Europe',
  Belgium:'Europe','Bosnia and Herzegovina':'Europe',Bulgaria:'Europe',Croatia:'Europe',
  Cyprus:'Europe','Czech Republic':'Europe',Denmark:'Europe',Estonia:'Europe',Finland:'Europe',
  France:'Europe',Georgia:'Europe',Germany:'Europe',Greece:'Europe',Hungary:'Europe',
  Iceland:'Europe',Ireland:'Europe',Italy:'Europe',Kosovo:'Europe',Latvia:'Europe',
  Lithuania:'Europe',Luxembourg:'Europe',Malta:'Europe',Moldova:'Europe',Montenegro:'Europe',
  Netherlands:'Europe','North Macedonia':'Europe',Norway:'Europe',Poland:'Europe',
  Portugal:'Europe',Romania:'Europe',Russia:'Europe',Serbia:'Europe',Slovakia:'Europe',
  Slovenia:'Europe',Spain:'Europe',Sweden:'Europe',Switzerland:'Europe',Ukraine:'Europe',
  'United Kingdom':'Europe',
  Argentina:'Americas',Barbados:'Americas',Belize:'Americas',Bolivia:'Americas',
  Brazil:'Americas',Canada:'Americas',Chile:'Americas',Colombia:'Americas',
  'Costa Rica':'Americas',Cuba:'Americas','Dominican Republic':'Americas',
  Ecuador:'Americas','El Salvador':'Americas',Guatemala:'Americas',Guyana:'Americas',
  Haiti:'Americas',Honduras:'Americas',Jamaica:'Americas',Mexico:'Americas',
  Nicaragua:'Americas',Panama:'Americas',Paraguay:'Americas',Peru:'Americas',
  'Trinidad and Tobago':'Americas','United States':'Americas',Uruguay:'Americas',Venezuela:'Americas',
  Afghanistan:'Asia-Pacific',Australia:'Asia-Pacific',Bangladesh:'Asia-Pacific',
  Bhutan:'Asia-Pacific',Brunei:'Asia-Pacific',Cambodia:'Asia-Pacific',China:'Asia-Pacific',
  Fiji:'Asia-Pacific',India:'Asia-Pacific',Indonesia:'Asia-Pacific',Japan:'Asia-Pacific',
  Kiribati:'Asia-Pacific',Laos:'Asia-Pacific',Malaysia:'Asia-Pacific',Maldives:'Asia-Pacific',
  'Marshall Islands':'Asia-Pacific',Micronesia:'Asia-Pacific',Mongolia:'Asia-Pacific',
  Myanmar:'Asia-Pacific',Nauru:'Asia-Pacific',Nepal:'Asia-Pacific','New Zealand':'Asia-Pacific',
  'North Korea':'Asia-Pacific',Palau:'Asia-Pacific','Papua New Guinea':'Asia-Pacific',
  Pakistan:'Asia-Pacific',Philippines:'Asia-Pacific',Samoa:'Asia-Pacific',Singapore:'Asia-Pacific',
  'Solomon Islands':'Asia-Pacific','South Korea':'Asia-Pacific','Sri Lanka':'Asia-Pacific',
  Taiwan:'Asia-Pacific',Thailand:'Asia-Pacific','Timor-Leste':'Asia-Pacific',Tonga:'Asia-Pacific',
  Tuvalu:'Asia-Pacific',Vanuatu:'Asia-Pacific',Vietnam:'Asia-Pacific',
  Kazakhstan:'Central Asia',Kyrgyzstan:'Central Asia',Tajikistan:'Central Asia',
  Turkmenistan:'Central Asia',Uzbekistan:'Central Asia',
};

const REGION_ORDER = ['Asia-Pacific','Americas','Africa','Europe','N. Africa & M. East','Central Asia','Other'];

let chartMonthly = null;
let chartTimeRecent = null;
let chartCountry = null;
let chartResponse = null;
let chartCategory = null;
let chartRegion = null;
let allFeatures = [];

const baseFontFamily = 'Georgia, "Noto Serif SC", serif';
Chart.defaults.font.family = baseFontFamily;
Chart.defaults.font.size = 11;
Chart.defaults.color = '#333';

// Filter respecting dataset/category/response state but ignoring year slider, pinned to 2017+
function filterRecent(features) {
  const { dataset, enabledCategories, showResponseOnly, showFatalitiesOnly, searchTerms, hideFlagged } = state;
  return features.filter((f) => {
    const p = f.properties;
    if (p.year == null || p.year < 2017) return false;
    if (dataset !== 'both' && p.target !== dataset) return false;
    if (!enabledCategories.has(schemeCategoryFor(p, state.scheme))) return false;
    if (hideFlagged && p.validity && p.validity !== 'VALID') return false;
    if (showResponseOnly && !p.cn_resp && !p.us_resp && !p.mfa && !p.media) return false;
    if (showFatalitiesOnly && !(p.fatalities > 0)) return false;
    if (searchTerms.length) {
      const haystack = [p.notes, p.actor, p.country, p.category].filter(Boolean).join(' ').toLowerCase();
      if (!searchTerms.some((t) => haystack.includes(t))) return false;
    }
    return true;
  });
}

function eventsPerYear(features) {
  const cn = {};
  const us = {};
  for (const f of features) {
    const y = f.properties.year;
    if (!y) continue;
    if (f.properties.target === 'anti-china') cn[y] = (cn[y] || 0) + 1;
    else if (f.properties.target === 'anti-us') us[y] = (us[y] || 0) + 1;
  }
  const allYears = Array.from(new Set([...Object.keys(cn), ...Object.keys(us)]))
    .map(Number).sort((a, b) => a - b);
  return {
    labels: allYears,
    cn: allYears.map((y) => cn[y] || 0),
    us: allYears.map((y) => us[y] || 0),
  };
}

function eventsPerMonth(features, fromYear = 2017) {
  const cn = {};
  const us = {};
  for (const f of features) {
    const d = f.properties.date;
    const y = f.properties.year;
    if (!d || !y || y < fromYear) continue;
    const key = d.slice(0, 7); // YYYY-MM
    if (f.properties.target === 'anti-china') cn[key] = (cn[key] || 0) + 1;
    else if (f.properties.target === 'anti-us') us[key] = (us[key] || 0) + 1;
  }
  // Build contiguous month labels from fromYear-01 to latest month found
  const allKeys = new Set([...Object.keys(cn), ...Object.keys(us)]);
  if (allKeys.size === 0) return { labels: [], cn: [], us: [] };
  const maxKey = [...allKeys].sort().at(-1);
  const labels = [];
  let [y, m] = [fromYear, 1];
  const [maxY, maxM] = maxKey.split('-').map(Number);
  while (y < maxY || (y === maxY && m <= maxM)) {
    labels.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return {
    labels,
    cn: labels.map((k) => cn[k] || 0),
    us: labels.map((k) => us[k] || 0),
  };
}

function topCountries(features, n = 15) {
  const counts = {};
  for (const f of features) {
    const c = f.properties.country;
    if (!c) continue;
    counts[c] = (counts[c] || 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, n);
  return {
    labels: sorted.map(([c]) => c),
    values: sorted.map(([, v]) => v),
  };
}

function responseCoverage(features) {
  // "none" splits into events where a response was actively searched for and
  // not found, vs events never searched at all (most of the corpus - search
  // coverage is a small, uneven subset; see build_data.py `searched`). Lumping
  // the two together overstated the "no response" rate.
  let any = 0;
  let searchedNone = 0;
  let unsearched = 0;
  for (const f of features) {
    const p = f.properties;
    if (p.cn_resp || p.us_resp || p.mfa || p.media) any++;
    else if (p.searched) searchedNone++;
    else unsearched++;
  }
  return { any, searchedNone, unsearched };
}

function byCategory(features) {
  const counts = {};
  for (const f of features) {
    const c = categoryFor(f.properties.category);
    if (!c) continue;
    counts[c] = (counts[c] || 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return {
    labels: sorted.map(([c]) => c),
    values: sorted.map(([, v]) => v),
    colors: sorted.map(([c]) => CATEGORY_COLORS[c] || '#888'),
  };
}

function byRegion(features) {
  const counts = {};
  for (const f of features) {
    const country = f.properties.country;
    const r = (country && COUNTRY_REGION[country]) || 'Other';
    counts[r] = (counts[r] || 0) + 1;
  }
  const ordered = REGION_ORDER
    .filter((r) => counts[r])
    .map((r) => [r, counts[r]]);
  return {
    labels: ordered.map(([r]) => r),
    values: ordered.map(([, v]) => v),
  };
}

export function initCharts(features) {
  allFeatures = features;
  initMonthlyChart();
  initTimeRecentChart();
  initCountryChart();
  initResponseChart();
  initCategoryChart();
  initRegionChart();
  updateCharts();
  subscribe(updateCharts);
}

function initMonthlyChart() {
  const ctx = document.getElementById('chart-monthly');
  chartMonthly = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        { label: 'Anti-China', data: [], borderColor: CHART_COLORS.cn, backgroundColor: CHART_COLORS.cnFill, fill: true, tension: 0.4, pointRadius: 0, borderWidth: 1.5 },
        { label: 'Anti-US',    data: [], borderColor: CHART_COLORS.us, backgroundColor: CHART_COLORS.usFill, fill: true, tension: 0.4, pointRadius: 0, borderWidth: 1.5 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 10, padding: 8 } },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            title: (items) => {
              const [y, m] = items[0].label.split('-');
              return new Date(+y, +m - 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 10,
            callback(val, i) {
              const label = this.getLabelForValue(val);
              return label.endsWith('-01') ? label.slice(0, 4) : '';
            },
          },
          grid: { display: false },
        },
        y: { beginAtZero: true, ticks: { precision: 0 } },
      },
    },
  });
}

function initTimeRecentChart() {
  const ctx = document.getElementById('chart-time-recent');
  chartTimeRecent = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: [],
      datasets: [
        { label: 'Anti-China', data: [], backgroundColor: CHART_COLORS.cn },
        { label: 'Anti-US',    data: [], backgroundColor: CHART_COLORS.us },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 10, padding: 8 } },
        tooltip: { mode: 'index', intersect: false },
      },
      scales: {
        x: { stacked: true, ticks: { maxRotation: 0 }, grid: { display: false } },
        y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } },
      },
    },
  });
}

function initCountryChart() {
  const ctx = document.getElementById('chart-country');
  chartCountry = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: [],
      datasets: [{ data: [], backgroundColor: '#34495e' }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, ticks: { precision: 0 } },
        y: { grid: { display: false } },
      },
    },
  });
}

function initResponseChart() {
  const ctx = document.getElementById('chart-response');
  chartResponse = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Response identified', 'Searched, none found', 'Not searched'],
      datasets: [{ data: [0, 0, 0], backgroundColor: ['#b5000f', '#8c8a80', '#d8d6cf'] }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, padding: 8 } } },
    },
  });
}

function initCategoryChart() {
  const ctx = document.getElementById('chart-category');
  chartCategory = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: [],
      datasets: [{ data: [], backgroundColor: [] }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, ticks: { precision: 0 } },
        y: { grid: { display: false }, ticks: { font: { size: 10 } } },
      },
    },
  });
}

function initRegionChart() {
  const ctx = document.getElementById('chart-region');
  chartRegion = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: [],
      datasets: [{ data: [], backgroundColor: '#34495e' }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, ticks: { precision: 0 } },
        y: { grid: { display: false } },
      },
    },
  });
}

function updateCharts() {
  const filtered = filterFeatures(allFeatures);
  const recent = filterRecent(allFeatures);

  const t = eventsPerMonth(recent);
  chartMonthly.data.labels = t.labels;
  chartMonthly.data.datasets[0].data = t.cn;
  chartMonthly.data.datasets[1].data = t.us;
  chartMonthly.update();

  const tr = eventsPerYear(recent);
  chartTimeRecent.data.labels = tr.labels;
  chartTimeRecent.data.datasets[0].data = tr.cn;
  chartTimeRecent.data.datasets[1].data = tr.us;
  chartTimeRecent.update();

  const c = topCountries(filtered);
  chartCountry.data.labels = c.labels;
  chartCountry.data.datasets[0].data = c.values;
  chartCountry.update();

  const r = responseCoverage(filtered);
  chartResponse.data.datasets[0].data = [r.any, r.searchedNone, r.unsearched];
  chartResponse.update();

  const cat = byCategory(filtered);
  chartCategory.data.labels = cat.labels;
  chartCategory.data.datasets[0].data = cat.values;
  chartCategory.data.datasets[0].backgroundColor = cat.colors;
  chartCategory.update();

  const reg = byRegion(filtered);
  chartRegion.data.labels = reg.labels;
  chartRegion.data.datasets[0].data = reg.values;
  chartRegion.update();
}

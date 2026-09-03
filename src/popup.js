import maplibregl from 'maplibre-gl';
import { colorFor, categoryFor, schemeCategoryFor, schemeColorFor } from './categories.js';
import { state } from './state.js';
import { zhFor } from './i18n.js';

let responsesCache = null;
let mfaCache = null;
let mediaCache = null;

async function loadResponses() {
  if (responsesCache) return responsesCache;
  const r = await fetch(import.meta.env.BASE_URL + 'data/responses_full.json');
  responsesCache = await r.json();
  return responsesCache;
}
async function loadMfa() {
  if (mfaCache) return mfaCache;
  const r = await fetch(import.meta.env.BASE_URL + 'data/mfa_quotes.json');
  mfaCache = await r.json();
  return mfaCache;
}
async function loadMedia() {
  if (mediaCache) return mediaCache;
  const r = await fetch(import.meta.env.BASE_URL + 'data/media_quotes.json');
  mediaCache = await r.json();
  return mediaCache;
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function actionChips(actions, prefix) {
  if (!actions) return '';
  const labels = {
    diplomatic: 'Diplomatic',
    economic: 'Economic',
    legal: 'Legal',
    evacuation: 'Evacuation',
    security_deployment: 'Security',
    travel_warning: 'Travel warning',
    compensation_sought: 'Compensation sought',
    compensation_received: 'Compensation received',
  };
  const active = Object.entries(actions)
    .filter(([, v]) => v === 1)
    .map(([k]) => labels[k] || k);
  if (!active.length) return '';
  return `<div class="actions">${active.map((a) => `<span class="action-chip">${escapeHtml(a)}</span>`).join('')}</div>`;
}

const FLAG_NOTE = {
  'INVALID-INCIDENTAL': 'Flagged: the link to China/the US looks incidental (e.g. a protest that merely blocked the \u201cPan-American\u201d highway, or was held at a venue with \u201cAmerican\u201d in its name).',
  'INVALID-CRIMINAL': 'Flagged: an attack on a national with no established political motive (robbery, kidnapping, banditry) rather than anti-power activity.',
  'INVALID-UNCLEAR': 'Flagged: the relationship to the target power could not be established.',
};

function renderEventTab(p, fullRec) {
  const displayCat = schemeCategoryFor(p, state.scheme);
  const flagNote = FLAG_NOTE[p.validity];
  const zh = p.target === 'anti-china' ? zhFor(displayCat) : null;
  const zhSpan = zh ? `<span class="zh">${escapeHtml(zh)}</span>` : '';
  const color = schemeColorFor(displayCat, state.scheme);
  return `
    <h3>${escapeHtml(p.country)} <small style="color:#888;font-weight:normal;">· ${escapeHtml(p.date || '')}</small></h3>
    <div class="meta">${escapeHtml(p.target === 'anti-china' ? 'Anti-China' : 'Anti-US')} ·
      ${p.fatalities > 0 ? `<span class="fatalities-badge">&#9888; ${p.fatalities} ${p.fatalities === 1 ? 'fatality' : 'fatalities'}</span>` : ''}
      ${escapeHtml(p.actor || '')}
    </div>
    <span class="category-tag" style="background:${color};">${escapeHtml(displayCat)}</span>${zhSpan}
    <div class="meta" style="margin-top:6px;">${escapeHtml(p.subcategory || '')}</div>
    ${p.source ? `<div class="meta source-tag">Source: <strong>${escapeHtml(p.source)}</strong></div>` : ''}
    ${flagNote ? `<div class="flag-note">${escapeHtml(flagNote)}</div>` : ''}
    <div class="notes">${escapeHtml(fullRec?.notes || '')}</div>
  `;
}

function renderChinaTab(rec) {
  if (!rec || !rec.china) return '<p class="empty">No China response identified for this event.</p>';
  const c = rec.china;
  const linkBlock = c.url ? `<a class="small-link" href="${escapeHtml(c.url)}" target="_blank" rel="noopener">View source →</a>` : '';
  return `
    <div class="meta">
      ${c.date ? escapeHtml(c.date) + ' · ' : ''}
      ${c.source ? escapeHtml(c.source) : 'Unknown source'}
      ${c.priority ? ' · ' + escapeHtml(c.priority) : ''}
    </div>
    ${c.excerpt ? `<div class="excerpt">${escapeHtml(c.excerpt)}</div>` : ''}
    ${actionChips(c.actions, 'cn')}
    ${c.host_response ? `<p style="margin-top:8px;"><em>Host country response:</em> ${escapeHtml(c.host_response)}</p>` : ''}
    ${linkBlock}
  `;
}

function renderUSTab(rec) {
  if (!rec || !rec.us) return '<p class="empty">No US response identified for this event.</p>';
  const u = rec.us;
  const linkBlock = u.url ? `<a class="small-link" href="${escapeHtml(u.url)}" target="_blank" rel="noopener">View source →</a>` : '';
  return `
    <div class="meta">
      ${u.date ? escapeHtml(u.date) + ' · ' : ''}
      ${u.source ? escapeHtml(u.source) : 'Unknown source'}
      ${u.dod_found ? ' · DoD response' : ''}
    </div>
    ${u.excerpt ? `<div class="excerpt us-excerpt">${escapeHtml(u.excerpt)}</div>` : ''}
    ${actionChips(u.actions, 'us')}
    ${linkBlock}
  `;
}

function renderMfaMediaTab(mfa, media) {
  let html = '';
  if (mfa) {
    html += `<h4 style="margin:0 0 4px;font-size:13px;">MFA briefing</h4>
      <div class="meta">${escapeHtml(mfa.date || '')} ${mfa.spokesperson ? '· ' + escapeHtml(mfa.spokesperson) : ''} ${mfa.match_type ? '· ' + escapeHtml(mfa.match_type) : ''}</div>`;
    if (mfa.question) html += `<div class="excerpt mfa-excerpt"><strong>Q.</strong> ${escapeHtml(mfa.question)}</div>`;
    if (mfa.answer) html += `<div class="excerpt mfa-excerpt"><strong>A.</strong> ${escapeHtml(mfa.answer)}</div>`;
    if (mfa.link) html += `<a class="small-link" href="${escapeHtml(mfa.link)}" target="_blank" rel="noopener">Original transcript →</a>`;
  }
  if (media) {
    if (mfa) html += '<hr style="margin:12px 0;border:none;border-top:1px solid #e2dfd4;" />';
    html += `<h4 style="margin:0 0 4px;font-size:13px;">State media coverage</h4>
      <div class="meta">${escapeHtml(media.date || '')} ${media.source ? '· ' + escapeHtml(media.source) : ''} ${media.country ? '· ' + escapeHtml(media.country) : ''}</div>`;
    if (media.title) html += `<div class="excerpt media-excerpt">${escapeHtml(media.title)}</div>`;
    if (media.issue) html += `<div class="meta">Issue: ${escapeHtml(media.issue)}</div>`;
  }
  if (!html) html = '<p class="empty">No MFA or state-media coverage matched.</p>';
  return html;
}

export async function openPopup(map, feature) {
  const p = feature.properties;
  const eid = p.id;

  // Load all three caches in parallel.
  const [responses, mfaAll, mediaAll] = await Promise.all([loadResponses(), loadMfa(), loadMedia()]);
  const fullRec = responses[eid] || {};
  const mfaRec = mfaAll[eid];
  const mediaRec = mediaAll[eid];

  const tabs = [
    { id: 'event', label: 'Event', icon: '', body: renderEventTab(p, fullRec) },
    { id: 'cn', label: 'China', icon: p.cn_resp ? 'tab-cn' : '', body: renderChinaTab(fullRec) },
    { id: 'us', label: 'US', icon: p.us_resp ? 'tab-us' : '', body: renderUSTab(fullRec) },
    {
      id: 'mfa',
      label: 'MFA / Media',
      icon: p.mfa ? 'tab-mfa' : (p.media ? 'tab-media' : ''),
      body: renderMfaMediaTab(mfaRec, mediaRec),
    },
  ];

  const tabsHtml = tabs.map((t, i) =>
    `<button class="popup-tab ${i === 0 ? 'active' : ''}" data-tab="${t.id}">${t.icon ? `<span class="tab-icon ${t.icon}"></span>` : ''}${t.label}</button>`
  ).join('');
  const bodiesHtml = tabs.map((t, i) =>
    `<div class="popup-pane" data-pane="${t.id}" style="${i === 0 ? '' : 'display:none;'}">${t.body}</div>`
  ).join('');

  const html = `<div class="popup-tabs">${tabsHtml}</div><div class="popup-body">${bodiesHtml}</div>`;

  const popup = new maplibregl.Popup({ maxWidth: '380px', offset: 12 })
    .setLngLat(feature.geometry.coordinates)
    .setHTML(html)
    .addTo(map);

  // Wire tab switching after popup mounts.
  const root = popup.getElement();
  if (root) {
    root.querySelectorAll('.popup-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        root.querySelectorAll('.popup-tab').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const which = btn.getAttribute('data-tab');
        root.querySelectorAll('.popup-pane').forEach((pane) => {
          pane.style.display = pane.getAttribute('data-pane') === which ? 'block' : 'none';
        });
      });
    });
  }
}

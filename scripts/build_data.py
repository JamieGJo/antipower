"""Build static JSON data files for the THOM activity website.

Reads from upstream xlsx, joins, writes to ../public/data/.
Run: python3 scripts/build_data.py (from website/ directory)
"""
import json
from pathlib import Path
import pandas as pd

HERE = Path(__file__).resolve().parent
WEBSITE = HERE.parent

def _find_activity_root(start):
    p = start
    while p != p.parent:
        if p.name == 'activity data':
            return p
        p = p.parent
    return start.parent

ACTIVITY = _find_activity_root(WEBSITE)
PUBLIC_DATA = WEBSITE / 'public' / 'data'
PUBLIC_DATA.mkdir(parents=True, exist_ok=True)

THOM_PATH = ACTIVITY / 'ACLED combined' / 'ACLED' / 'data' / 'clean' / 'Master_all_with_coding_MERGED.xlsx'
SINO_PATH = ACTIVITY / 'China response' / 'response to attacks' / 'china_usactivity_SINO_with_responses_v13e.xlsx'
MFA_PATH = ACTIVITY / 'China response' / 'response to attacks' / '2026-04-09_MFA-china-threats.xlsx'
MEDIA_PATH = ACTIVITY / 'China response' / 'response to attacks' / '2025_xinhua_GT_PD response attacks.xlsx'


def flag(v):
    """Coerce many representations of true/yes/1 to 1, else 0."""
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return 0
    if isinstance(v, bool):
        return int(v)
    if isinstance(v, (int, float)):
        return 1 if v >= 1 else 0
    s = str(v).strip().lower()
    return 1 if s in ('yes', 'true', '1', 'y') else 0


def s(v):
    """Cell -> str or None."""
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    return str(v).strip() or None


def date_str(v):
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    try:
        return pd.to_datetime(v).strftime('%Y-%m-%d')
    except Exception:
        return None


# ---------- Load events ----------
thom = pd.read_excel(THOM_PATH, sheet_name='Sheet1')
print(f'Master raw: {len(thom)} rows')
# Events the master flags as not substantively about China/the US are KEPT but
# tagged, so the map can surface/filter them rather than silently dropping them:
#   INVALID-INCIDENTAL - connection is incidental (e.g. a protest that merely blocked
#                        the "Pan-American"/"Inter-American" highway, or was held at a
#                        venue with "American" in its name) - sourcing-stage keyword
#                        false positives
#   INVALID-CRIMINAL   - ordinary crime, not political anti-power activity
#   INVALID-UNCLEAR    - relationship to the target power could not be established
print('  SINO_validity: ' + ', '.join(
    f'{k}={v}' for k, v in thom['SINO_validity'].value_counts(dropna=False).items()))
thom = thom[
    thom['target_country'].isin(['China', 'USA']) &
    thom['latitude'].notna() &
    thom['longitude'].notna()
].copy()
thom['target_dataset'] = thom['target_country'].map(
    {'China': 'anti-china', 'USA': 'anti-us'}
)
print(f'  valid + has lat/lon: {len(thom)} rows')


# ---------- Load SINO master (response columns) ----------
sino = pd.read_excel(SINO_PATH, sheet_name='Sheet1')
print(f'SINO v13e: {len(sino)} rows')

response_cols = [
    'event_id',
    'china_response_found', 'china_response_source_type', 'china_response_date',
    'china_response_url', 'china_response_excerpt', 'china_protest_priority',
    'cn_act_diplomatic', 'cn_act_economic', 'cn_act_legal', 'cn_act_evacuation',
    'cn_act_security_deployment', 'cn_act_travel_warning',
    'cn_act_compensation_sought', 'cn_act_compensation_received', 'cn_act_other',
    'cn_act_url', 'cn_act_date',
    'host_response',
    'us_response_found', 'us_response_source_type', 'us_response_date',
    'us_response_url', 'us_response_excerpt',
    'us_dod_response_found', 'us_dod_source',
    'us_act_diplomatic', 'us_act_economic', 'us_act_legal', 'us_act_evacuation',
    'us_act_security_deployment', 'us_act_travel_warning',
    'us_act_compensation_sought', 'us_act_compensation_received', 'us_act_other',
    'us_act_url', 'us_act_date',
    'mfa_threat_id', 'mfa_threat_link', 'mfa_threat_date',
    'mfa_threat_spokesperson', 'mfa_threat_question', 'mfa_match_type',
    'media_match_source', 'media_match_date', 'media_match_title',
    'media_match_country', 'media_match_issue',
]
sino_keep = [c for c in response_cols if c in sino.columns]
sino_subset = sino[sino_keep].copy()
print(f'  kept response columns: {len(sino_keep)}')

merged = thom.merge(sino_subset, on='event_id', how='left')
print(f'Merged: {len(merged)} rows')


# ---------- Load MFA Q&A ----------
mfa = pd.read_excel(MFA_PATH, sheet_name=0)
print(f'MFA: {len(mfa)} rows, cols: {list(mfa.columns)[:10]}...')

# Build lookup by id (or by row index if no id)
mfa_id_col = None
for cand in ('id', 'mfa_id', 'threat_id'):
    if cand in mfa.columns:
        mfa_id_col = cand
        break
if mfa_id_col:
    mfa_lookup = {row[mfa_id_col]: row for _, row in mfa.iterrows()
                  if pd.notna(row.get(mfa_id_col))}
    print(f'  MFA lookup keyed by "{mfa_id_col}": {len(mfa_lookup)} entries')
else:
    mfa_lookup = {}
    print('  WARNING: no id column found in MFA file')


# ---------- Compute response flags ----------
merged['has_china_response'] = (
    merged['china_response_found'].apply(flag) if 'china_response_found' in merged.columns else 0
)
merged['has_us_response'] = (
    merged['us_response_found'].apply(flag) if 'us_response_found' in merged.columns else 0
)
merged['has_mfa'] = merged['mfa_threat_id'].notna().astype(int) if 'mfa_threat_id' in merged.columns else 0
merged['has_media'] = merged['media_match_source'].notna().astype(int) if 'media_match_source' in merged.columns else 0

print(f'Flags: china={int(merged["has_china_response"].sum())} '
      f'us={int(merged["has_us_response"].sum())} '
      f'mfa={int(merged["has_mfa"].sum())} '
      f'media={int(merged["has_media"].sum())}')


def sino_category(r):
    """Secondary categorisation: SINO_breakdown, with three refinements.

    1. Immigration/Xenophobia is split out of Material-Local (in the source it is
       folded in, but it reads as its own thing on a map).
    2. The three INVALID classes become named categories rather than blanks - the
       SINO_breakdown blanks are exactly the invalid set, so this closes the gap:
         Attacks on nationals - violence against Chinese/US nationals with no
                      established political motive (96% of this bucket is coded
                      "Violence Against Nationals"); absorbs the former Criminal class
         Incidental - the China/US link is incidental (keyword false positives)
         Unclear    - motive could not be established (e.g. a Chinese national
                      attacked in a conflict zone where sources cannot say whether
                      nationality was the reason)
    """
    bd = s(r.get('SINO_breakdown'))
    if bd:
        if bd == 'Material-Local' and s(r.get('SINO_issue1')) == 'Immigration/Xenophobia':
            return 'Immigration/Xenophobia'
        return bd
    return {
        'INVALID-CRIMINAL': 'Attacks on nationals',
        'INVALID-INCIDENTAL': 'Incidental',
        'INVALID-UNCLEAR': 'Unclear',
    }.get(s(r.get('SINO_validity')), 'Uncategorised')


# ---------- Write events.geojson (lean) ----------
features = []
for _, r in merged.iterrows():
    year = None
    try:
        year = int(pd.to_datetime(r['event_date']).year)
    except Exception:
        pass
    fat = 0
    try:
        fat = int(r['fatalities']) if pd.notna(r['fatalities']) else 0
    except Exception:
        pass
    features.append({
        'type': 'Feature',
        'geometry': {
            'type': 'Point',
            'coordinates': [float(r['longitude']), float(r['latitude'])],
        },
        'properties': {
            'id': r['event_id'],
            'date': date_str(r['event_date']),
            'year': year,
            'country': s(r['country']),
            'category': s(r['Thom_issue1']),
            'validity': s(r.get('SINO_validity')) or 'UNCODED',
            'sino_category': sino_category(r),
            'sino_issue': s(r.get('SINO_issue1')),
            'sino_breakdown': s(r.get('SINO_breakdown')),
            'sino_code': s(r.get('SINO_code1')),
            'subcategory': s(r['Thom_ subissue1']),
            'actor': s(r['actor1']),
            'fatalities': fat,
            'target': r['target_dataset'],
            'source': s(r.get('source')),
            'notes': s(r.get('notes')),
            'cn_resp': int(r['has_china_response']),
            'us_resp': int(r['has_us_response']),
            'mfa': int(r['has_mfa']),
            'media': int(r['has_media']),
        },
    })

with open(PUBLIC_DATA / 'events.geojson', 'w') as f:
    json.dump({'type': 'FeatureCollection', 'features': features},
              f, ensure_ascii=False, separators=(',', ':'))
print(f'Wrote events.geojson ({len(features)} features)')


# ---------- Write responses_full.json (heavy fields, keyed by event_id) ----------
responses_full = {}
for _, r in merged.iterrows():
    eid = r['event_id']
    rec = {'notes': s(r.get('notes'))}
    if r['has_china_response']:
        rec['china'] = {
            'date': date_str(r.get('china_response_date')),
            'source': s(r.get('china_response_source_type')),
            'excerpt': s(r.get('china_response_excerpt')),
            'url': s(r.get('china_response_url')),
            'priority': s(r.get('china_protest_priority')),
            'actions': {
                'diplomatic': flag(r.get('cn_act_diplomatic')),
                'economic': flag(r.get('cn_act_economic')),
                'legal': flag(r.get('cn_act_legal')),
                'evacuation': flag(r.get('cn_act_evacuation')),
                'security_deployment': flag(r.get('cn_act_security_deployment')),
                'travel_warning': flag(r.get('cn_act_travel_warning')),
                'compensation_sought': flag(r.get('cn_act_compensation_sought')),
                'compensation_received': flag(r.get('cn_act_compensation_received')),
            },
            'act_url': s(r.get('cn_act_url')),
            'act_date': date_str(r.get('cn_act_date')),
            'host_response': s(r.get('host_response')),
        }
    if r['has_us_response']:
        rec['us'] = {
            'date': date_str(r.get('us_response_date')),
            'source': s(r.get('us_response_source_type')),
            'excerpt': s(r.get('us_response_excerpt')),
            'url': s(r.get('us_response_url')),
            'dod_found': flag(r.get('us_dod_response_found')),
            'dod_source': s(r.get('us_dod_source')),
            'actions': {
                'diplomatic': flag(r.get('us_act_diplomatic')),
                'economic': flag(r.get('us_act_economic')),
                'legal': flag(r.get('us_act_legal')),
                'evacuation': flag(r.get('us_act_evacuation')),
                'security_deployment': flag(r.get('us_act_security_deployment')),
                'travel_warning': flag(r.get('us_act_travel_warning')),
            },
            'act_url': s(r.get('us_act_url')),
            'act_date': date_str(r.get('us_act_date')),
        }
    responses_full[eid] = rec

with open(PUBLIC_DATA / 'responses_full.json', 'w') as f:
    json.dump(responses_full, f, ensure_ascii=False, separators=(',', ':'))
print(f'Wrote responses_full.json ({len(responses_full)} entries)')


# ---------- Write mfa_quotes.json ----------
mfa_quotes = {}
for _, r in merged.iterrows():
    if not r['has_mfa']:
        continue
    eid = r['event_id']
    threat_id = r.get('mfa_threat_id')
    matched = mfa_lookup.get(threat_id) if mfa_lookup else None
    if matched is not None:
        mfa_quotes[eid] = {
            'date': date_str(matched.get('date')),
            'spokesperson': s(matched.get('spokesperson')),
            'question': s(matched.get('question')),
            'answer': s(matched.get('answer')),
            'link': s(matched.get('link')),
            'match_type': s(r.get('mfa_match_type')),
        }
    else:
        # Fall back to the threat fields already on the merged row
        mfa_quotes[eid] = {
            'date': date_str(r.get('mfa_threat_date')),
            'spokesperson': s(r.get('mfa_threat_spokesperson')),
            'question': s(r.get('mfa_threat_question')),
            'answer': None,
            'link': s(r.get('mfa_threat_link')),
            'match_type': s(r.get('mfa_match_type')),
        }

with open(PUBLIC_DATA / 'mfa_quotes.json', 'w') as f:
    json.dump(mfa_quotes, f, ensure_ascii=False, separators=(',', ':'))
print(f'Wrote mfa_quotes.json ({len(mfa_quotes)} entries)')


# ---------- Write media_quotes.json ----------
media_quotes = {}
for _, r in merged.iterrows():
    if not r['has_media']:
        continue
    eid = r['event_id']
    media_quotes[eid] = {
        'date': date_str(r.get('media_match_date')),
        'source': s(r.get('media_match_source')),
        'title': s(r.get('media_match_title')),
        'country': s(r.get('media_match_country')),
        'issue': s(r.get('media_match_issue')),
    }

with open(PUBLIC_DATA / 'media_quotes.json', 'w') as f:
    json.dump(media_quotes, f, ensure_ascii=False, separators=(',', ':'))
print(f'Wrote media_quotes.json ({len(media_quotes)} entries)')


# ---------- Summary ----------
print('\n=== Summary ===')
print(f'Total features: {len(features)}')
n_cn = sum(1 for f in features if f['properties']['target'] == 'anti-china')
n_us = sum(1 for f in features if f['properties']['target'] == 'anti-us')
print(f'  anti-china: {n_cn}')
print(f'  anti-us:    {n_us}')
print(f'  with china response: {sum(f["properties"]["cn_resp"] for f in features)}')
print(f'  with us response:    {sum(f["properties"]["us_resp"] for f in features)}')
print(f'  with mfa quote:      {sum(f["properties"]["mfa"] for f in features)}')
print(f'  with media quote:    {sum(f["properties"]["media"] for f in features)}')

# Year range
years = [f['properties']['year'] for f in features if f['properties']['year']]
print(f'\nYear range: {min(years)} – {max(years)}')

# Categories
from collections import Counter
cats = Counter(f['properties']['category'] for f in features)
print(f'\nCategories ({len(cats)}):')
for cat, n in sorted(cats.items(), key=lambda x: -x[1]):
    print(f'  {cat}: {n}')

# File sizes
print(f'\nFile sizes:')
for p in sorted(PUBLIC_DATA.glob('*.*')):
    print(f'  {p.name}: {p.stat().st_size / 1024:.1f} KB')

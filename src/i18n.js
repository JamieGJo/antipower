// Chinese category labels — only applied to anti-China-targeted events in popups.
export const ZH_CATEGORY = {
  'Political Influence':         '政治影响',
  'Project Grievance':           '项目抗议',
  'Domestic (Solidarity)':       '国内（声援）',
  'Sovereignty & Territorial':   '主权与领土',
  'Military Forces Attacks':     '武装力量袭击',
  'Violence Against Nationals':  '针对公民的暴力',
  'Diplomatic/Bilateral':        '外交/双边',
  'Economic Competition':        '经济竞争',
  'Xenophobia/Anti-Immigration': '排外/反移民',
  'Symbolic/Nationalist':        '象征性/民族主义',
};

export function zhFor(category) {
  return ZH_CATEGORY[category] || null;
}

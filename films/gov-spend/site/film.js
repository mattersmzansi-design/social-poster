// Government spending 2024/25 (Stats SA data story, 26 Nov 2026). 1080x1920, music only. All figures from Stats SA.
const W = 1080, H = 1920, c = document.getElementById('c').getContext('2d');
const BG = '#06262E', INK = '#E9F1F2', DIM = 'rgba(200,220,225,0.62)', GOLD = '#F7B32B', TEAL = '#2BB3C0', RED = '#FF6B5F', GREEN = '#7FB93F';
const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1), ss = t => t * t * (3 - 2 * t);
let REG = [];
function txt(s, x, y, size, w, col, al = 'left') { c.font = `${w} ${size}px P`; c.textAlign = al; c.textBaseline = 'alphabetic'; c.fillStyle = col; c.fillText(s, x, y); REG.push({ text: s }); }
function wrap(s, x, y, size, w, col, maxW, lh, al = 'left') {
  c.font = `${w} ${size}px P`; let line = '', yy = y;
  for (const word of s.split(' ')) { const tr = line ? line + ' ' + word : word; if (c.measureText(tr).width > maxW && line) { txt(line, x, yy, size, w, col, al); line = word; yy += lh; } else line = tr; }
  if (line) txt(line, x, yy, size, w, col, al); return yy;
}
// scenes: [start, end]
const S = { intro: [0, 8], trend: [8, 21], split: [21, 35], debt: [35, 45], share: [45, 57], rise: [57, 68], outro: [68, 75] };
const DUR = 75;
const alphaOf = (t, [a, b]) => ss(seg(t, a, a + 0.8)) * (1 - ss(seg(t, b - 0.6, b)));
const at = (t, a, b) => ss(seg(t, a, b));

const TREND = [['14/15', 1.37], ['15/16', 1.51], ['16/17', 1.58], ['17/18', 1.64], ['18/19', 1.74], ['19/20', 1.91], ['20/21', 2.04], ['21/22', 2.15], ['22/23', 2.25], ['23/24', 2.39], ['24/25', 2.52]];
const SPLIT = [['General public services', 641, 25, TEAL, 'incl. R386bn on debt (mainly interest)'], ['Education', 509, 20, '#F08A24', 'tertiary 6% · primary 6% · secondary 4%'], ['Social protection', 387, 15, '#4F7FC0', 'old age 5% · family & children 4%'], ['Health', 288, 11, '#C2453F', 'hospitals 6% · public health 4%'], ['Economic affairs', 257, 10, '#8A6BB8', 'transport 6% (roads 5%)'], ['Public order & safety', 225, 9, GREEN, 'police 6% · courts 1% · prisons 1%'], ['Other', 210, 8, '#B98A55', 'housing 3% · defence 2% · recreation 2%']];
const SHARE = [['14/15', 8.4], ['15/16', 8.6], ['16/17', 9.3], ['17/18', 9.6], ['18/19', 10.2], ['19/20', 10.5], ['20/21', 11.1], ['21/22', 12.2], ['22/23', 13.7], ['23/24', 14.9], ['24/25', 15.3]];
const RISE = [['General public services', 'National', 29.8, 'mainly public debt transactions'], ['Social protection', 'National', 17.0, 'old-age and family & children’s grants'], ['Economic affairs', 'Extra-budgetary accounts*', 12.8, 'incl. SANRAL capital spending'], ['Public order & safety', 'National', 10.7, 'police services and prisons'], ['Health', 'Provincial', 9.7, '']];

function header(kicker, l1, l2, col2) {
  c.fillStyle = GOLD; c.fillRect(70, 110, 80, 7);
  txt(kicker, 70, 165, 26, 600, DIM); txt(l1, 70, 250, 62, 700, INK); if (l2) txt(l2, 70, 330, 62, 700, col2 || GOLD);
}
function vbars(t, data, st, max, col, fmt, hiCol, y0 = 1450, y1 = 640) {
  const n = data.length, x0 = 90, x1 = 990, bw = (x1 - x0) / n * 0.68;
  c.strokeStyle = 'rgba(160,200,210,0.25)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y0); c.stroke();
  data.forEach(([lab, v], i) => {
    const a = at(t, st + i * 0.55, st + i * 0.55 + 1.1); const x = x0 + (x1 - x0) * (i + 0.5) / n, h = (y0 - y1) * v / max * a;
    const last = i === n - 1; c.fillStyle = last ? hiCol : col; c.globalAlpha *= 1; c.beginPath(); c.roundRect(x - bw / 2, y0 - h, bw, h, [8, 8, 0, 0]); c.fill();
    if (a > 0.05) { const ga = c.globalAlpha; c.globalAlpha = ga * a; txt(fmt(v), x, y0 - h - 16, last ? 30 : 24, 700, last ? hiCol : INK, 'center'); c.globalAlpha = ga; }
    txt(lab, x, y0 + 42, 22, 600, DIM, 'center');
  });
}
window.render = t => {
  REG = []; c.globalAlpha = 1; c.fillStyle = BG; c.fillRect(0, 0, W, H);
  let a;
  // 1 intro
  if ((a = alphaOf(t, S.intro)) > 0) {
    c.globalAlpha = a; c.fillStyle = GOLD; c.fillRect(70, 110, 80, 7); txt('STATS SA · GOVERNMENT FINANCES · 2024/25', 70, 165, 26, 600, DIM);
    txt('How much did', 70, 470, 76, 700, INK); txt('government spend?', 70, 560, 76, 700, INK);
    const v = 2.52 * at(t, 1.5, 5); txt('R' + v.toFixed(2), W / 2, 960, 190, 700, GOLD, 'center'); txt('trillion', W / 2, 1050, 60, 600, INK, 'center');
    c.globalAlpha = a * at(t, 4.8, 5.8); txt('in the 2024/25 financial year (April to March)', W / 2, 1150, 32, 400, DIM, 'center');
    c.globalAlpha = a * at(t, 5.6, 6.6); c.fillStyle = 'rgba(255,255,255,0.06)'; c.beginPath(); c.roundRect(110, 1260, W - 220, 190, 24); c.fill();
    txt('+R126.8 billion', W / 2, 1345, 58, 700, RED, 'center'); txt('more than the year before (+5.3%)', W / 2, 1405, 32, 600, INK, 'center');
  }
  // 2 trend
  if ((a = alphaOf(t, S.trend)) > 0) {
    c.globalAlpha = a; header('TEN YEARS OF GOVERNMENT SPENDING', 'Up every year', 'for a decade', GOLD);
    txt('General government expenditure, R trillion', 70, 395, 28, 400, DIM);
    vbars(t, TREND, S.trend[0] + 0.8, 2.8, '#4A5A66', v => v.toFixed(2), TEAL);
    c.globalAlpha = a * at(t, S.trend[0] + 7.5, S.trend[0] + 8.5); c.fillStyle = 'rgba(255,255,255,0.06)'; c.beginPath(); c.roundRect(70, 1560, W - 140, 170, 22); c.fill();
    txt('R1.37 trillion → R2.52 trillion', W / 2, 1635, 46, 700, INK, 'center'); txt('2014/15 to 2024/25', W / 2, 1690, 28, 600, DIM, 'center');
  }
  // 3 split
  if ((a = alphaOf(t, S.split)) > 0) {
    c.globalAlpha = a; header('WHERE THE R2.52 TRILLION WENT', 'Where the money', 'went', GOLD);
    txt('Spending by function, 2024/25', 70, 395, 28, 400, DIM);
    SPLIT.forEach(([lab, bn, pct, col, sub], i) => {
      const y = 500 + i * 182, st = S.split[0] + 0.8 + i * 0.7, b = at(t, st, st + 1.2); if (b <= 0) return;
      const ga = c.globalAlpha; c.globalAlpha = ga * Math.min(1, b * 1.5);
      txt(lab, 70, y, 34, 700, INK); txt(`R${bn}bn`, W - 70, y, 34, 700, col, 'right');
      c.fillStyle = 'rgba(255,255,255,0.07)'; c.beginPath(); c.roundRect(70, y + 18, W - 140, 44, 10); c.fill();
      const bwid = (W - 140) * (bn / 641) * b; c.fillStyle = col; c.beginPath(); c.roundRect(70, y + 18, Math.max(bwid, 20), 44, 10); c.fill();
      txt(pct + '%', 70 + Math.max(bwid, 20) - 14, y + 51, 26, 700, BG, 'right');
      txt(sub, 70, y + 100, 24, 400, DIM); c.globalAlpha = ga;
    });
  }
  // 4 debt
  if ((a = alphaOf(t, S.debt)) > 0) {
    c.globalAlpha = a; header('THE COST OF DEBT', 'Debt costs almost', 'match social protection', RED);
    const st = S.debt[0];
    const r1 = at(t, st + 1, st + 2.5), r2 = at(t, st + 2.2, st + 3.7);
    [[0, 'Public debt transactions', '(mainly interest)', 386, RED, r1], [1, 'Social protection', '(social grants and more)', 387, '#4F7FC0', r2]].forEach(([k, l1, l2, v, col, p]) => {
      const x = k ? 770 : 310, base = 1180, h = 520 * p;
      c.fillStyle = col; c.beginPath(); c.roundRect(x - 120, base - h, 240, h, [12, 12, 0, 0]); c.fill();
      if (p > 0.1) { txt('R' + Math.round(v * p) + 'bn', x, base - h - 24, 52, 700, col, 'center'); }
      txt(l1, x, base + 56, 30, 700, INK, 'center'); txt(l2, x, base + 96, 24, 400, DIM, 'center');
      txt('15% of spending', x, base + 136, 26, 600, col, 'center');
    });
    c.globalAlpha = a * at(t, st + 4.5, st + 5.5); c.fillStyle = 'rgba(255,255,255,0.06)'; c.beginPath(); c.roundRect(70, 1390, W - 140, 330, 24); c.fill();
    txt('About R1.1 billion a day', W / 2, 1475, 54, 700, GOLD, 'center');
    txt('spent servicing a gross loan debt of', W / 2, 1540, 30, 400, INK, 'center');
    txt('R5.7 trillion', W / 2, 1615, 58, 700, INK, 'center');
    txt('Debt figure: National Treasury 2026 Budget Review, Table 7.7', W / 2, 1680, 22, 400, DIM, 'center');
  }
  // 5 share
  if ((a = alphaOf(t, S.share)) > 0) {
    c.globalAlpha = a; header('DEBT’S SLICE OF THE PIE', 'Debt costs nearly', 'doubled their share', RED);
    txt('Public debt transactions, % of total spending', 70, 395, 28, 400, DIM);
    vbars(t, SHARE, S.share[0] + 0.8, 17, GREEN, v => v.toFixed(1) + '%', RED);
    c.globalAlpha = a * at(t, S.share[0] + 7.5, S.share[0] + 8.5); c.fillStyle = 'rgba(255,255,255,0.06)'; c.beginPath(); c.roundRect(70, 1560, W - 140, 170, 22); c.fill();
    txt('8.4% → 15.3%', W / 2, 1635, 52, 700, INK, 'center'); txt('of every rand spent, 2014/15 to 2024/25', W / 2, 1690, 28, 600, DIM, 'center');
  }
  // 6 rise
  if ((a = alphaOf(t, S.rise)) > 0) {
    c.globalAlpha = a; header('WHAT DROVE THE R126.8 BILLION RISE', 'The biggest', 'increases', GOLD);
    txt('Change from 2023/24, R billion', 70, 395, 28, 400, DIM);
    RISE.forEach(([fn, lvl, v, why], i) => {
      const y = 520 + i * 215, st = S.rise[0] + 0.8 + i * 0.8, b = at(t, st, st + 1.2); if (b <= 0) return;
      const ga = c.globalAlpha; c.globalAlpha = ga * Math.min(1, b * 1.5);
      txt(fn, 70, y, 36, 700, INK); txt(lvl, 70, y + 42, 24, 600, DIM);
      c.fillStyle = 'rgba(255,255,255,0.07)'; c.beginPath(); c.roundRect(70, y + 62, W - 140, 46, 10); c.fill();
      const bwid = (W - 140 - 170) * (v / 29.8) * b; c.fillStyle = i === 0 ? RED : GOLD; c.beginPath(); c.roundRect(70, y + 62, Math.max(bwid, 20), 46, 10); c.fill();
      txt('+R' + (v * b).toFixed(1) + 'bn', 70 + Math.max(bwid, 20) + 14, y + 97, 30, 700, INK);
      if (why) txt(why, 70, y + 148, 24, 400, DIM); c.globalAlpha = ga;
    });
    txt('*Extra-budgetary accounts and funds, e.g. the SA National Roads Agency', 70, 1640, 22, 400, DIM);
  }
  // 7 outro
  if ((a = alphaOf(t, [S.outro[0], DUR + 1])) > 0) {
    c.globalAlpha = a; c.fillStyle = GOLD; c.fillRect(70, 110, 80, 7);
    txt('In short', 70, 420, 76, 700, INK);
    const L = [['R2.52 trillion', 'spent by government in 2024/25'], ['20%', 'on education (R509 billion)'], ['15%', 'on debt costs, about R1.1 billion a day'], ['8.4% → 15.3%', 'debt’s share of spending in ten years']];
    L.forEach(([b, s], i) => { const ga = c.globalAlpha; c.globalAlpha = ga * at(t, S.outro[0] + 0.5 + i * 0.6, S.outro[0] + 1.3 + i * 0.6); txt(b, 70, 600 + i * 210, 66, 700, i === 2 || i === 3 ? RED : GOLD); txt(s, 70, 655 + i * 210, 32, 400, INK); c.globalAlpha = ga; });
    wrap('Source: Stats SA, Financial statistics of consolidated general government 2024/2025 (data story, 26 Nov 2026). 699 government institutions; cash basis, April–March.', 70, 1520, 26, 400, DIM, W - 140, 38);
    txt('Mzansi Money Matters · Education, not financial advice', 70, 1700, 28, 600, GOLD);
  }
  c.globalAlpha = 1;
  if (t < S.outro[0]) txt('Source: Stats SA, Financial statistics of consolidated general government 2024/25 · Not financial advice', W / 2, 1880, 19, 400, 'rgba(200,220,225,0.5)', 'center');
  c.fillStyle = GOLD; c.beginPath(); c.arc(990, 140, 30, 0, 7); c.fill(); txt('MMM', 990, 147, 17, 700, BG, 'center');
};
window.DUR = DUR;
window.EV = Object.values(S).map(s => ({ t: s[0] + 0.3, type: 'step' }));
window.TEXTS = t => { window.render(t); return REG; };
Promise.all(['700 40px P', '600 40px P', '400 40px P'].map(f => document.fonts.load(f))).then(() => { window.READY = true; });

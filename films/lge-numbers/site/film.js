// LGE 2026 in numbers: animated chart film, 1080x1920 @ 30 fps.
// Contract: window.READY, window.render(t), window.DUR, window.EV, window.TEXTS(t).
const W = 1080, H = 1920;
const cv = document.getElementById('c'), c = cv.getContext('2d');
const G1 = '#08341F', G2 = '#0E6838', GOLD = '#E0B23B', LGOLD = '#F3D682', WHITE = '#FFFFFF', MUTED = 'rgba(255,255,255,0.32)', GREEN = '#3FBF7F';

const VO = [
  ['v1', 0.5, 4.356, "South Africa's 2026 local elections, in numbers."],
  ['v2', 5.4, 8.704, 'Nationally, the ANC fell from 45.6% to 30.8%. The DA rose to 24.6%.'],
  ['v3', 14.6, 10.652, 'The MK Party took 9.8% in its first local election. The EFF fell to 6.2%, and ActionSA rose to 5.7%.'],
  ['v4', 25.8, 4.62, 'Turnout climbed to 52%. Almost 15 million people voted.'],
  ['v5', 31.0, 6.426, 'But the biggest number is this: 137 of 213 councils are hung.'],
  ['v6', 38.0, 6.592, 'In the metros, only Cape Town has one party with a majority. The other seven need coalitions.'],
  ['v7', 45.2, 6.431, 'And those coalitions will set your rates, water and electricity tariffs from July 2027.'],
  ['v8', 52.3, 3.264, 'Mzansi Money Matters. Know who sets your rates.'],
];
const DUR = 57.0;

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const ss = t => t * t * (3 - 2 * t);
const eio = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const back = (t, s = 1.4) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
const vis = (t, a, b, f = 0.5) => ss(seg(t, a, a + f)) * (1 - ss(seg(t, b - f, b)));

let REG = [];
const reg = (id, text, x, y, w, h) => REG.push({ id, text, x0: x, y0: y, x1: x + w, y1: y + h });
function txt(id, s, x, y, size, weight, color, align = 'left', base = 'alphabetic') {
  c.font = `${weight} ${size}px P`; c.textAlign = align; c.textBaseline = base; c.fillStyle = color; c.fillText(s, x, y);
  const w = c.measureText(s).width; reg(id, s, align === 'left' ? x : align === 'right' ? x - w : x - w / 2, y - size, w, size * 1.2);
}

function bg(t) {
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, G1); g.addColorStop(1, G2);
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  // slow gold rings, top right
  c.save(); c.translate(W - 130, 230); c.rotate(t * 0.03);
  for (const [r, a] of [[420, 0.16], [320, 0.11], [220, 0.07]]) { c.strokeStyle = `rgba(224,178,59,${a})`; c.lineWidth = 7; c.beginPath(); c.arc(0, 0, r, 0, 6.283); c.stroke(); }
  c.restore();
  // header
  c.fillStyle = GOLD; c.beginPath(); c.arc(112, 128, 34, 0, 6.283); c.fill();
  txt('logo', 'MMM', 112, 138, 22, 700, G1, 'center');
  txt('brand', 'MZANSI MONEY MATTERS', 166, 140, 34, 600, GOLD);
  c.fillStyle = GOLD; c.fillRect(80, 196, 110, 7);
  txt('src', 'Source: IEC declaration, 8 November 2026', 80, 1850, 26, 400, 'rgba(243,214,130,0.75)');
}

function kicker(id, s, a) { c.globalAlpha = a; txt(id, s, 80, 330, 40, 600, GOLD); c.globalAlpha = 1; }

// ---------- scene 0: title ----------
function sTitle(t) {
  const a = vis(t, 0.2, 5.4, 0.6); if (a <= 0) return;
  c.globalAlpha = a;
  txt('t1', 'ELECTIONS 2026', 80, 640, 46, 600, GOLD);
  txt('t2', 'The local', 80, 780, 120, 700, WHITE);
  txt('t3', 'elections', 80, 920, 120, 700, WHITE);
  txt('t4', 'in numbers', 80, 1060, 120, 700, LGOLD);
  c.globalAlpha = 1;
}

// ---------- scene 1: national bars 2021 vs 2026 ----------
const PARTIES = [
  ['ANC', 45.59, 30.76, 6.0], ['DA', 21.66, 24.64, 10.0], ['MK', 0, 9.76, 15.4], ['EFF', 10.31, 6.22, 19.6], ['ActionSA', 2.33, 5.67, 22.4],
];
function sNational(t) {
  const a = vis(t, 5.2, 25.6, 0.6); if (a <= 0) return;
  c.globalAlpha = a;
  kicker('k1', 'NATIONAL VOTE', 1);
  txt('h1', 'Share of the vote', 80, 420, 64, 700, WHITE);
  // legend
  c.fillStyle = MUTED; c.fillRect(80, 470, 34, 22); txt('l21', '2021', 126, 491, 28, 600, 'rgba(255,255,255,0.7)');
  c.fillStyle = GOLD; c.fillRect(230, 470, 34, 22); txt('l26', '2026', 276, 491, 28, 600, LGOLD);
  const x0 = 320, maxW = 620, scale = maxW / 50;
  PARTIES.forEach(([name, v21, v26, t0], i) => {
    const y = 570 + i * 170, u = eio(seg(t, t0, t0 + 1.4)), ap = ss(seg(t, t0 - 0.6, t0));
    if (ap <= 0) return;
    c.globalAlpha = a * ap;
    txt('p' + i, name, 80, y + 52, 46, 700, WHITE);
    // 2021 bar
    c.fillStyle = MUTED; c.beginPath(); c.roundRect(x0, y, Math.max(4, v21 * scale), 34, 8); c.fill();
    txt('p21_' + i, v21 ? v21.toFixed(1) + '%' : 'new', x0 + Math.max(4, v21 * scale) + 16, y + 30, 28, 600, 'rgba(255,255,255,0.7)');
    // 2026 bar grows
    const w = Math.max(4, v26 * scale * u);
    c.fillStyle = GOLD; c.beginPath(); c.roundRect(x0, y + 50, w, 54, 10); c.fill();
    if (u > 0.05) txt('p26_' + i, (v26 * u).toFixed(1) + '%', x0 + w + 16, y + 92, 42, 700, LGOLD);
    if (u >= 1) {
      const d = v26 - v21, s = name === 'MK' ? 'first local election' : (d > 0 ? '▲ ' : '▼ ') + Math.abs(d).toFixed(1) + ' pts';
      c.globalAlpha = a * ss(seg(t, t0 + 1.4, t0 + 1.9));
      txt('pd' + i, s, x0, y + 150, 28, 600, d > 0 || name === 'MK' ? GREEN : '#FF8A7A');
    }
    c.globalAlpha = a;
  });
  c.globalAlpha = 1;
}

// ---------- scene 2: turnout ----------
function sTurnout(t) {
  const a = vis(t, 25.6, 30.8, 0.5); if (a <= 0) return;
  c.globalAlpha = a;
  kicker('k2', 'TURNOUT', 1);
  const u = eio(seg(t, 26.0, 27.6)), v = 45.9 + (52 - 45.9) * u;
  txt('tv', Math.round(v) + '%', W / 2, 980, 300, 700, WHITE, 'center');
  txt('tl', 'of registered voters voted', W / 2, 1080, 46, 600, LGOLD, 'center');
  c.globalAlpha = a * ss(seg(t, 27.6, 28.2));
  txt('tp', 'up from 45.9% in 2021', W / 2, 1160, 40, 400, 'rgba(255,255,255,0.8)', 'center');
  c.globalAlpha = a * ss(seg(t, 28.4, 29.0));
  txt('tm', '≈ 14.9 million voters', W / 2, 1270, 54, 700, GOLD, 'center');
  c.globalAlpha = 1;
}

// ---------- scene 3: councils dot grid ----------
function sCouncils(t) {
  const a = vis(t, 30.8, 37.9, 0.5); if (a <= 0) return;
  c.globalAlpha = a;
  kicker('k3', 'COUNCILS', 1);
  txt('ch', '213 municipal councils', 80, 420, 60, 700, WHITE);
  const cols = 18, r = 19, gap = 50, x0 = 115, y0 = 540;
  for (let i = 0; i < 213; i++) {
    const cx = x0 + (i % cols) * gap, cy = y0 + Math.floor(i / cols) * gap;
    const appear = ss(seg(t, 31.2 + i * 0.006, 31.5 + i * 0.006)), hungT = 33.2 + i * 0.008;
    let col = 'rgba(255,255,255,0.22)';
    if (i < 137 && t > hungT) col = GOLD; else if (i >= 137 && i < 211 && t > 34.6) col = GREEN;
    c.globalAlpha = a * appear; c.fillStyle = col; c.beginPath(); c.arc(cx, cy, r * (i < 137 && t > hungT ? lerpPop(t - hungT) : 1), 0, 6.283); c.fill();
  }
  c.globalAlpha = a * ss(seg(t, 33.4, 34.0));
  c.fillStyle = GOLD; c.fillRect(80, 1210, 40, 40); txt('c1', '137 hung: no party has a majority', 140, 1244, 42, 700, WHITE);
  c.globalAlpha = a * ss(seg(t, 34.6, 35.2));
  c.fillStyle = GREEN; c.fillRect(80, 1280, 40, 40); txt('c2', '74 with a single-party majority', 140, 1314, 42, 600, 'rgba(255,255,255,0.9)');
  c.globalAlpha = 1;
}
const lerpPop = x => (x > 0.35 ? 1 : 1 + 0.35 * Math.sin(Math.PI * x / 0.35));

// ---------- scene 4: metros ----------
const METROS = [
  ['Cape Town', 'DA', 56.42], ['Nelson Mandela Bay', 'DA', 44.17], ['Buffalo City', 'ANC', 41.93], ['eThekwini', 'MK', 38.29],
  ['Johannesburg', 'DA', 34.79], ['Tshwane', 'DA', 34.37], ['Mangaung', 'ANC', 33.91], ['Ekurhuleni', 'DA', 30.68],
];
function sMetros(t) {
  const a = vis(t, 37.8, 52.0, 0.5); if (a <= 0) return;
  c.globalAlpha = a;
  kicker('k4', 'THE 8 METROS', 1);
  txt('mh', 'Biggest party, share of the vote', 80, 420, 50, 700, WHITE);
  const x0 = 80, bw = 920, half = x0 + bw * 0.5;
  METROS.forEach(([name, party, v], i) => {
    const y = 520 + i * 118, t0 = 38.4 + i * 0.35, u = eio(seg(t, t0, t0 + 0.9));
    c.globalAlpha = a * ss(seg(t, t0 - 0.2, t0 + 0.2));
    txt('mn' + i, name, x0, y + 30, 34, 600, WHITE);
    c.fillStyle = 'rgba(255,255,255,0.12)'; c.beginPath(); c.roundRect(x0, y + 46, bw, 44, 10); c.fill();
    const maj = v > 50;
    c.fillStyle = maj ? GREEN : GOLD; c.beginPath(); c.roundRect(x0, y + 46, bw * v / 100 * u, 44, 10); c.fill();
    if (u > 0.1) txt('mv' + i, `${party} ${(v * u).toFixed(1)}%`, x0 + 16, y + 79, 28, 700, G1);
    if (u >= 1) txt('ms' + i, maj ? '✓ Majority' : 'Hung', x0 + bw - 12, y + 30, 30, 700, maj ? GREEN : LGOLD, 'right');
  });
  // 50% line
  c.globalAlpha = a * ss(seg(t, 38.6, 39.2));
  c.strokeStyle = WHITE; c.lineWidth = 4; c.setLineDash([12, 10]); c.beginPath(); c.moveTo(half, 500); c.lineTo(half, 1480); c.stroke(); c.setLineDash([]);
  txt('m50', '50%', half, 490, 28, 700, WHITE, 'center');
  c.globalAlpha = 1;
  // money overlay
  const b = vis(t, 45.4, 52.0, 0.6);
  if (b > 0) {
    c.globalAlpha = a * b;
    c.fillStyle = 'rgba(8,52,31,0.94)'; c.beginPath(); c.roundRect(60, 560, W - 120, 640, 28); c.fill();
    c.strokeStyle = GOLD; c.lineWidth = 4; c.stroke();
    txt('o1', 'Coalition deals', W / 2, 760, 80, 700, WHITE, 'center');
    txt('o2', 'will set your', W / 2, 860, 64, 600, WHITE, 'center');
    txt('o3', 'rates · water · electricity', W / 2, 970, 52, 700, GOLD, 'center');
    txt('o4', 'from 1 July 2027', W / 2, 1080, 56, 700, LGOLD, 'center');
    c.globalAlpha = 1;
  }
}

// ---------- scene 5: end ----------
function sEnd(t) {
  const a = ss(seg(t, 52.2, 52.9)); if (a <= 0) return;
  c.globalAlpha = a;
  txt('e1', 'Mzansi Money Matters', W / 2, 860, 76, 700, WHITE, 'center');
  txt('e2', 'Know who sets your rates.', W / 2, 950, 46, 600, GOLD, 'center');
  txt('e3', 'Education, not financial advice', W / 2, 1030, 30, 400, 'rgba(255,255,255,0.7)', 'center');
  c.globalAlpha = 1;
}

// ---------- captions ----------
function wrap(text, maxW) {
  const words = text.split(' '), lines = []; let cur = '';
  for (const wd of words) { const tr = cur ? cur + ' ' + wd : wd; if (c.measureText(tr).width > maxW && cur) { lines.push(cur); cur = wd; } else cur = tr; }
  if (cur) lines.push(cur); return lines;
}
function caption(t) {
  const v = VO.find(([id, s, d]) => id !== 'v8' && t >= s - 0.05 && t < s + d + 0.4);
  if (!v) return;
  const [, s, d, text] = v, a = ss(seg(t, s - 0.05, s + 0.15)) * (1 - ss(seg(t, s + d + 0.2, s + d + 0.4)));
  c.font = '600 40px P'; const lines = wrap(text, 880), lh = 54, bh = lines.length * lh + 36, by = 1700 - bh;
  c.save(); c.globalAlpha = a; c.fillStyle = 'rgba(255,255,255,0.95)'; c.beginPath(); c.roundRect(60, by, W - 120, bh, 18); c.fill();
  c.fillStyle = G1; c.textAlign = 'center'; c.textBaseline = 'middle';
  lines.forEach((ln, i) => { c.fillText(ln, W / 2, by + 18 + lh / 2 + i * lh); reg('cap' + i, ln, 80, by + 18 + i * lh, 920, lh); });
  c.restore();
}

// ---------- sound cues ----------
const EV = [{ t: 0.15, type: 'chime' }, { t: 25.6, type: 'chime' }, { t: 30.9, type: 'hub' }, { t: 37.9, type: 'chime' }, { t: 45.4, type: 'callout' }, { t: 52.6, type: 'chime_end' }];
for (const [, , , t0] of PARTIES) EV.push({ t: t0, type: 'draw', d: 1.4 }, { t: t0 + 1.4, type: 'tick' });
EV.push({ t: 26.0, type: 'draw', d: 1.6 }, { t: 27.6, type: 'tick' }, { t: 33.2, type: 'draw', d: 1.2 }, { t: 34.6, type: 'stop' });
METROS.forEach((m, i) => EV.push({ t: 38.4 + i * 0.35 + 0.9, type: 'stop' }));
for (const [id, s] of VO) EV.push({ t: s, type: 'vo', id });
EV.sort((a, b) => a.t - b.t);

window.DUR = DUR; window.EV = EV;
window.render = t => {
  REG = []; c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1;
  bg(t); sTitle(t); sNational(t); sTurnout(t); sCouncils(t); sMetros(t); sEnd(t); caption(t);
};
window.TEXTS = t => { window.render(t); return REG; };
document.fonts.load('700 40px P').then(() => document.fonts.load('600 40px P')).then(() => document.fonts.load('400 40px P')).then(() => { window.READY = true; });

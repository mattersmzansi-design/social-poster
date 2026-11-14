// Decision Day: what feeds the rate. Transit Map film (2D), 1080x1920 @ 30 fps. Template: films/repo-line.
// Contract: window.READY, window.render(t), window.DUR, window.EV, window.TEXTS(t).
const W = 1080, H = 1920;
const cv = document.getElementById('c'), c = cv.getContext('2d');
const PAPER = '#F2EEE5', INK = '#1B1C1E', GREY = '#4A4740', TABLE = '#1B1918';
const RIVER = '#BCD6EA', RIVER_EDGE = '#8FB5D6', RIVER_INK = '#5F88AD';
const RED = '#E3002B', GOLD = '#C9A227';
const COL = { fuel: '#F08C00', food: '#0E8A4F', rand: '#00A3AD', us: '#7B3FA0', trunk: RED, hold: '#2A6FDB', hike: '#C2185B', next: RED };

// ---------- timing (voice lines start; durations from voice/dur.json) ----------
const VO = [
  ['v1', 0.6, 4.174, 'On Thursday, the Reserve Bank decides what borrowing will cost you.'],
  ['v2', 5.3, 6.51, 'Four lines feed into that decision. Fuel. Food. The rand. And interest rates overseas.'],
  ['v3', 12.4, 6.514, 'Together they drive inflation. In September it was 4.5%. The target is 3%.'],
  ['v4', 19.5, 5.541, 'The repo rate is 7.25%, and prime is 10.75%.'],
  ['v5', 25.7, 3.343, 'Economists are split between a hold and another hike.'],
  ['v6', 29.7, 7.218, 'If rates hold, a R1 million home loan stays at about R10,150 a month.'],
  ['v7', 37.5, 3.783, 'A quarter-point hike adds about R170.'],
  ['v8', 41.9, 5.742, 'New inflation figures land on Wednesday. The decision follows on Thursday afternoon.'],
  ['v9', 48.4, 3.488, 'Mzansi Money Matters. Know where your money is going.'],
];
const DUR = 54.5;

// ---------- helpers ----------
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const ss = t => t * t * (3 - 2 * t);
const eio = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const back = (t, s = 1.6) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);

// ---------- network (G units) ----------
const ST = {
  fuel: [1, 1, 'Fuel', 'hub', 'n'],
  food: [3, 1, 'Food', 'hub', 'n'],
  rand: [7, 1, 'The rand', 'hub', 'n'],
  us: [9, 1, 'US rates', 'hub', 'n'],
  infl: [5, 5, 'Inflation 4.5%', 'stop', 'e'],
  mpc: [5, 7.5, 'Reserve Bank', 'major', 'w'],
  holdA: [3, 9.5, 'Hold', 'stop', 'w'],
  holdB: [3, 11.2, 'Prime 10.75%', 'stop', 'w'],
  holdT: [3, 13, 'R10,152 a month', 'term', 'w'],
  hikeA: [7, 9.5, 'Hike 0.25', 'stop', 'e'],
  hikeB: [7, 11.2, 'Prime 11%', 'stop', 'e'],
  hikeT: [7, 13, 'R10,322 a month', 'term', 'e'],
  wed: [5, 11.2, 'Wed: new inflation data', 'stop', 's'],
  thu: [5, 13.9, 'Thu 19 Nov · decision', 'term', 's'],
};
const LINES = [
  { id: 'fuel', pts: [[1, 1], [5, 5]], stops: ['fuel', 'infl'], ph: [[6.6, 8.4, 0, 1]] },
  { id: 'food', pts: [[3, 1], [3, 3], [5, 5]], stops: ['food', 'infl'], ph: [[7.6, 9.4, 0, 2]] },
  { id: 'rand', pts: [[7, 1], [7, 3], [5, 5]], stops: ['rand', 'infl'], ph: [[8.6, 10.4, 0, 2]] },
  { id: 'us', pts: [[9, 1], [5, 5]], stops: ['us', 'infl'], ph: [[9.8, 11.6, 0, 1]] },
  { id: 'trunk', pts: [[5, 5], [5, 7.5]], stops: ['infl', 'mpc'], ph: [[19.6, 21.0, 0, 1]] },
  { id: 'hold', pts: [[5, 7.5], [3, 9.5], [3, 11.2], [3, 13]], stops: ['mpc', 'holdA', 'holdB', 'holdT'], ph: [[25.9, 27.4, 0, 1], [30.2, 33.4, 1, 3]] },
  { id: 'hike', pts: [[5, 7.5], [7, 9.5], [7, 11.2], [7, 13]], stops: ['mpc', 'hikeA', 'hikeB', 'hikeT'], ph: [[26.6, 28.1, 0, 1], [37.7, 39.6, 1, 3]] },
  { id: 'next', pts: [[5, 7.5], [5, 11.2], [5, 13.9]], stops: ['mpc', 'wed', 'thu'], ph: [[42.2, 46.4, 0, 2]], future: true },
];

// arc-length helpers
for (const L of LINES) {
  L.cum = [0];
  for (let i = 1; i < L.pts.length; i++) {
    const [a, b] = [L.pts[i - 1], L.pts[i]];
    L.cum.push(L.cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  L.len = L.cum[L.cum.length - 1];
  L.stopS = L.stops.map(id => {
    const [x, y] = ST[id];
    for (let i = 1; i < L.pts.length; i++) {
      const [a, b] = [L.pts[i - 1], L.pts[i]];
      const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const u = ((x - a[0]) * (b[0] - a[0]) + (y - a[1]) * (b[1] - a[1])) / (d * d);
      if (u >= -1e-6 && u <= 1 + 1e-6 && Math.hypot(a[0] + u * (b[0] - a[0]) - x, a[1] + u * (b[1] - a[1]) - y) < 1e-3) return L.cum[i - 1] + u * d;
    }
    return 0;
  });
}
const pointAt = (L, s) => {
  for (let i = 1; i < L.pts.length; i++) if (s <= L.cum[i] + 1e-9) {
    const u = (s - L.cum[i - 1]) / (L.cum[i] - L.cum[i - 1] || 1);
    return [lerp(L.pts[i - 1][0], L.pts[i][0], u), lerp(L.pts[i - 1][1], L.pts[i][1], u)];
  }
  return L.pts[L.pts.length - 1];
};
// drawn length of a line at time t, and whether a tip is moving
function drawn(L, t) {
  let s = 0, tip = false;
  for (const [t0, t1, i0, i1] of L.ph) {
    const a = L.cum[i0], b = L.cum[i1];
    if (t >= t1) s = Math.max(s, b);
    else if (t > t0) { s = Math.max(s, a + (b - a) * eio(seg(t, t0, t1))); tip = true; }
  }
  return [s, tip];
}
// time the tip passes arc length s (bisection over phases)
function passTime(L, s) {
  for (const [t0, t1, i0, i1] of L.ph) {
    const a = L.cum[i0], b = L.cum[i1];
    if (s >= a - 1e-6 && s <= b + 1e-6) {
      if (s <= a + 1e-6) return t0;
      let lo = t0, hi = t1;
      for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (a + (b - a) * eio(seg(m, t0, t1)) < s) lo = m; else hi = m; }
      return hi;
    }
  }
  return 1e9;
}
// when each station lights (first line that reaches it)
const LIT = {};
for (const L of LINES) L.stops.forEach((id, k) => { LIT[id] = Math.min(LIT[id] ?? 1e9, passTime(L, L.stopS[k])); });
const BANK_FALL = 21.05;
LIT.mpc = BANK_FALL;
LIT.infl = 12.6;

// ---------- camera keyframes [t, cx, cy, zoom px/G] ----------
const CAM = [
  [0, 3.4, 0.2, 165], [4.6, 3.6, 0.4, 160], [6.2, 5, 2.2, 112], [11.8, 5, 2.6, 112], [13.4, 5, 4.6, 112],
  [18.9, 5, 5.0, 112], [20.2, 5, 6.0, 115], [25.0, 5, 7.4, 115], [26.4, 5, 9.6, 100], [29.4, 5, 9.8, 100],
  [31.0, 3.6, 11.4, 128], [36.8, 3.8, 11.8, 128], [38.2, 6.4, 11.8, 128], [41.4, 6.3, 12.0, 122],
  [43.0, 5, 11.0, 100], [47.4, 5, 9.0, 86], [49.2, 5, 6.4, 72], [54.5, 5, 6.5, 71],
];
function camera(t) {
  let i = 0;
  while (i < CAM.length - 2 && t > CAM[i + 1][0]) i++;
  const [a, b] = [CAM[i], CAM[i + 1]];
  const u = ss(seg(t, a[0], b[0]));
  return { x: lerp(a[1], b[1], u), y: lerp(a[2], b[2], u), z: Math.exp(lerp(Math.log(a[3]), Math.log(b[3]), u)) };
}
let CAMV;
const sx = x => (x - CAMV.x) * CAMV.z + W / 2;
const sy = y => (y - CAMV.y) * CAMV.z + H * 0.52;

// ---------- paper texture (world-anchored pattern) ----------
const tex = document.createElement('canvas'); tex.width = tex.height = 512;
{
  const g = tex.getContext('2d'), img = g.createImageData(512, 512);
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 512 * 512; i++) {
    const v = 236 + (rnd() - 0.5) * 9;
    img.data[i * 4] = v + 6; img.data[i * 4 + 1] = v + 2; img.data[i * 4 + 2] = v - 7; img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  g.globalAlpha = 0.05; g.strokeStyle = '#8a7f6a';
  for (let k = 0; k < 900; k++) { const x = rnd() * 512, y = rnd() * 512, a = rnd() * 6.28, l = 3 + rnd() * 9; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
}
const SHEET = [-1.6, -6.8, 11.6, 20.5];

// ---------- text registry for readcheck ----------
let REG = [];
const reg = (id, text, x, y, w, h) => REG.push({ id, text, x0: x, y0: y, x1: x + w, y1: y + h });
function label(id, text, gx, gy, sizeG, weight, color, align = 'left', base = 'middle') {
  const px = sizeG * CAMV.z;
  if (px < 9) return;
  c.font = `${weight} ${px}px P`; c.textAlign = align; c.textBaseline = base;
  const X = sx(gx), Y = sy(gy);
  c.lineJoin = 'round'; c.lineWidth = 0.1 * CAMV.z; c.strokeStyle = 'rgba(242,238,229,0.92)';
  c.strokeText(text, X, Y); c.fillStyle = color; c.fillText(text, X, Y);
  const w = c.measureText(text).width, x0 = align === 'left' ? X : align === 'right' ? X - w : X - w / 2;
  reg(id, text, x0, Y - px * 0.6, w, px * 1.2);
}

// ---------- drawing ----------
function drawPaper() {
  c.fillStyle = TABLE; c.fillRect(0, 0, W, H);
  const [x0, y0, x1, y1] = SHEET;
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 0.35 * CAMV.z;
  c.fillStyle = PAPER; c.fillRect(sx(x0), sy(y0), (x1 - x0) * CAMV.z, (y1 - y0) * CAMV.z);
  c.restore();
  c.save();
  c.beginPath(); c.rect(sx(x0), sy(y0), (x1 - x0) * CAMV.z, (y1 - y0) * CAMV.z); c.clip();
  const pat = c.createPattern(tex, 'repeat'), k = (2.4 * CAMV.z) / 512;
  pat.setTransform(new DOMMatrix([k, 0, 0, k, sx(0), sy(0)]));
  c.globalAlpha = 0.55; c.fillStyle = pat; c.fillRect(0, 0, W, H); c.globalAlpha = 1;
  c.restore();
}
function drawRiver(t) {}
function strokePath(pts, upto, col, widthG, dashed) {
  // walk the polyline to arc length `upto`
  c.beginPath();
  let acc = 0; c.moveTo(sx(pts[0][0]), sy(pts[0][1]));
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1], pts[i]], d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (acc + d >= upto) { const u = (upto - acc) / d; c.lineTo(sx(lerp(a[0], b[0], u)), sy(lerp(a[1], b[1], u))); break; }
    c.lineTo(sx(b[0]), sy(b[1])); acc += d;
  }
  c.strokeStyle = col; c.lineWidth = widthG * CAMV.z; c.lineCap = 'round'; c.lineJoin = 'round';
  c.setLineDash(dashed ? [0.16 * CAMV.z, 0.11 * CAMV.z] : []);
  c.stroke(); c.setLineDash([]);
}
function drawLines(t) {
  const tips = [];
  for (const L of LINES) {
    const [s, tip] = drawn(L, t);
    if (s <= 0) continue;
    strokePath(L.pts, s, COL[L.id], L.future ? 0.11 : (L.id === 'trunk' ? 0.19 : 0.15), !!L.future);
    if (tip) tips.push([pointAt(L, s), COL[L.id]]);
  }
  return tips;
}
function drawTip([p, col]) {
  const X = sx(p[0]), Y = sy(p[1]), z = CAMV.z;
  const g = c.createRadialGradient(X, Y, 0, X, Y, 0.8 * z);
  g.addColorStop(0, col + '73'); g.addColorStop(1, col + '00');
  c.fillStyle = g; c.beginPath(); c.arc(X, Y, 0.8 * z, 0, 7); c.fill();
  c.fillStyle = '#fff'; c.strokeStyle = col; c.lineWidth = 0.05 * z;
  c.beginPath(); c.arc(X, Y, 0.11 * z, 0, 7); c.fill(); c.stroke();
}
function stationColor(id) { for (const L of LINES) if (L.stops.includes(id) && L.stops[0] !== id) return COL[L.id]; for (const L of LINES) if (L.stops[0] === id) return COL[L.id]; return RED; }
function drawStations(t) {
  const z = CAMV.z;
  for (const [id, [x, y, name, kind, side]] of Object.entries(ST)) {
    const t0 = LIT[id]; if (t < t0) continue;
    const X = sx(x), Y = sy(y), col = stationColor(id), u = seg(t, t0, t0 + 0.28);
    if (kind === 'major') {
      // the interchange falls onto the paper, then rings in ink and red
      const f = seg(t, t0, t0 + 0.4), sc = lerp(3.4, 1, eio(f));
      for (const [rc, d] of [[INK, 0], [RED, 0.12]]) {
        const r = seg(t, t0 + 0.4 + d, t0 + 1.3 + d);
        if (r > 0 && r < 1) { c.globalAlpha = 1 - r; c.strokeStyle = rc; c.lineWidth = 0.05 * z; c.beginPath(); c.arc(X, Y, lerp(0.3, 2.2, r) * z, 0, 7); c.stroke(); c.globalAlpha = 1; }
      }
      c.save(); c.globalAlpha = clamp(f * 2, 0, 1);
      c.shadowColor = 'rgba(0,0,0,0.35)'; c.shadowBlur = (1 - f) * 0.6 * z; c.shadowOffsetY = (1 - f) * 0.4 * z;
      c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = 0.07 * z;
      c.beginPath(); c.arc(X, Y, 0.24 * sc * z, 0, 7); c.fill(); c.stroke(); c.restore();
    } else if (kind === 'hub' || kind === 'term') {
      const k = back(u);
      c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = 0.06 * z;
      c.beginPath(); c.arc(X, Y, 0.15 * k * z, 0, 7); c.fill(); c.stroke();
      if (id === 'thu') { c.fillStyle = RED; c.font = `700 ${0.17 * z}px P`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', X, Y + 0.01 * z); }
    } else {
      const k = lerp(0.6, 1, back(u));
      c.fillStyle = '#fff'; c.strokeStyle = col; c.lineWidth = 0.046 * z;
      c.beginPath(); c.arc(X, Y, 0.085 * k * z, 0, 7); c.fill(); c.stroke();
      const r = seg(t, t0, t0 + 0.6);
      if (r < 1) { c.globalAlpha = 1 - r; c.strokeStyle = col; c.lineWidth = 0.03 * z; c.beginPath(); c.arc(X, Y, lerp(0.1, 0.42, r) * z, 0, 7); c.stroke(); c.globalAlpha = 1; }
    }
    // printed name, wiping in after the stop lights
    c.globalAlpha = ss(seg(t, t0 + 0.1, t0 + 0.45));
    const size = kind === 'major' || kind === 'hub' ? 0.3 : kind === 'term' ? 0.26 : 0.2;
    const weight = kind === 'stop' ? 600 : 700;
    const color = id === 'holdT' ? COL.hold : id === 'hikeT' ? COL.hike : INK;
    if (side === 'e') label('st_' + id, name, x + 0.32, y, size, weight, color, 'left');
    else if (side === 'w') label('st_' + id, name, x - 0.36, y, size, weight, color, 'right');
    else if (side === 'n') label('st_' + id, name, x, y - 0.42, size, weight, color, 'center');
    else label('st_' + id, name, x, y + 0.45, size, weight, color, 'center');
    if (id === 'mpc') label('st_mpc2', 'Rate decision', x - 0.36, y + 0.4, 0.22, 600, RED, 'right');
    if (id === 'infl') label('st_infl2', 'target 3%', x + 0.32, y + 0.34, 0.2, 600, GREY, 'left');
    c.globalAlpha = 1;
  }
}
function drawTrains(t) {
  // white capsules on finished track: the network is alive
  const z = CAMV.z;
  for (const L of LINES) {
    if (!['fuel', 'food', 'rand', 'us', 'trunk'].includes(L.id)) continue;
    const done = L.ph[L.ph.length - 1][1]; if (t < done + 0.6) continue;
    const a = ss(seg(t, done + 0.6, done + 1.2));
    for (let k = 0; k < Math.ceil(L.len / 4); k++) {
      const s = ((t - done) * 1.6 + k * 4) % L.len, p = pointAt(L, s), q = pointAt(L, Math.min(L.len, s + 0.05));
      const ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
      c.save(); c.globalAlpha = a; c.translate(sx(p[0]), sy(p[1])); c.rotate(ang);
      c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = 0.026 * z;
      const w = 0.4 * z, h = 0.14 * z; c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, h / 2); c.fill(); c.stroke();
      c.fillStyle = COL[L.id]; for (const dx of [-0.1, 0, 0.1]) c.fillRect((dx - 0.032) * z, -0.028 * z, 0.064 * z, 0.056 * z);
      c.restore();
    }
  }
}
function drawFurniture(t) {
  // cartouche (the film's title, printed on the sheet) and the end block
  const z = CAMV.z;
  c.fillStyle = GOLD; c.fillRect(sx(0.2), sy(-2.1), 0.1 * z, 1.25 * z);
  const e = ss(seg(t, 48.4, 49.0));
  c.globalAlpha = 1 - e;
  if (e < 1) {
    label('title1', 'Decision day:', 0.55, -1.75, 0.5, 700, INK);
    label('title2', 'what feeds the rate', 0.55, -1.2, 0.5, 700, INK);
    c.globalAlpha = 0.9 * (1 - e); label('title3', 'Mzansi Money Matters · education, not financial advice', 0.57, -0.72, 0.17, 400, GREY);
  }
  if (e > 0) {
    c.globalAlpha = e;
    label('end1', 'Mzansi Money Matters', 0.55, -1.75, 0.5, 700, INK);
    label('end2', 'Know where your money is going.', 0.57, -1.2, 0.3, 600, GREY);
    label('end3', 'Education, not financial advice', 0.57, -0.72, 0.17, 400, GREY);
  }
  c.globalAlpha = 1;
  // callout under the hike terminal
  const a = ss(seg(t, 39.8, 40.4));
  if (a > 0) {
    c.globalAlpha = a; c.fillStyle = COL.hike; c.fillRect(sx(7.3), sy(13.45), 0.08 * z, 0.95 * z * a);
    label('callout1', '+R170', 7.55, 13.75, 0.46, 700, INK);
    label('callout2', 'a month on R1m', 7.57, 14.2, 0.2, 600, GREY);
    c.globalAlpha = 1;
  }
}

// ---------- screen space: counter and captions ----------
const ROWS = [
  ['Inflation (Sep)', '4.5%', 14.6, 15.4],
  ['Target', '3%', 16.6, 17.4],
  ['Repo rate', '7.25%', 20.4, 21.4],
  ['Prime', '10.75%', 22.4, 23.6],
];
function drawCounter(t) {
  const x = 40, y = 1110, w = 430, rh = 64, vis = ss(seg(t, 14.2, 14.8)) * (1 - ss(seg(t, 29.0, 29.6)));
  if (vis <= 0) return;
  const rows = ROWS.filter(r => t >= r[2] - 0.3);
  c.save(); c.globalAlpha = vis;
  c.fillStyle = '#23211F'; c.beginPath(); c.roundRect(x, y, w, 24 + rows.length * rh, 14); c.fill();
  c.fillStyle = '#6b655c'; for (const [qx, qy] of [[x + 12, y + 12], [x + w - 12, y + 12]]) { c.beginPath(); c.arc(qx, qy, 4, 0, 7); c.fill(); }
  rows.forEach(([name, val, t0, tland], i) => {
    const ry = y + 18 + i * rh;
    c.font = '600 24px P'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillStyle = '#E8E2D4';
    c.fillText(name, x + 26, ry + rh / 2); reg('cnt_' + i, name, x + 26, ry + 20, 190, 40);
    // drums: blurred spin until the sourced value lands
    const landed = t >= tland, chars = val.split('');
    let dx = x + w - 22 - chars.length * 30;
    chars.forEach((ch, j) => {
      c.fillStyle = '#F2EEE5'; c.beginPath(); c.roundRect(dx, ry + 8, 27, rh - 16, 5); c.fill();
      c.fillStyle = INK; c.font = '700 30px P'; c.textAlign = 'center';
      if (landed || !/[0-9]/.test(ch)) c.fillText(ch, dx + 13.5, ry + rh / 2 + 1);
      else { c.globalAlpha = vis * 0.35; for (let k = -1; k <= 1; k++) c.fillText(String((Math.floor(t * 30 + j * 3) + k + 10) % 10), dx + 13.5, ry + rh / 2 + k * 12); c.globalAlpha = vis; }
      dx += 30;
    });
    if (landed) reg('val_' + i, val, x + w - 22 - chars.length * 30, ry + 8, chars.length * 30, rh - 16);
  });
  c.restore();
}
function wrap(text, maxW) {
  const words = text.split(' '), lines = []; let cur = '';
  for (const wd of words) { const tr = cur ? cur + ' ' + wd : wd; if (c.measureText(tr).width > maxW && cur) { lines.push(cur); cur = wd; } else cur = tr; }
  if (cur) lines.push(cur); return lines;
}
function drawCaption(t) {
  const v = VO.find(([id, s, d]) => id !== 'v9' && t >= s - 0.05 && t < s + d + 0.45);
  if (!v) return;
  const [id, s, d, text] = v, a = ss(seg(t, s - 0.05, s + 0.15)) * (1 - ss(seg(t, s + d + 0.25, s + d + 0.45)));
  c.font = '600 44px P'; const lines = wrap(text, 880), lh = 58, bh = lines.length * lh + 40, by = 1590 - bh / 2;
  c.save(); c.globalAlpha = a;
  c.shadowColor = 'rgba(0,0,0,0.35)'; c.shadowBlur = 24; c.shadowOffsetY = 6;
  c.fillStyle = 'rgba(242,238,229,0.96)'; c.beginPath(); c.roundRect(60, by, W - 120, bh, 18); c.fill();
  c.restore(); c.save(); c.globalAlpha = a;
  c.fillStyle = INK; c.textAlign = 'center'; c.textBaseline = 'middle';
  lines.forEach((ln, i) => c.fillText(ln, W / 2, by + 20 + lh / 2 + i * lh));
  c.restore();
}
function drawGrade() {
  const g = c.createRadialGradient(W * 0.35, H * 0.3, H * 0.25, W / 2, H / 2, H * 0.85);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.24)');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
}

// ---------- sound and cue events ----------
const EV = [{ t: 0.15, type: 'chime' }, { t: 41.8, type: 'chime' }, { t: 50.2, type: 'chime_end' }];
for (const L of LINES) for (const [t0, t1] of L.ph) EV.push({ t: t0, type: 'draw', d: t1 - t0 });
for (const [id, t0] of Object.entries(LIT)) EV.push({ t: t0, type: id === 'mpc' ? 'hub' : 'stop', id });
for (const r of ROWS) EV.push({ t: r[3], type: 'tick' });
EV.push({ t: 39.8, type: 'callout' }, { t: 48.4, type: 'end' });
for (const [id, s] of VO) EV.push({ t: s, type: 'vo', id });
EV.sort((a, b) => a.t - b.t);

window.DUR = DUR;
window.EV = EV;
window.render = t => {
  REG = [];
  CAMV = camera(t);
  c.setTransform(1, 0, 0, 1, 0, 0);
  drawPaper(); drawRiver(t); drawFurniture(t);
  const tips = drawLines(t); drawTrains(t); drawStations(t); tips.forEach(drawTip);
  drawGrade(); drawCounter(t); drawCaption(t);
};
window.TEXTS = t => { window.render(t); return REG; };
document.fonts.load('700 40px P').then(() => document.fonts.load('600 40px P')).then(() => document.fonts.load('400 40px P')).then(() => { window.READY = true; });

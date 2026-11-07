// From your vote to your rates bill: a Transit Map film (simplified 2D build), 1080x1920 @ 30 fps.
// Contract: window.READY, window.render(t), window.DUR, window.EV, window.TEXTS(t).
const W = 1080, H = 1920;
const cv = document.getElementById('c'), c = cv.getContext('2d');
const PAPER = '#F2EEE5', INK = '#1B1C1E', GREY = '#4A4740', TABLE = '#1B1918';
const RIVER = '#BCD6EA', RIVER_EDGE = '#8FB5D6', RIVER_INK = '#5F88AD';
const RED = '#E3002B', GOLD = '#C9A227';
const COL = { main: RED, rates: '#0E8A4F', elec: '#F08C00', next: RED };

// ---------- timing (voice lines start; durations from voice/dur.json) ----------
const VO = [
  ['v1', 0.6, 4.933, "You voted on 4 November. Here's how that vote reaches your rates bill."],
  ['v2', 6.1, 4.055, 'First, the results. The IEC has seven days to declare them.'],
  ['v3', 10.8, 7.506, 'Then the new council meets and elects a mayor. Where no party has more than half the seats, that takes a coalition deal.'],
  ['v4', 19.0, 5.946, 'From the council, the lines run to your house. Property rates. Water. Refuse. Electricity.'],
  ['v5', 25.6, 4.955, 'Electricity is different. The regulator, NERSA, must approve every increase.'],
  ['v6', 31.2, 5.434, 'Around the end of March, the mayor tables a draft budget, and residents can comment.'],
  ['v7', 37.3, 4.408, 'Council must approve it before 1 July, with the new tariffs.'],
  ['v8', 42.4, 6.698, 'On 1 July 2027, the new rates reach your bill. Next stop: 2031.'],
  ['v9', 50.0, 3.342, 'Mzansi Money Matters. Know who sets your rates.'],
];
const DUR = 55.0;

// ---------- helpers ----------
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const ss = t => t * t * (3 - 2 * t);
const eio = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const back = (t, s = 1.6) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);

// ---------- network (G units) ----------
const ST = {
  vote: [5, 1, 'Your vote · 4 Nov', 'hub', 'w'],
  results: [5, 3.4, 'Results declared', 'stop', 'e'],
  council: [5, 6.4, 'New council', 'major', 'w'],
  ratesA: [3, 8.4, 'Property rates', 'stop', 'w'],
  ratesB: [3, 10.6, 'Water & refuse', 'stop', 'w'],
  elecA: [7, 8.4, 'Electricity', 'stop', 'e'],
  elecB: [7, 10.6, 'NERSA approval', 'stop', 'e'],
  budget: [5, 12.4, 'Draft budget · March', 'stop', 'e'],
  approve: [5, 14.6, 'Approved before 1 July', 'stop', 'e'],
  bill: [5, 16.8, 'Your bill · 1 July 2027', 'term', 'e'],
  next: [8.4, 1, '2031 · next vote', 'term', 's'],
};
const LINES = [
  { id: 'main', pts: [[5, 1], [5, 3.4], [5, 6.4], [5, 12.4], [5, 14.6], [5, 16.8]], stops: ['vote', 'results', 'council', 'budget', 'approve', 'bill'],
    ph: [[6.4, 7.9, 0, 1], [11.6, 14.4, 1, 2], [31.6, 33.6, 2, 3], [37.6, 39.0, 3, 4], [42.6, 44.0, 4, 5]] },
  { id: 'rates', pts: [[5, 6.4], [3, 8.4], [3, 10.6]], stops: ['council', 'ratesA', 'ratesB'], ph: [[19.8, 21.0, 0, 1], [21.6, 22.6, 1, 2]] },
  { id: 'elec', pts: [[5, 6.4], [7, 8.4], [7, 10.6]], stops: ['council', 'elecA', 'elecB'], ph: [[23.2, 24.4, 0, 1], [26.4, 27.8, 1, 2]] },
  { id: 'next', pts: [[5, 1], [8.4, 1]], stops: ['vote', 'next'], ph: [[46.4, 47.9, 0, 1]], future: true },
];
const RIVER_Y = [4.4, 5.2]; // coalition talks band (crossed by the main line in a tunnel)

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
const BANK_FALL = 14.5;
LIT.council = BANK_FALL;
LIT.vote = 1.2;

// ---------- camera keyframes [t, cx, cy, zoom px/G] ----------
const CAM = [
  [0, 3.6, -0.2, 170], [4.6, 3.9, 0.2, 165], [6.2, 5, 1.8, 165], [9.0, 5, 2.6, 160], [11.4, 5, 3.6, 160],
  [14.4, 5, 5.6, 150], [18.6, 5, 6.6, 140], [19.8, 5, 8.0, 112], [24.6, 5.2, 8.8, 112], [26.2, 5.4, 9.4, 118],
  [30.6, 5.4, 9.8, 118], [31.6, 5, 9.8, 120], [36.4, 5.2, 11.6, 135], [37.6, 5.2, 13.0, 140], [41.8, 5.2, 13.8, 140],
  [42.6, 5.2, 15.0, 145], [45.6, 5.6, 16.0, 140], [46.4, 5.6, 2.6, 118], [49.2, 5.2, 3.4, 108], [50.4, 5, 7.6, 80], [55.0, 5, 7.7, 78],
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
const SHEET = [-0.9, -2.6, 10.9, 18.4];

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
function drawRiver(t) {
  const [y0, y1] = RIVER_Y, X0 = sx(SHEET[0]), X1 = sx(SHEET[2]);
  c.fillStyle = RIVER; c.fillRect(X0, sy(y0), X1 - X0, (y1 - y0) * CAMV.z);
  c.fillStyle = RIVER_EDGE;
  c.fillRect(X0, sy(y0), X1 - X0, 0.025 * CAMV.z); c.fillRect(X0, sy(y1) - 0.025 * CAMV.z, X1 - X0, 0.025 * CAMV.z);
  if (t > 11.0) {
    c.globalAlpha = ss(seg(t, 11.0, 11.7));
    label('river', 'Coalition talks', 5.35, (y0 + y1) / 2, 0.24, 600, RIVER_INK);
    c.globalAlpha = 1;
  }
}
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
    if (L.id === 'main') {
      // tunnel under the coalition-talks band: dashed with ink casing
      const sA = RIVER_Y[0] - 1, sB = RIVER_Y[1] - 1;
      strokePath(L.pts, Math.min(s, sA), COL.main, 0.15, false);
      if (s > sA) {
        const p = [[5, RIVER_Y[0]], [5, Math.min(1 + s, RIVER_Y[1])]];
        for (const off of [-0.125, 0.125]) {
          c.globalAlpha = 0.55; strokePath(p.map(q => [q[0] + off, q[1]]), 9, INK, 0.02, false); c.globalAlpha = 1;
        }
        strokePath(p, 9, COL.main, 0.15, true);
      }
      if (s > sB) strokePath([[5, RIVER_Y[1]], [5, 16.8]], s - sB, COL.main, 0.15, false);
    } else strokePath(L.pts, s, COL[L.id], L.future ? 0.11 : 0.15, !!L.future);
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
function stationColor(id) { for (const L of LINES) if (L.stops.includes(id) && L.stops[0] !== id) return COL[L.id]; return COL.main; }
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
      if (id === 'next') { c.fillStyle = RED; c.font = `700 ${0.17 * z}px P`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', X, Y + 0.01 * z); }
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
    const color = kind === 'term' && id === 'bill' ? RED : INK;
    if (side === 'e') label('st_' + id, name, x + 0.32, y, size, weight, color, 'left');
    else if (side === 'w') label('st_' + id, name, x - 0.36, y, size, weight, color, 'right');
    else label('st_' + id, name, x, y + 0.45, size, weight, color, 'center');
    if (id === 'council') label('st_council2', 'Mayor elected', x - 0.36, y + 0.38, 0.22, 600, RED, 'right');
    c.globalAlpha = 1;
  }
}
function drawTrains(t) {
  // white capsules on finished track: the network is alive
  const z = CAMV.z;
  for (const L of LINES) {
    if (L.future || L.id === 'main') continue;
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
  const e = ss(seg(t, 50.0, 50.6));
  c.globalAlpha = 1 - e;
  if (e < 1) {
    label('title1', 'From your vote', 0.55, -1.75, 0.5, 700, INK);
    label('title2', 'to your rates bill', 0.55, -1.2, 0.5, 700, INK);
    c.globalAlpha = 0.9 * (1 - e); label('title3', 'Mzansi Money Matters · education, not financial advice', 0.57, -0.72, 0.17, 400, GREY);
  }
  if (e > 0) {
    c.globalAlpha = e;
    label('end1', 'Mzansi Money Matters', 0.55, -1.75, 0.5, 700, INK);
    label('end2', 'Know who sets your rates.', 0.57, -1.2, 0.3, 600, GREY);
    label('end3', 'Education, not financial advice', 0.57, -0.72, 0.17, 400, GREY);
  }
  c.globalAlpha = 1;
  // callout at the bill
  const a = ss(seg(t, 44.6, 45.2));
  if (a > 0) {
    c.globalAlpha = a; c.fillStyle = RED; c.fillRect(sx(5.9), sy(15.5), 0.1 * z, 1.25 * z * a);
    label('callout1', 'New tariffs', 6.2, 15.9, 0.46, 700, INK);
    label('callout2', 'rates · water · refuse · power', 6.22, 16.45, 0.2, 600, GREY);
    c.globalAlpha = 1;
  }
}

// ---------- screen space: counter and captions ----------
const ROWS = [
  ['Election', '4 Nov 2026', 1.6, 2.2],
  ['Budget', 'Mar 2027', 31.6, LIT.budget],
  ['New rates', '1 Jul 2027', 42.6, LIT.bill],
];
function drawCounter(t) {
  const x = 40, y = 150, w = 480, rh = 64, vis = ss(seg(t, 1.6, 2.2)) * (1 - ss(seg(t, 49.2, 49.9)));
  if (vis <= 0) return;
  const rows = ROWS.filter(r => t >= r[2] - 0.3);
  c.save(); c.globalAlpha = vis;
  c.fillStyle = '#23211F'; c.beginPath(); c.roundRect(x, y, w, 24 + rows.length * rh, 14); c.fill();
  c.fillStyle = '#6b655c'; for (const [qx, qy] of [[x + 12, y + 12], [x + w - 12, y + 12]]) { c.beginPath(); c.arc(qx, qy, 4, 0, 7); c.fill(); }
  rows.forEach(([name, val, t0, tland], i) => {
    const ry = y + 18 + i * rh;
    c.font = '600 24px P'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillStyle = '#E8E2D4';
    c.fillText(name, x + 26, ry + rh / 2); reg('cnt_' + i, name, x + 26, ry + 20, 160, 40);
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
const EV = [{ t: 0.15, type: 'chime' }, { t: 46.3, type: 'chime' }, { t: 51.8, type: 'chime_end' }];
for (const L of LINES) for (const [t0, t1] of L.ph) EV.push({ t: t0, type: 'draw', d: t1 - t0 });
for (const [id, t0] of Object.entries(LIT)) EV.push({ t: t0, type: id === 'council' ? 'hub' : 'stop', id });
for (const r of ROWS) EV.push({ t: r[3], type: 'tick' });
EV.push({ t: 44.6, type: 'callout' }, { t: 50.0, type: 'end' });
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

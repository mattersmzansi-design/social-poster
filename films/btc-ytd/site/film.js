// Bitcoin 2026 year to date: slow line chart, notes at key prices, June 30 level highlighted. 1080x1920, music only.
const W = 1080, H = 1920, c = document.getElementById('c').getContext('2d');
const BG = '#06262E', INK = '#E9F1F2', DIM = 'rgba(200,220,225,0.62)', GOLD = '#F7B32B', RED = '#FF5A5F', LINE = '#F7931A';
const N = DATA.length, T0 = 3.0, DRAW = 52, DUR = T0 + DRAW + 14;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1), ss = t => t * t * (3 - 2 * t);
const X0 = 110, X1 = 990, Y0 = 1460, Y1 = 560, PMIN = 50000, PMAX = 100000;
const xOf = i => X0 + (X1 - X0) * i / (N - 1), yOf = p => Y0 - (Y0 - Y1) * (p - PMIN) / (PMAX - PMIN);
const idx = d => DATA.findIndex(x => x[0] === d);
const J30 = 58523.93, NOW = DATA[N - 1][1], LOWTODAY = 55106;
const NOTES = [
  ['2026-01-01', 'Start of 2026', '$88,738', 'below'],
  ['2026-01-14', 'Year high (close)', '$96,955', 'above'],
  ['2026-02-06', 'February dip, low', '~$60,000', 'below'],
  ['2026-06-30', '30 June', '$58,524', 'below', true],
  ['2026-09-30', 'Recovery', '$83,556', 'above'],
];
const fmt = p => '$' + Math.round(p).toLocaleString('en-US');
let REG = [];
function txt(s, x, y, size, w, col, al = 'left') { c.font = `${w} ${size}px P`; c.textAlign = al; c.textBaseline = 'alphabetic'; c.fillStyle = col; c.fillText(s, x, y); REG.push({ text: s }); }
window.render = t => {
  REG = []; c.globalAlpha = 1; c.fillStyle = BG; c.fillRect(0, 0, W, H);
  c.fillStyle = LINE; c.fillRect(70, 110, 80, 7);
  txt('BITCOIN · 2026 YEAR TO DATE · US DOLLARS', 70, 165, 26, 600, DIM);
  txt('Bitcoin in 2026:', 70, 250, 68, 700, INK); txt('a new lower low', 70, 335, 68, 700, GOLD);
  txt('Daily closing price, 1 January to 21 November', 70, 395, 28, 400, DIM);
  // grid
  c.strokeStyle = 'rgba(160,200,210,0.13)'; c.lineWidth = 1;
  for (let p = 50000; p <= 100000; p += 10000) { const y = yOf(p); c.beginPath(); c.moveTo(X0, y); c.lineTo(X1, y); c.stroke(); txt('$' + p / 1000 + 'k', X0 - 14, y + 8, 22, 400, DIM, 'right'); }
  ['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov'].forEach((m, k) => { const i = idx(`2026-${String(1 + 2 * k).padStart(2, '0')}-01`); txt(m, xOf(i), Y0 + 44, 24, 600, DIM, 'center'); });
  const u = seg(t, T0, T0 + DRAW), upto = (N - 1) * u, iu = Math.floor(upto);
  // June 30 level line (appears when reached, stays)
  const j = idx('2026-06-30'), ja = ss(seg(t, T0 + DRAW * j / (N - 1), T0 + DRAW * j / (N - 1) + 1.2));
  if (ja > 0) {
    c.globalAlpha = ja; c.strokeStyle = GOLD; c.lineWidth = 3; c.setLineDash([14, 10]); c.beginPath(); c.moveTo(X0, yOf(J30)); c.lineTo(X1, yOf(J30)); c.stroke(); c.setLineDash([]);
    txt('30 June close: $58,524', X1, yOf(J30) - 14, 26, 700, GOLD, 'right'); c.globalAlpha = 1;
  }
  // price line
  if (t >= T0) {
    c.strokeStyle = LINE; c.lineWidth = 6; c.lineJoin = 'round'; c.lineCap = 'round'; c.beginPath();
    for (let i = 0; i <= iu; i++) { const x = xOf(i), y = yOf(DATA[i][1]); i ? c.lineTo(x, y) : c.moveTo(x, y); }
    if (iu < N - 1) { const f = upto - iu; c.lineTo(xOf(iu + f), yOf(DATA[iu][1] + (DATA[iu + 1][1] - DATA[iu][1]) * f)); }
    c.stroke();
    const k = Math.min(N - 1, Math.round(upto)), hx = xOf(upto), hy = yOf(DATA[k][1]);
    c.fillStyle = '#fff'; c.beginPath(); c.arc(hx, hy, 11, 0, 7); c.fill();
    // running price box
    c.globalAlpha = 1 - ss(seg(t, T0 + DRAW + 0.5, T0 + DRAW + 1.5));
    txt(new Date(DATA[k][0]).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), W / 2, 1630, 34, 600, DIM, 'center');
    txt(fmt(DATA[k][1]), W / 2, 1710, 72, 700, INK, 'center'); c.globalAlpha = 1;
  }
  // notes
  for (const [d, label, val, pos, hl] of NOTES) {
    const i = idx(d), tn = T0 + DRAW * i / (N - 1), a = ss(seg(t, tn, tn + 1.0)); if (a <= 0) continue;
    const x = xOf(i), y = yOf(DATA[i][1]), dy = pos === 'above' ? -70 : 80, al = x < 250 ? 'left' : x > 830 ? 'right' : 'center';
    c.globalAlpha = a; c.fillStyle = hl ? GOLD : '#fff'; c.beginPath(); c.arc(x, y, 9, 0, 7); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + dy * 0.55); c.stroke();
    txt(label, x, y + dy, 24, 600, hl ? GOLD : DIM, al); txt(val, x, y + dy + (pos === 'above' ? -30 : 32), 30, 700, hl ? GOLD : INK, al); c.globalAlpha = 1;
  }
  // today + comparison panel
  const ta = ss(seg(t, T0 + DRAW, T0 + DRAW + 1.2));
  if (ta > 0) {
    const x = xOf(N - 1), y = yOf(NOW); c.globalAlpha = ta;
    c.fillStyle = RED; c.beginPath(); c.arc(x, y, 13, 0, 7); c.fill();
    txt('Today', x, y + 62, 26, 700, RED, 'right'); txt(fmt(NOW), x, y + 96, 30, 700, INK, 'right');
    const pa = ss(seg(t, T0 + DRAW + 1.5, T0 + DRAW + 3));
    c.globalAlpha = pa; c.fillStyle = 'rgba(255,255,255,0.06)'; c.beginPath(); c.roundRect(60, 1560, W - 120, 250, 22); c.fill();
    txt('30 June close', 100, 1620, 28, 600, DIM); txt('$58,524', 100, 1672, 46, 700, GOLD);
    txt('Today (21 Nov, 09:50 SAST)', W - 100, 1620, 28, 600, DIM, 'right'); txt(fmt(NOW) + '  (−1.2%)', W - 100, 1672, 46, 700, RED, 'right');
    txt("Today's low of $55,106 is the lowest price of 2026 so far: a new lower low.", W / 2, 1735, 26, 600, INK, 'center');
    txt('Since 1 January: −34.9%  ·  From the January high: −40.4%', W / 2, 1782, 26, 600, DIM, 'center'); c.globalAlpha = 1;
  }
  txt('Source: Coinbase BTC-USD daily closes (UTC), cross-checked with CoinGecko · Education, not financial advice', W / 2, 1880, 19, 400, 'rgba(200,220,225,0.5)', 'center');
  c.fillStyle = GOLD; c.beginPath(); c.arc(990, 140, 30, 0, 7); c.fill(); txt('MMM', 990, 147, 17, 700, BG, 'center');
};
window.DUR = DUR;
window.EV = [{ t: 0.3, type: 'step' }, ...NOTES.map(n => ({ t: T0 + DRAW * idx(n[0]) / (N - 1), type: 'step' })), { t: T0 + DRAW, type: 'step' }];
window.TEXTS = t => { window.render(t); return REG; };
Promise.all(['700 40px P', '600 40px P', '400 40px P'].map(f => document.fonts.load(f))).then(() => { window.READY = true; });

// ANC vs DA, every election since 1994 (national + local). 1920x1080 @ 30 fps, music only.
const W = 1920, H = 1080;
const cv = document.getElementById('c'), c = cv.getContext('2d');
const BG = '#06262E', INK = '#E9F1F2', DIM = 'rgba(200,220,225,0.6)', ORANGE = '#F25C05', AMBER = '#F6B23A';
const ANC = '#F5C518', DA = '#2F8FE8';
// [year, type, ANC %, DA %]  N = national (IEC), L = local (ward + PR combined). DA figures for 1994/1999 are its predecessor, the Democratic Party.
const E = [
  [1994, 'N', 62.65, 1.73], [1999, 'N', 66.35, 9.56], [2000, 'L', 59.4, 22.1], [2004, 'N', 69.69, 12.37], [2006, 'L', 64.82, 16.24],
  [2009, 'N', 65.90, 16.66], [2011, 'L', 61.95, 23.94], [2014, 'N', 62.15, 22.23], [2016, 'L', 53.91, 26.90], [2019, 'N', 57.50, 20.77],
  [2021, 'L', 45.59, 21.66], [2024, 'N', 40.18, 21.81], [2026, 'L', 30.76, 24.64],
];
const T0 = 2.4, STEP = 2.0, DUR = T0 + STEP * E.length + 7.5;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const ss = t => t * t * (3 - 2 * t);
let REG = [];
function txt(id, s, x, y, size, weight, color, align = 'left', fam = 'P') { c.font = `${weight} ${size}px ${fam}`; c.textAlign = align; c.textBaseline = 'alphabetic'; c.fillStyle = color; c.fillText(s, x, y); REG.push({ id, text: s }); }

const X0 = 170, X1 = 1780, Y0 = 930, Y1 = 330;
const xOf = y => X0 + (X1 - X0) * (y - 1994) / (2026 - 1994);
const yOf = p => Y0 - (Y0 - Y1) * p / 80;

function line(col, idx, upto, t) {
  // draw polyline through points 0..upto with the last segment partially drawn
  c.strokeStyle = col; c.lineWidth = 7; c.lineJoin = 'round'; c.lineCap = 'round';
  c.beginPath();
  for (let i = 0; i <= Math.min(upto, E.length - 1); i++) {
    const x = xOf(E[i][0]), y = yOf(E[i][idx]);
    if (i === 0) c.moveTo(x, y);
    else {
      const u = i < upto ? 1 : clamp(t, 0, 1), px = xOf(E[i - 1][0]), py = yOf(E[i - 1][idx]);
      c.lineTo(px + (x - px) * u, py + (y - py) * u);
    }
  }
  c.stroke();
}

window.render = t => {
  REG = []; c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1;
  c.fillStyle = BG; c.fillRect(0, 0, W, H);
  c.fillStyle = ORANGE; c.fillRect(90, 52, 70, 6);
  txt('kick', 'SOUTH AFRICA  ·  EVERY NATIONAL AND LOCAL ELECTION  ·  1994–2026  ·  IEC RESULTS', 90, 92, 20, 600, DIM);
  txt('title', 'ANC vs DA: Share of the Vote', 90, 152, 54, 400, INK, 'left', 'S');
  txt('sub', 'National elections (filled dots) and local elections (open dots). 1994 and 1999: the DA\'s predecessor, the Democratic Party.', 90, 192, 22, 400, DIM);
  // legend
  c.fillStyle = ANC; c.fillRect(90, 216, 40, 8); txt('la', 'ANC', 140, 230, 22, 700, INK);
  c.fillStyle = DA; c.fillRect(230, 216, 40, 8); txt('ld', 'DA (DP before 2000)', 280, 230, 22, 700, INK);

  // grid
  c.strokeStyle = 'rgba(160,200,210,0.13)'; c.lineWidth = 1;
  [0, 20, 40, 60, 80].forEach(p => { c.beginPath(); c.moveTo(X0, yOf(p)); c.lineTo(X1, yOf(p)); c.stroke(); txt('g' + p, p + '%', X0 - 16, yOf(p) + 7, 20, 400, DIM, 'right'); });
  c.strokeStyle = 'rgba(246,178,58,0.7)'; c.setLineDash([10, 8]); c.lineWidth = 2; c.beginPath(); c.moveTo(X0, yOf(50)); c.lineTo(X1, yOf(50)); c.stroke(); c.setLineDash([]);
  txt('g50', '50% = majority', X1, yOf(50) - 10, 18, 600, AMBER, 'right');
  [1994, 1999, 2004, 2009, 2014, 2019, 2024].forEach(y => txt('x' + y, String(y), xOf(y), Y0 + 40, 20, 600, DIM, 'center'));

  const k = Math.floor((t - T0) / STEP), u = ((t - T0) % STEP) / 1.0;
  if (t >= T0) {
    const upto = Math.min(k, E.length - 1);
    line(ANC, 2, upto, u); line(DA, 3, upto, u);
    for (let i = 0; i <= upto; i++) {
      if (i === upto && u < 1 && i > 0) continue;
      const [y, ty, a, d] = E[i];
      for (const [v, col] of [[a, ANC], [d, DA]]) {
        const x = xOf(y), yy = yOf(v);
        c.beginPath(); c.arc(x, yy, 11, 0, 6.283);
        if (ty === 'N') { c.fillStyle = col; c.fill(); } else { c.fillStyle = BG; c.fill(); c.strokeStyle = col; c.lineWidth = 4; c.stroke(); }
      }
      // value labels for the current point (and keep last one)
      if (i === upto) {
        const la = ss(seg(t, T0 + i * STEP + 1.0, T0 + i * STEP + 1.4));
        c.globalAlpha = la;
        txt('va' + i, a.toFixed(1) + '%', xOf(y), yOf(a) - 24, 30, 700, ANC, 'center');
        txt('vd' + i, d.toFixed(1) + '%', xOf(y), yOf(d) + 46, 30, 700, DA, 'center');
        c.globalAlpha = 1;
      }
    }
    // current election tag, top right
    const [y, ty, a, d] = E[upto];
    txt('cy', String(y), W - 90, 150, 84, 700, INK, 'right');
    txt('ct', ty === 'N' ? 'NATIONAL ELECTION' : 'LOCAL ELECTION', W - 90, 190, 20, 700, AMBER, 'right');
    txt('co', `Other parties: ${(100 - a - d).toFixed(1)}%`, W - 90, 226, 22, 600, DIM, 'right');
  }

  txt('src', 'SOURCE: IEC RESULTS. NATIONAL = NATIONAL BALLOT; LOCAL = WARD + PR COMBINED (2000–2016 VIA WIKIPEDIA ELECTION PAGES; 2021, 2026 IEC DECLARATIONS). 1994–1999 DA = DEMOCRATIC PARTY.', W - 90, 1066, 13, 600, 'rgba(200,220,225,0.45)', 'right');

  // outro
  const ot = T0 + STEP * E.length + 0.6, e = ss(seg(t, ot, ot + 0.7));
  if (e > 0) {
    c.globalAlpha = e; c.fillStyle = BG; c.fillRect(0, 0, W, H);
    txt('o0', 'Over 30 years', W / 2, 260, 40, 600, DIM, 'center');
    txt('o1', 'ANC: 69.7% (2004) → 30.8% (2026)', W / 2, 400, 70, 700, ANC, 'center');
    txt('o2', 'DA: 1.7% (1994, as DP) → 24.6% (2026)', W / 2, 510, 70, 700, DA, 'center');
    txt('o3', 'Other parties: 44.6% of the vote in 2026', W / 2, 620, 46, 600, INK, 'center');
    txt('o4', 'Mzansi Money Matters', W / 2, 790, 44, 700, ORANGE, 'center');
    c.globalAlpha = 1;
  }
};
window.DUR = DUR;
window.EV = E.map((e, i) => ({ t: T0 + i * STEP, type: 'step' }));
window.TEXTS = t => { window.render(t); return REG; };
Promise.all(['700 40px P', '600 40px P', '400 40px P', '400 40px S'].map(f => document.fonts.load(f))).then(() => { window.READY = true; });

// Who leads the metros, 2000-2026: chart film in the style of "The Registration Gap", 1920x1080 @ 30 fps. Music only.
const W = 1920, H = 1080;
const cv = document.getElementById('c'), c = cv.getContext('2d');
const BG = '#06262E', GRID = 'rgba(160,200,210,0.13)', INK = '#E9F1F2', DIM = 'rgba(200,220,225,0.55)', ORANGE = '#F25C05', AMBER = '#F6B23A', TEAL = '#2E6F7C';

// [metro, short, [ [party, seats, total], ... per election ]]  source: IEC results via Wikipedia metro election pages; 2026 IEC data via esp.info
const YEARS = [2000, 2006, 2011, 2016, 2021, 2026];
const M = [
  ['Johannesburg', 'JHB', [['ANC', 128, 217], ['ANC', 136, 217], ['ANC', 153, 260], ['ANC', 121, 270], ['ANC', 91, 270], ['DA', 91, 270]]],
  ['Cape Town', 'CPT', [['DA', 107, 200], ['DA', 90, 210], ['DA', 135, 221], ['DA', 154, 231], ['DA', 135, 231], ['DA', 133, 235]]],
  ['Tshwane', 'TSH', [['ANC', 86, 152], ['ANC', 87, 152], ['ANC', 118, 210], ['DA', 93, 214], ['ANC', 75, 214], ['DA', 74, 214]]],
  ['Ekurhuleni', 'EKU', [['ANC', 99, 175], ['ANC', 108, 175], ['ANC', 125, 202], ['ANC', 109, 224], ['ANC', 86, 224], ['DA', 66, 224]]],
  ['eThekwini', 'ETH', [['ANC', 95, 200], ['ANC', 117, 200], ['ANC', 126, 205], ['ANC', 126, 219], ['ANC', 96, 222], ['MK', 86, 223]]],
  ['Nelson Mandela Bay', 'NMB', [['ANC', 72, 108], ['ANC', 81, 120], ['ANC', 63, 120], ['DA', 57, 120], ['ANC/DA', 48, 120], ['DA', 53, 120]]],
  ['Buffalo City', 'BCM', [['ANC', 73, 89], ['ANC', 73, 89], ['ANC', 71, 100], ['ANC', 60, 100], ['ANC', 61, 100], ['ANC', 42, 100]]],
  ['Mangaung', 'MAN', [['ANC', 60, 86], ['ANC', 65, 89], ['ANC', 65, 97], ['ANC', 58, 100], ['ANC', 51, 101], ['ANC', 35, 101]]],
];
const NOTE = [
  '2000 · The first 6 metro councils. 5 have a single-party majority; eThekwini is the exception',
  '2006 · Cape Town has no majority. The other 5 metros do',
  '2011 · Every metro has a single-party majority. Buffalo City and Mangaung become metros',
  '2016 · Johannesburg, Tshwane, Ekurhuleni and Nelson Mandela Bay go hung',
  '2021 · eThekwini joins them: 5 hung metros. Nelson Mandela Bay is a 48–48 tie',
  '2026 · Only Cape Town has a single-party majority. 7 of 8 metros are hung',
];
const T0 = 2.6, STEP = 4.8, DUR = T0 + STEP * 6 + 4.6;

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const ss = t => t * t * (3 - 2 * t);
const eio = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a, b, u) => a + (b - a) * u;
const maj = ([, s, tot]) => s > tot / 2;
const PC = { ANC: ['#F5C518', '#111111'], DA: ['#005BA6', '#9CC8F0'], MK: ['#1F7A3A', '#0B3D1C'] }; // fill, outline
const isMetro = (i, k) => !(i >= 6 && YEARS[k] < 2011); // Buffalo City and Mangaung became metros in 2011
const nMetros = k => (YEARS[k] < 2011 ? 6 : 8);

let REG = [];
function txt(id, s, x, y, size, weight, color, align = 'left', fam = 'P') {
  c.font = `${weight} ${size}px ${fam}`; c.textAlign = align; c.textBaseline = 'alphabetic'; c.fillStyle = color; c.fillText(s, x, y);
  const w = c.measureText(s).width; REG.push({ id, text: s, x0: align === 'left' ? x : align === 'right' ? x - w : x - w / 2, y0: y - size, x1: 0, y1: y });
}

function hatch(x, y, w, h, white) {
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  c.strokeStyle = white ? 'rgba(255,255,255,0.75)' : 'rgba(242,92,5,0.55)'; c.lineWidth = 3;
  for (let k = -h; k < w; k += 14) { c.beginPath(); c.moveTo(x + k, y + h); c.lineTo(x + k + h, y); c.stroke(); }
  c.restore();
}

window.render = t => {
  REG = []; c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1;
  c.fillStyle = BG; c.fillRect(0, 0, W, H);
  const k = Math.min(5, Math.max(-1, Math.floor((t - T0) / STEP))); // current election index (-1 = intro)
  const kt = t - (T0 + Math.max(0, k) * STEP);

  // header
  c.fillStyle = ORANGE; c.fillRect(90, 52, 70, 6);
  txt('kick', 'SOUTH AFRICA  ·  THE 8 METROS  ·  2000–2026  ·  IEC RESULTS', 90, 92, 20, 600, DIM);
  txt('title', 'Biggest Party in Each Metro', 90, 152, 54, 400, INK, 'left', 'S');
  txt('sub', 'Seats won by the largest party in each metro council, at each local election  ·  dashed line = majority (half the seats)', 90, 192, 22, 400, DIM);
  // legend
  [['ANC', 90], ['DA', 180], ['MK', 255]].forEach(([p, x]) => { c.fillStyle = PC[p][0]; c.fillRect(x, 214, 22, 16); c.strokeStyle = PC[p][1]; c.lineWidth = 2; c.strokeRect(x, 214, 22, 16); txt('lp' + p, p, x + 30, 230, 18, 700, DIM); });
  c.fillStyle = '#888'; c.fillRect(340, 214, 22, 16); txt('lg1', 'SOLID = MAJORITY', 370, 230, 18, 600, DIM);
  c.fillStyle = 'rgba(136,136,136,0.5)'; c.fillRect(560, 214, 22, 16); hatch(560, 214, 22, 16, true); txt('lg2', 'STRIPED = HUNG (NO MAJORITY)', 590, 230, 18, 600, DIM);

  // note line
  if (k >= 0) { c.globalAlpha = ss(seg(kt, 0.1, 0.6)); txt('note', NOTE[k], 90, 282, 26, 600, INK); c.globalAlpha = 1; }

  // big number top right
  if (k >= 0) {
    const n = M.filter((m, i) => isMetro(i, k) && maj(m[2][k])).length;
    c.globalAlpha = ss(seg(kt, 0.9, 1.4));
    txt('big', `${n} of ${nMetros(k)}`, W - 90, 168, 86, 700, INK, 'right');
    txt('bigl', 'METROS WITH A SINGLE-PARTY MAJORITY', W - 90, 204, 18, 700, AMBER, 'right');
    txt('bigy', `${YEARS[k]} local election`, W - 90, 234, 20, 600, AMBER, 'right');
    c.globalAlpha = 1;
  }

  // chart
  const X0 = 170, X1 = W - 90, Y0 = 950, Y1 = 330, cw = (X1 - X0) / 8, bw = cw * 0.56;
  const yOf = p => Y0 - (Y1 > 0 ? (Y0 - Y1) * p / 100 : 0);
  c.strokeStyle = GRID; c.lineWidth = 1;
  [0, 25, 50, 75, 100].forEach(p => { c.beginPath(); c.moveTo(X0 - 10, yOf(p)); c.lineTo(X1, yOf(p)); c.stroke(); txt('g' + p, p + '%', X0 - 20, yOf(p) + 7, 18, 400, DIM, 'right'); });
  txt('ylab', 'SHARE OF COUNCIL SEATS', 90, Y1 - 24, 16, 600, DIM);
  // majority line
  c.strokeStyle = 'rgba(246,178,58,0.85)'; c.setLineDash([10, 8]); c.lineWidth = 2.5; c.beginPath(); c.moveTo(X0 - 10, yOf(50)); c.lineTo(X1, yOf(50)); c.stroke(); c.setLineDash([]);

  M.forEach(([name, , data], i) => {
    const cx = X0 + cw * i + cw / 2, x = cx - bw / 2;
    // metro label
    txt('m' + i, name, cx, Y0 + 40, name.length > 14 ? 21 : 24, 600, INK, 'center');
    // full-council outline (dashed), like the example's eligible-population box
    c.strokeStyle = 'rgba(200,220,225,0.22)'; c.setLineDash([6, 6]); c.lineWidth = 1.5; c.strokeRect(x, yOf(100), bw, Y0 - yOf(100)); c.setLineDash([]);
    if (k < 0) return;
    if (!isMetro(i, k)) { c.globalAlpha = ss(seg(kt, 0.3, 0.8)); txt('nm' + i, 'not yet', cx, Y0 - 60, 20, 600, DIM, 'center'); txt('nm2' + i, 'a metro', cx, Y0 - 34, 20, 600, DIM, 'center'); c.globalAlpha = 1; return; }
    const cur = data[k], fresh = k === 0 || !isMetro(i, k - 1), prev = !fresh ? data[k - 1] : ['', 0, cur[2]];
    const u = eio(seg(kt, 0.2 + i * 0.07, 1.2 + i * 0.07));
    const p = lerp(100 * prev[1] / prev[2], 100 * cur[1] / cur[2], u), top = yOf(p), h = Y0 - top;
    const showCur = u > 0.5 || fresh, party = showCur ? cur[0] : prev[0], isMaj = showCur ? maj(cur) : maj(prev);
    c.globalAlpha = isMaj ? 1 : 0.6;
    if (party === 'ANC/DA') { c.fillStyle = PC.ANC[0]; c.fillRect(x, top, bw / 2, h); c.fillStyle = PC.DA[0]; c.fillRect(x + bw / 2, top, bw / 2, h); }
    else { c.fillStyle = (PC[party] || PC.ANC)[0]; c.fillRect(x, top, bw, h); }
    c.globalAlpha = 1;
    if (!isMaj) hatch(x, top, bw, h, true);
    c.strokeStyle = party === 'ANC/DA' ? '#111' : (PC[party] || PC.ANC)[1]; c.lineWidth = 3; c.strokeRect(x, top, bw, h);
    const seats = Math.round(lerp(prev[1], cur[1], u));
    c.globalAlpha = ss(seg(kt, 0.9 + i * 0.07, 1.4 + i * 0.07));
    const lab = cur[0] === 'ANC/DA' ? 'ANC = DA' : cur[0];
    txt('pt' + i, lab, cx, top - 44, lab.length > 3 ? 22 : 28, 700, INK, 'center');
    txt('st' + i, cur[0] === 'ANC/DA' ? '48 each/120' : `${seats}/${cur[2]}`, cx, top - 16, 22, 600, AMBER, 'center');
    if (!maj(cur)) txt('hg' + i, 'HUNG', cx, Math.min(Y0 - 14, top + 34), 20, 700, '#FFFFFF', 'center');
    c.globalAlpha = 1;
  });

  // year axis ticker (progress)
  YEARS.forEach((y, j) => { const on = j <= k; txt('y' + j, String(y), X0 + j * 92, 1036, 22, on ? 700 : 400, j === k ? ORANGE : on ? INK : 'rgba(200,220,225,0.3)'); });

  // footer
  txt('src', 'SOURCE: IEC RESULTS (2000–2021 VIA WIKIPEDIA METRO ELECTION PAGES; 2026 IEC DATA VIA ESP.INFO, 8 NOV 2026)  ·  LARGEST PARTY SHOWN, NOT ALWAYS THE GOVERNING PARTY  ·  METRO COUNCILS CREATED IN 2000; BUFFALO CITY & MANGAUNG METROS FROM 2011', W - 90, 1070, 13, 600, 'rgba(200,220,225,0.45)', 'right');
  // brand
  c.fillStyle = AMBER; c.beginPath(); c.arc(W - 116, 1020, 24, 0, 6.283); c.fill(); txt('mmm', 'MMM', W - 116, 1025, 13, 700, BG, 'center');

  // outro
  const e = ss(seg(t, DUR - 3.4, DUR - 2.6));
  if (e > 0) {
    c.globalAlpha = e; c.fillStyle = BG; c.fillRect(0, 0, W, H); c.globalAlpha = e;
    txt('o1', '8 of 8 → 1 of 8', W / 2, 470, 110, 700, INK, 'center');
    txt('o2', 'Metros with a single-party majority: all 8 in 2011, one in 2026', W / 2, 540, 32, 600, AMBER, 'center');
    txt('o3', 'Coalition deals will now set rates and tariffs in 7 of our 8 biggest cities.', W / 2, 610, 30, 400, INK, 'center');
    txt('o4', 'Mzansi Money Matters', W / 2, 760, 44, 700, ORANGE, 'center');
    c.globalAlpha = 1;
  }
};
window.DUR = DUR;
window.EV = YEARS.map((y, j) => ({ t: T0 + j * STEP, type: 'step' }));
window.TEXTS = t => { window.render(t); return REG; };
Promise.all(['700 40px P', '600 40px P', '400 40px P', '400 40px S'].map(f => document.fonts.load(f))).then(() => { window.READY = true; });

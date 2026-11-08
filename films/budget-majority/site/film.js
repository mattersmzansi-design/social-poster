// Who can pass your city's budget? 2026 council seats in the 8 metros. 1080x1920 @ 30 fps, music only.
const W = 1080, H = 1920;
const cv = document.getElementById('c'), c = cv.getContext('2d');
const BG = '#06262E', INK = '#E9F1F2', DIM = 'rgba(200,220,225,0.6)', ORANGE = '#F25C05', AMBER = '#F6B23A';
// badge colours (fill, outline)
const PC = {
  ANC: ['#F5C518', '#111111', 'African National Congress'], DA: ['#005BA6', '#9CC8F0', 'Democratic Alliance'],
  MK: ['#1F7A3A', '#0B3D1C', 'uMkhonto weSizwe Party'], EFF: ['#C8102E', '#5E0716', 'Economic Freedom Fighters'],
  ActionSA: ['#00A3AD', '#00575C', 'ActionSA'], 'FF+': ['#F28C28', '#7A3E06', 'Freedom Front Plus'],
  IFP: ['#8B1E3F', '#3F0B1B', 'Inkatha Freedom Party'], UDM: ['#6A1B9A', '#2E0A44', 'United Democratic Mvt'],
  SACP: ['#8D6E63', '#3E2723', 'SA Communist Party'], Others: ['#59656B', '#2A3236', 'Others'],
};
// Rule: parties with at least 5% of council seats are named; the rest are grouped as Others. Source: IEC data via esp.info, 8 Nov 2026.
const METROS = [
  ['Johannesburg', 270, [['DA', 91], ['ANC', 63], ['ActionSA', 43], ['EFF', 17], ['MK', 15], ['Others', 41, 16]]],
  ['Tshwane', 214, [['DA', 74], ['ActionSA', 48], ['ANC', 44], ['FF+', 17], ['EFF', 13], ['Others', 18, 11]]],
  ['Ekurhuleni', 224, [['DA', 66], ['ANC', 59], ['ActionSA', 40], ['MK', 15], ['EFF', 14], ['Others', 30, 13]]],
  ['Cape Town', 235, [['DA', 133], ['ANC', 33], ['Others', 69, 20]]],
  ['eThekwini', 223, [['MK', 86], ['DA', 57], ['ANC', 37], ['IFP', 15], ['Others', 28, 16]]],
  ['Nelson Mandela Bay', 120, [['DA', 53], ['ANC', 32], ['EFF', 7], ['Others', 28, 15]]],
  ['Buffalo City', 100, [['ANC', 42], ['UDM', 19], ['DA', 17], ['EFF', 7], ['SACP', 5], ['Others', 10]]],
  ['Mangaung', 101, [['ANC', 35], ['DA', 34], ['EFF', 9], ['FF+', 6], ['Others', 17, 11]]],
];
const T0 = 3.2, SCREEN = 7.2, DUR = T0 + 4 * SCREEN + 6.4;

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const ss = t => t * t * (3 - 2 * t);
const eio = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
let REG = [];
function txt(id, s, x, y, size, weight, color, align = 'left', fam = 'P') {
  c.font = `${weight} ${size}px ${fam}`; c.textAlign = align; c.textBaseline = 'alphabetic'; c.fillStyle = color; c.fillText(s, x, y);
  REG.push({ id, text: s });
}
function wrapTxt(id, s, x, y, maxW, size, weight, color, lh) {
  c.font = `${weight} ${size}px P`; const words = s.split(' '); let line = '', yy = y;
  for (const w of words) { const t = line ? line + ' ' + w : w; if (c.measureText(t).width > maxW && line) { txt(id, line, x, yy, size, weight, color); line = w; yy += lh; } else line = t; }
  if (line) txt(id, line, x, yy, size, weight, color); return yy;
}

function header() {
  c.fillStyle = ORANGE; c.fillRect(70, 90, 70, 7);
  txt('k', 'SOUTH AFRICA · 2026 LOCAL ELECTIONS · IEC RESULTS', 70, 140, 24, 600, DIM);
  txt('t1', 'Who can pass your', 70, 220, 64, 400, INK, 'left', 'S');
  txt('t2', "city's budget?", 70, 292, 64, 400, INK, 'left', 'S');
  wrapTxt('sub', 'Seats in each metro council. A budget needs the votes of more than half of ALL councillors (Constitution, s160).', 70, 350, 940, 28, 400, DIM, 38);
}

function metro(m, y0, a, t0, t) {
  const [name, total, parts] = m, need = Math.floor(total / 2) + 1, top = parts[0], hasMaj = top[1] >= need;
  c.globalAlpha = a;
  txt('n' + name, name, 70, y0, 46, 700, INK);
  txt('tot' + name, `${total} seats`, 1010, y0, 30, 600, DIM, 'right');
  // stacked bar
  const bx = 70, bw = 940, by = y0 + 30, bh = 92, u = eio(seg(t, t0 + 0.3, t0 + 1.6));
  c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(bx, by, bw, bh);
  let x = bx;
  parts.forEach(([p, s]) => {
    const w = bw * s / total * u; if (w <= 0) return;
    c.fillStyle = PC[p][0]; c.fillRect(x, by, w, bh); c.strokeStyle = PC[p][1]; c.lineWidth = 2; c.strokeRect(x + 1, by + 1, w - 2, bh - 2);
    if (u >= 1 && w > 70) { const dark = p === 'ANC' || p === 'FF+'; txt('s' + name + p, String(s), x + w / 2, by + bh / 2 + 14, 38, 700, dark ? '#111' : '#FFF', 'center'); }
    x += w;
  });
  // majority marker
  const mx = bx + bw * need / total, ma = ss(seg(t, t0 + 1.6, t0 + 2.1));
  c.globalAlpha = a * ma; c.strokeStyle = '#FFFFFF'; c.lineWidth = 5; c.setLineDash([12, 8]); c.beginPath(); c.moveTo(mx, by - 10); c.lineTo(mx, by + bh + 14); c.stroke(); c.setLineDash([]);
  txt('mk' + name, `▲ majority: ${need}`, clamp(mx, 170, 910), by + bh + 44, 24, 700, '#FFFFFF', 'center');
  // legend rows
  const la = ss(seg(t, t0 + 1.8, t0 + 2.6)); c.globalAlpha = a * la;
  let ly = by + bh + 100;
  parts.forEach(([p, s, n], i) => {
    const col = i % 2, row = Math.floor(i / 2), lx = 70 + col * 470, yy = ly + row * 46;
    c.fillStyle = PC[p][0]; c.fillRect(lx, yy - 26, 30, 30); c.strokeStyle = PC[p][1]; c.lineWidth = 2; c.strokeRect(lx, yy - 26, 30, 30);
    const label = p === 'Others' ? (n ? `Others (${n} parties)` : 'Others') : `${p === 'ActionSA' ? 'ActionSA' : PC[p][2]}`;
    txt('l' + name + p, label, lx + 44, yy, 25, 600, INK);
    txt('lv' + name + p, String(s), lx + 440, yy, 25, 700, AMBER, 'right');
  });
  const rows = Math.ceil(parts.length / 2), sy = ly + rows * 46 + 30, sa = ss(seg(t, t0 + 2.8, t0 + 3.4));
  c.globalAlpha = a * sa;
  const line = hasMaj ? `${top[0]} has a majority: ${top[1]} of ${total}.` : `A budget needs ${need} of ${total} seats. No party has it.`;
  txt('ln' + name, line, 70, sy, 32, 700, hasMaj ? '#7FE3A2' : AMBER);
  c.globalAlpha = 1;
}

window.render = t => {
  REG = []; c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1;
  c.fillStyle = BG; c.fillRect(0, 0, W, H);
  header();
  // intro
  const ia = ss(seg(t, 0.3, 0.9)) * (1 - ss(seg(t, T0 - 0.4, T0)));
  if (ia > 0) {
    c.globalAlpha = ia;
    txt('i1', '8 metros.', 70, 760, 92, 700, INK); txt('i2', '1 has a', 70, 870, 92, 700, INK); txt('i3', 'single-party majority.', 70, 980, 72, 700, AMBER);
    wrapTxt('i4', 'Here is every council, seat by seat.', 70, 1080, 940, 38, 600, DIM, 48);
    c.globalAlpha = 1;
  }
  // screens
  for (let s = 0; s < 4; s++) {
    const st = T0 + s * SCREEN, a = ss(seg(t, st, st + 0.5)) * (1 - ss(seg(t, st + SCREEN - 0.5, st + SCREEN)));
    if (a <= 0) continue;
    metro(METROS[2 * s], 520, a, st, t);
    metro(METROS[2 * s + 1], 1100, a, st + 0.4, t);
  }
  // outro
  const ot = T0 + 4 * SCREEN, oa = ss(seg(t, ot, ot + 0.6));
  if (oa > 0) {
    c.globalAlpha = oa;
    wrapTxt('o1', 'In 7 of 8 metros, no party can pass a budget alone.', 70, 640, 940, 60, 700, INK, 74);
    wrapTxt('o2', 'These councils will set your rates, water and electricity tariffs from 1 July 2027.', 70, 900, 940, 40, 600, AMBER, 54);
    wrapTxt('o3', 'Seats, not mayors: mayors are elected at each council\'s first sitting, within 14 days.', 70, 1110, 940, 32, 400, DIM, 44);
    txt('o4', 'Mzansi Money Matters', 70, 1320, 54, 700, ORANGE);
    c.globalAlpha = 1;
  }
  // footer
  wrapTxt('src', 'Source: IEC seat allocations, 8 Nov 2026 (IEC data via esp.info). Parties with 5%+ of seats named; the rest grouped as Others. Each council adds up to its total.', 70, 1810, 940, 20, 600, 'rgba(200,220,225,0.5)', 28);
  c.fillStyle = AMBER; c.beginPath(); c.arc(1000, 110, 28, 0, 6.283); c.fill(); txt('mmm', 'MMM', 1000, 116, 16, 700, BG, 'center');
};
window.DUR = DUR;
window.EV = [{ t: 0.3, type: 'step' }, ...[0, 1, 2, 3].map(s => ({ t: T0 + s * SCREEN, type: 'step' })), { t: T0 + 4 * SCREEN, type: 'step' }];
window.TEXTS = t => { window.render(t); return REG; };
Promise.all(['700 40px P', '600 40px P', '400 40px P', '400 40px S'].map(f => document.fonts.load(f))).then(() => { window.READY = true; });

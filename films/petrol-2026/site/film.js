// "The year petrol hit R30": a 3D data film (three.js), 1080x1920 @ 30 fps.
// Contract: window.READY, window.render(t), window.DUR, window.EV.
import * as THREE from 'three';

const TL = await (await fetch('timeline.json')).json();
const S = TL.start, D = TL.dur, DUR = TL.DUR;
await document.fonts.load('700 40px P'); await document.fonts.load('600 40px P'); await document.fonts.load('400 40px P');
const W = 1080, H = 1920;
const GREEN = 0x0e6838, GOLD = 0xd9ae3a, RED = 0xe3002b, AMBER = 0xffa62b, PAPER = '#F2EEE5', INK = '#1B1C1E';

// ---------- data (sources in FACTS.md) ----------
const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
const P = [20.75, 20.10, 20.30, 23.36, 26.63, 28.06, 26.10, 25.58, 26.92, 30.25, null];
const RELIEF = [0, 0, 0, 3, 3, 1.5, 0, 0, 0, 0, 0];
const CPI = [3.5, 3.0, 3.1, 4.0, 4.5, 5.0, 4.3, 4.4, 4.5];
const OIL = [[1, '$66', 66], [2, '$101-108', 105], [4, '$100+', 101], [5, '$91', 91], [8, '$95-99', 97]];
const X = i => i * 2.3, K = 0.28;

// ---------- helpers ----------
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const ss = t => t * t * (3 - 2 * t);
const back = (t, s = 1.4) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2));

// ---------- renderer and scene ----------
const gl = document.createElement('canvas');
const renderer = new THREE.WebGLRenderer({ canvas: gl, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x15110e);
scene.fog = new THREE.Fog(0x15110e, 34, 80);
const cam = new THREE.PerspectiveCamera(46, W / H, 0.1, 200);

scene.add(new THREE.HemisphereLight(0xfff1dc, 0x1a1410, 0.75));
const sun = new THREE.DirectionalLight(0xffffff, 2.4);
sun.position.set(-10, 22, 14); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 70 });
sun.target.position.set(12, 0, 0); scene.add(sun, sun.target);
const rim = new THREE.PointLight(0xffc56b, 60, 40); rim.position.set(12, 9, -9); scene.add(rim);

const floor = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), new THREE.MeshStandardMaterial({ color: 0x1e1a17, roughness: 0.95 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const plinth = new THREE.Mesh(new THREE.BoxGeometry(27, 0.5, 9), new THREE.MeshStandardMaterial({ color: 0xe9e2d2, roughness: 0.82 }));
plinth.position.set(11.5, 0.25, 0.6); plinth.receiveShadow = true; plinth.castShadow = true; scene.add(plinth);
const TOP = 0.5;

// ---------- text sprites (canvas textures) ----------
function textSprite(lines, { h = 0.6, color = INK, bg = null, weight = 700, sub = null, subColor = '#4A4740', pad = 18 } = {}) {
  const cvs = document.createElement('canvas'), g = cvs.getContext('2d');
  const fs = 96, sfs = 56;
  g.font = `${weight} ${fs}px P`;
  const w1 = g.measureText(lines).width; g.font = `600 ${sfs}px P`;
  const w2 = sub ? g.measureText(sub).width : 0;
  cvs.width = Math.ceil(Math.max(w1, w2) + pad * 2); cvs.height = Math.ceil(fs * 1.25 + (sub ? sfs * 1.3 : 0) + pad * 2);
  if (bg) { g.fillStyle = bg; g.beginPath(); g.roundRect(0, 0, cvs.width, cvs.height, 28); g.fill(); }
  g.textBaseline = 'top'; g.fillStyle = color; g.font = `${weight} ${fs}px P`; g.fillText(lines, pad, pad);
  if (sub) { g.fillStyle = subColor; g.font = `600 ${sfs}px P`; g.fillText(sub, pad, pad + fs * 1.22); }
  const tex = new THREE.CanvasTexture(cvs); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }));
  const scale = h / (fs * 1.25 + pad * 2); sp.scale.set(cvs.width * scale * (sub ? 1 : 1), cvs.height * scale, 1);
  sp.center.set(0.5, 0); sp.renderOrder = 10;
  return sp;
}

// ---------- towers ----------
const towers = [];
const greenMat = new THREE.MeshStandardMaterial({ color: GREEN, roughness: 0.42, metalness: 0.08 });
const goldMat = new THREE.MeshStandardMaterial({ color: GOLD, roughness: 0.28, metalness: 0.65 });
const redMat = new THREE.MeshStandardMaterial({ color: RED, roughness: 0.3, metalness: 0.4, emissive: 0x5a0010 });
P.forEach((p, i) => {
  const grp = new THREE.Group(); grp.position.set(X(i), TOP, 0); scene.add(grp);
  const T = { grp, p, i };
  if (p != null) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1, 1.3), greenMat); body.castShadow = true; body.receiveShadow = true;
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.14, 1.38), i === 9 ? redMat : goldMat); cap.castShadow = true;
    const lab = textSprite('R' + p.toFixed(2), { h: 0.62, color: i === 9 ? '#E3002B' : '#F2EEE5' });
    grp.add(body, cap, lab); Object.assign(T, { body, cap, lab });
    if (RELIEF[i]) {
      const gh = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1, 1.3), new THREE.MeshStandardMaterial({ color: GOLD, transparent: true, opacity: 0.22, roughness: 0.2, depthWrite: false }));
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.3, 1, 1.3)), new THREE.LineBasicMaterial({ color: GOLD, transparent: true }));
      const glab = textSprite('+R' + (RELIEF[i] % 1 ? RELIEF[i].toFixed(2) : RELIEF[i]), { h: 0.42, color: '#D9AE3A', sub: 'without levy cut', subColor: '#BFA36A' });
      grp.add(gh, edges, glab); Object.assign(T, { gh, edges, glab });
    }
  } else {
    // November: outline only, official price due 4 Nov
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.3, 30.25 * K, 1.3)), new THREE.LineDashedMaterial({ color: 0xf2eee5, dashSize: 0.25, gapSize: 0.18, transparent: true }));
    edges.computeLineDistances(); edges.position.y = 30.25 * K / 2;
    const lab = textSprite('?', { h: 0.9, color: '#F2EEE5', sub: 'official price: 4 Nov' });
    lab.position.y = 30.25 * K + 0.3; grp.add(edges, lab); Object.assign(T, { edges, lab });
  }
  const mon = textSprite(M[i], { h: 0.5, color: '#2a2622', weight: 700 }); mon.position.set(0, 0.02, 3.55); grp.add(mon); T.mon = mon;
  towers.push(T);
});

// ---------- CPI pillars (front row) ----------
const cpiMat = new THREE.MeshStandardMaterial({ color: GOLD, roughness: 0.3, metalness: 0.55 });
const pillars = CPI.map((v, i) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 1, 32), cpiMat); m.castShadow = true;
  const lab = textSprite(v.toFixed(1) + '%', { h: 0.42, color: '#F2EEE5' });
  const g = new THREE.Group(); g.position.set(X(i), TOP, 2.45); g.add(m, lab); scene.add(g);
  return { g, m, lab, v, i };
});
const cpiTitle = textSprite('Inflation (CPI, year on year)', { h: 0.48, color: '#D9AE3A' }); cpiTitle.position.set(X(0) - 0.6, TOP + 3.9, 2.45); cpiTitle.center.set(0, 0); scene.add(cpiTitle);

// ---------- oil beads (behind) ----------
const oilY = v => 10.2 + (v - 60) * 0.045;
const beads = OIL.map(([i, label, v]) => {
  const s = new THREE.Mesh(new THREE.SphereGeometry(0.34, 32, 16), new THREE.MeshStandardMaterial({ color: AMBER, emissive: AMBER, emissiveIntensity: 1.2, roughness: 0.3 }));
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 8), new THREE.MeshBasicMaterial({ color: 0x8a5a1a, transparent: true }));
  const lab = textSprite(label, { h: 0.46, color: '#FFB347' });
  const g = new THREE.Group(); g.position.set(X(i), 0, -3.3); g.add(s, stem, lab); scene.add(g);
  s.position.y = oilY(v); stem.scale.y = oilY(v) - TOP; stem.position.y = TOP + stem.scale.y / 2; lab.position.y = oilY(v) + 0.45;
  return { g, s, stem, lab, i };
});
const oilTitle = textSprite('Brent oil, US$ a barrel', { h: 0.46, color: '#FFB347' }); oilTitle.center.set(0, 0); oilTitle.position.set(X(0) - 0.6, 13.4, -3.3); scene.add(oilTitle);

// ---------- event flags ----------
function flag(x, z, y, text, sub, col) {
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, y, 8), new THREE.MeshStandardMaterial({ color: 0xcfc6b4 }));
  pole.position.set(0, y / 2, 0);
  const card = textSprite(text, { h: 0.5, color: '#FFFFFF', bg: col, sub, subColor: '#F2EEE5', weight: 700 });
  card.position.y = y; const g = new THREE.Group(); g.position.set(x, TOP, z); g.add(pole, card); scene.add(g);
  return g;
}
const FLAGS = [
  { g: flag(X(1) + 1.1, -1.2, 9.6, '28 Feb', 'strikes on Iran', '#B3001F'), t0: S.v04 + 1.5 },
  { g: flag(X(3) + 0.9, 1.4, 9.4, 'Apr-Jun', 'R3/l levy cut', '#8C6D1F'), t0: S.v05 + 8.4 },
  { g: flag(X(4) + 0.95, 1.2, 10.5, 'May', 'rate hike: 7.00%', '#1B1C1E'), t0: S.v12 + 2.0 },
  { g: flag(X(8) + 0.95, 1.2, 10.3, 'Sep', 'rate hike: 7.25%', '#1B1C1E'), t0: S.v12 + 4.4 },
  { g: flag(X(10) + 0.95, 1.0, 10.6, '4 Nov', 'levy cut: R1.50/l', '#0E6838'), t0: S.v13 + 0.6 },
];

// ---------- growth schedule ----------
const GROW = [S.v03 + 0.8, S.v03 + 2.6, S.v03 + 4.4, S.v05 + 5.2, S.v06 + 0.4, S.v06 + 5.2, S.v08 + 0.4, S.v08 + 2.8, S.v09 + 0.6, S.v09 + 6.6, S.v13 + 1.6];
const GHOST = { 3: S.v05 + 8.2, 4: S.v06 + 1.6, 5: S.v06 + 5.9 };
const BEAD = [S.v03 + 5.6, S.v04 + 4.8, S.v06 + 1.2, S.v08 + 0.2, S.v09 + 0.4];
const CPIT = CPI.map((_, i) => S.v11 + 0.4 + i * 1.25);
const teaser = t => 1 - ss(seg(t, S.v02 + 0.6, S.v02 + 3.2));
const growth = (t, i) => Math.max(t < S.v02 + 3.3 ? teaser(t) : 0, back(seg(t, GROW[i], GROW[i] + 0.9)));

// ---------- camera keyframes [t, pos, target] ----------
const CAM = [
  [0, [-3.5, 3.4, 8.5], [2.3, 5.2, 0]],
  [S.v01 + 4.0, [13.5, 5.5, 11], [20.7, 7.6, 0]],
  [S.v02 + 0.5, [-6, 11, 17], [11, 5, 0]],
  [S.v02 + 4.0, [-3, 6.5, 13], [2.6, 4.5, 0]],
  [S.v04, [-1, 7.5, 13], [2.8, 7.5, -1.5]],
  [S.v04 + 6, [1, 10.5, 12], [3.5, 10.2, -2.5]],
  [S.v05, [3, 7.5, 13], [6.9, 6.5, 0]],
  [S.v05 + 9, [4.5, 10.5, 10.5], [6.9, 8.6, 0]],
  [S.v06 + 1, [6.5, 8.5, 13], [9.5, 7.5, 0]],
  [S.v07, [3, 11.5, 9.5], [9.5, 8.6, 0]],
  [S.v08, [11.5, 8, 13.5], [15.5, 6.8, 0]],
  [S.v09, [15, 7.8, 13], [18.5, 7.4, 0]],
  [S.v09 + 7.5, [24, 6.2, 10.5], [20.7, 8.6, 0]],
  [S.v10 + 0.3, [-7, 15, 20], [12, 4.5, 0]],
  [S.v11 + 0.2, [-4.5, 7.5, 15.5], [4.5, 3.2, 2.4]],
  [S.v11 + 11, [8.5, 8.5, 18], [12.5, 3.6, 2.4]],
  [S.v12, [6, 9.5, 18], [10, 7, 0]],
  [S.v13, [27.5, 8.5, 13], [22.5, 7.2, 0]],
  [S.v14, [-7, 13, 22], [12, 5.2, 0]],
  [DUR, [-8, 13.6, 23.5], [12, 5.2, 0]],
];
function cameraAt(t) {
  let i = 0; while (i < CAM.length - 2 && t > CAM[i + 1][0]) i++;
  const [a, b] = [CAM[i], CAM[i + 1]], u = ss(seg(t, a[0], b[0]));
  const L = (p, q) => p.map((v, k) => v + (q[k] - v) * u);
  const pos = L(a[1], b[1]), tgt = L(a[2], b[2]);
  const d = Math.hypot(pos[0] - tgt[0], pos[1] - tgt[1], pos[2] - tgt[2]), f = d < 18 ? 1.2 : 1;
  return [pos.map((v, k) => tgt[k] + (v - tgt[k]) * f), tgt];
}

// ---------- 2D overlay: title, counter, captions, end card ----------
const out = document.getElementById('out'), o = out.getContext('2d');
const VO = {
  v01: 'In February, a litre of petrol cost R20.10. By October, it was R30.25. A record.',
  v02: "Here's what happened, month by month, and what it did to everything else you buy.",
  v03: 'January to March was calm. Prices hovered around R20, and in February oil was near $66 a barrel.',
  v04: 'Then, at the end of February, strikes on Iran shook the oil market. By mid-March, Brent crude was above $100.',
  v05: "South Africa sets fuel prices on the previous month's costs. So in April, petrol jumped R3.06, even after government cut the fuel levy by R3 a litre.",
  v06: 'May added another R3.27. In June, as the relief began to end, petrol peaked at R28.06.',
  v07: 'That relief cost the state R17.2 billion. Without it, every litre would have cost even more.',
  v08: 'In July and August, oil cooled, and prices eased to R25.58.',
  v09: 'But in September, oil climbed back toward $100, and the rand stayed weak. October brought the biggest jump of the year: R3.33, to a record R30.25.',
  v10: "Fuel doesn't stay at the pump. It moves trucks, food and taxis.",
  v11: 'Inflation followed the same road: 3% in February, 4% in April, 5% in June, the highest in two years. In September it was 4.5%, with transport prices up almost 11%.',
  v12: 'To keep inflation in check, the Reserve Bank raised interest rates in May, and again in September.',
  v13: 'Now a new levy cut starts on 4 November: R1.50 off petrol and R3 off diesel, until December.',
  v14: 'Watch the 4th. Fuel moves first. Everything else follows.',
};
function wrap(text, maxW) {
  const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) { const tr = cur ? cur + ' ' + w : w; if (o.measureText(tr).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tr; }
  if (cur) lines.push(cur); return lines;
}
function caption(t) {
  const id = Object.keys(VO).find(k => t >= S[k] - 0.05 && t < S[k] + D[k] + 0.4);
  if (!id) return;
  const a = ss(seg(t, S[id] - 0.05, S[id] + 0.15)) * (1 - ss(seg(t, S[id] + D[id] + 0.2, S[id] + D[id] + 0.4)));
  o.font = '600 42px P'; const lines = wrap(VO[id], 880), lh = 56, bh = lines.length * lh + 36, by = 1600 - bh / 2;
  o.save(); o.globalAlpha = a; o.shadowColor = 'rgba(0,0,0,0.45)'; o.shadowBlur = 26; o.shadowOffsetY = 6;
  o.fillStyle = 'rgba(242,238,229,0.96)'; o.beginPath(); o.roundRect(60, by, W - 120, bh, 18); o.fill(); o.restore();
  o.save(); o.globalAlpha = a; o.fillStyle = INK; o.textAlign = 'center'; o.textBaseline = 'middle';
  lines.forEach((ln, i) => o.fillText(ln, W / 2, by + 18 + lh / 2 + i * lh)); o.restore();
}
function counter(t) {
  // the latest month that has grown in the story
  let k = -1; for (let i = 0; i < 10; i++) if (t >= GROW[i] + 0.5) k = i;
  const vis = ss(seg(t, S.v03, S.v03 + 0.6)) * (1 - ss(seg(t, S.v14 + 1.5, S.v14 + 2.2)));
  if (vis <= 0 || k < 0) return;
  o.save(); o.globalAlpha = vis;
  o.fillStyle = 'rgba(27,25,23,0.88)'; o.beginPath(); o.roundRect(40, 150, 430, 130, 16); o.fill();
  o.fillStyle = '#D9AE3A'; o.fillRect(40, 150, 8, 130);
  o.fillStyle = '#E8E2D4'; o.font = '600 24px P'; o.textBaseline = 'top'; o.fillText('PETROL 95 · INLAND · ' + M[k].toUpperCase() + ' 2026', 70, 168);
  o.fillStyle = k === 9 ? '#FF4D5E' : '#FFFFFF'; o.font = '700 62px P'; o.fillText('R' + P[k].toFixed(2), 70, 200);
  o.fillStyle = '#BFB6A4'; o.font = '600 22px P'; o.fillText('a litre', 70 + o.measureText('R' + P[k].toFixed(2)).width * 0 + 300, 236);
  o.restore();
}
function titleCard(t) {
  const a = ss(seg(t, 0.2, 0.9)) * (1 - ss(seg(t, S.v02 + 1.0, S.v02 + 1.8)));
  if (a <= 0) return;
  o.save(); o.globalAlpha = a;
  o.fillStyle = '#D9AE3A'; o.fillRect(60, 160, 10, 150);
  o.fillStyle = '#FFFFFF'; o.font = '700 70px P'; o.textBaseline = 'top';
  o.fillText('The year petrol', 92, 160); o.fillText('hit R30', 92, 236);
  o.fillStyle = '#D9AE3A'; o.font = '600 28px P'; o.fillText('MZANSI MONEY MATTERS · 2026', 94, 322);
  o.restore();
}
function endCard(t) {
  const a = ss(seg(t, S.v15 - 0.3, S.v15 + 0.4));
  if (a <= 0) return;
  o.save(); o.globalAlpha = a;
  o.fillStyle = 'rgba(21,17,14,0.55)'; o.fillRect(0, 0, W, H);
  o.fillStyle = '#D9AE3A'; o.fillRect(90, 760, 12, 230);
  o.fillStyle = '#FFFFFF'; o.font = '700 78px P'; o.textBaseline = 'top';
  o.fillText('Mzansi', 124, 760); o.fillText('Money Matters', 124, 846);
  o.fillStyle = '#E8E2D4'; o.font = '600 36px P'; o.fillText('Know where your money is going.', 126, 950);
  o.fillStyle = '#BFB6A4'; o.font = '400 24px P'; o.fillText('Education, not financial advice. Sources in caption.', 126, 1010);
  o.restore();
}

// ---------- frame ----------
function update(t) {
  towers.forEach(T => {
    const g = T.i < 10 ? growth(t, T.i) : back(seg(t, GROW[10], GROW[10] + 0.9));
    if (T.p != null) {
      const h = Math.max(0.001, T.p * K * g);
      T.body.scale.y = h; T.body.position.y = h / 2; T.cap.position.y = h + 0.07;
      T.lab.position.y = h + 0.25; T.lab.material.opacity = ss(seg(g, 0.7, 1)); T.body.visible = g > 0.002; T.cap.visible = T.body.visible;
      if (T.gh) {
        const gt = GHOST[T.i], ga = t < S.v02 + 3.3 ? 0 : back(seg(t, gt, gt + 0.8)) * ss(seg(g, 0.9, 1));
        const rh = Math.max(0.001, RELIEF[T.i] * K * ga), pulse = t > S.v07 && t < S.v07 + D.v07 + 0.5 ? 0.12 + 0.1 * Math.sin((t - S.v07) * 6) : 0;
        T.gh.scale.y = rh; T.edges.scale.y = rh; T.gh.position.y = T.edges.position.y = h + 0.14 + rh / 2;
        T.gh.material.opacity = 0.2 + pulse; T.edges.material.opacity = ga; T.gh.visible = T.edges.visible = ga > 0.01;
        T.glab.position.y = h + 0.2 + RELIEF[T.i] * K * ga + 0.05; T.glab.material.opacity = ss(seg(t, gt + 0.5, gt + 1.0));
        T.lab.position.x = -0.0; T.glab.visible = ga > 0.5;
      }
    } else {
      T.edges.material.opacity = g; T.lab.material.opacity = ss(seg(t, GROW[10] + 0.6, GROW[10] + 1.2)); T.edges.visible = g > 0.01; T.lab.visible = g > 0.3;
    }
    T.mon.material.opacity = t < S.v02 + 3.3 ? 1 : ss(seg(t, (GROW[T.i] ?? 0) - 0.6, GROW[T.i] ?? 0));
  });
  // oil: during the teaser hidden; grows on cue, dims while inflation leads
  beads.forEach((b, k) => {
    const a = back(seg(t, BEAD[k], BEAD[k] + 0.8)), dim = t > S.v11 - 0.5 && t < S.v12 ? 0.35 : 1;
    b.g.visible = a > 0.01; b.s.scale.setScalar(Math.max(0.01, a)); b.stem.material.opacity = a;
    b.lab.material.opacity = ss(seg(t, BEAD[k] + 0.3, BEAD[k] + 0.8)) * dim;
  });
  oilTitle.material.opacity = ss(seg(t, BEAD[0] - 0.5, BEAD[0] + 0.4)) * (t > S.v11 - 0.5 && t < S.v12 ? 0.35 : 1);
  pillars.forEach(p => {
    const a = back(seg(t, CPIT[p.i], CPIT[p.i] + 0.8)), h = Math.max(0.001, p.v * 0.62 * a);
    p.m.scale.y = h; p.m.position.y = h / 2; p.lab.position.y = h + 0.12; p.g.visible = a > 0.01;
    p.lab.material.opacity = ss(seg(t, CPIT[p.i] + 0.4, CPIT[p.i] + 0.9));
  });
  cpiTitle.material.opacity = ss(seg(t, CPIT[0] - 0.4, CPIT[0] + 0.4));
  FLAGS.forEach(f => { const a = back(seg(t, f.t0, f.t0 + 0.7)); f.g.visible = a > 0.01; f.g.scale.set(1, Math.max(0.01, a), 1); });
  const [p, q] = cameraAt(t); cam.position.set(...p); cam.lookAt(...q);
}

window.DUR = DUR;
window.render = t => {
  update(t);
  renderer.render(scene, cam);
  o.drawImage(gl, 0, 0);
  // gentle vignette
  const v = o.createRadialGradient(W / 2, H * 0.45, H * 0.3, W / 2, H / 2, H * 0.8);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.35)'); o.fillStyle = v; o.fillRect(0, 0, W, H);
  titleCard(t); counter(t); caption(t); endCard(t);
};

// ---------- sound cues ----------
const EV = [{ t: 0.1, type: 'chime' }, { t: S.v15, type: 'chime_end' }];
GROW.forEach((t0, i) => EV.push({ t: t0, type: i === 9 ? 'hub' : 'stop' }));
Object.values(GHOST).forEach(t0 => EV.push({ t: t0, type: 'glass' }));
BEAD.forEach(t0 => EV.push({ t: t0, type: 'bead' }));
CPIT.forEach(t0 => EV.push({ t: t0, type: 'tick1' }));
FLAGS.forEach(f => EV.push({ t: f.t0, type: 'flag' }));
EV.push({ t: S.v02 + 0.6, type: 'rewind' }, { t: S.v04 + 1.5, type: 'boom' });
window.EV = EV.sort((a, b) => a.t - b.t);
window.READY = true;

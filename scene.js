// The Jules device, modelled from a video of a real unit: a glossy white capsule body, a soft sleeve with
// openings for the face, the back controls and the side button, and a foot that plugs into the speaker base.
// Each form says what differs from the assembled pose.
import { createStage, THREE, HIDE } from './engine.js';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';

// Colours from julesstories.com.
const C = { orange: 0xff560d, lilac: 0xd7b7e0, green: 0x00735a, yellow: 0xffbf1a, blue: 0x3f81c5, purple: 0x8729ff, white: 0xffffff, ink: 0x141416, key: 0x8d9194, panel: 0xe4e5e8 };
const SHOW = 1 / HIDE;      // extras rest at scale HIDE; a form shows one with s: SHOW
const PI = Math.PI, FACE = PI / 2;
const toy = (color, extra = {}) => new THREE.MeshPhysicalMaterial({ color, metalness: 0, roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.4, envMapIntensity: 0.9, ...extra });
const shiny = (color, extra = {}) => toy(color, { roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.08, ...extra });
const glow = color => toy(color, { emissive: color, emissiveIntensity: 0.35 });
const part = (name, geo, material, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) => { const m = new THREE.Mesh(geo, material); m.name = name; m.position.set(...pos); m.rotation.set(...rot); m.scale.set(...scale); return m; };
const extra = (...a) => { const m = part(...a); m.scale.multiplyScalar(HIDE); return m; };
const tube = (pts, r = 0.028, closed = false) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), closed), 160, r, 10, closed);

// ---------- measurements, taken off frames of the video (units; the body is 2.1 wide and 4.0 tall, 1 : 1.9) ----------
const R = 1.05, BOTTOM = -1.8, TOP = 2.2, SHOULDER = TOP - R;      // body radius, base, crown, where the dome starts
const RS = R + 0.06, SB = BOTTOM + 0.04;                            // sleeve radius and its lower edge: it stops at the base, never below it
const SL = SHOULDER - SB, ARC = SL + RS * PI / 2;                    // sleeve: straight length, then the dome's arc
// A point on the sleeve from (a = distance round from the front, s = distance up from its lower edge).
const SKIRT = 0.07, SKIRT_H = 1.7;                                    // the sleeve flares out a little towards its lower edge
const onSleeve = (a, s, lift = 0) => {
  const th = a / RS; let r = RS + lift;
  if (s < SKIRT_H) r += SKIRT * (1 - s / SKIRT_H) ** 2;
  if (s <= SL) return [r * Math.sin(th), SB + s, r * Math.cos(th)];
  const ph = (s - SL) / RS;
  return [r * Math.cos(ph) * Math.sin(th), SHOULDER + r * Math.sin(ph), r * Math.cos(ph) * Math.cos(th)];
};
// A point on the white body's straight wall, x across and y up, just proud of the surface.
const onFace = (x, y, lift = 0.02) => [x, y, Math.sqrt(R * R - x * x) + lift];

// Openings in the sleeve, in the same (a, s) units: a pill has centre a, half width w, and runs from s0 to s1.
const BACK = RS * PI;
const OPEN = { face: { a: 0, w: 1.15, s0: 0.9, s1: SL + 1.27 }, back: { a: BACK, w: 0.43, s0: 0.66, s1: SL + 0.12 } };
const HOLE = { a: RS * PI / 2, s: SL - 0.2, r: 0.2 };              // the side button's hole, on the device's left
const pillPath = (o, n = 120) => [...Array(n)].map((_, i) => {
  const t = i / n * 4, c0 = o.s0 + o.w, c1 = o.s1 - o.w;          // four quarters: right side up, top arc, left side down, bottom arc
  if (t < 1) return [o.a + o.w, c0 + (c1 - c0) * t];
  if (t < 2) return [o.a + o.w * Math.cos((t - 1) * PI), c1 + o.w * Math.sin((t - 1) * PI)];
  if (t < 3) return [o.a - o.w, c1 - (c1 - c0) * (t - 2)];
  return [o.a - o.w * Math.cos((t - 3) * PI), c0 - o.w * Math.sin((t - 3) * PI)];
});

// ---------- the sleeve: a surface of revolution with the openings cut by an alpha mask ----------
const sleeveMask = () => {
  const W = 2048, H = 1536, k = document.createElement('canvas'); k.width = W; k.height = H;
  const g = k.getContext('2d'), sx = W / (RS * PI * 2), sy = H / ARC;
  const X = a => (a + RS * PI) * sx, Yc = s => H - s * sy;          // a = 0 (front) sits mid-canvas; s runs upward
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.fillStyle = '#000';
  const cut = o => { g.beginPath(); pillPath(o).forEach(([a, s], i) => g[i ? 'lineTo' : 'moveTo'](X(a), Yc(s))); g.fill(); };
  cut(OPEN.face); cut(OPEN.back); cut({ ...OPEN.back, a: -BACK });   // the back opening straddles the seam, so draw it at both ends
  g.beginPath(); g.ellipse(X(HOLE.a), Yc(HOLE.s), HOLE.r * sx, HOLE.r * sy, 0, 0, PI * 2); g.fill();
  const t = new THREE.CanvasTexture(k); t.anisotropy = 8; return t;
};
const sleeveGeo = () => {
  const NA = 160, NS = 110, pos = [], uv = [], idx = [];
  for (let j = 0; j <= NS; j++) for (let i = 0; i <= NA; i++) { const u = i / NA, v = j / NS; pos.push(...onSleeve((u - 0.5) * RS * PI * 2, v * ARC)); uv.push(u, v); }
  for (let j = 0; j < NS; j++) for (let i = 0; i < NA; i++) { const a = j * (NA + 1) + i, b = a + 1, c = a + NA + 1, d = c + 1; idx.push(a, b, d, a, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
};
const SOFT = { roughness: 0.62, clearcoat: 0, envMapIntensity: 0.55 };   // silicone is matte
const sleeveMat = toy(C.orange, { ...SOFT, alphaMap: sleeveMask(), alphaTest: 0.5, side: THREE.DoubleSide });
const lipMat = toy(C.orange, SOFT); lipMat.color = sleeveMat.color;       // one shared colour, so a finish change recolours the lips too
const sleeve = part('sleeve', sleeveGeo(), sleeveMat);
// Rounded lips give the cut edges their thickness; a rim finishes the lower edge; a ridge runs down each side.
sleeve.add(
  new THREE.Mesh(tube(pillPath(OPEN.face).map(([a, s]) => onSleeve(a, s)), 0.05, true), lipMat),
  new THREE.Mesh(tube(pillPath(OPEN.back).map(([a, s]) => onSleeve(a, s)), 0.04, true), lipMat),
  new THREE.Mesh(tube([...Array(40)].map((_, i) => onSleeve(HOLE.a + HOLE.r * Math.cos(i / 40 * PI * 2), HOLE.s + HOLE.r * Math.sin(i / 40 * PI * 2))), 0.03, true), lipMat),
  part('', new THREE.TorusGeometry(RS + SKIRT, 0.035, 16, 120), lipMat, [0, SB + 0.035, 0], [FACE, 0, 0]),
  ...[1, -1].map(side => new THREE.Mesh(tube([0, 1, 2, 3].map(i => onSleeve(side * HOLE.a, 1.3 + i * 0.2, 0.01)), 0.045), lipMat)),
);

// ---------- the white body: turned from a profile, with a socket in the base for the foot ----------
const bodyProfile = [[0.2, BOTTOM], [R - 0.2, BOTTOM], ...[...Array(13)].map((_, i) => { const t = i / 12 * FACE; return [R - 0.2 + 0.2 * Math.sin(t), BOTTOM + 0.2 - 0.2 * Math.cos(t)]; }), ...[...Array(41)].map((_, i) => { const t = i / 40 * FACE; return [R * Math.cos(t), SHOULDER + R * Math.sin(t)]; })];
const grilleMap = () => {
  const k = document.createElement('canvas'); k.width = k.height = 512; const g = k.getContext('2d');
  g.fillStyle = '#f4f4f4'; g.fillRect(0, 0, 512, 512); g.fillStyle = '#3c3f43';
  for (let ring = 2; ring < 10; ring++) for (let i = 0, n = ring * 7; i < n; i++) { const a = i / n * PI * 2, r = ring * 25; g.beginPath(); g.arc(256 + r * Math.cos(a), 256 + r * Math.sin(a), 8.5, 0, PI * 2); g.fill(); }
  return new THREE.CanvasTexture(k);
};
const whiteMat = shiny(C.white, { emissive: C.white, emissiveIntensity: 0.22 });
const body = part('body', new THREE.LatheGeometry(bodyProfile.map(p => new THREE.Vector2(...p)), 96), whiteMat);
body.add(
  part('', new THREE.RingGeometry(0.2, R - 0.14, 64), toy(C.white, { map: grilleMap(), side: THREE.DoubleSide }), [0, BOTTOM + 0.005, 0], [FACE, 0, 0]),   // speaker grille
  part('', new THREE.CylinderGeometry(0.2, 0.2, 0.3, 24, 1, true), toy(0x9a9da0, { side: THREE.DoubleSide }), [0, BOTTOM + 0.15, 0]),                       // foot socket
  part('', new THREE.TorusGeometry(R + 0.001, 0.007, 8, 120), toy(0xc9cbce), [0, BOTTOM + 0.72, 0], [FACE, 0, 0]),                                          // the seam above the base
  part('', new THREE.SphereGeometry(0.022, 12, 8), toy(C.ink), [-R, 0.6, 0]),                                                                              // microphone
);
// Back controls: a recessed panel with three keys and the charging port.
const PY = 0.1, KZ = -(R - 0.045);
const pillShape = (w, h) => { const r = w / 2, y = h / 2 - r, s = new THREE.Shape(); s.moveTo(-r, -y); s.lineTo(-r, y); s.absarc(0, y, r, PI, 0, true); s.lineTo(r, -y); s.absarc(0, -y, r, 0, PI, true); return s; };
const slab = (w, h, depth, bevel) => new THREE.ExtrudeGeometry(pillShape(w, h), { depth, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 4, curveSegments: 32 }).center();
const keyMat = toy(C.key, { roughness: 0.7 });
body.add(
  part('', slab(0.75, 2.28, 0.05, 0.02), toy(C.panel, { roughness: 0.35 }), [0, PY, -(R - 0.06)]),
  part('', slab(0.44, 0.44, 0.05, 0.02), keyMat, [0, PY + 0.76, KZ - 0.03]),
  part('', slab(0.44, 0.82, 0.05, 0.02), keyMat, [0, PY + 0.1, KZ - 0.03]),
  part('', slab(0.07, 0.24, 0.03, 0.005), toy(C.ink), [0, PY - 0.42, KZ - 0.02], [0, 0, FACE]),
  part('', slab(0.44, 0.44, 0.05, 0.02), keyMat, [0, PY - 0.78, KZ - 0.03]),
);

// ---------- the foot: a stem that plugs into the base and a flat sole with two toes ----------
const puck = r => new THREE.ExtrudeGeometry(new THREE.Shape().absarc(0, 0, r, 0, PI * 2), { depth: 0.05, bevelEnabled: true, bevelSize: 0.035, bevelThickness: 0.035, bevelSegments: 6, curveSegments: 48 }).center().rotateX(FACE);
const footMat = toy(C.orange, SOFT);
const foot = part('foot', puck(0.8), footMat, [0, BOTTOM - 0.36, -0.12]);
foot.add(
  ...[-0.9, 0, 0.9].map(a => part('', puck(0.42), footMat, [0.64 * Math.sin(a), 0, 0.64 * Math.cos(a)])),   // three toes
  part('', new THREE.CylinderGeometry(0.19, 0.4, 0.3, 32), footMat, [0, 0.2, 0.12]),
  part('', new THREE.CylinderGeometry(0.12, 0.18, 0.3, 24), footMat, [0, 0.48, 0.12]),
);

// ---------- inside: a stylised illustration in general groups, deliberately not the real board ----------
const frame = part('in-frame', new THREE.CylinderGeometry(0.8, 0.8, 2.3, 48, 1, true, 0.5 * PI, PI), toy(0xf4f4f4, { side: THREE.DoubleSide }), [0, -0.1, 0]);
frame.add(part('', new THREE.SphereGeometry(0.8, 40, 16, PI, PI, 0, FACE), frame.material, [0, 1.15, 0]));   // stays below the crown of the body
const board = part('in-board', slab(1.15, 2.7, 0.04, 0.01), toy(C.green, { emissive: C.green, emissiveIntensity: 0.08 }), [0, 0.15, -0.3]);
board.add(...[0.75, 0.1, -0.75].map(y => part('', new RoundedBoxGeometry(0.26, 0.26, 0.08, 2, 0.03), toy(0xd9dadc, { roughness: 0.3 }), [0.32, y, 0.06])));
const ledMat = toy(C.blue, { emissive: 0x4f8dff, emissiveIntensity: 0.2 });
const leds = part('in-leds', new RoundedBoxGeometry(0.13, 0.13, 0.05, 2, 0.02), ledMat, [0, 1.1, 0.14]);
leds.add(...[1, 2, 3, 4, 5, 6, 7].map(i => part('', leds.geometry, ledMat, [0, -i * 0.27, 0])));
const inside = [
  frame, board, leds,
  part('in-strip', new THREE.BoxGeometry(0.2, 2.2, 0.03), toy(0x0c4f3f), [0, 0.15, 0.1]),
  part('in-battery', new THREE.CylinderGeometry(0.3, 0.3, 1.25, 32), toy(C.blue), [0, -0.95, 0.15], [0, 0, FACE]),
  part('in-driver', new THREE.CylinderGeometry(0.72, 0.55, 0.3, 48), toy(0x1d1e21, { roughness: 0.35 }), [0, -1.42, 0]),
];

const TILES = [C.green, C.yellow, C.blue, C.white, C.purple, C.green, C.yellow, C.blue];
const eye = x => { const y = TOP - 0.9, r = Math.sqrt(R * R - (y - SHOULDER) ** 2), z = Math.sqrt(r * r - x * x); return part(`eye-${x < 0 ? 'l' : 'r'}`, new THREE.SphereGeometry(0.095, 24, 16), shiny(C.ink), [x, y, z + 0.005], [-0.14, x * 0.9, 0], [1, 1, 0.35]); };

const parts = [
  ...inside, body, sleeve, foot, eye(-0.32), eye(0.32),
  // The side button, seen through the hole in the sleeve.
  part('button', new THREE.CylinderGeometry(0.16, 0.16, 0.08, 32), toy(C.white, { emissive: C.yellow, emissiveIntensity: 0 }), [R, SB + HOLE.s, 0], [0, 0, FACE]),
  // ---- extras that only appear in some forms ----
  ...[0, 1, 2].map(i => extra(`ring-${i}`, new THREE.TorusGeometry(1, 0.03, 12, 96), glow([C.orange, C.yellow, C.purple][i]), [0, 0.6, R])),
  ...[0, 1, 2].map(i => extra(`arc-${i}`, new THREE.TorusGeometry(1, 0.06 / (0.5 + i * 0.35), 12, 48, PI / 2), glow(C.green), [0, TOP + 0.25, 0], [0, 0, PI / 4])),
  ...TILES.map((c, i) => extra(`tile-${i}`, new RoundedBoxGeometry(0.62, 0.8, 0.1, 4, 0.05), toy(c), [0, 0.3, 0])),
  // Doodles drawn on the face, bent to its curve.
  extra('doodle-smile', tube([...Array(9)].map((_, i) => { const t = PI + i / 8 * PI; return onFace(0.3 * Math.cos(t), 0.85 + 0.2 * Math.sin(t)); })), toy(C.ink)),
  extra('doodle-cheek-l', new THREE.CircleGeometry(0.12, 24), toy(0xff8fa8), onFace(-0.55, 0.82), [0, -0.52, 0]),
  extra('doodle-cheek-r', new THREE.CircleGeometry(0.12, 24), toy(0xff8fa8), onFace(0.55, 0.82), [0, 0.52, 0]),
  extra('doodle-star', tube([[0, 0.24], [0.14, -0.19], [-0.23, 0.07], [0.23, 0.07], [-0.14, -0.19], [0, 0.24]].map(([x, y]) => onFace(x, y + 0.1))), toy(C.green)),
  extra('doodle-zig', tube([-0.5, -0.3, -0.1, 0.1, 0.3, 0.5].map((x, i) => onFace(x, -0.6 + (i % 2) * 0.24))), toy(C.purple)),
];
// Doodles are drawn in place, so each one grows from its own middle.
parts.filter(p => p.name.startsWith('doodle') && !p.name.includes('cheek')).forEach(p => { p.geometry.computeBoundingBox(); const c = p.geometry.boundingBox.getCenter(new THREE.Vector3()); p.geometry.translate(-c.x, -c.y, -c.z); p.position.copy(c); });

const is = (p, prefix) => p.name.startsWith(prefix), n = p => +p.name.split('-')[1];

const forms = {
  // Assembled and turning: the hero and the close.
  whole: {},
  // Facing the reader: this is the whole product, and it has no screen.
  face: { spin: 0, tilt: 0.08 },
  // The button on its side, turned towards the reader and lit.
  press: { each: p => is(p, 'button') ? { d: [0.07, 0, 0], c: C.yellow, e: C.yellow, ei: 0.6 } : undefined, spin: 0, turn: -1.05, tilt: 0.12, light: C.yellow },
  // Voice going out: rings leave the face.
  talk: { each: p => is(p, 'ring') ? { p: [0, 0.6, R + 0.5 + n(p) * 0.6], s: SHOW * (0.45 + n(p) * 0.3) } : undefined, spin: 0.3, light: C.orange },
  // The white front is for drawing: a child's doodles appear on it.
  draw: { each: p => is(p, 'doodle') ? { s: SHOW } : undefined, spin: 0, tilt: 0.05, light: C.lilac },
  // Online: a signal above the head.
  online: { each: p => is(p, 'arc') ? { s: SHOW * (0.5 + n(p) * 0.35) } : undefined, spin: 0.25, light: C.green },
  // Five subjects, held up like cards.
  explore: { each: p => is(p, 'tile') && n(p) < 5 ? { p: [(n(p) - 2) * 0.92, TOP + 0.75 + (2 - Math.abs(n(p) - 2)) * 0.28, 0.1], r: [0, 0, (2 - n(p)) * 0.14], s: SHOW } : undefined, spin: 0.12, tilt: 0.15 },
  // Offline: the library travels with the device.
  anywhere: { each: p => { if (!is(p, 'tile')) return; const a = n(p) / 8 * PI * 2; return { p: [Math.cos(a) * 2.3, 0.3 + Math.sin(a * 2) * 0.5, Math.sin(a) * 2.3], r: [0, PI / 2 - a, 0], s: SHOW }; }, light: C.yellow },
  // The three pieces: the sleeve lifts off and the foot unplugs.
  pieces: { each: p => is(p, 'sleeve') ? { d: [0, 1.25, 0] } : is(p, 'foot') ? { d: [0, -1.45, 0] } : is(p, 'in-') || is(p, 'body') || is(p, 'eye') || is(p, 'button') ? { d: [0, -0.9, 0] } : undefined, spin: 0.6, tilt: 0.2, light: C.yellow },
  // The shell steps aside and what it holds stands next to it, lights on.
  inside: { each: p => is(p, 'in-') ? { d: [1.4, 0, 0], ...(is(p, 'in-leds') ? { ei: 1.6 } : {}) } : is(p, 'ring') || is(p, 'arc') || is(p, 'tile') || is(p, 'doodle') ? undefined : { d: [-1.45, 0, 0] }, spin: 0, turn: 0.5, tilt: 0.16, light: C.blue },
  // Tipped back to show the speaker in the base, with the foot pulled away.
  speaker: { each: p => is(p, 'foot') ? { d: [0, -1.3, 0.3] } : undefined, spin: 0.15, tilt: -1.0, light: C.orange },
  // Turned round: the controls and the charging port.
  back: { spin: 0, turn: PI * 0.92, tilt: 0.1, light: C.green },
  // The parent draws the circle the child plays inside.
  safe: { each: p => p.name === 'ring-2' ? { p: [0, 0.1, 0], s: SHOW * 2.7, c: C.green, e: C.green, ei: 0.4 } : undefined, spin: 0, tilt: 0.05, light: C.green },
  // The other colour: only the sleeve and the foot change.
  lilac: { each: p => is(p, 'sleeve') || is(p, 'foot') ? { c: C.lilac } : undefined, light: C.lilac },
};

const stage = createStage({ canvas: document.getElementById('stage'), parts, forms, rims: [C.lilac, C.yellow], stars: [],
  // The hero sits low and small so the headline stays clear of it.
  places: (at, mobile) => at === 'hero' && !mobile ? [0, -1.55, 0.82, 1] : null });
if (stage) stage.scene.add(new THREE.HemisphereLight(0xffffff, 0xffd2b8, 1.6));   // soft fill: toy plastic, no black shadows
// The voice rings breathe.
const rings = parts.filter(p => is(p, 'ring'));
if (stage && !matchMedia('(prefers-reduced-motion: reduce)').matches) stage.onFrame = ({ t }) => rings.forEach((r, i) => r.scale.multiplyScalar(1 + 0.07 * Math.sin(t * 3 - i * 1.1)));

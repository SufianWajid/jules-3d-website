// The Jules device, built from simple parts in its assembled pose. Each form says what differs from that pose.
// The inside parts are an illustration in general groups (speaker, microphone, board, battery), not a drawing.
import { createStage, THREE, HIDE } from './engine.js';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';

// Colours from julesstories.com.
const C = { orange: 0xff560d, lilac: 0xd7b7e0, green: 0x00735a, yellow: 0xffbf1a, blue: 0x3f81c5, purple: 0x8729ff, white: 0xffffff, ink: 0x141416, grey: 0x3b3933 };
const SHOW = 1 / HIDE;      // extras rest at scale HIDE; a form shows one with s: SHOW
const PI = Math.PI, FACE = PI / 2;
const toy = (color, extra = {}) => new THREE.MeshPhysicalMaterial({ color, metalness: 0, roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.3, envMapIntensity: 0.9, ...extra });
const glow = color => toy(color, { emissive: color, emissiveIntensity: 0.35 });
const part = (name, geo, material, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) => { const m = new THREE.Mesh(geo, material); m.name = name; m.position.set(...pos); m.rotation.set(...rot); m.scale.set(...scale); return m; };
const extra = (...a) => { const m = part(...a); m.scale.multiplyScalar(HIDE); return m; };

// A pill outline, w wide and h tall.
const pill = (w, h) => { const r = w / 2, y = h / 2 - r, s = new THREE.Shape(); s.moveTo(-r, -y); s.lineTo(-r, y); s.absarc(0, y, r, PI, 0, true); s.lineTo(r, -y); s.absarc(0, -y, r, 0, PI, true); return s; };
const slab = (w, h, depth, bevel) => new THREE.ExtrudeGeometry(pill(w, h), { depth, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel * 1.5, bevelSegments: 24, curveSegments: 64 }).center();
const squiggle = pts => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), 60, 0.028, 8);

const Y = 0.3, FRONT = 0.97;   // body centre height, and the plane of the white face
const TILES = [C.green, C.yellow, C.blue, C.white, C.purple, C.green, C.yellow, C.blue];
const SHELL = ['body', 'button', 'arm-l', 'arm-r', 'neck', 'foot-l', 'foot-r'];

const parts = [
  // ---- the device ----
  part('body', slab(1.9, 3.4, 1.0, 0.3), toy(C.orange), [0, Y, 0]),
  part('face', slab(1.72, 3.22, 0.04, 0.02), toy(C.white, { roughness: 0.25, emissive: C.white, emissiveIntensity: 0.3 }), [0, Y, FRONT]),
  part('eye-l', new THREE.SphereGeometry(0.085, 24, 16), toy(C.ink, { roughness: 0.2 }), [-0.33, Y + 0.72, FRONT + 0.05], [0, 0, 0], [1, 1, 0.4]),
  part('eye-r', new THREE.SphereGeometry(0.085, 24, 16), toy(C.ink, { roughness: 0.2 }), [0.33, Y + 0.72, FRONT + 0.05], [0, 0, 0], [1, 1, 0.4]),
  part('button', new THREE.CylinderGeometry(0.27, 0.3, 0.16, 40), toy(C.orange, { emissive: C.yellow, emissiveIntensity: 0 }), [0, Y + 2.03, 0]),
  part('arm-l', new RoundedBoxGeometry(0.14, 1.5, 0.9, 4, 0.06), toy(C.orange), [-1.27, Y - 0.55, 0]),
  part('arm-r', new RoundedBoxGeometry(0.14, 1.5, 0.9, 4, 0.06), toy(C.orange), [1.27, Y - 0.55, 0]),
  part('neck', new THREE.CylinderGeometry(0.72, 0.6, 0.22, 48), toy(C.orange), [0, Y - 2.08, 0]),
  part('foot-l', new THREE.SphereGeometry(1, 40, 20), toy(C.orange), [-0.62, Y - 2.24, 0.12], [0, 0, 0], [0.74, 0.1, 0.62]),
  part('foot-r', new THREE.SphereGeometry(1, 40, 20), toy(C.orange), [0.62, Y - 2.24, 0.12], [0, 0, 0], [0.74, 0.1, 0.62]),
  // ---- inside (hidden by the body until it comes apart) ----
  part('speaker', new THREE.CylinderGeometry(0.62, 0.5, 0.4, 48), toy(C.grey, { roughness: 0.6 }), [0, Y - 0.75, 0.3], [FACE, 0, 0]),
  part('cone', new THREE.SphereGeometry(0.3, 32, 16), glow(C.orange), [0, Y - 0.75, 0.5], [0, 0, 0], [1, 1, 0.4]),
  part('mic', new THREE.CylinderGeometry(0.13, 0.13, 0.1, 24), glow(C.blue), [0, Y + 1.3, 0.35], [FACE, 0, 0]),
  part('board', new RoundedBoxGeometry(1.4, 1.5, 0.07, 2, 0.03), toy(C.green, { emissive: C.green, emissiveIntensity: 0.05 }), [0, Y + 0.75, -0.1]),
  part('chip', new RoundedBoxGeometry(0.42, 0.42, 0.08, 2, 0.02), toy(C.ink), [0.2, Y + 0.85, -0.03]),
  part('battery', new RoundedBoxGeometry(1.25, 1.5, 0.4, 4, 0.12), toy(C.yellow), [0, Y - 0.7, -0.4]),
  // ---- extras that only appear in some forms ----
  ...[0, 1, 2].map(i => extra(`ring-${i}`, new THREE.TorusGeometry(1, 0.03, 12, 96), glow([C.orange, C.yellow, C.purple][i]), [0, Y, FRONT])),
  ...[0, 1, 2].map(i => extra(`arc-${i}`, new THREE.TorusGeometry(1, 0.06 / (0.5 + i * 0.35), 12, 48, PI / 2), glow(C.green), [0, Y + 2.3, 0], [0, 0, PI / 4])),
  ...TILES.map((c, i) => extra(`tile-${i}`, new RoundedBoxGeometry(0.62, 0.8, 0.1, 4, 0.05), toy(c), [0, Y, 0])),
  extra('doodle-smile', new THREE.TorusGeometry(0.3, 0.028, 8, 40, PI), toy(C.ink), [0, Y + 0.45, FRONT + 0.06], [0, 0, PI]),
  extra('doodle-hair', squiggle([[-0.5, 0, 0], [-0.3, 0.22, 0], [-0.12, -0.02, 0], [0.06, 0.24, 0], [0.24, 0, 0], [0.42, 0.2, 0], [0.55, 0.02, 0]]), toy(C.purple), [0, Y + 1.22, FRONT + 0.06]),
  extra('doodle-cheek-l', new THREE.CircleGeometry(0.13, 24), toy(0xff8fa8), [-0.52, Y + 0.42, FRONT + 0.06]),
  extra('doodle-cheek-r', new THREE.CircleGeometry(0.13, 24), toy(0xff8fa8), [0.52, Y + 0.42, FRONT + 0.06]),
  extra('doodle-star', squiggle([[0, 0.2, 0], [0.12, -0.16, 0], [-0.19, 0.06, 0], [0.19, 0.06, 0], [-0.12, -0.16, 0], [0, 0.2, 0]]), toy(C.green), [0.1, Y - 0.75, FRONT + 0.06]),
];

const is = (p, prefix) => p.name.startsWith(prefix), n = p => +p.name.split('-')[1];
const only = (names, state) => p => names.some(k => is(p, k)) ? state(p) : { s: HIDE };

// How far each part travels in the exploded view. Keep the spread inside about 2.9 units of centre.
const EXPLODE = { face: [0, 0, 1.6], 'eye-l': [0, 0, 1.7], 'eye-r': [0, 0, 1.7], speaker: [0, 0, 0.8], cone: [0, 0, 0.85], mic: [0, 0, 0.8], board: [0, 0, -1.25], chip: [0, 0, -1.25], battery: [0, 0, -1.6], button: [0, 0.5, 0], 'arm-l': [-0.5, 0, 0], 'arm-r': [0.5, 0, 0], neck: [0, -0.25, 0], 'foot-l': [0, -0.5, 0], 'foot-r': [0, -0.5, 0] };

const forms = {
  // Assembled and turning: the hero and the close.
  whole: {},
  // Facing the reader: this is the whole product, and it has no screen.
  face: { spin: 0, tilt: 0.08 },
  // The one control a child needs.
  press: { each: p => is(p, 'button') ? { d: [0, 0.3, 0], c: C.yellow, e: C.yellow, ei: 0.5 } : undefined, spin: 0.25, tilt: 0.5, light: C.yellow },
  // Voice going out: rings leave the face.
  talk: { each: p => is(p, 'ring') ? { p: [0, Y, FRONT + 0.5 + n(p) * 0.6], s: SHOW * (0.45 + n(p) * 0.3) } : undefined, spin: 0.3, light: C.orange },
  // The white front is for drawing: a child's doodles appear on it.
  draw: { each: p => is(p, 'doodle') ? { s: SHOW } : undefined, spin: 0, tilt: 0.05, light: C.lilac },
  // Online: a signal above the head.
  online: { each: p => is(p, 'arc') ? { s: SHOW * (0.5 + n(p) * 0.35) } : undefined, spin: 0.25, light: C.green },
  // Five subjects, held up like cards.
  explore: { each: p => is(p, 'tile') && n(p) < 5 ? { p: [(n(p) - 2) * 0.92, Y + 2.75 + (2 - Math.abs(n(p) - 2)) * 0.28, 0.1], r: [0, 0, (2 - n(p)) * 0.14], s: SHOW } : undefined, spin: 0.12, tilt: 0.15 },
  // Offline: the library travels with the device.
  anywhere: { each: p => { if (!is(p, 'tile')) return; const a = n(p) / 8 * PI * 2; return { p: [Math.cos(a) * 2.3, Y + Math.sin(a * 2) * 0.5, Math.sin(a) * 2.3], r: [0, PI / 2 - a, 0], s: SHOW }; }, light: C.yellow },
  // Taken apart along the viewing axis.
  exploded: { each: p => EXPLODE[p.name] && { d: EXPLODE[p.name] }, light: C.yellow },
  // Hearing and speaking, brought forward.
  voice: { each: only(['speaker', 'cone', 'mic', 'ring'], p => is(p, 'ring') ? { p: [0, -0.5, 0.6 + n(p) * 0.5], s: SHOW * (1.5 + n(p) * 0.35) } : is(p, 'mic') ? { p: [0, 1.9, 0.3], s: 3.2, ei: 0.7 } : { p: [0, -0.5, is(p, 'cone') ? 0.45 : 0], s: 2.2 }), spin: 0.6, light: C.orange },
  // Power and brains, lit.
  core: { each: only(['board', 'chip', 'battery'], p => is(p, 'battery') ? { p: [0, -1.25, 0], s: 1.35 } : { p: [is(p, 'chip') ? 0.3 : 0, is(p, 'chip') ? 1.45 : 1.3, is(p, 'chip') ? 0.12 : 0], s: 1.5, ...(is(p, 'board') ? { ei: 0.35 } : {}) }), spin: 0.7, light: C.green },
  // The parent draws the circle the child plays inside.
  safe: { each: p => p.name === 'ring-2' ? { p: [0, Y, 0], s: SHOW * 2.75, c: C.green, e: C.green, ei: 0.4 } : undefined, spin: 0, tilt: 0.05, light: C.green },
  // The other colour: only the shell changes.
  lilac: { each: p => SHELL.includes(p.name) ? { c: C.lilac } : undefined, light: C.lilac },
};

const stage = createStage({ canvas: document.getElementById('stage'), parts, forms, rims: [C.lilac, C.yellow], stars: [],
  // The hero sits low and small so the headline stays clear of it.
  places: (at, mobile) => at === 'hero' && !mobile ? [0, -1.55, 0.82, 1] : null });
if (stage) stage.scene.add(new THREE.HemisphereLight(0xffffff, 0xffd2b8, 1.6));   // soft fill: toy plastic, no black shadows
// The voice rings breathe.
const rings = parts.filter(p => is(p, 'ring'));
if (stage && !matchMedia('(prefers-reduced-motion: reduce)').matches) stage.onFrame = ({ t }) => rings.forEach((r, i) => r.scale.multiplyScalar(1 + 0.07 * Math.sin(t * 3 - i * 1.1)));

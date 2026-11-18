// Scroll stage engine. One 3D object, made of parts, stays on screen for the whole page and takes a new
// form at every element that carries data-shape. You supply the parts and the forms; this file does the
// rendering, the scroll mapping, the morphing, the drag-to-turn and the fallbacks. Rarely needs editing.
import * as THREE from 'three';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

export { THREE };
export const HIDE = 0.001;   // scale for a part that should vanish in a form (0 breaks normals)

/**
 * createStage({ canvas, parts, forms, ... })
 *   parts  Object3D[] in their assembled ("rest") pose. Give each a .name.
 *   forms  { name: { each(part, i, rest) -> state | undefined, spin, roll, tilt, light, scan } }
 *          state fields, all optional (missing = rest pose):
 *            p [x,y,z] absolute position   d [dx,dy,dz] offset from rest   s scale multiplier (HIDE to hide)
 *            r [rx,ry,rz] rotation         c colour   e emissive colour    ei emissive intensity
 *          spin 0..1 how much the whole object turns by itself in this form (0 = faces the camera)
 *          roll 0..1 in-plane turn, tilt radians of forward lean, light = key light colour
 *   places (at, mobile) -> [x, y, scale, opacity] to override where the object sits for a data-at value
 *   bloom  [strength, radius, threshold]; keep strength low or colours wash out to white
 *   rims   [colourA, colourB] the two coloured rim lights (use the brand's colours)
 *   stars  colours for the far field of points; [] for none
 */
export function createStage({ canvas, parts, forms, places, bloom = [0.42, 0.55, 0.62], rims = [0xf53fd6, 0xa4f6f8], stars = [0xffffff], distance = 16 }) {
  const els = [...document.querySelectorAll('[data-shape]')];
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch { canvas.remove(); return null; }
  if (!els.length) return null;

  // True black: the page background must be #000 too, or a seam shows where the canvas ends.
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  cam.position.z = distance;
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  const key = new THREE.PointLight(0xffffff, 130); key.position.set(4, 5, 9); scene.add(key);
  const rimA = new THREE.PointLight(rims[0], 110); rimA.position.set(-7, -3, 4); scene.add(rimA);
  const rimB = new THREE.PointLight(rims[1], 110); rimB.position.set(7, -4, -3); scene.add(rimB);

  const group = new THREE.Group(); scene.add(group);
  parts.forEach(p => group.add(p));
  const mat = p => (p.material && p.material.color ? p.material : null);
  const rests = parts.map(p => ({
    p: p.position.clone(), s: p.scale.clone(), q: p.quaternion.clone(),
    c: mat(p) ? mat(p).color.clone() : new THREE.Color(), e: mat(p) && mat(p).emissive ? mat(p).emissive.clone() : new THREE.Color(0), ei: mat(p) ? mat(p).emissiveIntensity ?? 0 : 0,
  }));
  const compile = f => ({
    spin: f.spin ?? 1, roll: f.roll ?? 0, tilt: f.tilt ?? 0.38, scan: f.scan ?? 0, light: new THREE.Color(f.light ?? 0xffffff),
    b: parts.map((part, i) => {
      const r = rests[i], s = (f.each && f.each(part, i, r)) || {};
      return {
        p: s.p ? new THREE.Vector3(...s.p) : s.d ? r.p.clone().add(new THREE.Vector3(...s.d)) : r.p.clone(),
        s: r.s.clone().multiplyScalar(s.s ?? 1),
        q: s.r ? new THREE.Quaternion().setFromEuler(new THREE.Euler(...s.r)) : r.q.clone(),
        c: s.c !== undefined ? new THREE.Color(s.c) : r.c.clone(), e: s.e !== undefined ? new THREE.Color(s.e) : r.e.clone(), ei: s.ei ?? r.ei,
      };
    }),
  });
  const F = Object.fromEntries(Object.entries(forms).map(([k, v]) => [k, compile(v)])), first = Object.values(F)[0];

  if (stars.length) {
    const g = new THREE.BufferGeometry(), pos = [], colr = [], k = new THREE.Color();
    for (let i = 0; i < 500; i++) { const d = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(14 + Math.random() * 20); pos.push(d.x, d.y, d.z - 14); k.set(stars[i % stars.length]); colr.push(k.r, k.g, k.b); }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
    var field = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.07, vertexColors: true, transparent: true, opacity: 0.7 })); scene.add(field);
  }

  // ---------- where the object sits for each data-at value: [x, y, scale, canvas opacity] ----------
  let W = 0, H = 0, stops = [];
  const place = at => {
    const m = W < 860, custom = places && places(at, m); if (custom) return custom;
    if (at === 'hero') return m ? [0, 0.2, 0.6, 1] : [0, -0.5, 1.15, 1];
    if (at === 'bg') return m ? [0, 0, 1.1, 0.2] : [5.6, 0, 1.45, 0.36];      // to the side and dimmed, behind dense content
    if (at === 'back') return m ? [0, 0, 1.2, 0.3] : [0, 0, 1.5, 0.55];       // centred behind a card
    if (at === 'left') return m ? [0, 2.3, 0.6, 1] : [-3.9, 0, 0.95, 1];
    if (at === 'right') return m ? [0, 2.3, 0.6, 1] : [3.9, 0, 0.95, 1];
    return m ? [0, 2.3, 0.6, 1] : [0, 0, 1, 1];                               // centre; on phones the top half
  };
  const measure = () => {
    stops = els.map(el => {
      const seq = el.classList.contains('step') && el.closest('.seq'); let y;
      if (seq) { const all = [...seq.querySelectorAll('.step')]; y = seq.getBoundingClientRect().top + scrollY + all.indexOf(el) / all.length * (seq.offsetHeight - H); }
      else y = el.getBoundingClientRect().top + scrollY - (['bg', 'back'].includes(el.dataset.at) ? H * 0.4 : 0);
      return { y: Math.max(0, y), f: F[el.dataset.shape] || first, at: place(el.dataset.at) };
    }).sort((a, b) => a.y - b.y);
    stops[0].y = 0;
  };
  const size = () => { W = innerWidth; H = innerHeight; renderer.setPixelRatio(Math.min(devicePixelRatio, W < 860 ? 1.5 : 2)); renderer.setSize(W, H, false); cam.aspect = W / H; cam.updateProjectionMatrix(); measure(); };
  addEventListener('resize', size); addEventListener('load', measure); size(); setInterval(measure, 1500);   // layout shifts as fonts and images land

  // ---------- drag to turn (the overlays above the canvas must be pointer-events: none) ----------
  let dragging = false, lx = 0, ly = 0, yaw = 0, pitch = 0, vy = 0, vp = 0;
  canvas.addEventListener('pointerdown', e => { dragging = true; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId); canvas.classList.add('grab'); });
  canvas.addEventListener('pointermove', e => { if (!dragging) return; vy = (e.clientX - lx) * 0.008; vp = (e.clientY - ly) * 0.006; lx = e.clientX; ly = e.clientY; });
  const drop = () => { dragging = false; canvas.classList.remove('grab'); };
  canvas.addEventListener('pointerup', drop); canvas.addEventListener('pointercancel', drop);

  const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const mix = (a, b, f) => a + (b - a) * f, wrap = x => ((x + Math.PI) % (Math.PI * 2)) - Math.PI, tmp = new THREE.Color();
  let sm = scrollY, drawn = '';
  const frame = ms => {
    requestAnimationFrame(frame);
    const t = still ? 0 : ms / 1000;
    sm += (scrollY - sm) * (still ? 1 : 0.14);                                // ease after the scroll so morphs feel weighty
    yaw += vy; pitch += vp; vy *= 0.92; vp *= 0.92;
    if (!dragging) { yaw *= 0.985; pitch *= 0.97; }
    if (still) { const sig = `${Math.round(sm)}|${W}|${yaw.toFixed(3)}|${pitch.toFixed(3)}`; if (sig === drawn) return; drawn = sig; }

    let i = 0; while (i < stops.length - 1 && stops[i + 1].y <= sm) i++;
    const a = stops[i], b = stops[Math.min(stops.length - 1, i + 1)];
    const f = b === a ? 0 : ss(0.5, 1, (sm - a.y) / Math.max(1, b.y - a.y)), A = a.f, B = b.f;   // hold a form for half the gap, then morph
    parts.forEach((m, k) => {
      const p = A.b[k], q = B.b[k], mm = mat(m);
      m.position.lerpVectors(p.p, q.p, f); m.position.y += Math.sin(t * 0.8 + k) * 0.03;
      m.scale.lerpVectors(p.s, q.s, f);
      m.quaternion.slerpQuaternions(p.q, q.q, f);
      if (mm) { mm.color.lerpColors(p.c, q.c, f); if (mm.emissive) { mm.emissive.lerpColors(p.e, q.e, f); mm.emissiveIntensity = mix(p.ei, q.ei, f); } }
    });
    const spin = mix(A.spin, B.spin, f);
    group.rotation.set(mix(A.tilt, B.tilt, f) + pitch, wrap(t * 0.22) * spin + yaw, mix(A.roll, B.roll, f) * wrap(t * 0.12));
    group.position.set(mix(a.at[0], b.at[0], f), mix(a.at[1], b.at[1], f), 0);
    group.scale.setScalar(mix(a.at[2], b.at[2], f));
    canvas.style.opacity = mix(a.at[3], b.at[3], f).toFixed(3);
    key.color.copy(tmp.lerpColors(A.light, B.light, f));
    if (field) { field.rotation.y = t * 0.01 + sm * 0.00012; field.rotation.x = sm * 0.00004; }
    stage.onFrame && stage.onFrame({ t, f, from: A, to: B, mix });
    renderer.render(scene, cam);
  };
  const stage = { scene, group, camera: cam, measure, onFrame: null };
  requestAnimationFrame(frame);
  document.documentElement.classList.add('gl');
  return stage;
}

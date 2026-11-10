// Talentri : catalogue d'objets en plastique recyclé, modélisés en 3D (concepts).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const PALETTE = { blue: '#0B4BEA', pink: '#FFC4DA', cream: '#F4F1EA', ink: '#12172B', sky: '#BBD0FF', rose: '#FF8DB6' };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

let UV = 4; // densité de la texture, réglée par objet

function terrazzo(base, flecks, seed, n = 300) {
  const size = 512, c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, size, size);
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = r() * size, y = r() * size, w = 4 + r() * r() * 26, h = 3 + r() * 8, a = r() * Math.PI;
    const col = flecks[(r() * flecks.length) | 0], al = 0.6 + r() * 0.4;
    for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) {
      g.save(); g.translate(x + dx, y + dy); g.rotate(a); g.globalAlpha = al; g.fillStyle = col;
      g.beginPath(); g.ellipse(0, 0, w, h, 0, 0, 7); g.fill(); g.restore();
    }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

export function makeMaterials() {
  const P = PALETTE;
  const plastic = (map) => new THREE.MeshPhysicalMaterial({ map, roughness: 0.5, metalness: 0, clearcoat: 0.25, clearcoatRoughness: 0.45 });
  const netTex = canvasTex(64, 64, (g) => { g.clearRect(0, 0, 64, 64); g.fillStyle = '#fff'; g.fillRect(0, 0, 64, 7); g.fillRect(0, 0, 7, 64); });
  netTex.wrapS = netTex.wrapT = THREE.RepeatWrapping;
  return {
    blue: plastic(terrazzo(P.blue, ['#ffffff', P.sky, '#082FA8', '#4C7DFF', '#ffffff', P.pink], 11, 240)),
    pink: plastic(terrazzo(P.pink, ['#ffffff', P.rose, P.blue, '#FFE3EE'], 23)),
    cream: plastic(terrazzo(P.cream, [P.blue, P.pink, P.ink, P.sky, P.rose], 37, 300)),
    ink: plastic(terrazzo(P.ink, [P.blue, P.pink, '#39415F', P.cream], 41, 170)),
    gray: new THREE.MeshStandardMaterial({ color: '#C9CBD3', roughness: 0.8 }),
    metal: new THREE.MeshStandardMaterial({ color: '#2A3048', roughness: 0.35, metalness: 0.7 }),
    bag: new THREE.MeshStandardMaterial({ color: '#F1EEE6', roughness: 0.95 }),
    sand: new THREE.MeshStandardMaterial({ color: '#EBE5D6', roughness: 1 }),
    line: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }),
    white: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }),
    net: new THREE.MeshStandardMaterial({ map: netTex, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.9, color: '#ffffff' }),
    clear: new THREE.MeshPhysicalMaterial({ color: '#9FC0FF', transparent: true, opacity: 0.55, roughness: 0.15, clearcoat: 1 }),
    sachet: new THREE.MeshPhysicalMaterial({ color: '#FFD3E2', transparent: true, opacity: 0.8, roughness: 0.4, flatShading: true }),
    sachetB: new THREE.MeshPhysicalMaterial({ color: '#E8EEFF', transparent: true, opacity: 0.8, roughness: 0.4, flatShading: true }),
  };
}

function worldUV(g, s) {
  if (g.index) g = g.toNonIndexed();
  const p = g.attributes.position, uv = new Float32Array(p.count * 2);
  const a = V(0, 0, 0), b = V(0, 0, 0), c = V(0, 0, 0), n = V(0, 0, 0), e = V(0, 0, 0);
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    n.subVectors(b, a).cross(e.subVectors(c, a));
    const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z), pts = [a, b, c];
    for (let j = 0; j < 3; j++) {
      const v = pts[j]; let u, w;
      if (ax >= ay && ax >= az) { u = v.z; w = v.y; } else if (ay >= az) { u = v.x; w = v.z; } else { u = v.x; w = v.y; }
      uv[(i + j) * 2] = u * s; uv[(i + j) * 2 + 1] = w * s;
    }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}
function mesh(geo, mat, shadow = true) {
  const m = new THREE.Mesh(mat.map && mat.alphaTest === 0 ? worldUV(geo, UV) : geo, mat);
  m.castShadow = shadow; m.receiveShadow = true; return m;
}
function box(w, h, d, mat, x = 0, y = 0, z = 0, r) {
  const mn = Math.min(w, h, d), rad = Math.min(r ?? mn * 0.2, mn / 2 - 1e-4);
  const m = mesh(new RoundedBoxGeometry(w, h, d, 3, rad), mat); m.position.set(x, y, z); return m;
}
function cyl(rt, rb, h, mat, x = 0, y = 0, z = 0, seg = 40) {
  const m = mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y, z); return m;
}
function rod(a, b, r, mat, seg = 14) {
  const d = V(0, 0, 0).subVectors(b, a), len = d.length();
  const m = mesh(new THREE.CapsuleGeometry(r, len, 6, seg), mat);
  m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); return m;
}
function lathe(pts, mat, x = 0, y = 0, z = 0, seg = 48) {
  const m = mesh(new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), seg), mat); m.position.set(x, y, z);
  m.material = mat; return m;
}
function quad(a, b, c, d, mat, k = 8) {
  const e1 = V(0, 0, 0).subVectors(b, a).normalize(), n = V(0, 0, 0).subVectors(b, a).cross(V(0, 0, 0).subVectors(d, a)).normalize();
  const e2 = V(0, 0, 0).crossVectors(n, e1);
  const pos = [], uv = [];
  for (const p of [a, b, c, a, c, d]) { pos.push(p.x, p.y, p.z); const q = V(0, 0, 0).subVectors(p, a); uv.push(q.dot(e1) * k, q.dot(e2) * k); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.receiveShadow = false; m.castShadow = false; return m;
}
function at(o, x, y, z, ry = 0) { o.position.set(x, y, z); o.rotation.y = ry; return o; }
function grp(...ch) { const g = new THREE.Group(); ch.forEach((c) => c && g.add(c)); return g; }

/* ---------- Objets ---------- */
function goal(M, w, h, d, r, mat, frame) {
  frame = frame || M.cream; const g = grp(), x = w / 2, td = d * 0.4;
  g.add(rod(V(-x, 0, 0), V(-x, h, 0), r, mat), rod(V(x, 0, 0), V(x, h, 0), r, mat), rod(V(-x, h, 0), V(x, h, 0), r, mat));
  for (const sx of [-x, x]) g.add(rod(V(sx, h, 0), V(sx, h, -td), r * 0.55, frame), rod(V(sx, h, -td), V(sx, 0, -d), r * 0.55, frame), rod(V(sx, 0, 0), V(sx, 0, -d), r * 0.55, frame));
  g.add(rod(V(-x, 0, -d), V(x, 0, -d), r * 0.55, frame), rod(V(-x, h, -td), V(x, h, -td), r * 0.4, frame));
  const k = Math.max(5, 14 / w);
  g.add(quad(V(-x, h, 0), V(x, h, 0), V(x, h, -td), V(-x, h, -td), M.net, k), quad(V(-x, h, -td), V(x, h, -td), V(x, 0, -d), V(-x, 0, -d), M.net, k));
  for (const sx of [-x, x]) g.add(quad(V(sx, 0, 0), V(sx, h, 0), V(sx, h, -td), V(sx, 0, -d), M.net, k));
  return g;
}
function cone(M, body, band) {
  const g = grp(box(0.25, 0.022, 0.25, body, 0, 0.011, 0, 0.008), cyl(0.022, 0.1, 0.3, body, 0, 0.17, 0));
  const rA = 0.1 - 0.078 * 0.42, rB = 0.1 - 0.078 * 0.6;
  g.add(cyl(rB + 0.003, rA + 0.003, 0.054, band, 0, 0.02 + 0.3 * 0.51, 0));
  const top = mesh(new THREE.SphereGeometry(0.023, 20, 12), body); top.position.y = 0.32; g.add(top); return g;
}
function cones(M) { return grp(at(cone(M, M.blue, M.cream), -0.3, 0, 0.05), at(cone(M, M.pink, M.blue), 0.08, 0, -0.18), at(cone(M, M.cream, M.pink), 0.34, 0, 0.14)); }
function marker(mat) { return lathe([[0.045, 0.047], [0.045, 0.055], [0.06, 0.052], [0.085, 0.03], [0.1, 0.005], [0.097, 0], [0.08, 0.022], [0.058, 0.044], [0.045, 0.047]], mat); }
function markers(M) {
  const g = grp(), cs = [M.blue, M.pink, M.cream, M.blue, M.pink];
  [[-0.3, 0.12], [-0.08, -0.14], [0.14, 0.1], [0.36, -0.12], [0.5, 0.16]].forEach(([x, z], i) => g.add(at(marker(cs[i]), x, 0, z)));
  for (let i = 0; i < 5; i++) g.add(at(marker(cs[(i + 1) % 3]), -0.52, i * 0.014, -0.12));
  return g;
}
function pole(M, mat, h = 1.5) { return grp(cyl(0.1, 0.13, 0.035, M.blue, 0, 0.0175, 0), rod(V(0, 0.03, 0), V(0, h, 0), 0.014, mat)); }
function slalom(M) { const g = grp(); [M.pink, M.cream, M.pink, M.cream].forEach((m, i) => g.add(at(pole(M, m), -0.9 + i * 0.6, 0, i % 2 ? -0.22 : 0.22))); return g; }
function hurdle(M, h, mat) { const g = grp(); for (const sx of [-0.3, 0.3]) g.add(rod(V(sx, 0.014, -0.14), V(sx, 0.014, 0.14), 0.014, mat), rod(V(sx, 0.014, 0), V(sx, h, 0), 0.014, mat)); g.add(rod(V(-0.3, h, 0), V(0.3, h, 0), 0.014, mat)); return g; }
function hurdles(M) { return grp(at(hurdle(M, 0.16, M.pink), 0, 0, 0.6), at(hurdle(M, 0.3, M.blue), 0, 0, 0), at(hurdle(M, 0.46, M.pink), 0, 0, -0.6)); }
function ladder(M) {
  const g = grp(box(3.66, 0.008, 0.03, M.ink, 0, 0.004, 0.21, 0.002), box(3.66, 0.008, 0.03, M.ink, 0, 0.004, -0.21, 0.002));
  for (let i = 0; i < 9; i++) g.add(box(0.04, 0.014, 0.46, i % 2 ? M.pink : M.blue, -1.8 + i * 0.45, 0.01, 0, 0.005)); return g;
}
function cornerFlag(M, flag) { return grp(cyl(0.09, 0.12, 0.04, M.blue, 0, 0.02, 0), rod(V(0, 0.03, 0), V(0, 1.5, 0), 0.013, M.cream), box(0.3, 0.2, 0.006, flag, 0.165, 1.38, 0, 0.002)); }
function cornerFlags(M) { return grp(at(cornerFlag(M, M.pink), -0.45, 0, 0.1, 0.3), at(cornerFlag(M, M.blue), 0.35, 0, -0.15, -0.4)); }
function bench(M) {
  const g = grp();
  for (const z of [-0.08, 0.09]) g.add(box(2.4, 0.04, 0.15, M.cream, 0, 0.45, z, 0.012));
  for (const y of [0.68, 0.86]) g.add(box(2.4, 0.14, 0.035, M.blue, 0, y, -0.22, 0.012));
  for (const x of [-1.05, 0, 1.05]) g.add(box(0.07, 0.43, 0.07, M.ink, x, 0.215, 0.12, 0.012), box(0.07, 0.95, 0.07, M.ink, x, 0.475, -0.18, 0.012), box(0.06, 0.06, 0.3, M.ink, x, 0.4, -0.03, 0.012));
  return g;
}
function scoreboard(M) {
  const g = grp(box(0.1, 1.5, 0.1, M.blue, -0.6, 0.75, 0, 0.02), box(0.1, 1.5, 0.1, M.blue, 0.6, 0.75, 0, 0.02), box(0.5, 0.07, 0.4, M.blue, -0.6, 0.035, 0, 0.02), box(0.5, 0.07, 0.4, M.blue, 0.6, 0.035, 0, 0.02));
  g.add(box(1.7, 1.0, 0.1, M.ink, 0, 1.75, 0, 0.04));
  const digit = (t) => new THREE.MeshStandardMaterial({ roughness: 0.6, map: canvasTex(256, 320, (c, w, h) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.fillStyle = PALETTE.ink; c.font = '800 250px Poppins, Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(t, w / 2, h / 2 + 12); }) });
  const label = (t, bg) => new THREE.MeshStandardMaterial({ roughness: 0.6, map: canvasTex(512, 96, (c, w, h) => { c.fillStyle = bg; c.fillRect(0, 0, w, h); c.fillStyle = PALETTE.ink; c.font = '700 54px Poppins, Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(t, w / 2, h / 2 + 4); }) });
  const pl = (w, h, mat, x, y) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, 0.069); return m; };
  g.add(box(0.56, 0.62, 0.03, M.white, -0.4, 1.68, 0.05, 0.02), box(0.56, 0.62, 0.03, M.white, 0.4, 1.68, 0.05, 0.02));
  g.add(pl(0.5, 0.58, digit('2'), -0.4, 1.68), pl(0.5, 0.58, digit('1'), 0.4, 1.68));
  const l1 = pl(0.56, 0.11, label('LOCAUX', PALETTE.pink), -0.4, 2.1), l2 = pl(0.56, 0.11, label('VISITEURS', PALETTE.sky), 0.4, 2.1);
  l1.position.z = l2.position.z = 0.052; g.add(l1, l2); return g;
}
function basket(M) {
  const g = grp(box(1.0, 0.26, 0.7, M.ink, 0, 0.13, -0.25, 0.05), box(0.13, 2.9, 0.13, M.blue, 0, 1.6, -0.3, 0.03), rod(V(0, 2.95, -0.3), V(0, 3.05, 0.26), 0.05, M.blue));
  g.add(box(1.25, 0.85, 0.045, M.cream, 0, 3.12, 0.3, 0.02));
  const z = 0.326; g.add(box(0.5, 0.03, 0.012, M.blue, 0, 3.14, z, 0.004), box(0.5, 0.03, 0.012, M.blue, 0, 2.82, z, 0.004), box(0.03, 0.35, 0.012, M.blue, -0.235, 2.98, z, 0.004), box(0.03, 0.35, 0.012, M.blue, 0.235, 2.98, z, 0.004));
  const ring = mesh(new THREE.TorusGeometry(0.225, 0.014, 12, 48), M.pink); ring.rotation.x = Math.PI / 2; ring.position.set(0, 2.82, 0.6); g.add(ring, box(0.1, 0.03, 0.14, M.pink, 0, 2.82, 0.36, 0.008));
  const ng = new THREE.CylinderGeometry(0.225, 0.13, 0.36, 24, 1, true), u = ng.attributes.uv; for (let i = 0; i < u.count; i++) u.setXY(i, u.getX(i) * 14, u.getY(i) * 4);
  const net = new THREE.Mesh(ng, M.net); net.position.set(0, 2.63, 0.6); g.add(net); return g;
}
function volley(M) {
  const g = grp();
  for (const sx of [-2.7, 2.7]) g.add(cyl(0.3, 0.34, 0.07, M.pink, sx, 0.035, 0), rod(V(sx, 0.05, 0), V(sx, 2.5, 0), 0.05, M.blue));
  g.add(quad(V(-2.65, 1.45, 0), V(2.65, 1.45, 0), V(2.65, 2.4, 0), V(-2.65, 2.4, 0), M.net, 9));
  g.add(box(5.3, 0.07, 0.02, M.white, 0, 2.43, 0, 0.006), box(5.3, 0.04, 0.02, M.white, 0, 1.44, 0, 0.006));
  for (const sx of [-2.2, 2.2]) g.add(rod(V(sx, 1.45, 0.012), V(sx, 3.1, 0.012), 0.012, M.pink)); return g;
}
function skate(M) {
  const L = 0.56, W = 0.2, s = new THREE.Shape(); s.moveTo(-L / 2 + W / 2, -W / 2); s.lineTo(L / 2 - W / 2, -W / 2); s.absarc(L / 2 - W / 2, 0, W / 2, -Math.PI / 2, Math.PI / 2, false); s.lineTo(-L / 2 + W / 2, W / 2); s.absarc(-L / 2 + W / 2, 0, W / 2, Math.PI / 2, Math.PI * 1.5, false);
  const deck = mesh(new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 3, curveSegments: 24 }), M.blue);
  deck.rotation.x = -Math.PI / 2; deck.position.y = 0.082; const g = grp(deck);
  for (const sx of [-0.19, 0.19]) { g.add(box(0.06, 0.03, 0.1, M.ink, sx, 0.066, 0, 0.008), rod(V(sx, 0.036, -0.1), V(sx, 0.036, 0.1), 0.007, M.metal)); for (const sz of [-0.11, 0.11]) { const w = cyl(0.034, 0.034, 0.036, M.pink, sx, 0.036, sz, 28); w.rotation.x = Math.PI / 2; g.add(w); } }
  g.rotation.y = 0.5; return grp(g);
}
function paddle(M, top) { const g = grp(cyl(0.078, 0.078, 0.008, M.cream, 0, 0.006, 0), cyl(0.078, 0.078, 0.004, top, 0, 0.012, 0), cyl(0.078, 0.078, 0.004, M.ink, 0, 0, 0)); g.add(box(0.11, 0.024, 0.03, M.cream, 0.12, 0.006, 0, 0.008)); return g; }
function pingpong(M) {
  const a = at(paddle(M, M.blue), -0.1, 0.004, 0.06, 0.5), b = at(paddle(M, M.pink), 0.13, 0.004, -0.07, -2.5);
  const ball = mesh(new THREE.SphereGeometry(0.02, 24, 16), M.white); ball.position.set(0.12, 0.02, 0.13); return grp(a, b, ball);
}
function dumbbell(M, head) { const g = grp(rod(V(-0.09, 0, 0), V(0.09, 0, 0), 0.016, M.metal)); for (const sx of [-0.11, 0.11]) { const h = mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.07, 6), head); h.rotation.set(Math.PI / 6, 0, Math.PI / 2); h.rotation.order = 'ZYX'; h.position.x = sx; g.add(h); } g.position.y = 0.0502; return g; }
function dumbbells(M) { return grp(at(dumbbell(M, M.blue), -0.1, 0.0502, 0.1, 0.25), at(dumbbell(M, M.pink), 0.1, 0.0502, -0.12, -0.5)); }
function kettlebell(M, mat, s = 1) {
  const body = mesh(new THREE.SphereGeometry(0.11, 40, 28), mat); body.scale.y = 0.94; body.position.y = 0.1;
  const h = mesh(new THREE.TorusGeometry(0.062, 0.017, 14, 32, Math.PI), mat); h.position.y = 0.215;
  const g = grp(body, h, rod(V(-0.062, 0.16, 0), V(-0.062, 0.215, 0), 0.017, mat), rod(V(0.062, 0.16, 0), V(0.062, 0.215, 0), 0.017, mat), cyl(0.06, 0.07, 0.02, mat, 0, 0.01, 0));
  g.scale.setScalar(s); return g;
}
function kettlebells(M) { return grp(at(kettlebell(M, M.blue, 1.15), -0.2, 0, -0.05, 0.3), at(kettlebell(M, M.pink, 0.9), 0.08, 0, 0.1, -0.4), at(kettlebell(M, M.ink, 0.72), 0.3, 0, -0.04, 0.2)); }
function workout(M) {
  const g = grp(box(0.13, 2.45, 0.13, M.blue, -0.75, 1.225, 0, 0.03), box(0.13, 2.45, 0.13, M.blue, 0.75, 1.225, 0, 0.03), rod(V(-0.75, 2.28, 0), V(0.75, 2.28, 0), 0.02, M.metal), rod(V(-0.75, 1.5, 0), V(0.75, 1.5, 0), 0.02, M.metal));
  for (const x of [1.45, 2.45]) for (const z of [-0.28, 0.28]) g.add(box(0.11, 1.2, 0.11, M.pink, x, 0.6, z, 0.025));
  for (const z of [-0.28, 0.28]) g.add(rod(V(1.3, 1.2, z), V(2.6, 1.2, z), 0.022, M.metal));
  g.add(box(0.11, 0.5, 0.11, M.cream, -1.4, 0.25, -0.2, 0.025), box(0.11, 0.5, 0.11, M.cream, -1.4, 0.25, 0.3, 0.025), box(0.11, 0.05, 0.75, M.cream, -1.4, 0.5, 0.05, 0.02)); return g;
}
function trophy(M) {
  const g = grp(box(0.17, 0.05, 0.17, M.ink, 0, 0.025, 0, 0.01));
  g.add(lathe([[0, 0.05], [0.055, 0.05], [0.055, 0.068], [0.022, 0.09], [0.018, 0.16], [0.03, 0.19], [0.07, 0.22], [0.095, 0.3], [0.106, 0.4], [0.098, 0.4], [0.088, 0.31], [0.064, 0.236], [0, 0.216]], M.pink));
  for (const s of [-1, 1]) { const h = mesh(new THREE.TorusGeometry(0.045, 0.009, 12, 28, Math.PI), M.blue); h.position.set(s * 0.097, 0.31, 0); h.rotation.z = -s * Math.PI / 2; g.add(h); }
  return g;
}
function schoolDesk(M) {
  const g = grp();
  for (const sx of [-0.52, 0.52]) g.add(box(0.06, 0.05, 0.95, M.blue, sx, 0.025, -0.05, 0.012), box(0.06, 0.72, 0.06, M.blue, sx, 0.36, 0.32, 0.012), box(0.06, 0.44, 0.06, M.blue, sx, 0.22, -0.26, 0.012), box(0.06, 0.82, 0.06, M.blue, sx, 0.41, -0.46, 0.012));
  const top = box(1.16, 0.035, 0.42, M.cream, 0, 0.74, 0.3, 0.012); top.rotation.x = 0.1; g.add(top, box(1.04, 0.025, 0.3, M.pink, 0, 0.56, 0.3, 0.01));
  g.add(box(1.16, 0.035, 0.3, M.cream, 0, 0.45, -0.3, 0.012), box(1.16, 0.16, 0.03, M.pink, 0, 0.72, -0.47, 0.012), rod(V(-0.52, 0.12, 0.1), V(0.52, 0.12, 0.1), 0.018, M.blue)); return g;
}
function parkBench(M) {
  const g = grp();
  for (const z of [-0.13, 0, 0.13]) g.add(box(1.7, 0.035, 0.11, M.blue, 0, 0.45, z, 0.012));
  for (const y of [0.62, 0.76, 0.9]) { const s = box(1.7, 0.11, 0.035, M.blue, 0, y, -0.24 - (y - 0.62) * 0.2, 0.012); s.rotation.x = -0.2; g.add(s); }
  for (const sx of [-0.7, 0.7]) g.add(box(0.07, 0.45, 0.07, M.ink, sx, 0.225, 0.16, 0.015), box(0.07, 0.98, 0.07, M.ink, sx, 0.49, -0.24, 0.015).rotateX(-0.2), box(0.07, 0.06, 0.5, M.ink, sx, 0.4, -0.02, 0.015), box(0.08, 0.04, 0.5, M.pink, sx, 0.66, -0.02, 0.015), box(0.06, 0.22, 0.06, M.ink, sx, 0.55, 0.16, 0.015));
  return g;
}
function pavers(M) {
  const g = grp(), R = 0.12, r = rng(7), ms = [M.blue, M.pink, M.cream, M.blue, M.pink, M.cream, M.ink];
  const hex = (m, x, y, z) => { const h = mesh(new THREE.CylinderGeometry(R - 0.004, R - 0.004, 0.06, 6), m); h.position.set(x, y, z); return h; };
  for (let i = 0; i < 5; i++) for (let j = 0; j < 6; j++) { if ((i === 0 && j === 5) || (i === 4 && j === 0)) continue; g.add(hex(ms[(r() * ms.length) | 0], (j + (i % 2) * 0.5) * Math.sqrt(3) * R, 0.03, i * 1.5 * R)); }
  for (let k = 0; k < 3; k++) g.add(hex(ms[k], 1.45, 0.03 + k * 0.062, 0.1 + k * 0.01)); return g;
}
function furniture(M) {
  const g = grp(cyl(0.17, 0.17, 0.04, M.pink, -0.55, 0.45, 0.15));
  for (let i = 0; i < 3; i++) { const a = (i * 2 * Math.PI) / 3 + 0.4; g.add(rod(V(-0.55 + Math.cos(a) * 0.1, 0.43, 0.15 + Math.sin(a) * 0.1), V(-0.55 + Math.cos(a) * 0.19, 0.012, 0.15 + Math.sin(a) * 0.19), 0.017, M.blue)); }
  for (const y of [0.06, 0.46, 0.86]) g.add(box(0.8, 0.035, 0.3, M.blue, 0.25, y, -0.1, 0.012));
  for (const sx of [-0.14, 0.64]) g.add(box(0.035, 0.92, 0.3, M.cream, sx, 0.46, -0.1, 0.012));
  g.add(box(0.14, 0.2, 0.2, M.pink, 0.05, 0.58, -0.1, 0.02), box(0.1, 0.26, 0.2, M.ink, 0.19, 0.61, -0.1, 0.02), cyl(0.07, 0.05, 0.12, M.pink, 0.42, 0.94, -0.1)); return g;
}
function flakes(M, n, place, seed) {
  const r = rng(seed), im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.036, 0.008, 0.024), new THREE.MeshStandardMaterial({ roughness: 0.5 }), n), o = new THREE.Object3D(), c = new THREE.Color();
  const cols = [PALETTE.blue, PALETTE.pink, PALETTE.cream, PALETTE.sky, PALETTE.blue, PALETTE.rose];
  for (let i = 0; i < n; i++) { place(o, r); o.rotation.set(r() * 3, r() * 3, r() * 3); o.updateMatrix(); im.setMatrixAt(i, o.matrix); im.setColorAt(i, c.set(cols[(r() * cols.length) | 0])); }
  im.castShadow = true; im.receiveShadow = true; return im;
}
function bigbag(M) {
  const g = grp(box(0.9, 0.86, 0.9, M.bag, 0, 0.43, 0, 0.09));
  for (const sx of [-0.36, 0.36]) for (const sz of [-0.36, 0.36]) { const l = mesh(new THREE.TorusGeometry(0.09, 0.016, 10, 20, Math.PI), M.blue); l.position.set(sx, 0.84, sz); l.rotation.y = Math.atan2(sz, -sx); g.add(l); }
  g.add(flakes(M, 900, (o, r) => { const a = r() * 6.283, d = Math.sqrt(r()) * 0.38; o.position.set(Math.cos(a) * d, 0.86 + 0.13 * (1 - (d / 0.38) ** 2) * r(), Math.sin(a) * d); }, 5));
  g.add(flakes(M, 70, (o, r) => { const a = r() * 6.283, d = 0.55 + r() * 0.35; o.position.set(Math.cos(a) * d, 0.006, Math.sin(a) * d * 0.8 + 0.2); }, 9));
  const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.2), new THREE.MeshStandardMaterial({ roughness: 0.9, map: canvasTex(500, 200, (c, w, h) => { c.fillStyle = '#F1EEE6'; c.fillRect(0, 0, w, h); c.fillStyle = PALETTE.blue; c.font = '800 78px Poppins, Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('talentri', w / 2, 78); c.fillStyle = PALETTE.ink; c.font = '600 34px Poppins, Arial, sans-serif'; c.fillText('BROYAT PEHD · 500 KG', w / 2, 152); }) }));
  lab.position.set(0, 0.45, 0.452); g.add(lab); return g;
}
function bottle(M, cap) { return grp(lathe([[0, 0], [0.03, 0], [0.034, 0.012], [0.034, 0.13], [0.03, 0.165], [0.013, 0.195], [0.013, 0.215], [0, 0.215]], M.clear, 0, 0, 0, 20), cyl(0.016, 0.016, 0.018, cap || M.blue, 0, 0.222, 0, 16)); }
function lying(o, x, z, ry) { o.rotation.z = Math.PI / 2; const g = grp(o); g.position.set(x, 0.034, z); g.rotation.y = ry; return g; }
function qrMat() {
  return new THREE.MeshStandardMaterial({ roughness: 0.7, map: canvasTex(520, 640, (c, w, h) => {
    c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); const r = rng(77), n = 25, s = 16, ox = 60, oy = 150; c.fillStyle = PALETTE.ink;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (r() > 0.52) c.fillRect(ox + i * s, oy + j * s, s, s);
    const eye = (x, y) => { c.fillStyle = '#fff'; c.fillRect(x - s, y - s, 9 * s, 9 * s); c.fillStyle = PALETTE.ink; c.fillRect(x, y, 7 * s, 7 * s); c.fillStyle = '#fff'; c.fillRect(x + s, y + s, 5 * s, 5 * s); c.fillStyle = PALETTE.blue; c.fillRect(x + 2 * s, y + 2 * s, 3 * s, 3 * s); };
    eye(ox, oy); eye(ox + 18 * s, oy); eye(ox, oy + 18 * s);
    c.fillStyle = PALETTE.blue; c.font = '800 64px Poppins, Arial, sans-serif'; c.textAlign = 'center'; c.fillText('talentri', w / 2, 80); c.fillStyle = PALETTE.ink; c.font = '600 30px Poppins, Arial, sans-serif'; c.fillText('SCANNEZ · DÉPOSEZ', w / 2, 124); c.fillText('POINT DE COLLECTE ASC', w / 2, 606);
  }) });
}
function collectBin(M) {
  const g = grp(box(0.8, 1.0, 0.7, M.blue, 0, 0.5, 0, 0.07), box(0.86, 0.09, 0.76, M.pink, 0, 1.045, 0, 0.035));
  const hole = cyl(0.13, 0.13, 0.02, M.ink, 0, 0.8, 0.352, 40); hole.rotation.x = Math.PI / 2; const rim = mesh(new THREE.TorusGeometry(0.135, 0.016, 12, 40), M.pink); rim.position.set(0, 0.8, 0.356); g.add(hole, rim);
  const q = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.443), qrMat()); q.position.set(0, 0.36, 0.3515); g.add(q);
  g.add(at(bottle(M), 0.62, 0, 0.3), lying(bottle(M, M.pink), 0.75, 0.52, 0.6), lying(bottle(M), -0.6, 0.5, -0.9)); return g;
}

/* ---------- Scènes ---------- */
function pitch(M, w, d) {
  const g = grp(box(w, 0.1, d, M.sand, 0, -0.05, 0, 0.04));
  const t = 0.05, y = 0.003, L = (lw, ld, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(lw, 0.004, ld), M.line); m.position.set(x, y, z); m.receiveShadow = true; g.add(m); };
  L(w - 0.6, t, 0, d / 2 - 0.3); L(w - 0.6, t, 0, -d / 2 + 0.3); L(t, d - 0.6, -w / 2 + 0.3, 0); L(t, d - 0.6, w / 2 - 0.3, 0); L(t, d - 0.6, 0, 0);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.8, 48), M.line); ring.rotation.x = -Math.PI / 2; ring.position.y = y + 0.002; g.add(ring); return g;
}
export function sceneProblem(M) {
  UV = 2; const g = pitch(M, 8, 5), r = rng(3);
  const gl = goal(M, 2.4, 1.6, 0.9, 0.05, M.gray, M.gray); gl.rotation.y = Math.PI / 2; gl.position.set(-3.7, 0, 0); g.add(gl);
  const gr = goal(M, 2.4, 1.6, 0.9, 0.05, M.gray, M.gray); gr.rotation.y = -Math.PI / 2; gr.position.set(3.7, 0, 0); g.add(gr);
  for (let i = 0; i < 95; i++) { const x = (r() - 0.5) * 7.4, z = (r() - 0.5) * 4.5, b = bottle(M, r() > 0.5 ? M.pink : M.blue); b.scale.setScalar(1.5); g.add(lying(b, x, z, r() * 6.283)).children.at(-1).position.y = 0.051; }
  for (let i = 0; i < 80; i++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 0), r() > 0.5 ? M.sachet : M.sachetB); m.scale.set(1 + r() * 0.6, 0.28 + r() * 0.2, 0.8 + r() * 0.5); m.position.set((r() - 0.5) * 7.5, 0.035, (r() - 0.5) * 4.6); m.rotation.y = r() * 6; m.castShadow = true; g.add(m); }
  for (let i = 0; i < 26; i++) { const a = r() * 6.283, d = r() * 0.55, b = bottle(M, M.blue); b.scale.setScalar(1.5); const l = lying(b, 2.9 + Math.cos(a) * d, 1.7 + Math.sin(a) * d * 0.6, r() * 6); l.position.y = 0.05 + r() * 0.28 * (1 - d / 0.55); l.rotation.z = (r() - 0.5) * 0.8; g.add(l); }
  return g;
}
export function sceneAfter(M) {
  UV = 2; const g = pitch(M, 8, 5);
  const gl = goal(M, 2.4, 1.6, 0.9, 0.055, M.blue); gl.rotation.y = Math.PI / 2; gl.position.set(-3.7, 0, 0); g.add(gl);
  const gr = goal(M, 2.4, 1.6, 0.9, 0.055, M.pink); gr.rotation.y = -Math.PI / 2; gr.position.set(3.7, 0, 0); g.add(gr);
  const S = (o, s, x, z, ry = 0) => { o.scale.setScalar(s); o.position.set(x, 0, z); o.rotation.y = ry; g.add(o); };
  for (let i = 0; i < 5; i++) S(cone(M, i % 2 ? M.pink : M.blue, M.cream), 1.6, -1.6 + i * 0.8, 1.2 - (i % 2) * 0.5);
  for (const [x, z] of [[-3.7, 2.2], [3.7, 2.2], [-3.7, -2.2], [3.7, -2.2]]) S(cornerFlag(M, M.pink), 0.8, x, z, 0.5);
  S(bench(M), 0.9, 0, -2.9); S(collectBin(M), 1, 3.2, 2.9, -0.3); S(scoreboard(M), 0.8, -2.6, -3.1, 0.15); return g;
}
export function sceneBottles(M) {
  UV = 6; const g = grp(), r = rng(12);
  for (let i = 0; i < 9; i++) { const b = bottle(M, i % 3 ? M.blue : M.pink); g.add(at(b, (r() - 0.5) * 0.5, 0, (r() - 0.5) * 0.3)); }
  for (let i = 0; i < 7; i++) g.add(lying(bottle(M, i % 2 ? M.pink : M.blue), (r() - 0.5) * 0.8, 0.22 + r() * 0.25, r() * 6));
  for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.06, 0), i % 2 ? M.sachet : M.sachetB); m.scale.set(1.3, 0.35, 1); m.position.set((r() - 0.5) * 0.9, 0.02, 0.3 + r() * 0.3); m.castShadow = true; g.add(m); }
  return g;
}
export function sceneHero(M) {
  UV = 2.2; const g = grp(), S = (o, s, x, z, ry = 0) => { o.scale.setScalar(s); o.position.set(x, 0, z); o.rotation.y = ry; g.add(o); return o; };
  S(goal(M, 3, 2, 1.1, 0.055, M.blue), 1, 0, -1.2);
  S(cones(M), 1.5, -1.5, 0.75, 0.3); S(markers(M), 1.5, 0.2, 1.25, -0.2); S(slalom(M), 0.95, 1.9, -0.1, -0.5);
  S(hurdles(M), 1.1, -0.35, 0.05, 1.2); S(collectBin(M), 1, 2.75, 0.95, -0.5); S(trophy(M), 1.5, -2.35, 0.2, 0.4); S(kettlebells(M), 1.25, 1.25, 1.05, 0.3);
  S(bench(M), 0.82, -2.55, -1.15, 0.5); S(skate(M), 1.5, -0.7, 1.45, 0.9); return g;
}

/* ---------- Catalogue ---------- */
export const CATEGORIES = [
  { id: 'foot', label: 'Football' }, { id: 'sports', label: 'Autres sports' }, { id: 'muscu', label: 'Musculation' },
  { id: 'ville', label: 'Mairies et écoles' }, { id: 'maison', label: 'Particuliers' }, { id: 'pro', label: 'Entreprises' },
];
export const CATALOG = [
  { id: 'but', cat: 'foot', name: 'But de football', desc: 'Poteaux en profilés de plastique recyclé, filet tressé en fil recyclé.', uv: 1.6, build: (M) => goal(M, 5, 2, 1.5, 0.06, M.blue), dir: [0.75, 0.42, 1.3] },
  { id: 'minibut', cat: 'foot', name: 'Mini-but d\'entraînement', desc: 'Léger et démontable, pour les séances des petites catégories.', uv: 4, build: (M) => goal(M, 1.4, 0.9, 0.7, 0.03, M.pink), dir: [0.8, 0.45, 1.3] },
  { id: 'cones', cat: 'foot', name: 'Cônes d\'entraînement', desc: 'Moulés par injection, stables et empilables.', uv: 9, build: cones },
  { id: 'coupelles', cat: 'foot', name: 'Coupelles de marquage', desc: 'Pour délimiter les ateliers et les terrains réduits.', uv: 12, build: markers, dir: [0.6, 0.75, 1.2] },
  { id: 'piquets', cat: 'foot', name: 'Piquets de slalom', desc: 'Socle lesté et tige souple pour le travail de conduite de balle.', uv: 5, build: slalom },
  { id: 'haies', cat: 'foot', name: 'Haies de coordination', desc: 'Trois hauteurs pour la vitesse et la détente.', uv: 7, build: hurdles, dir: [1.2, 0.6, 0.9] },
  { id: 'echelle', cat: 'foot', name: 'Échelle de rythme', desc: 'Barreaux rigides et sangles pour le travail d\'appuis.', uv: 4, build: ladder, dir: [0.7, 0.8, 1.1] },
  { id: 'corner', cat: 'foot', name: 'Poteaux de corner', desc: 'Les quatre coins du terrain aux couleurs de l\'ASC.', uv: 5, build: cornerFlags },
  { id: 'banc-touche', cat: 'foot', name: 'Banc de touche', desc: 'Lattes extrudées, résistantes au soleil et à la pluie.', uv: 3, build: bench, dir: [0.9, 0.5, 1.2] },
  { id: 'score', cat: 'foot', name: 'Tableau de score', desc: 'Affichage manuel pour les matchs de navétanes.', uv: 3.5, build: scoreboard, dir: [0.55, 0.3, 1.4] },
  { id: 'trophee', cat: 'foot', name: 'Trophée de tournoi', desc: 'La coupe de la finale, coulée dans le plastique du quartier.', uv: 14, build: trophy },
  { id: 'basket', cat: 'sports', name: 'Panneau de basket', desc: 'Panneau en plaque pressée, cercle et poteau lesté.', uv: 2.5, build: basket, dir: [1.0, 0.25, 1.3] },
  { id: 'volley', cat: 'sports', name: 'Poteaux de volley', desc: 'Poteaux sur socles et filet pour la plage ou la cour d\'école.', uv: 1.8, build: volley, dir: [0.7, 0.4, 1.3] },
  { id: 'skate', cat: 'sports', name: 'Planche de skate', desc: 'Plateau injecté d\'une seule pièce, pour découvrir une discipline olympique.', uv: 12, build: skate, dir: [0.7, 0.7, 1.2] },
  { id: 'pingpong', cat: 'sports', name: 'Raquettes de tennis de table', desc: 'Palette en plaque pressée, manche ergonomique.', uv: 18, build: pingpong, dir: [0.5, 0.9, 1.1] },
  { id: 'halteres', cat: 'muscu', name: 'Haltères', desc: 'Coques hexagonales en plastique recyclé, lestées de sable.', uv: 14, build: dumbbells, dir: [0.8, 0.7, 1.2] },
  { id: 'kettlebell', cat: 'muscu', name: 'Kettlebells', desc: 'Trois gabarits lestés pour le renforcement.', uv: 10, build: kettlebells },
  { id: 'workout', cat: 'muscu', name: 'Station de street workout', desc: 'Barre de traction, barres parallèles et banc pour les espaces publics.', uv: 2.2, build: workout, dir: [0.8, 0.4, 1.3] },
  { id: 'table-banc', cat: 'ville', name: 'Table-banc scolaire', desc: 'Deux places, sans entretien, pour les écoles de la commune.', uv: 4.5, build: schoolDesk, dir: [1.1, 0.55, 1.1] },
  { id: 'banc-public', cat: 'ville', name: 'Banc public', desc: 'Pour les places, les terrains et les abords des stades.', uv: 4, build: parkBench, dir: [0.9, 0.5, 1.2] },
  { id: 'paves', cat: 'ville', name: 'Pavés autobloquants', desc: 'Pavés hexagonaux en plastique et sable pour les allées.', uv: 5, build: pavers, dir: [0.7, 0.85, 1.1] },
  { id: 'mobilier', cat: 'maison', name: 'Mobilier', desc: 'Tabouret et étagère en plaques de plastique recyclé.', uv: 5, build: furniture },
  { id: 'broyat', cat: 'pro', name: 'Plastique broyé', desc: 'Paillettes triées par type de plastique, livrées en big bag.', uv: 4, build: bigbag },
  { id: 'collecte', cat: 'pro', name: 'Point de collecte', desc: 'Le bac de l\'ASC, identifié par son code QR.', uv: 4, build: collectBin, dir: [0.7, 0.4, 1.3] },
];

export function normalize(obj, size = 2.4) {
  const g = grp(obj), b = new THREE.Box3().setFromObject(obj), s = b.getSize(V(0, 0, 0)), c = b.getCenter(V(0, 0, 0));
  const k = size / Math.max(s.x, s.y, s.z); obj.position.set(-c.x, -b.min.y, -c.z); g.scale.setScalar(k); return g;
}
export function buildItem(item, M) { UV = (item.uv || 4) * 0.55; return normalize(item.build(M)); }

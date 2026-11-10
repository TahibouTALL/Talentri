// Scène, lumière et cadrage partagés par les rendus et la visionneuse du site.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export function createStage(canvas, { w, h, pixelRatio = 1, fov = 26 } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(pixelRatio); renderer.setSize(w, h, false);
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.5;
  const key = new THREE.DirectionalLight(0xffffff, 2.3); key.position.set(3.5, 7, 4.5); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 7; key.shadow.blurSamples = 18; key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  scene.add(key, new THREE.HemisphereLight(0xffffff, 0xdfe6ff, 0.55));
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: 0.24 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.001; ground.receiveShadow = true; scene.add(ground);
  const camera = new THREE.PerspectiveCamera(fov, w / h, 0.05, 200);
  let current = null;
  const center = new THREE.Vector3();

  function setShadowBounds(r) {
    const c = key.shadow.camera; c.left = -r; c.right = r; c.top = r; c.bottom = -r; c.near = 0.1; c.far = r * 8 + 20; c.updateProjectionMatrix();
    key.position.set(3.5, 7, 4.5).normalize().multiplyScalar(r * 3 + 4).add(center); key.target.position.copy(center); scene.add(key.target);
  }
  function show(obj, dir = [0.9, 0.5, 1.25], margin = 1.12) {
    if (current) scene.remove(current);
    current = obj; scene.add(obj); obj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj), sph = box.getBoundingSphere(new THREE.Sphere());
    center.copy(sph.center); setShadowBounds(sph.radius * 1.3);
    const d = new THREE.Vector3(...dir).normalize(); let dist = sph.radius * 3;
    const corners = []; for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) corners.push(new THREE.Vector3(x, y, z));
    const fill = 0.9 / margin, v = new THREE.Vector3();
    for (let it = 0; it < 6; it++) {
      camera.position.copy(center).addScaledVector(d, dist); camera.lookAt(center); camera.updateMatrixWorld(true);
      let x0 = 9, x1 = -9, y0 = 9, y1 = -9;
      for (const c of corners) { v.copy(c).project(camera); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
      const th = Math.tan((camera.fov * Math.PI) / 360) * dist;
      center.addScaledVector(right, ((x0 + x1) / 2) * th * camera.aspect).addScaledVector(up, ((y0 + y1) / 2) * th);
      dist *= Math.max((x1 - x0) / 2, (y1 - y0) / 2) / fill;
    }
    camera.position.copy(center).addScaledVector(d, dist); camera.lookAt(center);
    return { center: center.clone(), radius: sph.radius, dist };
  }
  function resize(nw, nh) { renderer.setSize(nw, nh, false); camera.aspect = nw / nh; camera.updateProjectionMatrix(); }
  const render = () => renderer.render(scene, camera);
  return { renderer, scene, camera, show, render, resize, key };
}

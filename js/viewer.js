// Vitrine 3D interactive : chargée seulement quand le catalogue approche de l'écran.
const host = document.getElementById('stage');
if (host) {
  const start = async () => {
    try {
      const [{ OrbitControls }, { createStage }, MD] = await Promise.all([import('three/addons/controls/OrbitControls.js'), import('./stage.js'), import('./models.js')]);
      try { await Promise.all([document.fonts.load('800 100px Poppins'), document.fonts.load('600 30px Poppins')]); } catch (e) { /* police par défaut */ }
      const canvas = document.getElementById('gl'), still = document.getElementById('still');
      const size = () => [Math.max(2, host.clientWidth), Math.max(2, host.clientHeight)];
      const [w, h] = size(), st = createStage(canvas, { w, h, pixelRatio: Math.min(devicePixelRatio || 1, 2) });
      const M = MD.makeMaterials(), ctl = new OrbitControls(st.camera, canvas);
      ctl.enablePan = false; ctl.enableZoom = false; ctl.enableDamping = true; ctl.autoRotate = true; ctl.autoRotateSpeed = 1.6; ctl.maxPolarAngle = Math.PI / 2.05; ctl.minPolarAngle = 0.5;
      const cache = {};
      const select = (id) => {
        const it = MD.CATALOG.find((x) => x.id === id); if (!it) return;
        const obj = cache[id] || (cache[id] = MD.buildItem(it, M)), f = st.show(obj, it.dir, 1.2);
        ctl.target.copy(f.center); ctl.update(); still.style.opacity = 0;
      };
      window.Talentri3D = { select };
      select((window.TalentriUI && window.TalentriUI.current()) || MD.CATALOG[0].id);
      new ResizeObserver(() => { const [nw, nh] = size(); st.resize(nw, nh); }).observe(host);
      let visible = true; new IntersectionObserver((e) => (visible = e[0].isIntersecting)).observe(host);
      (function loop() { requestAnimationFrame(loop); if (!visible) return; ctl.update(); st.render(); })();
    } catch (err) { console.warn('Vitrine 3D indisponible, images fixes conservées.', err); }
  };
  const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) { io.disconnect(); start(); } }, { rootMargin: '600px' });
  io.observe(host);
}

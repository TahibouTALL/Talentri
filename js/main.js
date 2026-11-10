// Talentri : interactions de la page (sans dépendance).
(function () {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Paillettes décoratives
  $$('.flecks').forEach((box) => {
    const n = +box.dataset.n || 12, dark = box.dataset.dark, cols = dark ? ['#0B4BEA', '#FFC4DA', '#2A3358', '#BBD0FF'] : ['#0B4BEA', '#FFC4DA', '#BBD0FF', '#12172B', '#FF8DB6'];
    for (let i = 0; i < n; i++) {
      const e = document.createElement('i'), w = 14 + Math.random() * 46;
      e.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 100}%;width:${w}px;height:${Math.max(8, w * 0.32)}px;background:${cols[i % cols.length]};--a:${Math.random() * 180}deg;--x:${(Math.random() - 0.5) * 80}px;--y:${(Math.random() - 0.5) * 80}px;--d:${12 + Math.random() * 16}s;opacity:${dark ? 0.55 : 0.5 + Math.random() * 0.4}`;
      box.appendChild(e);
    }
  });

  // Apparition au défilement, compteurs, barres
  const fmt = (n) => Math.round(n).toLocaleString('fr-FR').replace(/ | /g, ' ');
  function count(el) {
    const to = +el.dataset.count; if (reduce) { el.textContent = fmt(to); return; }
    const t0 = performance.now(), d = 1500;
    (function tick(t) { const p = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - p, 4); el.textContent = fmt(to * e); if (p < 1) requestAnimationFrame(tick); })(t0);
  }
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return; e.target.classList.add('in'); io.unobserve(e.target);
    $$('[data-count]', e.target).forEach(count); $$('[data-w]', e.target).forEach((b) => (b.style.width = b.dataset.w + '%'));
    if (e.target.id === 'panel') $$('#bars div').forEach((b, i) => setTimeout(() => (b.style.height = b.dataset.h + '%'), 80 * i));
  }), { threshold: 0.18 });
  $$('.rv').forEach((e) => io.observe(e));

  // Tableau de bord de démonstration
  const weeks = [22, 35, 31, 48, 44, 61, 53, 68], bars = $('#bars');
  if (bars) weeks.forEach((v, i) => { const d = document.createElement('div'); d.dataset.h = (v / 68) * 100; d.innerHTML = `<span>S${i + 1}</span>`; d.title = v + ' kg'; bars.appendChild(d); });
  const rank = $('#rank');
  if (rank) [['ASC du quartier Nord', 470], ['ASC du quartier Gare', 412], ['ASC du quartier Plateau', 356], ['ASC du quartier Sud', 298]].forEach(([n, k], i) => { const li = document.createElement('li'); li.innerHTML = `<b>${i + 1}</b><span>${n}</span><b>${k} kg</b>`; rank.appendChild(li); });
  if (rank) rank.insertAdjacentHTML('afterend', '<p class="note" style="margin-top:10px">Classement de démonstration, noms et poids fictifs.</p>');

  // Avant / après
  const ba = $('#ba'); if (ba) { const inp = $('input', ba); const set = () => ba.style.setProperty('--p', inp.value + '%'); inp.addEventListener('input', set); set(); }

  // Catalogue : filtres, sélection, vitrine
  const C = window.CATALOG || [], cats = Object.fromEntries((window.CATS || []).map((c) => [c.id, c.label]));
  let cur = 0;
  function select(i, scroll) {
    cur = (i + C.length) % C.length; const it = C[cur];
    $('#s-cat').textContent = cats[it.cat]; $('#s-name').textContent = it.name; $('#s-desc').textContent = it.desc; $('#s-count').textContent = `${cur + 1} / ${C.length}`;
    const still = $('#still'); still.src = `assets/renders/${it.id}.webp`; still.alt = it.name;
    $$('.card').forEach((c) => c.classList.toggle('sel', c.dataset.id === it.id));
    if (window.Talentri3D) window.Talentri3D.select(it.id); else still.style.opacity = 1;
    if (scroll) $('#showroom').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  window.TalentriUI = { current: () => C[cur] && C[cur].id };
  if (C.length) {
    select(0);
    $('#prev').onclick = () => select(cur - 1); $('#next').onclick = () => select(cur + 1);
    $('#cards').addEventListener('click', (e) => { const c = e.target.closest('.card'); if (c) select(C.findIndex((x) => x.id === c.dataset.id), true); });
    $('#tabs').addEventListener('click', (e) => {
      const t = e.target.closest('.tab'); if (!t) return; $$('.tab').forEach((x) => x.classList.toggle('on', x === t));
      $$('.card').forEach((c) => c.classList.toggle('hide', t.dataset.cat !== 'all' && c.dataset.cat !== t.dataset.cat));
    });
  }

  // Demande de point de collecte (démonstration, stockée sur l'appareil)
  const form = $('#form'), ticket = $('#ticket');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault(); const d = Object.fromEntries(new FormData(form));
      const slug = (d.asc + '-' + d.commune).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const url = location.origin + location.pathname + '?asc=' + slug;
      try { const list = JSON.parse(localStorage.getItem('talentri-demandes') || '[]'); list.push({ asc: d.asc, commune: d.commune, zone: d.zone, type: d.type, slug, date: new Date().toISOString() }); localStorage.setItem('talentri-demandes', JSON.stringify(list)); } catch (err) { /* stockage indisponible */ }
      const q = qrcode(0, 'M'); q.addData(url); q.make(); $('#t-qr').innerHTML = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
      const p = $('#t-qr svg path'); if (p) p.setAttribute('fill', '#12172B');
      $('#t-name').textContent = d.asc + ', ' + d.commune; form.style.display = 'none'; ticket.classList.add('on');
    });
    $('#t-new').onclick = () => { ticket.classList.remove('on'); form.style.display = ''; form.reset(); };
  }
  const asc = new URLSearchParams(location.search).get('asc');
  if (asc) { const b = document.createElement('div'); b.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:60;background:#12172B;color:#fff;padding:14px 22px;border-radius:99px;font-weight:600;box-shadow:0 20px 40px -12px rgba(0,0,0,.4);text-align:center;max-width:92vw'; b.textContent = 'Point de collecte « ' + asc.replace(/-/g, ' ') + ' » : dépôt prêt à être enregistré (démonstration)'; document.body.appendChild(b); }
})();

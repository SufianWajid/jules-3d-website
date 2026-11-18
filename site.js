// Page behaviour that is not 3D: the loader, which statement shows in each pinned sequence,
// the slide counter, the ground colour, and entrances.
(() => {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Loader: counts up, then lifts once the page has loaded.
  const loader = document.querySelector('.loader'), num = loader.querySelector('.loader__n');
  const t0 = performance.now(), DUR = still ? 0 : 1100;
  let loaded = document.readyState === 'complete';
  addEventListener('load', () => { loaded = true; });
  setTimeout(() => { loaded = true; }, 6000);   // never trap the reader behind the loader
  const tick = now => {
    const p = DUR ? Math.min(1, (now - t0) / DUR) : 1;
    num.textContent = String(Math.round(p * (loaded ? 100 : 92))).padStart(3, '0');
    if (p < 1 || !loaded) return requestAnimationFrame(tick);
    document.documentElement.classList.add('ready');
    setTimeout(() => loader.remove(), 900);
  };
  requestAnimationFrame(tick);

  // Pinned sequences: the 3D object follows the same scroll in engine.js.
  const seqs = [...document.querySelectorAll('.seq')].map(seq => ({ seq, steps: [...seq.querySelectorAll('.step')], n: 0 }));
  // Every stop in page order, for the counter and the ground colour.
  const stops = [...document.querySelectorAll('[data-shape]')];
  const countN = document.querySelector('.count__n'), bar = document.querySelector('.count__bar i');
  document.querySelector('.count__t').textContent = String(stops.length).padStart(2, '0');

  let ticking = false, shown = -1;
  const read = () => {
    ticking = false;
    seqs.forEach(s => {
      const r = s.seq.getBoundingClientRect(), p = -r.top / Math.max(1, r.height - innerHeight);
      const n = Math.max(1, Math.min(s.steps.length, Math.floor(p * s.steps.length) + 1));
      if (n === s.n) return; s.n = n;
      s.steps.forEach((el, i) => el.classList.toggle('cur', i + 1 === n));
    });
    // The current stop is the last one whose start has passed the middle of the screen.
    // A step inside a pinned sequence counts once its sequence has, and it is the step on show (or an earlier one).
    let cur = 0;
    stops.forEach((el, i) => {
      const seq = el.classList.contains('step') && el.closest('.seq');
      let top = el.getBoundingClientRect().top;
      if (seq) { const s = seqs.find(x => x.seq === seq); top = s.steps.indexOf(el) < s.n ? seq.getBoundingClientRect().top : Infinity; }
      if (top <= innerHeight / 2) cur = i;
    });
    bar.style.transform = `scaleX(${Math.min(1, scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight))})`;
    if (cur === shown) return; shown = cur;
    countN.textContent = String(cur + 1).padStart(2, '0');
    const bg = stops[cur].closest('[data-bg]');
    if (bg) document.body.style.backgroundColor = bg.dataset.bg;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(read); } }, { passive: true });
  addEventListener('resize', read);
  read();

  // Entrances.
  const rise = document.querySelectorAll('[data-rise]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px' });
    rise.forEach(el => io.observe(el));
  } else rise.forEach(el => el.classList.add('in'));
})();

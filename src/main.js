/* E-systémy — interakce a animace */
(function () {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- nav ---- */
  const nav = $('#nav'), toggle = $('#navToggle');
  let lastY = 0;
  const onScroll = () => {
    const y = scrollY;
    nav.classList.toggle('scrolled', y > 40);
    nav.classList.toggle('hide', y > 500 && y > lastY && !document.body.classList.contains('nav-open'));
    lastY = y;
    const max = document.documentElement.scrollHeight - innerHeight;
    $('#progress').style.transform = `scaleX(${max > 0 ? y / max : 0})`;
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  toggle.addEventListener('click', () => {
    const open = document.body.classList.toggle('nav-open');
    toggle.setAttribute('aria-expanded', open);
  });
  $$('#menu a').forEach(a => a.addEventListener('click', () => {
    document.body.classList.remove('nav-open');
    toggle.setAttribute('aria-expanded', 'false');
  }));

  /* ---- ovládací panel ---- */
  const clock = $('#clock');
  const tick = () => { const d = new Date(); clock.textContent = d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }); };
  tick(); setInterval(tick, 15000);

  const alarm = $('#alarmTile'), alarmState = $('#alarmState');
  alarm.addEventListener('click', () => {
    const on = !alarm.classList.contains('is-on');
    alarm.classList.toggle('is-on', on);
    alarm.setAttribute('aria-pressed', on);
    alarmState.textContent = on ? 'Zastřeženo' : 'Odstřeženo';
  });
  $$('[data-toggle]').forEach(b => b.addEventListener('click', () => {
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', on);
    const s = b.querySelector('.mini-state');
    s.textContent = on ? (s.dataset.on || 'Zapnuto') : (s.dataset.off || 'Vypnuto');
  }));

  // křivka výroby FVE (ilustrace)
  const path = $('#sparkPath'), val = $('#fveVal');
  const pts = Array.from({ length: 25 }, (_, i) => {
    const x = i / 24, sun = Math.max(0, Math.sin(Math.PI * (x * 1.15 - .07)));
    return sun * (0.82 + 0.18 * Math.sin(i * 1.7));
  });
  let shown = 0;
  const draw = n => {
    const d = pts.slice(0, n + 1).map((v, i) => `${i ? 'L' : 'M'}${(i / 24 * 200).toFixed(1)} ${(46 - v * 40).toFixed(1)}`).join(' ');
    path.setAttribute('d', d);
    const kwh = pts.slice(0, n + 1).reduce((a, b) => a + b, 0) * 1.6;
    val.textContent = kwh.toFixed(1).replace('.', ',') + ' kWh';
  };
  if (reduce) draw(24);
  else { const iv = setInterval(() => { draw(shown); if (++shown > 24) clearInterval(iv); }, 90); }

  /* ---- service preview u kurzoru ---- */
  const prev = $('#svcPreview'), pimg = prev.querySelector('img');
  const fine = matchMedia('(hover: hover) and (min-width: 901px)').matches;
  if (fine) {
    let x = 0, y = 0, cx = 0, cy = 0, vis = false;
    $$('.svc').forEach(s => {
      s.addEventListener('mouseenter', () => { pimg.src = s.dataset.img; vis = true; prev.style.transition = 'opacity .35s, transform .5s cubic-bezier(.22,1,.36,1)'; prev.style.opacity = 1; });
      s.addEventListener('mouseleave', () => { vis = false; prev.style.opacity = 0; });
    });
    addEventListener('mousemove', e => { x = e.clientX + 190; y = e.clientY; }, { passive: true });
    const loop = () => {
      cx += (x - cx) * .14; cy += (y - cy) * .14;
      prev.style.transform = `translate(${cx - 150}px, ${cy - 112}px) scale(${vis ? 1 : .6}) rotate(${(x - cx) * .02}deg)`;
      requestAnimationFrame(loop);
    };
    loop();
  }

  /* ---- clip reveal (bez GSAP) ---- */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .2 });
  $$('.clip').forEach(el => io.observe(el));

  /* ---- kamery: přepínání obrázku podle textu ---- */
  const camImgs = $$('.cams-img'), camNo = $('#camNo');
  const tio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const i = +e.target.dataset.i;
    $$('.tier').forEach(t => t.classList.toggle('is-active', +t.dataset.i === i));
    camImgs.forEach(im => im.classList.toggle('is-active', +im.dataset.i === i));
    camNo.textContent = i + 1;
  }), { rootMargin: '-45% 0px -45% 0px' });
  $$('.tier').forEach(t => tio.observe(t));
  $('.tier') && $('.tier').classList.add('is-active');

  /* ---- GSAP ---- */
  const ready = () => {
    if (!window.gsap) {
      $$('[data-reveal]').forEach(el => { el.style.opacity = 1; el.style.transform = 'none'; });
      return;
    }
    gsap.registerPlugin(ScrollTrigger);

    if (window.Lenis && !reduce) {
      const lenis = new Lenis({ lerp: .1 });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
      $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
        const t = a.getAttribute('href');
        if (t.length > 1 && $(t)) { e.preventDefault(); lenis.scrollTo($(t), { offset: t === '#top' ? 0 : -70 }); }
      }));
    }

    if (reduce) { $$('[data-reveal]').forEach(el => { el.style.opacity = 1; el.style.transform = 'none'; }); return; }

    // hero
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.from('.hero-title .w > span', { yPercent: 110, duration: 1.3, stagger: .08 })
      .from('.eyebrow', { y: 20, opacity: 0, duration: 1 }, 0.1)
      .from('.hero-lead, .hero-actions', { y: 30, opacity: 0, duration: 1.1, stagger: .1 }, .5)
      .from('.panel', { y: 60, opacity: 0, rotateX: 8, duration: 1.4 }, .35)
      .from('.panel > *', { y: 20, opacity: 0, duration: .9, stagger: .07 }, .6);
    gsap.to('.hero-img', { yPercent: 12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    if (innerWidth > 1100) gsap.to('.panel', { y: -60, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

    // nadpisy a texty
    $$('.label, .h2, .body-lg, .places, .gold, .c-list, .form').forEach(el => {
      gsap.from(el, { y: 40, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
    });
    gsap.from('.svc', { y: 50, opacity: 0, duration: 1, stagger: .08, ease: 'expo.out', scrollTrigger: { trigger: '.svc-list', start: 'top 80%' } });
    gsap.from('.system', { y: 60, opacity: 0, duration: 1.1, stagger: .12, ease: 'expo.out', scrollTrigger: { trigger: '.systems', start: 'top 85%' } });
    gsap.from('.b-card', { scale: .88, opacity: 0, duration: 1.1, stagger: { each: .1, from: 'random' }, ease: 'expo.out', scrollTrigger: { trigger: '.bento', start: 'top 80%' } });
    gsap.from('.step', { y: 50, opacity: 0, duration: 1, stagger: .15, ease: 'expo.out', scrollTrigger: { trigger: '.steps', start: 'top 80%' } });
    gsap.to('#stepsLine', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '.steps', start: 'top 75%', end: 'bottom 55%', scrub: true } });
    gsap.fromTo('.smart-bgword', { xPercent: 5 }, { xPercent: -30, ease: 'none', scrollTrigger: { trigger: '.smart', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo('.footer-word', { yPercent: 40 }, { yPercent: 18, ease: 'none', scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true } });

    // magnetická tlačítka
    if (fine) $$('.magnetic').forEach(b => {
      b.addEventListener('mousemove', e => {
        const r = b.getBoundingClientRect();
        gsap.to(b, { x: (e.clientX - r.left - r.width / 2) * .25, y: (e.clientY - r.top - r.height / 2) * .35, duration: .5, ease: 'power3.out' });
      });
      b.addEventListener('mouseleave', () => gsap.to(b, { x: 0, y: 0, duration: .8, ease: 'elastic.out(1, .4)' }));
    });

  };
  if (document.readyState === 'complete') ready(); else addEventListener('load', ready);
})();

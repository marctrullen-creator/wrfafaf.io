/* UMBRA Atelier · comportamiento de la página (sin dependencias). */
(() => {
  'use strict';
  const D = document, root = D.documentElement, body = D.body;
  const I18N = window.UMBRA_I18N;
  if (!I18N) { root.classList.add('no-pre'); root.classList.remove('js'); return; }   // sin textos no arrancamos: la página se ve igual, sin efectos
  root.classList.add('js-ready');
  const $ = (s, el = D) => el.querySelector(s);
  const $$ = (s, el = D) => [...el.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  const FINE = matchMedia('(hover: hover) and (pointer: fine)');
  const PHONE = matchMedia('(max-width: 720px)');
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  let lang = 'es';

  /* ======================= idioma ======================= */
  const ES = new Map();
  $$('[data-i18n]').forEach(el => ES.set(el, el.textContent));
  $$('[data-i18n-html]').forEach(el => ES.set(el, el.innerHTML));
  $$('[data-i18n-alt]').forEach(el => ES.set(el, el.getAttribute('alt')));
  $$('[data-i18n-aria]').forEach(el => ES.set(el, el.getAttribute('aria-label')));
  const ui = () => I18N.ui[lang];
  const listeners = [];
  function setLang(l, save) {
    lang = I18N.ui[l] ? l : 'es';
    const dict = I18N.dict[lang] || {};
    $$('[data-i18n]').forEach(el => {
      if (el.id === 'creed') return;
      const k = el.dataset.i18n;
      el.textContent = lang === 'es' ? ES.get(el) : (dict[k] ?? ES.get(el));
    });
    $$('[data-i18n-html]').forEach(el => { const k = el.dataset.i18nHtml; el.innerHTML = lang === 'es' ? ES.get(el) : (dict[k] ?? ES.get(el)); });
    $$('[data-i18n-alt]').forEach(el => { const k = el.dataset.i18nAlt; el.setAttribute('alt', lang === 'es' ? ES.get(el) : (dict[k] ?? ES.get(el))); });
    $$('[data-i18n-aria]').forEach(el => { const k = el.dataset.i18nAria; el.setAttribute('aria-label', lang === 'es' ? ES.get(el) : (dict[k] ?? ES.get(el))); });
    root.lang = lang === 'va' ? 'ca-ES-valencia' : lang;
    D.title = I18N.meta[lang].title;
    const md = $('meta[name="description"]'); if (md) md.setAttribute('content', I18N.meta[lang].desc);
    $$('.lang button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    if (save) store.set('umbra-lang', lang);
    listeners.forEach(fn => fn(lang));
  }
  $$('.lang button').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang, true)));

  /* ======================= precarga ======================= */
  const pre = $('#preload');
  function endPreload() { pre.classList.add('is-gone'); body.classList.remove('is-loading'); }
  let seen = false; try { seen = sessionStorage.getItem('umbra-pre') === '1'; } catch (e) {}
  window.UMBRA_READY = true;
  if (RM.matches || seen) { endPreload(); }
  else {
    body.classList.add('is-loading');
    try { sessionStorage.setItem('umbra-pre', '1'); } catch (e) {}
    const n = $('#preload-n'), t0 = performance.now(), dur = 1300;
    (function count(now) {
      const k = clamp((now - t0) / dur, 0, 1), e = 1 - Math.pow(1 - k, 3);
      n.textContent = (e * 99.965).toFixed(3).padStart(6, '0');
      if (k < 1) requestAnimationFrame(count);
      else {
        n.textContent = '99.965';
        setTimeout(() => pre.classList.add('is-line'), 180);
        setTimeout(() => { pre.classList.add('is-open'); body.classList.remove('is-loading'); }, 820);
        setTimeout(endPreload, 1800);
      }
    })(t0);
  }

  /* ======================= luces de estudio ======================= */
  const hero = $('.hero'), lightsBtn = $('#lights'), lightsState = $('#lights-state');
  function setLights(on, save) {
    root.dataset.lights = on ? 'on' : 'off';
    hero.classList.toggle('hero--off', !on);
    lightsBtn.setAttribute('aria-checked', String(on));
    lightsState.textContent = on ? 'ON' : 'OFF';
    if (save) store.set('umbra-lights', on ? 'on' : 'off');
  }
  lightsBtn.addEventListener('click', () => setLights(root.dataset.lights === 'off', true));
  setLights(root.dataset.lights !== 'off', false);

  /* ======================= portada: linterna, paralaje y eclipse ======================= */
  const stage = $('#stage');
  const groups = $$('.hero__grp', stage).map(g => ({ el: g, depth: Number(g.dataset.depth || 0), beam: $('.beam', g), inn: $('.beam__in', g), tx: 0, ty: 0 }));
  const lightXY = $('#light-xy');
  let W = 0, H = 0, R = 320, heroVisible = true, heroRaf = null, lastHeroT = 0;
  const light = { x: 0, y: 0, tx: 0, ty: 0, auto: true, t: 0 };
  const mouse = { nx: 0, ny: 0 };
  function measureHero() {
    W = stage.clientWidth; H = stage.clientHeight;
    R = clamp(Math.min(W, H) * 0.42, 200, 520);
    stage.style.setProperty('--br', (R * 2) + 'px');
    groups.forEach(g => { if (g.inn) { g.inn.style.width = (W + 48) + 'px'; g.inn.style.height = (H + 48) + 'px'; } });
    if (!light.x) { light.x = light.tx = W * 0.62; light.y = light.ty = H * 0.42; }
  }
  let lastXYText = '', lastXYAt = 0;
  function drawHero(now) {
    groups.forEach(g => {
      const px = RM.matches ? 0 : -mouse.nx * g.depth, py = RM.matches ? 0 : -mouse.ny * g.depth * 0.6;
      g.tx += (px - g.tx) * 0.08; g.ty += (py - g.ty) * 0.08;
      g.el.style.transform = `translate3d(${g.tx.toFixed(2)}px,${g.ty.toFixed(2)}px,0)`;
      if (g.beam) {
        const gx = light.x + 24 - g.tx - R, gy = light.y + 24 - g.ty - R;
        g.beam.style.transform = `translate3d(${gx.toFixed(1)}px,${gy.toFixed(1)}px,0)`;
        g.inn.style.transform = `translate3d(${(-gx).toFixed(1)}px,${(-gy).toFixed(1)}px,0)`;
      }
    });
    if (now - lastXYAt > 100) {
      const s = `${ui().light} X ${String(Math.round(light.x)).padStart(4, '0')} · Y ${String(Math.round(light.y)).padStart(4, '0')}`;
      if (s !== lastXYText) { lightXY.textContent = s; lastXYText = s; }
      lastXYAt = now;
    }
  }
  function heroTick(now) {
    const dt = Math.min(64, now - (lastHeroT || now)); lastHeroT = now;
    if (light.auto) {
      light.t += dt / 1000;
      light.tx = W * (0.5 + 0.28 * Math.sin(light.t * 0.33)) ;
      light.ty = H * (0.46 + 0.16 * Math.sin(light.t * 0.51 + 1.2));
    }
    const k = 1 - Math.pow(1 - 0.12, dt / 16.667);
    light.x += (light.tx - light.x) * k; light.y += (light.ty - light.y) * k;
    drawHero(now);
    heroRaf = heroVisible && !RM.matches && !D.hidden ? requestAnimationFrame(heroTick) : null;
    if (!heroRaf) lastHeroT = 0;
  }
  function kickHero() { if (!heroRaf && heroVisible && !RM.matches && !D.hidden) heroRaf = requestAnimationFrame(heroTick); }
  let idleTimer = null;
  hero.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const r = stage.getBoundingClientRect();
    light.auto = false; light.tx = e.clientX - r.left; light.ty = e.clientY - r.top;
    mouse.nx = (e.clientX - r.left) / r.width - 0.5; mouse.ny = (e.clientY - r.top) / r.height - 0.5;
    clearTimeout(idleTimer); idleTimer = setTimeout(() => { light.auto = true; }, 4000);
    kickHero();
  });
  hero.addEventListener('pointerleave', () => { mouse.nx = mouse.ny = 0; light.auto = true; kickHero(); });
  new IntersectionObserver(es => { heroVisible = es[0].isIntersecting; kickHero(); }).observe(hero);
  let lastEcl = -1;
  function onScrollHero() {
    const p = clamp(scrollY / (hero.offsetHeight * 0.9), 0, 1);
    const v = Math.round(p * 100) / 100;
    if (v !== lastEcl) { hero.style.setProperty('--eclipse-hero', v); lastEcl = v; }
  }
  addEventListener('scroll', onScrollHero, { passive: true });
  addEventListener('resize', () => { measureHero(); kickHero(); });
  measureHero(); onScrollHero();
  if (RM.matches) drawHero(performance.now()); else kickHero();
  hero.classList.add('is-live');

  /* ======================= cursor técnico ======================= */
  const cursor = $('#cursor'), cxy = $('#cursor-xy');
  if (FINE.matches) {
    root.classList.add('has-cursor');
    let cx = 0, cy = 0, lastC = 0;
    addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      cx = e.clientX; cy = e.clientY;
      cursor.style.transform = `translate3d(${cx}px,${cy}px,0)`;
      const now = performance.now();
      if (now - lastC > 60) { cxy.textContent = `X ${String(Math.round(cx)).padStart(4, '0')} · Y ${String(Math.round(cy)).padStart(4, '0')}`; lastC = now; }
    }, { passive: true });
    D.addEventListener('pointerover', e => {
      const t = e.target;
      const text = t.closest('input:not([type="range"]):not([type="checkbox"]),textarea');
      cursor.classList.toggle('is-text', !!text);
      cursor.classList.toggle('is-hover', !text && !!t.closest('a,button,select,label,[role="switch"],tr[data-service],input[type="range"],input[type="checkbox"]'));
    });
    D.addEventListener('pointerleave', () => { cursor.style.opacity = '0'; });
    D.addEventListener('pointerenter', () => { cursor.style.opacity = '1'; });
  }

  /* ======================= navegación ======================= */
  const bar = $('#bar'), menuBtn = $('#menu-btn');
  function setMenu(open) {
    bar.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    body.style.overflow = open ? 'hidden' : '';
  }
  menuBtn.addEventListener('click', () => setMenu(!bar.classList.contains('open')));
  $$('.nav a, .bar__cta').forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape' && bar.classList.contains('open')) { setMenu(false); menuBtn.focus(); } });
  const navLinks = $$('.nav a');
  const spy = new IntersectionObserver(es => {
    es.forEach(en => {
      if (!en.isIntersecting) return;
      navLinks.forEach(a => a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + en.target.id)));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['pelicula', 'anatomia', 'acabados', 'servicios', 'visita'].forEach(id => { const s = D.getElementById(id); if (s) spy.observe(s); });

  /* ======================= apariciones ======================= */
  const rev = new IntersectionObserver(es => es.forEach(en => {
    if (!en.isIntersecting) return;
    en.target.classList.add('in'); rev.unobserve(en.target);
    if (en.target.classList.contains('reveal-stagger')) setTimeout(() => en.target.classList.add('done'), 1400);
  }), { rootMargin: '0px 0px -10% 0px' });
  $$('.reveal, .reveal-stagger').forEach(el => rev.observe(el));

  /* ======================= 01 película por capítulos ======================= */
  const film = $('#pelicula'), video = $('#film-video');
  const CH = [0, 3, 6, 9], DUR = 12, RATE = 0.9, HOLD = 5000;
  const chBtns = $$('#chapters button'), chItems = $$('#chapters .chapter'), fills = $$('.chapter__fill');
  const countEl = $('#film-count'), capEl = $('#film-caption'), pauseBtn = $('#film-pause');
  let filmLoaded = false, filmLoading = false, filmVisible = false, userPaused = false, holding = false, holdT = null, fadeT = null, curCh = -1, filmRaf = null;
  const fillCache = [-1, -1, -1, -1];
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  function filmSrc() { return PHONE.matches ? 'pelicula-720.mp4' : 'pelicula.mp4'; }
  function setPauseUI() {
    const playing = !userPaused;
    pauseBtn.setAttribute('aria-label', playing ? ui().pause : ui().resume);
    $('use', pauseBtn).setAttribute('href', playing ? '#i-pause' : '#i-play');
  }
  function showChapter(i, force) {
    if (i === curCh && !force) return;
    curCh = i;
    chItems.forEach((li, n) => { if (n === i) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current'); });
    countEl.textContent = String(i + 1).padStart(2, '0');
    const span = $('span', capEl);
    if (RM.matches || force === 'now') { span.textContent = ui().caps[i]; return; }
    capEl.classList.add('swap');
    setTimeout(() => { span.textContent = ui().caps[curCh]; capEl.classList.remove('swap'); }, 320);
  }
  function chapterAt(t) { let i = 0; for (let n = 0; n < CH.length; n++) if (t >= CH[n] - 0.02) i = n; return i; }
  function paintFills(t) {
    for (let n = 0; n < 4; n++) {
      const a = CH[n], b = n < 3 ? CH[n + 1] : DUR;
      const v = Math.round(clamp((t - a) / (b - a), 0, 1) * 200) / 200;
      if (v !== fillCache[n]) { fills[n].style.transform = `scaleX(${v})`; fillCache[n] = v; }
    }
  }
  function filmTick() {
    const t = video.currentTime || 0;
    showChapter(chapterAt(t));
    paintFills(t);
    filmRaf = (!video.paused && filmVisible) ? requestAnimationFrame(filmTick) : null;
  }
  function kickFilm() { if (!filmRaf) filmRaf = requestAnimationFrame(filmTick); }
  function tryPlay() {
    if (!filmLoaded || userPaused || holding || !filmVisible || D.hidden) return;
    video.playbackRate = RATE;
    const p = video.play(); if (p && p.catch) p.catch(() => { film.classList.add('needs-tap'); });
  }
  function clearHold() { clearTimeout(holdT); clearTimeout(fadeT); holding = false; film.classList.remove('is-holding', 'is-fading'); }
  function seekTo(t, play) {
    clearHold();
    video.currentTime = t;
    paintFills(t); showChapter(chapterAt(t), 'now');
    if (play) tryPlay();
  }
  function startHold() {
    holding = true; film.classList.add('is-holding');
    const step = () => {
      if (userPaused) { holdT = setTimeout(step, 400); return; }
      film.classList.add('is-fading');
      fadeT = setTimeout(() => { holding = false; film.classList.remove('is-holding'); video.currentTime = 0; paintFills(0); showChapter(0); tryPlay(); setTimeout(() => film.classList.remove('is-fading'), 260); }, 900);
    };
    holdT = setTimeout(step, HOLD);
  }
  video.addEventListener('ended', startHold);
  video.addEventListener('play', () => { film.classList.add('is-ready'); kickFilm(); });
  video.addEventListener('seeked', () => { paintFills(video.currentTime); });
  video.addEventListener('error', () => { film.classList.add('no-video'); $$('.film__ctrl button, #chapters button').forEach(b => { b.disabled = true; }); });
  function loadFilm(autoplay) {
    if (filmLoaded || filmLoading) return; filmLoading = true;
    const url = filmSrc();
    const use = src => {
      video.src = src; video.load();
      video.addEventListener('loadeddata', () => { filmLoaded = true; film.classList.add('is-ready'); if (autoplay || filmVisible) tryPlay(); }, { once: true });
    };
    if (location.protocol === 'file:') use(url);
    else fetch(url).then(r => { if (!r.ok) throw new Error(r.status); return r.blob(); }).then(b => use(URL.createObjectURL(b))).catch(() => use(url));
  }
  const filmNeedsTap = () => RM.matches || saveData;
  if (filmNeedsTap()) film.classList.add('needs-tap');
  $('#film-play').addEventListener('click', () => { film.classList.remove('needs-tap'); userPaused = false; setPauseUI(); if (filmLoaded) tryPlay(); else loadFilm(true); });
  new IntersectionObserver(es => { if (es[0].isIntersecting && !filmNeedsTap()) loadFilm(false); }, { rootMargin: '600px 0px' }).observe(film);
  new IntersectionObserver(es => {
    filmVisible = es[0].isIntersecting;
    if (filmVisible) { if (!film.classList.contains('needs-tap')) { if (filmLoaded) tryPlay(); else loadFilm(true); } }
    else if (!video.paused) video.pause();
  }, { threshold: 0.35 }).observe($('#film-frame'));
  pauseBtn.addEventListener('click', () => {
    userPaused = !userPaused; setPauseUI();
    if (userPaused) video.pause();
    else { film.classList.remove('needs-tap'); if (!filmLoaded) loadFilm(true); else tryPlay(); }
  });
  $('#film-prev').addEventListener('click', () => { const i = holding ? 3 : chapterAt(video.currentTime); const prev = (video.currentTime - CH[i] > 1.2 && !holding) ? i : (i + 3) % 4; seekTo(CH[prev], true); });
  $('#film-next').addEventListener('click', () => { const i = holding ? 3 : chapterAt(video.currentTime); seekTo(CH[(i + 1) % 4], true); });
  chBtns.forEach(b => b.addEventListener('click', () => {
    const i = Number(b.dataset.ch);
    if (!filmLoaded) { film.classList.remove('needs-tap'); loadFilm(true); video.addEventListener('loadeddata', () => seekTo(CH[i], true), { once: true }); return; }
    seekTo(CH[i], true);
  }));
  showChapter(0, 'now'); setPauseUI();
  listeners.push(() => { setPauseUI(); $('span', capEl).textContent = ui().caps[Math.max(0, curCh)]; });

  /* ======================= frase palabra a palabra ======================= */
  const creed = $('#creed'), creedText = { es: creed.textContent };
  let creedWords = [], creedOn = -1, creedVisible = false, creedRaf = null;
  function buildCreed() {
    const txt = lang === 'es' ? creedText.es : (I18N.dict[lang].creed || creedText.es);
    creed.innerHTML = '';
    const sr = D.createElement('span'); sr.className = 'vh'; sr.textContent = txt; creed.appendChild(sr);
    const vis = D.createElement('span'); vis.setAttribute('aria-hidden', 'true');
    txt.split(/\s+/).forEach((w, i, a) => { const s = D.createElement('span'); s.className = 'w'; s.textContent = w; vis.appendChild(s); if (i < a.length - 1) vis.appendChild(D.createTextNode(' ')); });
    creed.appendChild(vis);
    creedWords = $$('.w', vis); creedOn = -1;
    updateCreed();
  }
  function updateCreed() {
    creedRaf = null;
    let on = creedWords.length;
    if (!RM.matches) {
      const line = innerHeight * 0.72; on = 0;
      for (const w of creedWords) { if (w.getBoundingClientRect().top < line) on++; else break; }
    }
    if (on !== creedOn) { creedWords.forEach((w, i) => w.classList.toggle('on', i < on)); creedOn = on; }
  }
  new IntersectionObserver(es => { creedVisible = es[0].isIntersecting; if (creedVisible) updateCreed(); }).observe(creed);
  addEventListener('scroll', () => { if (creedVisible && !creedRaf) creedRaf = requestAnimationFrame(updateCreed); }, { passive: true });
  listeners.push(buildCreed);

  /* ======================= 02 anatomía ======================= */
  const PARTS = I18N.parts, viewerEl = $('#viewer'), hsWrap = $('#hotspots'), partsList = $('#parts'), panel = $('#panel');
  let sel = 0, viewer = null;
  PARTS.forEach((p, i) => {
    const b = D.createElement('button'); b.type = 'button'; b.className = 'hs'; b.dataset.i = i; b.setAttribute('aria-pressed', 'false');
    b.innerHTML = '<span class="hs__mark"></span><span class="hs__label"></span>';
    hsWrap.appendChild(b);
    const li = D.createElement('li'); li.innerHTML = `<button type="button" data-i="${i}" aria-pressed="false"><span></span><b></b></button>`;
    partsList.appendChild(li);
  });
  const hsBtns = $$('.hs', hsWrap), partBtns = $$('#parts button');
  function labelParts() {
    PARTS.forEach((p, i) => {
      const t = p[lang];
      $('.hs__label', hsBtns[i]).textContent = t.name;
      hsBtns[i].setAttribute('aria-label', t.name);
      $('span', partBtns[i]).textContent = t.code; $('b', partBtns[i]).textContent = t.name;
    });
  }
  function renderPanel() {
    const p = PARTS[sel], t = p[lang];
    $('#p-code').textContent = t.code; $('#p-name').textContent = t.name; $('#p-what').textContent = t.what; $('#p-do').textContent = t.do;
    $('#p-tele').innerHTML = t.tele.map(([k, v, eg]) => `<li><span class="tele__k">${k}</span><span class="tele__v">${eg ? `<span class="eg">${v}</span>` : v}</span><span class="tele__bar"><i></i></span><span class="tele__ok">OK</span></li>`).join('');
    $('#p-go').dataset.service = p.svc;
    panel.classList.remove('run'); void panel.offsetWidth; panel.classList.add('run');
  }
  function select(i, fromViewer) {
    sel = i;
    hsBtns.forEach((b, n) => b.setAttribute('aria-pressed', String(n === i)));
    partBtns.forEach((b, n) => b.setAttribute('aria-pressed', String(n === i)));
    renderPanel();
    if (viewer && !fromViewer) viewer.focus(PARTS[i].id);
  }
  hsBtns.forEach(b => b.addEventListener('click', e => { e.stopPropagation(); select(Number(b.dataset.i)); }));
  partBtns.forEach(b => b.addEventListener('click', () => select(Number(b.dataset.i))));
  listeners.push(() => { labelParts(); renderPanel(); holdLabel(); });

  // marcas sobre la foto fija (móvil o sin WebGL): proyección con la cámara del render "rueda"
  const STILL_CAM = { pos: [1.30, -0.52, 0.42], tgt: [-0.08, 0, 0.34], fov: 2 * Math.atan(18 / 50) };
  function projectStill(at) {
    const P = [at[2], at[0], 0.34 + at[1]];       // marco de la rueda a coordenadas del mundo de Blender
    const c = STILL_CAM.pos, f0 = [STILL_CAM.tgt[0] - c[0], STILL_CAM.tgt[1] - c[1], STILL_CAM.tgt[2] - c[2]];
    const nrm = v => { const l = Math.hypot(...v); return v.map(x => x / l); };
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const f = nrm(f0), r = nrm(cross(f, [0, 0, 1])), u = cross(r, f);
    const d = [P[0] - c[0], P[1] - c[1], P[2] - c[2]];
    const tn = Math.tan(STILL_CAM.fov / 2);
    return [dot(d, r) / dot(d, f) / tn, dot(d, u) / dot(d, f) / tn];
  }
  function placeStillHotspots() {
    const w = viewerEl.clientWidth, h = viewerEl.clientHeight, S = Math.max(w, h), x0 = (w - S) / 2, y0 = (h - S) / 2;
    PARTS.forEach((p, i) => {
      const [nx, ny] = projectStill(p.at);
      hsBtns[i].style.transform = `translate3d(${(x0 + (nx * 0.5 + 0.5) * S).toFixed(1)}px,${(y0 + (0.5 - ny * 0.5) * S).toFixed(1)}px,0)`;
    });
  }
  function goStatic() {
    viewerEl.classList.add('static', 'ready');
    placeStillHotspots();
    new ResizeObserver(placeStillHotspots).observe(viewerEl);
    const ex = D.createElement('img'); ex.className = 'viewer__still viewer__ex'; ex.alt = ''; ex.src = 'capitulo-03.webp'; ex.style.opacity = '0';
    ex.decoding = 'async'; $('.viewer__still', viewerEl).after(ex);
    viewer = { setExplode(p) { ex.style.opacity = String(p); }, focus() {}, static: true };
  }
  function webglOK() { try { const c = D.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }
  function loadViewer() {
    if (viewer || viewerEl.dataset.loading) return;
    viewerEl.dataset.loading = '1';
    if (PHONE.matches || !webglOK()) { goStatic(); return; }
    import('./viewer.js').then(m => m.createViewer(viewerEl, {
      parts: PARTS, explode: I18N.explode,
      onProgress: f => viewerEl.style.setProperty('--lp', Math.max(0.08, f).toFixed(2)),
      onDeg: (yaw, tilt) => { $('#viewer-deg').textContent = `${ui().rot} ${String(Math.round(yaw)).padStart(3, '0')}° · ${ui().inc} ${String(Math.round(tilt)).padStart(2, '0')}°`; },
      hotspots: hsBtns
    })).then(v => { viewer = v; viewerEl.classList.add('ready'); viewer.focus(PARTS[sel].id); viewer.setExplode(holdP); })
      .catch(err => { console.warn('Visor 3D no disponible, se muestra la foto:', err && err.message); goStatic(); });
  }
  new IntersectionObserver(es => { if (es[0].isIntersecting) loadViewer(); }, { rootMargin: '700px 0px' }).observe(viewerEl);

  // mantener pulsado para abrir la rueda
  const holdBtn = $('#hold');
  let holdP = 0, holdDown = false, holdOpen = false, holdRaf = null, holdLast = 0;
  function holdLabel() { $('span', holdBtn).textContent = holdOpen ? ui().close : (I18N.dict[lang] ? I18N.dict[lang]['anat.hold'] : ES.get($('[data-i18n="anat.hold"]'))) || ''; }
  function holdTick(now) {
    const dt = Math.min(64, now - (holdLast || now)); holdLast = now;
    const target = holdOpen ? 1 : (holdDown ? 1 : 0);
    if (holdDown && !holdOpen) holdP = Math.min(1, holdP + dt / 1400);
    else holdP += (target - holdP) * (1 - Math.pow(1 - 0.09, dt / 16.667));
    if (holdDown && holdP >= 1 && !holdOpen) { holdOpen = true; holdDown = false; holdLabel(); partsList.classList.remove('lit'); void partsList.offsetWidth; partsList.classList.add('lit'); }
    if (Math.abs(target - holdP) < 0.002 && !holdDown) holdP = target;
    holdBtn.style.setProperty('--hp', holdP.toFixed(3));
    if (viewer) viewer.setExplode(holdP);
    holdRaf = (holdDown || Math.abs(target - holdP) > 0.0005) ? requestAnimationFrame(holdTick) : null;
    if (!holdRaf) holdLast = 0;
  }
  function kickHold() { if (!holdRaf) holdRaf = requestAnimationFrame(holdTick); }
  function press() {
    if (holdOpen) { holdOpen = false; holdLabel(); kickHold(); return; }
    if (RM.matches) { holdOpen = true; holdP = 1; holdBtn.style.setProperty('--hp', '1'); if (viewer) viewer.setExplode(1); holdLabel(); return; }
    holdDown = true; kickHold();
  }
  function release() { if (holdDown) { holdDown = false; kickHold(); } }
  holdBtn.addEventListener('pointerdown', e => { e.preventDefault(); try { holdBtn.setPointerCapture(e.pointerId); } catch (err) {} press(); });
  holdBtn.addEventListener('pointerup', release);
  holdBtn.addEventListener('pointercancel', release);
  holdBtn.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); press(); } });
  holdBtn.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') release(); });
  holdBtn.addEventListener('click', e => { if (e.detail === 0) e.preventDefault(); });

  /* ======================= 03 acabados ======================= */
  const range = $('#fin-range'), cmpImgs = $$('#cmp img'), ticks = $$('.slider__ticks button');
  let finIdx = -1;
  function finReadout(v) {
    v = Number(v);
    cmpImgs[1].style.setProperty('--o', clamp(v / 100, 0, 1).toFixed(3));
    cmpImgs[2].style.setProperty('--o', clamp((v - 100) / 100, 0, 1).toFixed(3));
    const pct = v <= 100 ? 85 + (70 - 85) * (v / 100) : 70 + (4 - 70) * ((v - 100) / 100);
    $('#fin-num').textContent = '≈ ' + Math.round(pct) + ' %';
    const idx = v < 50 ? 0 : v < 150 ? 1 : 2;
    if (idx !== finIdx) {
      finIdx = idx; const f = I18N.finish[lang][idx];
      $('#fin-name').textContent = f.n; $('#fin-desc').textContent = f.d;
      $('#cmp-tag').textContent = ui().tag + f.n.toUpperCase();
      $('#cmp').setAttribute('aria-label', f.n);
      ticks.forEach((t, n) => t.setAttribute('aria-pressed', String(n === idx)));
    }
    range.setAttribute('aria-valuetext', I18N.finish[lang][idx].n + ', ' + Math.round(pct) + ' %');
  }
  $('#cmp').setAttribute('role', 'img');
  range.addEventListener('input', () => finReadout(range.value));
  let tween = null;
  ticks.forEach(t => t.addEventListener('click', () => {
    const to = Number(t.dataset.stop), from = Number(range.value), t0 = performance.now();
    cancelAnimationFrame(tween);
    if (RM.matches) { range.value = to; finReadout(to); return; }
    (function step(now) {
      const k = clamp((now - t0) / 700, 0, 1), e = 1 - Math.pow(1 - k, 4);
      range.value = from + (to - from) * e; finReadout(range.value);
      if (k < 1) tween = requestAnimationFrame(step);
    })(t0);
  }));
  listeners.push(() => { finIdx = -1; finReadout(range.value); });

  /* ======================= 04 carta: filas que eligen el trabajo ======================= */
  const svcSel = $('#f-service');
  function prefill(svc) {
    if (!svc) return;
    svcSel.value = svc; svcSel.dispatchEvent(new Event('change'));
    const f = svcSel.closest('.field'); f.classList.remove('invalid'); $('#e-service').textContent = '';
  }
  $$('#menu-body tr').forEach(tr => {
    tr.addEventListener('click', e => {
      prefill(tr.dataset.service);
      $('#visita').scrollIntoView({ behavior: RM.matches ? 'auto' : 'smooth' });
      setTimeout(() => svcSel.focus({ preventScroll: true }), RM.matches ? 0 : 700);
    });
  });
  $$('[data-service]').forEach(a => { if (a.tagName === 'A') a.addEventListener('click', () => prefill(a.dataset.service)); });
  $('#p-go').addEventListener('click', e => prefill(e.currentTarget.dataset.service));

  /* ======================= 05 formulario ======================= */
  const form = $('#booking'), okBox = $('#form-ok');
  const dateIn = $('#f-date');
  const today = new Date(); const iso = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  dateIn.min = iso;
  const checks = [
    ['f-name', 'e-name', v => v.trim().length >= 2, 'name'],
    ['f-phone', 'e-phone', v => v.replace(/\D/g, '').length >= 9, 'phone'],
    ['f-email', 'e-email', v => !v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()), 'email'],
    ['f-car', 'e-car', v => v.trim().length >= 2, 'car'],
    ['f-service', 'e-service', v => !!v, 'service'],
    ['f-date', 'e-date', v => !v || v >= iso, 'date']
  ];
  let tried = false;
  function validate(focusFirst) {
    let first = null;
    checks.forEach(([id, eid, ok, key]) => {
      const el = D.getElementById(id), good = ok(el.value), field = el.closest('.field');
      field.classList.toggle('invalid', !good);
      el.setAttribute('aria-invalid', String(!good));
      el.setAttribute('aria-describedby', eid);
      D.getElementById(eid).textContent = good ? '' : ui().err[key];
      if (!good && !first) first = el;
    });
    const pv = $('#f-privacy'), cp = $('#c-privacy');
    cp.classList.toggle('invalid', !pv.checked);
    let pe = $('#e-privacy');
    if (!pe) { pe = D.createElement('span'); pe.id = 'e-privacy'; pe.className = 'field__err'; pe.style.gridColumn = '1/-1'; cp.after(pe); }
    pe.textContent = pv.checked ? '' : ui().err.privacy;
    pv.setAttribute('aria-describedby', 'e-privacy');
    if (!pv.checked && !first) first = pv;
    if (first && focusFirst) first.focus();
    return !first;
  }
  form.addEventListener('input', () => { if (tried) validate(false); });
  form.addEventListener('change', () => { if (tried) validate(false); });
  function message() {
    const g = id => D.getElementById(id).value.trim();
    const dict = I18N.dict[lang] || {};
    const L = k => (lang === 'es' ? ES.get($(`[data-i18n="${k}"]`)) : dict[k]) || k;
    const svcText = svcSel.options[svcSel.selectedIndex].text;
    const lines = [ui().mail.intro, '',
      `${L('f.name')}: ${g('f-name')}`, `${L('f.phone')}: ${g('f-phone')}`];
    if (g('f-email')) lines.push(`${L('f.email')}: ${g('f-email')}`);
    lines.push(`${L('f.car')}: ${g('f-car')}`, `${L('f.service')}: ${svcText}`, `${L('f.date')}: ${g('f-date') || ui().mail.none}`);
    if (g('f-msg')) lines.push('', g('f-msg'));
    return { subject: ui().mail.subject + g('f-car'), body: lines.join('\n') };
  }
  function done() { okBox.classList.add('show'); okBox.focus({ preventScroll: false }); }
  form.addEventListener('submit', e => {
    e.preventDefault(); tried = true;
    if (!validate(true)) return;
    const m = message();
    location.href = `mailto:visitas@umbra-atelier.es?subject=${encodeURIComponent(m.subject)}&body=${encodeURIComponent(m.body)}`;
    done();
  });
  $('#f-wa').addEventListener('click', () => {
    tried = true;
    if (!validate(true)) return;
    const m = message();
    window.open(`https://wa.me/34964000000?text=${encodeURIComponent(m.subject + '\n\n' + m.body)}`, '_blank', 'noopener');
    done();
  });

  /* ======================= pie: texto de borde a borde y botón magnético ======================= */
  const big = $('#foot-big');
  function fitFoot() {
    const lines = ui().foot, spans = $$('span', big);
    spans.forEach((s, i) => { s.textContent = lines[i]; s.style.fontSize = '100px'; });
    const w = big.clientWidth;
    spans.forEach(s => { const nat = s.getBoundingClientRect().width || 1; s.style.fontSize = Math.min(w / nat * 100 * 0.985, innerWidth * 0.18) + 'px'; });
  }
  big.setAttribute('aria-hidden', 'true');
  if (D.fonts && D.fonts.ready) D.fonts.ready.then(fitFoot);
  new ResizeObserver(fitFoot).observe(big);
  listeners.push(fitFoot);

  const magnet = $('#magnet');
  if (FINE.matches) {
    let mx = 0, my = 0, ox = 0, oy = 0, mRaf = null;
    const mTick = () => {
      ox += (mx - ox) * 0.15; oy += (my - oy) * 0.15;
      magnet.style.transform = `translate3d(${ox.toFixed(2)}px,${oy.toFixed(2)}px,0)`;
      mRaf = (Math.abs(mx - ox) > 0.1 || Math.abs(my - oy) > 0.1) ? requestAnimationFrame(mTick) : null;
    };
    $('.foot').addEventListener('pointermove', e => {
      if (RM.matches) return;
      const r = magnet.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const dx = e.clientX - cx, dy = e.clientY - cy, d = Math.hypot(dx, dy);
      if (d < 160) { mx = dx * 0.35; my = dy * 0.35; } else { mx = my = 0; }
      if (!mRaf) mRaf = requestAnimationFrame(mTick);
    });
    $('.foot').addEventListener('pointerleave', () => { mx = my = 0; if (!mRaf) mRaf = requestAnimationFrame(mTick); });
  }

  /* ======================= pestaña oculta y movimiento reducido en vivo ======================= */
  D.addEventListener('visibilitychange', () => {
    body.classList.toggle('paused', D.hidden);
    if (D.hidden) { if (!video.paused) video.pause(); } else { kickHero(); tryPlay(); }
  });
  RM.addEventListener('change', e => {
    if (e.matches) {
      if (!video.paused) video.pause();
      film.classList.add('needs-tap');
      creedWords.forEach(w => w.classList.add('on'));
      groups.forEach(g => { g.tx = g.ty = 0; }); drawHero(performance.now());
      if (holdDown) { holdDown = false; }
    } else {
      film.classList.remove('needs-tap'); if (filmVisible) { if (filmLoaded) tryPlay(); else loadFilm(true); }
      creedOn = -1; updateCreed(); kickHero();
    }
  });

  /* ======================= arranque ======================= */
  const saved = store.get('umbra-lang');
  const guess = (navigator.language || 'es').toLowerCase();
  setLang(saved || (guess.startsWith('ca') ? 'va' : guess.startsWith('en') ? 'en' : 'es'), false);
  select(0, true);
})();

/* ==========================================================================
   Intro de Studios Conari (una vez por sesión, GSAP)
   1. la luna creciente del logo se dibuja con trazo dorado y la estrella destella
   2. los ocho emblemas del estudio aparecen como una constelación alrededor
   3. el dragón del estudio vuela en círculo y reúne los emblemas en la luna
   4. aparecen STUDIOS y CONARI: el dragón cruza por delante y revela el nombre
   Cualquier tecla, clic o toque la salta. KRIntro.fin es una promesa que se
   resuelve al terminar (o de inmediato si no hay intro).
   ========================================================================== */
(() => {
  const intro = document.getElementById('intro');
  const raiz = document.documentElement;
  let resolver; const fin = new Promise(r => { resolver = r; });
  window.KRIntro = { fin };
  if (!intro || !raiz.classList.contains('con-intro') || !window.gsap || !window.KR_TRAZOS) {
    raiz.classList.remove('con-intro'); if (intro) intro.remove(); resolver(); return;
  }
  gsap.registerPlugin(...[window.MotionPathPlugin, window.SplitText].filter(Boolean));
  const T = window.KR_TRAZOS, NS = 'http://www.w3.org/2000/svg';
  const $ = s => intro.querySelector(s);
  const escenario = $('.intro-escenario'), lienzo = $('.intro-estrellas'), ctx = lienzo.getContext('2d');
  const movil = matchMedia('(pointer: coarse)').matches;
  if (movil) $('.intro-saltar').textContent = 'Toca para saltar';

  // ---------------------------------------------------------- piezas: trazos del logotipo y emblemas
  const trazos = (clave, clase) => {
    const g = document.createElementNS(NS, 'g'); g.setAttribute('class', clase);
    T[clave].forEach(d => { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); p.setAttribute('pathLength', '1'); g.appendChild(p); });
    return g;
  };
  const svgLogo = $('.intro-trazo');
  ['luna', 'conari', 'base'].forEach(k => svgLogo.appendChild(trazos(k, 'it-' + k)));

  // 8 emblemas en una elipse alrededor del logo (coordenadas del escenario de 1000 × 600)
  const EMBLEMAS = ['estrella', 'castillo-montana-bosque', 'investigacion', 'dragon', 'arbol', 'libro', 'sol-luna', 'proyeccion'];
  const vertical = innerHeight > innerWidth;                         // celular vertical: anillo más angosto y escenario más grande
  const C = { x: 500, y: 300 }, RX = vertical ? 255 : 420, RY = vertical ? 290 : 225;
  const puntos = EMBLEMAS.map((n, i) => { const a = -Math.PI / 2 + i * Math.PI / 4; return { n, x: C.x + Math.cos(a) * RX, y: C.y + Math.sin(a) * RY }; });
  const constel = $('.intro-constelacion');
  puntos.forEach((p, i) => {
    const q = puntos[(i + 1) % puntos.length], l = document.createElementNS(NS, 'line');
    Object.entries({ x1: p.x, y1: p.y, x2: q.x, y2: q.y, pathLength: 1 }).forEach(([k, v]) => l.setAttribute(k, v));
    constel.appendChild(l);
  });
  const emblemas = puntos.map(p => {
    const d = document.createElement('div'); d.className = 'intro-emblema';
    d.style.left = p.x + 'px'; d.style.top = p.y + 'px';
    const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 256 256');
    s.appendChild(trazos('ic-' + p.n, 'it-emblema'));
    const img = new Image(); img.src = `assets/img/logo-${p.n}.png`; img.alt = '';
    d.append(s, img); escenario.appendChild(d);
    return d;
  });

  // ---------------------------------------------------------- escala del escenario y partículas
  let k = 1, ox = 0, oy = 0;
  function medir() {
    lienzo.width = innerWidth; lienzo.height = innerHeight;
    k = vertical ? Math.min(innerWidth / 600, innerHeight / 700) : Math.min(innerWidth / 1000, innerHeight / 600) * .94;
    ox = (innerWidth - 1000 * k) / 2; oy = (innerHeight - 600 * k) / 2;
    escenario.style.transform = `translate(${ox}px, ${oy}px) scale(${k})`;
  }
  medir(); addEventListener('resize', medir);
  const estrellas = Array.from({ length: movil ? 70 : 140 }, () => ({ x: Math.random(), y: Math.random(), f: Math.random() * 6.3, v: .6 + Math.random() * 1.6, r: Math.random() < .15 ? 2 : 1 }));
  const polvo = [];
  const dragon = $('.intro-dragon'), sprite = $('.intro-dragon-spr');
  let previoX = null, vivo = true, t = 0;
  function cuadro() {
    if (!vivo) return;
    requestAnimationFrame(cuadro); t += 1 / 60;
    ctx.clearRect(0, 0, lienzo.width, lienzo.height);
    const a = +getComputedStyle(lienzo).opacity || 0;
    if (a <= 0) return;
    const px = Math.max(2, Math.round(k * 2.5));
    for (const s of estrellas) {
      const b = .3 + .7 * Math.max(0, Math.sin(t * s.v + s.f));
      ctx.fillStyle = `rgba(225, 235, 255, ${b * .85})`;
      ctx.fillRect(Math.round(s.x * lienzo.width), Math.round(s.y * lienzo.height), px * s.r / 1.4, px * s.r / 1.4);
    }
    // estela de polvo dorado detrás del dragón
    const dx = gsap.getProperty(dragon, 'x'), dy = gsap.getProperty(dragon, 'y');
    if (+gsap.getProperty(dragon, 'opacity') > 0) {
      if (previoX !== null) sprite.style.transform = `scaleX(${dx > previoX + .2 ? -1 : 1})`;   // el sprite mira a la izquierda
      for (let i = 0; i < (movil ? 1 : 2); i++) polvo.push({ x: ox + dx * k + (Math.random() - .5) * 30 * k, y: oy + (dy + 18) * k + (Math.random() - .5) * 20 * k, v: 1, vy: .3 + Math.random() * .8 });
    }
    previoX = dx;
    for (let i = polvo.length - 1; i >= 0; i--) {
      const q = polvo[i]; q.v -= .018; q.y += q.vy; if (q.v <= 0) { polvo.splice(i, 1); continue; }
      ctx.fillStyle = `rgba(255, 212, 90, ${q.v * .9})`;
      ctx.fillRect(Math.round(q.x / px) * px, Math.round(q.y / px) * px, px, px);
    }
  }
  requestAnimationFrame(cuadro);

  // ---------------------------------------------------------- guion
  // el logotipo (620 × 362) ocupa el centro del escenario a escala .85
  const L = { x: 500 - 620 * .85 / 2, y: 300 - 362 * .85 / 2, s: .85 };
  const estrellaLuna = { x: L.x + 311 * L.s, y: L.y + 75 * L.s };
  const conariY = L.y + 258 * L.s;
  const conari = $('.iw-conari');
  gsap.set(dragon, { x: 1180, y: 110, opacity: 0 });
  gsap.set(conari, { clipPath: 'inset(0 0 0 100%)' });

  const tl = gsap.timeline({ onComplete: terminar });
  tl.to(lienzo, { opacity: 1, duration: 1 }, 0)
    // 1. luna creciente y estrella
    .to('.it-luna path', { strokeDashoffset: 0, duration: 1.3, stagger: .06, ease: 'power1.inOut' }, .3)
    .to('.iw-luna', { opacity: 1, duration: .7 }, 1.3)
    .to('.it-luna', { opacity: 0, duration: .6 }, 1.7)
    .fromTo('.intro-destello', { scale: 0, opacity: 0, left: estrellaLuna.x, top: estrellaLuna.y }, { scale: 1.3, opacity: 1, duration: .3, yoyo: true, repeat: 1, ease: 'power2.out' }, 1.45);
  // 2. constelación de emblemas
  emblemas.forEach((e, i) => {
    const t0 = .9 + i * .16;
    tl.fromTo(e, { scale: .4, opacity: 0 }, { scale: 1, opacity: 1, duration: .5, ease: 'back.out(2)' }, t0)
      .to(e.querySelectorAll('path'), { strokeDashoffset: 0, duration: .8, ease: 'power1.inOut' }, t0)
      .to(e.querySelector('img'), { opacity: 1, duration: .45 }, t0 + .55)
      .to(e.querySelector('svg'), { opacity: 0, duration: .4 }, t0 + .8)
      .to(constel.children[i], { strokeDashoffset: 0, duration: .45, ease: 'none' }, t0 + .25);
  });
  // 3. el dragón vuela en círculo y reúne los emblemas en la luna
  tl.to(dragon, { opacity: 1, duration: .3 }, 2.4)
    .to(dragon, {
      duration: 2, ease: 'power1.inOut',
      motionPath: { path: [{ x: 1000, y: 40 }, { x: 560, y: 20 }, { x: 150, y: 90 }, { x: 40, y: 330 }, { x: 260, y: 560 }, { x: 740, y: 575 }, { x: 1010, y: conariY - 30 }], curviness: 1.25 }
    }, 2.4)
    .to(constel, { opacity: 0, duration: .5 }, 3.1);
  emblemas.forEach((e, i) => {
    tl.to(e, { left: estrellaLuna.x, top: estrellaLuna.y, scale: .15, opacity: 0, duration: .55, ease: 'power2.in' }, 3.05 + i * .09);
  });
  tl.fromTo('.intro-destello', { scale: 0, opacity: 0 }, { scale: 2.2, opacity: 1, duration: .35, yoyo: true, repeat: 1, ease: 'power2.out' }, 3.75)
    .fromTo('.iw-luna', { filter: 'brightness(1)' }, { filter: 'brightness(1.8)', duration: .35, yoyo: true, repeat: 1 }, 3.75)
    // 4. nombre del estudio
    .fromTo('.iw-lineas', { opacity: 0, scaleX: 0 }, { opacity: 1, scaleX: 1, duration: .7, ease: 'power3.out' }, 3.9)
    .fromTo('.iw-studios', { opacity: 0, clipPath: 'inset(0 50% 0 50%)' }, { opacity: 1, clipPath: 'inset(0 0% 0 0%)', duration: .8, ease: 'power2.out' }, 4.05)
    .to('.it-conari path', { strokeDashoffset: 0, duration: 1.1, stagger: .05, ease: 'power1.inOut' }, 4.1)
    // el dragón cruza por delante del nombre y lo va dejando a la vista
    .to(dragon, {
      x: -220, y: conariY - 40, duration: 1.15, ease: 'none',
      onUpdate() {
        const f = Math.min(100, Math.max(0, (gsap.getProperty(dragon, 'x') - L.x) / (620 * L.s) * 100));
        conari.style.clipPath = `inset(0 0 0 ${f}%)`;
      }
    }, 4.4)
    .to('.it-conari', { opacity: 0, duration: .5 }, 5.4)
    .fromTo('.iw-base', { opacity: 0, scale: .3 }, { opacity: 1, scale: 1, duration: .5, ease: 'back.out(3)' }, 5.35)
    .fromTo('.intro-brillo', { backgroundPosition: '-250% 0' }, { backgroundPosition: '300% 0', duration: 1.3, ease: 'power1.inOut' }, 5.5)
    .fromTo('.intro-presenta', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .6 }, 5.7)
    .to('.intro-saltar', { opacity: 0, duration: .4 }, 5.6)
    .to({}, { duration: 1 })
    .to(intro, { opacity: 0, duration: .6 });

  // ---------------------------------------------------------- salto y cierre
  let cerrado = false;
  function terminar() {
    if (cerrado) return; cerrado = true; vivo = false;
    try { sessionStorage.setItem('kr-intro', '1'); } catch (e) { /* sin almacenamiento */ }
    raiz.classList.remove('con-intro'); intro.remove();
    removeEventListener('keydown', saltar, true); removeEventListener('resize', medir);
    resolver();
  }
  function saltar(e) {
    if (e) { e.preventDefault(); e.stopImmediatePropagation(); }          // la tecla no llega al arcade
    if (cerrado || tl.progress() > .92) return;
    tl.kill(); gsap.to(intro, { opacity: 0, duration: .35, onComplete: terminar });
  }
  addEventListener('keydown', saltar, true);
  intro.addEventListener('pointerdown', saltar);
})();

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
  const P = 1.6;                                                     // tamaño del píxel del logo y los emblemas, en unidades del escenario
  const aGrilla = v => Math.round(v / P) * P;
  const EMBLEMAS = ['estrella', 'castillo-montana-bosque', 'investigacion', 'dragon', 'arbol', 'libro', 'sol-luna', 'proyeccion'];
  const vertical = innerHeight > innerWidth;                         // celular vertical: anillo más angosto y escenario más grande
  const C = { x: 500, y: 300 }, RX = vertical ? 255 : 420, RY = vertical ? 290 : 225;
  const puntos = EMBLEMAS.map((n, i) => { const a = -Math.PI / 2 + i * Math.PI / 4; return { n, x: aGrilla(C.x + Math.cos(a) * RX), y: aGrilla(C.y + Math.sin(a) * RY) }; });
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
    const img = new Image(); img.src = `assets/img/intro/px-${p.n}.png?v=logos`; img.alt = '';
    d.append(s, img); escenario.appendChild(d);
    return d;
  });

  // ---------------------------------------------------------- escala del escenario y partículas
  let k = 1, n = 2, ox = 0, oy = 0;
  function medir() {
    lienzo.width = innerWidth; lienzo.height = innerHeight;
    const k0 = vertical ? Math.min(innerWidth / 600, innerHeight / 700) : Math.min(innerWidth / 1000, innerHeight / 600) * .94;
    k = k0; n = Math.max(2, Math.round(P * k));                         // n: tamaño en pantalla de las estrellas y el polvo
    ox = Math.round((innerWidth - 1000 * k) / 2); oy = Math.round((innerHeight - 600 * k) / 2);
    escenario.style.transform = `translate(${ox}px, ${oy}px) scale(${k})`;
  }
  medir(); addEventListener('resize', medir);
  const estrellas = Array.from({ length: movil ? 70 : 140 }, () => ({ x: Math.random(), y: Math.random(), f: Math.random() * 6.3, v: .6 + Math.random() * 1.6, r: Math.random() < .15 ? 2 : 1 }));
  const polvo = [];
  const dragon = $('.intro-dragon'), sprite = $('.intro-dragon-spr'), vuelo = { x: 1180, y: 110, a: 0 };
  let previoX = null, vivo = true, t = 0;
  function cuadro() {
    if (!vivo) return;
    requestAnimationFrame(cuadro); t += 1 / 60;
    ctx.clearRect(0, 0, lienzo.width, lienzo.height);
    const a = +getComputedStyle(lienzo).opacity || 0;
    if (a <= 0) return;
    const px = n;
    for (const s of estrellas) {
      const b = .3 + .7 * Math.max(0, Math.sin(t * s.v + s.f));
      ctx.fillStyle = b > .7 ? 'rgba(233, 238, 255, .95)' : b > .45 ? 'rgba(198, 211, 245, .6)' : 'rgba(142, 163, 216, .35)';   // 3 tonos
      ctx.fillRect(Math.round(s.x * lienzo.width / px) * px, Math.round(s.y * lienzo.height / px) * px, px * s.r, px * s.r);
    }
    // estela de polvo dorado detrás del dragón
    const dx = aGrilla(vuelo.x), dy = aGrilla(vuelo.y);               // el dragón avanza en pasos de un píxel del arte
    dragon.style.transform = `translate(${dx}px, ${dy}px)`; dragon.style.opacity = vuelo.a;
    if (vuelo.a > 0) {
      if (previoX !== null && Math.abs(vuelo.x - previoX) > .05) sprite.style.transform = `scaleX(${vuelo.x > previoX ? -1 : 1})`;   // el sprite mira a la izquierda
      for (let i = 0; i < (movil ? 1 : 2); i++) polvo.push({ x: ox + dx * k + (Math.random() - .5) * 30 * k, y: oy + (dy + 18) * k + (Math.random() - .5) * 20 * k, v: 1, vy: n * (.2 + Math.random() * .4) });
    }
    previoX = vuelo.x;
    for (let i = polvo.length - 1; i >= 0; i--) {
      const q = polvo[i]; q.v -= .018; q.y += q.vy; if (q.v <= 0) { polvo.splice(i, 1); continue; }
      ctx.fillStyle = q.v > .66 ? '#fcdf6b' : q.v > .33 ? '#fabd18' : '#b87406';
      ctx.fillRect(Math.round(q.x / px) * px, Math.round(q.y / px) * px, px, px);
    }
  }
  requestAnimationFrame(cuadro);

  // ---------------------------------------------------------- guion
  // el logotipo (620 × 362, píxel de 3) va a escala .8: su píxel mide P, igual que el del dragón
  const L = { x: 252, y: 156, s: .8 };
  const estrellaLuna = { x: L.x + 314 * L.s, y: L.y + 88 * L.s };
  const conariY = L.y + 270 * L.s;
  const conari = $('.iw-conari');
  gsap.set(conari, { clipPath: 'inset(0 0 0 100%)' });

  const tl = gsap.timeline({ onComplete: terminar });
  tl.to(lienzo, { opacity: 1, duration: 1 }, 0)
    // 1. luna creciente y estrella
    .to('.it-luna path', { strokeDashoffset: 0, duration: 1.3, stagger: .06, ease: 'steps(26)' }, .3)
    .to('.iw-luna', { opacity: 1, duration: .6, ease: 'steps(4)' }, 1.3)
    .to('.it-luna', { opacity: 0, duration: .5, ease: 'steps(3)' }, 1.7)
    .fromTo('.intro-destello', { scale: 1, opacity: 0, left: estrellaLuna.x, top: estrellaLuna.y }, { scale: 3, opacity: 1, duration: .3, yoyo: true, repeat: 1, ease: 'steps(2)' }, 1.45);
  // 2. constelación de emblemas
  emblemas.forEach((e, i) => {
    const t0 = .9 + i * .16;
    tl.set(e, { opacity: 1 }, t0)
      .to(e.querySelectorAll('path'), { strokeDashoffset: 0, duration: .8, ease: 'steps(16)' }, t0)
      .to(e.querySelector('img'), { opacity: 1, duration: .4, ease: 'steps(4)' }, t0 + .55)
      .to(e.querySelector('svg'), { opacity: 0, duration: .3, ease: 'steps(3)' }, t0 + .8)
      .to(constel.children[i], { strokeDashoffset: 0, duration: .45, ease: 'steps(9)' }, t0 + .25);
  });
  // 3. el dragón vuela en círculo y reúne los emblemas en la luna
  tl.to(vuelo, { a: 1, duration: .3, ease: 'steps(3)' }, 2.4)
    .to(vuelo, {
      duration: 2, ease: 'power1.inOut',
      motionPath: { path: [{ x: 1000, y: 40 }, { x: 560, y: 20 }, { x: 150, y: 90 }, { x: 40, y: 330 }, { x: 260, y: 560 }, { x: 740, y: 575 }, { x: 1010, y: conariY - 30 }], curviness: 1.25 }
    }, 2.4)
    .to(constel, { opacity: 0, duration: .5, ease: 'steps(4)' }, 3.1);
  emblemas.forEach((e, i) => {
    tl.to(e, { left: estrellaLuna.x, top: estrellaLuna.y, duration: .55, ease: 'power2.in', snap: { left: P, top: P } }, 3.05 + i * .09)
      .to(e, { opacity: 0, duration: .55, ease: 'steps(4)' }, 3.05 + i * .09);
  });
  tl.fromTo('.intro-destello', { scale: 1, opacity: 0 }, { scale: 5, opacity: 1, duration: .36, yoyo: true, repeat: 1, ease: 'steps(4)' }, 3.75)
    .fromTo('.iw-luna', { filter: 'brightness(1)' }, { filter: 'brightness(1.8)', duration: .35, yoyo: true, repeat: 1, ease: 'steps(2)' }, 3.75)
    // 4. nombre del estudio: se abre desde el centro a saltos de píxel
    .fromTo('.iw-lineas', { opacity: 1, clipPath: 'inset(0 50% 0 50%)' }, { clipPath: 'inset(0 0% 0 0%)', duration: .6, ease: 'steps(12)' }, 3.9)
    .fromTo('.iw-studios', { opacity: 1, clipPath: 'inset(0 50% 0 50%)' }, { clipPath: 'inset(0 0% 0 0%)', duration: .7, ease: 'steps(14)' }, 4.05)
    .to('.it-conari path', { strokeDashoffset: 0, duration: 1.1, stagger: .05, ease: 'steps(22)' }, 4.1)
    // el dragón cruza por delante del nombre y lo va dejando a la vista
    .to(vuelo, {
      x: -220, y: conariY - 40, duration: 1.15, ease: 'none',
      onUpdate() {
        const f = Math.min(100, Math.max(0, Math.round((aGrilla(vuelo.x) - L.x) / P) * P / L.s / 620 * 100));   // corta en columnas de píxel
        conari.style.clipPath = `inset(0 0 0 ${f}%)`;
      }
    }, 4.4)
    // y sigue volando, subiendo, hasta salir por el borde izquierdo real de la ventana (en pantallas anchas está lejos del escenario)
    .to(vuelo, { x: () => -ox / k - 260, y: conariY - 150, duration: .75, ease: 'none' }, 5.55)
    .set(vuelo, { a: 0 }, 6.3)
    .to('.it-conari', { opacity: 0, duration: .5, ease: 'steps(3)' }, 5.4)
    .fromTo('.iw-base', { opacity: 1, clipPath: 'inset(0 50% 0 50%)' }, { clipPath: 'inset(0 0% 0 0%)', duration: .4, ease: 'steps(8)' }, 5.35)
    .fromTo('.intro-brillo', { backgroundPosition: '-250% 0' }, { backgroundPosition: '300% 0', duration: 1.2, ease: 'steps(20)' }, 5.5)
    .fromTo('.intro-presenta', { opacity: 0 }, { opacity: 1, duration: .5, ease: 'steps(4)' }, 5.7)
    .to('.intro-saltar', { opacity: 0, duration: .4, ease: 'steps(2)' }, 5.6)
    .to({}, { duration: 1 })
    .to(intro, { opacity: 0, duration: .6, ease: 'steps(6)' });

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

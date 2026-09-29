/* ==========================================================================
   Obertura del portafolio clásico: una secuencia de planos de cámara sobre el valle
   antes de que aparezca la información de la página.
   1. primerísimo plano de los ojos del dragón de hielo mientras llega volando;
      la cámara lo sigue y se abre hasta mostrarlo entero
   2. corte al orbe del báculo; el mago entra volando y la cámara lo acompaña
   3. corte a la armadura dorada del guerrero, paneo a la cinta de ella y plano
      de la pareja tomada de la mano, con corazones
   4. plano general del reino y entra la página
   Bandas de cine arriba y abajo. Bajar, pulsar una tecla o tocar la salta.
   KRObertura.preparar() oculta la página y fija el primer plano; iniciar() la reproduce.
   ========================================================================== */
(() => {
  const raiz = document.documentElement, escena = document.getElementById('escena');
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const movil = matchMedia('(pointer: coarse)').matches || innerWidth < 820;
  if (!escena || quieto || !window.gsap || !window.KREscena) { window.KRObertura = { preparar() {}, iniciar() {} }; return; }
  const E = window.KREscena, $ = s => document.querySelector(s);
  const negro = $('.obertura-negro'), planoDragon = $('.plano-dragon'), planoMago = $('.plano-mago');

  // ---------------------------------------------------------- cámara: fracción del lienzo (x, y) y acercamiento (z)
  const cam = { x: .5, y: .5, z: 1 };
  const movD = { x: -.13, y: -.07 }, movM = { x: -.16, y: .05 };   // de dónde vienen volando el dragón y el mago
  let sigue = null;                                               // la cámara sigue a quien se está moviendo
  const zf = () => (innerHeight > innerWidth ? .72 : 1);           // en vertical el lienzo ya se ve más grande
  const aplicar = () => E.enfocar([cam.x + (sigue ? sigue.x : 0), cam.y + (sigue ? sigue.y : 0)], Math.max(1, cam.z * zf()), true, true);
  const moverDragon = () => { planoDragon.style.translate = `${movD.x * 100}% ${movD.y * 100}%`; };
  const moverMago = () => { planoMago.style.translate = `${movM.x * 100}% ${movM.y * 100}%`; };
  const plano = (x, y, z, quien) => { sigue = quien; Object.assign(cam, { x, y, z }); aplicar(); };
  const brillo = (sel, t) => [sel, { scale: 0, opacity: 0, rotate: -45 }, { scale: 1, opacity: 1, rotate: 0, duration: .35, yoyo: true, repeat: 1, repeatDelay: .3, ease: 'power2.out' }, t];

  let tl = null, revelado = true, pista = null;
  function preparar() {
    if (scrollY > 40 || (location.hash && location.hash.length > 1)) return false;
    raiz.classList.add('obertura'); revelado = false;
    gsap.set(negro, { opacity: 1 });
    moverDragon(); moverMago();
    plano(.376, .257, 9, movD);                                   // los ojos del dragón
    return true;
  }
  function iniciar() {
    if (revelado && !raiz.classList.contains('obertura') && !preparar()) return;
    tl = gsap.timeline({ onUpdate: aplicar, onComplete: revelar });
    // 1. el dragón: primero sus ojos, luego entero, siempre volando
    tl.to(negro, { opacity: 0, duration: 1.3, ease: 'power1.in' }, .1)
      .to(movD, { x: 0, y: 0, duration: 4.8, ease: 'power1.out', onUpdate: moverDragon }, 0)
      .fromTo('.px-dragon', { y: 0 }, { y: -10, duration: .9, yoyo: true, repeat: 5, ease: 'sine.inOut' }, 0)
      .fromTo(...brillo('.brillo-ojo', 1.1))
      .to(cam, { z: 5.5, duration: 2.4, ease: 'sine.inOut' }, 0)
      .to(cam, { x: .335, y: .27, z: 1.85, duration: 2.1, ease: 'power2.inOut' }, 2.4)
      // 2. el báculo y el mago
      .to(negro, { opacity: 1, duration: .35 }, 4.6)
      .call(() => plano(.289, .494, 5.4, movM), null, 4.96)
      .to(negro, { opacity: 0, duration: .5 }, 4.97)
      .to(movM, { x: 0, y: 0, duration: 3.1, ease: 'power2.out', onUpdate: moverMago }, 4.97)
      .fromTo(...brillo('.brillo-baculo', 5.4))
      .to(cam, { x: .255, y: .49, z: 2.3, duration: 1.9, ease: 'power2.inOut' }, 6.4)
      // 3. la pareja: la armadura de él, la cinta de ella, las manos y los corazones
      .to(negro, { opacity: 1, duration: .35 }, 8.2)
      .call(() => plano(.65, .38, 2.8, null), null, 8.56)
      .to(negro, { opacity: 0, duration: .5 }, 8.57)
      .fromTo(...brillo('.brillo-hombro', 8.9))
      .to(cam, { x: .76, y: .38, duration: 1.5, ease: 'sine.inOut' }, 9.4)
      .fromTo(...brillo('.brillo-liston', 10.3))
      .to(cam, { x: .72, y: .42, z: 1.5, duration: 1.7, ease: 'power2.inOut' }, 10.9)
      .call(corazones, null, 11.7)
      // 4. plano general del reino
      .to(cam, { x: .5, y: .47, z: 1, duration: 2.3, ease: 'power2.inOut' }, 12.8)
      .to({}, { duration: .4 });
    pista = document.createElement('p'); pista.className = 'obertura-pista';
    pista.textContent = movil ? 'Toca o desliza para entrar' : 'Baja o pulsa una tecla para entrar';
    document.body.appendChild(pista);
    gsap.fromTo(pista, { opacity: 0 }, { opacity: 1, duration: .6, delay: 2 });
    setTimeout(() => {                                           // el primer instante no se salta por accidente
      if (revelado) return;
      addEventListener('wheel', revelar, { passive: true, once: true });
      addEventListener('touchstart', revelar, { passive: true, once: true });
      addEventListener('keydown', teclaRevela);
      addEventListener('pointerdown', revelar);
    }, 1200);
  }
  function corazones() {
    const caja = $('.obertura-corazones');
    for (let i = 0; i < 5; i++) {
      const c = document.createElement('i'); c.style.left = `${(i - 2) * 22}%`;
      c.style.animationDelay = `${i * .28}s`; caja.appendChild(c);
      setTimeout(() => c.remove(), 3200 + i * 280);
    }
  }
  function teclaRevela(e) { if (!['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(e.key)) revelar(); }

  // ---------------------------------------------------------- la página entra
  function revelar() {
    if (revelado) return; revelado = true;
    removeEventListener('wheel', revelar); removeEventListener('touchstart', revelar);
    removeEventListener('keydown', teclaRevela); removeEventListener('pointerdown', revelar);
    if (pista) gsap.to(pista, { opacity: 0, duration: .3, onComplete: () => pista.remove() });
    if (tl) tl.kill();
    // todos a su lugar; la cámara vuelve suave a la vista de la página
    gsap.killTweensOf([movD, movM, '.px-dragon', cam]);
    gsap.to(movD, { x: 0, y: 0, duration: .8, onUpdate: moverDragon });
    gsap.to(movM, { x: 0, y: 0, duration: .8, onUpdate: moverMago });
    gsap.to('.px-dragon', { y: 0, duration: .5 });
    gsap.to(negro, { opacity: 0, duration: .4 });
    gsap.set('.brillo', { opacity: 0 });
    E.velocidad(.06); E.soltar(); setTimeout(() => E.velocidad(), 2500);
    raiz.classList.add('obertura-sale'); raiz.classList.remove('obertura');
    const partido = window.SplitText ? SplitText.create('.hero-titulo', { type: 'lines,chars', mask: 'lines' }) : null;
    const t = gsap.timeline({
      onComplete() {
        if (partido) partido.revert();
        gsap.set(['.hud', '#inicio .kicker', '.hero-rol', '.hero-texto', '.hero-botones .btn'], { clearProps: 'all' });
        setTimeout(() => raiz.classList.remove('obertura-sale'), 1200);
      }
    });
    t.from('.hud', { yPercent: -130, duration: .8, ease: 'power3.out' }, .2)
      .from('#inicio .kicker', { y: 18, opacity: 0, duration: .6, ease: 'power2.out' }, .35)
      .from(partido ? partido.chars : '.hero-titulo', { yPercent: 110, opacity: partido ? 1 : 0, duration: .75, stagger: .022, ease: 'power3.out' }, .45)
      .from(['.hero-rol', '.hero-texto'], { y: 24, opacity: 0, duration: .7, stagger: .12, ease: 'power2.out' }, .8)
      .from('.hero-botones .btn', { y: 18, opacity: 0, scale: .9, duration: .5, stagger: .1, ease: 'back.out(2)' }, 1.15);
  }

  window.KRObertura = { preparar, iniciar, revelar };
})();

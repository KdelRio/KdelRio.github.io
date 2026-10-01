/* ==========================================================================
   Modo escenas (prueba): la página clásica deja de desplazarse. Cada giro de la rueda
   (o flecha abajo / AvPág) cambia de escena con una animación propia; algunas escenas
   tienen pasos internos (diapositivas, juegos) y entre zonas cae una cortina con el
   nombre de la zona. Reutiliza los mismos nodos de la página (se mueven, no se copian),
   así los juegos, filtros y comparador siguen funcionando.
   Solo en escritorio con mouse; ?normal vuelve a la página con scroll.
   ========================================================================== */
(() => {
  const raiz = document.documentElement;
  const apto = matchMedia('(pointer: fine)').matches && innerWidth >= 1000 && !matchMedia('(prefers-reduced-motion: reduce)').matches
    && !/[?&]normal\b/.test(location.search) && window.gsap;
  if (!apto) return;
  const $ = (s, c = document) => c.querySelector(s), $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const main = $('#contenido');
  raiz.classList.add('escenas');

  // ---------------------------------------------------------- piezas
  const velo = document.createElement('div'); velo.className = 'escenas-velo'; main.appendChild(velo);   // oscurece el valle detrás del contenido
  const capa = document.createElement('div'); capa.className = 'escenas-capa'; main.appendChild(capa);
  const crear = (clase, ...nodos) => {
    const ev = document.createElement('div'); ev.className = 'ev ' + (clase || '');
    const caja = document.createElement('div'); caja.className = 'ev-caja';
    nodos.flat().filter(Boolean).forEach(n => caja.appendChild(n));
    ev.appendChild(caja); capa.appendChild(ev); return ev;
  };
  const boton = (texto, clase = 'btn btn-oro') => { const b = document.createElement('button'); b.type = 'button'; b.className = clase; b.textContent = texto; return b; };
  const fila = (...b) => { const f = document.createElement('div'); f.className = 'fila-botones centro ev-fila'; b.forEach(x => f.appendChild(x)); return f; };
  const W = () => innerWidth, Hh = () => innerHeight;

  // ---------------------------------------------------------- 1. inicio
  const inicio = $('#inicio');
  const E = [];
  E.push({
    id: 'inicio', ev: crear('ev-inicio', inicio),
    entrar(tl, ev, dir) { if (dir < 0) tl.from($('.hero-grid', ev), { x: -W(), opacity: 0, duration: .7, ease: 'power3.out' }); },
    salir(tl, ev) {                                   // un pequeño impulso a la derecha y sale por la izquierda
      const t = $('.hero-grid', ev);
      tl.to(t, { x: 40, duration: .28, ease: 'power2.out' }).to(t, { x: -W(), opacity: 0, duration: .6, ease: 'power3.in' });
    },
  });

  // ---------------------------------------------------------- 2. la aventura del reino (camino lineal)
  const invit = $('#mundo .invitacion');
  const btnMundo = $('[data-abrir-arcade]', invit);
  E.push({
    id: 'mundo', ev: crear('ev-mundo', invit),
    entrar(tl, ev) {
      const izq = invit.firstElementChild, lis = $$('.invitacion-misiones li', ev);
      tl.from(invit, { y: 90, opacity: 0, duration: .6, ease: 'power3.out' })
        .from([...izq.children].filter(n => n !== btnMundo), { y: 50, opacity: 0, duration: .5, stagger: .1, ease: 'power2.out' }, '-=.3')
        .from(lis, { x: W() * .6, opacity: 0, duration: .55, stagger: .22, ease: 'back.out(1.4)' }, '-=.1')
        .from(btnMundo, { y: 26, opacity: 0, duration: .45, ease: 'back.out(2.5)' }, '+=.1');
    },
  });

  // ---------------------------------------------------------- 3. Studios Conari (aparece por desvanecimiento, paso a paso)
  const est = $('#estudio');
  E.push({
    id: 'estudio', zona: 'estudio', ev: crear('ev-estudio', $('.kicker', est), $('.titulo', est), $('.estudio-grid', est)),
    entrar(tl, ev) {
      const marca = $('.estudio-marca', ev);
      tl.from([$('.kicker', ev), $('.titulo', ev), $('.estudio-logo', ev), $('.estudio-lema', ev), $('.estudio-marca > p:not(.estudio-lema)', ev)], { opacity: 0, duration: .7, stagger: .18, ease: 'power1.out' })
        .from($$('.fila-botones .btn', marca), { opacity: 0, y: 14, duration: .5, stagger: .15 })
        .from($('.estudio-roles h3', ev), { opacity: 0, duration: .5 })
        .from($$('.rol', ev), { opacity: 0, y: 20, duration: .6, stagger: .3, ease: 'power2.out' });
    },
  });

  // ---------------------------------------------------------- 4. Torre del Dato (cortina "Análisis de datos")
  const datos = $('#datos');
  const cabDatos = [$('.kicker', datos), $('.titulo', datos), $(':scope > .contenedor > .bajada', datos)];
  E.push({
    id: 'torre', zona: 'datos', cortina: 'Análisis de datos', ev: crear('ev-torre', cabDatos, $('#arena-clasica'), $('#arena-informe')),
    entrar(tl, ev) {
      tl.from(cabDatos, { y: 30, opacity: 0, duration: .55, stagger: .12 })
        .from($('#arena-clasica'), { y: 60, opacity: 0, duration: .6, ease: 'power3.out' }, '-=.2')
        .from($$('.esp-carta', ev), { y: 30, opacity: 0, duration: .4, stagger: .07 }, '-=.3');
    },
  });

  // ---------------------------------------------------------- 5. Magic Foods: cae desde arriba con rebote y se voltea como una hoja
  const magic = $('#magic-bloque'); magic.hidden = false;
  const lab = $('.lab', magic), graf = $('.lab-graficos', lab);
  const frente = document.createElement('div'), dorso = document.createElement('div');
  frente.className = 'lab-cara lab-frente'; dorso.className = 'lab-cara lab-dorso'; dorso.hidden = true;
  frente.append($('.lab-filtros', lab), $('.lab-kpis', lab), $('.grafico-ancho', graf));
  const dorsoGraf = document.createElement('div'); dorsoGraf.className = 'lab-graficos lab-graficos-dorso';
  dorsoGraf.append(...$$('.grafico', graf)); dorso.append(dorsoGraf, $('#lab-hallazgo'));
  graf.remove(); lab.prepend(frente, dorso);
  const voltear = document.createElement('button'); voltear.type = 'button'; voltear.className = 'lab-voltear';
  voltear.title = 'Voltear la hoja'; voltear.setAttribute('aria-label', 'Voltear la hoja para ver el resto del análisis');
  voltear.innerHTML = '<img src="assets/img/pixel/i-voltear.png" alt=""><span>Voltear</span>';
  const marcoLab = document.createElement('div'); marcoLab.className = 'lab-marco'; marcoLab.append(voltear, lab);
  const verBi = boton('Ver análisis de datos en Power BI y Tableau');
  let girando = false;
  voltear.addEventListener('click', () => {
    if (girando) return; girando = true;
    // la hoja gira 180° sobre su eje vertical: a mitad de giro (canto) se cambia la cara visible
    const vuelta = { r: 0 };
    gsap.timeline({ onComplete: () => { girando = false; gsap.set(lab, { clearProps: 'transform' }); } })
      .to(vuelta, { r: 180, duration: .9, ease: 'power2.inOut', onUpdate() {
        const r = vuelta.r, alzada = Math.sin(r * Math.PI / 180) * 40;
        if (r >= 90 && !lab.dataset.cambio) { lab.dataset.cambio = '1'; const d = dorso.hidden; dorso.hidden = !d; frente.hidden = d; voltear.classList.toggle('dorso', d); }
        gsap.set(lab, { rotateY: r < 90 ? r : r - 180, z: alzada, transformPerspective: 1600 });   // la cara nueva queda al derecho
      } })
      .call(() => { delete lab.dataset.cambio; });
  });
  E.push({
    id: 'magic', zona: 'datos', ev: crear('ev-magic', $('#magic-foods'), $('.bajada', magic), marcoLab, fila(verBi)),
    entrar(tl, ev) {
      tl.from(marcoLab, { y: -Hh() * 1.1, duration: 1.15, ease: 'bounce.out' })
        .from([$('#magic-foods'), $('.bajada', ev)], { opacity: 0, y: -20, duration: .45, stagger: .1 }, '-=.5')
        .from(voltear, { x: -60, opacity: 0, duration: .4, ease: 'back.out(2)' }, '-=.2')
        .from(verBi, { y: 26, opacity: 0, duration: .4, ease: 'back.out(2.5)' }, '-=.1');
    },
  });
  verBi.addEventListener('click', () => irA(E.findIndex(e => e.id === 'comparador')));

  // ---------------------------------------------------------- 6. comparador Power BI / Tableau
  const subs = $$('#datos .subtitulo'), subCmp = subs.find(s => /dos plataformas/i.test(s.textContent)), subDeck = subs.find(s => /decisi/i.test(s.textContent));
  E.push({
    id: 'comparador', zona: 'datos', cortina: 'Un mismo requerimiento y dos plataformas',
    ev: crear('ev-comparador', subCmp, subCmp.nextElementSibling, $('#bi-tabs'), $('#comparador')),
    entrar(tl, ev) {
      tl.from([subCmp, $('.bajada', ev)], { opacity: 0, y: 20, duration: .45, stagger: .1 })
        .from($$('#bi-tabs > *'), { opacity: 0, y: 16, duration: .3, stagger: .05 }, '-=.2')
        .from($('#comparador'), { opacity: 0, scale: .94, duration: .6, ease: 'power3.out' }, '-=.1');
    },
  });

  // ---------------------------------------------------------- 7. presentación 2023 / 2024 a pantalla completa
  const deck = $('#carrusel-decks'), figs = $$('figure', deck), bajDeck = subDeck.nextElementSibling;
  const verMagic = $('#datos .contenedor > .fila-botones.centro');
  const puntosDeck = document.createElement('div'); puntosDeck.className = 'deck-puntos';
  figs.forEach((_, i) => { const p = document.createElement('i'); p.addEventListener('click', () => irPaso(i)); puntosDeck.appendChild(p); });
  deck.classList.add('deck-escena');
  deck.addEventListener('click', e => {
    const f = e.target.closest('figure'); if (!f || f.classList.contains('activa')) return;
    e.stopPropagation(); irPaso(figs.indexOf(f));
  }, true);
  E.push({
    id: 'deck', zona: 'datos', ev: crear('ev-deck', subDeck, bajDeck, deck, puntosDeck, verMagic),
    pasos: figs.length,
    entrar(tl, ev) {
      tl.from([subDeck, bajDeck], { opacity: 0, y: 20, duration: .45, stagger: .1 });
      this.paso(tl, 0, 1, true);
    },
    paso(tl, i, dir, primero) {
      // carrusel en 3D: la actual al centro y de frente; la anterior y la siguiente a los lados, giradas hacia adentro
      figs.forEach((f, k) => f.classList.toggle('activa', k === i));
      $$('i', puntosDeck).forEach((p, k) => p.classList.toggle('activo', k === i));
      figs.forEach((f, k) => {
        const d = k - i, a = Math.abs(d);
        const pose = { xPercent: d * 62, rotateY: -Math.sign(d) * Math.min(a, 1) * 42, scale: a ? .72 : 1, opacity: a > 1 ? 0 : a ? .5 : 1, zIndex: 10 - a, transformPerspective: 1400, transformOrigin: '50% 50%' };
        if (primero) tl.fromTo(f, { ...pose, xPercent: pose.xPercent + 40, opacity: 0 }, { ...pose, duration: .6, ease: 'power3.out' }, '<.04');
        else tl.to(f, { ...pose, duration: .7, ease: 'power3.inOut' }, 0);
      });
      const ultimo = i === figs.length - 1;
      verMagic.classList.toggle('visible', ultimo);
      if (ultimo) tl.fromTo(verMagic, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: .45, ease: 'back.out(2)' });
    },
  });

  // ---------------------------------------------------------- 8. videojuegos: un juego por paso
  const arc = $('#arcade'), juegos = $$('.juego', arc);
  const cabJuegos = [$('.kicker', arc), $('.titulo', arc), $(':scope > .contenedor > .bajada', arc)];
  const pista = document.createElement('div'); pista.className = 'juegos-pista'; pista.append(...juegos);
  const puntosJ = document.createElement('div'); puntosJ.className = 'deck-puntos';
  const PAGS = Math.ceil(juegos.length / 2);                    // dos juegos por página
  for (let i = 0; i < PAGS; i++) { const p = document.createElement('i'); p.addEventListener('click', () => irPaso(i)); puntosJ.appendChild(p); }
  let transicion = 0;                                            // cada cambio usa la siguiente transición de videojuego
  E.push({
    id: 'juegos', zona: 'arcade', cortina: 'Videojuegos', ev: crear('ev-juegos', cabJuegos, pista, puntosJ),
    pasos: PAGS,
    entrar(tl) { tl.from(cabJuegos, { opacity: 0, y: 24, duration: .45, stagger: .1 }); this.paso(tl, 0, 1, true); },
    paso(tl, i, dir, primero) {
      const marcar = () => {
        juegos.forEach((j, k) => j.classList.toggle('activa', Math.floor(k / 2) === i));
        $$('i', puntosJ).forEach((p, k) => p.classList.toggle('activo', k === i));
      };
      const par = juegos.slice(i * 2, i * 2 + 2);
      if (primero || !window.KRTransJuego) {                // primera entrada: las dos tarjetas llegan desde la derecha
        marcar();
        tl.fromTo(par, { x: W() * .6, opacity: 0 }, { x: 0, opacity: 1, duration: .6, stagger: .15, ease: 'power3.out' }, '-=.1')
          .from(par.flatMap(j => $$('.juego-cuerpo > *', j)), { opacity: 0, y: 14, duration: .3, stagger: .03 }, '-=.3');
        return;
      }
      // entre páginas: una transición de videojuego distinta cada vez
      tl.call(() => KRTransJuego.jugar(transicion++, () => { marcar(); ajustar(E.find(x => x.id === 'juegos')); }))
        .to({}, { duration: KRTransJuego.duracion })
        .from(par.flatMap(j => $$('.juego-cuerpo > *', j)), { opacity: 0, y: 12, duration: .3, stagger: .03 }, KRTransJuego.duracion - .55);
    },
  });

  // ---------------------------------------------------------- 9. Ritmo Resonancia
  const subRitmo = $$('#arcade .subtitulo').find(s => /ritmo/i.test(s.textContent));
  E.push({
    id: 'ritmo', zona: 'arcade', ev: crear('ev-ritmo', subRitmo, subRitmo.nextElementSibling, $('#arcade .salon')),
    entrar(tl, ev) {
      // como una pantalla CRT que se enciende: un punto de luz, una línea horizontal y luego se abre en vertical
      const salon = $('.salon', ev), canvas = $('canvas', salon);
      const crt = { v: 49.5, h: 49.5 }, pintar = () => { salon.style.clipPath = `inset(${crt.v}% ${crt.h}% ${crt.v}% ${crt.h}%)`; };
      pintar();
      tl.from([subRitmo, $('.bajada', ev)], { opacity: 0, y: 20, duration: .45, stagger: .1 })
        // se anima un objeto con los dos márgenes y se escribe el inset completo: el navegador abrevia
        // "inset(49.5% 0% 49.5% 0%)" y la interpolación directa abría solo hacia abajo
        .call(() => { crt.v = 49.5; crt.h = 49.5; pintar(); }, null, '-=.1')
        .to(crt, { h: 0, duration: .4, ease: 'power3.out', onUpdate: pintar }, '<')
        .fromTo(salon, { filter: 'brightness(4) saturate(0)' }, { filter: 'brightness(4) saturate(0)', duration: .4 }, '<')
        .to(crt, { v: 0, duration: .45, ease: 'power3.inOut', onUpdate: pintar }, '+=.08')
        .to(salon, { filter: 'brightness(1) saturate(1)', duration: .5, ease: 'power2.out' }, '<.1')
        .fromTo(canvas, { opacity: .3 }, { opacity: 1, duration: .25, repeat: 2, yoyo: true, ease: 'steps(2)' }, '<.2')
        .set(salon, { clearProps: 'clipPath,filter' })
        .set(canvas, { clearProps: 'opacity' });
    },
  });

  // ---------------------------------------------------------- 10. árbol de habilidades
  const gr = $('#gremio');
  const cabG = [$('.kicker', gr), $('.titulo', gr), $('.bajada', gr)];
  E.push({
    id: 'gremio', zona: 'gremio', cortina: 'Árbol de habilidades', ev: crear('ev-gremio', cabG, $('#arbol'), $('#habilidad-detalle')),
    entrar(tl, ev) {
      tl.from(cabG, { opacity: 0, y: 20, duration: .45, stagger: .1 })
        .from($$('.rama', ev), { y: 80, opacity: 0, duration: .5, stagger: .08, ease: 'back.out(1.6)' }, '-=.1')
        .from($('#habilidad-detalle'), { opacity: 0, y: 20, duration: .4 });
    },
  });

  // ---------------------------------------------------------- 11 y 12. hoja de personaje
  const cv = $('#cv'), cvH = $$('.cv-h', cv);
  const cabCv = [$('.kicker', cv), $('.titulo', cv)];
  const columnaCv = document.createElement('div'); columnaCv.className = 'cv-columna'; columnaCv.append(cvH[0], $('.linea-tiempo', cv));
  const gridCv = document.createElement('div'); gridCv.className = 'cv-grid'; gridCv.append($('.ficha', cv), columnaCv);
  E.push({
    id: 'cv', zona: 'cv', cortina: 'Hoja de personaje', ev: crear('ev-cv', cabCv, gridCv),
    entrar(tl, ev) {
      tl.from(cabCv, { opacity: 0, y: 20, duration: .4, stagger: .1 })
        .from($('.ficha', ev), { x: -W() * .4, opacity: 0, duration: .6, ease: 'power3.out' })
        .from($$('.atributos li', ev), { opacity: 0, x: -14, duration: .25, stagger: .06 }, '-=.2')
        .from(cvH[0], { opacity: 0, duration: .3 }, '-=.4')
        .from($$('.linea-tiempo li', ev), { x: 80, opacity: 0, duration: .45, stagger: .2, ease: 'power2.out' }, '-=.2');
    },
  });
  const formacion = [cvH[1], $('.logros-cv', cv), $('.cert-h', cv), $('.cert-duoc', cv)];
  E.push({
    id: 'formacion', zona: 'cv', ev: crear('ev-formacion', formacion),
    entrar(tl, ev) {
      tl.from(cvH[1], { opacity: 0, y: 20, duration: .4 })
        .from($$('.logros-cv > div', ev), { opacity: 0, y: 40, scale: .9, duration: .45, stagger: .14, ease: 'back.out(1.8)' })
        .from($('.cert-h', ev), { opacity: 0, duration: .3 })
        .from($$('.cert-duoc li', ev), { opacity: 0, scale: 0, duration: .25, stagger: .05, ease: 'back.out(3)' });
    },
  });

  // ---------------------------------------------------------- 13. contacto y el nido del dragón
  const ct = $('#contacto'), pie = $('.pie');
  const cabCt = [$('.kicker', ct), $('.titulo', ct), $('.bajada', ct)];
  E.push({
    id: 'contacto', zona: 'contacto', cortina: '¿Conversamos?', ev: crear('ev-contacto', cabCt, $('.contactos', ct), pie),
    entrar(tl, ev) {
      tl.from(cabCt, { opacity: 0, y: 24, duration: .45, stagger: .1 })
        .from($$('.contacto', ev), { y: -Hh() * .6, opacity: 0, duration: .8, stagger: .15, ease: 'bounce.out' }, '-=.1')
        .from(pie, { y: 120, opacity: 0, duration: .6, ease: 'power3.out' }, '-=.3')
        .call(() => raiz.classList.add('escena-final'));   // recién con el pie quieto el dragón vuela directo al nido
    },
  });

  // ---------------------------------------------------------- cortina entre zonas (color del tema actual)
  const cortina = document.createElement('div'); cortina.className = 'cortina-escena'; cortina.innerHTML = '<p></p>';
  document.body.appendChild(cortina);
  const textoCortina = $('p', cortina);

  // ---------------------------------------------------------- índice lateral: un punto por escena
  const indice = document.createElement('nav'); indice.className = 'escenas-indice'; indice.setAttribute('aria-label', 'Escenas');
  const NOMBRE = { inicio: 'Inicio', mundo: 'Modo arcade', estudio: 'Studios Conari', torre: 'Torre del Dato', magic: 'Magic Foods', comparador: 'Power BI y Tableau', deck: 'Presentación 2023/2024', juegos: 'Videojuegos', ritmo: 'Ritmo Resonancia', gremio: 'Habilidades', cv: 'Hoja de personaje', formacion: 'Formación', contacto: 'Contacto' };
  E.forEach((e, i) => { const b = document.createElement('button'); b.type = 'button'; b.title = NOMBRE[e.id]; b.setAttribute('aria-label', NOMBRE[e.id]); b.addEventListener('click', () => irA(i)); indice.appendChild(b); });
  document.body.appendChild(indice);
  const pistaRueda = document.createElement('div'); pistaRueda.className = 'escenas-pista'; pistaRueda.innerHTML = '<span></span>';
  document.body.appendChild(pistaRueda);

  // ---------------------------------------------------------- ajuste a la pantalla: si no cabe, se reduce; si aún no cabe, scroll interno
  function ajustar(e) {
    const caja = e.ev.firstElementChild;
    caja.style.zoom = ''; e.ev.classList.remove('desborda');
    const disp = e.ev.clientHeight - 96, alto = caja.scrollHeight;   // margen para la pista de la rueda
    if (alto > disp) {
      const k = Math.max(.66, disp / alto); caja.style.zoom = k.toFixed(3);
      if (caja.scrollHeight * k > disp + 2) e.ev.classList.add('desborda');
    }
  }
  addEventListener('resize', () => E[actual] && ajustar(E[actual]));
  // si el contenido de la escena cambia de alto (el informe de la arena, una habilidad elegida) se vuelve a ajustar
  let ajustando = false;
  const ro = new ResizeObserver(() => {
    if (ajustando) return;
    requestAnimationFrame(() => { ajustando = true; if (E[actual]) ajustar(E[actual]); requestAnimationFrame(() => { ajustando = false; }); });
  });
  ['#arena-clasica', '#arena-informe', '#habilidad-detalle'].forEach(s => { const n = $(s); if (n) ro.observe(n); });
  // las imágenes diferidas (banners, diapositivas) cambian el alto al terminar de cargar: se cargan de inmediato
  // y, cuando llegan, se vuelve a ajustar la escena activa (antes quedaba medida sin ellas en la primera visita)
  $$('img', capa).forEach(img => {
    img.loading = 'eager';
    if (!img.complete) img.addEventListener('load', () => { if (img.closest('.ev.activa')) requestAnimationFrame(() => ajustar(E[actual])); }, { once: true });
  });

  // ---------------------------------------------------------- navegación
  let actual = 0, paso = 0, ocupado = false;
  const objetivos = tl => [...new Set(tl.getChildren(true, true, false).flatMap(t => t.targets()))].filter(t => t instanceof Element);
  function mostrar(e) {
    E.forEach(x => x.ev.classList.toggle('activa', x === e));
    $$('button', indice).forEach((b, i) => b.classList.toggle('activo', E[i] === e));
    if (e.id !== 'contacto') raiz.classList.remove('escena-final');   // el nido se activa al terminar la entrada del pie
    velo.classList.toggle('visible', e.id !== 'inicio');
    if (e.zona && window.KR) KR.visitarZona(e.zona);
    const marcar = () => $$('.hud-nav a').forEach(a => a.classList.toggle('activo', a.getAttribute('href') === '#' + (e.zona || '')));
    marcar(); setTimeout(marcar, 150);   // el observador de zonas de la página clásica puede responder después
    pistaRueda.classList.toggle('oculta', e.id === 'contacto');
    e.ev.scrollTop = 0; ajustar(e);
  }
  // mientras GSAP anima una escena, las transiciones CSS de transform (efectos hover) se apagan: si no, se pelean
  // con la animación y los elementos quedan corridos o invisibles
  const animando = (ev, tl) => { ev.classList.add('animando'); tl.eventCallback('onComplete', () => ev.classList.remove('animando')); };
  function entrar(e, dir, pasoInicial) {
    e.ev.classList.add('animando');
    const tl = gsap.timeline();
    if (e.pasos) {                                    // al volver desde abajo, se entra en el último paso
      const n = pasoInicial ?? (dir < 0 ? e.pasos - 1 : 0);
      paso = n;
      if (n === 0) e.entrar.call(e, tl, e.ev, dir);
      else e.paso.call(e, tl, n, 1, true);
    } else { paso = 0; e.entrar.call(e, tl, e.ev, dir); }
    return tl;
  }
  // solo se limpia lo que vive dentro de las escenas: la cortina sigue animándose mientras se cambia de escena
  function limpiar(tl) { gsap.set(objetivos(tl).filter(t => capa.contains(t)), { clearProps: 'transform,opacity,visibility' }); }
  let tlEntrada = null;
  function irA(i, pasoInicial) {
    if (ocupado || i === actual || i < 0 || i >= E.length) return;
    ocupado = true;
    const dir = i > actual ? 1 : -1, de = E[actual], a = E[i];
    if (tlEntrada) { tlEntrada.progress(1); }
    const sal = gsap.timeline();
    if (de.salir && dir > 0) de.salir(sal, de.ev);
    else sal.to(de.ev.firstElementChild, { opacity: 0, y: dir > 0 ? -50 : 50, duration: .45, ease: 'power2.in' });
    const cambio = () => {
      limpiar(sal); if (tlEntrada) limpiar(tlEntrada);
      actual = i; mostrar(a);
      tlEntrada = entrar(a, dir, pasoInicial);
      ajustar(a);                                     // medir con el contenido de la entrada ya visible
      tlEntrada.eventCallback('onComplete', () => { ocupado = false; a.ev.classList.remove('animando'); });
      // si la entrada es muy larga, se puede seguir navegando antes de que termine
      gsap.delayedCall(Math.min(1.2, tlEntrada.duration()), () => { ocupado = false; });
    };
    const conCortina = dir > 0 ? !!a.cortina : !!de.cortina;           // la cortina marca la entrada a una zona nueva
    if (conCortina) {
      textoCortina.textContent = dir > 0 ? a.cortina : NOMBRE[a.id];
      const partido = window.SplitText ? SplitText.create(textoCortina, { type: 'chars' }) : null;
      sal.fromTo(cortina, { yPercent: dir > 0 ? 100 : -100, visibility: 'visible' }, { yPercent: 0, duration: .55, ease: 'power3.inOut', immediateRender: false }, '-=.2')
        .from(partido ? partido.chars : textoCortina, { opacity: 0, y: 30, duration: .3, stagger: .03, ease: 'back.out(2)' })
        .to({}, { duration: .55 })
        .call(cambio)
        .to(cortina, { yPercent: dir > 0 ? -100 : 100, duration: .6, ease: 'power3.inOut' })
        .set(cortina, { visibility: 'hidden' })
        .call(() => partido && partido.revert());
    } else sal.call(cambio);
  }
  function irPaso(n) {
    const e = E[actual]; if (!e.pasos || ocupado || n === paso || n < 0 || n >= e.pasos) return;
    ocupado = true;
    const dir = n > paso ? 1 : -1; paso = n;
    e.ev.classList.add('animando');
    const tl = gsap.timeline({ onComplete: () => { ocupado = false; e.ev.classList.remove('animando'); } });
    e.paso.call(e, tl, n, dir, false);
    requestAnimationFrame(() => ajustar(e));
  }
  function avanzar(dir) {
    const e = E[actual];
    if (e.pasos && paso + dir >= 0 && paso + dir < e.pasos) return irPaso(paso + dir);
    irA(actual + dir);
  }
  window.KREscenas = { irA: n => irA(typeof n === 'string' ? E.findIndex(e => e.id === n) : n), avanzar };

  // ---------------------------------------------------------- entrada: rueda, teclado y enlaces del menú
  const bloqueada = () => raiz.classList.contains('obertura') || raiz.classList.contains('con-intro') || document.body.classList.contains('bloqueado') || $('.modal:not([hidden])') || $('.visor');
  let acumulado = 0, ultimaRueda = 0, gestoUsado = false;
  addEventListener('wheel', e => {
    if (bloqueada()) return;
    if (e.target.closest('select') || (e.target.closest('canvas') && document.activeElement === e.target.closest('canvas'))) return;   // jugando (juego con foco), la rueda no cambia de escena
    const ev = E[actual].ev, ahora = performance.now();
    if (ev.classList.contains('desborda')) {                          // escena más alta que la pantalla: primero se recorre
      const puede = e.deltaY > 0 ? ev.scrollTop + ev.clientHeight < ev.scrollHeight - 2 : ev.scrollTop > 0;
      if (puede) return;
    }
    e.preventDefault();
    if (ahora - ultimaRueda > 220) { gestoUsado = false; acumulado = 0; }   // un gesto nuevo tras una pausa
    ultimaRueda = ahora;
    if (gestoUsado || ocupado) return;                                // la inercia del touchpad no encadena escenas
    acumulado += e.deltaY;
    if (Math.abs(acumulado) > 45) { gestoUsado = true; avanzar(acumulado > 0 ? 1 : -1); acumulado = 0; }
  }, { passive: false });
  addEventListener('keydown', e => {
    if (bloqueada() || e.target.closest('input, select, textarea, canvas')) return;
    if (['ArrowDown', 'PageDown'].includes(e.key)) { e.preventDefault(); avanzar(1); }
    if (['ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); avanzar(-1); }
    if (e.key === 'Home') { e.preventDefault(); irA(0); }
    if (e.key === 'End') { e.preventDefault(); irA(E.length - 1); }
  });
  const DESTINO = { inicio: 'inicio', mundo: 'mundo', estudio: 'estudio', datos: 'torre', 'magic-foods': 'magic', arcade: 'juegos', gremio: 'gremio', cv: 'cv', contacto: 'contacto' };
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]'); if (!a) return;
    const id = DESTINO[a.getAttribute('href').slice(1)]; if (!id) return;
    e.preventDefault(); KREscenas.irA(id);
  }, true);
  const dragon = $('#dragon'); if (dragon) dragon.addEventListener('click', () => irA(0), true);

  // ---------------------------------------------------------- arranque
  history.scrollRestoration = 'manual'; scrollTo(0, 0);
  const inicial = DESTINO[location.hash.slice(1)];
  mostrar(E[0]);
  if (inicial && inicial !== 'inicio') { const n = E.findIndex(e => e.id === inicial); actual = n; mostrar(E[n]); tlEntrada = entrar(E[n], 1); ajustar(E[n]); animando(E[n].ev, tlEntrada); }
})();

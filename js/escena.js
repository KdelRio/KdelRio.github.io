/* ==========================================================================
   Escena de fondo: planos pixel art con profundidad, cámara por zonas, estrellas y pétalos
   --p      avance del scroll dentro del inicio (0 a 1); separa los planos (CSS)
   --mx/my  puntero suavizado (-1 a 1), solo con mouse
   cámara   al bajar, el encuadre viaja al hito de la ilustración que corresponde a
            cada zona (castillo, cumbres, dragón, árbol, personajes) y vuelve a la
            vista completa en el cierre
   ========================================================================== */
(() => {
  const escena = document.getElementById('escena');
  if (!escena) return;
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mouse = matchMedia('(pointer: fine)').matches;
  const marco = escena.querySelector('.escena-marco');
  const estrellas = document.getElementById('escena-estrellas');
  const petalos = document.getElementById('escena-petalos');
  if (quieto) { estrellas.remove(); petalos.remove(); return; }
  escena.classList.add('viva');                     // desde aquí el encuadre lo maneja la cámara

  // hito de cada zona en fracciones del lienzo 1600 × 900 (null = vista completa)
  const TOMAS = {
    inicio:   { f: null, z: 1 },
    mundo:    { f: null, z: 1 },
    estudio:  { f: [.53, .54], z: 1.5,  tinte: [224, 183, 86], t: .2 },   // castillo
    datos:    { f: [.24, .5],  z: 1.5,  tinte: [126, 200, 255], t: .16 }, // mago sobre su báculo
    arcade:   { f: [.29, .2],  z: 1.35, tinte: [90, 170, 255], t: .22 },  // dragón
    gremio:   { f: [.9, .25],  z: 1.4,  tinte: [200, 120, 255], t: .2 },  // árbol
    cv:       { f: [.73, .52], z: 1.4,  tinte: [243, 190, 120], t: .16 }, // pareja
    contacto: { f: null, z: 1, claro: 1, tinte: [150, 175, 255], t: .1 }, // de vuelta al reino completo
  };

  const dpr = Math.min(devicePixelRatio || 1, 2);
  const azar = (a, b) => a + Math.random() * (b - a);
  const suave = x => x * x * (3 - 2 * x);
  let p = 0, mx = 0, my = 0, objX = 0, objY = 0, sucio = true;
  let vw = innerWidth, vh = innerHeight, W = 0, H = 0, vertical = false, llaves = [];
  const cam = { x: 0, y: 0, z: 1, tr: 0, tg: 0, tb: 0, t: 0, claro: 0 }, obj = { ...cam };

  // ---------------------------------------------------------- geometría y llaves de cámara
  function encuadre(toma) {
    if (!toma.f) {
      const x = vertical ? vw / 2 - .72 * W : (vw - W) / 2;
      return { x, y: -.03 * vh, z: 1 };
    }
    // el hito se encuadra en el hueco a la derecha del título de la zona, que es lo que se ve al llegar
    const z = toma.z, Wz = W * z, Hz = H * z, tx = vertical ? .5 : .76, ty = vertical ? .2 : .27;
    const x = Math.min(0, Math.max(vw - Wz, vw * tx - toma.f[0] * Wz));
    const y = Math.min(0, Math.max(vh - Hz * .97, vh * ty - toma.f[1] * Hz));
    return { x, y, z };
  }
  function medirCamara() {
    vw = innerWidth; vh = innerHeight;
    vertical = vw <= 820 && vh > vw;
    W = Math.max(vw * 1.06, vh * (vertical ? 1.04 : 1.1) * 1660 / 948); H = W * 948 / 1660;
    marco.style.width = W + 'px';
    llaves = [];
    document.querySelectorAll('main > section').forEach(s => {
      const toma = TOMAS[s.id]; if (!toma) return;
      const e = { ...encuadre(toma), tinte: toma.tinte || [0, 0, 0], t: toma.t || 0, claro: toma.claro || 0 };
      const a = Math.max(0, s.offsetTop - vh * .35), b = Math.max(a, s.offsetTop + s.offsetHeight - vh * .65);
      llaves.push({ s: a, e }, { s: b, e });
    });
  }
  function apuntar() {
    if (!llaves.length) return;
    const y = scrollY;
    let i = llaves.findIndex(k => k.s > y);
    let e;
    if (i <= 0) e = llaves[i === 0 ? 0 : llaves.length - 1].e;
    else {
      const A = llaves[i - 1], B = llaves[i], k = suave((y - A.s) / Math.max(1, B.s - A.s));
      e = {}; for (const c of ['x', 'y', 'z', 't', 'claro']) e[c] = A.e[c] + (B.e[c] - A.e[c]) * k;
      e.tinte = A.e.tinte.map((v, j) => v + (B.e.tinte[j] - v) * k);
      // el tinte de una vista completa no tiene color propio: se toma el de la otra llave
      if (!A.e.t) e.tinte = B.e.tinte; else if (!B.e.t) e.tinte = A.e.tinte;
    }
    Object.assign(obj, { x: e.x, y: e.y, z: e.z, t: e.t, claro: e.claro, tr: e.tinte[0], tg: e.tinte[1], tb: e.tinte[2] });
  }

  // ---------------------------------------------------------- scroll y puntero
  const leerScroll = () => {
    const nuevo = Math.min(1, Math.max(0, scrollY / (vh * .9)));
    if (nuevo !== p) { p = nuevo; sucio = true; }
    apuntar();
  };
  addEventListener('scroll', leerScroll, { passive: true });
  if (mouse) addEventListener('pointermove', e => {
    objX = e.clientX / vw * 2 - 1; objY = e.clientY / vh * 2 - 1;
  }, { passive: true });

  // ---------------------------------------------------------- lienzos
  const cE = estrellas.getContext('2d'), cP = petalos.getContext('2d');
  let listaE = [], listaP = [];
  function medir() {
    medirCamara();
    for (const c of [estrellas, petalos]) { c.width = c.clientWidth * dpr; c.height = c.clientHeight * dpr; }
    const Wc = estrellas.width, Hc = estrellas.height;
    listaE = Array.from({ length: Math.round(Wc * Hc / (9000 * dpr * dpr)) }, () => ({
      x: azar(0, Wc), y: azar(0, Hc) * azar(.2, 1), r: azar(.5, 1.5) * dpr, f: azar(0, 6.3), v: azar(.6, 1.8)
    }));
    listaP = Array.from({ length: vw < 700 ? 10 : 22 }, () => nuevoPetalo(true));
    leerScroll();
    Object.assign(cam, obj); sucio = true;
  }
  function nuevoPetalo(inicio) {
    const Wc = petalos.width, Hc = petalos.height;
    return {
      x: inicio ? azar(0, Wc) : azar(Wc * .35, Wc * 1.1), y: inicio ? azar(-Hc * .1, Hc) : azar(-60, -10) * dpr,
      s: azar(4, 9) * dpr, vx: azar(-.55, -.2) * dpr, vy: azar(.35, .8) * dpr,
      a: azar(0, 6.3), va: azar(-.02, .02), fase: azar(0, 6.3),
      color: Math.random() < .5 ? '232, 150, 230' : '186, 150, 255', alfa: azar(.45, .85)
    };
  }

  // ---------------------------------------------------------- bucle (pausa con la pestaña oculta o el arcade abierto)
  let t = 0, previo = 0, lienzosVivos = true;
  function cuadro(ahora) {
    requestAnimationFrame(cuadro);
    if (document.hidden || document.body.classList.contains('bloqueado')) return;
    if (ahora - previo < 30) return;                 // ~33 fps bastan para el ambiente
    previo = ahora; t += .033;

    // cámara: se acerca a su objetivo con inercia
    let mueve = false;
    for (const c of ['x', 'y', 'z', 't', 'claro', 'tr', 'tg', 'tb']) {
      const d = obj[c] - cam[c];
      if (Math.abs(d) > (c === 'z' || c === 't' || c === 'claro' ? .0005 : .2)) { cam[c] += d * .085; mueve = true; } else cam[c] = obj[c];
    }
    mx += (objX - mx) * .06; my += (objY - my) * .06;
    if (mueve || sucio || Math.abs(objX - mx) > .002 || Math.abs(objY - my) > .002) {
      marco.style.transform = `translate3d(${cam.x.toFixed(1)}px, ${cam.y.toFixed(1)}px, 0) scale(${cam.z.toFixed(4)})`;
      const st = escena.style;
      st.setProperty('--p', p.toFixed(4));
      st.setProperty('--mx', mx.toFixed(4)); st.setProperty('--my', my.toFixed(4));
      st.setProperty('--claro', cam.claro.toFixed(3));
      st.setProperty('--tinte', `rgba(${cam.tr | 0}, ${cam.tg | 0}, ${cam.tb | 0}, ${cam.t.toFixed(3)})`);
      sucio = false;
    }

    // estrellas y pétalos solo en las vistas abiertas (inicio y cierre); detrás de los paneles no se dibujan
    const vivos = p < 1 || cam.claro > .05;
    if (vivos !== lienzosVivos) { lienzosVivos = vivos; estrellas.style.opacity = petalos.style.opacity = vivos ? '' : '0'; }
    if (!vivos) return;

    cE.clearRect(0, 0, estrellas.width, estrellas.height);
    for (const s of listaE) {
      const b = .35 + .65 * Math.max(0, Math.sin(t * s.v + s.f));
      const lado = Math.round(s.r * (.7 + b * .5)) * 2 || 2;       // estrellas como píxeles cuadrados
      cE.fillStyle = `rgba(225, 235, 255, ${b * .8})`;
      cE.fillRect(Math.round(s.x), Math.round(s.y), lado, lado);
    }

    const Wc = petalos.width, Hc = petalos.height, atenua = Math.max(1 - p * .45, cam.claro);
    cP.clearRect(0, 0, Wc, Hc);
    listaP.forEach((q, i) => {
      q.x += q.vx + Math.sin(t * 1.3 + q.fase) * .5 * dpr; q.y += q.vy; q.a += q.va;
      if (q.y > Hc + 20 || q.x < -30) { listaP[i] = nuevoPetalo(false); return; }
      // pétalo pixel art: bloque de 2 x 1 píxeles de 3 px que alterna horizontal y vertical al girar
      const px = 3 * dpr, x0 = Math.round(q.x / px) * px, y0 = Math.round(q.y / px) * px, gira = Math.sin(t * 2 + q.fase) > 0;
      cP.fillStyle = `rgba(${q.color}, ${q.alfa * atenua})`;
      cP.fillRect(x0, y0, px, px); cP.fillRect(x0 + (gira ? px : 0), y0 + (gira ? 0 : px), px, px);
    });
  }

  let anchoPrevio = innerWidth;                      // en móvil la barra del navegador dispara resize al hacer scroll
  addEventListener('resize', () => { if (innerWidth !== anchoPrevio) { anchoPrevio = innerWidth; medir(); } else { medirCamara(); leerScroll(); } });
  // las secciones cambian de alto al cargar imágenes y gráficos: recalcular las llaves
  addEventListener('load', () => { medirCamara(); leerScroll(); });
  new ResizeObserver(() => { medirCamara(); leerScroll(); }).observe(document.querySelector('main'));
  medir();
  requestAnimationFrame(cuadro);
})();

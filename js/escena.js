/* ==========================================================================
   Escena de fondo: planos con profundidad, estrellas que titilan y pétalos
   --p   avance del scroll dentro del inicio (0 a 1); lo consumen los planos en CSS
   --mx/--my  posición suavizada del puntero (-1 a 1), solo con mouse
   ========================================================================== */
(() => {
  const escena = document.getElementById('escena');
  if (!escena) return;
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mouse = matchMedia('(pointer: fine)').matches;
  const estrellas = document.getElementById('escena-estrellas');
  const petalos = document.getElementById('escena-petalos');
  if (quieto) { estrellas.remove(); petalos.remove(); return; }

  const dpr = Math.min(devicePixelRatio || 1, 2);
  const azar = (a, b) => a + Math.random() * (b - a);
  let p = 0, mx = 0, my = 0, objX = 0, objY = 0, sucio = true;

  // ---------------------------------------------------------- scroll y puntero
  const leerScroll = () => {
    const nuevo = Math.min(1, Math.max(0, scrollY / (innerHeight * .9)));
    if (nuevo !== p) { p = nuevo; sucio = true; }
  };
  addEventListener('scroll', leerScroll, { passive: true });
  if (mouse) addEventListener('pointermove', e => {
    objX = e.clientX / innerWidth * 2 - 1; objY = e.clientY / innerHeight * 2 - 1;
  }, { passive: true });

  // ---------------------------------------------------------- lienzos
  const cE = estrellas.getContext('2d'), cP = petalos.getContext('2d');
  let listaE = [], listaP = [];
  function medir() {
    for (const c of [estrellas, petalos]) { c.width = c.clientWidth * dpr; c.height = c.clientHeight * dpr; }
    const W = estrellas.width, H = estrellas.height;
    listaE = Array.from({ length: Math.round(W * H / (9000 * dpr * dpr)) }, () => ({
      x: azar(0, W), y: azar(0, H) * azar(.2, 1), r: azar(.5, 1.5) * dpr, f: azar(0, 6.3), v: azar(.6, 1.8)
    }));
    const n = innerWidth < 700 ? 10 : 22;
    listaP = Array.from({ length: n }, () => nuevoPetalo(true));
    leerScroll();
  }
  function nuevoPetalo(inicio) {
    const W = petalos.width, H = petalos.height;
    return {
      x: inicio ? azar(0, W) : azar(W * .35, W * 1.1), y: inicio ? azar(-H * .1, H) : azar(-60, -10) * dpr,
      s: azar(4, 9) * dpr, vx: azar(-.55, -.2) * dpr, vy: azar(.35, .8) * dpr,
      a: azar(0, 6.3), va: azar(-.02, .02), fase: azar(0, 6.3),
      color: Math.random() < .5 ? '232, 150, 230' : '186, 150, 255', alfa: azar(.45, .85)
    };
  }

  // ---------------------------------------------------------- bucle (pausa con la pestaña oculta o el arcade abierto)
  let t = 0, previo = 0;
  function cuadro(ahora) {
    requestAnimationFrame(cuadro);
    if (document.hidden || document.body.classList.contains('bloqueado')) return;
    if (ahora - previo < 30) return;                 // ~33 fps bastan para el ambiente
    previo = ahora; t += .033;

    mx += (objX - mx) * .06; my += (objY - my) * .06;
    if (sucio || Math.abs(objX - mx) > .002 || Math.abs(objY - my) > .002) {
      escena.style.setProperty('--p', p.toFixed(4));
      escena.style.setProperty('--mx', mx.toFixed(4));
      escena.style.setProperty('--my', my.toFixed(4));
      sucio = false;
    }

    cE.clearRect(0, 0, estrellas.width, estrellas.height);
    for (const s of listaE) {
      const b = .35 + .65 * Math.max(0, Math.sin(t * s.v + s.f));
      cE.fillStyle = `rgba(225, 235, 255, ${b * .8})`;
      cE.beginPath(); cE.arc(s.x, s.y, s.r * (.7 + b * .5), 0, 6.283); cE.fill();
    }

    const W = petalos.width, H = petalos.height, atenua = 1 - p * .45;
    cP.clearRect(0, 0, W, H);
    listaP.forEach((q, i) => {
      q.x += q.vx + Math.sin(t * 1.3 + q.fase) * .5 * dpr; q.y += q.vy; q.a += q.va;
      if (q.y > H + 20 || q.x < -30) { listaP[i] = nuevoPetalo(false); return; }
      cP.save(); cP.translate(q.x, q.y); cP.rotate(q.a); cP.scale(1, .45 + .35 * Math.sin(t * 2 + q.fase));
      cP.fillStyle = `rgba(${q.color}, ${q.alfa * atenua})`;
      cP.beginPath(); cP.ellipse(0, 0, q.s, q.s * .55, 0, 0, 6.283); cP.fill();
      cP.restore();
    });
  }

  let anchoPrevio = innerWidth;                      // en móvil la barra del navegador dispara resize al hacer scroll
  addEventListener('resize', () => { if (innerWidth !== anchoPrevio) { anchoPrevio = innerWidth; medir(); } else leerScroll(); });
  medir();
  requestAnimationFrame(cuadro);
})();

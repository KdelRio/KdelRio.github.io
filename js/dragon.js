/* ==========================================================================
   Dragón volador: el dragón del logo de Studios Conari vuela en el borde derecho
   mirando a la izquierda, sigue la altura del mouse aleteando para sostenerse y,
   al llegar al final de la página, aterriza en su nido junto a las crías y los huevos.
   Al tocarlo reacciona y lleva al inicio de la página.
   Hojas: dragon-alas.png (8 cuadros de aleteo del equipo + posado) y dragon-caras.png (9 reacciones).
   ========================================================================== */
(() => {
  const boton = document.getElementById('dragon');
  if (!boton) return;
  const sprite = boton.firstElementChild;
  const escena = document.querySelector('.nido-escena'), posada = document.getElementById('nido-posada');
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const conMouse = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const REAC = ['blink', 'heart', 'sparkle', 'surprised', 'wink', 'bashful', 'sleepy', 'dizzy', 'delighted'];
  const PREMIOS = ['heart', 'sparkle', 'delighted'];
  const ALETEO = [0, 1, 2, 3, 4, 5, 6, 7];     // ciclo completo de aleteo
  const BAMBOLEO = [1, 1, 0, -1, -2, -1, 0, 1];   // al bajar el ala el cuerpo sube
  const POSADO = 8;

  const tam = () => boton.offsetWidth;
  const hud = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hud')) || 58;
  const ancho = () => document.documentElement.clientWidth;                 // sin la barra de scroll
  const MARGEN = () => ancho() < 700 ? 16 : 48;                            // separación del borde derecho
  let x = ancho() - tam() - MARGEN(), y = innerHeight * .45, objY = null, t = 0, posado = false, reaccion = null;

  if (conMouse) addEventListener('pointermove', e => { objY = e.clientY - tam() / 2; }, { passive: true });

  function mostrar(cuadro, esReaccion) {
    sprite.classList.toggle('reaccion', esReaccion);
    sprite.style.backgroundPosition = `calc(var(--t) * ${-cuadro}) 0`;
  }

  function cuadro() {
    requestAnimationFrame(cuadro);
    if (document.hidden || document.body.classList.contains('bloqueado')) return;
    t++;
    const T = tam(), raizC = document.documentElement.classList;
    const final = raizC.contains("escenas") ? raizC.contains("escena-final") : scrollY + innerHeight >= document.documentElement.scrollHeight - 40;   // en modo escenas, al llegar a la última
    let tx, ty;
    if (final && posada) {                      // al final de la página: al nido
      const r = posada.getBoundingClientRect(); tx = r.left + (r.width - T) / 2; ty = r.bottom - T;
    } else {                                    // en vuelo: borde derecho, a la altura del mouse
      tx = ancho() - T - MARGEN();
      const alto = ancho() < 700 || objY === null ? innerHeight - T - 16 : objY;
      ty = Math.min(innerHeight - T - 8, Math.max(hud() + 8, alto));
    }
    const k = quieto ? 1 : final ? .07 : .09;
    x += (tx - x) * k; y += (ty - y) * k;
    const llego = final && Math.abs(tx - x) < 1.5 && Math.abs(ty - y) < 1.5;
    if (llego !== posado) { posado = llego; escena && escena.classList.toggle('llego', llego); }

    let bamboleo = 0;
    if (reaccion) mostrar(REAC.indexOf(reaccion), true);
    else if (posado) mostrar(POSADO, false);
    else if (quieto) mostrar(2, false);
    else { const f = Math.floor(t / 5) % 8; mostrar(ALETEO[f], false); bamboleo = BAMBOLEO[f] * T / 100; }
    boton.style.transform = `translate3d(${x.toFixed(1)}px, ${(y + bamboleo).toFixed(1)}px, 0)`;
  }

  // al tocarlo reacciona y vuelve al inicio; cuatro toques seguidos lo marean
  let timers = [], toques = 0, ultimo = 0;
  boton.addEventListener('click', () => {
    timers.forEach(clearTimeout); timers = [];
    const luego = (ms, r) => timers.push(setTimeout(() => { reaccion = r; }, ms));
    const ahora = Date.now();
    toques = ahora - ultimo < 1600 ? toques + 1 : 1; ultimo = ahora;
    if (toques >= 4) { toques = 0; reaccion = 'dizzy'; luego(1100, null); }
    else { reaccion = 'blink'; luego(120, PREMIOS[(toques - 1) % PREMIOS.length]); luego(700, null); }
    scrollTo({ top: 0, behavior: quieto ? 'auto' : 'smooth' });
  });

  mostrar(2, false);
  requestAnimationFrame(cuadro);
})();

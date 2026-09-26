/* ==========================================================================
   Mascota: un personaje que sigue el puntero con la mirada y reacciona al tocarlo.
   Versión sin React de page-mascot (https://github.com/nilbuild/page-mascot),
   MIT © 2026 Kamran Ahmed <https://kamran.fyi>. Personaje: raccoon, del mismo proyecto.

   Uso: <button data-mascota data-direcciones="…-directions.webp" data-reacciones="…-reactions.webp"
                data-nombre="mapache"></button>
   Cada hoja es una grilla de 3 × 3: nueve direcciones de la cabeza y nueve expresiones.
   ========================================================================== */
(() => {
  const DIRECCIONES = ['up-left', 'up', 'up-right', 'left', 'center', 'right', 'down-left', 'down', 'down-right'];
  const REACCIONES = ['blink', 'heart', 'sparkle', 'surprised', 'wink', 'bashful', 'sleepy', 'dizzy', 'delighted'];
  const HORARIO = ['right', 'down-right', 'down', 'down-left', 'left', 'up-left', 'up', 'up-right']; // atan2 con y hacia abajo
  const SECTOR = Math.PI * 2 / HORARIO.length, HISTERESIS = .12, ZONA_MUERTA = 70;
  const PREMIOS = ['heart', 'sparkle', 'delighted'];
  const PREMIO_MS = 120, FIN_MS = 560, APLASTE_MS = 420, MAREO_TRAS = 4, MAREO_VENTANA = 1600, MAREO_FIN = 1100;
  const APLASTE = [
    { transform: 'scale(1, 1)', easing: 'ease-in' },
    { transform: 'scale(1.10, 0.86)', offset: .18, easing: 'ease-out' },
    { transform: 'scale(0.95, 1.08)', offset: .45, easing: 'ease-in-out' },
    { transform: 'scale(1.03, 0.97)', offset: .72, easing: 'ease-in-out' },
    { transform: 'scale(1, 1)' },
  ];
  const celda = (el, i) => { el.style.backgroundPosition = `${(i % 3) * 50}% ${Math.floor(i / 3) * 50}%`; };
  const envolver = a => Math.atan2(Math.sin(a), Math.cos(a));
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const conMouse = matchMedia('(hover: hover) and (pointer: fine)').matches;

  document.querySelectorAll('[data-mascota]').forEach(boton => {
    const nombre = boton.dataset.nombre || 'mascota', arriba = boton.dataset.accion === 'arriba';
    boton.type = 'button';
    boton.setAttribute('aria-label', arriba ? 'Volver al inicio de la página' : `Tocar al ${nombre}`);
    if (arriba) boton.title = 'Volver arriba';
    boton.innerHTML = '<span class="mascota-cuerpo"><span class="mascota-capa"></span><span class="mascota-capa"></span></span>';
    const cuerpo = boton.firstElementChild, [dir, reac] = cuerpo.children;
    dir.style.backgroundImage = `url("${boton.dataset.direcciones}")`;
    reac.style.backgroundImage = `url("${boton.dataset.reacciones}")`;

    const mirar = d => celda(dir, DIRECCIONES.indexOf(d));
    const reaccionar = r => {
      celda(reac, REACCIONES.indexOf(r || 'blink'));
      reac.style.opacity = r ? 1 : 0; dir.style.opacity = r ? 0 : 1;
    };
    mirar('center'); reaccionar(null);

    // la mirada sigue al puntero (solo con mouse)
    if (conMouse) {
      let sector = -1, puntero = null;
      const apuntar = () => {
        if (!puntero) return;
        const caja = boton.getBoundingClientRect();
        const dx = puntero.x - (caja.left + caja.width / 2), dy = puntero.y - (caja.top + caja.height / 2);
        if (Math.hypot(dx, dy) < ZONA_MUERTA) { sector = -1; mirar('center'); return; }
        // mantiene el sector actual hasta que el puntero pasa bien su borde
        const ang = Math.atan2(dy, dx);
        if (sector !== -1 && Math.abs(envolver(ang - sector * SECTOR)) < SECTOR / 2 + HISTERESIS) return;
        sector = (Math.round(ang / SECTOR) + HORARIO.length) % HORARIO.length;
        mirar(HORARIO[sector]);
      };
      addEventListener('pointermove', e => { puntero = { x: e.clientX, y: e.clientY }; apuntar(); }, { passive: true });
      addEventListener('scroll', apuntar, { passive: true });
    }

    // al tocarlo parpadea y responde; cuatro toques seguidos lo marean
    let timers = [], toques = 0, ultimo = 0;
    boton.addEventListener('click', () => {
      timers.forEach(clearTimeout); timers = [];
      const luego = (ms, r) => timers.push(setTimeout(() => reaccionar(r), ms));
      const ahora = Date.now();
      toques = ahora - ultimo < MAREO_VENTANA ? toques + 1 : 1; ultimo = ahora;
      if (toques >= MAREO_TRAS) { toques = 0; reaccionar('dizzy'); luego(MAREO_FIN, null); }
      else { reaccionar('blink'); luego(PREMIO_MS, PREMIOS[(toques - 1) % PREMIOS.length]); luego(FIN_MS, null); }
      if (!quieto) cuerpo.animate(APLASTE, { duration: APLASTE_MS, easing: 'linear' });
      // data-accion="arriba": además de reaccionar, lleva al inicio de la página
      if (arriba) scrollTo({ top: 0, behavior: quieto ? 'auto' : 'smooth' });
    });
  });
})();

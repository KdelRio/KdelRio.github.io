/* ==========================================================================
   Arena del Dato en la página clásica (Torre del Dato): eliges especialidad,
   juegas las 3 oleadas y debajo aparece el informe de jugabilidad con tus datos.
   Usa el mismo motor (KRCrearBatalla) y el mismo informe (KRInforme) que el arcade.
   ========================================================================== */
(function () {
  'use strict';
  const caja = document.getElementById('arena-clasica');
  if (!caja || !window.KRCrearBatalla || !window.KR_HABILIDADES || !window.KRInforme) return;
  const { RAMAS, ESPECIALIDADES, bonos } = KR_HABILIDADES;
  const cv = document.getElementById('arena-canvas'), elegir = caja.querySelector('.arena-elegir'), juego = caja.querySelector('.arena-juego');
  const rotulo = document.getElementById('arena-rotulo'), informe = document.getElementById('arena-informe');
  const batalla = KRCrearBatalla(cv);
  let esp = null, visible = false;

  // el análisis de Magic Foods aparece cuando ya recolectaste datos en una pelea (aquí o en el modo arcade)
  const magic = document.getElementById('magic-bloque');
  const extra = () => (window.KR ? KR.estado().extra : {});
  function mostrarMagic() { if (magic) magic.hidden = false; }
  if (extra().magic) mostrarMagic();

  document.getElementById('arena-especialidades').innerHTML = RAMAS.map((r, i) =>
    `<button type="button" class="esp-carta" data-esp="${i}"><span class="esp-ico" aria-hidden="true">${r.ico}</span><b>${r.nombre}</b><span class="esp-hab">✦ ${ESPECIALIDADES[i].hab}</span><small>${ESPECIALIDADES[i].desc}</small></button>`).join('');

  function iniciar() {
    informe.hidden = true;
    batalla.iniciar(terminar, { bonos: bonos(esp, RAMAS[esp].nodos.length) });   // rama completa: habilidad al nivel 3
    cv.focus({ preventScroll: true });
  }
  function jugar(i) {
    esp = i;
    rotulo.innerHTML = `${RAMAS[i].ico} ${RAMAS[i].nombre} · <b>✦ ${ESPECIALIDADES[i].hab}</b>, nivel 3`;
    elegir.hidden = true; juego.hidden = false;
    iniciar();
    window.KR && KR.beep([[523, .06], [659, .06], [784, .1]]);
  }
  function cambiar() {
    batalla.pausar(); informe.hidden = true; juego.hidden = true; elegir.hidden = false;
    caja.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function terminar(T) {
    batalla.pausar();
    const gano = T.resultado === 'victoria';
    if (window.KR) { extra().magic = true; KR.guardar(); }
    mostrarMagic();
    window.KR && KR.sumarXP(gano ? 40 : 15, gano ? 'Arena del Dato superada' : 'Datos de combate registrados');
    informe.hidden = false;
    KRInforme.construir(informe, T, {
      clasico: true, infinito: false, puntos: 0,
      alMagic: () => window.KREscenas ? KREscenas.irA('magic') : document.getElementById('magic-foods').scrollIntoView({ behavior: 'smooth', block: 'start' }),
      alReintentar: () => { iniciar(); caja.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
      alContinuar: cambiar,
    });
    informe.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  caja.addEventListener('click', e => {
    const b = e.target.closest('[data-esp]'); if (b) jugar(+b.dataset.esp);
    if (e.target.closest('#arena-cambiar')) cambiar();
  });

  // fuera de pantalla la arena se detiene; al volver sigue dibujando sin robar el foco
  new IntersectionObserver(en => {
    visible = en[0].isIntersecting;
    if (juego.hidden || !informe.hidden) return;
    if (visible) batalla.reanudar(true); else batalla.pausar();
  }, { threshold: .15 }).observe(cv);

  // controles táctiles: envían las mismas teclas al canvas
  caja.querySelectorAll('.arena-tactil [data-tecla]').forEach(bt => {
    const k = bt.dataset.tecla;
    const enviar = tipo => cv.dispatchEvent(new KeyboardEvent(tipo, { key: k, bubbles: true }));
    bt.addEventListener('pointerdown', e => { e.preventDefault(); if (batalla.estado === 'intro') { cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); return; } enviar('keydown'); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => bt.addEventListener(t, () => enviar('keyup')));
  });
})();

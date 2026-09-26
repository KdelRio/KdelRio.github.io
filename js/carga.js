/* ==========================================================================
   Pantalla de carga del portafolio clásico: el dragón vuela y las crías esperan
   mientras se descargan y decodifican el fondo, los sprites y las fuentes.
   Así, al mostrarse la página, el primer movimiento ya es fluido.
   KRCarga.esperar() -> promesa que se resuelve cuando todo está listo.
   ========================================================================== */
(() => {
  const capa = document.getElementById('carga');
  if (!capa) return;
  const barra = capa.querySelector('.carga-relleno'), texto = capa.querySelector('.carga-texto');
  const EXTRA = ['assets/img/mascota/dragon-vuela.png', 'assets/img/mascota/dragon-caras.png'];
  let listo = null;

  function cargarTodo() {
    if (listo) return listo;
    const imgs = [...document.querySelectorAll('.escena img, .nido-escena img')];
    const tareas = imgs.map(i => i.decode ? i.decode().catch(() => {}) : Promise.resolve())
      .concat(EXTRA.map(src => { const i = new Image(); i.src = src; return i.decode().catch(() => {}); }))
      .concat(document.fonts ? [document.fonts.ready] : []);
    let hechas = 0;
    const avance = () => { hechas++; barra.style.transform = `scaleX(${hechas / tareas.length})`; };
    tareas.forEach(t => t.then(avance));
    const minimo = new Promise(r => setTimeout(r, 900));               // que alcance a verse el dragón, sin parpadeos
    const tope = new Promise(r => setTimeout(r, 8000));                // con mala conexión no espera para siempre
    listo = Promise.race([Promise.all([...tareas, minimo]), tope]);
    return listo;
  }

  async function esperar() {
    capa.hidden = false; capa.classList.remove('sale');
    texto.textContent = 'CARGANDO EL REINO';
    await cargarTodo();
    texto.textContent = '¡LISTO!';
    barra.style.transform = 'scaleX(1)';
    await new Promise(r => setTimeout(r, 250));
  }
  function ocultar() {
    capa.classList.add('sale');
    setTimeout(() => { capa.hidden = true; }, 400);
  }
  window.KRCarga = { esperar, ocultar, precargar: cargarTodo };
})();

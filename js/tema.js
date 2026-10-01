/* ==========================================================================
   Tema claro / oscuro: el valle de día o de noche y la paleta de la página.
   El atributo data-tema de <html> se fija en el <head> (sin parpadeo); aquí vive el botón
   sol/luna del menú y la carga diferida de las capas de día (solo si alguien las usa).
   ========================================================================== */
(() => {
  const raiz = document.documentElement, boton = document.getElementById('btn-tema');
  const cargarDia = () => document.querySelectorAll('.capa-dia[data-dia]').forEach(i => { i.src = i.dataset.dia; i.removeAttribute('data-dia'); });
  function aplicar(tema, guardar) {
    raiz.dataset.tema = tema;
    if (tema === 'claro') cargarDia();
    if (boton) {
      const claro = tema === 'claro';
      boton.setAttribute('aria-pressed', claro);
      boton.setAttribute('aria-label', claro ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro');
      boton.querySelector('img').src = `assets/img/pixel/i-${claro ? 'luna' : 'sol'}.png`;
    }
    if (guardar) try { localStorage.setItem('kr-tema', tema); } catch (e) { /* sin almacenamiento */ }
  }
  aplicar(raiz.dataset.tema === 'claro' ? 'claro' : 'oscuro', false);
  if (boton) boton.addEventListener('click', () => aplicar(raiz.dataset.tema === 'claro' ? 'oscuro' : 'claro', true));
  // si el visitante no eligió, sigue los cambios del sistema
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', e => {
    let elegido = null; try { elegido = localStorage.getItem('kr-tema'); } catch (x) { /* nada */ }
    if (!elegido) aplicar(e.matches ? 'claro' : 'oscuro', false);
  });
  window.KRTema = { aplicar };
})();

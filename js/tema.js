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
  // ---------------------------------------------------------- lienzos de juego de la página en tema claro
  // Los juegos dibujan con colores nocturnos fijos. diaEn(ctx) intercepta fillStyle/strokeStyle y los
  // degradados de ese lienzo: con tema claro, cada fondo oscuro pasa a pergamino y cada texto claro a
  // su versión oscura. El mundo pixel art (mapas, sprites) no se toca: se dibuja en otro búfer.
  const DIA = {
    '#0b1733': '#e3efff', '#1a0f33': '#fff0d4', '#0d1a36': '#fffaf0', '#05101f': '#fffaf0',
    'rgba(5,14,29,.78)': 'rgba(255,250,240,.9)', 'rgba(5,14,29,.75)': 'rgba(255,250,240,.88)',
    'rgba(4,10,22,.8)': 'rgba(255,250,240,.86)', 'rgba(4,10,22,.6)': 'rgba(255,250,240,.86)', 'rgba(4,10,22,.55)': 'rgba(255,250,240,.84)',
    'rgba(13,33,68,.8)': 'rgba(255,250,240,.95)', 'rgba(0,0,0,.5)': 'rgba(23,33,58,.15)', 'rgba(0,0,0,.6)': 'rgba(23,33,58,.2)',
    'rgba(255,255,255,.035)': 'rgba(23,33,58,.05)', 'rgba(255,255,255,.08)': 'rgba(23,33,58,.14)', 'rgba(255,255,255,.1)': 'rgba(23,33,58,.12)',
    'rgba(255,255,255,.14)': 'rgba(23,33,58,.16)', 'rgba(255,255,255,.2)': 'rgba(23,33,58,.22)', 'rgba(255,255,255,.6)': 'rgba(23,33,58,.5)',
    'rgba(167,139,250,.10)': 'rgba(106,79,198,.12)',
    '#f3d27f': '#a86a00', '#fcdf6b': '#a86a00', '#ffd400': '#b46f00', '#e0b756': '#c98a00', '#cad6e5': '#34415d', '#8fa3bd': '#5b6884',
    '#f4f7fd': '#17213a', '#e6eefc': '#17213a', '#fff': '#17213a', '#9dffc0': '#1f7a43', '#6bd49a': '#1f8a4c', '#7ec8ff': '#1c6db8',
    '#f87171': '#c0362b', '#f472b6': '#c03f86',
  };
  const norm = c => typeof c === 'string' ? c.replace(/\s+/g, '').toLowerCase().replace(/,0\./g, ',.') : c;
  function diaEn(ctx) {
    const cv = ctx.canvas;
    if (cv.closest('.maquina')) return;                          // la máquina arcade siempre es nocturna
    const activo = () => raiz.dataset.tema === 'claro';
    const proto = CanvasRenderingContext2D.prototype;
    ['fillStyle', 'strokeStyle'].forEach(p => {
      const d = Object.getOwnPropertyDescriptor(proto, p);
      Object.defineProperty(ctx, p, { configurable: true, get() { return d.get.call(this); }, set(v) { d.set.call(this, activo() ? (DIA[norm(v)] || v) : v); } });
    });
    const grad = ctx.createLinearGradient.bind(ctx);
    ctx.createLinearGradient = (...a) => { const g = grad(...a), add = g.addColorStop.bind(g); g.addColorStop = (o, c) => add(o, activo() ? (DIA[norm(c)] || c) : c); return g; };
  }
  window.KRTema = { aplicar, diaEn };
})();

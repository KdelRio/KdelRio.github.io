/* ==========================================================================
   Núcleo: experiencia, niveles, logros, avisos y navegación
   ========================================================================== */
(function () {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  const LOGROS = [
    { id: 'start', ico: '🎮', nombre: 'Press Start', desc: 'Comienza la aventura.', xp: 50 },
    { id: 'pasos', ico: '👣', nombre: 'Primeros pasos', desc: 'Mueve al personaje por la aldea del modo arcade.', xp: 50 },
    { id: 'explorador', ico: '🗺️', nombre: 'Explorador del reino', desc: 'Visita las seis zonas del portafolio.', xp: 150 },
    { id: 'filtro', ico: '🔍', nombre: 'Filtro en mano', desc: 'Usa un filtro del laboratorio de análisis.', xp: 75 },
    { id: 'analista', ico: '📊', nombre: 'Analista certificado', desc: 'Responde correctamente las tres preguntas del desafío.', xp: 200 },
    { id: 'bilingue', ico: '⚖️', nombre: 'Bilingüe en BI', desc: 'Compara un dashboard entre Power BI y Tableau.', xp: 100 },
    { id: 'mazmorra', ico: '👑', nombre: 'Cazador de reyes', desc: 'Derrota al Rey Slime en la Mini Mazmorra.', xp: 250 },
    { id: 'ritmo', ico: '🎵', nombre: 'Maestro del ritmo', desc: 'Termina Ritmo Resonancia con 70% de precisión o más.', xp: 250 },
    { id: 'gremio', ico: '🌳', nombre: 'Maestro del gremio', desc: 'Desbloquea todas las habilidades del árbol.', xp: 200 },
    { id: 'cv', ico: '📜', nombre: 'Pergamino obtenido', desc: 'Descarga el CV.', xp: 100 },
    { id: 'contacto', ico: '🕊️', nombre: 'Mensajero', desc: 'Abre uno de los canales de contacto.', xp: 75 },
    { id: 'konami', ico: '🐉', nombre: 'Código ancestral', desc: 'Descubre el código secreto.', xp: 150 },
  ];
  const ZONAS = ['estudio', 'datos', 'arcade', 'gremio', 'cv', 'contacto'];
  const XP_ZONA = 25, XP_NIVEL = 250;
  const TITULOS = ['Aprendiz', 'Explorador', 'Artesano', 'Analista', 'Arquitecto', 'Maestro', 'Leyenda'];

  // ---------------------------------------------------------- estado persistente
  const CLAVE = 'kr-portafolio-v1';
  let estado = { xp: 0, logros: [], zonas: [], extra: {} };
  try { const g = JSON.parse(localStorage.getItem(CLAVE)); if (g) estado = Object.assign(estado, g); } catch (e) { /* almacenamiento no disponible */ }
  const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch (e) { /* sin persistencia */ } };

  // ---------------------------------------------------------- sonido mínimo (Web Audio)
  let actx = null;
  function beep(notas) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      let t = actx.currentTime;
      notas.forEach(([f, d]) => {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = 'square'; o.frequency.value = f; g.gain.setValueAtTime(.06, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
        o.connect(g).connect(actx.destination); o.start(t); o.stop(t + d); t += d * .8;
      });
    } catch (e) { /* audio no disponible */ }
  }

  // ---------------------------------------------------------- HUD
  const nivelDe = xp => Math.floor(xp / XP_NIVEL) + 1;
  function pintarHUD() {
    const nv = nivelDe(estado.xp), dentro = estado.xp % XP_NIVEL;
    $('#hud-nivel').textContent = nv;
    $('#hud-xp').style.width = (dentro / XP_NIVEL * 100) + '%';
    $('#hud-xp-texto').textContent = `${estado.xp} XP · ${TITULOS[Math.min(nv - 1, TITULOS.length - 1)]}`;
    $('#hud-logros').textContent = estado.logros.length;
    $('#hud-logros-total').textContent = LOGROS.length;
  }

  function toast(ico, titulo, sub) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `<span class="ico">${ico}</span><div><b></b><small></small></div>`;
    t.querySelector('b').textContent = titulo; t.querySelector('small').textContent = sub;
    $('#toasts').appendChild(t);
    setTimeout(() => { t.classList.add('saliendo'); setTimeout(() => t.remove(), 400); }, 3600);
  }

  function sumarXP(n, motivo) {
    const antes = nivelDe(estado.xp);
    estado.xp += n; guardar(); pintarHUD();
    const despues = nivelDe(estado.xp);
    if (despues > antes) {
      toast('⭐', `¡Subiste a nivel ${despues}!`, TITULOS[Math.min(despues - 1, TITULOS.length - 1)].toUpperCase());
      beep([[523, .12], [659, .12], [784, .12], [1047, .25]]);
    } else if (motivo) {
      toast('✨', motivo, `+${n} XP`);
    }
  }

  function desbloquear(id) {
    if (estado.logros.includes(id)) return false;
    const l = LOGROS.find(x => x.id === id); if (!l) return false;
    estado.logros.push(id); guardar();
    toast(l.ico, `Logro: ${l.nombre}`, `+${l.xp} XP`);
    beep([[784, .1], [988, .1], [1319, .22]]);
    const b = $('#btn-logros'); b.classList.remove('pulso'); void b.offsetWidth; b.classList.add('pulso');
    sumarXP(l.xp);
    pintarLogros();
    return true;
  }

  function visitarZona(z) {
    if (!ZONAS.includes(z) || estado.zonas.includes(z)) return;
    estado.zonas.push(z); guardar();
    sumarXP(XP_ZONA, `Zona descubierta: ${nombreZona(z)}`);
    if (ZONAS.every(x => estado.zonas.includes(x))) desbloquear('explorador');
  }
  const nombreZona = z => ({ estudio: 'Castillo Conari', datos: 'Torre del Dato', arcade: 'Arcade del Dragón', gremio: 'Gremio', cv: 'Biblioteca', contacto: 'Buzón' }[z]);

  function pintarLogros() {
    const ul = $('#lista-logros'); ul.innerHTML = '';
    LOGROS.forEach(l => {
      const li = document.createElement('li');
      if (estado.logros.includes(l.id)) li.className = 'hecho';
      li.innerHTML = `<span class="ico">${l.ico}</span><div><b></b><small></small></div><span class="xp">+${l.xp} XP</span>`;
      li.querySelector('b').textContent = l.nombre; li.querySelector('small').textContent = l.desc;
      ul.appendChild(li);
    });
  }

  // ---------------------------------------------------------- modal de logros
  const modal = $('#modal-logros');
  const abrirLogros = () => { pintarLogros(); modal.hidden = false; $('#cerrar-logros').focus(); };
  const cerrarLogros = () => { modal.hidden = true; $('#btn-logros').focus(); };
  $('#btn-logros').addEventListener('click', abrirLogros);
  $('#cerrar-logros').addEventListener('click', cerrarLogros);
  modal.addEventListener('click', e => { if (e.target === modal) cerrarLogros(); });
  $('#reiniciar-progreso').addEventListener('click', () => {
    if (!confirm('¿Reiniciar tu experiencia y logros?')) return;
    estado = { xp: 0, logros: [], zonas: [], extra: {} }; guardar(); pintarHUD(); pintarLogros();
  });

  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) cerrarLogros(); });

  // ---------------------------------------------------------- rol rotativo tipo máquina de escribir
  const ROLES = ['Business Intelligence, Power BI y Tableau', 'Lead Programmer en Godot Engine', 'Análisis de datos y toma de decisiones', 'Socio fundador de Studios Conari SpA', 'Modelos de datos, ETL, DAX y SQL'];
  const elRol = $('#rol-rotativo');
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let ri = 0, ci = ROLES[0].length, borrando = true;
    setInterval(() => {
      const txt = ROLES[ri];
      if (borrando) { ci--; if (ci <= 0) { borrando = false; ri = (ri + 1) % ROLES.length; } }
      else { ci++; if (ci >= ROLES[ri].length + 14) borrando = true; }
      elRol.textContent = ROLES[ri].slice(0, Math.max(0, Math.min(ci, ROLES[ri].length)));
    }, 70);
  }

  // ---------------------------------------------------------- zonas visitadas, navegación activa y aparición
  const io = new IntersectionObserver(entradas => {
    entradas.forEach(en => {
      if (!en.isIntersecting) return;
      const z = en.target.dataset.zona;
      if (z) { visitarZona(z); $$('.hud-nav a').forEach(a => a.classList.toggle('activo', a.getAttribute('href') === '#' + z)); }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('.zona').forEach(s => io.observe(s));
  const ioRev = new IntersectionObserver(entradas => entradas.forEach(en => { if (en.isIntersecting) { en.target.classList.add('visible'); ioRev.unobserve(en.target); } }), { threshold: .12 });
  $$('.panel, .disciplinas li, .titulo, .subtitulo').forEach(el => { el.classList.add('revelar'); ioRev.observe(el); });

  // ---------------------------------------------------------- enlaces con logro
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-logro]');
    if (a) desbloquear(a.dataset.logro);
    const img = e.target.closest('.galeria-mini img, .carrusel img');
    if (img) {
      const v = document.createElement('div'); v.className = 'visor';
      v.innerHTML = `<img src="${img.src}" alt="">`; v.addEventListener('click', () => v.remove());
      document.body.appendChild(v);
    }
  });

  // ---------------------------------------------------------- código Konami
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let kp = 0;
  document.addEventListener('keydown', e => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    kp = (k === KONAMI[kp]) ? kp + 1 : (k === KONAMI[0] ? 1 : 0);
    if (kp === KONAMI.length) {
      kp = 0;
      if (desbloquear('konami')) document.body.animate([{ filter: 'hue-rotate(0)' }, { filter: 'hue-rotate(360deg)' }], { duration: 1600 });
    }
  });

  pintarHUD();
  window.KR = { sumarXP, desbloquear, visitarZona, toast, beep, estado: () => estado, guardar };
})();

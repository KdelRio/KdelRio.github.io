/* ==========================================================================
   Modo arcade: pantalla INSERT COIN, revelación del gabinete y recorrido por
   misiones (castillo → torre → arcade → gremio → biblioteca → contacto).
   Coordina KRAldea (plataformas), KRBatalla + KRInforme (datos) y el ritmo.
   ========================================================================== */
(function () {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s), $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const maquina = $('#maquina'); if (!maquina || !window.KRAldea) return;
  const gab = $('#gabinete'), pantalla = $('#pantalla'), capa = $('#capa-panel');
  const CV = { portada: $('#portada-canvas'), aldea: $('#aldea-canvas'), batalla: $('#batalla-canvas'), ritmo: $('#ritmo-arcade-canvas') };
  const RAMAS = window.KR_HABILIDADES ? KR_HABILIDADES.RAMAS : [];
  const clave = (r, n) => r.nombre + '·' + n[0];
  // especialidades, bonos por rama y cálculo de estadísticas: compartidos con la arena de la página clásica (gremio.js)
  const { BONO_RAMA, ESPECIALIDADES } = window.KR_HABILIDADES;
  const ramaDe = p => (p.esp === null || p.esp === undefined) ? null : RAMAS[p.esp];
  const aprendidas = p => { const r = ramaDe(p); return r ? r.nodos.filter(nd => p.arbol.includes(clave(r, nd))).length : 0; };
  const ramaCompleta = p => { const r = ramaDe(p); return !!r && aprendidas(p) >= r.nodos.length; };
  const nivelEsp = p => ramaDe(p) ? KR_HABILIDADES.nivel(p.esp, aprendidas(p)) : 0;
  function bonos() {
    const p = prog();
    return KR_HABILIDADES.bonos(ramaDe(p) ? p.esp : -1, aprendidas(p));
  }
  function resumenBonos() {
    const b = bonos(), e = ESPECIALIDADES[b.esp];
    return `${e ? `<p class="esp-linea">✦ <b>${e.hab}</b>, nivel ${b.nivel} de 3</p>` : ''}<ul class="stats-juego"><li>⚔️ Ataque <b>${b.ataque.toFixed(2).replace('.', ',')}</b></li><li>❤️ Vida <b>${b.vidaMax}</b></li><li>⚡ Energía <b>${b.energiaMax}</b></li><li>💨 Cadencia <b>${b.cd}</b></li><li>🛡️ Bloqueo <b>${Math.round(b.bloqueo * 100)}%</b></li><li>✚ Curación <b>${Math.round(b.cura * 100)}%${b.regenVida ? ' + regen.' : ''}</b></li></ul>`;
  }

  // ---------------------------------------------------------- progreso de la partida (persistente)
  function prog() {
    const e = KR.estado().extra;
    if (!e.arcade) e.arcade = { v: 2, etapa: 0, ph: 0, esp: null, fragmentos: [false, false, false], arbol: [], x: 44, premios: {} };
    const p = e.arcade;
    // partidas guardadas con el árbol anterior (31 habilidades): se elige especialidad y se aprende una habilidad por misión cumplida
    if (p.v !== 2) { p.v = 2; p.esp = null; p.arbol = []; p.ph = Math.min(p.etapa, 3); }
    return p;
  }
  const MISIONES = [
    { titulo: 'MISIÓN 1/5 · CASTILLO CONARI', texto: p => { const n = p.fragmentos.filter(Boolean).length; return n < 3 ? `Recupera los fragmentos del emblema Conari (${n}/3)` : 'Entra al Castillo Conari: pulsa E en el portón'; } },
    { titulo: 'MISIÓN 2/5 · TORRE DEL DATO', texto: () => 'Entra a la torre y supera las 3 oleadas de la Arena del Dato' },
    { titulo: 'MISIÓN 3/5 · ARCADE DEL DRAGÓN', texto: () => 'Entra al arcade: completa el Memorize y Ritmo Resonancia' },
    { titulo: 'MISIÓN 4/5 · GREMIO', texto: p => { const r = ramaDe(p); return r ? `Entra al Gremio o presiona H y domina tu especialidad (${aprendidas(p)}/${r.nodos.length})` : 'Entra al Gremio'; } },
    { titulo: 'MISIÓN 5/5 · BIBLIOTECA', texto: () => 'Presiona P para abrir la hoja de personaje' },
  ];

  // ---------------------------------------------------------- estado general
  let fase = 'cerrada', actual = null, panelTipo = null, pausaDe = null, ritmo = null, ritmoPausado = false;
  const flotante = document.createElement('div'); flotante.className = 'flotante'; flotante.hidden = true; pantalla.appendChild(flotante);

  function mostrar(nombre) {
    actual = nombre;
    Object.entries(CV).forEach(([k, c]) => { c.hidden = k !== nombre; });
    capa.hidden = true; capa.innerHTML = ''; capa.onclick = null; panelTipo = null; flotante.hidden = true;
    if (nombre === 'aldea') KRAldea.activar(); else KRAldea.pausar();
    if (nombre !== 'batalla') KRBatalla.pausar();
    if (nombre !== 'ritmo' && ritmo) ritmo.detener();
    if (nombre === 'ritmo') { ritmoPausado = false; ritmo.arrancar(); }
    if (nombre === 'portada') arrancarPortada();
    CV[nombre].focus({ preventScroll: true });
  }
  // los paneles se arman sobre un lienzo virtual de 1400 px de ancho y se reducen a la pantalla real,
  // así su densidad es la de una pantalla de juego y no la de una página web (las diapositivas ya usan cqw)
  const ANCHO_VIRTUAL = 1400;
  function escalarPanel() {
    const st = capa.style;
    if (capa.querySelector('.dia')) { st.width = st.height = st.transform = st.transformOrigin = st.right = st.bottom = ''; return; }
    const z = pantalla.clientWidth / ANCHO_VIRTUAL;
    st.width = ANCHO_VIRTUAL + 'px'; st.height = (pantalla.clientHeight / z) + 'px'; st.right = st.bottom = 'auto';
    st.transform = `scale(${z.toFixed(4)})`; st.transformOrigin = '0 0';
  }
  addEventListener('resize', () => { if (!capa.hidden) escalarPanel(); });
  function panel(tipo, html) {
    KRAldea.pausar(); KRBatalla.pausar();
    flotante.hidden = true;                                   // un aviso flotante (p. ej. fin de canción) no queda encima del panel
    panelTipo = tipo; capa.onclick = null; navDia = null; capa.className = 'capa-panel panel-' + tipo; capa.innerHTML = html; capa.hidden = false; capa.scrollTop = 0;
    escalarPanel();
    const b = capa.querySelector('button'); b && b.focus({ preventScroll: true });
  }
  // ---------------------------------------------------------- diapositivas: se deslizan a la derecha, con puntos abajo
  // (amarillo = actual, gris = las demás). ← → / A D, palanca, flechas en pantalla, puntos o deslizar el dedo.
  let navDia = null;
  function diapositivas(tipo, hojas, alTerminar) {
    panel(tipo, `<div class="dia" role="region" aria-roledescription="carrusel">
      <div class="dia-ventana"><div class="dia-pista">${hojas.map((h, i) => `<section class="dia-hoja" aria-label="Diapositiva ${i + 1} de ${hojas.length}">${h}</section>`).join('')}</div></div>
      <button type="button" class="dia-flecha dia-izq" aria-label="Anterior">◀</button><button type="button" class="dia-flecha dia-der" aria-label="Siguiente">▶</button>
      <div class="dia-puntos">${hojas.map((_, i) => `<button type="button" class="dia-punto" data-i="${i}" aria-label="Ir a la diapositiva ${i + 1}"></button>`).join('')}</div>
      <p class="dia-ayuda"><span>← →</span> para avanzar</p></div>`);
    const pista = capa.querySelector('.dia-pista'), puntos = [...capa.querySelectorAll('.dia-punto')];
    let i = 0;
    const ir = n => {
      if (n >= hojas.length || n < 0) return;                      // en la última se sale con "Continuar" o Enter
      i = Math.max(0, n);
      pista.style.transform = `translateX(${-i * 100}%)`;
      puntos.forEach((p, j) => { p.classList.toggle('activo', j === i); p.setAttribute('aria-current', j === i ? 'true' : 'false'); });
      capa.querySelector('.dia-izq').disabled = i === 0;
      capa.querySelector('.dia-der').classList.toggle('dia-fin', i === hojas.length - 1);
      KR.beep([[587, .03]]);
    };
    navDia = d => ir(i + d);
    capa.querySelector('.dia-izq').onclick = () => ir(i - 1);
    capa.querySelector('.dia-der').onclick = () => ir(i + 1);
    puntos.forEach(p => p.onclick = () => ir(+p.dataset.i));
    let x0 = null;
    pista.addEventListener('pointerdown', e => { x0 = e.clientX; });
    pista.addEventListener('pointerup', e => { if (x0 !== null && Math.abs(e.clientX - x0) > 40) ir(i + (e.clientX < x0 ? 1 : -1)); x0 = null; });
    ir(0);
    return capa;
  }
  function limpiarClon(n) { n.querySelectorAll('.revelar').forEach(x => x.classList.remove('revelar')); n.classList.remove('revelar'); return n; }
  let pendiente = null;                                     // barrera a abrir al volver (misión completada en un panel)
  function volverAldea(barrera) {
    if (barrera === undefined && pendiente !== null) barrera = pendiente;
    pendiente = null;
    const p = prog();
    if (p.etapa >= 1 && !ramaDe(p)) return elegirEspecialidad(() => volverAldea(barrera));     // tras la misión 1
    if (p.ph > 0 && ramaDe(p) && !ramaCompleta(p)) return subirPendientes(() => volverAldea(barrera));   // cada misión enseña una habilidad
    mostrar('aldea');
    if (barrera !== undefined) setTimeout(() => { KRAldea.abrirBarrera(barrera); KRAldea.avisar('¡Misión completada! La barrera mágica se abrió', 200); }, 350);
  }
  function completar(i, puntos, zona) {
    const p = prog();
    if (!p.premios[i]) { p.premios[i] = true; p.ph += puntos; }
    if (p.etapa === i) p.etapa = i + 1;
    KR.guardar(); KR.visitarZona(zona);
  }

  // ---------------------------------------------------------- enlaces con la aldea
  KRAldea.al.hud = () => {
    if (actual === 'aldea' && revisarArbol()) {             // árbol completo: abrir la barrera en el acto
      pendiente = null; KRAldea.abrirBarrera(3); KRAldea.avisar('¡Árbol completo! La barrera hacia la Biblioteca se abrió', 220);
    }
    const p = prog(), m = MISIONES[p.etapa];
    return m ? { titulo: m.titulo, mision: m.texto(p), ph: p.ph } : { titulo: `AVENTURA COMPLETADA · RÉCORD ${p.record || 0} OLEADAS`, mision: 'Entra a la Torre del Dato para jugar oleadas infinitas · P: hoja de personaje', ph: p.ph };
  };
  KRAldea.al.hecho = id => ['estudio', 'datos', 'arcade', 'gremio', 'cv'].indexOf(id) < prog().etapa;
  KRAldea.al.fragmento = arr => {
    const p = prog(); p.fragmentos = arr; KR.guardar();
    const n = arr.filter(Boolean).length;
    KRAldea.avisar(n < 3 ? `Fragmento del emblema recuperado (${n}/3)` : '¡Emblema completo! Vuelve al portón del Castillo Conari', 180);
  };
  KRAldea.al.entrar = id => {
    const p = prog(); p.x = KRAldea.x; KR.guardar();
    if (id === 'estudio') {
      const n = p.fragmentos.filter(Boolean).length;
      if (n < 3) return KRAldea.avisar(`El portón está sellado: faltan ${3 - n} fragmento(s) del emblema`, 180);
      return abrirEstudio();
    }
    if (id === 'datos') return iniciarBatalla(p.etapa >= 5);
    if (id === 'arcade') return abrirMemoria();
    if (id === 'gremio') return abrirArbol();
    if (id === 'cv') return abrirFicha();
  };
  KRAldea.al.tecla = k => {
    const p = prog(); p.x = KRAldea.x;
    if (k === 'h') return ramaDe(p) ? abrirArbol() : KRAldea.avisar('Elegirás tu especialidad al cumplir la misión 1', 170);
    if (k === 'p') return p.etapa >= 4 ? abrirFicha() : KRAldea.avisar('La hoja de personaje espera en la Biblioteca (misión 5)', 170);
  };

  // ---------------------------------------------------------- misión 1: Studios Conari
  function abrirEstudio() {
    const roles = [...document.querySelectorAll('#estudio .rol')].map(r => ({ ico: r.querySelector('img').getAttribute('src'), t: r.querySelector('h4').textContent, d: r.querySelector('p').textContent }));
    const disc = [...document.querySelectorAll('#estudio .disciplinas li')].map(li => ({ ico: li.querySelector('img').getAttribute('src'), t: li.querySelector('b').textContent }));
    const lema = document.querySelector('#estudio .estudio-lema').textContent, desc = document.querySelector('#estudio .estudio-marca > p:not(.estudio-lema)').textContent;
    diapositivas('estudio', [
      `<div class="dia-centro"><p class="pn-kicker">Misión 1 · Castillo Conari</p>
        <img class="dia-logo" src="assets/img/conari-wordmark.png" alt="Studios Conari">
        <p class="dia-lema">${lema}</p><p class="pn-logro">✓ Emblema restaurado · +1 punto de habilidad</p></div>`,
      `<div class="dia-centro dia-angosto"><h2 class="dia-h">El estudio</h2><p class="dia-p">${desc}</p>
        <div class="fila-botones centro"><a class="btn btn-oro" href="https://studiosconari.github.io/" target="_blank" rel="noopener">Sitio oficial</a>
        <a class="btn btn-linea" href="https://github.com/StudiosConari" target="_blank" rel="noopener">GitHub del estudio</a></div></div>`,
      `<h2 class="dia-h">Mi rol en el estudio</h2><div class="dia-roles">${roles.map(r => `<article class="dia-rol"><img src="${r.ico}" alt=""><h3>${r.t}</h3><p>${r.d}</p></article>`).join('')}</div>`,
      `<h2 class="dia-h">Nuestras disciplinas</h2><ul class="dia-disc">${disc.map(d => `<li><img src="${d.ico}" alt=""><b>${d.t}</b></li>`).join('')}</ul>
        <div class="fila-botones centro"><button type="button" class="btn btn-oro" data-seguir>Continuar la aventura ▶</button></div>`,
    ], () => volverAldea());
    if (prog().etapa === 0) pendiente = 0;
    completar(0, 1, 'estudio');
    capa.querySelector('[data-seguir]').onclick = () => volverAldea();
  }

  // ---------------------------------------------------------- misión 2: Arena del Dato + informe
  function iniciarBatalla(infinito) {
    mostrar('batalla');
    const p = prog();
    KRBatalla.iniciar(T => {
      const gano = T.resultado === 'victoria', derrotas = T.eventos.filter(e => e.tipo === 'derrota').length;
      KR.estado().extra.magic = true; KR.guardar(); const mb = $('#magic-bloque'); if (mb) mb.hidden = false;   // datos recolectados: se abre Magic Foods
      let puntos = 0, nuevo = false;
      if (infinito) {
        nuevo = T.olasSuperadas > (p.record || 0); if (nuevo) p.record = T.olasSuperadas; KR.guardar();
        KR.sumarXP(10 + T.olasSuperadas * 10, nuevo ? `Nuevo récord: ${T.olasSuperadas} oleadas superadas` : `Oleadas infinitas: ${T.olasSuperadas} superadas`);
      } else {
        if (!p.premios[1]) { puntos = 1; if (p.etapa === 1) pendiente = 1; completar(1, puntos, 'datos'); }
        else { puntos = gano && !ramaCompleta(p) ? 1 : 0; p.ph += puntos; KR.guardar(); }
        KR.sumarXP(gano ? 40 : 15, gano ? 'Arena del Dato superada' : 'Datos de combate registrados');
      }
      panel('informe', '');
      KRInforme.construir(capa, T, {
        puntos, infinito, record: p.record || 0, nuevo,
        alMagic: () => window.open('?clasico#datos', '_blank', 'noopener'),
        alContinuar: () => volverAldea(),
        alReintentar: () => iniciarBatalla(infinito),
      });
    }, { bonos: bonos(), infinito, record: p.record || 0 });
  }

  // ---------------------------------------------------------- misión 3: memorize + ritmo
  // el memorize de habilidades vive en js/memoria.js y se comparte con el salón de la página clásica
  function abrirMemoria() {
    panel('memoria', `<div class="pn pn-memoria">
      <div class="pn-cab"><div><p class="pn-kicker">Misión 3 · Arcade del Dragón</p><h2 class="pn-titulo">Memorize de habilidades</h2></div></div>
      <p class="pn-texto">Encuentra los pares de las disciplinas de Kevin para desbloquear Ritmo Resonancia.</p>
      <div class="mem" data-memoria></div></div>`);
    KRMemoria.montar(capa.querySelector('[data-memoria]'), {
      alCompletar: (mov, info) => {
        const p = prog(); if (!p.premios.memoria) { p.premios.memoria = true; p.ph += 1; KR.guardar(); }
        KR.desbloquear('memoria');
        info.innerHTML = `<p class="mem-par"><b>Memorize completado en ${mov} movimientos.</b> +1 punto de habilidad. Ahora, al ritmo de Proyecto Resonancia.</p>
          <div class="fila-botones centro"><button type="button" class="btn btn-oro" data-ritmo>Siguiente: Ritmo Resonancia ▶</button></div>`;
        const bt = info.querySelector('[data-ritmo]'); bt.onclick = iniciarRitmo; bt.focus({ preventScroll: true });
      }
    });
  }
  function iniciarRitmo() {
    if (!ritmo) ritmo = KRCrearRitmo(CV.ritmo, {
      activo: () => actual === 'ritmo' && !ritmoPausado && !maquina.hidden,
      alTerminar: st => {
        if (prog().etapa === 2) pendiente = 2;
        completar(2, 0, 'arcade');
        flotante.innerHTML = `<p><b>¡Canción completada!</b> Precisión ${Math.round(st.precision * 100)}% · ${st.puntos} puntos</p><div class="fila-botones centro"><button type="button" class="btn btn-oro" data-seguir>Continuar la aventura ▶</button></div>`;
        flotante.hidden = false;
        flotante.querySelector('[data-seguir]').onclick = () => volverAldea();
      },
    });
    mostrar('ritmo');
  }

  // ---------------------------------------------------------- especialidad: elección, subidas y misión 4
  const estrellas = n => '★'.repeat(n) + '☆'.repeat(5 - n);
  const tarjetaHabilidad = (nd, i) => `<div class="hab-carta"><b>${nd[0]}</b> <span class="hab-estrellas" aria-label="Dominio ${nd[1]} de 5">${estrellas(nd[1])}</span><p>${nd[2]}</p><p class="bono">${BONO_RAMA[i].ico} En combate: ${BONO_RAMA[i].txt}</p></div>`;
  function elegirEspecialidad(despues) {
    panel('especialidad', `<div class="pn pn-esp">
      <p class="pn-kicker">Tu camino en el reino</p><h2 class="pn-titulo">Elige tu especialidad</h2>
      <p class="pn-texto">Cada especialidad es una rama del árbol de Kevin y trae una habilidad de combate propia. Cada misión que cumplas te enseñará una habilidad nueva de esa rama.</p>
      <div class="esp-grilla">${RAMAS.map((r, i) => `<button type="button" class="esp-carta" data-esp="${i}"><span class="esp-ico" aria-hidden="true">${r.ico}</span><b>${r.nombre}</b><span class="esp-hab">✦ ${ESPECIALIDADES[i].hab}</span><small>${ESPECIALIDADES[i].desc}</small></button>`).join('')}</div></div>`);
    capa.onclick = ev => {
      const b = ev.target.closest('[data-esp]'); if (!b) return;
      const p = prog(); p.esp = +b.dataset.esp; p.arbol = []; KR.guardar(); KR.beep([[523, .06], [659, .06], [784, .1]]);
      despues();
    };
  }
  function aprender(p) {
    const r = ramaDe(p), nd = r && r.nodos.find(x => !p.arbol.includes(clave(r, x)));
    if (nd) p.arbol.push(clave(r, nd));
    return nd || null;
  }
  function subirPendientes(despues) {                        // la habilidad nueva se muestra sola, en una tarjeta que se lee en segundos
    const p = prog(), antes = nivelEsp(p), nuevas = [];
    while (p.ph > 0 && !ramaCompleta(p)) { nuevas.push(aprender(p)); p.ph--; }
    if (ramaCompleta(p)) p.ph = 0;
    KR.guardar();
    if (!nuevas.length) return despues();
    KR.sumarXP(10 * nuevas.length);
    const r = ramaDe(p), e = ESPECIALIDADES[p.esp], ahora = nivelEsp(p);
    panel('subida', `<div class="pn pn-subida">
      <p class="pn-kicker">${r.ico} ${r.nombre} · ${aprendidas(p)} de ${r.nodos.length}</p>
      <h2 class="pn-titulo">${nuevas.length > 1 ? 'Nuevas habilidades' : 'Nueva habilidad'}</h2>
      ${nuevas.map(nd => tarjetaHabilidad(nd, p.esp)).join('')}
      ${ahora > antes ? `<p class="subida-nivel">✦ <b>${e.hab}</b> ${antes ? 'sube a' : 'desbloqueada:'} nivel ${ahora}, ${e.niveles[ahora - 1]}.${antes ? '' : ` ${e.desc}`}</p>` : ''}
      <div class="fila-botones centro"><button type="button" class="btn btn-oro" data-seguir>Continuar ▶</button></div></div>`);
    KR.beep([[523, .05], [784, .09]]);
    capa.querySelector('[data-seguir]').onclick = despues;
  }
  function revisarArbol() {                                  // la misión 4 se cumple al dominar la rama de tu especialidad
    const p = prog();
    if (p.etapa !== 3 || !ramaCompleta(p)) return false;
    completar(3, 0, 'gremio'); pendiente = 3;
    const extra = KR.estado().extra, r = ramaDe(p);
    extra.habilidades = [...new Set([...(extra.habilidades || []), ...r.nodos.map(nd => clave(r, nd))])]; KR.guardar();
    return true;
  }
  function abrirArbol(aviso) {
    const p = prog(), r = ramaDe(p);
    if (!r) return elegirEspecialidad(() => abrirArbol());
    // al llegar al Gremio recibes los puntos justos para terminar tu rama
    if (p.etapa === 3 && !p.premios.gremio) { p.premios.gremio = true; p.ph += r.nodos.length - aprendidas(p); KR.guardar(); }
    const e = ESPECIALIDADES[p.esp], lvl = nivelEsp(p), completa = ramaCompleta(p);
    const sig = r.nodos.findIndex(nd => !p.arbol.includes(clave(r, nd)));
    const filas = r.nodos.map((nd, j) => {
      const hecho = p.arbol.includes(clave(r, nd)), esSig = j === sig;
      return `<li class="hab-fila ${hecho ? 'hecha' : esSig ? 'sig' : 'bloq'}"><span class="hab-estado" aria-hidden="true">${hecho ? '✓' : esSig ? '+' : '·'}</span>
        <div><b>${nd[0]}</b> <span class="hab-estrellas" aria-label="Dominio ${nd[1]} de 5">${estrellas(nd[1])}</span>${hecho || esSig ? `<p>${nd[2]}</p>` : ''}</div>
        ${esSig ? (p.ph > 0 ? '<button type="button" class="btn btn-oro btn-mini" data-aprender>Aprender (1 PH)</button>' : '<button type="button" class="btn btn-linea btn-mini" data-entrenar>Ganar PH en la arena</button>') : ''}</li>`;
    }).join('');
    panel('arbol', `<div class="pn pn-rama">
      <div class="pn-cab"><div><p class="pn-kicker">${p.etapa === 3 ? 'Misión 4 · Gremio' : 'Tu especialidad'}</p><h2 class="pn-titulo">${r.ico} ${r.nombre}</h2></div>
        <div class="arbol-marcador"><span class="ph">PH <b>${p.ph}</b></span><span>${aprendidas(p)}/${r.nodos.length}</span><button type="button" class="btn btn-mini" data-cerrar>Cerrar (H)</button></div></div>
      ${aviso ? `<p class="subida-nivel" aria-live="polite">${aviso}</p>` : ''}
      ${completa ? '<div class="rama-dominada"><p><b>Rama dominada.</b> Tu especialidad está al máximo.</p><button type="button" class="btn btn-oro" data-seguir>Continuar la aventura ▶</button></div>' : ''}
      <div class="rama-grid"><ol class="hab-lista">${filas}</ol>
        <aside class="esp-caja"><p class="esp-hab">✦ ${e.hab}</p><p>${e.desc}</p>
          <ol class="esp-niveles">${e.niveles.map((t, k) => `<li class="${k < lvl ? 'activo' : ''}">Nivel ${k + 1}: ${t}</li>`).join('')}</ol>
          <p class="bono">${BONO_RAMA[p.esp].ico} Cada habilidad: ${BONO_RAMA[p.esp].txt}</p>
          ${resumenBonos()}
        </aside></div></div>`);
    capa.onclick = ev => {
      if (ev.target.closest('[data-cerrar]') || ev.target.closest('[data-seguir]')) { revisarArbol(); volverAldea(); return; }
      if (ev.target.closest('[data-entrenar]')) { iniciarBatalla(false); return; }
      if (ev.target.closest('[data-aprender]')) {
        const antes = nivelEsp(p), nd = aprender(p); if (!nd) return;
        p.ph--; KR.guardar(); KR.sumarXP(10); KR.beep([[523, .05], [784, .09]]);
        const ahora = nivelEsp(p);
        if (ramaCompleta(p)) KR.beep([[523, .1], [659, .1], [784, .1], [1047, .3]]);
        revisarArbol();
        abrirArbol(`Aprendiste <b>${nd[0]}</b>.${ahora > antes ? ` ✦ ${e.hab} sube a nivel ${ahora}: ${e.niveles[ahora - 1]}.` : ''}`);
      }
    };
  }

  // ---------------------------------------------------------- misión 5: hoja de personaje y final
  function abrirFicha() {
    const cv = $('#cv'), txt = sel => (cv.querySelector(sel) || {}).textContent || '';
    const exp = [...cv.querySelectorAll('.linea-tiempo li')].map(li => ({ f: li.querySelector('.fecha').textContent, t: li.querySelector('h4').textContent, l: li.querySelector('.lugar').textContent, d: li.querySelector('p:not(.lugar)').textContent }));
    const logros = [...cv.querySelectorAll('.logros-cv > div')].map(d => ({ t: d.querySelector('b').textContent, s: d.querySelector('span').textContent }));
    const certs = [...cv.querySelectorAll('.cert-duoc li')].map(li => li.textContent);
    const attrs = (KR_HABILIDADES.ATRIBUTOS || []);
    const experiencia = (lista) => `<ol class="dia-exp">${lista.map(e => `<li><span class="dia-fecha">${e.f}</span><h3>${e.t}</h3><p class="dia-lugar">${e.l}</p><p>${e.d}</p></li>`).join('')}</ol>`;
    diapositivas('ficha', [
      `<div class="dia-perfil"><div class="dia-centro">
          <p class="pn-kicker">Misión 5 · Biblioteca</p>
          <img class="dia-avatar" src="assets/img/logo-estrella.png" alt="">
          <h2 class="dia-h">${txt('.ficha h3')}</h2><p class="dia-clase">${txt('.ficha-clase')}</p>
          <p class="dia-p">${txt('.ficha-origen')}</p><p class="dia-p">${txt('.ficha-idiomas')}</p>
          <a class="btn btn-oro" href="assets/CV_Kevin_del_Rio.pdf" download data-logro="cv">Descargar CV</a></div>
        <ul class="dia-attrs">${attrs.map(([n, v]) => `<li><span>${n}</span><b>${v}</b><i><em style="width:${v}%"></em></i></li>`).join('')}</ul></div>`,
      `<h2 class="dia-h">Misiones completadas</h2>${experiencia(exp.slice(0, 2))}`,
      `<h2 class="dia-h">Misiones anteriores</h2>${experiencia(exp.slice(2))}`,
      `<h2 class="dia-h">Logros y formación</h2>
        <div class="dia-logros">${logros.map(l => `<div><b>${l.t}</b><span>${l.s}</span></div>`).join('')}</div>
        <p class="dia-sub">Certificaciones de especialidad Duoc UC</p>
        <ul class="dia-chips">${certs.map(c => `<li>${c}</li>`).join('')}</ul>`,
      `<div class="dia-centro"><p class="fin-titulo grande">FIN DEL JUEGO</p><p class="dia-p">Completaste las cinco misiones del reino de Kevin del Río.</p>
        <button type="button" class="btn btn-oro" data-conversar>¿Conversamos? ▶</button></div>`,
    ]);
    completar(4, 0, 'cv');
    capa.querySelector('[data-conversar]').onclick = abrirFinal;
  }
  function abrirFinal() {
    const p = prog();
    panel('final', `<div class="pn pn-final">
      <p class="fin-titulo grande">FIN DEL JUEGO</p>
      <p class="fin-stats"><span>Misiones <b>5/5</b></span><span>Especialidad <b>${ramaDe(p) ? ESPECIALIDADES[p.esp].hab + ' nv. ' + nivelEsp(p) : '-'}</b></span><span>Experiencia <b>${KR.estado().xp} XP</b></span><span>Récord <b>${p.record || 0} oleadas</b></span></p>
      <div class="fin-infinito"><p><b>Desbloqueaste las oleadas infinitas.</b> Lleva tus habilidades al límite y descubre hasta dónde llegas.</p><button type="button" class="btn btn-oro" data-infinito>∞ Jugar oleadas infinitas</button></div>
      <h2 class="pn-titulo">¿Conversamos?</h2>
      <p class="pn-texto">Disponible para proyectos de análisis de datos, Business Intelligence y desarrollo de videojuegos.</p>
      <div class="pn-contenido"></div>
      <div class="fila-botones centro"><button type="button" class="btn btn-oro" data-clasico>Ver el portafolio completo</button><button type="button" class="btn btn-linea" data-aldea>Volver a la aldea</button><button type="button" class="btn btn-linea" data-nueva>Nueva partida</button></div>
      <p class="pn-creditos">Gracias por jugar · Kevin del Río · Studios Conari SpA · 2026</p></div>`);
    capa.querySelector('.pn-contenido').append(limpiarClon($('#contacto .contactos').cloneNode(true)));
    KR.visitarZona('contacto');
    capa.querySelector('[data-clasico]').onclick = cerrarMaquina;
    capa.querySelector('[data-aldea]').onclick = () => volverAldea();
    capa.querySelector('[data-nueva]').onclick = nuevaPartida;
    capa.querySelector('[data-infinito]').onclick = () => iniciarBatalla(true);
  }

  // ---------------------------------------------------------- pausa
  function nuevaPartida() {
    KR.estado().extra.arcade = null; KR.guardar();
    const p = prog(); KRAldea.fijar({ etapa: 0, fragmentos: p.fragmentos, x: 44 }); mostrar('aldea');
  }
  function abrirPausa() {
    pausaDe = actual;
    if (actual === 'ritmo' && ritmo) { ritmo.detener(); ritmoPausado = true; }
    panel('pausa', `<div class="pn pn-pausa"><p class="fin-titulo">PAUSA</p>
      <div class="pausa-botones"><button type="button" class="btn btn-oro" data-continuar>Continuar</button>
      ${prog().etapa >= 5 ? '<button type="button" class="btn btn-linea" data-infinito>∞ Oleadas infinitas</button>' : ''}
      ${pausaDe !== 'aldea' ? '<button type="button" class="btn btn-linea" data-aldea>Volver a la aldea</button>' : ''}
      <button type="button" class="btn btn-linea" data-nueva>Reiniciar partida</button>
      <button type="button" class="btn btn-linea" data-clasico>Ir al portafolio clásico</button></div>
      <p class="pn-texto">Controles: A/D o flechas para moverte · Espacio para saltar o atacar · E para hablar o entrar · K o B: onda de energía en la arena · H especialidad · P hoja de personaje</p></div>`);
    capa.onclick = e => {
      if (e.target.closest('[data-continuar]')) continuar();
      if (e.target.closest('[data-aldea]')) volverAldea();
      if (e.target.closest('[data-infinito]')) iniciarBatalla(true);
      if (e.target.closest('[data-nueva]') && confirm('¿Reiniciar la partida desde la misión 1?')) nuevaPartida();
      if (e.target.closest('[data-clasico]')) cerrarMaquina();
    };
  }
  function continuar() {
    capa.hidden = true; capa.innerHTML = ''; panelTipo = null;
    if (pausaDe === 'batalla') { KRBatalla.reanudar(); }
    else if (pausaDe === 'ritmo') { ritmoPausado = false; ritmo.arrancar(); CV.ritmo.focus({ preventScroll: true }); }
    else mostrar(pausaDe || 'aldea');
  }
  function escape() {
    if (panelTipo === 'pausa') return continuar();
    if (panelTipo === 'informe') return;
    if (panelTipo) return volverAldea();
    if (['aldea', 'batalla', 'ritmo'].includes(actual)) abrirPausa();
  }

  // ---------------------------------------------------------- pantalla INSERT COIN
  const pc = CV.portada.getContext('2d'), PW = CV.portada.width, PH = CV.portada.height;
  const logo = new Image(); logo.src = 'assets/img/conari-wordmark.png';
  const ESTRELLAS = Array.from({ length: 140 }, () => ({ x: Math.random() * PW, y: Math.random() * PH, v: .2 + Math.random() * 1.3, b: Math.random() }));
  let tp = 0, creditos = 0, arranque = 0, rechazo = 0, rafP = 0, destino = 'interactivo', opcion = 0;
  const OPCIONES = [['1', 'PORTAFOLIO INTERACTIVO', 'interactivo'], ['2', 'PORTAFOLIO CLÁSICO', 'clasico']];
  const monedas = [];
  function txt(t, x, y, tam, col, brillo) {
    pc.font = `${tam}px "Press Start 2P", monospace`; pc.textAlign = 'center'; pc.textBaseline = 'middle';
    if (brillo) { pc.shadowColor = col; pc.shadowBlur = brillo; }
    pc.fillStyle = col; pc.fillText(t, x, y); pc.shadowBlur = 0;
  }
  function dibujarPortada() {
    tp++;
    pc.fillStyle = '#02050d'; pc.fillRect(0, 0, PW, PH);
    ESTRELLAS.forEach(s => { s.y += s.v * .45; if (s.y > PH) { s.y = 0; s.x = Math.random() * PW; } pc.fillStyle = `rgba(200,215,255,${.25 + s.b * .75})`; const z = s.v > 1.1 ? 2 : 1; pc.fillRect(s.x | 0, s.y | 0, z, z); });
    txt('1UP', 110, 36, 14, '#f87171'); txt('00000', 110, 60, 14, '#f4f7fd');
    txt('HI-SCORE', PW / 2, 36, 14, '#f87171'); txt('KEVIN DEL RIO', PW / 2, 60, 14, '#f4f7fd');
    txt('2UP', PW - 110, 36, 14, '#f87171'); txt('00000', PW - 110, 60, 14, '#f4f7fd');
    if (logo.complete && logo.naturalWidth) { const w = 300, h = w * logo.naturalHeight / logo.naturalWidth; pc.globalAlpha = .95; pc.drawImage(logo, PW / 2 - w / 2, 100, w, h); pc.globalAlpha = 1; }
    const sacude = rechazo > 0 ? Math.sin(rechazo * 1.7) * 8 : 0; if (rechazo > 0) rechazo--;
    if (arranque > 0) {
      arranque--;
      const eleg = OPCIONES.find(o => o[2] === destino);
      if ((arranque >> 3) % 2) txt(destino === 'clasico' ? 'CARGANDO...' : 'PLAYER 1 START', PW / 2, 318, 34, '#ffd400', 18);
      txt(eleg[1], PW / 2, 372, 14, '#e6eefc');
      if (arranque === 0) acercar();
    } else if (creditos === 0) {
      if ((tp >> 5) % 2 === 0 || rechazo > 0) txt('INSERT COIN', PW / 2 + sacude, 318, 46, '#ffd400', 22);
      txt('PRESIONA  F  PARA METER UNA FICHA', PW / 2, 392, 15, '#e6eefc');
    } else {
      // con ficha: dos cuadros para elegir (← → y ENTER, o tocar el cuadro)
      CUADROS.forEach((c, i) => cuadroOpcion(c, i === opcion));
      txt('← →  ELEGIR   ·   ENTER  CONFIRMAR', PW / 2, 470, 11, '#8fa3bd');
    }
    for (let i = monedas.length - 1; i >= 0; i--) {                         // ficha cayendo
      const m = monedas[i]; m.t++; const y = -20 + m.t * m.t * .5, ancho = Math.abs(Math.cos(m.t * .35)) * 16 + 3;
      pc.fillStyle = '#e0b756'; pc.beginPath(); pc.ellipse(PW / 2, y, ancho, 18, 0, 0, 7); pc.fill();
      pc.fillStyle = '#fff1a8'; pc.beginPath(); pc.ellipse(PW / 2, y, ancho * .55, 11, 0, 0, 7); pc.fill();
      if (y > 300) { monedas.splice(i, 1); creditos = Math.min(9, creditos + 1); KR.beep([[988, .05], [1319, .16]]); }
    }
    txt(`CREDITS ${creditos}`, PW - 130, PH - 34, 13, '#f4f7fd');
    txt('© 2026 STUDIOS CONARI', PW / 2, PH - 34, 10, '#8fa3bd');
  }
  // ---------------------------------------------------------- cuadros de selección en pixel art
  const CUADROS = [{ x: PW / 2 - 330, y: 284, w: 300, h: 162, nombre: 'INTERACTIVO', sub: 'MODO ARCADE', ico: 'control' },
                   { x: PW / 2 + 30, y: 284, w: 300, h: 162, nombre: 'CLÁSICO', sub: 'PORTAFOLIO WEB', ico: 'hoja' }];
  const B = (x, y, w, h, c) => { pc.fillStyle = c; pc.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  function marco(x, y, w, h, u, borde, fondo) {            // rectángulo con esquinas escalonadas de 2 peldaños
    B(x + 2 * u, y, w - 4 * u, h, borde); B(x + u, y + u, w - 2 * u, h - 2 * u, borde); B(x, y + 2 * u, w, h - 4 * u, borde);
    B(x + 3 * u, y + u, w - 6 * u, h - 2 * u, fondo); B(x + 2 * u, y + 2 * u, w - 4 * u, h - 4 * u, fondo); B(x + u, y + 3 * u, w - 2 * u, h - 6 * u, fondo);
  }
  function icono(tipo, cx, cy, c, sombra) {
    const u = 4;                                                                  // cada "píxel" del ícono mide 4 px
    const pinta = (filas, col) => filas.forEach((f, j) => [...f].forEach((ch, i) => { if (ch !== '.') B(cx + (i - f.length / 2) * u, cy + (j - filas.length / 2) * u, u, u, ch === 'o' ? sombra : col); }));
    if (tipo === 'control') pinta([
      '..#########..',
      '.###########.',
      '##.#######oo#',
      '#...#####o##o',
      '##.#######oo#',
      '#############',
      '###.......###',
      '.##.......##.'], c);
    else pinta([
      '#######...',
      '#.....##..',
      '#.ooo.#.#.',
      '#.....####',
      '#.oooooo.#',
      '#........#',
      '#.oooooo.#',
      '#........#',
      '#.oooo...#',
      '##########'], c);
  }
  function cuadroOpcion(c, sel) {
    const late = sel && (tp >> 4) % 2 === 0, u = 5;
    if (sel) B(c.x + 8, c.y + 8, c.w, c.h, 'rgba(255,212,0,.18)');                // sombra dura dorada
    marco(c.x, c.y, c.w, c.h, u, sel ? (late ? '#fff1a8' : '#ffd400') : '#3a4668', sel ? '#1a1a08' : '#0b1020');
    marco(c.x + 3 * u, c.y + 3 * u, c.w - 6 * u, c.h - 6 * u, u, sel ? '#9a7a2c' : '#1d2440', sel ? '#221f0a' : '#0d1428');
    icono(c.ico, c.x + c.w / 2, c.y + 54, sel ? '#ffd400' : '#6b7ba0', sel ? '#fff1a8' : '#3a4668');
    txt(c.nombre, c.x + c.w / 2, c.y + 98, 18, sel ? '#ffd400' : '#cad6e5', sel ? 8 : 0);
    txt(c.sub, c.x + c.w / 2, c.y + 122, 9, sel ? '#f3d27f' : '#6b7ba0');
    if (sel && (tp >> 4) % 2 === 0) { txt('▼', c.x + c.w / 2, c.y - 16, 16, '#ffd400'); }
  }
  function bucleP() { dibujarPortada(); rafP = (actual === 'portada' && !maquina.hidden) ? requestAnimationFrame(bucleP) : 0; }
  function arrancarPortada() { if (!rafP) rafP = requestAnimationFrame(bucleP); }
  function meterFicha() { if (arranque) return; monedas.push({ t: 0 }); KR.beep([[660, .03]]); }
  function elegir(i) { if (arranque || !creditos || opcion === i) return; opcion = i; KR.beep([[660, .03]]); }
  function pulsarStart(eleccion = opcion) {
    if (arranque || fase !== 'attract') return;
    if (creditos === 0 && !monedas.length) { rechazo = 30; KR.beep([[150, .15]]); return; }
    if (creditos === 0) return;
    destino = OPCIONES[eleccion][2];
    creditos--; arranque = 100; KR.beep([[523, .08], [659, .08], [784, .08], [1047, .08], [1319, .25]]);
  }

  // ---------------------------------------------------------- gabinete: se ve completo con INSERT COIN y, al empezar,
  // la cámara se acerca hasta que la pantalla llena la ventana. En pantallas táctiles no se acerca:
  // la cruz y los botones del gabinete son los controles del juego.
  const tactil = matchMedia('(pointer: coarse)').matches;
  function enfocar(animado) {
    gab.style.transition = 'none'; gab.style.transform = 'none';
    const g = gab.getBoundingClientRect(), s = pantalla.getBoundingClientRect();
    const k = Math.min(innerWidth / s.width, innerHeight / s.height);
    const cx = s.left + s.width / 2 - g.left, cy = s.top + s.height / 2 - g.top;
    void gab.offsetWidth;
    if (animado) gab.style.transition = 'transform 1.6s cubic-bezier(.65,.02,.2,1)';
    gab.style.transform = `translate(${innerWidth / 2 - g.left - k * cx}px, ${innerHeight / 2 - g.top - k * cy}px) scale(${k})`;
  }
  function acercar() {
    fase = 'acercando';
    if (tactil) { if (destino === 'clasico') return cerrarMaquina(); fase = 'juego'; iniciarJuego(); return; }
    maquina.classList.add('enfocada'); enfocar(true);
    setTimeout(() => {
      if (destino === 'clasico') { pantalla.classList.add('encendido'); setTimeout(() => { pantalla.classList.remove('encendido'); cerrarMaquina(); }, 450); return; }
      fase = 'juego'; iniciarJuego();
    }, 1650);
  }
  function iniciarJuego() {
    KR.desbloquear('start');
    revisarArbol(); pendiente = null;
    const p = prog(); KRAldea.fijar({ etapa: p.etapa, fragmentos: p.fragmentos, x: p.x });
    pantalla.classList.add('encendido'); setTimeout(() => pantalla.classList.remove('encendido'), 700);
    volverAldea();                                          // pide la especialidad si una partida guardada aún no la tiene
    if (p.etapa === 0 && !p.fragmentos.some(Boolean)) KRAldea.avisar('Habla con Lumi, la guía, para comenzar tu aventura', 240);
  }
  function abrirMaquina() {
    maquina.hidden = false; document.body.classList.add('bloqueado');
    fase = 'attract'; arranque = 0;
    maquina.classList.remove('enfocada'); gab.style.transition = 'none'; gab.style.transform = 'none';   // primero, el gabinete completo
    mostrar('portada');
  }
  function cerrarMaquina() {
    if (actual === 'aldea') { prog().x = KRAldea.x; KR.guardar(); }
    KRAldea.pausar(); KRBatalla.pausar(); if (ritmo) ritmo.detener();
    capa.hidden = true; panelTipo = null;
    maquina.hidden = true; document.body.classList.remove('bloqueado'); fase = 'cerrada';
    maquina.classList.remove('enfocada'); gab.style.transition = 'none'; gab.style.transform = 'none';
  }
  addEventListener('resize', () => { if (maquina.classList.contains('enfocada')) enfocar(false); });   // mantiene el acercamiento al cambiar el tamaño

  // ---------------------------------------------------------- teclado global y controles del gabinete
  const botonDe = k => $$('[data-tecla]', maquina).find(b => b.dataset.tecla.toLowerCase() === k);
  document.addEventListener('keydown', e => {
    if (maquina.hidden) return;
    const k = e.key.toLowerCase(), b = botonDe(k); if (b) b.classList.add('pulsado');
    if (fase === 'attract') {
      if (k === 'f') { e.preventDefault(); meterFicha(); }
      else if (k === 'enter' || k === ' ') { e.preventDefault(); pulsarStart(); }
      else if (['arrowleft', 'arrowup', 'a', 'w'].includes(k)) { e.preventDefault(); elegir(0); }
      else if (['arrowright', 'arrowdown', 'd', 's'].includes(k)) { e.preventDefault(); elegir(1); }
      else if (k === 'c') { e.preventDefault(); if (creditos) pulsarStart(1); }        // atajo al clásico
      return;
    }
    if (fase !== 'juego') return;
    if (k === 'escape') { e.preventDefault(); escape(); return; }
    if (navDia && !capa.hidden) {
      if (['arrowright', 'd'].includes(k)) { e.preventDefault(); navDia(1); return; }
      if (['arrowleft', 'a'].includes(k)) { e.preventDefault(); navDia(-1); return; }
      if (k === 'enter' && capa.querySelector('.dia-punto:last-child.activo')) { e.preventDefault(); const c = capa.querySelector('.dia-hoja:last-child [data-seguir], .dia-hoja:last-child [data-conversar]'); c && c.click(); return; }
    }
    if (e.target.classList && e.target.classList.contains('capa-juego')) return;
    if ((panelTipo === 'arbol' && k === 'h') || (panelTipo === 'ficha' && k === 'p')) { e.preventDefault(); volverAldea(); }
  });
  document.addEventListener('keyup', e => { const b = !maquina.hidden && botonDe(e.key.toLowerCase()); if (b) b.classList.remove('pulsado'); });
  $$('[data-tecla]', maquina).forEach(b => {
    const k = b.dataset.tecla;
    const destino = () => (fase === 'juego' && capa.hidden && CV[actual]) ? CV[actual] : document;
    const disparar = tipo => destino().dispatchEvent(new KeyboardEvent(tipo, { key: k, bubbles: true }));
    b.addEventListener('pointerdown', e => { e.preventDefault(); b.classList.add('pulsado'); disparar('keydown'); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, () => { if (b.classList.contains('pulsado')) { b.classList.remove('pulsado'); disparar('keyup'); } }));
  });
  $$('[data-abrir-arcade]').forEach(b => b.addEventListener('click', abrirMaquina));
  CV.portada.addEventListener('pointerdown', e => {
    if (fase !== 'attract') return;
    if (!creditos) { if (!monedas.length) meterFicha(); return; }
    const r = CV.portada.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * PW, y = (e.clientY - r.top) / r.height * PH;
    const i = CUADROS.findIndex(c => x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h);   // tocar un cuadro lo elige
    if (i >= 0) { opcion = i; pulsarStart(i); }
  });

  // ---------------------------------------------------------- arranque: la página comienza en la máquina
  const q = new URLSearchParams(location.search);
  if (q.has('clasico') || (location.hash && location.hash.length > 1)) { maquina.hidden = true; fase = 'cerrada'; }
  else abrirMaquina();
  window.KRArcade = { abrir: abrirMaquina, cerrar: cerrarMaquina };
})();

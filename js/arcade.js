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
  // cada rama del árbol es una especialidad: sus habilidades suben una estadística
  // y el nivel (1 a 3) de una habilidad de combate propia (mismo orden que en gremio.js)
  const BONO_RAMA = [
    { ico: '⚔️', nombre: 'Ataque', txt: '+0,25 de daño en cada golpe' },
    { ico: '⚡', nombre: 'Energía', txt: '+10 de energía máxima y recarga 8% más rápida' },
    { ico: '💨', nombre: 'Rapidez', txt: 'ataques más seguidos y +3% de velocidad' },
    { ico: '⚡', nombre: 'Energía', txt: '+10 de energía máxima y recarga 8% más rápida' },
    { ico: '❤️', nombre: 'Vida', txt: '+1 corazón de vida máxima' },
    { ico: '🛡️', nombre: 'Bloqueo', txt: '+12% de probabilidad de bloquear un golpe' },
    { ico: '✚', nombre: 'Curación', txt: '+6% de probabilidad de que los enemigos suelten corazones' },
  ];
  const ESPECIALIDADES = [
    { hab: 'Gráfico de torta', desc: 'Gráficos de torta giran a tu alrededor y golpean a los enemigos que tocan.', niveles: ['1 gráfico en órbita', '2 gráficos y giro más rápido', '3 gráficos con más daño'] },
    { hab: 'Compañero pixel', desc: 'Un compañero pixel art pelea a tu lado desde el primer segundo.', niveles: ['ataca cada 0,7 s', 'ataca cada 0,5 s', 'ataca cada 0,4 s con más daño'] },
    { hab: 'Escudo de código', desc: 'Líneas de código verde te rodean y absorben golpes completos. Se recargan solas.', niveles: ['1 carga de escudo', '2 cargas y recarga más rápida', '3 cargas, recarga cada 5 s'] },
    { hab: 'Robot de IA', desc: 'Un robot vuela contigo y dispara al enemigo más cercano.', niveles: ['dispara cada 1,4 s', 'dispara cada 1 s', 'dispara cada 0,7 s con más daño'] },
    { hab: 'Invocar esqueletos', desc: 'No usas espada: cada ataque invoca un esqueleto que pelea por ti durante 11 s.', niveles: ['hasta 2 esqueletos', 'hasta 3 esqueletos', 'hasta 4 esqueletos'] },
    { hab: 'Aura de interferencia', desc: 'Cada pocos segundos emites un aura que confunde a los enemigos cercanos: se golpean entre ellos.', niveles: ['cada 10 s, confunde 4 s', 'cada 8 s, confunde 5 s', 'cada 6 s, confunde 6 s'] },
    { hab: 'Toma de mando', desc: 'Cada cierto tiempo, el enemigo más cercano pasa a tu lado y pelea por ti.', niveles: ['cada 11 s, durante 8 s', 'cada 9 s, durante 10 s', 'cada 7 s, durante 12 s'] },
  ];
  const ramaDe = p => (p.esp === null || p.esp === undefined) ? null : RAMAS[p.esp];
  const aprendidas = p => { const r = ramaDe(p); return r ? r.nodos.filter(nd => p.arbol.includes(clave(r, nd))).length : 0; };
  const ramaCompleta = p => { const r = ramaDe(p); return !!r && aprendidas(p) >= r.nodos.length; };
  function nivelEsp(p) {
    const r = ramaDe(p), n = aprendidas(p); if (!r || !n) return 0;
    return n >= r.nodos.length ? 3 : n >= Math.ceil(r.nodos.length / 2) ? 2 : 1;
  }
  function bonos() {
    const p = prog(), n = [0, 0, 0, 0, 0, 0, 0]; if (ramaDe(p)) n[p.esp] = aprendidas(p);
    const en = n[1] + n[3];
    return { ataque: 1 + n[0] * .25, energiaMax: 60 + en * 10, regen: .12 * (1 + en * .08), cd: 18 - n[2] * 2, vel: 1.45 * (1 + n[2] * .03), vidaMax: 8 + n[4], bloqueo: n[5] * .12, invul: n[5] * 10, cura: .14 + n[6] * .06, regenVida: n[6] >= 4, esp: ramaDe(p) ? p.esp : -1, nivel: nivelEsp(p) };
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
  function panel(tipo, html) {
    KRAldea.pausar(); KRBatalla.pausar();
    panelTipo = tipo; capa.onclick = null; capa.className = 'capa-panel panel-' + tipo; capa.innerHTML = html; capa.hidden = false; capa.scrollTop = 0;
    const b = capa.querySelector('button'); b && b.focus({ preventScroll: true });
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
    panel('estudio', `<div class="pn">
      <p class="pn-kicker">Misión 1 · Castillo Conari</p><h2 class="pn-titulo">Studios Conari SpA</h2>
      <p class="pn-logro">✓ Emblema restaurado · +1 punto de habilidad</p>
      <div class="pn-contenido"></div>
      <div class="fila-botones centro"><button type="button" class="btn btn-oro" data-seguir>Continuar la aventura ▶</button></div></div>`);
    capa.querySelector('.pn-contenido').append(limpiarClon($('#estudio .estudio-grid').cloneNode(true)), limpiarClon($('#estudio .disciplinas').cloneNode(true)));
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
    panel('ficha', `<div class="pn">
      <p class="pn-kicker">Misión 5 · Biblioteca</p><h2 class="pn-titulo">Hoja de personaje</h2>
      <div class="pn-contenido"></div>
      <div class="fin-juego"><p class="fin-titulo">FIN DEL JUEGO</p><p>Completaste las cinco misiones del reino de Kevin del Río.</p>
      <button type="button" class="btn btn-oro" data-conversar>¿Conversamos? ▶</button></div></div>`);
    const c = limpiarClon($('#cv .cv-grid').cloneNode(true));
    c.querySelectorAll('.barra-attr i').forEach(i => { i.style.width = i.dataset.v + '%'; });
    capa.querySelector('.pn-contenido').append(c);
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
  let tp = 0, creditos = 0, arranque = 0, rechazo = 0, rafP = 0;
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
      if ((arranque >> 3) % 2) txt('PLAYER 1 START', PW / 2, 318, 34, '#ffd400', 18);
      if (arranque === 0) revelar();
    } else if (creditos === 0) {
      if ((tp >> 5) % 2 === 0 || rechazo > 0) txt('INSERT COIN', PW / 2 + sacude, 318, 46, '#ffd400', 22);
      txt('PRESIONA  F  PARA METER UNA FICHA', PW / 2, 392, 15, '#e6eefc');
    } else {
      txt('INSERT COIN', PW / 2, 300, 22, '#ffd400', 10);
      if ((tp >> 4) % 2 === 0) txt('PRESIONA ENTER PARA INICIAR', PW / 2, 356, 22, '#ffd400', 16);
      txt('F · OTRA FICHA', PW / 2, 404, 12, '#cad6e5');
    }
    for (let i = monedas.length - 1; i >= 0; i--) {                         // ficha cayendo
      const m = monedas[i]; m.t++; const y = -20 + m.t * m.t * .5, ancho = Math.abs(Math.cos(m.t * .35)) * 16 + 3;
      pc.fillStyle = '#e0b756'; pc.beginPath(); pc.ellipse(PW / 2, y, ancho, 18, 0, 0, 7); pc.fill();
      pc.fillStyle = '#fff1a8'; pc.beginPath(); pc.ellipse(PW / 2, y, ancho * .55, 11, 0, 0, 7); pc.fill();
      if (y > 300) { monedas.splice(i, 1); creditos = Math.min(9, creditos + 1); KR.beep([[988, .05], [1319, .16]]); }
    }
    txt(`CREDITS ${creditos}`, PW - 130, PH - 34, 13, '#f4f7fd');
    txt('C · PORTAFOLIO CLÁSICO', 180, PH - 34, 10, '#8fa3bd');
    txt('© 2026 STUDIOS CONARI', PW / 2, PH - 34, 10, '#8fa3bd');
  }
  function bucleP() { dibujarPortada(); rafP = (actual === 'portada' && !maquina.hidden) ? requestAnimationFrame(bucleP) : 0; }
  function arrancarPortada() { if (!rafP) rafP = requestAnimationFrame(bucleP); }
  function meterFicha() { if (arranque) return; monedas.push({ t: 0 }); KR.beep([[660, .03]]); }
  function pulsarStart() {
    if (arranque || fase !== 'attract') return;
    if (creditos === 0 && !monedas.length) { rechazo = 30; KR.beep([[150, .15]]); return; }
    if (creditos === 0) return;
    creditos--; arranque = 100; KR.beep([[523, .08], [659, .08], [784, .08], [1047, .08], [1319, .25]]);
  }

  // ---------------------------------------------------------- gabinete: enfoque y revelación
  function enfocar() {
    gab.style.transition = 'none'; gab.style.transform = 'none';
    const g = gab.getBoundingClientRect(), s = pantalla.getBoundingClientRect();
    const k = Math.min(innerWidth / s.width, innerHeight / s.height);
    const cx = s.left + s.width / 2 - g.left, cy = s.top + s.height / 2 - g.top;
    gab.style.transform = `translate(${innerWidth / 2 - g.left - k * cx}px, ${innerHeight / 2 - g.top - k * cy}px) scale(${k})`;
    void gab.offsetWidth;
  }
  function revelar() {
    fase = 'revelando';
    maquina.classList.remove('enfocada'); maquina.classList.add('revelando');
    gab.style.transition = 'transform 2.2s cubic-bezier(.65,.02,.2,1)'; gab.style.transform = 'none';
    setTimeout(() => { maquina.classList.remove('revelando'); fase = 'juego'; iniciarJuego(); }, 2300);
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
    maquina.classList.add('enfocada'); maquina.classList.remove('revelando');
    mostrar('portada'); requestAnimationFrame(enfocar);
  }
  function cerrarMaquina() {
    if (actual === 'aldea') { prog().x = KRAldea.x; KR.guardar(); }
    KRAldea.pausar(); KRBatalla.pausar(); if (ritmo) ritmo.detener();
    capa.hidden = true; panelTipo = null;
    maquina.hidden = true; document.body.classList.remove('bloqueado'); fase = 'cerrada';
    gab.style.transform = 'none';
  }
  addEventListener('resize', () => { if (fase === 'attract') enfocar(); });

  // ---------------------------------------------------------- teclado global y controles del gabinete
  const botonDe = k => $$('[data-tecla]', maquina).find(b => b.dataset.tecla.toLowerCase() === k);
  document.addEventListener('keydown', e => {
    if (maquina.hidden) return;
    const k = e.key.toLowerCase(), b = botonDe(k); if (b) b.classList.add('pulsado');
    if (fase === 'attract') {
      if (k === 'f') { e.preventDefault(); meterFicha(); }
      else if (k === 'enter' || k === ' ') { e.preventDefault(); pulsarStart(); }
      else if (k === 'c') cerrarMaquina();
      return;
    }
    if (fase !== 'juego') return;
    if (k === 'escape') { e.preventDefault(); escape(); return; }
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
  $('#maquina-salir').addEventListener('click', cerrarMaquina);
  $$('[data-abrir-arcade]').forEach(b => b.addEventListener('click', abrirMaquina));
  CV.portada.addEventListener('pointerdown', () => { if (fase === 'attract') { if (creditos || monedas.length) pulsarStart(); else meterFicha(); } });

  // ---------------------------------------------------------- arranque: la página comienza en la máquina
  const q = new URLSearchParams(location.search);
  if (q.has('clasico') || (location.hash && location.hash.length > 1)) { maquina.hidden = true; fase = 'cerrada'; }
  else abrirMaquina();
  window.KRArcade = { abrir: abrirMaquina, cerrar: cerrarMaquina };
})();

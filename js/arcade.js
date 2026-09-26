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
  const TOTAL = RAMAS.reduce((a, r) => a + r.nodos.length, 0);
  const clave = (r, n) => r.nombre + '·' + n[0];
  // cada rama del árbol mejora una estadística de combate (mismo orden que en gremio.js)
  const BONO_RAMA = [
    { ico: '⚔️', nombre: 'Ataque', txt: () => '+0,25 de daño en cada golpe' },
    { ico: '⚡', nombre: 'Energía', txt: () => '+10 de energía máxima y recarga 8% más rápida' },
    { ico: '💨', nombre: 'Rapidez', txt: () => 'Ataques más seguidos y +3% de velocidad de movimiento' },
    { ico: '🤖', nombre: 'Dron de datos', txt: j => ['Un dron aliado dispara solo a los enemigos', 'El dron dispara más seguido', 'El dron hace 50% más daño'][j] },
    { ico: '❤️', nombre: 'Vida', txt: () => '+1 corazón de vida máxima' },
    { ico: '🛡️', nombre: 'Escudo', txt: () => '+12% de probabilidad de bloquear un golpe y más invulnerabilidad' },
    { ico: '✚', nombre: 'Curación', txt: j => j === 3 ? 'Regeneras 1 corazón cada 20 segundos' : '+6% de probabilidad de que los enemigos suelten corazones' },
  ];
  function bonos() {
    const p = prog(), n = RAMAS.map(r => r.nodos.filter(nd => p.arbol.includes(clave(r, nd))).length).concat([0, 0, 0, 0, 0, 0, 0]);
    return { ataque: 1 + n[0] * .25, energiaMax: 60 + n[1] * 10, regen: .12 * (1 + n[1] * .08), cd: 18 - n[2] * 2, vel: 1.45 * (1 + n[2] * .03), dron: n[3], vidaMax: 8 + n[4], bloqueo: n[5] * .12, invul: n[5] * 10, cura: .14 + n[6] * .06, regenVida: n[6] >= 4 };
  }
  function resumenBonos() {
    const b = bonos();
    return `<ul class="stats-juego"><li>⚔️ Ataque <b>${b.ataque.toFixed(2).replace('.', ',')}</b></li><li>❤️ Vida <b>${b.vidaMax}</b></li><li>⚡ Energía <b>${b.energiaMax}</b></li><li>💨 Cadencia <b>${b.cd}</b></li><li>🤖 Dron <b>${b.dron ? 'nv. ' + b.dron : '-'}</b></li><li>🛡️ Bloqueo <b>${Math.round(b.bloqueo * 100)}%</b></li><li>✚ Curación <b>${Math.round(b.cura * 100)}%${b.regenVida ? ' + regen.' : ''}</b></li></ul>`;
  }

  // ---------------------------------------------------------- progreso de la partida (persistente)
  function prog() {
    const e = KR.estado().extra;
    if (!e.arcade) e.arcade = { etapa: 0, ph: 0, fragmentos: [false, false, false], arbol: [], x: 44, premios: {} };
    return e.arcade;
  }
  const MISIONES = [
    { titulo: 'MISIÓN 1/5 · CASTILLO CONARI', texto: p => { const n = p.fragmentos.filter(Boolean).length; return n < 3 ? `Recupera los fragmentos del emblema Conari (${n}/3)` : 'Entra al Castillo Conari: pulsa E en el portón'; } },
    { titulo: 'MISIÓN 2/5 · TORRE DEL DATO', texto: () => 'Entra a la torre y supera las 3 oleadas de la Arena del Dato' },
    { titulo: 'MISIÓN 3/5 · ARCADE DEL DRAGÓN', texto: () => 'Entra al arcade: completa el Memorize y Ritmo Resonancia' },
    { titulo: 'MISIÓN 4/5 · GREMIO', texto: p => `Presiona H y sube todas las ramas del árbol (${p.arbol.length}/${TOTAL})` },
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
    if (k === 'h') return p.etapa >= 3 ? abrirArbol() : KRAldea.avisar('El mapa del árbol se desbloquea en el Gremio (misión 4)', 170);
    if (k === 'p') return p.etapa >= 4 ? abrirFicha() : KRAldea.avisar('La hoja de personaje espera en la Biblioteca (misión 5)', 170);
  };

  // ---------------------------------------------------------- misión 1: Studios Conari
  function abrirEstudio() {
    panel('estudio', `<div class="pn">
      <p class="pn-kicker">Misión 1 · Castillo Conari</p><h2 class="pn-titulo">Studios Conari SpA</h2>
      <p class="pn-logro">✓ Emblema restaurado · +3 puntos de habilidad</p>
      <div class="pn-contenido"></div>
      <div class="fila-botones centro"><button type="button" class="btn btn-oro" data-seguir>Continuar la aventura ▶</button></div></div>`);
    capa.querySelector('.pn-contenido').append(limpiarClon($('#estudio .estudio-grid').cloneNode(true)), limpiarClon($('#estudio .disciplinas').cloneNode(true)));
    if (prog().etapa === 0) pendiente = 0;
    completar(0, 3, 'estudio');
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
        if (!p.premios[1]) { puntos = gano ? 25 : 22; if (p.etapa === 1) pendiente = 1; completar(1, puntos, 'datos'); }
        else { puntos = Math.floor(derrotas / (gano ? 4 : 6)); p.ph += puntos; KR.guardar(); }
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
  const JUEGOS = [
    { id: 'tower', img: 'assets/img/juegos/banner-tower.jpg', nombre: 'Dungeon Ascent', txt: 'RPG de mazmorras top-down: una torre de 10 pisos con 10 jefes y una ciudad base. Proyecto personal en Godot 4.5.' },
    { id: 'vilu', img: 'assets/img/juegos/banner-vilu.jpg', nombre: 'VILU: El Despertar', txt: 'Primera IP original de Studios Conari: aventura narrativa 3D cooperativa inspirada en la mitología de Chile.' },
    { id: 'origen', img: 'assets/img/juegos/banner-origen.jpg', nombre: 'Proyecto Origen', txt: 'Prototipo formativo del estudio: RPG 2D con IA enemiga, inventario, equipamiento y progresión.' },
    { id: 'resonancia', img: 'assets/img/juegos/banner-resonancia.jpg', nombre: 'Proyecto Resonancia', txt: 'Juego de ritmo con análisis de audio, generación automática de charts y modo versus en red local.' },
  ];
  function abrirMemoria() {
    const cartas = [...JUEGOS, ...JUEGOS].map(j => j).sort(() => Math.random() - .5);
    panel('memoria', `<div class="pn pn-memoria">
      <div class="pn-cab"><div><p class="pn-kicker">Misión 3 · Arcade del Dragón</p><h2 class="pn-titulo">Memorize del estudio</h2></div>
      <div class="mem-marcador"><span>Movimientos <b data-mov>0</b></span><span>Pares <b data-pares>0</b>/${JUEGOS.length}</span></div></div>
      <p class="pn-texto">Da vuelta dos cartas por turno y encuentra el par de cada juego creado por Kevin y Studios Conari.</p>
      <div class="mem-grilla">${cartas.map((c, i) => `<button type="button" class="mem-carta" data-i="${i}" aria-label="Carta ${i + 1}, boca abajo"><span class="mem-cara mem-dorso"><img src="assets/img/logo-estrella.png" alt=""></span><span class="mem-cara mem-frente"><img src="${c.img}" alt=""></span></button>`).join('')}</div>
      <div class="mem-info" aria-live="polite"><p>Encuentra los ${JUEGOS.length} pares para desbloquear Ritmo Resonancia.</p></div></div>`);
    let abiertas = [], bloqueo = false, mov = 0, pares = 0;
    const info = capa.querySelector('.mem-info');
    capa.querySelectorAll('.mem-carta').forEach(b => b.addEventListener('click', () => {
      if (bloqueo || b.classList.contains('abierta') || b.classList.contains('hecha')) return;
      b.classList.add('abierta'); b.setAttribute('aria-label', cartas[+b.dataset.i].nombre); abiertas.push(b); KR.beep([[523, .03]]);
      if (abiertas.length < 2) return;
      mov++; capa.querySelector('[data-mov]').textContent = mov;
      const [a, c] = abiertas, ja = cartas[+a.dataset.i], jc = cartas[+c.dataset.i];
      if (ja.id === jc.id) {
        a.classList.add('hecha'); c.classList.add('hecha'); abiertas = []; pares++;
        capa.querySelector('[data-pares]').textContent = pares; KR.beep([[659, .06], [880, .1]]);
        info.innerHTML = `<p class="mem-par"><b>¡Par encontrado! ${ja.nombre}</b> · ${ja.txt}</p>`;
        if (pares === JUEGOS.length) {
          const p = prog(); if (!p.premios.memoria) { p.premios.memoria = true; p.ph += 3; KR.guardar(); }
          info.innerHTML = `<p class="mem-par"><b>¡Memorize completado en ${mov} movimientos!</b> +3 puntos de habilidad. Ahora, al ritmo de Proyecto Resonancia.</p>
            <div class="fila-botones centro"><button type="button" class="btn btn-oro" data-ritmo>Siguiente: Ritmo Resonancia ▶</button></div>`;
          const bt = info.querySelector('[data-ritmo]'); bt.onclick = iniciarRitmo; bt.focus({ preventScroll: true });
        }
      } else {
        bloqueo = true; KR.beep([[220, .06]]);
        setTimeout(() => { a.classList.remove('abierta'); c.classList.remove('abierta'); a.setAttribute('aria-label', 'Carta boca abajo'); c.setAttribute('aria-label', 'Carta boca abajo'); abiertas = []; bloqueo = false; }, 850);
      }
    }));
  }
  function iniciarRitmo() {
    if (!ritmo) ritmo = KRCrearRitmo(CV.ritmo, {
      activo: () => actual === 'ritmo' && !ritmoPausado && !maquina.hidden,
      alTerminar: st => {
        if (prog().etapa === 2) pendiente = 2;
        completar(2, 3, 'arcade');
        flotante.innerHTML = `<p><b>¡Canción completada!</b> Precisión ${Math.round(st.precision * 100)}% · ${st.puntos} puntos</p><div class="fila-botones centro"><button type="button" class="btn btn-oro" data-seguir>Continuar la aventura ▶</button></div>`;
        flotante.hidden = false;
        flotante.querySelector('[data-seguir]').onclick = () => volverAldea();
      },
    });
    mostrar('ritmo');
  }

  // ---------------------------------------------------------- misión 4: mapa del árbol de habilidades
  function revisarArbol() {                                  // la misión se cumple apenas el árbol está completo
    const p = prog();
    if (p.etapa !== 3 || p.arbol.length < TOTAL) return false;
    completar(3, 0, 'gremio'); pendiente = 3;
    const extra = KR.estado().extra; extra.habilidades = RAMAS.flatMap(r => r.nodos.map(nd => clave(r, nd))); KR.guardar(); KR.desbloquear('gremio');
    return true;
  }
  let nodoSel = null;
  function abrirArbol() {
    const p = prog(), cx = 480, cy = 540, n = RAMAS.length;
    const nodos = [];
    RAMAS.forEach((r, i) => {
      const a = Math.PI + Math.PI * (.09 + .82 * i / (n - 1));
      r.nodos.forEach((nd, j) => {
        const rr = 118 + j * 62, k = clave(r, nd), prev = j ? clave(r, r.nodos[j - 1]) : null;
        const hecho = p.arbol.includes(k), disp = !hecho && (!prev || p.arbol.includes(prev));
        nodos.push({ r, ri: i, nd, j, k, x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr * .98, hecho, disp, a });
      });
    });
    const completo = p.arbol.length >= TOTAL;
    const ramaSvg = RAMAS.map((r, i) => {
      const suyos = nodos.filter(x => x.r === r), ult = suyos[suyos.length - 1], lx = cx + Math.cos(ult.a) * (ult.j * 62 + 160), ly = cy + Math.sin(ult.a) * (ult.j * 62 + 160) * .98;
      const tramo = suyos.map((x, j) => { const o = j ? suyos[j - 1] : { x: cx, y: cy - 70 }; return `<line x1="${o.x}" y1="${o.y}" x2="${x.x}" y2="${x.y}" class="rama-linea ${x.hecho ? 'viva' : ''}"/>`; }).join('');
      const bono = BONO_RAMA[i] || { ico: '', nombre: '' };
      return tramo + `<text x="${lx}" y="${ly}" text-anchor="middle" class="rama-nombre">${r.ico} ${r.nombre}</text><text x="${lx}" y="${ly + 16}" text-anchor="middle" class="rama-bono">${bono.ico} ${bono.nombre}</text>`;
    }).join('');
    const nodosSvg = nodos.map(x => `<g class="nd ${x.hecho ? 'hecho' : x.disp ? 'disp' : 'bloq'}" data-k="${x.k}" tabindex="0" role="button" aria-label="${x.nd[0]}${x.hecho ? ', desbloqueada' : x.disp ? ', disponible' : ', bloqueada'}">
      <circle cx="${x.x}" cy="${x.y}" r="16"/><text x="${x.x}" y="${x.y + 4}" text-anchor="middle">${x.hecho ? '★'.repeat(1) : x.disp ? '+' : '·'}</text></g>`).join('');
    panel('arbol', `<div class="arbol-mapa">
      <div class="arbol-cab"><div><p class="pn-kicker">Misión 4 · Gremio</p><h2 class="pn-titulo">Mapa del árbol de habilidades</h2></div>
        <div class="arbol-marcador"><span class="ph">PH <b>${p.ph}</b></span><span>${p.arbol.length}/${TOTAL} habilidades</span><button type="button" class="btn btn-mini" data-cerrar>Cerrar (H)</button></div></div>
      <svg viewBox="0 0 960 560" class="arbol-svg" role="group" aria-label="Árbol de habilidades">
        <defs><radialGradient id="aura"><stop offset="0" stop-color="rgba(157,255,192,.25)"/><stop offset="1" stop-color="rgba(157,255,192,0)"/></radialGradient></defs>
        <circle cx="${cx}" cy="${cy - 60}" r="${completo ? 300 : 120}" fill="url(#aura)"/>
        <path d="M${cx - 18},560 C${cx - 10},520 ${cx - 8},500 ${cx},${cy - 70} C${cx + 8},500 ${cx + 10},520 ${cx + 18},560Z" class="tronco"/>
        ${ramaSvg}${nodosSvg}
      </svg>
      <div class="arbol-detalle" aria-live="polite">${completo ? `<b>¡Todas las ramas florecieron!</b><p>Dominas el árbol completo de Kevin y tu personaje está al máximo:</p>${resumenBonos()}<button type="button" class="btn btn-oro" data-seguir>Continuar la aventura ▶</button>` : `<b>Elige una habilidad disponible (+)</b><p>Cada habilidad cuesta 1 PH y además mejora a tu personaje en combate. Tus estadísticas:</p>${resumenBonos()}`}</div></div>`);
    const detalle = capa.querySelector('.arbol-detalle');
    const ver = x => {
      const est = `${'★'.repeat(x.nd[1])}${'☆'.repeat(5 - x.nd[1])}`;
      const bono = BONO_RAMA[x.ri];
      detalle.innerHTML = `<b>${x.r.ico} ${x.nd[0]}</b><p class="estrellas-detalle">Dominio ${x.nd[1]} de 5 · ${est}</p><p>${x.nd[2]}</p>${bono ? `<p class="bono">${bono.ico} Bonus en combate: ${bono.txt(x.j)}</p>` : ''}${x.hecho ? '<p class="ok">✓ Desbloqueada</p>' : x.disp ? (p.ph > 0 ? '<p class="ok">Pulsa otra vez o Enter para desbloquear (1 PH)</p>' : '<p class="falta">Sin puntos de habilidad.</p><button type="button" class="btn btn-mini" data-entrenar>Entrenar en la Arena del Dato (+PH)</button>') : '<p class="falta">Bloqueada: desbloquea primero la habilidad anterior de esta rama.</p>'}`;
    };
    capa.querySelectorAll('.nd').forEach(el => {
      const x = nodos.find(z => z.k === el.dataset.k);
      const accion = () => {
        if (nodoSel === x.k && x.disp && p.ph > 0) {
          p.arbol.push(x.k); p.ph--; KR.guardar(); KR.sumarXP(10); KR.beep([[523, .05], [784, .09]]); revisarArbol();
          nodoSel = x.k; abrirArbol();
          if (prog().arbol.length >= TOTAL) KR.beep([[523, .1], [659, .1], [784, .1], [1047, .3]]);
          return;
        }
        nodoSel = x.k; capa.querySelectorAll('.nd.sel').forEach(z => z.classList.remove('sel')); el.classList.add('sel'); ver(x);
      };
      el.addEventListener('click', accion);
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); accion(); } });
      if (nodoSel === x.k) { el.classList.add('sel'); ver(x); }
    });
    capa.onclick = e => {
      if (e.target.closest('[data-cerrar]')) volverAldea();
      if (e.target.closest('[data-entrenar]')) iniciarBatalla(false);
      if (e.target.closest('[data-seguir]')) { revisarArbol(); volverAldea(); }
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
      <p class="fin-stats"><span>Misiones <b>5/5</b></span><span>Habilidades <b>${p.arbol.length}/${TOTAL}</b></span><span>Experiencia <b>${KR.estado().xp} XP</b></span><span>Récord <b>${p.record || 0} oleadas</b></span></p>
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
      <p class="pn-texto">Controles: A/D o flechas para moverte · Espacio para saltar o atacar · E para hablar o entrar · K o B: onda de energía en la arena · H árbol · P hoja de personaje</p></div>`);
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
    mostrar('aldea');
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

/* ==========================================================================
   Arena del Dato (modo arcade): combate top-down por oleadas.
   Cada acción queda registrada como un evento (telemetría) para que el
   informe de jugabilidad la analice al terminar. Las habilidades del árbol
   llegan como "bonos" (ataque, vida, energía, rapidez, escudo, curación) más
   la habilidad de la especialidad elegida (B.esp, con nivel 1 a 3):
     0 Datos y BI          gráficos de torta que orbitan y golpean
     1 Videojuegos         compañero pixel art que pelea contigo
     2 Software            escudo de código que absorbe golpes
     3 IA y automatización robot que dispara proyectiles
     4 Gestión             el ataque invoca esqueletos en vez de golpear
     5 Infraestructura     aura periódica que confunde: los enemigos se golpean entre ellos
     6 Liderazgo           toma el mando de un enemigo, que pelea de tu lado
   Existe un modo de oleadas infinitas. API: window.KRBatalla.
   ========================================================================== */
(function () {
  'use strict';
  // sprites del equipo (assets/img/personajes): filas = abajo, izquierda, derecha, arriba; 3 cuadros por fila.
  // Cada celda está alineada por la cabeza; "pies" es la fila de la celda donde se apoyan los pies.
  const HOJA = (src, w, h, pies) => { const i = new Image(); i.src = 'assets/img/personajes/' + src; return { i, w, h, pies }; };
  const SPR = {
    idle: HOJA('td-hombre-idle.png', 48, 44, 37), camina: HOJA('td-hombre-camina.png', 48, 44, 37),
    espada: HOJA('td-hombre-espada.png', 64, 56, 45), onda: HOJA('td-hombre-onda.png', 88, 72, 51),
    mIdle: HOJA('td-mujer-idle.png', 48, 44, 37), mCamina: HOJA('td-mujer-camina.png', 48, 44, 37), mDaga: HOJA('td-mujer-daga.png', 56, 48, 39),
  };
  const direccion = (fx, fy) => Math.abs(fx) > Math.abs(fy) ? (fx < 0 ? 1 : 2) : (fy < 0 ? 3 : 0);
  const CICLO = [0, 1, 2, 1];

  // KRCrearBatalla(canvas) monta una arena independiente: la del modo arcade y la de la página clásica
  function crear(cv) {
  // dibuja el cuadro (fila, col) de una hoja con los pies en (x, y) del mundo
  function sprite(h, fila, col, x, y) {
    if (!h.i.complete || !h.i.naturalWidth) return false;
    g.drawImage(h.i, col * h.w, fila * h.h, h.w, h.h, Math.round(x - h.w / 2), Math.round(y - h.pies), h.w, h.h);
    return true;
  }
  const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, S = 2, WW = W / S, WH = H / S;
  const buf = document.createElement('canvas'); buf.width = WW; buf.height = WH;
  const g = buf.getContext('2d');
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  function elipse(cx, cy, rx, ry, c) { for (let y = -ry; y <= ry; y++) { const h = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry)))); R(cx - h, cy + y, h * 2, 1, c); } }
  const LIM = { x0: 20, y0: 40, x1: WW - 20, y1: WH - 14 };
  const COLS = 16, FILAS = 9;

  const TIPOS = {
    slime: { nombre: 'Slime', hp: 2, v: .42, r: 6, dano: 1, col: '#6bd49a' },
    murcielago: { nombre: 'Murciélago', hp: 1, v: .95, r: 5, dano: 1, col: '#a78bfa' },
    arquero: { nombre: 'Arquero esqueleto', hp: 2, v: .55, r: 6, dano: 1, col: '#e6e0d0' },
    golem: { nombre: 'Gólem de piedra', hp: 6, v: .32, r: 10, dano: 2, col: '#8a8f9a' },
  };
  const OLAS = [
    ['slime', 'slime', 'slime', 'murcielago', 'slime', 'slime', 'murcielago'],
    ['murcielago', 'arquero', 'murcielago', 'slime', 'arquero', 'murcielago', 'slime', 'arquero', 'murcielago'],
    ['golem', 'arquero', 'slime', 'murcielago', 'arquero', 'golem', 'slime', 'arquero', 'slime', 'murcielago'],
  ];

  const BASE = { ataque: 1, vidaMax: 8, cd: 18, vel: 1.45, energiaMax: 60, regen: .12, bloqueo: 0, invul: 0, cura: .14, regenVida: false, esp: -1, nivel: 0 };
  const ESP = ['Gráfico de torta', 'Compañero pixel', 'Escudo de código', 'Robot de IA', 'Invocar esqueletos', 'Aura de interferencia', 'Toma de mando'];
  const nv = arr => arr[Math.min(3, B.nivel)];            // valor según el nivel de la especialidad (índice 1 a 3)
  let B = BASE, infinito = false, record = 0;
  let estado = 'intro', f = 0, P, enemigos, aliados, flechas, items, efectos, ola, cola, pausa = 0, T, alTerminar = null, activo = false, raf = 0, pedido = false, finT = 0;
  const K = {};
  const MAPA = { w: 'arriba', arrowup: 'arriba', s: 'abajo', arrowdown: 'abajo', a: 'izq', arrowleft: 'izq', d: 'der', arrowright: 'der', ' ': 'atk', j: 'atk', k: 'esp', e: 'esp', shift: 'esp' };
  let pedidoEsp = false;

  const seg = () => +(f / 60).toFixed(1);
  function registrar(tipo, datos) { T.eventos.push(Object.assign({ t: seg(), ola: ola + 1, tipo }, datos)); }
  function golpe(e, dano, fuente) { e.ultimo = fuente; registrar('golpe', { enemigo: e.tipo, dano, fuente }); }   // fuente del último golpe = quién lo derrotó

  function reiniciar() {
    f = 0; ola = 0; enemigos = []; aliados = []; flechas = []; items = []; efectos = []; cola = []; pausa = 0; finT = 0;
    P = { x: WW / 2, y: (LIM.y0 + LIM.y1) / 2 + 10, r: 5, v: B.vel, hp: B.vidaMax, max: B.vidaMax, inv: 0, fx: 0, fy: 1, cd: 0, atk: 0, en: B.energiaMax, esp: 0, dronA: 0, dronCd: 60, orb: 0, escudo: nv([0, 2, 3, 4]), escudoT: 0, auraT: 240, mandoT: 300, invocaCd: 0 };
    if (B.esp === 1) aliados.push({ tipo: 'companero', x: P.x - 14, y: P.y + 4, r: 4, v: 1.35, cd: 0, atk: 0, vida: Infinity });
    T = { inicio: 0, fin: 0, resultado: '', modo: infinito ? 'infinito' : 'mision', eventos: [], vida: [], pos: [], olas: [], distancia: 0, hpMax: B.vidaMax, bonos: B };
    balas.length = 0;
    empezarOla();
  }
  function olaInfinita(n) {
    const tipos = ['slime', 'murcielago'].concat(n >= 2 ? ['arquero'] : []), lista = [];
    const total = Math.min(26, 5 + n * 2);
    for (let i = 0; i < Math.floor(n / 3); i++) lista.push('golem');
    while (lista.length < total) lista.push(tipos[Math.floor(Math.random() * tipos.length)]);
    return lista.sort(() => Math.random() - .5);
  }
  function empezarOla() {
    T.olas[ola] = { n: ola + 1, t0: seg(), t1: null };
    T.pos[ola] = Array(COLS * FILAS).fill(0);
    const lista = infinito ? olaInfinita(ola + 1) : OLAS[ola];
    const paso = infinito ? Math.max(18, 42 - ola * 2) : 42;
    lista.forEach((tipo, i) => cola.push({ tipo, en: f + 40 + i * paso }));
  }
  function aparecer(tipo) {
    let x, y, n = 0;
    do {
      const lado = Math.floor(Math.random() * 4);
      x = lado === 0 ? LIM.x0 + 6 : lado === 1 ? LIM.x1 - 6 : LIM.x0 + 6 + Math.random() * (LIM.x1 - LIM.x0 - 12);
      y = lado === 2 ? LIM.y0 + 6 : lado === 3 ? LIM.y1 - 6 : LIM.y0 + 6 + Math.random() * (LIM.y1 - LIM.y0 - 12);
    } while (Math.hypot(x - P.x, y - P.y) < 90 && ++n < 20);
    const b = TIPOS[tipo];
    const esc = infinito ? 1 + .15 * ola : 1;
    enemigos.push({ tipo, x, y, r: b.r, hp: b.hp * esc, hpMax: b.hp * esc, v: b.v * (infinito ? 1 + Math.min(.5, .03 * ola) : 1), kx: 0, ky: 0, fase: Math.random() * 6, portal: 36, t0: seg(), cd: 90 + Math.random() * 50, modo: 'camina', mt: 150 + Math.random() * 60, dx: 0, dy: 0, golpes: 0, conf: 0, golpeCd: 0 });
    registrar('aparicion', { enemigo: tipo });
  }

  // ---------------------------------------------------------- entrada
  cv.addEventListener('keydown', e => {
    const k = MAPA[e.key.toLowerCase()];
    if (k) { e.preventDefault(); K[k] = true; if (k === 'atk' && !e.repeat) pedido = true; if (k === 'esp' && !e.repeat) pedidoEsp = true; }
    if ((e.key === 'Enter' || e.key === ' ') && estado === 'intro') { e.preventDefault(); comenzar(); }
  });
  cv.addEventListener('keyup', e => { const k = MAPA[e.key.toLowerCase()]; if (k) K[k] = false; });
  cv.addEventListener('blur', () => Object.keys(K).forEach(k => K[k] = false));
  cv.addEventListener('pointerdown', e => {
    cv.focus({ preventScroll: true });
    if (estado === 'intro') { comenzar(); return; }
    if (estado !== 'jugando') return;
    const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * WW / r.width, y = (e.clientY - r.top) * WH / r.height;
    const d = Math.hypot(x - P.x, y - P.y) || 1; P.fx = (x - P.x) / d; P.fy = (y - P.y) / d; pedido = true;
  });
  function comenzar() { reiniciar(); estado = 'jugando'; window.KR && KR.beep([[392, .08], [523, .08], [659, .14]]); }

  // ---------------------------------------------------------- lógica
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const limitar = o => { o.x = Math.max(LIM.x0 + o.r, Math.min(LIM.x1 - o.r, o.x)); o.y = Math.max(LIM.y0 + o.r, Math.min(LIM.y1 - o.r, o.y)); };
  function recibir(n, origen, via, atacante) {
    if (P.inv > 0 || estado !== 'jugando') return;
    if (B.esp === 2 && P.escudo > 0) {                       // escudo de código: absorbe el golpe completo
      P.escudo--; P.escudoT = 0; P.inv = 40; registrar('bloqueo', { enemigo: origen, via, dano: n, fuente: 'codigo' });
      if (atacante) {                                        // el código devuelve el golpe y empuja al atacante
        const dn = B.nivel >= 3 ? 2 : 1.5, d = Math.hypot(atacante.x - P.x, atacante.y - P.y) || 1;
        atacante.hp -= dn; atacante.kx = (atacante.x - P.x) / d * 7; atacante.ky = (atacante.y - P.y) / d * 7;
        efectos.push({ tipo: 'chispa', x: atacante.x, y: atacante.y, t: 10 }); golpe(atacante, dn, 'codigo');
      }
      efectos.push({ tipo: 'txt', x: P.x, y: P.y - 14, txt: 'ABSORBIDO', col: '#4ade80', t: 40 }); window.KR && KR.beep([[988, .04], [1319, .05]]);
      return;
    }
    if (Math.random() < B.bloqueo) {
      P.inv = 30; registrar('bloqueo', { enemigo: origen, via, dano: n, fuente: 'suerte' });
      efectos.push({ tipo: 'txt', x: P.x, y: P.y - 14, txt: 'BLOQUEO', col: '#7ec8ff', t: 40 }); window.KR && KR.beep([[880, .05]]);
      return;
    }
    P.hp -= n; P.inv = 80 + B.invul;
    registrar('recibido', { enemigo: origen, dano: n, via });
    efectos.push({ tipo: 'txt', x: P.x, y: P.y - 14, txt: '-' + n, col: '#f87171', t: 40 });
    window.KR && KR.beep([[170, .12]]);
    if (P.hp <= 0) terminar('derrota');
  }
  function terminar(res) {
    estado = 'fin'; finT = 0; T.resultado = res; T.fin = seg(); T.hpFinal = Math.max(0, P.hp);
    if (infinito) { T.olaAlcanzada = ola + 1; T.olasSuperadas = ola; T.record = Math.max(record, ola); }
    if (T.olas[ola] && T.olas[ola].t1 === null) T.olas[ola].t1 = seg();
    window.KR && KR.beep(res === 'victoria' ? [[523, .1], [659, .1], [784, .1], [1047, .3]] : [[330, .15], [262, .15], [196, .3]]);
  }
  function actualizar() {
    f++;
    if (f % 30 === 0) T.vida.push({ t: seg(), hp: P.hp, ola: ola + 1 });
    if (f % 6 === 0) {
      const c = Math.min(COLS - 1, Math.max(0, Math.floor((P.x - LIM.x0) / ((LIM.x1 - LIM.x0) / COLS))));
      const r = Math.min(FILAS - 1, Math.max(0, Math.floor((P.y - LIM.y0) / ((LIM.y1 - LIM.y0) / FILAS))));
      T.pos[ola][r * COLS + c]++;
    }
    // jugador
    let dx = (K.der ? 1 : 0) - (K.izq ? 1 : 0), dy = (K.abajo ? 1 : 0) - (K.arriba ? 1 : 0);
    P.mueve = !!(dx || dy);
    if (dx || dy) { const n = Math.hypot(dx, dy), x0 = P.x, y0 = P.y; P.x += dx / n * P.v; P.y += dy / n * P.v; P.fx = dx / n; P.fy = dy / n; limitar(P); T.distancia += Math.hypot(P.x - x0, P.y - y0); }
    if (P.inv > 0) P.inv--; if (P.cd > 0) P.cd--; if (P.atk > 0) P.atk--; if (P.invocaCd > 0) P.invocaCd--;
    if ((K.atk || pedido) && B.esp === 4) {                  // Gestión: en vez de pegar, invoca esqueletos que pelean por ti
      pedido = false;
      if (P.invocaCd <= 0) {
        const vivos = aliados.filter(a => a.tipo === 'esqueleto');
        if (vivos.length >= nv([0, 2, 3, 4])) vivos[0].vida = 0;   // el más antiguo deja su lugar
        aliados.push({ tipo: 'esqueleto', x: P.x + P.fx * 12, y: P.y + P.fy * 12, r: 4, v: 1.1, cd: 10, atk: 0, vida: 660, sube: 16 });
        P.invocaCd = 50; P.atk = 8; registrar('invocacion', { fuente: 'esqueleto' }); window.KR && KR.beep([[262, .05], [392, .07]]);
      }
    } else if ((K.atk || pedido) && P.cd === 0) {
      pedido = false; P.cd = B.cd; P.atk = 8;
      let golpes = 0;
      enemigos.forEach(e => {
        if (e.portal > 0) return;
        const ddx = e.x - P.x, ddy = e.y - P.y, d = Math.hypot(ddx, ddy) || 1;
        if (d < 22 + e.r && (ddx * P.fx + ddy * P.fy) / d > .2) {
          e.hp -= B.ataque; e.golpes++; golpes++; e.kx = ddx / d * (e.tipo === 'golem' ? 1.5 : 4); e.ky = ddy / d * (e.tipo === 'golem' ? 1.5 : 4);
          efectos.push({ tipo: 'chispa', x: e.x, y: e.y, t: 12 }); golpe(e, +B.ataque.toFixed(2), 'espada');
        }
      });
      registrar('ataque', { acierto: golpes > 0, golpes });
      window.KR && KR.beep([[golpes ? 440 : 300, .04]]);
    }
    // energía y ataque especial: onda de datos en 360°
    P.en = Math.min(B.energiaMax, P.en + B.regen); if (P.esp > 0) P.esp--;
    if (pedidoEsp) {
      pedidoEsp = false;
      if (P.en >= 40) {
        P.en -= 40; P.esp = 18; let golpes = 0;
        enemigos.forEach(e => {
          if (e.portal > 0) return;
          const ddx = e.x - P.x, ddy = e.y - P.y, d = Math.hypot(ddx, ddy) || 1;
          if (d < 36 + e.r) { e.hp -= B.ataque * 1.5; golpes++; e.kx = ddx / d * 5; e.ky = ddy / d * 5; golpe(e, +(B.ataque * 1.5).toFixed(2), 'especial'); }
        });
        registrar('especial', { golpes }); window.KR && KR.beep([[330, .06], [660, .1]]);
      } else efectos.push({ tipo: 'txt', x: P.x, y: P.y - 14, txt: 'SIN ENERGÍA', col: '#7ec8ff', t: 30 });
    }
    especialidad();
    // robot de IA (especialidad IA y automatización)
    if (B.esp === 3) {
      P.dronA += .05;
      if (--P.dronCd <= 0) {
        const dx0 = P.x + Math.cos(P.dronA) * 14, dy0 = P.y - 10 + Math.sin(P.dronA) * 6;
        const obj = enemigos.filter(e => e.portal <= 0).sort((a, b) => Math.hypot(a.x - dx0, a.y - dy0) - Math.hypot(b.x - dx0, b.y - dy0))[0];
        if (obj && Math.hypot(obj.x - dx0, obj.y - dy0) < 140) {
          const d = Math.hypot(obj.x - dx0, obj.y - dy0) || 1;
          balas.push({ x: dx0, y: dy0, vx: (obj.x - dx0) / d * 3.2, vy: (obj.y - dy0) / d * 3.2, t: 60 });
          P.dronCd = nv([0, 85, 60, 42]);
        } else P.dronCd = 10;
      }
    }
    balas.forEach(bl => {
      bl.x += bl.vx; bl.y += bl.vy; bl.t--;
      const e = enemigos.find(x => x.portal <= 0 && Math.hypot(x.x - bl.x, x.y - bl.y) < x.r + 2);
      if (e) { const dn = B.nivel >= 3 ? 1.5 : 1; e.hp -= dn; e.kx += bl.vx * .6; e.ky += bl.vy * .6; bl.t = 0; golpe(e, dn, 'robot'); efectos.push({ tipo: 'chispa', x: e.x, y: e.y, t: 8 }); }
    });
    for (let i = balas.length - 1; i >= 0; i--) if (balas[i].t <= 0) balas.splice(i, 1);
    if (B.regenVida && f % 1200 === 0 && P.hp < P.max) { P.hp++; registrar('curacion', { fuente: 'regeneracion' }); efectos.push({ tipo: 'txt', x: P.x, y: P.y - 14, txt: '+1', col: '#f472b6', t: 40 }); }
    // aparición programada
    while (cola.length && cola[0].en <= f) aparecer(cola.shift().tipo);
    // enemigos
    enemigos.forEach(e => {
      if (e.portal > 0) { e.portal--; return; }
      e.fase += .12; if (e.golpeCd > 0) e.golpeCd--;
      if (e.conf > 0) {                                       // confundido: persigue y golpea a otro enemigo, no a ti
        e.conf--;
        const otro = enemigos.filter(o => o !== e && o.portal <= 0).sort((a, b) => dist(a, e) - dist(b, e))[0];
        if (otro) {
          const d2 = dist(otro, e) || 1; e.x += (otro.x - e.x) / d2 * e.v * 1.2; e.y += (otro.y - e.y) / d2 * e.v * 1.2;
          if (d2 < e.r + otro.r + 2 && e.golpeCd <= 0) {
            const dn = TIPOS[e.tipo].dano; otro.hp -= dn; otro.kx = (otro.x - e.x) / d2 * 3; otro.ky = (otro.y - e.y) / d2 * 3; e.golpeCd = 36;
            efectos.push({ tipo: 'chispa', x: otro.x, y: otro.y, t: 8 }); golpe(otro, dn, 'confusion');
          }
        } else { e.x += Math.cos(e.fase * .4) * e.v; e.y += Math.sin(e.fase * .3) * e.v; }
        e.x += e.kx; e.y += e.ky; e.kx *= .78; e.ky *= .78; limitar(e);
        return;
      }
      const d = dist(e, P) || 1, ux = (P.x - e.x) / d, uy = (P.y - e.y) / d;
      if (e.tipo === 'slime') { e.x += ux * e.v; e.y += uy * e.v; }
      if (e.tipo === 'murcielago') { const s = Math.sin(f * .09 + e.fase) * 1.3; e.x += (ux - uy * s) * e.v; e.y += (uy + ux * s) * e.v; }
      if (e.tipo === 'arquero') {
        const m = d < 70 ? -1 : d > 125 ? 1 : 0; e.x += ux * e.v * m - uy * e.v * .5 * Math.sin(e.fase * .3); e.y += uy * e.v * m + ux * e.v * .5 * Math.sin(e.fase * .3);
        if (--e.cd <= 0) { flechas.push({ x: e.x, y: e.y - 3, vx: ux * 1.8, vy: uy * 1.8, t: 220 }); e.cd = 130 + Math.random() * 50; registrar('disparo', { enemigo: 'arquero' }); }
      }
      if (e.tipo === 'golem') {
        e.mt--;
        if (e.modo === 'camina') { e.x += ux * e.v; e.y += uy * e.v; if (e.mt <= 0) { e.modo = 'carga'; e.mt = 42; e.dx = ux; e.dy = uy; } }
        else if (e.modo === 'carga') { if (e.mt <= 0) { e.modo = 'embiste'; e.mt = 30; } }
        else if (e.modo === 'embiste') { e.x += e.dx * 3.1; e.y += e.dy * 3.1; if (e.mt <= 0) { e.modo = 'recupera'; e.mt = 45; } }
        else if (e.mt <= 0) { e.modo = 'camina'; e.mt = 160 + Math.random() * 60; }
      }
      e.x += e.kx; e.y += e.ky; e.kx *= .78; e.ky *= .78; limitar(e);
      if (d < e.r + P.r) recibir(TIPOS[e.tipo].dano, e.tipo, e.tipo === 'golem' && e.modo === 'embiste' ? 'embestida' : 'contacto', e);
    });
    aliadosActualizar();
    for (let i = 0; i < enemigos.length; i++) for (let j = i + 1; j < enemigos.length; j++) {           // separación
      const a = enemigos[i], b = enemigos[j], d = dist(a, b), m = a.r + b.r;
      if (d > 0 && d < m) { const p = (m - d) / 2, ux = (b.x - a.x) / d, uy = (b.y - a.y) / d; a.x -= ux * p; a.y -= uy * p; b.x += ux * p; b.y += uy * p; }
    }
    enemigos = enemigos.filter(e => {
      if (e.hp > 0) return true;
      const ttk = +(seg() - e.t0 - .6).toFixed(1);
      registrar('derrota', { enemigo: e.tipo, ttk: Math.max(.1, ttk), fuente: e.ultimo || 'espada' });
      efectos.push({ tipo: 'txt', x: e.x, y: e.y - 8, txt: TIPOS[e.tipo].nombre.split(' ')[0], col: '#f3d27f', t: 36 });
      for (let k = 0; k < 8; k++) efectos.push({ tipo: 'polvo', x: e.x, y: e.y, vx: Math.cos(k) * 1.2, vy: Math.sin(k) * 1.2, t: 18, col: TIPOS[e.tipo].col });
      if (P.hp < P.max && Math.random() < B.cura) items.push({ x: e.x, y: e.y, t: 600 });
      return false;
    });
    flechas = flechas.filter(a => {
      a.x += a.vx; a.y += a.vy; a.t--;
      if (B.esp === 2 && P.escudo > 0 && Math.hypot(a.x - P.x, a.y + 4 - P.y) < 14) {   // el escudo detiene flechas sin gastar cargas
        registrar('bloqueo', { enemigo: 'arquero', via: 'flecha', dano: 1, fuente: 'codigo' }); efectos.push({ tipo: 'chispa', x: a.x, y: a.y + 4, t: 8 }); return false;
      }
      if (Math.hypot(a.x - P.x, a.y - P.y) < P.r + 2) { recibir(1, 'arquero', 'flecha'); return false; }
      return a.t > 0 && a.x > LIM.x0 && a.x < LIM.x1 && a.y > LIM.y0 - 6 && a.y < LIM.y1;
    });
    items = items.filter(it => {
      it.t--;
      if (Math.hypot(it.x - P.x, it.y - P.y) < 10) { P.hp = Math.min(P.max, P.hp + 1); registrar('curacion', { fuente: 'corazon' }); efectos.push({ tipo: 'txt', x: P.x, y: P.y - 14, txt: '+1', col: '#f472b6', t: 40 }); window.KR && KR.beep([[784, .06], [988, .08]]); return false; }
      return it.t > 0;
    });
    efectos = efectos.filter(e => { if (e.vx !== undefined) { e.x += e.vx; e.y += e.vy; } return --e.t > 0; });
    if (estado === 'jugando' && !cola.length && !enemigos.length) {
      T.olas[ola].t1 = seg();
      if (infinito || ola < OLAS.length - 1) { estado = 'pausa'; pausa = infinito ? 90 : 110; window.KR && KR.beep([[659, .08], [880, .12]]); }
      else terminar('victoria');
    }
  }

  // ---------------------------------------------------------- especialidades
  function especialidad() {
    if (B.esp === 0) {                                        // gráficos de torta en órbita
      P.orb += nv([0, .055, .065, .08]);
      const n = nv([0, 1, 2, 3]), dn = B.nivel >= 3 ? 1.25 : .75;
      for (let i = 0; i < n; i++) {
        const a = P.orb + i * Math.PI * 2 / n, tx = P.x + Math.cos(a) * 24, ty = P.y - 4 + Math.sin(a) * 16;
        enemigos.forEach(e => {
          if (e.portal > 0 || e.golpeCd > 0 || Math.hypot(e.x - tx, e.y - ty) > e.r + 5) return;
          e.hp -= dn; e.golpeCd = 26; const d = Math.hypot(e.x - P.x, e.y - P.y) || 1; e.kx = (e.x - P.x) / d * 3; e.ky = (e.y - P.y) / d * 3;
          efectos.push({ tipo: 'chispa', x: e.x, y: e.y, t: 8 }); golpe(e, dn, 'torta');
        });
      }
    }
    if (B.esp === 2 && P.escudo < nv([0, 2, 3, 4]) && ++P.escudoT >= nv([0, 300, 240, 180])) {   // el escudo se recarga
      P.escudo++; P.escudoT = 0; efectos.push({ tipo: 'txt', x: P.x, y: P.y - 14, txt: '+ESCUDO', col: '#4ade80', t: 30 });
    }
    if (B.esp === 5 && --P.auraT <= 0) {                      // aura de interferencia
      P.auraT = nv([0, 600, 480, 360]); let n = 0;
      enemigos.forEach(e => { if (e.portal <= 0 && dist(e, P) < 72 + e.r) { e.conf = nv([0, 240, 300, 380]); n++; } });
      efectos.push({ tipo: 'aura', x: P.x, y: P.y - 3, t: 26 });
      if (n) { registrar('aura', { afectados: n, fuente: 'aura' }); efectos.push({ tipo: 'txt', x: P.x, y: P.y - 16, txt: 'INTERFERENCIA', col: '#5eead4', t: 40 }); window.KR && KR.beep([[196, .06], [294, .06], [392, .08]]); }
    }
    if (B.esp === 6 && --P.mandoT <= 0) {                     // toma de mando: un enemigo cercano pasa a tu lado
      const obj = enemigos.filter(e => e.portal <= 0 && dist(e, P) < 120).sort((a, b) => dist(a, P) - dist(b, P))[0];
      if (!obj) { P.mandoT = 30; return; }
      P.mandoT = nv([0, 660, 540, 420]);
      enemigos.splice(enemigos.indexOf(obj), 1);
      registrar('derrota', { enemigo: obj.tipo, ttk: Math.max(.1, +(seg() - obj.t0 - .6).toFixed(1)), via: 'mando', fuente: 'mando' });
      aliados.push({ tipo: 'convertido', et: obj.tipo, x: obj.x, y: obj.y, r: obj.r, v: Math.max(.8, TIPOS[obj.tipo].v * 1.2), cd: 20, atk: 0, vida: nv([0, 480, 600, 720]), dano: TIPOS[obj.tipo].dano, fase: obj.fase });
      efectos.push({ tipo: 'txt', x: obj.x, y: obj.y - 14, txt: 'A TUS ÓRDENES', col: '#fb923c', t: 44 }); window.KR && KR.beep([[392, .06], [523, .06], [659, .1]]);
    }
  }
  function aliadosActualizar() {
    aliados.forEach(a => {
      a.vida--; if (a.cd > 0) a.cd--; if (a.atk > 0) a.atk--; if (a.sube > 0) a.sube--;
      a.fase = (a.fase || 0) + .12;
      const obj = enemigos.filter(e => e.portal <= 0).sort((x, y) => dist(x, a) - dist(y, a))[0];
      const dObj = obj ? dist(obj, a) : Infinity;
      if (obj && (a.tipo !== 'companero' || dObj < 150)) {
        const alcance = a.r + obj.r + 3;
        a.fx = obj.x - a.x; a.fy = obj.y - a.y; a.mueve = dObj > alcance;
        if (dObj > alcance) { a.x += (obj.x - a.x) / dObj * a.v; a.y += (obj.y - a.y) / dObj * a.v; }
        else if (a.cd <= 0) {
          const dn = a.tipo === 'companero' ? (B.nivel >= 3 ? 1.5 : 1) : a.tipo === 'esqueleto' ? 1 : a.dano;
          obj.hp -= dn; obj.kx = (obj.x - a.x) / (dObj || 1) * 3; obj.ky = (obj.y - a.y) / (dObj || 1) * 3;
          a.cd = a.tipo === 'companero' ? nv([0, 40, 30, 24]) : 36; a.atk = 8;
          efectos.push({ tipo: 'chispa', x: obj.x, y: obj.y, t: 8 });
          golpe(obj, dn, a.tipo === 'companero' ? 'companero' : a.tipo === 'esqueleto' ? 'esqueleto' : 'mando');
        }
      } else if (a.tipo === 'companero') {                    // sin enemigos cerca: vuelve a tu lado
        const d = Math.hypot(P.x - 14 - a.x, P.y + 4 - a.y);
        a.mueve = d > 3; if (d > 3) { a.fx = P.x - 14 - a.x; a.fy = P.y + 4 - a.y; }
        if (d > 3) { a.x += (P.x - 14 - a.x) / d * Math.min(a.v, d); a.y += (P.y + 4 - a.y) / d * Math.min(a.v, d); }
      }
      limitar(a);
    });
    aliados = aliados.filter(a => {
      if (a.vida > 0) return true;
      for (let k = 0; k < 6; k++) efectos.push({ tipo: 'polvo', x: a.x, y: a.y, vx: Math.cos(k) * 1, vy: Math.sin(k) * 1, t: 16, col: a.tipo === 'esqueleto' ? '#e6e0d0' : '#f3d27f' });
      return false;
    });
  }

  // ---------------------------------------------------------- dibujo
  const suelo = document.createElement('canvas'); suelo.width = WW; suelo.height = WH;
  (function () {
    const s = suelo.getContext('2d'), Q = (x, y, w, h, c) => { s.fillStyle = c; s.fillRect(x, y, w, h); };
    Q(0, 0, WW, WH, '#0b111d');
    for (let y = LIM.y0 - 4; y < LIM.y1 + 4; y += 16) for (let x = LIM.x0 - 4; x < LIM.x1 + 4; x += 16) {
      Q(x, y, 16, 16, ((x + y) / 16) % 2 ? '#1c2436' : '#1f283c'); Q(x, y, 16, 1, '#161d2c'); Q(x, y, 1, 16, '#161d2c');
      if (Math.random() < .2) Q(x + 3 + Math.random() * 9, y + 3 + Math.random() * 9, 2, 1, '#2a3550');
    }
    const cx = WW / 2, cy = (LIM.y0 + LIM.y1) / 2 + 6;                     // sello del dato en el centro
    s.strokeStyle = 'rgba(126,200,255,.28)'; s.lineWidth = 1;
    s.beginPath(); s.ellipse(cx, cy, 46, 26, 0, 0, 7); s.stroke(); s.beginPath(); s.ellipse(cx, cy, 36, 20, 0, 0, 7); s.stroke();
    [[-12, 8], [-5, 14], [2, 6], [9, 18]].forEach(([dx, h]) => Q(cx + dx, cy + 8 - h, 5, h, 'rgba(126,200,255,.22)'));
    for (let x = 0; x < WW; x += 12) { Q(x, 0, 12, LIM.y0 - 4, (x / 12) % 2 ? '#2c3650' : '#27304a'); Q(x, LIM.y0 - 8, 12, 1, '#1a2032'); Q(x + 6, 12, 1, LIM.y0 - 16, '#1f2740'); }
    Q(0, LIM.y0 - 5, WW, 2, '#3a4668');
    Q(0, 0, LIM.x0 - 4, WH, '#161d2e'); Q(LIM.x1 + 4, 0, WW, WH, '#161d2e'); Q(0, LIM.y1 + 4, WW, WH, '#161d2e');
    Q(LIM.x0 - 5, LIM.y0 - 4, 1, LIM.y1 - LIM.y0 + 8, '#3a4668'); Q(LIM.x1 + 4, LIM.y0 - 4, 1, LIM.y1 - LIM.y0 + 8, '#3a4668');
  })();
  const ANTORCHAS = [60, 160, WW - 160, WW - 60];
  const balas = [];

  function heroe() {
    if (P.inv > 0 && Math.floor(P.inv / 5) % 2) return;
    const x = Math.round(P.x), y = Math.round(P.y), pies = y + 5, d = direccion(P.fx, P.fy);
    elipse(x, pies, 6, 2, 'rgba(0,0,0,.35)');
    let ok;
    if (P.esp > 0) ok = sprite(SPR.onda, 0, Math.min(5, Math.floor((18 - P.esp) / 3)), x, pies);                  // onda expansiva
    else if (P.atk > 0 && B.esp !== 4) ok = sprite(SPR.espada, d, Math.min(2, Math.floor((8 - P.atk) / 8 * 3)), x, pies);
    else if (P.mueve) ok = sprite(SPR.camina, d, CICLO[(f >> 3) % 4], x, pies);
    else ok = sprite(SPR.idle, d, CICLO[(f >> 4) % 4], x, pies);
    if (!ok) { R(x - 4, y - 6, 8, 10, '#15294a'); R(x - 3, y - 12, 6, 6, '#f1c9a0'); }                           // mientras cargan las imágenes
    if (B.esp === 3) {                                        // robot de IA
      const rx = Math.round(x + Math.cos(P.dronA) * 14), ry = Math.round(y - 12 + Math.sin(P.dronA) * 6);
      R(rx, ry - 6, 1, 2, '#9aa3b5'); R(rx, ry - 7, 1, 1, (f >> 4) % 2 ? '#f87171' : '#fecaca');
      R(rx - 3, ry - 4, 7, 5, '#b8c0cf'); R(rx - 3, ry - 4, 7, 1, '#e2e8f0'); R(rx - 2, ry - 3, 5, 2, '#1e293b');
      R(rx - 1, ry - 3, 1, 1, '#a78bfa'); R(rx + 1, ry - 3, 1, 1, '#a78bfa');
      R(rx - 2, ry + 1, 5, 3, '#8a93a5'); R(rx - 4, ry + 1, 1, 2, '#8a93a5'); R(rx + 4, ry + 1, 1, 2, '#8a93a5');
    }
    if (B.esp === 0) {                                        // gráficos de torta en órbita
      const n = nv([0, 1, 2, 3]), cols = ['#e0b756', '#7ec8ff', '#f472b6'];
      for (let i = 0; i < n; i++) {
        const a = P.orb + i * Math.PI * 2 / n, tx = x + Math.cos(a) * 24, ty = y - 4 + Math.sin(a) * 16, giro = f * .12;
        elipse(Math.round(tx), Math.round(ty) + 6, 4, 1, 'rgba(0,0,0,.3)');
        cols.forEach((c, j) => { g.fillStyle = c; g.beginPath(); g.moveTo(tx, ty); g.arc(tx, ty, 5, giro + j * 2.1, giro + j * 2.1 + (j === 0 ? 2.6 : 1.8)); g.closePath(); g.fill(); });
        g.strokeStyle = '#0b111d'; g.lineWidth = 1; g.beginPath(); g.arc(tx, ty, 5, 0, 7); g.stroke();
      }
    }
    if (B.esp === 2 && P.escudo > 0) {                        // escudo de código tipo Matrix
      const n = 10 + P.escudo * 4;
      for (let i = 0; i < n; i++) {
        const a = f * .025 + i * Math.PI * 2 / n, cx = Math.round(x + Math.cos(a) * 12), cy = Math.round(y - 4 + Math.sin(a) * 10);
        const cae = (f + i * 7) % 6;
        R(cx, cy - 3, 1, 5, 'rgba(34,197,94,.45)'); R(cx, cy - 3 + cae % 5, 1, 1, '#bbf7d0');
      }
    }
  }
  function enemigo(e) {
    const x = Math.round(e.x), y = Math.round(e.y);
    if (e.portal > 0) { const k = e.portal / 36; g.strokeStyle = `rgba(167,139,250,${1 - k})`; g.lineWidth = 1; g.beginPath(); g.ellipse(x, y + 3, 10 * (1 - k) + 2, 5 * (1 - k) + 1, 0, 0, 7); g.stroke(); return; }
    elipse(x, y + e.r - 1, e.r, 2, 'rgba(0,0,0,.35)');
    if (e.tipo === 'slime') {
      const s = Math.sin(e.fase) * 1.2;
      R(x - 4, y - 6 + s, 8, 2, '#6bd49a'); R(x - 6, y - 4 + s, 12, 6 - s, '#57c087'); R(x - 5, y - 5 + s, 3, 1, '#b8f5d2');
      R(x - 3, y - 2 + s, 1, 2, '#071428'); R(x + 2, y - 2 + s, 1, 2, '#071428');
    }
    if (e.tipo === 'murcielago') {
      const a = Math.sin(e.fase * 2.4) > 0 ? -2 : 1, yy = y - 6;
      R(x - 2, yy - 2, 4, 4, '#6d4fb8'); R(x - 1, yy - 3, 1, 1, '#6d4fb8'); R(x + 1, yy - 3, 1, 1, '#6d4fb8');
      R(x - 7, yy - 1 + a, 5, 2, '#a78bfa'); R(x + 2, yy - 1 + a, 5, 2, '#a78bfa'); R(x - 8, yy + a, 1, 2, '#a78bfa'); R(x + 7, yy + a, 1, 2, '#a78bfa');
      R(x - 1, yy - 1, 1, 1, '#ff5a5a'); R(x + 1, yy - 1, 1, 1, '#ff5a5a');
    }
    if (e.tipo === 'arquero') {
      const apunta = e.cd < 22;
      R(x - 2, y - 4, 4, 6, '#cfc8b6'); R(x - 2, y - 3, 4, 1, '#8a8474'); R(x - 2, y - 1, 4, 1, '#8a8474'); R(x - 2, y + 2, 1, 3, '#cfc8b6'); R(x + 1, y + 2, 1, 3, '#cfc8b6');
      R(x - 3, y - 10, 6, 6, '#e6e0d0'); R(x - 2, y - 8, 1, 2, '#1a1a22'); R(x + 1, y - 8, 1, 2, '#1a1a22');
      g.strokeStyle = apunta ? '#f3d27f' : '#8a5a2e'; g.lineWidth = 1; g.beginPath(); g.arc(x + 4, y - 3, 5, -1.3, 1.3); g.stroke();
      if (apunta) R(x + 8, y - 4, 2, 2, '#fff5c4');
    }
    if (e.tipo === 'golem') {
      const tiembla = e.modo === 'carga' ? Math.round(Math.sin(f * 1.3)) : 0, rojo = e.modo === 'carga' || e.modo === 'embiste';
      const xx = x + tiembla;
      R(xx - 9, y - 16, 18, 15, '#7d8290'); R(xx - 9, y - 16, 18, 2, '#9aa0ad'); R(xx - 13, y - 13, 4, 9, '#6b707c'); R(xx + 9, y - 13, 4, 9, '#6b707c');
      R(xx - 6, y - 1, 5, 4, '#6b707c'); R(xx + 1, y - 1, 5, 4, '#6b707c'); R(xx - 4, y - 9, 3, 1, '#5a5f6a'); R(xx + 3, y - 6, 4, 1, '#5a5f6a'); R(xx - 7, y - 15, 3, 1, '#4f8a4f');
      R(xx - 5, y - 12, 3, 2, rojo ? '#ff5a5a' : '#7ec8ff'); R(xx + 2, y - 12, 3, 2, rojo ? '#ff5a5a' : '#7ec8ff');
      if (e.modo === 'recupera') R(xx - 2, y - 22, 4, 2, 'rgba(243,210,127,.8)');
    }
    if (e.conf > 0) { for (let k = 0; k < 3; k++) { const a = f * .2 + k * 2.1; R(x + Math.cos(a) * 5, y - e.r * 2 - 6 + Math.sin(a) * 2, 2, 2, (e.conf >> 3) % 2 ? '#5eead4' : '#a78bfa'); } }
    if (e.hp < e.hpMax) { const w = e.r * 2; R(x - e.r, y - e.r * 2 - 8, w, 2, 'rgba(0,0,0,.6)'); R(x - e.r, y - e.r * 2 - 8, w * Math.max(0, e.hp) / e.hpMax, 2, '#f87171'); }
  }
  function aliado(a) {
    const x = Math.round(a.x), y = Math.round(a.y);
    if (a.tipo === 'convertido') {                            // enemigo bajo tu mando: su sprite con una corona dorada
      enemigo({ tipo: a.et, x: a.x, y: a.y, r: a.r, hp: 1, hpMax: 1, fase: a.fase, portal: 0, modo: 'camina', cd: 60, conf: 0 });
      const alto = a.et === 'golem' ? 26 : a.et === 'murcielago' ? 14 : 16;
      R(x - 3, y - alto, 7, 2, '#f3d27f'); R(x - 3, y - alto - 2, 1, 2, '#f3d27f'); R(x, y - alto - 3, 1, 3, '#f3d27f'); R(x + 3, y - alto - 2, 1, 2, '#f3d27f');
      if (a.vida < 90 && (a.vida >> 3) % 2) R(x - 3, y - alto, 7, 2, '#fff5c4');
      return;
    }
    elipse(x, y + 5, 4, 2, 'rgba(0,0,0,.35)');
    if (a.tipo === 'companero') {                             // compañero pixel art
      // la compañera del equipo: daga al atacar, camina o espera mirando a su objetivo
      const d = direccion(a.fx || 0, a.fy || 1), pies = y + 5;
      if (a.atk > 0) sprite(SPR.mDaga, d, Math.min(2, Math.floor((8 - a.atk) / 8 * 3)), x, pies);
      else if (a.mueve) sprite(SPR.mCamina, d, CICLO[(f >> 3) % 4], x, pies);
      else sprite(SPR.mIdle, d, CICLO[(f >> 4) % 4], x, pies);
      return;
    }
    // esqueleto invocado (Gestión): sale del suelo, ojos verdes para distinguirlo de los arqueros
    const s = a.sube > 0 ? a.sube : 0, yy = y + s * .5;
    R(x - 2, yy - 4, 4, 6, '#e6e0d0'); R(x - 2, yy - 3, 4, 1, '#9a9484'); R(x - 2, yy - 1, 4, 1, '#9a9484');
    R(x - 2, yy + 2, 1, 3, '#e6e0d0'); R(x + 1, yy + 2, 1, 3, '#e6e0d0');
    R(x - 3, yy - 10, 6, 6, '#f5f1e6'); R(x - 2, yy - 8, 1, 2, '#22c55e'); R(x + 1, yy - 8, 1, 2, '#22c55e');
    R(x + 3, yy - 6 + (a.atk > 0 ? 2 : 0), 1, 6, '#cbd5e1');
    if (a.vida < 90 && (a.vida >> 3) % 2) R(x - 3, yy - 10, 6, 6, 'rgba(255,255,255,.5)');
  }
  function dibujarMundo() {
    g.drawImage(suelo, 0, 0);
    ANTORCHAS.forEach(x => {
      const fl = (f >> 2) % 3;
      R(x - 1, 18, 3, 6, '#3a3040'); R(x - 1, 14 - (fl === 1 ? 1 : 0), 3, 4, '#ffb347'); R(x, 13 - fl % 2, 1, 2, '#fff5c4');
      const gr = g.createRadialGradient(x, 16, 0, x, 16, 40); gr.addColorStop(0, 'rgba(255,180,90,.22)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - 40, 0, 80, 60);
    });
    items.forEach(it => { if (it.t > 120 || (it.t >> 3) % 2) { R(it.x - 2, it.y - 3, 2, 2, '#f472b6'); R(it.x + 1, it.y - 3, 2, 2, '#f472b6'); R(it.x - 3, it.y - 2, 7, 2, '#f472b6'); R(it.x - 2, it.y, 5, 1, '#f472b6'); R(it.x - 1, it.y + 1, 3, 1, '#f472b6'); } });
    const orden = [...enemigos.map(e => ({ y: e.y, d: () => enemigo(e) })), ...aliados.map(a => ({ y: a.y, d: () => aliado(a) })), { y: P.y, d: heroe }].sort((a, b) => a.y - b.y);
    orden.forEach(o => o.d());
    balas.forEach(bl => { R(bl.x - 1, bl.y - 1, 3, 3, '#7ec8ff'); R(bl.x, bl.y, 1, 1, '#ffffff'); });
    flechas.forEach(a => { const n = Math.hypot(a.vx, a.vy); g.strokeStyle = '#e6e0d0'; g.lineWidth = 1; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(a.x - a.vx / n * 6, a.y - a.vy / n * 6); g.stroke(); R(a.x - 1, a.y - 1, 2, 2, '#cad6e5'); });
    efectos.forEach(e => {
      if (e.tipo === 'chispa') for (let i = 0; i < 6; i++) { const a = i * 1.05; R(e.x + Math.cos(a) * (12 - e.t), e.y - 4 + Math.sin(a) * (12 - e.t), 2, 2, '#fff'); }
      if (e.tipo === 'polvo') R(e.x, e.y - 4, 2, 2, e.col);
      if (e.tipo === 'aura') { const k = 1 - e.t / 26; g.strokeStyle = `rgba(94,234,212,${e.t / 26})`; g.lineWidth = 2; g.beginPath(); g.ellipse(e.x, e.y, 8 + k * 66, 5 + k * 42, 0, 0, 7); g.stroke(); }
    });
  }
  function texto(txt, x, y, tam, col, alin) { ctx.font = `${tam}px "Press Start 2P", monospace`; ctx.fillStyle = col; ctx.textAlign = alin || 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x, y); }
  function dibujar() {
    if (estado === 'intro') {
      g.drawImage(suelo, 0, 0);
      ctx.imageSmoothingEnabled = false; ctx.drawImage(buf, 0, 0, W, H);
      ctx.fillStyle = 'rgba(4,10,22,.8)'; ctx.fillRect(0, 0, W, H);
      texto(infinito ? 'OLEADAS INFINITAS' : 'ARENA DEL DATO', W / 2, 84, 26, infinito ? '#ffd400' : '#f3d27f');
      ctx.font = '16px Geist, sans-serif'; ctx.fillStyle = '#e6eefc'; ctx.textAlign = 'center';
      ctx.fillText(infinito ? `¿Hasta qué oleada llegas? Tu récord: ${record} oleada(s) superada(s).` : 'Cada golpe que des o recibas se registrará como un dato.', W / 2, 132);
      ctx.fillText(infinito ? 'Cada oleada trae más enemigos y más resistentes. Tus habilidades del árbol te acompañan.' : 'Sobrevive a 3 oleadas y luego analiza tu desempeño como un analista.', W / 2, 158);
      ctx.font = '13px Geist, sans-serif'; ctx.fillStyle = '#9dffc0';
      ctx.fillText(`⚔ Ataque ${B.ataque.toFixed(2).replace('.', ',')} · ❤ Vida ${B.vidaMax} · ⚡ Energía ${B.energiaMax} · 💨 Cadencia ${B.cd} · ✦ ${B.esp >= 0 ? ESP[B.esp] + ' nv. ' + B.nivel : 'Sin especialidad'} · 🛡 Bloqueo ${Math.round(B.bloqueo * 100)}% · ✚ Curación ${Math.round(B.cura * 100)}%`, W / 2, 182);
      const tipos = Object.keys(TIPOS);
      tipos.forEach((k, i) => {
        const cx = W / 2 - 270 + i * 180;
        ctx.fillStyle = 'rgba(13,33,68,.8)'; ctx.fillRect(cx - 70, 200, 140, 130); ctx.strokeStyle = 'rgba(224,183,86,.5)'; ctx.strokeRect(cx - 70, 200, 140, 130);
        g.clearRect(0, 0, 40, 40); const e = { tipo: k, x: 20, y: 30, r: TIPOS[k].r, hp: TIPOS[k].hp, hpMax: TIPOS[k].hp, fase: f / 10, portal: 0, modo: 'camina', cd: 60 };
        g.save(); g.fillStyle = '#1f283c'; g.fillRect(0, 0, 40, 40); enemigo(e); g.restore();
        ctx.drawImage(buf, 0, 0, 40, 40, cx - 40, 208, 80, 80);
        ctx.font = '600 13px Geist, sans-serif'; ctx.fillStyle = '#f3d27f'; ctx.fillText(TIPOS[k].nombre, cx, 300);
        ctx.font = '12px Geist, sans-serif'; ctx.fillStyle = '#cad6e5'; ctx.fillText(['Lento, en grupo', 'Rápido y errático', 'Dispara a distancia', 'Embiste (2 de daño)'][i], cx, 318);
      });
      ctx.font = '14px Geist, sans-serif'; ctx.fillStyle = '#cad6e5'; ctx.fillText(B.esp === 4 ? 'Mover: WASD o flechas · Invocar esqueleto: Espacio o J · Onda de energía: K o botón B' : 'Mover: WASD o flechas · Atacar: Espacio o J · Onda de energía: K o botón B (40 de energía)', W / 2, 372);
      if ((f >> 5) % 2) texto('PRESIONA ENTER PARA COMENZAR', W / 2, 430, 12, '#f3d27f');
      f++;
      return;
    }
    dibujarMundo();
    ctx.imageSmoothingEnabled = false; ctx.drawImage(buf, 0, 0, W, H);
    // interfaz
    for (let i = 0; i < P.max; i++) texto('♥', 24 + i * 22, 24, 15, i < P.hp ? '#f472b6' : 'rgba(255,255,255,.2)', 'center');
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(14, 42, 150, 8); ctx.fillStyle = P.en >= 40 ? '#7ec8ff' : '#3a6a99'; ctx.fillRect(14, 42, 150 * P.en / B.energiaMax, 8);
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(14 + 150 * 40 / B.energiaMax, 40, 1, 12); texto('⚡', 176, 47, 9, '#7ec8ff');
    texto(infinito ? `OLEADA ${ola + 1} · RÉCORD ${record}` : `OLEADA ${ola + 1}/3`, W / 2, 24, 12, infinito ? '#ffd400' : '#cad6e5');
    const ev = T.eventos;
    const cuenta = tipo => ev.filter(x => x.tipo === tipo).length;
    ctx.fillStyle = 'rgba(5,14,29,.75)'; ctx.fillRect(W - 300, 10, 290, 50);
    ctx.font = '12px Geist, sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#e6eefc';
    ctx.fillText(`Golpes dados ${cuenta('golpe')} · Recibidos ${cuenta('recibido')}`, W - 290, 28);
    ctx.fillText(`Derrotados ${cuenta('derrota')} · Eventos ${ev.length}`, W - 290, 47);
    if ((f >> 4) % 2) { ctx.fillStyle = '#f87171'; ctx.beginPath(); ctx.arc(W - 318, 24, 6, 0, 7); ctx.fill(); }
    texto('REC', W - 318, 44, 7, '#f87171');
    efectos.forEach(e => { if (e.tipo === 'txt') { ctx.globalAlpha = Math.min(1, e.t / 20); texto(e.txt, e.x * S, (e.y - (40 - e.t) * .4) * S, 9, e.col); ctx.globalAlpha = 1; } });
    if (estado === 'pausa') { ctx.fillStyle = 'rgba(4,10,22,.6)'; ctx.fillRect(0, H / 2 - 40, W, 80); texto(`¡OLEADA ${ola + 1} SUPERADA!`, W / 2, H / 2 - 8, 16, '#6bd49a'); texto('Prepárate para la siguiente', W / 2, H / 2 + 20, 9, '#cad6e5'); }
    if (estado === 'fin') {
      ctx.fillStyle = `rgba(4,10,22,${Math.min(.85, finT / 60)})`; ctx.fillRect(0, 0, W, H);
      if (infinito) texto(`LLEGASTE A LA OLEADA ${ola + 1}`, W / 2, H / 2 - 30, 24, ola > record ? '#ffd400' : '#f3d27f');
      else texto(T.resultado === 'victoria' ? '¡VICTORIA!' : 'HAS CAÍDO', W / 2, H / 2 - 30, 28, T.resultado === 'victoria' ? '#6bd49a' : '#f87171');
      if (infinito && ola > record) texto('¡NUEVO RÉCORD!', W / 2, H / 2 - 64, 12, '#ffd400');
      texto(`${T.eventos.length} eventos registrados`, W / 2, H / 2 + 14, 11, '#e6eefc');
      if ((f >> 4) % 2) texto('Generando informe de jugabilidad...', W / 2, H / 2 + 44, 9, '#7ec8ff');
    }
  }

  function bucle() {
    if (estado === 'jugando') actualizar();
    else if (estado === 'pausa') { f++; if (--pausa <= 0) { ola++; estado = 'jugando'; empezarOla(); } }
    else if (estado === 'fin') { f++; if (++finT === 150 && alTerminar) alTerminar(T); }
    dibujar();
    raf = activo ? requestAnimationFrame(bucle) : 0;
  }
  return {
    iniciar(cb, op) { op = op || {}; B = Object.assign({}, BASE, op.bonos || {}); infinito = !!op.infinito; record = op.record || 0; alTerminar = cb; estado = 'intro'; f = 0; activo = true; if (!raf) raf = requestAnimationFrame(bucle); cv.focus({ preventScroll: true }); },
    pausar() { activo = false; Object.keys(K).forEach(k => K[k] = false); },
    reanudar(sinFoco) { if (!activo) { activo = true; if (!raf) raf = requestAnimationFrame(bucle); if (!sinFoco) cv.focus({ preventScroll: true }); } },
    get estado() { return estado; },
    detener() { activo = false; estado = 'intro'; },
    TIPOS, COLS, FILAS, BASE, ESP,
  };
  }
  window.KRCrearBatalla = crear;
  const cvArcade = document.getElementById('batalla-canvas');
  if (cvArcade) window.KRBatalla = crear(cvArcade);
})();

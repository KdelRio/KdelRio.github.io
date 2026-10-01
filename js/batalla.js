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
  if (window.KRTema) KRTema.diaEn(ctx);                          // interfaz de día en la página con tema claro (el mundo no cambia)
  const buf = document.createElement('canvas'); buf.width = WW; buf.height = WH;
  const g = buf.getContext('2d');
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  function elipse(cx, cy, rx, ry, c) { for (let y = -ry; y <= ry; y++) { const h = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry)))); R(cx - h, cy + y, h * 2, 1, c); } }
  const LIM = { x0: 20, y0: 40, x1: WW - 20, y1: WH - 14 };
  const COLS = 16, FILAS = 9;

  const TIPOS = {
    slime: { nombre: 'Slime', hp: 2, v: .42, r: 6, dano: 1, col: '#6bd49a', desc: 'Lento, en grupo' },
    murcielago: { nombre: 'Murciélago', hp: 1, v: .95, r: 5, dano: 1, col: '#a78bfa', desc: 'Rápido y errático' },
    arquero: { nombre: 'Arquero esqueleto', hp: 2, v: .55, r: 6, dano: 1, col: '#e6e0d0', desc: 'Dispara a distancia' },
    golem: { nombre: 'Gólem de piedra', hp: 6, v: .32, r: 10, dano: 2, col: '#8a8f9a', desc: 'Embiste (2 de daño)' },
    hongo: { nombre: 'Hongo saltarín', hp: 3, v: .5, r: 6, dano: 1, col: '#e0664f', desc: 'Salta hacia ti' },
    lobo: { nombre: 'Lobo sombrío', hp: 2, v: .7, r: 7, dano: 1, col: '#9aa3b5', desc: 'Se agazapa y se lanza' },
    arana: { nombre: 'Araña de cristal', hp: 2, v: 1, r: 5, dano: 1, col: '#7ec8ff', desc: 'Corre a tirones' },
    zombi: { nombre: 'Zombi', hp: 5, v: .28, r: 6, dano: 1, col: '#7fae6b', desc: 'Lento y resistente' },
    fantasma: { nombre: 'Fantasma', hp: 2, v: .5, r: 6, dano: 1, col: '#dbe9ff', desc: 'A ratos es intangible' },
    diablillo: { nombre: 'Diablillo de fuego', hp: 2, v: .6, r: 5, dano: 1, col: '#fb923c', desc: 'Lanza bolas de fuego' },
  };
  // modo misión: bosque, cueva y cementerio, cada uno con su fauna
  const OLAS = [
    ['slime', 'hongo', 'slime', 'lobo', 'slime', 'hongo', 'lobo'],
    ['murcielago', 'arana', 'murcielago', 'arana', 'golem', 'murcielago', 'arana', 'arana', 'murcielago'],
    ['zombi', 'arquero', 'fantasma', 'zombi', 'arquero', 'fantasma', 'zombi', 'arquero', 'fantasma', 'zombi'],
  ];

  const BASE = { ataque: 1, vidaMax: 8, cd: 18, vel: 1.45, energiaMax: 60, regen: .12, bloqueo: 0, invul: 0, cura: .14, regenVida: false, esp: -1, nivel: 0 };
  const ESP = ['Gráfico de torta', 'Compañero pixel', 'Escudo de código', 'Robot de IA', 'Invocar esqueletos', 'Aura de interferencia', 'Toma de mando'];
  const nv = arr => arr[Math.min(3, B.nivel)];            // valor según el nivel de la especialidad (índice 1 a 3)
  let B = BASE, infinito = false, record = 0;
  let entrada = 0, anuncio = 0;
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
    // la fauna del mapa de turno; después de la primera vuelta a los mapas se suman intrusos de otros lugares
    const m = mapaDe(n - 1), vueltas = Math.floor((n - 1) / MAPAS.length);
    const intrusos = Object.keys(TIPOS).filter(t => !m.enemigos.includes(t)).sort(() => Math.random() - .5).slice(0, Math.min(4, vueltas * 2));
    const tipos = m.enemigos.concat(intrusos), lista = [];
    const total = Math.min(30, 6 + n * 2);
    for (let i = 0; i < Math.floor(n / 3); i++) lista.push(m.fuerte);
    while (lista.length < total) lista.push(tipos[Math.floor(Math.random() * tipos.length)]);
    return lista.sort(() => Math.random() - .5);
  }
  function empezarOla() {
    T.olas[ola] = { n: ola + 1, t0: seg(), t1: null, mapa: mapaDe(ola).nombre };
    entrada = 40; anuncio = 170;
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
    enemigos.push({ tipo, x, y, r: b.r, hp: b.hp * esc, hpMax: b.hp * esc, v: b.v * (infinito ? 1 + Math.min(.5, .03 * ola) : 1), kx: 0, ky: 0, fase: Math.random() * 6, portal: 36, t0: seg(), cd: 90 + Math.random() * 50, modo: 'camina', mt: { hongo: 30, lobo: 60, arana: 20 }[tipo] ?? 150 + Math.random() * 60, dx: 0, dy: 0, golpes: 0, conf: 0, golpeCd: 0, lat: 0, salto: 0, mira: 1, etereo: false });
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
  const fuera = e => e.portal > 0 || e.etereo;              // aún aparece o es un fantasma intangible: no se le puede golpear
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
        if (fuera(e)) return;
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
          if (fuera(e)) return;
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
        const obj = enemigos.filter(e => !fuera(e)).sort((a, b) => Math.hypot(a.x - dx0, a.y - dy0) - Math.hypot(b.x - dx0, b.y - dy0))[0];
        if (obj && Math.hypot(obj.x - dx0, obj.y - dy0) < 140) {
          const d = Math.hypot(obj.x - dx0, obj.y - dy0) || 1;
          balas.push({ x: dx0, y: dy0, vx: (obj.x - dx0) / d * 3.2, vy: (obj.y - dy0) / d * 3.2, t: 60 });
          P.dronCd = nv([0, 85, 60, 42]);
        } else P.dronCd = 10;
      }
    }
    balas.forEach(bl => {
      bl.x += bl.vx; bl.y += bl.vy; bl.t--;
      const e = enemigos.find(x => !fuera(x) && Math.hypot(x.x - bl.x, x.y - bl.y) < x.r + 2);
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
        const otro = enemigos.filter(o => o !== e && !fuera(o)).sort((a, b) => dist(a, e) - dist(b, e))[0];
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
      if (e.tipo === 'hongo') {                               // descansa y salta hacia ti
        if (--e.mt <= 0) { if (e.modo === 'salta') { e.modo = 'camina'; e.mt = 40 + Math.random() * 30; } else { e.modo = 'salta'; e.mt = 26; e.dx = ux; e.dy = uy; } }
        if (e.modo === 'salta') { e.x += e.dx * e.v * 2.6; e.y += e.dy * e.v * 2.6; }
        e.salto = e.modo === 'salta' ? Math.round(Math.sin((26 - e.mt) / 26 * Math.PI) * 7) : 0;
      }
      if (e.tipo === 'lobo') {                                // se agazapa y se lanza en línea recta
        e.mt--;
        if (e.modo === 'camina') { e.x += ux * e.v; e.y += uy * e.v; if (d < 80 && e.mt <= 0) { e.modo = 'carga'; e.mt = 22; e.dx = ux; e.dy = uy; } }
        else if (e.modo === 'carga') { if (e.mt <= 0) { e.modo = 'embiste'; e.mt = 16; } }
        else if (e.modo === 'embiste') { e.x += e.dx * 3.6; e.y += e.dy * 3.6; if (e.mt <= 0) { e.modo = 'recupera'; e.mt = 34; } }
        else if (e.mt <= 0) { e.modo = 'camina'; e.mt = 70 + Math.random() * 40; }
        e.mira = (e.modo === 'carga' || e.modo === 'embiste' ? e.dx : ux) >= 0 ? 1 : -1;
      }
      if (e.tipo === 'arana') {                               // tirones cortos y en diagonal, con pausas
        if (--e.mt <= 0) { if (e.modo === 'camina') { e.modo = 'recupera'; e.mt = 16; } else { e.modo = 'camina'; e.mt = 28; e.lat = Math.random() * 2 - 1; } }
        if (e.modo === 'camina') { e.x += (ux - uy * e.lat) * e.v * 1.7; e.y += (uy + ux * e.lat) * e.v * 1.7; }
      }
      if (e.tipo === 'zombi') { const k = d < 34 ? 2.2 : 1; e.x += ux * e.v * k; e.y += uy * e.v * k; e.mira = ux >= 0 ? 1 : -1; }
      if (e.tipo === 'fantasma') {                            // flota hacia ti y a ratos se vuelve intangible
        if (--e.mt <= 0) { e.etereo = !e.etereo; e.mt = e.etereo ? 70 : 150 + Math.random() * 60; }
        const s = Math.sin(f * .05 + e.fase) * .6; e.x += (ux - uy * s) * e.v; e.y += (uy + ux * s) * e.v;
      }
      if (e.tipo === 'diablillo') {                           // guarda distancia y lanza bolas de fuego lentas
        const m = d < 80 ? -1 : d > 140 ? 1 : 0, c = Math.cos(e.fase * .25);
        e.x += ux * e.v * m + uy * e.v * .6 * c; e.y += uy * e.v * m - ux * e.v * .6 * c;
        if (--e.cd <= 0) { flechas.push({ x: e.x, y: e.y - 6, vx: ux * 1.35, vy: uy * 1.35, t: 240, fuego: true }); e.cd = 150 + Math.random() * 60; registrar('disparo', { enemigo: 'diablillo' }); }
      }
      e.x += e.kx; e.y += e.ky; e.kx *= .78; e.ky *= .78; limitar(e);
      if (d < e.r + P.r && !e.etereo) recibir(TIPOS[e.tipo].dano, e.tipo, (e.tipo === 'golem' || e.tipo === 'lobo') && e.modo === 'embiste' ? 'embestida' : 'contacto', e);
    });
    aliadosActualizar();
    for (let i = 0; i < enemigos.length; i++) for (let j = i + 1; j < enemigos.length; j++) {           // separación
      const a = enemigos[i], b = enemigos[j], d = dist(a, b), m = a.r + b.r;
      if (a.tipo === 'fantasma' || b.tipo === 'fantasma') continue;   // los fantasmas atraviesan a los demás
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
        registrar('bloqueo', { enemigo: a.fuego ? 'diablillo' : 'arquero', via: a.fuego ? 'fuego' : 'flecha', dano: 1, fuente: 'codigo' }); efectos.push({ tipo: 'chispa', x: a.x, y: a.y + 4, t: 8 }); return false;
      }
      if (Math.hypot(a.x - P.x, a.y - P.y) < P.r + (a.fuego ? 3 : 2)) { recibir(1, a.fuego ? 'diablillo' : 'arquero', a.fuego ? 'fuego' : 'flecha'); return false; }
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
          if (fuera(e) || e.golpeCd > 0 || Math.hypot(e.x - tx, e.y - ty) > e.r + 5) return;
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
      enemigos.forEach(e => { if (!fuera(e) && dist(e, P) < 72 + e.r) { e.conf = nv([0, 240, 300, 380]); n++; } });
      efectos.push({ tipo: 'aura', x: P.x, y: P.y - 3, t: 26 });
      if (n) { registrar('aura', { afectados: n, fuente: 'aura' }); efectos.push({ tipo: 'txt', x: P.x, y: P.y - 16, txt: 'INTERFERENCIA', col: '#5eead4', t: 40 }); window.KR && KR.beep([[196, .06], [294, .06], [392, .08]]); }
    }
    if (B.esp === 6 && --P.mandoT <= 0) {                     // toma de mando: un enemigo cercano pasa a tu lado
      const obj = enemigos.filter(e => !fuera(e) && dist(e, P) < 120).sort((a, b) => dist(a, P) - dist(b, P))[0];
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
      const obj = enemigos.filter(e => !fuera(e)).sort((x, y) => dist(x, a) - dist(y, a))[0];
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
  // ---------------------------------------------------------- mapas: cada oleada se juega en un lugar distinto
  // pintar() arma el suelo fijo una sola vez (con azar de semilla, siempre igual); decor() anima lo que va bajo los
  // personajes y sobre() lo que va encima (niebla, oscuridad, nieve...). El campo de juego es LIM; lo demás es borde.
  function semilla(s) { return () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const CX = WW / 2, CY = (LIM.y0 + LIM.y1) / 2 + 6;
  const disco = (Q, cx, cy, r, c) => { for (let y = -r; y <= r; y++) { const h = Math.round(Math.sqrt(r * r - y * y)); Q(cx - h, cy + y, h * 2, 1, c); } };
  const ovalo = (Q, cx, cy, rx, ry, c) => { for (let y = -ry; y <= ry; y++) { const h = Math.round(rx * Math.sqrt(1 - y * y / (ry * ry))); Q(cx - h, cy + y, h * 2, 1, c); } };
  const baldosas = (Q, rnd, t, tonos, junta) => {
    for (let y = LIM.y0 - 4; y < LIM.y1 + 4; y += t) for (let x = LIM.x0 - 4; x < LIM.x1 + 4; x += t) {
      Q(x, y, t, t, tonos[rnd() * tonos.length | 0]); if (junta) { Q(x, y, t, 1, junta); Q(x, y, 1, t, junta); }
    }
  };
  const alAzar = rnd => [LIM.x0 + 4 + rnd() * (LIM.x1 - LIM.x0 - 8) | 0, LIM.y0 + 4 + rnd() * (LIM.y1 - LIM.y0 - 8) | 0];
  const bordes = (Q, c) => { Q(0, 0, WW, LIM.y0 - 4, c); Q(0, 0, LIM.x0 - 4, WH, c); Q(LIM.x1 + 4, 0, WW, WH, c); Q(0, LIM.y1 + 4, WW, WH, c); };
  const particulas = (m, n, crear) => m.p || (m.p = Array.from({ length: n }, () => crear()));

  const MAPAS = [
    { nombre: 'El bosque', enemigos: ['slime', 'hongo', 'lobo'], fuerte: 'lobo', semilla: 11,
      pintar(Q, rnd) {
        Q(0, 0, WW, WH, '#123018');
        baldosas(Q, rnd, 8, ['#2f6b3a', '#326f3d', '#2b6435']);
        for (let y = -34; y <= 34; y += 2) { const h = Math.round(92 * Math.sqrt(1 - y * y / 1156)); for (let x = -h; x < h; x += 2) if (rnd() < .9) Q(CX + x, CY + y, 2, 2, rnd() < .5 ? '#6b5236' : '#77603f'); }
        for (let i = 0; i < 26; i++) Q(CX - 80 + rnd() * 160 | 0, CY - 26 + rnd() * 52 | 0, 2, 1, '#8a7250');
        const claro = (x, y) => Math.hypot((x - CX) / 96, (y - CY) / 38) < 1;
        for (let i = 0; i < 260; i++) { const [x, y] = alAzar(rnd); if (claro(x, y)) continue; Q(x, y, 1, 2, '#4c9a52'); Q(x + 1, y - 1, 1, 3, '#5fb164'); Q(x + 2, y, 1, 2, '#4c9a52'); }
        for (let i = 0; i < 60; i++) { const [x, y] = alAzar(rnd); if (claro(x, y)) continue; Q(x, y, 2, 2, ['#f472b6', '#fde68a', '#ffffff', '#a78bfa'][i % 4]); Q(x + 1, y + 2, 1, 1, '#2e8a57'); }
        for (let x = -10; x < WW + 10; x += 18 + (rnd() * 12 | 0)) { Q(x + 4, 16, 5, LIM.y0 - 16, '#3a2a1c'); Q(x + 4, 16, 1, LIM.y0 - 16, '#4f3a26'); }
        for (let x = -10; x < WW + 16; x += 14 + (rnd() * 8 | 0)) { const y = 6 + (rnd() * 10 | 0), r = 11 + (rnd() * 5 | 0); disco(Q, x, y, r, '#1f4a2a'); disco(Q, x - 2, y - 2, r - 3, '#2a6035'); disco(Q, x - 4, y - 4, Math.max(2, r - 8), '#357a41'); }
        const mata = (x, y) => { disco(Q, x, y, 7, '#1f4a2a'); disco(Q, x - 1, y - 1, 5, '#2a6035'); Q(x - 3, y - 4, 2, 1, '#4c9a52'); };
        for (let y = LIM.y0 + 4; y < WH + 8; y += 11) { mata(6 + (rnd() * 6 | 0), y); mata(WW - 6 - (rnd() * 6 | 0), y); }
        for (let x = 10; x < WW; x += 12) mata(x, WH - 1 + (rnd() * 4 | 0));
      },
      decor(m) {                                                // luciérnagas
        particulas(m, 14, () => ({ x: LIM.x0 + Math.random() * (LIM.x1 - LIM.x0), y: LIM.y0 + Math.random() * (LIM.y1 - LIM.y0), k: Math.random() * 100 })).forEach(b => {
          if ((f + b.k * 7 | 0) % 110 > 70) return;
          const x = b.x + Math.sin(f * .02 + b.k) * 12, y = b.y + Math.cos(f * .017 + b.k) * 7;
          R(x - 1, y - 1, 3, 3, 'rgba(234,255,138,.25)'); R(x, y, 1, 1, '#f4ffb0');
        });
      },
      sobre() {                                                 // hojas que caen de las copas
        for (let i = 0; i < 9; i++) { const x = (i * 61 + f * .35) % (WW + 20) - 10, y = (i * 37 + f * (.3 + i % 3 * .1)) % WH; R(x + Math.sin(f * .05 + i) * 3, y, 2, 1, i % 2 ? '#6bbf5a' : '#e0b756'); }
      } },

    { nombre: 'La cueva', enemigos: ['murcielago', 'arana', 'golem'], fuerte: 'golem', semilla: 23,
      pintar(Q, rnd, m) {
        Q(0, 0, WW, WH, '#0e0b14');
        for (let y = LIM.y0 - 4, fila = 0; y < LIM.y1 + 4; y += 10, fila++) for (let x = LIM.x0 - 4 - (fila % 2) * 7; x < LIM.x1 + 4; x += 14) {
          Q(x, y, 14, 10, '#1a1520'); Q(x + 1, y + 1, 12, 8, ['#2a2433', '#2e2738', '#262030'][rnd() * 3 | 0]); Q(x + 1, y + 1, 12, 1, '#3a3246');
          if (rnd() < .25) Q(x + 3 + (rnd() * 6 | 0), y + 4, 4, 1, '#1a1520');
        }
        m.charcos = [];
        for (let i = 0; i < 4; i++) { const x = LIM.x0 + 50 + rnd() * (LIM.x1 - LIM.x0 - 100) | 0, y = LIM.y0 + 30 + rnd() * (LIM.y1 - LIM.y0 - 60) | 0; ovalo(Q, x, y, 13, 4, '#1b2a44'); Q(x - 7, y - 2, 6, 1, '#3d5a8a'); m.charcos.push([x, y]); }
        bordes(Q, '#1b1622');
        for (let i = 0; i < 160; i++) Q(rnd() * WW | 0, rnd() * (LIM.y0 - 6) | 0, 3, 2, rnd() < .5 ? '#241d2d' : '#15111b');
        Q(0, LIM.y0 - 6, WW, 2, '#2e2738');
        m.puntas = [];
        for (let x = 4; x < WW - 4; x += 10 + (rnd() * 8 | 0)) {
          const l = 6 + (rnd() * 10 | 0);
          for (let k = 0; k < l; k++) { const w = Math.max(1, 5 - (k * 5 / l | 0)); Q(x + (5 - w >> 1), LIM.y0 - 6 + k, w, 1, k % 4 ? '#2e2738' : '#3a3246'); }
          m.puntas.push([x + 2, LIM.y0 - 6 + l]);
        }
        const cristal = (x, y, c1, c2, c3) => [[-4, 7], [0, 12], [4, 8]].forEach(([dx, h]) => {
          for (let k = 0; k < h; k++) { const w = k < 2 ? 1 : 3; Q(x + dx - (w >> 1), y - h + k, w, 1, k < 2 ? c3 : c1); }
          Q(x + dx + 1, y - h + 3, 1, h - 4, c2);
        });
        m.cristales = [[LIM.x0 + 8, LIM.y0 + 26], [LIM.x1 - 10, LIM.y0 + 48], [LIM.x0 + 12, LIM.y1 - 14], [LIM.x1 - 14, LIM.y1 - 8], [CX - 96, LIM.y1 - 4], [CX + 118, LIM.y0 + 12]];
        m.cristales.forEach(([x, y], i) => i % 2 ? cristal(x, y, '#a78bfa', '#5b45b0', '#ede9fe') : cristal(x, y, '#7ec8ff', '#2f6db5', '#e0f2ff'));
      },
      decor(m) {                                                // gotas que caen de las estalactitas
        particulas(m, 7, () => ({ i: Math.random() * 40 | 0, y: 0, fin: 20 + Math.random() * 90, v: 0 })).forEach(d => {
          const p = m.puntas[d.i % m.puntas.length];
          if (!d.y) d.y = p[1];
          d.v += .06; d.y += d.v;
          if (d.y >= p[1] + d.fin) { R(p[0] - 2, p[1] + d.fin, 1, 1, '#7ec8ff'); R(p[0] + 2, p[1] + d.fin, 1, 1, '#7ec8ff'); if (d.y > p[1] + d.fin + 6) { d.i = Math.random() * 40 | 0; d.y = 0; d.v = 0; d.fin = 20 + Math.random() * 90; } }
          else R(p[0], d.y, 1, 2, '#9fd8ff');
        });
        m.cristales.forEach(([x, y], i) => { if ((f + i * 23) % 90 < 8) R(x + (i % 3) - 1, y - 13, 1, 1, '#ffffff'); });
      },
      sobre(m) {                                                // oscuridad: luz solo alrededor del héroe y de los cristales
        const luz = r => {
          g.beginPath(); g.rect(0, 0, WW, WH);
          g.moveTo(P.x + r, P.y - 4); g.arc(P.x, P.y - 4, r, 0, 7);
          m.cristales.forEach(([x, y]) => { const rr = r * .28 + Math.sin(f * .05 + x) * 2; g.moveTo(x + rr, y - 6); g.arc(x, y - 6, rr, 0, 7); });
          g.fill('evenodd');
        };
        g.fillStyle = 'rgba(6,4,14,.34)'; luz(96); luz(64);
      } },

    { nombre: 'El cementerio', enemigos: ['zombi', 'arquero', 'fantasma'], fuerte: 'zombi', semilla: 37,
      pintar(Q, rnd, m) {
        Q(0, 0, WW, WH, '#141320');
        baldosas(Q, rnd, 8, ['#2c322e', '#303731', '#292e2a']);
        for (let i = 0; i < 200; i++) { const [x, y] = alAzar(rnd); Q(x, y, 1, 2, '#55563f'); Q(x + 1, y + 1, 1, 1, '#6b6b4a'); }
        for (let x = LIM.x0; x < LIM.x1; x += 12) { const y = CY - 4 + (rnd() * 3 | 0); Q(x + 1, y, 10, 8, '#3f3f4a'); Q(x + 2, y + 1, 8, 6, '#4a4a55'); Q(x + 2, y + 1, 8, 1, '#5c5c68'); }
        // tumbas en el suelo: montículos de tierra con su lápida, lejos del sendero
        const tumba = (x, y) => { Q(x - 8, y - 2, 16, 7, '#3b2f24'); Q(x - 7, y - 2, 14, 1, '#4a3b2a'); Q(x - 3, y - 11, 6, 9, '#6b6f7e'); Q(x - 2, y - 12, 4, 1, '#6b6f7e'); Q(x - 3, y - 11, 6, 1, '#8a8fa0'); Q(x - 1, y - 9, 2, 4, '#4a4d5a'); Q(x - 2, y - 8, 4, 1, '#4a4d5a'); };
        [[CX - 150, LIM.y0 + 44], [CX - 70, LIM.y0 + 30], [CX + 60, LIM.y0 + 46], [CX + 160, LIM.y0 + 36], [CX - 170, LIM.y1 - 24], [CX - 40, LIM.y1 - 16], [CX + 110, LIM.y1 - 26]].forEach(([x, y]) => tumba(x, y));
        for (let i = 0; i < 70; i++) { const [x, y] = alAzar(rnd); Q(x, y, 2, 1, '#3e5a3a'); }                          // musgo
        bordes(Q, '#1d1b29');
        disco(Q, 44, 14, 9, '#e8ecff'); disco(Q, 47, 12, 7, '#1d1b29');                                                // luna menguante
        const arbol = (x) => { Q(x, 6, 3, LIM.y0 - 10, '#2a2233'); Q(x - 6, 10, 7, 2, '#2a2233'); Q(x - 8, 6, 2, 5, '#2a2233'); Q(x + 3, 14, 8, 2, '#2a2233'); Q(x + 9, 9, 2, 6, '#2a2233'); };
        arbol(96); arbol(WW - 110);
        for (let i = 0; i < 90; i++) Q(rnd() * WW | 0, rnd() * (LIM.y0 - 6) | 0, 2, 1, '#252336');
        const lapida = (x, y) => { Q(x - 4, y - 10, 8, 10, '#6b6f7e'); Q(x - 3, y - 11, 6, 1, '#6b6f7e'); Q(x - 4, y - 10, 8, 1, '#8a8fa0'); Q(x - 1, y - 8, 2, 5, '#4a4d5a'); Q(x - 2, y - 7, 4, 1, '#4a4d5a'); Q(x - 5, y, 10, 1, '#0e0d16'); };
        const cruz = (x, y) => { Q(x - 1, y - 12, 2, 12, '#5a5d6b'); Q(x - 4, y - 9, 8, 2, '#5a5d6b'); Q(x - 1, y - 12, 1, 12, '#747888'); };
        Q(CX - 22, 8, 44, LIM.y0 - 12, '#3b3a4a'); Q(CX - 22, 8, 44, 2, '#55546a');                   // mausoleo
        for (let k = 0; k < 8; k++) Q(CX - 24 + k * 3, 8 - k, 48 - k * 6, 1, '#4a4960');
        Q(CX - 6, 16, 12, LIM.y0 - 20, '#0e0d16'); Q(CX - 18, 14, 3, LIM.y0 - 18, '#55546a'); Q(CX + 15, 14, 3, LIM.y0 - 18, '#55546a');
        m.fuegos = [];
        for (let x = 12; x < WW - 8; x += 26 + (rnd() * 8 | 0)) { if (Math.abs(x - CX) < 34) continue; (rnd() < .6 ? lapida : cruz)(x, LIM.y0 - 10); if (rnd() < .3) m.fuegos.push([x + 5, LIM.y0 - 14]); }
        Q(0, LIM.y0 - 16, WW, 1, '#0e0d16'); Q(0, LIM.y0 - 9, WW, 1, '#0e0d16');   // reja de hierro delante de las tumbas
        for (let x = 2; x < WW; x += 6) { if (Math.abs(x - CX) < 10) continue; Q(x, LIM.y0 - 18, 1, 14, '#0e0d16'); Q(x - 1, LIM.y0 - 19, 3, 1, '#0e0d16'); }
        for (let y = LIM.y0 + 16; y < LIM.y1; y += 34) { lapida(8, y); lapida(WW - 8, y + 17); }
        m.fuegos.push([6, LIM.y0 + 60], [WW - 6, LIM.y1 - 40]);
      },
      decor(m) {                                                // fuegos fatuos
        m.fuegos.forEach(([x, y], i) => { const s = Math.round(Math.sin(f * .07 + i) * 2), c = (f >> 3) % 2; R(x - 1, y - 4 + s - c, 3, 4 + c, '#4ade80'); R(x, y - 3 + s, 1, 2, '#d9ffe6'); });
      },
      sobre() {                                                 // niebla que avanza en bandas
        for (let b = 0; b < 3; b++) {
          const y = LIM.y0 + 44 + b * 70, v = .18 + b * .08;
          for (let k = 0; k < 6; k++) { const x = (k * 97 + f * v) % (WW + 140) - 70, o = Math.round(Math.sin(f * .02 + k + b) * 3); R(x, y + o, 64, 6, 'rgba(180,170,220,.13)'); R(x + 12, y + o - 3, 40, 3, 'rgba(180,170,220,.1)'); }
        }
      } },

    { nombre: 'El desierto', enemigos: ['arana', 'arquero', 'golem', 'diablillo'], fuerte: 'golem', semilla: 41,
      pintar(Q, rnd) {
        Q(0, 0, WW, WH, '#6b4e2a');
        baldosas(Q, rnd, 8, ['#c9a45c', '#c69f55', '#cfa963']);
        for (let i = 0; i < 46; i++) { const [x, y] = alAzar(rnd); for (let k = 0; k < 14; k++) Q(x + k, y + (k % 7 < 3 ? 0 : 1), 1, 1, '#b8924c'); }
        for (let i = 0; i < 5; i++) { const [x, y] = alAzar(rnd); Q(x, y, 6, 1, '#efe3c8'); Q(x - 1, y - 1, 2, 3, '#efe3c8'); Q(x + 5, y - 1, 2, 3, '#efe3c8'); }
        bordes(Q, '#a27d49');
        for (let y = 0; y < LIM.y0 - 4; y += 6) for (let x = (y / 6 % 2) * 8; x < WW; x += 16) { Q(x, y, 16, 6, '#b8925a'); Q(x, y, 16, 1, '#caa56b'); Q(x, y, 1, 6, '#8f6d3e'); }
        for (let x = 20; x < WW; x += 62) { const alto = 16 + (rnd() * 14 | 0); Q(x, LIM.y0 - 4 - alto, 12, alto, '#d8b878'); Q(x, LIM.y0 - 4 - alto, 12, 2, '#e8cc90'); Q(x + 9, LIM.y0 - 4 - alto, 3, alto, '#b8925a'); Q(x + 2 + (rnd() * 6 | 0), LIM.y0 - 6 - alto, 4, 2, '#d8b878'); }
        const cactus = (x, y) => { Q(x - 1, y - 12, 3, 12, '#3f8f4a'); Q(x - 4, y - 8, 3, 2, '#3f8f4a'); Q(x - 4, y - 11, 2, 3, '#3f8f4a'); Q(x + 2, y - 7, 3, 2, '#3f8f4a'); Q(x + 3, y - 10, 2, 3, '#3f8f4a'); Q(x, y - 12, 1, 12, '#5fb164'); };
        for (let y = LIM.y0 + 20; y < WH; y += 40) { cactus(8, y); cactus(WW - 8, y + 20); }
      },
      decor() {},
      sobre() {                                                 // ráfagas de arena
        for (let i = 0; i < 14; i++) { const x = (i * 71 + f * (1.4 + i % 3 * .3)) % (WW + 40) - 20, y = LIM.y0 + (i * 53) % (LIM.y1 - LIM.y0); R(x, y, 6 + i % 3 * 2, 1, 'rgba(255,240,200,.35)'); }
      } },

    { nombre: 'El volcán', enemigos: ['diablillo', 'golem', 'murcielago', 'slime'], fuerte: 'golem', semilla: 53,
      pintar(Q, rnd, m) {
        Q(0, 0, WW, WH, '#140a0a');
        baldosas(Q, rnd, 10, ['#2b1f1f', '#2f2222', '#261b1b'], '#1c1212');
        m.grietas = [];
        for (let i = 0; i < 9; i++) { let [x, y] = alAzar(rnd); for (let k = 0; k < 24; k++) { m.grietas.push([x, y]); x += rnd() < .5 ? 1 : 0; y += rnd() < .5 ? 1 : -1; x += rnd() < .3 ? 1 : 0; } }
        m.grietas.forEach(([x, y]) => Q(x, y, 1, 1, '#3a1a10'));
        bordes(Q, '#1a0f0f');
        for (let i = 0; i < 140; i++) Q(rnd() * WW | 0, rnd() * (LIM.y0 - 6) | 0, 3, 2, rnd() < .5 ? '#241414' : '#110909');
        m.cascadas = [60, 190, WW - 150, WW - 50];
        m.lagos = [[LIM.x0 + 16, LIM.y1 - 10, 14, 5], [LIM.x1 - 20, LIM.y0 + 14, 12, 4]];
      },
      decor(m) {                                                // lava que late en las grietas, lagos y cascadas
        const k = (Math.sin(f * .06) + 1) / 2, c = k > .5 ? '#ff7a1a' : '#e0520f';
        m.grietas.forEach(([x, y]) => R(x, y, 1, 1, c));
        m.lagos.forEach(([x, y, rx, ry]) => { elipse(x, y, rx, ry, '#e0520f'); elipse(x, y, rx - 3, ry - 2, '#ff7a1a'); R(x - 4 + ((f >> 3) % 6), y - 1, 2, 1, '#ffd08a'); });
        m.cascadas.forEach(x => { for (let y = 0; y < LIM.y0 - 4; y += 4) R(x, y, 4, 4, ((y >> 2) + (f >> 2)) % 3 ? '#ff7a1a' : '#ffb347'); R(x - 1, LIM.y0 - 6, 6, 2, '#ffd08a'); });
      },
      sobre() {                                                 // brasas que suben
        for (let i = 0; i < 18; i++) { const y = WH - (i * 29 + f * (.4 + i % 4 * .12)) % WH, x = (i * 53) % WW + Math.sin(f * .03 + i) * 4; R(x, y, 1, 1, i % 3 ? '#ffb347' : '#ff5a1a'); }
      } },

    { nombre: 'La tundra', enemigos: ['lobo', 'fantasma', 'arana', 'golem'], fuerte: 'lobo', semilla: 67,
      pintar(Q, rnd) {
        Q(0, 0, WW, WH, '#9fb4cf');
        baldosas(Q, rnd, 8, ['#dfe8f5', '#e6eef9', '#d6e1f0']);
        for (let i = 0; i < 5; i++) { const [x, y] = alAzar(rnd); ovalo(Q, x, y, 16 + (rnd() * 10 | 0), 5, '#b9d3ef'); Q(x - 8, y - 2, 7, 1, '#eef7ff'); }
        for (let i = 0; i < 120; i++) { const [x, y] = alAzar(rnd); Q(x, y, 1, 1, '#ffffff'); }
        bordes(Q, '#cfdbee');
        const pino = (x, y) => { Q(x - 1, y - 4, 3, 4, '#5a3c22'); for (let k = 0; k < 3; k++) { for (let r = 0; r < 7; r++) Q(x - r + k, y - 6 - k * 6 - (6 - r), r * 2 + 1 - k * 2, 1, r < 2 ? '#f4f8ff' : '#1f4a3a'); } };
        for (let x = 6; x < WW; x += 16 + (rnd() * 8 | 0)) pino(x, LIM.y0 - 6 - (rnd() * 6 | 0));
        for (let y = LIM.y0 + 10; y < WH; y += 18) { disco(Q, 4, y, 7, '#eef3fb'); disco(Q, WW - 4, y + 9, 7, '#eef3fb'); }
      },
      decor() {},
      sobre() {                                                 // nieve que cae
        for (let i = 0; i < 44; i++) { const y = (i * 23 + f * (.4 + i % 4 * .12)) % WH, x = (i * 97 + Math.sin(f * .02 + i) * 6 + f * .15) % WW; R(x, y, i % 5 ? 1 : 2, i % 5 ? 1 : 2, '#ffffff'); }
      } },
  ];
  const mapaDe = n => MAPAS[infinito ? n % MAPAS.length : Math.min(n, 2)];
  function lienzoDe(m) {
    if (!m.lienzo) {
      m.lienzo = document.createElement('canvas'); m.lienzo.width = WW; m.lienzo.height = WH;
      const s = m.lienzo.getContext('2d'), Q = (x, y, w, h, c) => { s.fillStyle = c; s.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
      m.pintar(Q, semilla(m.semilla), m);
    }
    return m.lienzo;
  }
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
    if (e.tipo !== 'fantasma') elipse(x, y + e.r - 1, e.r, 2, 'rgba(0,0,0,.35)');
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
    const s = e.mira || 1, Rf = (dx, dy, w, h, c) => R(s > 0 ? x + dx : x - dx - w, y + dy, w, h, c);   // dibujo que se voltea según hacia dónde mira
    if (e.tipo === 'hongo') {                                // se agacha justo antes de saltar
      const yy = y - (e.salto || 0), ap = e.modo === 'camina' && e.mt < 8 ? 1 : 0;
      R(x - 3, yy - 5 + ap, 6, 6 - ap, '#efe3c8'); R(x - 3, yy - 5 + ap, 6, 1, '#d9ccb0');
      R(x - 2, yy - 3 + ap, 1, 2, '#071428'); R(x + 1, yy - 3 + ap, 1, 2, '#071428');
      R(x - 7, yy - 10 + ap, 14, 5, '#c2362b'); R(x - 5, yy - 12 + ap, 10, 2, '#d9483b'); R(x - 3, yy - 13 + ap, 6, 1, '#e0664f');
      R(x - 5, yy - 9 + ap, 2, 2, '#fff5e6'); R(x + 2, yy - 11 + ap, 2, 1, '#fff5e6'); R(x + 3, yy - 8 + ap, 2, 1, '#fff5e6'); R(x - 1, yy - 12 + ap, 1, 1, '#fff5e6');
    }
    if (e.tipo === 'lobo') {                                 // de perfil, mirando hacia donde corre
      const ag = e.modo === 'carga' ? 2 : 0, pata = e.modo === 'embiste' ? 0 : (f >> 3) % 2, furia = e.modo === 'carga' || e.modo === 'embiste';
      Rf(-9, -10 + ag, 3, 2, '#9aa3b5');
      Rf(-6, -8 + ag, 11, 5, '#5b6272'); Rf(-6, -8 + ag, 11, 1, '#8a93a5');
      Rf(4, -11 + ag, 5, 5, '#5b6272'); Rf(5, -13 + ag, 2, 2, '#3f4452'); Rf(8, -9 + ag, 3, 2, '#3f4452');
      Rf(6, -10 + ag, 1, 1, furia ? '#ff5a5a' : '#fde68a');
      Rf(-5, -3, 2, 3 - pata, '#3f4452'); Rf(-1, -3, 2, 2 + pata, '#3f4452'); Rf(2, -3, 2, 3 - pata, '#3f4452');
    }
    if (e.tipo === 'arana') {                                // cuerpo de cristal y seis patas que se alternan
      const p = (f >> 2) % 2;
      for (let k = 0; k < 3; k++) { R(x - 7, y - 6 + k * 2 + (k + p) % 2, 3, 1, '#0f1f33'); R(x + 4, y - 6 + k * 2 + (k + p + 1) % 2, 3, 1, '#0f1f33'); }
      R(x - 4, y - 8, 8, 5, '#1e3a5f'); R(x - 3, y - 9, 6, 1, '#2f5f95'); R(x - 1, y - 11, 2, 3, '#7ec8ff'); R(x, y - 12, 1, 1, '#e0f2ff');
      R(x - 2, y - 5, 1, 1, '#ff5a5a'); R(x + 1, y - 5, 1, 1, '#ff5a5a');
    }
    if (e.tipo === 'zombi') {                                // brazos estirados hacia ti
      const b = Math.round(Math.sin(e.fase * .6));
      Rf(-2, 2, 2, 3, '#3b3b52'); Rf(1, 2, 2, 3, '#3b3b52');
      Rf(-3, -4, 6, 6, '#5d4a7a'); Rf(-3, -1, 2, 1, '#7fae6b');
      Rf(-3, -10 + b, 6, 6, '#7fae6b'); Rf(-3, -10 + b, 6, 1, '#9cc98a'); Rf(1, -8 + b, 1, 1, '#fff5c4'); Rf(-1, -8 + b, 1, 1, '#fff5c4');
      Rf(3, -3, 4, 1, '#7fae6b'); Rf(3, -1, 4, 1, '#7fae6b');
    }
    if (e.tipo === 'fantasma') {                             // transparente mientras es intangible
      const yy = y - 4 + Math.round(Math.sin(f * .08 + e.fase) * 2);
      g.globalAlpha = e.etereo ? .28 : .9;
      R(x - 4, yy - 12, 8, 2, '#eef5ff'); R(x - 5, yy - 10, 10, 8, '#dbe9ff');
      for (let i = 0; i < 5; i++) R(x - 5 + i * 2, yy - 2 + ((f >> 3) + i) % 2, 2, 2, '#c3d6f5');
      R(x - 3, yy - 8, 2, 2, '#1a1a3a'); R(x + 1, yy - 8, 2, 2, '#1a1a3a'); R(x - 1, yy - 5, 2, 1, '#1a1a3a');
      g.globalAlpha = 1;
    }
    if (e.tipo === 'diablillo') {                            // la llama en la mano avisa que va a disparar
      const al = (f >> 3) % 2;
      R(x - 6, y - 9 - al, 3, 3, '#7c2d12'); R(x + 3, y - 9 - al, 3, 3, '#7c2d12');
      R(x - 3, y - 5, 6, 6, '#c2410c'); R(x - 2, y + 1, 1, 2, '#7c2d12'); R(x + 1, y + 1, 1, 2, '#7c2d12');
      R(x - 3, y - 10, 6, 5, '#ea580c'); R(x - 3, y - 12, 1, 2, '#fde68a'); R(x + 2, y - 12, 1, 2, '#fde68a');
      R(x - 2, y - 8, 1, 1, '#fde047'); R(x + 1, y - 8, 1, 1, '#fde047');
      if (e.cd < 24) { R(x + 4, y - 7 - (f >> 2) % 2, 2, 2, '#fde68a'); R(x + 4, y - 5, 2, 1, '#fb923c'); }
    }
    if (e.conf > 0) { for (let k = 0; k < 3; k++) { const a = f * .2 + k * 2.1; R(x + Math.cos(a) * 5, y - e.r * 2 - 6 + Math.sin(a) * 2, 2, 2, (e.conf >> 3) % 2 ? '#5eead4' : '#a78bfa'); } }
    if (e.hp < e.hpMax) { const w = e.r * 2; R(x - e.r, y - e.r * 2 - 8, w, 2, 'rgba(0,0,0,.6)'); R(x - e.r, y - e.r * 2 - 8, w * Math.max(0, e.hp) / e.hpMax, 2, '#f87171'); }
  }
  function aliado(a) {
    const x = Math.round(a.x), y = Math.round(a.y);
    if (a.tipo === 'convertido') {                            // enemigo bajo tu mando: su sprite con una corona dorada
      enemigo({ tipo: a.et, x: a.x, y: a.y, r: a.r, hp: 1, hpMax: 1, fase: a.fase, portal: 0, modo: 'camina', cd: 60, conf: 0 });
      const alto = { golem: 26, murcielago: 14, arana: 15, fantasma: 20, hongo: 17 }[a.et] || 16;
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
    const m = mapaDe(ola);
    g.drawImage(lienzoDe(m), 0, 0);
    m.decor(m);
    items.forEach(it => { if (it.t > 120 || (it.t >> 3) % 2) { R(it.x - 2, it.y - 3, 2, 2, '#f472b6'); R(it.x + 1, it.y - 3, 2, 2, '#f472b6'); R(it.x - 3, it.y - 2, 7, 2, '#f472b6'); R(it.x - 2, it.y, 5, 1, '#f472b6'); R(it.x - 1, it.y + 1, 3, 1, '#f472b6'); } });
    const orden = [...enemigos.map(e => ({ y: e.y, d: () => enemigo(e) })), ...aliados.map(a => ({ y: a.y, d: () => aliado(a) })), { y: P.y, d: heroe }].sort((a, b) => a.y - b.y);
    orden.forEach(o => o.d());
    balas.forEach(bl => { R(bl.x - 1, bl.y - 1, 3, 3, '#7ec8ff'); R(bl.x, bl.y, 1, 1, '#ffffff'); });
    flechas.forEach(a => {
      if (a.fuego) { R(a.x - a.vx * 3 - 1, a.y - a.vy * 3 - 1, 2, 2, '#c2410c'); R(a.x - 2, a.y - 2, 4, 4, '#fb923c'); R(a.x - 1, a.y - 1, 2, 2, '#fde68a'); return; }
      const n = Math.hypot(a.vx, a.vy); g.strokeStyle = '#e6e0d0'; g.lineWidth = 1; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(a.x - a.vx / n * 6, a.y - a.vy / n * 6); g.stroke(); R(a.x - 1, a.y - 1, 2, 2, '#cad6e5'); });
    efectos.forEach(e => {
      if (e.tipo === 'chispa') for (let i = 0; i < 6; i++) { const a = i * 1.05; R(e.x + Math.cos(a) * (12 - e.t), e.y - 4 + Math.sin(a) * (12 - e.t), 2, 2, '#fff'); }
      if (e.tipo === 'polvo') R(e.x, e.y - 4, 2, 2, e.col);
      if (e.tipo === 'aura') { const k = 1 - e.t / 26; g.strokeStyle = `rgba(94,234,212,${e.t / 26})`; g.lineWidth = 2; g.beginPath(); g.ellipse(e.x, e.y, 8 + k * 66, 5 + k * 42, 0, 0, 7); g.stroke(); }
    });
    m.sobre(m);
  }
  function texto(txt, x, y, tam, col, alin) { ctx.font = `${tam}px "Press Start 2P", monospace`; ctx.fillStyle = col; ctx.textAlign = alin || 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x, y); }
  function dibujar() {
    if (estado === 'intro') {
      g.drawImage(lienzoDe(MAPAS[0]), 0, 0);
      ctx.imageSmoothingEnabled = false; ctx.drawImage(buf, 0, 0, W, H);
      ctx.fillStyle = 'rgba(4,10,22,.8)'; ctx.fillRect(0, 0, W, H);
      texto(infinito ? 'OLEADAS INFINITAS' : 'ARENA DEL DATO', W / 2, 84, 26, infinito ? '#ffd400' : '#f3d27f');
      ctx.font = '16px Geist, sans-serif'; ctx.fillStyle = '#e6eefc'; ctx.textAlign = 'center';
      ctx.fillText(infinito ? `¿Hasta qué oleada llegas? Tu récord: ${record} oleada(s) superada(s).` : 'Cada golpe que des o recibas se registrará como un dato.', W / 2, 132);
      ctx.fillText(infinito ? 'Seis lugares que se repiten: cada vuelta trae más enemigos, más resistentes y algunos intrusos.' : 'Tres oleadas en tres lugares distintos. Luego analiza tu desempeño como un analista.', W / 2, 158);
      ctx.font = '13px Geist, sans-serif'; ctx.fillStyle = '#9dffc0';
      ctx.fillText(`Ataque ${B.ataque.toFixed(2).replace('.', ',')} · Vida ${B.vidaMax} · Energía ${B.energiaMax} · Cadencia ${B.cd} · ✦ ${B.esp >= 0 ? ESP[B.esp] + ' nv. ' + B.nivel : 'Sin especialidad'} · Bloqueo ${Math.round(B.bloqueo * 100)}% · Curación ${Math.round(B.cura * 100)}%`, W / 2, 182);
      // una tarjeta por lugar: vista del mapa, su nombre y los enemigos que viven ahí
      const lista = infinito ? MAPAS : MAPAS.slice(0, 3), cw = infinito ? 138 : 262, sep = infinito ? 10 : 22, ch = 150;
      const x0 = Math.round(W / 2 - (lista.length * cw + (lista.length - 1) * sep) / 2);
      lista.forEach((m, i) => {
        const cx = x0 + i * (cw + sep), cy = 200;
        ctx.drawImage(lienzoDe(m), Math.round(WW / 2 - cw / 4), Math.round((LIM.y0 + LIM.y1) / 2 - ch / 4), cw / 2, ch / 2, cx, cy, cw, ch);
        ctx.fillStyle = 'rgba(4,10,22,.55)'; ctx.fillRect(cx, cy + ch - 30, cw, 30);
        ctx.strokeStyle = '#fabd18'; ctx.lineWidth = 2; ctx.strokeRect(cx + 1, cy + 1, cw - 2, ch - 2);
        texto(infinito ? m.nombre.toUpperCase() : `${i + 1}. ${m.nombre.toUpperCase()}`, cx + cw / 2, cy + ch - 15, infinito ? 7 : 9, '#fcdf6b');
        const n = m.enemigos.length, t = infinito ? 36 : 56;
        m.enemigos.forEach((k, j) => {
          g.clearRect(0, 0, 40, 40);
          enemigo({ tipo: k, x: 20, y: 30, r: TIPOS[k].r, hp: 1, hpMax: 1, fase: f / 10, portal: 0, modo: 'camina', cd: 60, mt: 60, mira: 1, salto: 0, etereo: false, conf: 0 });
          ctx.drawImage(buf, 0, 0, 40, 40, Math.round(cx + cw / 2 - n * t / 2 + j * t), cy + ch - 36 - t, t, t);
        });
      });
      ctx.font = '14px Geist, sans-serif'; ctx.fillStyle = '#cad6e5'; ctx.fillText(B.esp === 4 ? 'Mover: WASD o flechas · Invocar esqueleto: Espacio o J · Onda de energía: K o botón B' : 'Mover: WASD o flechas · Atacar: Espacio o J · Onda de energía: K o botón B (40 de energía)', W / 2, 400);
      if ((f >> 5) % 2) texto('PRESIONA ENTER PARA COMENZAR', W / 2, 440, 12, '#f3d27f');
      f++;
      return;
    }
    dibujarMundo();
    ctx.imageSmoothingEnabled = false; ctx.drawImage(buf, 0, 0, W, H);
    // interfaz
    ctx.fillStyle = 'rgba(4,10,22,.55)'; ctx.fillRect(0, 0, W, 60);
    for (let i = 0; i < P.max; i++) texto('♥', 24 + i * 22, 24, 15, i < P.hp ? '#f472b6' : 'rgba(255,255,255,.2)', 'center');
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(14, 42, 150, 8); ctx.fillStyle = P.en >= 40 ? '#7ec8ff' : '#3a6a99'; ctx.fillRect(14, 42, 150 * P.en / B.energiaMax, 8);
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(14 + 150 * 40 / B.energiaMax, 40, 1, 12); texto('⚡', 176, 47, 9, '#7ec8ff');
    texto(infinito ? `OLEADA ${ola + 1} · RÉCORD ${record}` : `OLEADA ${ola + 1}/3`, W / 2, 20, 12, infinito ? '#ffd400' : '#cad6e5');
    texto(mapaDe(ola).nombre.toUpperCase(), W / 2, 40, 8, '#fcdf6b');
    const ev = T.eventos;
    const cuenta = tipo => ev.filter(x => x.tipo === tipo).length;
    ctx.fillStyle = 'rgba(5,14,29,.75)'; ctx.fillRect(W - 300, 10, 290, 50);
    ctx.font = '12px Geist, sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#e6eefc';
    ctx.fillText(`Golpes dados ${cuenta('golpe')} · Recibidos ${cuenta('recibido')}`, W - 290, 28);
    ctx.fillText(`Derrotados ${cuenta('derrota')} · Eventos ${ev.length}`, W - 290, 47);
    if ((f >> 4) % 2) { ctx.fillStyle = '#f87171'; ctx.beginPath(); ctx.arc(W - 318, 24, 6, 0, 7); ctx.fill(); }
    texto('REC', W - 318, 44, 7, '#f87171');
    efectos.forEach(e => { if (e.tipo === 'txt') { ctx.globalAlpha = Math.min(1, e.t / 20); texto(e.txt, e.x * S, (e.y - (40 - e.t) * .4) * S, 9, e.col); ctx.globalAlpha = 1; } });
    if (anuncio > 0 && estado === 'jugando') {                // el nombre del lugar al comenzar cada oleada
      anuncio--; ctx.globalAlpha = Math.min(1, anuncio / 30, (170 - anuncio) / 20);
      ctx.fillStyle = 'rgba(4,10,22,.55)'; ctx.fillRect(0, 96, W, 64);
      texto(mapaDe(ola).nombre.toUpperCase(), W / 2, 122, 20, '#fcdf6b'); texto(`OLEADA ${ola + 1}${infinito ? '' : ' DE 3'}`, W / 2, 146, 9, '#cad6e5');
      ctx.globalAlpha = 1;
    }
    if (estado === 'pausa') {
      ctx.fillStyle = 'rgba(4,10,22,.6)'; ctx.fillRect(0, H / 2 - 40, W, 80); texto(`¡OLEADA ${ola + 1} SUPERADA!`, W / 2, H / 2 - 8, 16, '#6bd49a');
      texto(`Siguiente: ${mapaDe(ola + 1).nombre.toLowerCase()}`, W / 2, H / 2 + 20, 9, '#cad6e5');
      if (pausa < 36) { ctx.fillStyle = `rgba(2,4,10,${1 - pausa / 36})`; ctx.fillRect(0, 0, W, H); }   // fundido al cambiar de lugar
    }
    if (entrada > 0 && estado === 'jugando') { ctx.fillStyle = `rgba(2,4,10,${entrada / 40})`; ctx.fillRect(0, 0, W, H); entrada--; }
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
    TIPOS, COLS, FILAS, BASE, ESP, MAPAS: MAPAS.map(m => m.nombre),
  };
  }
  window.KRCrearBatalla = crear;
  const cvArcade = document.getElementById('batalla-canvas');
  if (cvArcade) window.KRBatalla = crear(cvArcade);
})();

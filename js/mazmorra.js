/* ==========================================================================
   Mini Mazmorra: homenaje a Dungeon Ascent. Dos oleadas y el Rey Slime.
   ========================================================================== */
(function () {
  'use strict';
  const cv = document.getElementById('mazmorra-canvas'); if (!cv) return;
  const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, M = 32;
  const K = {};
  const MAPA = { w: 'arriba', arrowup: 'arriba', s: 'abajo', arrowdown: 'abajo', a: 'izquierda', arrowleft: 'izquierda', d: 'derecha', arrowright: 'derecha', j: 'accion', ' ': 'accion', k: 'accion' };
  let estado = 'menu', pedido = false, t = 0, P, enemigos, efectos, items, oleada, puntos, mensaje, jefe;

  function reiniciar() {
    P = { x: W / 2, y: H / 2 + 60, r: 12, v: 2.7, hp: 5, inv: 0, fx: 0, fy: -1, cd: 0, atk: 0 };
    enemigos = []; efectos = []; items = []; oleada = 0; puntos = 0; jefe = null;
    siguienteOleada();
  }
  function slime(x, y, tipo) {
    const t2 = { verde: [2, 1.15, '#6bd49a'], azul: [3, 1.55, '#7ec8ff'], mini: [1, 1.8, '#a7f3c0'] }[tipo];
    return { x, y, r: tipo === 'mini' ? 8 : 13, hp: t2[0], v: t2[1], col: t2[2], kx: 0, ky: 0, fase: Math.random() * 6 };
  }
  function borde() { const lado = Math.floor(Math.random() * 4); return lado === 0 ? [M + 20, M + 20 + Math.random() * (H - 2 * M - 40)] : lado === 1 ? [W - M - 20, M + 20 + Math.random() * (H - 2 * M - 40)] : lado === 2 ? [M + 20 + Math.random() * (W - 2 * M - 40), M + 20] : [M + 20 + Math.random() * (W - 2 * M - 40), H - M - 20]; }
  function siguienteOleada() {
    oleada++;
    if (oleada === 1) for (let i = 0; i < 5; i++) enemigos.push(slime(...borde(), 'verde'));
    if (oleada === 2) for (let i = 0; i < 8; i++) enemigos.push(slime(...borde(), i % 3 === 0 ? 'azul' : 'verde'));
    if (oleada === 3) { jefe = { x: W / 2, y: M + 90, r: 36, hp: 26, max: 26, v: .75, timer: 0, salto: 0, sx: 0, sy: 0, kx: 0, ky: 0 }; }
    mensaje = { txt: oleada === 3 ? '¡EL REY SLIME DESPIERTA!' : `OLEADA ${oleada}`, t: 110 };
  }

  // ---------------------------------------------------------- entrada
  cv.addEventListener('keydown', e => {
    const k = MAPA[e.key.toLowerCase()];
    if (k) { K[k] = true; if (k === 'accion' && !e.repeat) pedido = true; e.preventDefault(); }
    if ((estado === 'menu' || estado === 'fin') && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); iniciar(); }
  });
  cv.addEventListener('keyup', e => { const k = MAPA[e.key.toLowerCase()]; if (k) K[k] = false; });
  cv.addEventListener('blur', () => Object.keys(K).forEach(k => K[k] = false));
  cv.addEventListener('pointerdown', () => { cv.focus({ preventScroll: true }); if (estado === 'menu' || estado === 'fin') iniciar(); });
  document.querySelectorAll('.tactil[data-para=mazmorra] [data-k]').forEach(b => {
    const k = b.dataset.k;
    b.addEventListener('pointerdown', e => { e.preventDefault(); K[k] = true; if (estado !== 'jugando') iniciar(); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, () => K[k] = false));
  });
  function iniciar() { reiniciar(); estado = 'jugando'; cv.focus({ preventScroll: true }); arrancar(); }

  // ---------------------------------------------------------- lógica
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const limitar = o => { o.x = Math.max(M + o.r, Math.min(W - M - o.r, o.x)); o.y = Math.max(M + o.r, Math.min(H - M - o.r, o.y)); };
  function danar(n) {
    if (P.inv > 0) return;
    P.hp -= n; P.inv = 70; efectos.push({ tipo: 'txt', x: P.x, y: P.y - 20, txt: '-' + n, col: '#f87171', t: 40 });
    window.KR && KR.beep([[180, .12]]);
    if (P.hp <= 0) { estado = 'fin'; mensaje = { txt: 'HAS CAÍDO · clic para reintentar', t: 99999 }; }
  }
  function golpear(o, n, esJefe) {
    const dx = o.x - P.x, dy = o.y - P.y, d = Math.hypot(dx, dy) || 1;
    o.hp -= n; o.kx = dx / d * (esJefe ? 3 : 7); o.ky = dy / d * (esJefe ? 3 : 7);
    efectos.push({ tipo: 'chispa', x: o.x, y: o.y, t: 14 });
    window.KR && KR.beep([[esJefe ? 260 : 420, .05]]);
  }
  function actualizar() {
    t++;
    let dx = (K.derecha ? 1 : 0) - (K.izquierda ? 1 : 0), dy = (K.abajo ? 1 : 0) - (K.arriba ? 1 : 0);
    if (dx || dy) { const n = Math.hypot(dx, dy); P.x += dx / n * P.v; P.y += dy / n * P.v; P.fx = dx / n; P.fy = dy / n; }
    limitar(P);
    if (P.inv > 0) P.inv--; if (P.cd > 0) P.cd--; if (P.atk > 0) P.atk--;
    if ((K.accion || pedido) && P.cd === 0) {
      pedido = false; P.cd = 22; P.atk = 9;
      const alcanza = o => { const ddx = o.x - P.x, ddy = o.y - P.y, d = Math.hypot(ddx, ddy); return d < 52 + o.r && (ddx * P.fx + ddy * P.fy) / (d || 1) > .25; };
      enemigos.forEach(e => { if (alcanza(e)) golpear(e, 1); });
      if (jefe && jefe.salto === 0 && alcanza(jefe)) golpear(jefe, 1, true);
    }
    enemigos.forEach(e => {
      const d = dist(e, P) || 1;
      e.x += (P.x - e.x) / d * e.v + e.kx; e.y += (P.y - e.y) / d * e.v + e.ky; e.kx *= .8; e.ky *= .8; e.fase += .15;
      limitar(e);
      if (d < e.r + P.r - 2) danar(1);
    });
    enemigos = enemigos.filter(e => {
      if (e.hp > 0) return true;
      puntos += e.r > 10 ? 100 : 40;
      if (Math.random() < .15 && P.hp < 5) items.push({ x: e.x, y: e.y, t: 600 });
      efectos.push({ tipo: 'txt', x: e.x, y: e.y, txt: '+' + (e.r > 10 ? 100 : 40), col: '#f3d27f', t: 40 });
      return false;
    });
    if (jefe) {
      const J = jefe; J.timer++;
      if (J.salto > 0) {                                 // salto: sombra telegrafiada y aterrizaje con onda
        J.salto--;
        if (J.salto === 0) {
          J.x = J.sx; J.y = J.sy;
          efectos.push({ tipo: 'onda', x: J.x, y: J.y, t: 30 });
          if (Math.hypot(P.x - J.x, P.y - J.y) < 90) danar(2);
          window.KR && KR.beep([[90, .25]]);
        }
      } else {
        const d = dist(J, P) || 1;
        J.x += (P.x - J.x) / d * J.v + J.kx; J.y += (P.y - J.y) / d * J.v + J.ky; J.kx *= .85; J.ky *= .85; limitar(J);
        if (d < J.r + P.r - 4) danar(1);
        if (J.timer % 200 === 0) for (let i = 0; i < 2; i++) enemigos.push(slime(J.x + (i ? 40 : -40), J.y, 'mini'));
        if (J.timer % 260 === 130) { J.salto = 70; J.sx = P.x; J.sy = P.y; }
      }
      if (J.hp <= 0) {
        puntos += 1000; jefe = null; enemigos = [];
        estado = 'fin'; mensaje = { txt: '¡VICTORIA! · clic para jugar de nuevo', t: 99999, gano: true };
        window.KR && (KR.desbloquear('mazmorra') || KR.sumarXP(30, 'Otra victoria en la mazmorra'));
      }
    }
    items = items.filter(it => { it.t--; if (dist(it, P) < 20) { P.hp = Math.min(5, P.hp + 1); efectos.push({ tipo: 'txt', x: P.x, y: P.y - 20, txt: '+1 ♥', col: '#f472b6', t: 40 }); return false; } return it.t > 0; });
    efectos = efectos.filter(e => --e.t > 0);
    if (estado === 'jugando' && !enemigos.length && !jefe && oleada < 3) siguienteOleada();
    if (mensaje && mensaje.t < 99999) mensaje.t--;
  }

  // ---------------------------------------------------------- dibujo
  function suelo() {
    for (let y = 0; y < H; y += 32) for (let x = 0; x < W; x += 32) {
      const pared = x < M || y < M || x >= W - M || y >= H - M;
      ctx.fillStyle = pared ? ((x + y) % 64 ? '#23304a' : '#1c2740') : ((x / 32 + y / 32) % 2 ? '#142038' : '#17243f');
      ctx.fillRect(x, y, 32, 32);
      if (pared) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x, y + 28, 32, 4); }
    }
    [[M + 16, M + 16], [W - M - 16, M + 16], [M + 16, H - M - 16], [W - M - 16, H - M - 16]].forEach(([x, y]) => {   // antorchas
      ctx.fillStyle = `rgba(224,183,86,${.10 + Math.sin(t / 8 + x) * .04})`; ctx.beginPath(); ctx.arc(x, y, 60, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f3d27f'; ctx.fillRect(x - 3, y - 6 + Math.sin(t / 5) * 1.5, 6, 8);
    });
  }
  function dibujarSlime(e, escala) {
    const s = 1 + Math.sin(e.fase) * .08;
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(e.x, e.y + e.r * .8, e.r, e.r * .35, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = e.col; ctx.beginPath(); ctx.ellipse(e.x, e.y, e.r * s, e.r / s * .85, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(e.x - e.r * .35, e.y - e.r * .35, e.r * .25, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#071428'; ctx.fillRect(e.x - e.r * .4, e.y - 2, 3 * (escala || 1), 4 * (escala || 1)); ctx.fillRect(e.x + e.r * .25, e.y - 2, 3 * (escala || 1), 4 * (escala || 1));
  }
  function heroe() {
    if (P.inv > 0 && Math.floor(P.inv / 5) % 2) return;
    const x = P.x, y = P.y;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x, y + 12, 11, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#15294a'; ctx.fillRect(x - 9, y - 10, 18, 20);
    ctx.fillStyle = '#e0b756'; ctx.fillRect(x - 9, y + 2, 18, 3);
    ctx.fillStyle = '#f1c9a0'; ctx.fillRect(x - 7, y - 22, 14, 12);
    ctx.fillStyle = '#c9ced8'; ctx.fillRect(x - 8, y - 25, 16, 6);                       // casco
    if (P.atk > 0) {                                                                    // arco de espada
      const a = Math.atan2(P.fy, P.fx), prog = 1 - P.atk / 9;
      ctx.strokeStyle = `rgba(243,210,127,${.9 - prog * .5})`; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(x, y, 42, a - 1 + prog * .4, a + 1 - prog * .4); ctx.stroke();
      ctx.strokeStyle = '#f4f7fd'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 40, y + Math.sin(a) * 40); ctx.stroke();
    }
  }
  function hud() {
    ctx.font = '12px "Press Start 2P", monospace'; ctx.textAlign = 'left';
    for (let i = 0; i < 5; i++) { ctx.fillStyle = i < P.hp ? '#f472b6' : 'rgba(255,255,255,.2)'; ctx.fillText('♥', 10 + i * 20, 22); }
    ctx.fillStyle = '#f3d27f'; ctx.textAlign = 'right'; ctx.fillText(`${puntos} PTS`, W - 10, 22);
    ctx.textAlign = 'center'; ctx.fillStyle = '#cad6e5'; ctx.fillText(oleada < 3 ? `OLEADA ${oleada}/2` : 'JEFE FINAL', W / 2, 22);
    if (jefe) {
      ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(W / 2 - 160, H - 24, 320, 12);
      ctx.fillStyle = '#6bd49a'; ctx.fillRect(W / 2 - 160, H - 24, 320 * jefe.hp / jefe.max, 12);
      ctx.font = '8px "Press Start 2P", monospace'; ctx.fillStyle = '#fff'; ctx.fillText('REY SLIME', W / 2, H - 28);
    }
  }
  function dibujar() {
    suelo();
    items.forEach(it => { ctx.fillStyle = '#f472b6'; ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('♥', it.x, it.y + 5 + Math.sin(t / 8) * 2); });
    if (jefe && jefe.salto > 0) {
      ctx.fillStyle = `rgba(248,113,113,${.25 + (70 - jefe.salto) / 140})`; ctx.beginPath(); ctx.arc(jefe.sx, jefe.sy, 90 * (1 - jefe.salto / 90), 0, Math.PI * 2); ctx.fill();
    }
    const cosas = [...enemigos.map(e => ({ y: e.y, d: () => dibujarSlime(e) })), { y: P.y, d: heroe }];
    if (jefe && jefe.salto === 0) cosas.push({ y: jefe.y, d: () => { dibujarSlime({ ...jefe, col: '#3fae6a', fase: t / 12 }, 2.2); ctx.fillStyle = '#e0b756'; ctx.beginPath(); const x = jefe.x, y = jefe.y - jefe.r * .85; ctx.moveTo(x - 18, y); ctx.lineTo(x - 14, y - 16); ctx.lineTo(x - 5, y - 6); ctx.lineTo(x, y - 18); ctx.lineTo(x + 5, y - 6); ctx.lineTo(x + 14, y - 16); ctx.lineTo(x + 18, y); ctx.closePath(); ctx.fill(); } });
    cosas.sort((a, b) => a.y - b.y).forEach(c => c.d());
    efectos.forEach(e => {
      if (e.tipo === 'txt') { ctx.font = '10px "Press Start 2P", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = e.col; ctx.fillText(e.txt, e.x, e.y - (40 - e.t) * .6); }
      if (e.tipo === 'chispa') { ctx.fillStyle = '#fff'; for (let i = 0; i < 6; i++) { const a = i * 1.05; ctx.fillRect(e.x + Math.cos(a) * (14 - e.t), e.y + Math.sin(a) * (14 - e.t), 3, 3); } }
      if (e.tipo === 'onda') { ctx.strokeStyle = `rgba(248,113,113,${e.t / 30})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(e.x, e.y, 90 - e.t * 2, 0, Math.PI * 2); ctx.stroke(); }
    });
    hud();
    if (mensaje && mensaje.t > 0) {
      ctx.fillStyle = 'rgba(5,14,29,.75)'; ctx.fillRect(0, H / 2 - 28, W, 50);
      ctx.font = '14px "Press Start 2P", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = mensaje.gano ? '#6bd49a' : '#f3d27f';
      ctx.fillText(mensaje.txt, W / 2, H / 2 + 4);
    }
  }
  function menu() {
    suelo();
    ctx.fillStyle = 'rgba(5,14,29,.72)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.fillStyle = '#f3d27f'; ctx.font = '26px "Press Start 2P", monospace'; ctx.fillText('MINI MAZMORRA', W / 2, H / 2 - 60);
    ctx.font = '10px "Press Start 2P", monospace'; ctx.fillStyle = '#cad6e5';
    ctx.fillText('Un homenaje a Dungeon Ascent', W / 2, H / 2 - 24);
    dibujarSlime({ x: W / 2 - 60, y: H / 2 + 30, r: 14, col: '#6bd49a', fase: t / 10 });
    dibujarSlime({ x: W / 2 + 60, y: H / 2 + 30, r: 14, col: '#7ec8ff', fase: t / 10 + 2 });
    ctx.fillStyle = Math.floor(t / 30) % 2 ? '#f3d27f' : '#ffffff'; ctx.fillText('Clic o Enter para empezar', W / 2, H / 2 + 100);
  }

  let raf = 0, visible = false;
  function bucle() {
    if (estado === 'menu') { t++; menu(); }
    else { if (estado === 'jugando') actualizar(); else t++; dibujar(); }
    raf = visible && !document.getElementById('juego-mazmorra').hidden ? requestAnimationFrame(bucle) : 0;
  }
  function arrancar() { if (!raf) raf = requestAnimationFrame(bucle); }
  new IntersectionObserver(en => { visible = en[0].isIntersecting; if (visible) arrancar(); }, { threshold: .1 }).observe(cv);
  window.KRMazmorra = { arrancar, pausar: () => Object.keys(K).forEach(k => K[k] = false) };
  document.fonts && document.fonts.ready.then(() => { t++; menu(); });
})();

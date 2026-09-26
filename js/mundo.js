/* ==========================================================================
   Mapa del reino: personaje explorable con seis edificios (uno por sección)
   ========================================================================== */
(function () {
  'use strict';
  const cv = document.getElementById('mundo-canvas'); if (!cv) return;
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  const aviso = document.getElementById('mundo-aviso');

  const EDIFICIOS = [
    { id: 'estudio', nombre: 'Castillo Conari', x: 175, y: 150, col: '#3b4f7a', techo: '#e0b756', img: 'logo-castillo-montana-bosque' },
    { id: 'datos', nombre: 'Torre del Dato', x: 480, y: 118, col: '#2f5f7a', techo: '#7ec8ff', img: 'logo-investigacion' },
    { id: 'arcade', nombre: 'Arcade del Dragón', x: 785, y: 150, col: '#6b3a5c', techo: '#f472b6', img: 'logo-dragon' },
    { id: 'gremio', nombre: 'Gremio de Habilidades', x: 175, y: 405, col: '#3f5e3b', techo: '#6bd49a', img: 'logo-arbol' },
    { id: 'cv', nombre: 'Biblioteca (CV)', x: 480, y: 425, col: '#5a4630', techo: '#f3d27f', img: 'logo-libro' },
    { id: 'contacto', nombre: 'Buzón', x: 785, y: 405, col: '#4a3f6b', techo: '#a78bfa', img: 'logo-sol-luna' },
  ];
  const BW = 150, BH = 92;   // cuerpo del edificio
  EDIFICIOS.forEach(e => {
    e.cuerpo = { x: e.x - BW / 2, y: e.y - BH / 2, w: BW, h: BH };
    e.puerta = { x: e.x, y: e.y + BH / 2 + 4 };
    e.logo = new Image(); e.logo.src = `assets/img/${e.img}.png`;
  });
  const PLAZA = { x: 480, y: 272 };

  // ---------------------------------------------------------- escenario pre-renderizado
  const fondo = document.createElement('canvas'); fondo.width = W; fondo.height = H;
  const f = fondo.getContext('2d');
  let semilla = 7; const rnd = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;
  function dibujarFondo() {
    const T = 24;
    for (let y = 0; y < H; y += T) for (let x = 0; x < W; x += T) {
      const v = rnd();
      f.fillStyle = v < .33 ? '#1f5a35' : v < .66 ? '#236239' : '#1c5431';
      f.fillRect(x, y, T, T);
      if (rnd() < .18) { f.fillStyle = 'rgba(160,220,140,.25)'; f.fillRect(x + rnd() * 18, y + rnd() * 18, 3, 3); }
    }
    // caminos desde la plaza a cada puerta
    f.strokeStyle = '#8a7348'; f.lineCap = 'round'; f.lineJoin = 'round';
    EDIFICIOS.forEach(e => {
      f.lineWidth = 30; f.beginPath(); f.moveTo(PLAZA.x, PLAZA.y);
      f.quadraticCurveTo(e.puerta.x, PLAZA.y, e.puerta.x, e.puerta.y + 6); f.stroke();
    });
    f.strokeStyle = '#a58b5a';
    EDIFICIOS.forEach(e => {
      f.lineWidth = 22; f.beginPath(); f.moveTo(PLAZA.x, PLAZA.y);
      f.quadraticCurveTo(e.puerta.x, PLAZA.y, e.puerta.x, e.puerta.y + 6); f.stroke();
    });
    // plaza y fuente
    f.fillStyle = '#b39a66'; f.beginPath(); f.arc(PLAZA.x, PLAZA.y, 64, 0, Math.PI * 2); f.fill();
    f.fillStyle = '#8f7a4f'; f.beginPath(); f.arc(PLAZA.x, PLAZA.y, 34, 0, Math.PI * 2); f.fill();
    f.fillStyle = '#3d8fd1'; f.beginPath(); f.arc(PLAZA.x, PLAZA.y, 26, 0, Math.PI * 2); f.fill();
    f.fillStyle = '#e0b756'; f.beginPath(); f.arc(PLAZA.x, PLAZA.y, 6, 0, Math.PI * 2); f.fill();
    // río decorativo
    f.strokeStyle = '#2e7cc0'; f.lineWidth = 26; f.beginPath();
    f.moveTo(W + 10, 20); f.bezierCurveTo(900, 90, 960, 250, 930, 540); f.stroke();
    f.strokeStyle = 'rgba(160,210,255,.35)'; f.lineWidth = 6; f.stroke();
    // árboles y flores (evitando edificios, caminos y plaza)
    ARBOLES.length = 0;
    for (let i = 0; i < 260 && ARBOLES.length < 46; i++) {
      const x = 20 + rnd() * (W - 60), y = 20 + rnd() * (H - 40);
      if (Math.hypot(x - PLAZA.x, y - PLAZA.y) < 110) continue;
      if (EDIFICIOS.some(e => x > e.cuerpo.x - 40 && x < e.cuerpo.x + BW + 40 && y > e.cuerpo.y - 70 && y < e.cuerpo.y + BH + 50)) continue;
      if (EDIFICIOS.some(e => distCamino(x, y, e) < 32)) continue;
      if (x > 880) continue;
      ARBOLES.push({ x, y, r: 12 + rnd() * 6 });
    }
    for (let i = 0; i < 80; i++) {
      const x = rnd() * W, y = rnd() * H;
      f.fillStyle = ['#f472b6', '#f3d27f', '#ffffff', '#a78bfa'][i % 4]; f.fillRect(x, y, 3, 3);
    }
  }
  const ARBOLES = [];
  function distCamino(x, y, e) {       // distancia aproximada a la curva plaza → puerta
    let m = 1e9;
    for (let t = 0; t <= 1; t += .05) {
      const cx = (1 - t) * (1 - t) * PLAZA.x + 2 * (1 - t) * t * e.puerta.x + t * t * e.puerta.x;
      const cy = (1 - t) * (1 - t) * PLAZA.y + 2 * (1 - t) * t * PLAZA.y + t * t * e.puerta.y;
      m = Math.min(m, Math.hypot(x - cx, y - cy));
    }
    return m;
  }
  dibujarFondo();

  // ---------------------------------------------------------- personaje
  const P = { x: PLAZA.x, y: PLAZA.y + 70, v: 2.6, dir: 1, paso: 0, movio: false, destino: null };
  const teclas = {};
  const MAPA = { w: 'arriba', arrowup: 'arriba', s: 'abajo', arrowdown: 'abajo', a: 'izquierda', arrowleft: 'izquierda', d: 'derecha', arrowright: 'derecha' };

  cv.addEventListener('keydown', e => {
    const k = MAPA[e.key.toLowerCase()];
    if (k) { teclas[k] = true; P.destino = null; e.preventDefault(); }
    if (['e', 'enter', ' '].includes(e.key.toLowerCase())) { if (cerca) { entrar(cerca); e.preventDefault(); } }
  });
  cv.addEventListener('keyup', e => { const k = MAPA[e.key.toLowerCase()]; if (k) teclas[k] = false; });
  cv.addEventListener('blur', () => Object.keys(teclas).forEach(k => teclas[k] = false));
  cv.addEventListener('pointerdown', e => {
    cv.focus({ preventScroll: true });
    const r = cv.getBoundingClientRect();
    const x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height;
    const tocado = EDIFICIOS.find(b => x > b.cuerpo.x && x < b.cuerpo.x + BW && y > b.cuerpo.y - 40 && y < b.cuerpo.y + BH);
    P.destino = tocado ? { x: tocado.puerta.x, y: tocado.puerta.y + 16, entrar: tocado } : { x, y };
  });

  function choca(x, y) {
    if (x < 14 || x > W - 14 || y < 20 || y > H - 8) return true;
    return EDIFICIOS.some(e => x > e.cuerpo.x + 4 && x < e.cuerpo.x + BW - 4 && y > e.cuerpo.y + 10 && y < e.cuerpo.y + BH - 2);
  }

  let cerca = null;
  function entrar(e) {
    window.KR && KR.visitarZona(e.id);
    KR && KR.beep([[660, .08], [880, .12]]);
    document.getElementById(e.id).scrollIntoView({ behavior: 'smooth' });
  }

  function actualizar() {
    let dx = 0, dy = 0;
    if (teclas.arriba) dy -= 1; if (teclas.abajo) dy += 1; if (teclas.izquierda) dx -= 1; if (teclas.derecha) dx += 1;
    if (P.destino) {
      const ddx = P.destino.x - P.x, ddy = P.destino.y - P.y, d = Math.hypot(ddx, ddy);
      if (d < 4) { const en = P.destino.entrar; P.destino = null; if (en) entrar(en); }
      else { dx = ddx / d; dy = ddy / d; }
    }
    if (dx || dy) {
      const n = Math.hypot(dx, dy); dx = dx / n * P.v; dy = dy / n * P.v;
      if (!choca(P.x + dx, P.y)) P.x += dx; else if (P.destino) P.destino = null;
      if (!choca(P.x, P.y + dy)) P.y += dy; else if (P.destino) P.destino = null;
      if (Math.abs(dx) > .1) P.dir = dx > 0 ? 1 : -1;
      P.paso += .25;
      if (!P.movio) { P.movio = true; window.KR && KR.desbloquear('pasos'); }
    } else P.paso = 0;

    const antes = cerca;
    cerca = EDIFICIOS.find(e => Math.hypot(P.x - e.puerta.x, P.y - e.puerta.y) < 46) || null;
    if (cerca !== antes) {
      if (cerca) {
        aviso.hidden = false;
        aviso.innerHTML = '';
        const t = document.createElement('span'); t.textContent = `${cerca.nombre} · pulsa E`;
        const b = document.createElement('button'); b.textContent = 'Entrar'; const obj = cerca; b.addEventListener('click', () => entrar(obj));
        aviso.append(t, b);
      } else aviso.hidden = true;
    }
  }

  // ---------------------------------------------------------- dibujo
  let tiempo = 0;
  function edificio(e) {
    const { x, y, w, h } = e.cuerpo;
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(x + 6, y + h - 4, w, 10);
    ctx.fillStyle = e.col; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,.07)'; for (let i = 0; i < w; i += 16) ctx.fillRect(x + i, y, 1, h);
    ctx.fillStyle = e.techo; ctx.beginPath(); ctx.moveTo(x - 10, y + 4); ctx.lineTo(x + w / 2, y - 40); ctx.lineTo(x + w + 10, y + 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.moveTo(x + w / 2, y - 40); ctx.lineTo(x + w + 10, y + 4); ctx.lineTo(x + w / 2, y + 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1b1405'; ctx.fillRect(e.x - 13, y + h - 34, 26, 34);
    ctx.fillStyle = e.techo; ctx.fillRect(e.x - 13, y + h - 34, 26, 3);
    ctx.fillStyle = '#f3d27f'; ctx.fillRect(x + 16, y + 22, 18, 16); ctx.fillRect(x + w - 34, y + 22, 18, 16);
    if (e.logo.complete && e.logo.naturalWidth) {
      const s = 46 + Math.sin(tiempo / 30 + e.x) * 2, cy = y - 70;
      ctx.save(); ctx.shadowColor = e.techo; ctx.shadowBlur = 18;
      ctx.fillStyle = 'rgba(5,14,29,.88)'; ctx.beginPath(); ctx.arc(e.x, cy, s / 2 + 7, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = e.techo; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
      ctx.drawImage(e.logo, e.x - s / 2, cy - s / 2, s, s);
    }
    ctx.font = '9px "Press Start 2P", monospace'; ctx.textAlign = 'center';
    const tw = ctx.measureText(e.nombre).width + 14;
    ctx.fillStyle = 'rgba(5,14,29,.82)'; ctx.fillRect(e.x - tw / 2, y + h + 8, tw, 18);
    ctx.fillStyle = cerca === e ? '#f3d27f' : '#f4f7fd'; ctx.fillText(e.nombre, e.x, y + h + 21);
    const visitada = window.KR && KR.estado().zonas.includes(e.id);
    if (visitada) { ctx.fillStyle = '#e0b756'; ctx.fillText('✓', x + w - 4, y + 4); }
  }
  function arbol(a) {
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(a.x + 3, a.y + a.r * .9, a.r * .9, a.r * .35, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5a3b22'; ctx.fillRect(a.x - 3, a.y, 6, a.r * .9);
    ctx.fillStyle = '#17482a'; ctx.beginPath(); ctx.arc(a.x, a.y - 2, a.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2b7a44'; ctx.beginPath(); ctx.arc(a.x - a.r * .3, a.y - a.r * .35, a.r * .6, 0, Math.PI * 2); ctx.fill();
  }
  function personaje() {
    const b = Math.sin(P.paso) * 2, x = Math.round(P.x), y = Math.round(P.y);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x, y + 2, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(x, y); ctx.scale(P.dir, 1);
    ctx.fillStyle = '#233d63'; ctx.fillRect(-5, -8 + (b > 0 ? 0 : 1), 4, 8); ctx.fillRect(1, -8 + (b > 0 ? 1 : 0), 4, 8);   // piernas
    ctx.fillStyle = '#15294a'; ctx.fillRect(-8, -24 + b * .3, 16, 17);                                                     // túnica
    ctx.fillStyle = '#e0b756'; ctx.fillRect(-8, -12 + b * .3, 16, 2); ctx.fillRect(-2, -24 + b * .3, 4, 12);              // cinturón y detalle
    ctx.fillStyle = '#f1c9a0'; ctx.fillRect(-6, -35 + b * .3, 12, 11);                                                     // cabeza
    ctx.fillStyle = '#3a2412'; ctx.fillRect(-7, -38 + b * .3, 14, 5); ctx.fillRect(-7, -35 + b * .3, 3, 6);               // pelo
    ctx.fillStyle = '#071428'; ctx.fillRect(2, -31 + b * .3, 2, 2);                                                        // ojo
    ctx.restore();
  }
  function particulas() {
    EDIFICIOS.forEach((e, i) => {
      for (let k = 0; k < 3; k++) {
        const t = (tiempo * .6 + k * 40 + i * 17) % 120;
        ctx.fillStyle = `rgba(243,210,127,${1 - t / 120})`;
        ctx.fillRect(e.x - 60 + ((k * 53 + i * 31) % 120), e.cuerpo.y - 10 - t * .4, 2, 2);
      }
    });
  }
  function dibujar() {
    ctx.drawImage(fondo, 0, 0);
    // agua de la fuente animada
    ctx.fillStyle = `rgba(160,210,255,${.35 + Math.sin(tiempo / 12) * .15})`;
    ctx.beginPath(); ctx.arc(PLAZA.x, PLAZA.y, 14 + Math.sin(tiempo / 10) * 3, 0, Math.PI * 2); ctx.fill();
    // orden por profundidad
    const objetos = [...ARBOLES.map(a => ({ y: a.y, d: () => arbol(a) })), ...EDIFICIOS.map(e => ({ y: e.cuerpo.y + BH, d: () => edificio(e) })), { y: P.y, d: personaje }];
    objetos.sort((a, b) => a.y - b.y).forEach(o => o.d());
    particulas();
    if (P.destino) { ctx.strokeStyle = 'rgba(243,210,127,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(P.destino.x, P.destino.y, 6 + Math.sin(tiempo / 5) * 2, 0, Math.PI * 2); ctx.stroke(); }
    if (document.activeElement !== cv && !P.movio) {
      ctx.fillStyle = 'rgba(5,14,29,.78)'; ctx.fillRect(W / 2 - 190, 18, 380, 30);
      ctx.fillStyle = '#f3d27f'; ctx.font = '10px "Press Start 2P", monospace'; ctx.textAlign = 'center';
      ctx.fillText('Haz clic en el mapa para jugar', W / 2, 38);
    }
  }

  let activo = false, raf = 0;
  function bucle() { tiempo++; actualizar(); dibujar(); raf = activo ? requestAnimationFrame(bucle) : 0; }
  new IntersectionObserver(en => {
    activo = en[0].isIntersecting;
    if (activo && !raf) raf = requestAnimationFrame(bucle);
  }, { threshold: .05 }).observe(cv);
  document.fonts && document.fonts.ready.then(() => dibujar());
})();

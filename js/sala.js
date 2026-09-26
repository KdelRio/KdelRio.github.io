/* ==========================================================================
   Sala del arcade: detrás del gabinete corre un mundo de plataformas 2D en
   pixel art. El caballero de la Arena del Dato avanza, salta enemigos,
   aplasta slimes y junta monedas; murciélagos, arqueros y gólems patrullan,
   y el dragón de Studios Conari cruza el cielo.
   Se dibuja en un lienzo de baja resolución escalado sin suavizado.
   ========================================================================== */
(() => {
  const sala = document.querySelector('.sala'), maquina = document.getElementById('maquina');
  if (!sala || !maquina) return;
  const cv = document.createElement('canvas'); cv.className = 'sala-lienzo'; sala.appendChild(cv);
  const g = cv.getContext('2d');
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  function elipse(cx, cy, rx, ry, c) { for (let y = -ry; y <= ry; y++) { const h = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry)))); R(cx - h, cy + y, h * 2, 1, c); } }
  const azar = (a, b) => a + Math.random() * (b - a);

  // sprite de la casa: el dragón de Studios Conari
  const img = src => { const i = new Image(); i.src = src; return i; };
  const DRAGON = img('assets/img/mascota/dragon-vuela.png');

  let W = 0, H = 0, S = 3, SUELO = 0, t = 0, avance = 0, activo = false;
  let estrellas = [], montes = [], colinas = [], nubes = [], cosas = [], textos = [], proximo = 0, dragon = null;
  const heroe = { x: 0, y: 0, vy: 0, suelo: true, paso: 0 };
  const VEL = .9;

  function medir() {
    S = Math.max(2, Math.round(Math.min(innerHeight / 230, innerWidth / 170)));   // en pantallas angostas, píxeles más chicos
    W = Math.ceil(innerWidth / S); H = Math.ceil(innerHeight / S);
    cv.width = W; cv.height = H; SUELO = H - 22;
    heroe.x = Math.round(W * .13); heroe.y = SUELO; heroe.vy = 0; heroe.suelo = true;
    estrellas = Array.from({ length: Math.round(W * H / 260) }, () => ({ x: azar(0, W), y: azar(0, SUELO * .7), f: azar(0, 6.3), v: azar(.5, 2) }));
    montes = []; colinas = []; nubes = [];
    for (let x = -40; x < W + 80; x += azar(26, 44)) montes.push({ x, h: azar(26, 58), w: azar(40, 70) });
    for (let x = -30; x < W + 60; x += azar(30, 50)) colinas.push({ x, h: azar(10, 22), w: azar(40, 64) });
    for (let i = 0; i < 9; i++) nubes.push({ x: azar(0, W), y: azar(8, SUELO * .5), w: azar(22, 44) });
    cosas = []; textos = []; proximo = 0;
    for (let x = 30; x < W + 60; x = generar(x));
  }

  // ---------------------------------------------------------- generación del mundo por tramos
  function generar(x) {
    const tipo = Math.random();
    if (Math.random() < .55) {                                     // murciélago en lo alto del cielo, en cualquier tramo
      cosas.push({ t: 'murcielago', x: x + azar(0, 30), y: azar(SUELO * .12, SUELO * .55), f: azar(0, 6), base: 0 });
    }
    if (Math.random() < .35) {                                     // plataforma alta flotante con monedas
      const n = 2 + (Math.random() * 3 | 0), y = SUELO - azar(70, 110);
      for (let i = 0; i < n; i++) cosas.push({ t: Math.random() < .25 ? 'estrella' : 'ladrillo', x: x + 10 + i * 8, y });
      for (let i = 0; i < n; i++) cosas.push({ t: 'moneda', x: x + 14 + i * 8, y: y - 8, f: i });
    }
    if (tipo < .3) {                                               // plataforma de ladrillos con monedas y a veces un bloque estrella o una cría
      const n = 3 + (Math.random() * 4 | 0), y = SUELO - azar(26, 44);
      for (let i = 0; i < n; i++) cosas.push({ t: i === 1 && Math.random() < .5 ? 'estrella' : 'ladrillo', x: x + i * 8, y });
      for (let i = 0; i < n - 1; i++) cosas.push({ t: 'moneda', x: x + 4 + i * 8, y: y - 10, f: i });
      return x + n * 8 + azar(18, 36);
    }
    if (tipo < .5) { cosas.push({ t: 'slime', x, y: SUELO, vx: -.25, f: azar(0, 6) }); return x + azar(26, 46); }
    if (tipo < .62) { cosas.push({ t: 'murcielago', x, y: SUELO - azar(34, 60), f: azar(0, 6), base: 0 }); return x + azar(24, 44); }
    if (tipo < .72) { cosas.push({ t: 'arquero', x, y: SUELO, f: 0 }); return x + azar(30, 50); }
    if (tipo < .8) { cosas.push({ t: 'golem', x, y: SUELO, vx: -.15, f: 0 }); return x + azar(40, 60); }
    if (tipo < .9) {                                               // arco de monedas sobre el suelo
      for (let i = 0; i < 5; i++) cosas.push({ t: 'moneda', x: x + i * 8, y: SUELO - 14 - Math.sin(i / 4 * Math.PI) * 14, f: i });
      return x + 50;
    }
    cosas.push({ t: 'cofre', x, y: SUELO }); return x + azar(26, 40);
  }

  // ---------------------------------------------------------- dibujo de fondo
  function fondo() {
    const cielo = g.createLinearGradient(0, 0, 0, SUELO);
    cielo.addColorStop(0, '#070a1f'); cielo.addColorStop(.6, '#141640'); cielo.addColorStop(1, '#2a1f55');
    g.fillStyle = cielo; g.fillRect(0, 0, W, H);
    for (const s of estrellas) { const b = .35 + .65 * Math.max(0, Math.sin(t * .05 * s.v + s.f)); R(s.x, s.y, 1, 1, `rgba(230,236,255,${b})`); }
    // luna
    elipse(W * .8, SUELO * .22, 12, 12, '#f3e7c4'); elipse(W * .8 + 3, SUELO * .22 - 3, 3, 3, '#e0d2a8'); elipse(W * .8 - 4, SUELO * .22 + 4, 2, 2, '#e0d2a8');
    // montañas lejanas y castillo
    const m = avance * .12;
    for (const mo of montes) {
      const x = ((mo.x - m) % (W + 120) + W + 120) % (W + 120) - 60;
      for (let i = 0; i < mo.h; i++) R(x + i * mo.w / 2 / mo.h, SUELO - 8 - i, mo.w - i * mo.w / mo.h, 1, i > mo.h - 5 ? '#3b4a8c' : '#1d2555');
    }
    const cx = ((W * .1 - m * .5) % (W + 80) + W + 80) % (W + 80) - 40, cy = SUELO - 30;
    R(cx, cy - 14, 26, 22, '#1a2150'); for (let i = 0; i < 4; i++) R(cx - 2 + i * 8, cy - 22, 5, 10, '#1a2150');
    for (let i = 0; i < 4; i++) R(cx - 2 + i * 8, cy - 25, 1 + 4 * (i % 2), 3, '#1a2150');
    for (const [dx, dy] of [[5, -8], [13, -4], [20, -9], [9, 1]]) R(cx + dx, cy + dy, 2, 2, (t >> 4) % 7 ? '#f3d27f' : '#c89a3a');
    // nubes
    for (const n of nubes) {
      const x = ((n.x - avance * .25) % (W + 60) + W + 60) % (W + 60) - 30;
      R(x, n.y, n.w, 5, '#343d80'); R(x + 4, n.y - 4, n.w - 12, 4, '#343d80'); R(x + 8, n.y - 6, n.w / 3, 2, '#343d80');
      R(x + 4, n.y - 4, n.w - 14, 1, '#4b56a8'); R(x, n.y, n.w, 1, '#4b56a8'); R(x + 2, n.y + 5, n.w - 4, 1, '#262d63');
    }
    // colinas cercanas
    const c = avance * .45;
    for (const co of colinas) {
      const x = ((co.x - c) % (W + 90) + W + 90) % (W + 90) - 45;
      for (let i = 0; i < co.h; i++) { const r = co.w / 2 * Math.sqrt(1 - (i / co.h) ** 2); R(x + co.w / 2 - r, SUELO - 1 - i, r * 2, 1, '#1e3f45'); }
    }
    // suelo: pasto y tierra en baldosas
    const o = Math.floor(avance) % 8;
    for (let x = -o; x < W; x += 8) {
      R(x, SUELO, 8, H - SUELO, '#5a3620'); R(x, SUELO, 8, 3, '#3fae5c'); R(x, SUELO + 3, 8, 1, '#2c7a44');
      R(x + 2, SUELO + 7, 2, 1, '#7a4a2c'); R(x + 5, SUELO + 12, 2, 1, '#7a4a2c'); R(x, SUELO + 4, 1, H, '#4a2c1a');
    }
  }

  // ---------------------------------------------------------- personajes (mismo arte que la Arena del Dato)
  // héroe del equipo (hojas laterales): corre o salta según su velocidad vertical
  const LAT = ['lat-camina', 'lat-salta'].map(n => img(`assets/img/personajes/${n}.png`));
  function caballero(x, y, paso, salta) {
    elipse(x, SUELO + 1, 5, 1, 'rgba(0,0,0,.35)');
    const hoja = salta ? LAT[1] : LAT[0], fr = salta ? (heroe.vy < -1.5 ? 1 : heroe.vy < .5 ? 2 : 4) : (paso >> 2) % 8;
    if (!hoja.complete || !hoja.naturalWidth) return;
    g.drawImage(hoja, fr * 36, 0, 36, 32, Math.round(x - 18), Math.round(y - 28), 36, 32);
  }
  function slime(x, y, f, aplastado) {
    elipse(x, y + 1, 6, 1, 'rgba(0,0,0,.35)');
    if (aplastado) { R(x - 7, y - 2, 14, 2, '#57c087'); return; }
    const s = Math.sin(f) * 1.2;
    R(x - 4, y - 8 + s, 8, 2, '#6bd49a'); R(x - 6, y - 6 + s, 12, 6 - s, '#57c087'); R(x - 5, y - 7 + s, 3, 1, '#b8f5d2');
    R(x - 3, y - 4 + s, 1, 2, '#071428'); R(x + 2, y - 4 + s, 1, 2, '#071428');
  }
  function murcielago(x, y, f) {
    const a = Math.sin(f * 2.4) > 0 ? -2 : 1;
    R(x - 2, y - 2, 4, 4, '#6d4fb8'); R(x - 1, y - 3, 1, 1, '#6d4fb8'); R(x + 1, y - 3, 1, 1, '#6d4fb8');
    R(x - 7, y - 1 + a, 5, 2, '#a78bfa'); R(x + 2, y - 1 + a, 5, 2, '#a78bfa'); R(x - 1, y - 1, 1, 1, '#ff5a5a'); R(x + 1, y - 1, 1, 1, '#ff5a5a');
  }
  function arquero(x, y, f) {
    elipse(x, y + 1, 5, 1, 'rgba(0,0,0,.35)');
    R(x - 2, y - 10, 4, 6, '#cfc8b6'); R(x - 2, y - 9, 4, 1, '#8a8474'); R(x - 2, y - 4, 1, 4, '#cfc8b6'); R(x + 1, y - 4, 1, 4, '#cfc8b6');
    R(x - 3, y - 16, 6, 6, '#e6e0d0'); R(x - 2, y - 14, 1, 2, '#1a1a22'); R(x - 1, y - 14, 1, 2, '#1a1a22');
    g.strokeStyle = (f >> 4) % 2 ? '#f3d27f' : '#8a5a2e'; g.lineWidth = 1; g.beginPath(); g.arc(x - 4, y - 9, 5, Math.PI - 1.3, Math.PI + 1.3); g.stroke();
  }
  function golem(x, y, f) {
    elipse(x, y + 1, 9, 2, 'rgba(0,0,0,.35)');
    const b = (f >> 4) % 2;
    R(x - 9, y - 18 + b, 18, 15, '#7d8290'); R(x - 9, y - 18 + b, 18, 2, '#9aa0ad'); R(x - 13, y - 15 + b, 4, 9, '#6b707c'); R(x + 9, y - 15 + b, 4, 9, '#6b707c');
    R(x - 6, y - 3, 5, 3, '#6b707c'); R(x + 1, y - 3, 5, 3, '#6b707c'); R(x - 5, y - 14 + b, 3, 2, '#7ec8ff'); R(x + 2, y - 14 + b, 3, 2, '#7ec8ff'); R(x - 7, y - 17 + b, 3, 1, '#4f8a4f');
  }
  function ladrillo(x, y) {
    R(x, y, 8, 8, '#b0552e'); R(x, y, 8, 1, '#d8794a'); R(x, y + 3, 8, 1, '#7a3218'); R(x, y + 7, 8, 1, '#7a3218');
    R(x + 3, y, 1, 3, '#7a3218'); R(x + 6, y + 4, 1, 3, '#7a3218'); R(x + 1, y + 4, 1, 3, '#7a3218');
  }
  function bloqueEstrella(x, y) {
    const brilla = (t >> 3) % 6 < 3;
    R(x, y, 8, 8, brilla ? '#f3d27f' : '#e0b756'); R(x, y + 7, 8, 1, '#9a7a2c'); R(x + 7, y, 1, 8, '#9a7a2c');
    R(x + 3, y + 1, 2, 6, '#fff5c4'); R(x + 1, y + 3, 6, 2, '#fff5c4');
  }
  function moneda(x, y, f) {
    const w = [4, 3, 1, 3][((t >> 3) + f) % 4];
    R(x - w / 2, y - 3, w, 6, '#f3d27f'); R(x - w / 2, y - 3, Math.max(1, w - 1), 1, '#fff5c4'); if (w > 2) R(x - w / 2 + 1, y - 1, 1, 3, '#c89a3a');
  }
  function cofre(x, y) {
    R(x - 6, y - 8, 12, 8, '#8a5530'); R(x - 6, y - 8, 12, 2, '#a86a3c'); R(x - 6, y - 5, 12, 1, '#e0b756'); R(x - 1, y - 6, 2, 3, '#e0b756');
    if ((t >> 4) % 4 === 0) R(x - 1, y - 12, 2, 2, '#fff5c4');
  }

  // ---------------------------------------------------------- lógica
  function paso() {
    t++; avance += VEL;
    for (const c of cosas) {
      c.x -= VEL;
      if (c.vx && !c.muerto) c.x += c.vx;
      if (c.f !== undefined) c.f += .12;
      if (c.t === 'murcielago') { c.base = c.base || c.y; c.y = c.base + Math.sin(c.f * .6) * 6; }
      if (c.muerto) c.muerto++;
    }
    cosas = cosas.filter(c => c.x > -40 && (!c.muerto || c.muerto < 30) && !c.tomada);
    let ultimo = cosas.reduce((m, c) => Math.max(m, c.x), 0);
    while (ultimo < W + 60) ultimo = generar(Math.max(ultimo + 20, W + 20));

    // héroe: salta si viene un enemigo o una moneda en el aire
    const hx = heroe.x;
    const delante = cosas.find(c => !c.muerto && ['slime', 'arquero', 'golem', 'cofre'].includes(c.t) && c.x - hx > 4 && c.x - hx < 26);
    const monedaAlta = cosas.find(c => c.t === 'moneda' && c.x - hx > 6 && c.x - hx < 20 && c.y < SUELO - 12);
    if (heroe.suelo && (delante || monedaAlta)) { heroe.vy = delante && delante.t === 'golem' ? -3.6 : -3.1; heroe.suelo = false; }
    heroe.vy += .16; heroe.y += heroe.vy;
    // aterriza sobre plataformas o el suelo
    const pies = heroe.y;
    for (const c of cosas) {
      if ((c.t === 'ladrillo' || c.t === 'estrella') && heroe.vy > 0 && Math.abs(c.x + 4 - hx) < 6 && pies >= c.y && pies - heroe.vy <= c.y + 1) { heroe.y = c.y; heroe.vy = 0; heroe.suelo = true; }
    }
    if (heroe.y >= SUELO) { heroe.y = SUELO; heroe.vy = 0; heroe.suelo = true; }
    else if (heroe.suelo && !cosas.some(c => (c.t === 'ladrillo' || c.t === 'estrella') && Math.abs(c.x + 4 - hx) < 6 && Math.abs(c.y - heroe.y) < 1)) heroe.suelo = false;
    heroe.paso++;
    // monedas y pisotones
    for (const c of cosas) {
      if (c.t === 'moneda' && Math.abs(c.x - hx) < 5 && Math.abs(c.y - (heroe.y - 12)) < 12) { c.tomada = true; textos.push({ x: c.x, y: c.y - 4, txt: '+10', v: 30 }); }
      if (c.t === 'slime' && !c.muerto && heroe.vy > 0 && Math.abs(c.x - hx) < 7 && heroe.y > c.y - 9 && heroe.y < c.y) {
        c.muerto = 1; heroe.vy = -2.4; heroe.suelo = false; textos.push({ x: c.x, y: c.y - 12, txt: '+100', v: 34 });
      }
    }
    textos = textos.filter(x => { x.y -= .3; x.x -= VEL; return --x.v > 0; });

    // el dragón cruza el cielo cada cierto tiempo
    if (!dragon && (window.__salaDragon || Math.random() < .002)) dragon = { x: W + 40, y: azar(SUELO * .15, SUELO * .45), f: 0 };
    if (dragon) { dragon.x -= 1.3; dragon.f++; if (dragon.x < -60) dragon = null; }
  }

  function dibujar() {
    fondo();
    for (const c of cosas) {
      if (c.t === 'ladrillo') ladrillo(c.x, c.y);
      else if (c.t === 'estrella') bloqueEstrella(c.x, c.y);
      else if (c.t === 'moneda') moneda(c.x, c.y, c.f | 0);
      else if (c.t === 'cofre') cofre(c.x, c.y);
    }
    if (dragon && DRAGON.complete && DRAGON.naturalWidth) {
      const fr = (dragon.f >> 3) % 8, k = .5;                      // hoja de 100 px por cuadro, a media escala en la sala
      g.drawImage(DRAGON, fr * 100, 0, 100, 100, Math.round(dragon.x), Math.round(dragon.y), 100 * k, 100 * k);
    }
    for (const c of cosas) {
      if (c.t === 'slime') slime(c.x, c.y, c.f, c.muerto);
      else if (c.t === 'murcielago') murcielago(c.x, c.y, c.f);
      else if (c.t === 'arquero') arquero(c.x, c.y, t);
      else if (c.t === 'golem') golem(c.x, c.y, t);
    }
    caballero(heroe.x, heroe.y, heroe.paso, !heroe.suelo);
    g.font = '5px "Press Start 2P", monospace'; g.textAlign = 'center';
    for (const x of textos) { g.fillStyle = '#071428'; g.fillText(x.txt, Math.round(x.x) + 1, Math.round(x.y) + 1); g.fillStyle = '#f3d27f'; g.fillText(x.txt, Math.round(x.x), Math.round(x.y)); }
  }

  // ---------------------------------------------------------- bucle: solo con la máquina abierta y sin acercar
  let previo = 0;
  function cuadro(ahora) {
    requestAnimationFrame(cuadro);
    const visible = !maquina.hidden && !maquina.classList.contains('enfocada') && !document.hidden;
    if (!visible) { activo = false; return; }
    if (!activo) { activo = true; previo = ahora; }
    if (ahora - previo < 33) return;
    const pasos = Math.min(3, Math.round((ahora - previo) / 33)); previo = ahora;
    for (let i = 0; i < pasos; i++) paso();
    dibujar();
  }
  addEventListener('resize', () => { medir(); if (quieto) { for (let i = 0; i < 90; i++) paso(); dibujar(); } });
  medir();
  if (quieto) { for (let i = 0; i < 90; i++) paso(); dibujar(); }      // una imagen fija, sin animación
  else requestAnimationFrame(cuadro);
})();

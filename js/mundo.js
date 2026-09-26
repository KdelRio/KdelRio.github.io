/* ==========================================================================
   Aldea del reino (modo arcade): plataformero 2D de scroll lateral en pixel art.
   Cinco edificios, uno por misión; barreras mágicas que se abren al superar
   cada etapa, aldeanos que explican la misión, doble salto y gemas de datos.
   La lógica de las misiones vive en arcade.js, que escucha KRAldea.al.
   El mundo se dibuja a 320x180 y se escala x3; la interfaz va a resolución completa.
   ========================================================================== */
(function () {
  'use strict';
  const cv = document.getElementById('aldea-canvas'); if (!cv) return;
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height, S = 3, WW = W / S, WH = H / S;
  const G = 158, MUNDO = 1560, DY = G - 236;                                   // línea del suelo y largo de la aldea
  const lienzo = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const mundo = lienzo(WW, WH), m = mundo.getContext('2d');
  const frente = lienzo(WW, WH), f = frente.getContext('2d');
  const mascara = lienzo(WW, WH), mk = mascara.getContext('2d');
  const luz = lienzo(WW, WH), l = luz.getContext('2d');

  // ---------------------------------------------------------- utilidades de pixel art
  const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  function tri(g, x1, x2, yb, ax, ay, c, lineas) {
    for (let y = ay; y < yb; y++) {
      const t = (y - ay) / (yb - ay), a = Math.round(ax + (x1 - ax) * t), b = Math.round(ax + (x2 - ax) * t);
      R(g, a, y, Math.max(1, b - a), 1, c);
      if (lineas && (yb - y) % 3 === 0) R(g, a, y, Math.max(1, b - a), 1, 'rgba(0,0,0,.16)');
    }
  }
  function elipse(g, cx, cy, rx, ry, c) {
    for (let y = -ry; y <= ry; y++) { const h = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry)))); R(g, cx - h, cy + y, h * 2, 1, c); }
  }
  const circ = (g, cx, cy, r, c) => elipse(g, cx, cy, r, r, c);
  const sombra = (g, cx, cy, rx, ry) => elipse(g, cx, cy, rx, ry, 'rgba(0,0,0,.28)');
  function ladrillos(g, x, y, w, h, base, junta, bw = 6, bh = 3) {
    R(g, x, y, w, h, base);
    for (let yy = y, fila = 0; yy < y + h; yy += bh, fila++) {
      R(g, x, yy, w, 1, junta);
      for (let xx = x + (fila % 2 ? bw / 2 : 0); xx < x + w; xx += bw) R(g, xx, yy, 1, Math.min(bh, y + h - yy), junta);
    }
  }
  let semilla = 11; const rnd = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;
  function hash(x, y) { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
  function ruido(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), s = t => t * t * (3 - 2 * t), u = s(x - xi), v = s(y - yi);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  const halo = (g, x, y, r, c) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); };

  // ---------------------------------------------------------- edificios (fachadas)
  const V = '#ffcf6b', VC = '#9fe3ff';
  const EDIFICIOS = [
    { id: 'estudio', nombre: 'Castillo Conari', img: 'logo-castillo-montana-bosque', mx: 170, base: 100, puerta: { x: 88 }, caja: { x: 30, y: 6, w: 116, h: 100 },
      ventanas: [[46, 54, 2, 6], [46, 72, 2, 6], [128, 54, 2, 6], [128, 72, 2, 6], [79, 52, 3, 6], [94, 52, 3, 6], [62, 78, 4, 6], [110, 78, 4, 6]],
      antorchas: [[76, 86, '#ffb347'], [100, 86, '#ffb347']], techos: [[56, 62, 64]] },
    { id: 'datos', nombre: 'Torre del Dato', img: 'logo-investigacion', mx: 470, base: 100, puerta: { x: 240 }, caja: { x: 214, y: 10, w: 52, h: 96 },
      ventanas: [[237, 48, 6, 9], [237, 66, 6, 9], [239, 84, 2, 2]], frias: true,
      antorchas: [[230, 88, '#7ec8ff'], [250, 88, '#7ec8ff']], techos: [[220, 90, 40], [222, 31, 36]],
      luces: [[240, 8, 36, 'rgba(126,200,255,.9)'], [274, 52, 22, 'rgba(126,200,255,.6)']] },
    { id: 'arcade', nombre: 'Arcade del Dragón', img: 'logo-dragon', mx: 790, base: 100, puerta: { x: 388 }, caja: { x: 334, y: 20, w: 104, h: 86 },
      ventanas: [], antorchas: [[374, 86, '#ff7ac2'], [402, 86, '#ff7ac2']], techos: [[356, 52, 64], [372, 37, 32]],
      luces: [[388, 68, 30, 'rgba(255,95,176,.7)'], [388, 92, 20, 'rgba(160,110,255,.6)']] },
    { id: 'gremio', nombre: 'Gremio de Habilidades', img: 'logo-arbol', mx: 1110, base: 236, puerta: { x: 97 }, caja: { x: 0, y: 158, w: 146, h: 84 },
      ventanas: [[70, 211, 8, 7], [116, 211, 8, 7], [96, 194, 4, 4]], antorchas: [[86, 222, '#ffb347']], techos: [[117, 183, 9], [18, 165, 32]],
      luces: [[34, 182, 34, 'rgba(140,255,180,.45)']] },
    { id: 'cv', nombre: 'Biblioteca · CV', img: 'logo-libro', mx: 1420, base: 236, puerta: { x: 240 }, caja: { x: 194, y: 150, w: 92, h: 92 },
      ventanas: [[213, 206, 6, 12], [261, 206, 6, 12], [239, 160, 2, 3]], antorchas: [[229, 222, '#ffb347'], [251, 222, '#ffb347']], techos: [[198, 194, 84], [230, 165, 20]] },
  ];

  const DIBUJO = {
    estudio(g) {
      sombra(g, 88, 101, 52, 4);
      ladrillos(g, 72, 46, 32, 22, '#74819d', '#5e6a85');
      tri(g, 68, 108, 47, 88, 22, '#27427e', true); tri(g, 88, 108, 47, 88, 22, '#1d3366', true); R(g, 87, 19, 2, 4, '#f3d27f');
      [38, 120].forEach(x => {
        ladrillos(g, x, 44, 18, 56, '#7d8aa6', '#66728d'); R(g, x + 14, 44, 4, 56, 'rgba(0,0,0,.18)');
        tri(g, x - 3, x + 21, 45, x + 9, 18, '#27427e', true); tri(g, x + 9, x + 21, 45, x + 9, 18, '#1d3366', true);
        R(g, x - 3, 44, 24, 1, '#e0b756'); R(g, x + 9, 9, 1, 10, '#cad6e5');
      });
      ladrillos(g, 56, 66, 64, 34, '#6b7894', '#56627c');
      for (let x = 56; x < 120; x += 6) { R(g, x, 62, 4, 4, '#7a87a3'); R(g, x, 65, 4, 1, '#56627c'); }
      R(g, 56, 96, 64, 4, 'rgba(0,0,0,.15)');
      for (let i = 0; i < 26; i++) R(g, 56 + rnd() * 62, 92 + rnd() * 7, 1 + (rnd() * 2 | 0), 1, rnd() < .5 ? '#4f7a4a' : '#3f6a3e');
      R(g, 80, 82, 16, 18, '#1a120a'); R(g, 81, 80, 14, 2, '#1a120a'); R(g, 83, 79, 10, 1, '#1a120a');
      [[79, 82, 1, 18], [96, 82, 1, 18], [80, 80, 1, 2], [95, 80, 1, 2], [81, 79, 2, 1], [93, 79, 2, 1], [83, 78, 10, 1]].forEach(r => R(g, ...r, '#aab3c5'));
      R(g, 81, 90, 14, 10, '#5a3b22'); [84, 88, 92].forEach(x => R(g, x, 90, 1, 10, '#3a2412'));
      for (let x = 82; x < 95; x += 3) R(g, x, 81, 1, 9, '#3b3326'); R(g, 81, 84, 14, 1, '#3b3326'); R(g, 81, 87, 14, 1, '#3b3326');
      R(g, 84, 67, 8, 10, '#1d3366'); R(g, 84, 67, 8, 1, '#e0b756'); R(g, 87, 69, 2, 5, '#f3d27f'); R(g, 85, 70, 6, 2, '#f3d27f');
      R(g, 84, 77, 3, 2, '#1d3366'); R(g, 89, 77, 3, 2, '#1d3366');
    },
    datos(g) {
      sombra(g, 240, 101, 28, 4);
      ladrillos(g, 220, 90, 40, 10, '#51607e', '#434f69', 8, 4); R(g, 220, 90, 40, 2, '#6a7a99');
      for (let i = 0; i < 28; i++) R(g, 226 + i, 36, 1, 54, i < 5 ? '#3c5a8a' : i < 17 ? '#4f73a8' : i < 23 ? '#44669b' : '#35517d');
      for (let y = 46; y < 90; y += 12) R(g, 226, y, 28, 1, '#2e466d');
      for (let i = 0; i < 30; i++) R(g, 227 + rnd() * 26, 37 + rnd() * 52, 1, 1, 'rgba(255,255,255,.08)');
      R(g, 222, 33, 36, 3, '#c9a24a'); R(g, 222, 36, 36, 1, '#8a6e2c');
      for (let x = 222; x < 258; x += 5) R(g, x, 31, 3, 2, '#c9a24a');
      tri(g, 223, 257, 31, 240, 14, '#3a7cc0', true); tri(g, 240, 257, 31, 240, 14, '#2c63a0', true);
      [[236, 47, 8, 11], [236, 65, 8, 11]].forEach(([x, y, w, h]) => R(g, x, y, w, h, '#22354f'));
      R(g, 235, 88, 10, 12, '#152238'); R(g, 236, 87, 8, 1, '#152238');
      R(g, 234, 88, 1, 12, '#c9a24a'); R(g, 245, 88, 1, 12, '#c9a24a'); R(g, 235, 86, 10, 1, '#c9a24a');
    },
    arcade(g) {
      sombra(g, 388, 101, 52, 4);
      R(g, 352, 62, 72, 38, '#5b2f63'); for (let x = 352; x < 424; x += 6) R(g, x, 64, 1, 30, '#4a2552');
      ladrillos(g, 352, 94, 72, 6, '#3e2a44', '#2e1f33', 8, 3);
      R(g, 352, 62, 72, 2, '#2e1626'); R(g, 352, 62, 2, 38, '#2e1626'); R(g, 422, 62, 2, 38, '#2e1626');
      R(g, 368, 47, 40, 6, '#5b2f63');
      for (let y = 52; y < 62; y++) { const t = (y - 52) / 10; R(g, 356 - 10 * t, y, 64 + 20 * t, 1, y % 2 ? '#b8365f' : '#a52f55'); }
      R(g, 346, 61, 84, 1, '#e0b756'); R(g, 344, 60, 3, 2, '#b8365f'); R(g, 342, 58, 2, 2, '#b8365f'); R(g, 429, 60, 3, 2, '#b8365f'); R(g, 432, 58, 2, 2, '#b8365f');
      for (let y = 38; y < 48; y++) { const t = (y - 38) / 10; R(g, 372 - 8 * t, y, 32 + 16 * t, 1, y % 2 ? '#b8365f' : '#a52f55'); }
      R(g, 364, 47, 48, 1, '#e0b756'); R(g, 362, 45, 2, 2, '#b8365f'); R(g, 412, 45, 2, 2, '#b8365f');
      R(g, 372, 37, 32, 2, '#e0b756');
      R(g, 366, 64, 44, 9, '#1a0d1f');
      R(g, 380, 82, 16, 18, '#12081a'); R(g, 379, 81, 18, 1, '#e0b756'); R(g, 379, 81, 1, 19, '#e0b756'); R(g, 396, 81, 1, 19, '#e0b756');
      [[357, 75, 16, 12], [403, 75, 16, 12]].forEach(r => R(g, ...r, '#2e1626'));
      R(g, 427, 88, 7, 11, '#7a4a24'); R(g, 427, 90, 7, 1, '#3a2412'); R(g, 427, 96, 7, 1, '#3a2412'); R(g, 428, 87, 5, 1, '#8f5a2e');
    },
    gremio(g) {
      R(g, 29, 196, 8, 40, '#5a3b22'); R(g, 35, 196, 2, 40, '#4a2f1a'); R(g, 25, 232, 4, 4, '#5a3b22'); R(g, 37, 232, 5, 4, '#5a3b22');
      R(g, 20, 200, 10, 3, '#5a3b22'); R(g, 36, 198, 12, 3, '#5a3b22');
      circ(g, 34, 182, 18, '#1f5e36'); circ(g, 18, 192, 11, '#1f5e36'); circ(g, 50, 192, 11, '#1f5e36');
      circ(g, 32, 178, 14, '#2a7a45'); circ(g, 20, 188, 7, '#2a7a45'); circ(g, 48, 187, 7, '#2a7a45'); circ(g, 28, 172, 7, '#3a9a58');
      for (let i = 0; i < 40; i++) { const a = rnd() * 6.28, d = rnd() * 16; R(g, 32 + Math.cos(a) * d, 180 + Math.sin(a) * d, 1, 1, rnd() < .5 ? '#4fb56c' : '#17482a'); }
      sombra(g, 98, 237, 42, 4);
      R(g, 64, 208, 68, 28, '#dccda5'); for (let i = 0; i < 40; i++) R(g, 65 + rnd() * 66, 209 + rnd() * 20, 1, 1, '#c9b98f');
      [64, 84, 108, 130].forEach(x => R(g, x, 208, 2, 24, '#5a3b22')); R(g, 64, 208, 68, 2, '#5a3b22'); R(g, 64, 220, 68, 2, '#5a3b22');
      for (let i = 0; i < 10; i++) { R(g, 66 + i * 2, 210 + i, 2, 1, '#6b4a2a'); R(g, 110 + i * 2, 219 - i, 2, 1, '#6b4a2a'); }
      ladrillos(g, 64, 230, 68, 6, '#6b6f7a', '#565a64', 7, 3);
      tri(g, 58, 138, 209, 98, 180, '#2e7a4a', true); tri(g, 98, 138, 209, 98, 180, '#256440', true); R(g, 58, 208, 80, 2, '#1d4f31');
      circ(g, 98, 196, 3, '#2a2016');
      R(g, 118, 184, 7, 16, '#6b6f7a'); R(g, 117, 183, 9, 2, '#555a66');
      R(g, 91, 219, 14, 17, '#5a3b22'); R(g, 92, 217, 12, 2, '#5a3b22'); [95, 99].forEach(x => R(g, x, 219, 1, 17, '#3a2412'));
      R(g, 90, 217, 1, 19, '#3a2412'); R(g, 105, 217, 1, 19, '#3a2412'); R(g, 102, 227, 1, 2, '#e0b756');
      [[69, 210, 10, 9], [115, 210, 10, 9]].forEach(r => R(g, ...r, '#3a2412'));
      R(g, 132, 212, 7, 1, '#3a2412'); R(g, 134, 213, 8, 8, '#1d3366'); R(g, 137, 214, 2, 5, '#f3d27f'); R(g, 136, 215, 4, 2, '#f3d27f');
    },
    cv(g) {
      sombra(g, 240, 237, 48, 4);
      for (let y = -20; y <= 0; y++) { const h = Math.round(Math.sqrt(400 - y * y)); R(g, 240 - h, 184 + y, h * 2, 1, '#c9a24a'); R(g, 240 - h, 184 + y, 2, 1, '#f3d27f'); }
      [232, 240, 248].forEach(x => R(g, x, 166 + Math.abs(x - 240) / 3, 1, 18 - Math.abs(x - 240) / 3, '#a8832f'));
      R(g, 237, 158, 6, 7, '#d9b45a'); R(g, 239, 154, 2, 4, '#f3d27f'); R(g, 238, 159, 4, 5, '#6b5220');
      R(g, 222, 184, 36, 6, '#d6cfbd');
      ladrillos(g, 200, 196, 80, 36, '#cfc8b6', '#bdb5a1', 8, 4);
      R(g, 198, 194, 84, 3, '#e6e0d0');
      tri(g, 198, 282, 195, 240, 180, '#e6e0d0'); tri(g, 208, 272, 193, 240, 184, '#d2cab6');
      R(g, 235, 187, 10, 4, '#e0b756'); R(g, 240, 187, 1, 4, '#a8832f');
      [[212, 205, 8, 14], [260, 205, 8, 14]].forEach(r => R(g, ...r, '#5e5646'));
      [206, 220, 254, 268].forEach(x => { R(g, x, 198, 6, 32, '#eee9dc'); R(g, x + 4, 198, 2, 32, '#c8c1ae'); R(g, x - 1, 197, 8, 2, '#f5f1e6'); R(g, x - 1, 229, 8, 2, '#f5f1e6'); });
      R(g, 212, 232, 56, 2, '#b8b2a4'); R(g, 208, 234, 64, 2, '#a8a294');
      R(g, 234, 212, 12, 20, '#3a2412'); R(g, 235, 210, 10, 2, '#3a2412'); R(g, 237, 209, 6, 1, '#3a2412'); R(g, 240, 212, 1, 20, '#2a1a0c');
      R(g, 233, 212, 1, 20, '#e0b756'); R(g, 246, 212, 1, 20, '#e0b756');
      [228, 248].forEach(x => { R(g, x, 202, 4, 12, '#1d3366'); R(g, x, 202, 4, 1, '#e0b756'); R(g, x + 1, 206, 2, 2, '#f3d27f'); R(g, x, 214, 1, 1, '#1d3366'); R(g, x + 3, 214, 1, 1, '#1d3366'); });
    },
  };
  EDIFICIOS.forEach(e => {
    e.off = { x: e.mx - e.puerta.x, y: G - e.base };                       // de coordenadas de diseño a coordenadas del mundo
    e.puerta.wx = e.mx;
    const c = e.caja; e.sprite = lienzo(c.w, c.h); const g = e.sprite.getContext('2d');
    g.translate(-c.x, -c.y); DIBUJO[e.id](g);
    e.ventanas.forEach(([x, y, w, h]) => R(g, x, y, w, h, e.frias ? VC : V));
    e.logo = new Image(); e.logo.src = `assets/img/${e.img}.png`;
  });

  // ---------------------------------------------------------- plataformas, cajas y gemas
  const PLATAFORMAS = [
    [262, 206, 34], [322, 180, 34], [382, 206, 30],
    [548, 198, 32], [690, 192, 30],
    [930, 198, 36], [985, 170, 30],
    [1196, 206, 32], [1256, 180, 32], [1312, 154, 30],
    [40, 206, 34], [78, 174, 28],
  ].map(([x, y, w]) => ({ x, y: y + DY, w }));
  EDIFICIOS.forEach(e => e.techos.forEach(([x, y, w]) => PLATAFORMAS.push({ x: x + e.off.x, y: y + e.off.y, w, oculta: true })));
  const FUENTE = { x: 625 };
  PLATAFORMAS.push({ x: FUENTE.x - 16, y: G - 8, w: 32, oculta: true });
  const CAJAS = [{ x: 870, y: G - 14, w: 14, h: 14 }, { x: 884, y: G - 14, w: 14, h: 14 }, { x: 877, y: G - 28, w: 14, h: 14 }];
  const GEMAS = [];
  PLATAFORMAS.forEach(p => { if (p.w >= 12 && p.x > 236) GEMAS.push({ x: p.x + p.w / 2, y: p.y - 11 }); });
  [[520, 212], [884, 196], [1160, 212], [1470, 212], [1500, 196]].forEach(([x, y]) => GEMAS.push({ x, y: y + DY }));
  GEMAS.forEach((g, i) => { g.fase = i * .7; g.tomada = false; });

  // ---------------------------------------------------------- misiones: barreras y fragmentos del emblema
  const BARRERAS = [238, 522, 852, 1166].map((x, i) => ({ x, i, abierta: false, disolver: 0 }));
  const FRAGMENTOS = [[57, G - 42], [92, G - 74], [170, G - 50]].map(([x, y]) => ({ x, y, tomado: false }));
  let aviso = null;

  // ---------------------------------------------------------- aldeanos
  const NPCS = [
    { id: 'lumi', tipo: 'lumi', x: 30, nombre: 'Lumi, la guía', lineas: [
      '¡Bienvenido, viajero! Soy Lumi, la guía del reino de Kevin del Río.',
      'Para recorrer su historia debes superar cinco misiones, una por edificio. Las barreras mágicas se abren al completar cada una.',
      'Muévete con A/D o las flechas y salta con Espacio: en el aire puedes saltar otra vez. Habla con todos y junta las gemas. ¡Suerte!'] },
    { id: 'guardia', tipo: 'guardia', x: 136, nombre: 'Sir Brando, guardia real', lineas: [
      '¡Alto! El Castillo Conari, hogar de Studios Conari SpA, está sellado.',
      'El emblema del estudio se partió en 3 fragmentos: uno flota junto a la entrada, otro más arriba y el último sobre la muralla.',
      'Tráelos y el portón se abrirá para que conozcas el estudio. Luego pulsa E frente a la puerta.'] },
    { id: 'maga', tipo: 'maga', x: 424, nombre: 'Aurora, maga del dato', lineas: [
      'La Torre del Dato entrena analistas con una prueba de combate.',
      'Cada golpe que des o recibas y cada enemigo que enfrentes quedará registrado como un dato.',
      'Sobrevive a las tres oleadas y te enseñaré a convertir esos datos en decisiones. Entra con E.'] },
    { id: 'gamer', tipo: 'gamer', x: 744, nombre: 'Tomi, campeón del arcade', lineas: [
      '¡Eh! El Arcade del Dragón guarda los juegos que creó el estudio.',
      'Primero encuentra los pares de habilidades en el Memorize.',
      'Si lo logras, te espera Ritmo Resonancia. ¡Sube el volumen y entra con E!'] },
    { id: 'sylva', tipo: 'elfa', x: 1172, nombre: 'Sylva, maestra del gremio', lineas: [
      'Aquí se forjan las especialidades del reino. Cada misión te enseñó algo de la tuya.',
      'Entra al Gremio y aprende las habilidades que te faltan de tu rama. También puedes verla con H.',
      'Cuando domines tu especialidad, se abrirá el camino a la Biblioteca.'] },
    { id: 'buho', tipo: 'buho', x: 1356, nombre: 'Profesor Búho', lineas: [
      'Llegaste al final del camino, viajero. Shhh, esta es la Biblioteca.',
      'Presiona P para abrir la hoja de personaje de Kevin: trayectoria, formación y logros.',
      'Ahí mismo termina esta aventura... y quizás empiece una conversación.'] },
  ];
  NPCS.forEach(n => { n.hablado = false; n.dir = 1; });

  // ---------------------------------------------------------- decorado
  const FAROLES = [18, 250, 372, 530, 700, 905, 1045, 1190, 1300, 1490];
  const BANCAS = [300, 580, 1240];
  const ARBOLES_FONDO = [];
  for (let x = 8; x < MUNDO; x += 17 + rnd() * 16) {
    if (EDIFICIOS.some(e => x + 11 > e.caja.x + e.off.x && x - 11 < e.caja.x + e.caja.w + e.off.x)) continue;
    ARBOLES_FONDO.push({ x: Math.round(x), tipo: rnd() < .45 ? 'pino' : rnd() < .6 ? 'roble' : 'sakura', v: rnd() < .5 ? 0 : 1, y: G - 1 - (rnd() * 3 | 0) });
  }
  function spriteArbol(tipo) {
    const c = lienzo(22, 28), g = c.getContext('2d');
    if (tipo === 'pino') {
      R(g, 10, 22, 3, 6, '#4a2f1a');
      [[0, 10, 8], [6, 9, 12], [12, 11, 17]].forEach(([ty, th, tw]) => {
        for (let r = 0; r < th; r++) { const h = Math.max(1, Math.round((r + 1) / th * tw / 2)); R(g, 11 - h, ty + r, h, 1, '#2f7a44'); R(g, 11, ty + r, h, 1, '#1f5a33'); }
        R(g, 11 - tw / 2, ty + th - 1, tw, 1, '#184a2a');
      });
    } else {
      const p = tipo === 'sakura' ? ['#9c4585', '#cc6aa8', '#f0a3d3'] : ['#1f5e36', '#2c7d47', '#45a060'];
      R(g, 9, 16, 4, 12, '#5a3b22'); R(g, 12, 16, 1, 12, '#4a2f1a'); R(g, 7, 26, 8, 2, '#5a3b22');
      circ(g, 11, 10, 9, p[0]); circ(g, 5, 13, 5, p[0]); circ(g, 17, 13, 5, p[0]);
      circ(g, 10, 9, 7, p[1]); circ(g, 5, 12, 3, p[1]); circ(g, 16, 11, 3, p[1]); circ(g, 8, 6, 3, p[2]);
      for (let i = 0; i < 14; i++) R(g, 3 + rnd() * 16, 3 + rnd() * 16, 1, 1, rnd() < .5 ? p[2] : p[0]);
    }
    return c;
  }
  const SPR = { pino: [spriteArbol('pino'), spriteArbol('pino')], roble: [spriteArbol('roble'), spriteArbol('roble')], sakura: [spriteArbol('sakura'), spriteArbol('sakura')] };

  // ---------------------------------------------------------- fondos con parallax
  const cielo = lienzo(WW, WH); (() => {
    const g = cielo.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, WH);
    gr.addColorStop(0, '#040917'); gr.addColorStop(.45, '#0b1733'); gr.addColorStop(.78, '#1d2250'); gr.addColorStop(1, '#2a2152');
    g.fillStyle = gr; g.fillRect(0, 0, WW, WH);
  })();
  const ESTRELLAS = Array.from({ length: 110 }, () => ({ x: rnd() * 600, y: rnd() * 105, b: rnd(), f: rnd() * 6 }));
  const montes = lienzo(960, WH); (() => {
    const g = montes.getContext('2d');
    for (let x = 0; x < 960; x++) {
      const y = Math.round(58 + ruido(x / 80, 1) * 46 + ruido(x / 24, 5) * 10 - Math.sin(x / 960 * Math.PI * 2) * 4);
      R(g, x, y, 1, WH - y, '#1b2550'); R(g, x, y, 1, 1, '#2d3a70');
      if (y < 70) R(g, x, y, 1, 2, '#6f7fb3');
    }
    const cx = 620, top = 84;                                             // silueta lejana de un castillo
    [[cx - 18, top - 16, 8, 30], [cx + 10, top - 16, 8, 30], [cx - 10, top - 6, 20, 20], [cx - 3, top - 24, 6, 40]].forEach(r => R(g, ...r, '#111a3c'));
    tri(g, cx - 20, cx - 8, top - 16, cx - 14, top - 26, '#111a3c'); tri(g, cx + 8, cx + 20, top - 16, cx + 14, top - 26, '#111a3c'); tri(g, cx - 5, cx + 5, top - 24, cx, top - 36, '#111a3c');
    [[cx - 15, top - 8], [cx + 13, top - 8], [cx - 1, top - 14], [cx + 4, top]].forEach(([x, y]) => R(g, x, y, 1, 2, '#ffcf6b'));
  })();
  const colinas = lienzo(960, WH); (() => {
    const g = colinas.getContext('2d');
    const alto = x => Math.round(112 + ruido(x / 55, 9) * 16);
    for (let x = 0; x < 960; x++) { const y = alto(x); R(g, x, y, 1, WH - y, '#122042'); }
    for (let x = 0; x < 960; x += 5 + rnd() * 7) {
      const y = alto(x), h = 10 + rnd() * 14, w = h * .45;
      tri(g, x - w, x + w, y + 2, x, y - h, '#0d1832');
    }
  })();

  // ---------------------------------------------------------- calle pre-renderizada
  const calle = lienzo(MUNDO, WH - G + 4); (() => {
    const g = calle.getContext('2d'), img = g.createImageData(MUNDO, WH - G), d = img.data;
    const hexa = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
    const PIEDRA = ['#8e8472', '#978b79', '#857a6b', '#9c907c'].map(hexa), JUNTA = hexa('#5f574a'), BORDE = hexa('#b2a690'), LINEA = hexa('#3a3530');
    const TIERRA = ['#3b2f2a', '#342924', '#2e2420'].map(hexa), ROCA = hexa('#4a4038');
    for (let y = 0; y < WH - G; y++) for (let x = 0; x < MUNDO; x++) {
      let c;
      if (y === 0) c = BORDE;
      else if (y < 11) { const fila = (y - 1) >> 2, off = (fila & 1) * 3, col = ((x + off) / 7) | 0; c = ((y - 1) % 4 === 3 || (x + off) % 7 === 0) ? JUNTA : PIEDRA[(hash(col, fila) * 4) | 0]; }
      else if (y === 11) c = LINEA;
      else { const n = ruido(x / 9, y / 5); c = n > .78 ? ROCA : TIERRA[Math.min(2, ((y - 12) / 9) | 0)]; }
      const i = (y * MUNDO + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 4);
    for (let i = 0; i < 260; i++) {                                         // matas y flores al borde de la calle
      const x = rnd() * MUNDO | 0;
      if (EDIFICIOS.some(e => Math.abs(x - e.puerta.wx) < 14)) continue;
      if (i % 4 === 0) { const col = ['#f472b6', '#f3d27f', '#f4f7fd', '#a78bfa'][(i >> 2) % 4]; R(g, x, 2, 1, 2, '#2c6437'); R(g, x, 1, 1, 1, col); }
      else { R(g, x, 2, 1, 2, '#2c6437'); R(g, x + 1, 1, 1, 3, '#3d8348'); R(g, x + 2, 3, 1, 1, '#2c6437'); }
    }
  })();

  // ---------------------------------------------------------- jugador
  const P = { x: 44, y: G, vx: 0, vy: 0, dir: 1, paso: 0, suelo: true, saltos: 0, coyote: 0, buffer: 0, bajar: 0, movio: false, meta: null, bloqueado: false };
  const teclas = {};
  const MAPA = { a: 'izq', arrowleft: 'izq', d: 'der', arrowright: 'der', w: 'saltar', arrowup: 'saltar', ' ': 'saltar', s: 'bajar', arrowdown: 'bajar' };
  let cam = 0, t = 0, cerca = null, dialogo = null, destello = null;
  const chispas = [], textos = [];

  cv.addEventListener('keydown', e => {
    const k = MAPA[e.key.toLowerCase()];
    if (k) {
      e.preventDefault();
      if (k === 'saltar' && !e.repeat) P.buffer = 7;
      if (k === 'bajar' && !e.repeat && P.suelo && P.y < G) P.bajar = 12;
      teclas[k] = true; P.meta = null;
    }
    if (['e', 'enter'].includes(e.key.toLowerCase())) { e.preventDefault(); accion(); }
    if (['h', 'p'].includes(e.key.toLowerCase()) && !e.repeat) { e.preventDefault(); API.al.tecla(e.key.toLowerCase(), cerca && cerca.id); }
  });
  cv.addEventListener('keyup', e => {
    const k = MAPA[e.key.toLowerCase()]; if (!k) return;
    teclas[k] = false; if (k === 'saltar' && P.vy < -2) P.vy = -2;                 // salto variable
  });
  cv.addEventListener('blur', () => Object.keys(teclas).forEach(k => teclas[k] = false));
  cv.addEventListener('pointerdown', e => {
    cv.focus({ preventScroll: true });
    const r = cv.getBoundingClientRect();
    const sx = (e.clientX - r.left) * W / r.width, sy = (e.clientY - r.top) * H / r.height;
    if (dialogo && !dialogo.cerrado && sx > 24 && sx < W - 24 && sy > 16 && sy < 124) { avanzarDialogo(); return; }
    const x = sx / S + cam, y = sy / S;
    if (Math.abs(x - P.x) < 14 && y < P.y - 4 && y > P.y - 60) { P.buffer = 7; return; }       // tocar sobre el héroe = saltar
    const npc = NPCS.find(n => Math.abs(x - n.x) < 10 && y > G - 34 && y < G + 4);
    if (npc) { P.meta = { x: npc.x + (P.x < npc.x ? -14 : 14) }; return; }
    const ed = EDIFICIOS.find(b => x > b.caja.x + b.off.x && x < b.caja.x + b.caja.w + b.off.x && y > b.caja.y + b.off.y && y < G + 30);
    P.meta = ed ? { x: ed.puerta.wx, entrar: ed } : { x: Math.max(10, Math.min(MUNDO - 10, x)) };
  });

  function accion() {
    if (cerca) return entrar(cerca);
    if (dialogo && !dialogo.cerrado) avanzarDialogo();
  }
  function entrar(e) {
    window.KR && KR.beep([[660, .08], [880, .12]]);
    destello = { x: e.puerta.wx, t: 30 };
    API.al.entrar(e.id);
  }
  function avanzarDialogo() {
    const d = dialogo, txt = d.npc.lineas[d.linea];
    if (d.chars < txt.length) { d.chars = txt.length; return; }
    window.KR && KR.beep([[740, .03]]);
    if (d.linea < d.npc.lineas.length - 1) { d.linea++; d.chars = 0; return; }
    d.cerrado = true;
    if (!d.npc.hablado) {
      d.npc.hablado = true; window.KR && KR.sumarXP(5);
      if (NPCS.every(n => n.hablado)) window.KR && KR.sumarXP(30, 'Conociste a todos los aldeanos');
    }
  }

  const tocaCaja = (x, y) => CAJAS.find(c => x + 4 > c.x && x - 4 < c.x + c.w && y > c.y && y - 17 < c.y + c.h);
  function actualizar() {
    let dir = (teclas.der ? 1 : 0) - (teclas.izq ? 1 : 0);
    if (!dir && P.meta) {
      const dx = P.meta.x - P.x;
      if (Math.abs(dx) > 2) dir = Math.sign(dx);
      else {
        P.vx = 0;
        if (P.meta.entrar) { if (P.y < G && P.suelo) P.bajar = 12; else if (P.suelo && P.y === G) { const e = P.meta.entrar; P.meta = null; entrar(e); } }
        else P.meta = null;
      }
      if (P.meta && P.bloqueado && P.suelo) P.buffer = 7;                  // salta obstáculos al caminar solo
    }
    const vmax = 1.7, acel = P.suelo ? .35 : .22;
    if (dir) { P.vx += (dir * vmax - P.vx) * acel; P.dir = dir; } else P.vx *= P.suelo ? .6 : .9;
    if (Math.abs(P.vx) < .05) P.vx = 0;

    // salto con coyote time y buffer
    if (P.suelo) { P.coyote = 6; P.saltos = 0; } else if (P.coyote > 0) P.coyote--;
    if (P.buffer > 0) {
      P.buffer--;
      if (P.coyote > 0) { P.vy = -5.3; P.coyote = 0; P.saltos = 1; P.buffer = 0; P.suelo = false; window.KR && KR.beep([[440, .05], [660, .05]]); }
      else if (P.saltos < 2) {
        P.vy = -4.8; P.saltos = 2; P.buffer = 0; window.KR && KR.beep([[660, .05], [990, .06]]);
        for (let i = 0; i < 8; i++) chispas.push({ x: P.x, y: P.y - 2, vx: Math.cos(i / 8 * 6.28) * 1.1, vy: Math.sin(i / 8 * 6.28) * .5 + .3, t: 18, c: '#f3d27f' });
      }
    }
    if (P.bajar > 0) P.bajar--;

    // horizontal
    P.bloqueado = false;
    P.x += P.vx;
    const cx = tocaCaja(P.x, P.y);
    if (cx) { P.x = P.vx > 0 ? cx.x - 4 : cx.x + cx.w + 4; P.vx = 0; P.bloqueado = true; }
    BARRERAS.forEach(b => {
      if (b.abierta || P.x + 4 <= b.x) return;
      P.x = b.x - 4; P.vx = 0; P.meta = null;
      if (!aviso || aviso.t < 60) aviso = { txt: 'Barrera sellada: completa la misión de esta zona para abrirla', t: 150 };
    });
    P.x = Math.max(8, Math.min(MUNDO - 8, P.x));

    // vertical
    const y0 = P.y; P.vy = Math.min(6, P.vy + .32); P.y += P.vy; P.suelo = false;
    if (P.vy >= 0) {
      for (const p of PLATAFORMAS) if (P.bajar <= 0 && y0 <= p.y && P.y >= p.y && P.x + 3 > p.x && P.x - 3 < p.x + p.w) { P.y = p.y; P.vy = 0; P.suelo = true; }
      for (const c of CAJAS) if (y0 <= c.y && P.y >= c.y && P.x + 4 > c.x && P.x - 4 < c.x + c.w) { P.y = c.y; P.vy = 0; P.suelo = true; }
    } else { const c = tocaCaja(P.x, P.y); if (c) { P.y = c.y + c.h + 17; P.vy = 0; } }
    if (P.y >= G) { if (P.vy > 3) for (let i = 0; i < 5; i++) chispas.push({ x: P.x, y: G, vx: (rnd() - .5) * 1.6, vy: -rnd() * .8, t: 14, c: '#b2a690' }); P.y = G; P.vy = 0; P.suelo = true; }
    if (P.y < 12) { P.y = 12; P.vy = 0; }

    if (!P.movio && (Math.abs(P.vx) > .5 || !P.suelo)) { P.movio = true; window.KR && KR.desbloquear('pasos'); }
    P.paso = P.suelo && Math.abs(P.vx) > .3 ? P.paso + Math.abs(P.vx) * .11 : 0;

    // cámara
    const obj = Math.max(0, Math.min(MUNDO - WW, P.x - WW * .45));
    cam += (obj - cam) * .12;

    // gemas
    GEMAS.forEach(g => {
      if (g.tomada || Math.abs(P.x - g.x) > 8 || Math.abs(P.y - 9 - g.y) > 11) return;
      g.tomada = true; textos.push({ x: g.x, y: g.y, t: 40, txt: '+2 XP' });
      for (let i = 0; i < 6; i++) chispas.push({ x: g.x, y: g.y, vx: (rnd() - .5) * 2, vy: -rnd() * 1.5, t: 20, c: '#9fe3ff' });
      window.KR && KR.beep([[988, .04], [1319, .08]]); window.KR && KR.sumarXP(2);
      if (GEMAS.every(x => x.tomada)) window.KR && KR.sumarXP(40, '¡Juntaste todas las gemas de datos!');
    });

    // fragmentos del emblema
    FRAGMENTOS.forEach(fr => {
      if (fr.tomado || Math.abs(P.x - fr.x) > 8 || Math.abs(P.y - 9 - fr.y) > 12) return;
      fr.tomado = true; textos.push({ x: fr.x, y: fr.y, t: 50, txt: 'FRAGMENTO' });
      for (let k = 0; k < 12; k++) chispas.push({ x: fr.x, y: fr.y, vx: Math.cos(k / 12 * 6.28) * 1.4, vy: Math.sin(k / 12 * 6.28) * 1.4, t: 26, c: '#f3d27f' });
      window.KR && KR.beep([[784, .06], [988, .06], [1175, .12]]);
      API.al.fragmento(FRAGMENTOS.map(x => x.tomado));
    });
    BARRERAS.forEach(b => { if (b.disolver > 0) b.disolver--; });
    if (aviso && aviso.t > 0) aviso.t--;

    // puertas y aldeanos
    const antes = cerca;
    cerca = P.suelo && P.y === G ? EDIFICIOS.find(e => Math.abs(P.x - e.puerta.wx) < 10) || null : null;
    if (cerca !== antes && cerca) window.KR && KR.beep([[520, .04]]);
    const npc = NPCS.find(n => Math.abs(P.x - n.x) < 17 && P.y > G - 40);
    if (npc) {
      npc.dir = P.x < npc.x ? -1 : 1;
      if (!dialogo || dialogo.npc !== npc) { dialogo = { npc, linea: 0, chars: 0, cerrado: false }; window.KR && KR.beep([[587, .04], [784, .05]]); }
    } else dialogo = null;
    if (dialogo && !dialogo.cerrado) {
      const antesC = dialogo.chars | 0; dialogo.chars = Math.min(dialogo.npc.lineas[dialogo.linea].length, dialogo.chars + .9);
      if ((dialogo.chars | 0) !== antesC && antesC % 3 === 0 && window.KR) KR.beep([[300 + (antesC % 5) * 40, .015]]);
    }
    for (let i = chispas.length - 1; i >= 0; i--) { const c = chispas[i]; c.x += c.vx; c.y += c.vy; c.vy += .06; if (--c.t <= 0) chispas.splice(i, 1); }
    for (let i = textos.length - 1; i >= 0; i--) { textos[i].y -= .4; if (--textos[i].t <= 0) textos.splice(i, 1); }
  }

  // ---------------------------------------------------------- dibujo: animaciones de edificios
  const brillos = []; let bo = { x: 0, y: 0 };
  const B = (x, y, w, h) => brillos.push([x + bo.x, y + bo.y, w, h]);
  function antorcha(g, x, y, col) {
    R(g, x, y + 2, 2, 3, '#2a2330');
    const fr = (t >> 2) % 3;
    R(g, x, y - 1 + (fr === 1 ? 1 : 0), 2, 3 - (fr === 1 ? 1 : 0), col); R(g, x, y - 2 + fr % 2, 1 + (fr === 2 ? 1 : 0), 1, '#fff5c4'); B(x, y - 2, 2, 4);
  }
  const ANIM = {
    estudio(g) {
      const fr = (t >> 4) % 2;
      [47, 129].forEach(x => { [[0, 6], [1, 7], [2, 7], [3, 5]].forEach(([r, w]) => R(g, x + 1 + (fr && r % 2 ? 1 : 0), 10 + r, w - (fr && r === 3 ? 1 : 0), 1, r === 1 ? '#f3d27f' : '#e0b756')); R(g, x + 3, 11, 2, 2, '#1d3366'); });
    },
    datos(g) {
      const y0 = Math.round(4 + Math.sin(t / 22) * 1.5);
      [1, 3, 5, 7, 5, 3, 1].forEach((w, i) => { R(g, 240 - (w >> 1), y0 + i, w, 1, '#7ec8ff'); R(g, 240 - (w >> 1), y0 + i, Math.ceil(w / 2), 1, '#c9eeff'); });
      R(g, 240, y0 + 2, 1, 3, '#ffffff'); B(236, y0, 9, 7);
      if (Math.random() > .03) {
        R(g, 261, 42, 26, 22, 'rgba(126,200,255,.13)'); R(g, 261, 42, 26, 1, 'rgba(126,200,255,.5)');
        for (let i = 0; i < 4; i++) { const h = 5 + Math.round((Math.sin(t / 25 + i * 1.3) + 1) * 6); R(g, 264 + i * 6, 61 - h, 4, h, '#7ec8ff'); R(g, 264 + i * 6, 61 - h, 4, 1, '#e6f7ff'); B(264 + i * 6, 61 - h, 4, h); }
        R(g, 262, 61, 24, 1, '#b9e6ff');
      }
      for (let i = 0; i < 4; i++) { const a = t / 30 + i * Math.PI / 2; R(g, 240 + Math.cos(a) * 20, 62 + Math.sin(a) * 5, 1, 1, '#c9eeff'); B(240 + Math.cos(a) * 20, 62 + Math.sin(a) * 5, 1, 1); }
    },
    arcade(g) {
      if ((t / 30 | 0) % 7 !== 0) { R(g, 366, 64, 44, 1, '#ff5fb0'); R(g, 366, 72, 44, 1, '#ff5fb0'); R(g, 366, 64, 1, 9, '#ff5fb0'); R(g, 409, 64, 1, 9, '#ff5fb0'); B(366, 64, 44, 9); }
      [[358, 76], [404, 76]].forEach(([x, y], k) => {
        R(g, x, y, 14, 10, '#1b0f2a');
        for (let i = 0; i < 4; i++) { const h = 2 + Math.round((Math.sin(t / 9 + i + k * 2) + 1) * 3.5); R(g, x + 1 + i * 3.4, y + 10 - h, 2, h, ['#f472b6', '#7ec8ff', '#6bd49a', '#f3d27f'][(i + k + (t >> 6)) % 4]); }
        R(g, x + ((t >> 2) + k * 5) % 13, y + 1, 1, 1, '#ffffff'); B(x, y, 14, 10);
      });
      R(g, 382, 84, 12, 16, (t >> 3) % 2 ? '#3a1850' : '#4a2060'); R(g, 384, 86, 8, 5, ['#f472b6', '#7ec8ff'][(t >> 5) % 2]); B(382, 84, 12, 16);
      const fl = Math.round(Math.sin(t / 8) * 2);
      R(g, 376, 34, 6, 2, '#2b7d63'); R(g, 374, 31, 2, 4, '#2b7d63'); R(g, 373, 30, 2, 2, '#3fae8a');
      R(g, 380, 31, 14, 5, '#3fae8a'); R(g, 380, 35, 14, 1, '#2b7d63'); R(g, 383, 34, 8, 1, '#a7e0b8');
      R(g, 382, 36, 2, 2, '#2b7d63'); R(g, 390, 36, 2, 2, '#2b7d63');
      tri(g, 381, 392, 31, 385, 21 - fl, '#2b7d63'); tri(g, 383, 390, 31, 385, 24 - fl, '#4cc79d');
      R(g, 392, 27, 3, 5, '#3fae8a'); R(g, 393, 24, 7, 4, '#3fae8a'); R(g, 399, 25, 2, 3, '#3fae8a'); R(g, 393, 27, 8, 1, '#2b7d63');
      R(g, 394, 22, 1, 2, '#f3d27f'); R(g, 396, 22, 1, 2, '#f3d27f'); R(g, 397, 25, 1, 1, '#ff5a5a'); B(397, 25, 1, 1);
      const ci = t % 260;
      if (ci < 44) for (let k = 0; k < 6; k++) { const px = 402 + k * 3 + (ci % 4), py = 26 + Math.round(Math.sin(k + ci * .5)); R(g, px, py, 2, 2, k < 2 ? '#fff1a8' : k < 4 ? '#ffb347' : '#ff6a3d'); B(px, py, 2, 2); }
    },
    gremio(g) {
      [[24, 180], [40, 174], [34, 190], [16, 194], [52, 190], [44, 184], [30, 166]].forEach(([x, y], i) => {
        const p = (Math.sin(t / 20 + i * 1.7) + 1) / 2, col = i % 3 === 0 ? '#f3d27f' : '#9dffc0';
        if (p > .25) { R(g, x - 1, y, 3, 1, col); R(g, x, y - 1, 1, 3, col); B(x - 1, y - 1, 3, 3); }
      });
      for (let i = 0; i < 6; i++) { const fz = (i / 6 + t / 240) % 1, r = 1 + fz * 3; R(g, 121 + Math.sin(fz * 6 + i * 1.5) * 3 - r / 2, 182 - fz * 30, r, r, `rgba(200,205,220,${.45 * (1 - fz)})`); }
    },
    cv(g) {
      const x = 212, y = 236, cola = Math.round(Math.sin(t / 15) * 1.5);
      R(g, x - 3, y - 4, 7, 4, '#2a2a35'); R(g, x + 2, y - 7, 4, 4, '#2a2a35'); R(g, x + 2, y - 8, 1, 1, '#2a2a35'); R(g, x + 5, y - 8, 1, 1, '#2a2a35');
      R(g, x - 4, y - 5 + cola, 1, 3, '#2a2a35'); R(g, x - 5, y - 6 + cola, 1, 2, '#2a2a35');
      if ((t % 200) > 8) { R(g, x + 3, y - 6, 1, 1, '#f3d27f'); R(g, x + 5, y - 6, 1, 1, '#f3d27f'); B(x + 3, y - 6, 3, 1); }
    },
  };

  // ---------------------------------------------------------- dibujo: aldeanos (mirando a la derecha, pies en 0,0)
  const DIBUJO_NPC = {
    lumi(g) {
      const y = -16 + Math.round(Math.sin(t / 15) * 2), a = (t >> 3) % 2;
      R(g, -5, y - 2 - a, 3, 3, 'rgba(200,230,255,.75)'); R(g, 3, y - 2 - a, 3, 3, 'rgba(200,230,255,.75)');
      circ(g, 0, y, 3, '#f3d27f'); circ(g, 0, y, 2, '#fff5c4'); R(g, 1, y - 1, 1, 1, '#071428');
      if (t % 12 < 6) R(g, -2 + (t % 5), y + 5, 1, 1, '#f3d27f');
      return [[-3, y - 3, 7, 7]];
    },
    guardia(g) {
      R(g, 6, -26, 1, 26, '#6b4a2a'); R(g, 5, -29, 3, 3, '#cad6e5'); R(g, 6, -31, 1, 2, '#eef2f8');
      R(g, -3, -5, 2, 5, '#3a4050'); R(g, 1, -5, 2, 5, '#3a4050'); R(g, -3, -1, 2, 1, '#1e1a24'); R(g, 1, -1, 3, 1, '#1e1a24');
      R(g, -4, -13, 8, 8, '#9aa3b5'); R(g, -4, -13, 2, 8, '#7d8698'); R(g, -1, -13, 4, 8, '#1d3366'); R(g, 0, -11, 2, 2, '#e0b756'); R(g, -4, -7, 8, 1, '#e0b756');
      R(g, 3, -12, 2, 4, '#9aa3b5'); R(g, 5, -9, 2, 2, '#f1c9a0');
      R(g, -3, -19, 6, 6, '#f1c9a0'); R(g, -4, -21, 8, 4, '#b8c0cc'); R(g, -4, -17, 2, 3, '#b8c0cc'); R(g, 1, -17, 1, 1, '#071428');
      R(g, -2, -24, 3, 3, '#c24848'); R(g, -3, -23, 1, 2, '#c24848');
    },
    maga(g) {
      R(g, 6, -24, 1, 24, '#6b4a2a'); const br = (Math.sin(t / 12) + 1) / 2;
      R(g, 5, -28, 3, 4, br > .5 ? '#c9eeff' : '#9fe3ff'); R(g, 6, -29, 1, 1, '#ffffff');
      for (let y = -13; y < 0; y++) { const w = 8 + Math.round((y + 13) / 13 * 4); R(g, -w / 2, y, w, 1, '#2c63a0'); }
      R(g, -6, -1, 12, 1, '#e0b756'); R(g, -4, -8, 8, 1, '#e0b756'); R(g, 3, -11, 3, 2, '#2c63a0'); R(g, 5, -10, 2, 2, '#f1c9a0');
      R(g, -3, -19, 6, 6, '#f1c9a0'); R(g, -4, -19, 2, 9, '#dfe6f0'); R(g, 1, -16, 1, 1, '#071428');
      R(g, -6, -20, 12, 1, '#1d4a80'); tri(g, -4, 4, -20, -3, -31, '#2c63a0'); R(g, -4, -21, 8, 1, '#e0b756'); R(g, -1, -25, 1, 1, '#f3d27f');
      return [[5, -29, 3, 5]];
    },
    gamer(g) {
      const s = (t >> 4) % 2;
      g.translate(0, -s);
      R(g, -3, -5, 2, 5, '#2e4a7a'); R(g, 1, -5, 2, 5, '#2e4a7a'); R(g, -3, -1, 3, 1, '#f4f7fd'); R(g, 1, -1, 3, 1, '#f4f7fd');
      R(g, -4, -13, 8, 8, '#b8365f'); R(g, -2, -8, 4, 2, '#9a2c4f'); R(g, -5, -13, 2, 3, '#9a2c4f');
      R(g, 2, -10, 3, 2, '#b8365f'); R(g, 4, -11, 4, 3, '#2a2a35'); R(g, 5, -11, 2, 2, ['#f472b6', '#7ec8ff', '#6bd49a'][(t >> 4) % 3]);
      R(g, -3, -19, 6, 6, '#e8b98f'); R(g, -3, -20, 6, 2, '#3a2412'); R(g, -4, -21, 7, 2, '#2fb39a'); R(g, -6, -20, 3, 1, '#2fb39a'); R(g, 1, -16, 1, 1, '#071428');
      return [[5, -11 - s, 2, 2]];
    },
    elfa(g) {
      for (let y = -13; y < 0; y++) { const w = 8 + Math.round((y + 13) / 13 * 3); R(g, -w / 2 - 1, y, w, 1, '#2e7a4a'); }
      R(g, -1, -12, 3, 11, '#c9a24a'); R(g, -5, -17, 3, 5, '#256440');
      R(g, -3, -19, 6, 6, '#f1d2b0'); R(g, -3, -20, 6, 2, '#a4532e'); R(g, -4, -19, 2, 8, '#a4532e'); R(g, 3, -17, 2, 1, '#f1d2b0'); R(g, 4, -18, 1, 1, '#f1d2b0'); R(g, 1, -16, 1, 1, '#2a6a3a');
      const y = -11 + Math.round(Math.sin(t / 18)); R(g, 3, -10, 2, 2, '#2e7a4a'); R(g, 5, y - 1, 2, 2, '#9dffc0');
      return [[5, y - 1, 2, 2]];
    },
    buho(g) {
      R(g, -6, -3, 12, 3, '#8e2f2f'); R(g, -6, -6, 11, 3, '#1d3366'); R(g, -5, -9, 10, 3, '#2e7a4a'); R(g, 5, -3, 1, 3, '#f4f7fd'); R(g, 4, -6, 1, 3, '#f4f7fd'); R(g, 4, -9, 1, 3, '#f4f7fd');
      R(g, -6, -2, 12, 1, '#e0b756');
      elipse(g, 0, -15, 5, 6, '#8a6a42'); elipse(g, 0, -13, 3, 4, '#cbb28a'); R(g, -1, -14, 1, 1, '#8a6a42'); R(g, 1, -12, 1, 1, '#8a6a42');
      R(g, -5, -16, 1, 5, '#6b4a2a'); R(g, 4, -16, 1, 5, '#6b4a2a'); R(g, -4, -23, 1, 2, '#6b4a2a'); R(g, 3, -23, 1, 2, '#6b4a2a');
      if (t % 180 > 6) { circ(g, -2, -19, 2, '#f3d27f'); circ(g, 2, -19, 2, '#f3d27f'); R(g, -2, -19, 1, 1, '#071428'); R(g, 2, -19, 1, 1, '#071428'); }
      else { R(g, -4, -19, 4, 1, '#3a2412'); R(g, 1, -19, 4, 1, '#3a2412'); }
      R(g, 0, -17, 1, 2, '#e0b756'); R(g, -1, -19, 3, 1, 'rgba(202,214,229,.6)');
    },
    cartera(g) {
      const saluda = Math.abs(P.x - this.x) < 60 ? Math.round(Math.sin(t / 5)) : 0;
      R(g, -3, -5, 2, 5, '#2a3350'); R(g, 1, -5, 2, 5, '#2a3350'); R(g, -3, -1, 2, 1, '#1e1a24'); R(g, 1, -1, 3, 1, '#1e1a24');
      R(g, -4, -13, 8, 8, '#3b4f9a'); R(g, 0, -12, 1, 1, '#e0b756'); R(g, 0, -10, 1, 1, '#e0b756');
      for (let i = 0; i < 7; i++) R(g, -4 + i, -13 + i, 1, 1, '#6b4a2a');
      R(g, -6, -8, 4, 5, '#8a5a2e'); R(g, -6, -9, 3, 2, '#f4f7fd');
      R(g, 4, -14 + saluda, 2, 4, '#3b4f9a'); R(g, 4, -16 + saluda, 2, 2, '#e8b98f');
      R(g, -3, -19, 6, 6, '#e8b98f'); R(g, -3, -20, 6, 2, '#1a1a22'); R(g, -5, -19, 2, 5, '#1a1a22');
      R(g, -4, -22, 8, 2, '#3b4f9a'); R(g, 3, -21, 3, 1, '#2a3a7a'); R(g, -1, -22, 2, 1, '#e0b756'); R(g, 1, -16, 1, 1, '#071428');
      R(g, -6, -16, 3, 2, '#cad6e5'); R(g, -6, -18, 2, 2, '#cad6e5'); R(g, -7, -17, 1, 1, '#e0b756');
    },
  };
  function dibujarNPC(g, n, x, y, dir) {
    g.save(); g.translate(Math.round(x), Math.round(y)); g.scale(dir, 1);
    if (n.tipo !== 'lumi') sombra(g, 0, 0, 5, 1);
    const gl = DIBUJO_NPC[n.tipo].call(n, g) || [];
    g.restore();
    return gl.map(([dx, dy, w, h]) => [x + (dir > 0 ? dx : -dx - w), y + dy, w, h]);
  }

  // ---------------------------------------------------------- dibujo: escena
  // héroe del equipo en scroll lateral: idle, caminar (8 cuadros) y salto (6); la hoja mira a la derecha
  const LAT = ['lat-idle', 'lat-camina', 'lat-salta'].map(n => { const i = new Image(); i.src = `assets/img/personajes/${n}.png`; return i; });
  const LW = 36, LH = 32, LPIES = 28;
  function heroe(g) {
    const x = Math.round(P.x - cam), y = Math.round(P.y), aire = !P.suelo;
    sombra(g, x, G, P.y === G ? 5 : Math.max(2, Math.round(5 - (G - P.y) / 12)), 1);
    let hoja, fr;
    if (aire) { hoja = LAT[2]; fr = P.vy < -2.5 ? 1 : P.vy < -.5 ? 2 : P.vy < 1.5 ? 3 : 4; }
    else if (Math.abs(P.vx) > .3) { hoja = LAT[1]; fr = Math.floor(P.paso * 2) % 8; }
    else { hoja = LAT[0]; fr = [0, 1, 2, 1][(t >> 4) % 4]; }
    if (!hoja.complete || !hoja.naturalWidth) return;
    g.save(); g.translate(x, y); g.scale(P.dir, 1);
    g.drawImage(hoja, fr * LW, 0, LW, LH, -LW / 2, -LPIES, LW, LH);
    g.restore();
  }
  function farol(g, wx) {
    const x = Math.round(wx - cam), y = G;
    R(g, x, y - 26, 2, 26, '#2a2f3a'); R(g, x - 1, y - 2, 4, 2, '#2a2f3a'); R(g, x - 2, y - 27, 6, 1, '#2a2f3a');
    R(g, x - 2, y - 33, 6, 6, '#1a1f2a'); R(g, x - 1, y - 32, 4, 4, '#ffd27a'); R(g, x - 3, y - 34, 8, 1, '#3a4050'); R(g, x, y - 36, 2, 2, '#3a4050');
    brillos.push([x - 1, y - 32, 4, 4]);
  }
  function banca(g, wx) { const x = Math.round(wx - cam), y = G; R(g, x - 7, y - 8, 14, 1, '#6b4a2a'); R(g, x - 7, y - 6, 1, 2, '#6b4a2a'); R(g, x + 6, y - 6, 1, 2, '#6b4a2a'); R(g, x - 7, y - 5, 14, 2, '#8a6a42'); R(g, x - 6, y - 3, 1, 3, '#4a2f1a'); R(g, x + 5, y - 3, 1, 3, '#4a2f1a'); }
  function fuente(g) {
    const x = Math.round(FUENTE.x - cam), y = G;
    R(g, x - 16, y - 8, 32, 8, '#8f8a80'); R(g, x - 16, y - 8, 32, 2, '#b5afa3'); R(g, x - 14, y - 6, 28, 1, '#2f6fa8'); R(g, x + 12, y - 6, 4, 6, '#77726a');
    R(g, x - 2, y - 22, 4, 14, '#c9c2b0'); R(g, x + 1, y - 22, 1, 14, '#a8a191'); R(g, x - 7, y - 23, 14, 2, '#b5afa3'); R(g, x - 6, y - 24, 12, 1, '#2f6fa8');
    R(g, x - 1, y - 30, 2, 6, '#f3d27f'); R(g, x - 3, y - 28, 6, 2, '#f3d27f'); brillos.push([x - 1, y - 30, 2, 6]);
    for (let i = 0; i < 12; i++) { const p = (t * .025 + i / 12) % 1, s = i % 2 ? 1 : -1; R(g, x + s * (4 + p * 10), y - 24 - 8 * p + 22 * p * p, 1, 1, '#d6f0ff'); }
  }
  function plataforma(g, p) {
    const x = Math.round(p.x - cam);
    R(g, x, p.y, p.w, 2, '#5aa55a'); R(g, x, p.y + 1, p.w, 1, '#3d8348');
    ladrillos(g, x, p.y + 2, p.w, 5, '#6b6f7a', '#565a64', 7, 3);
    R(g, x + 2, p.y + 7, p.w - 4, 2, '#4a4e58'); R(g, x + 5, p.y + 9, p.w - 10, 1, '#3a3e48');
    for (let i = 3; i < p.w - 2; i += 7) { const h = 2 + ((i * 7 + p.x) % 5); R(g, x + i, p.y + 2, 1, h + 3, '#2c6437'); }
    const c = (Math.sin(t / 20 + p.x) + 1) / 2; if (c > .3) { R(g, x + p.w / 2 - 1, p.y + 11, 2, 1, '#9fe3ff'); brillos.push([x + p.w / 2 - 1, p.y + 11, 2, 1]); }
  }
  function caja(g, c) {
    const x = Math.round(c.x - cam);
    R(g, x, c.y, c.w, c.h, '#8a6a42'); R(g, x, c.y, c.w, 1, '#a8845a'); R(g, x, c.y + c.h - 1, c.w, 1, '#5a3b22'); R(g, x, c.y, 1, c.h, '#5a3b22'); R(g, x + c.w - 1, c.y, 1, c.h, '#5a3b22');
    for (let i = 1; i < c.w - 1; i++) { R(g, x + i, c.y + i, 1, 1, '#6b4a2a'); R(g, x + c.w - 1 - i, c.y + i, 1, 1, '#6b4a2a'); }
  }
  function gema(g, gm) {
    if (gm.tomada) return;
    const x = Math.round(gm.x - cam), y = Math.round(gm.y + Math.sin(t / 14 + gm.fase) * 1.5), w = [7, 5, 2, 5][((t / 7 + gm.fase) | 0) % 4];
    [1, 3, 5, 7, 5, 3, 1].forEach((k, i) => { const ww = Math.max(1, Math.round(k * w / 7)); R(g, x - ww / 2, y - 3 + i, ww, 1, i < 3 ? '#fff5c4' : i < 5 ? '#f3d27f' : '#c9a24a'); });
    brillos.push([x - 3, y - 3, 7, 7]);
  }
  function barrera(g, b) {
    if (b.abierta && b.disolver <= 0) return;
    const x = Math.round(b.x - cam); if (x < -10 || x > WW + 10) return;
    g.globalAlpha = b.abierta ? b.disolver / 60 : 1;
    R(g, x - 3, 0, 6, G, 'rgba(126,200,255,.16)'); R(g, x - 1, 0, 2, G, 'rgba(190,232,255,.35)');
    for (let k = 0; k < 14; k++) { const yy = (k * 13 + t * 1.3) % G; R(g, x - 2, G - yy, 4, 2, '#bfe8ff'); brillos.push([x - 2, G - yy, 4, 2]); }
    for (let k = 0; k < 4; k++) { const yy = G - 16 - k * 24, on = (t / 20 + k) % 3 < 2; R(g, x - 2, yy, 4, 4, on ? '#f3d27f' : '#c9a24a'); if (on) brillos.push([x - 2, yy, 4, 4]); }
    R(g, x - 6, G - 5, 12, 5, '#6b6f7a'); R(g, x - 6, G - 5, 12, 1, '#8a8f9a'); R(g, x - 1, G - 4, 2, 2, '#7ec8ff');
    if (b.abierta) for (let k = 0; k < 8; k++) R(g, x - 6 + ((k * 37 + t * 3) % 12), G - ((k * 29 + (60 - b.disolver) * 3) % G), 1, 1, '#e6f7ff');
    g.globalAlpha = 1;
  }
  function fragmento(g, fr) {
    if (fr.tomado) return;
    const x = Math.round(fr.x - cam), y = Math.round(fr.y + Math.sin(t / 12 + fr.x) * 2), fase = (t >> 3) % 4;
    [[0, 2], [1, 4], [2, 6], [3, 6], [4, 4], [5, 2]].forEach(([r, w]) => R(g, x - w / 2 + (fase === 1 && r > 2 ? 1 : 0), y - 3 + r, w, 1, r < 2 ? '#fff5c4' : r < 4 ? '#f3d27f' : '#c9a24a'));
    R(g, x, y - 1, 1, 2, '#1d3366'); brillos.push([x - 3, y - 3, 6, 6]);
  }
  function cartel(g) {
    const x = Math.round(MUNDO - 44 - cam), y = G;
    R(g, x, y - 18, 2, 18, '#5a3b22'); R(g, x - 12, y - 24, 26, 10, '#8a6a42'); R(g, x - 12, y - 24, 26, 1, '#a8845a'); R(g, x - 12, y - 15, 26, 1, '#5a3b22');
    R(g, x - 8, y - 20, 18, 1, '#3a2412'); R(g, x - 8, y - 18, 12, 1, '#3a2412');
  }

  function iluminar() {
    l.globalCompositeOperation = 'source-over'; l.fillStyle = '#5d6aa3'; l.fillRect(0, 0, WW, WH);
    l.globalCompositeOperation = 'lighter';
    halo(l, 262 - cam * .02, 28, 220, 'rgba(110,125,180,.45)');
    const luces = [];
    FAROLES.forEach(x => luces.push([x - cam + 1, G - 30, 40, 'rgba(255,205,130,.95)', 1]));
    EDIFICIOS.forEach(e => {
      const ox = e.off.x - cam, oy = e.off.y;
      if (e.caja.x + ox > WW + 40 || e.caja.x + e.caja.w + ox < -40) return;
      e.antorchas.forEach(([x, y, c]) => luces.push([x + ox + 1, y + oy, 26, c === '#7ec8ff' ? 'rgba(126,200,255,.8)' : c === '#ff7ac2' ? 'rgba(255,110,190,.8)' : 'rgba(255,180,90,.9)', 1]));
      e.ventanas.forEach(([x, y, w, h]) => luces.push([x + ox + w / 2, y + oy + h / 2 + 3, 12, e.frias ? 'rgba(126,200,255,.5)' : 'rgba(255,200,110,.5)', 0]));
      (e.luces || []).forEach(([x, y, r, c]) => luces.push([x + ox, y + oy, r, c, 0]));
      if (e.id === 'arcade' && t % 260 < 44) luces.push([410 + ox, 26 + oy, 30, 'rgba(255,150,60,.9)', 1]);
    });
    luces.push([FUENTE.x - cam, G - 26, 22, 'rgba(243,210,127,.45)', 0]);
    BARRERAS.forEach(b => { if (!b.abierta || b.disolver > 0) luces.push([b.x - cam, G - 50, 38, 'rgba(126,200,255,.55)', 1]); });
    FRAGMENTOS.forEach(fr => { if (!fr.tomado) luces.push([fr.x - cam, fr.y, 18, 'rgba(243,210,127,.7)', 1]); });
    NPCS.forEach(n => { if (n.tipo === 'lumi') luces.push([n.x - cam, G - 16, 30, 'rgba(255,225,140,.7)', 1]); if (n.tipo === 'maga') luces.push([n.x - cam + 6 * n.dir, G - 27, 16, 'rgba(126,200,255,.7)', 0]); });
    luces.push([P.x - cam, P.y - 10, 34, 'rgba(255,225,170,.5)', 0]);
    luces.forEach(([x, y, r0, c, parpadea]) => { if (x < -60 || x > WW + 60) return; halo(l, x, y, r0 * (parpadea ? 1 + Math.sin(t * .21 + x) * .04 + (Math.random() - .5) * .04 : 1), c); });
    l.fillStyle = '#ffffff';
    EDIFICIOS.forEach(e => e.ventanas.forEach(([x, y, w, h]) => l.fillRect(x + e.off.x - Math.round(cam), y + e.off.y, w, h)));
    brillos.forEach(([x, y, w, h]) => l.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)));
  }

  function componer() {
    const c = Math.round(cam);
    m.drawImage(cielo, 0, 0);
    ESTRELLAS.forEach(s => { const x = ((s.x - cam * .04) % 600 + 600) % 600; if (x < WW) { const b = .4 + .6 * Math.abs(Math.sin(t / 40 + s.f)) * s.b; R(m, x, s.y, 1, 1, `rgba(230,238,255,${b})`); } });
    const lx = Math.round(262 - cam * .02);
    halo(m, lx, 28, 34, 'rgba(240,235,200,.18)'); circ(m, lx, 28, 10, '#f4f1d8'); R(m, lx - 4, 25, 3, 2, '#dcd6b4'); R(m, lx + 3, 29, 3, 3, '#dcd6b4'); R(m, lx - 2, 33, 2, 2, '#dcd6b4');
    [[montes, .12], [colinas, .3]].forEach(([capa, k]) => { const o = Math.round(((cam * k) % 960 + 960) % 960); m.drawImage(capa, -o, 0); if (960 - o < WW) m.drawImage(capa, 960 - o, 0); });
    const bruma = m.createLinearGradient(0, 100, 0, G); bruma.addColorStop(0, 'rgba(90,110,180,0)'); bruma.addColorStop(1, 'rgba(90,110,180,.22)'); m.fillStyle = bruma; m.fillRect(0, 100, WW, G - 100);

    // primer plano (iluminado)
    brillos.length = 0;
    f.clearRect(0, 0, WW, WH);
    ARBOLES_FONDO.forEach(a => { const x = a.x - c; if (x > -12 && x < WW + 12) f.drawImage(SPR[a.tipo][a.v], x - 11, a.y - 27); });
    EDIFICIOS.forEach(e => {
      const ox = e.off.x - c, oy = e.off.y;
      if (e.caja.x + ox > WW || e.caja.x + e.caja.w + ox < 0) return;
      f.drawImage(e.sprite, e.caja.x + ox, e.caja.y + oy);
      f.save(); f.translate(ox, oy); bo = { x: ox, y: oy };
      ANIM[e.id](f); e.antorchas.forEach(([x, y, col]) => antorcha(f, x, y, col));
      f.restore(); bo = { x: 0, y: 0 };
      if (cerca === e) { f.globalAlpha = .4 + Math.sin(t / 6) * .2; R(f, e.puerta.wx - c - 8, G - 1, 16, 1, '#f3d27f'); f.globalAlpha = 1; }
    });
    PLATAFORMAS.forEach(p => { if (!p.oculta && p.x - c < WW && p.x + p.w - c > 0) plataforma(f, p); });
    fuente(f); CAJAS.forEach(k => caja(f, k)); cartel(f);
    BANCAS.forEach(x => banca(f, x)); FAROLES.forEach(x => farol(f, x));
    BARRERAS.forEach(b => barrera(f, b));
    FRAGMENTOS.forEach(fr => fragmento(f, fr));
    f.drawImage(calle, c, 0, WW, WH - G + 4, 0, G - 4, WW, WH - G + 4);
    GEMAS.forEach(g => gema(f, g));
    NPCS.forEach(n => { if (n.x - c > -20 && n.x - c < WW + 20) dibujarNPC(f, n, n.x - c, G, n.dir).forEach(b => brillos.push(b)); });
    heroe(f);
    chispas.forEach(k => R(f, k.x - c, k.y, 1, 1, k.c));

    // luz: multiplicar el primer plano por el mapa de luces, conservando su transparencia
    iluminar();
    mk.clearRect(0, 0, WW, WH); mk.drawImage(frente, 0, 0);
    f.globalCompositeOperation = 'multiply'; f.drawImage(luz, 0, 0);
    f.globalCompositeOperation = 'destination-in'; f.drawImage(mascara, 0, 0);
    f.globalCompositeOperation = 'source-over';
    m.drawImage(frente, 0, 0);

    // resplandor aditivo
    m.globalCompositeOperation = 'lighter';
    FAROLES.forEach(x => halo(m, x - c + 1, G - 30, 10, 'rgba(255,200,120,.35)'));
    EDIFICIOS.forEach(e => e.antorchas.forEach(([x, y]) => halo(m, x + e.off.x - c + 1, y + e.off.y, 6, 'rgba(255,190,110,.35)')));
    GEMAS.forEach(g => { if (!g.tomada) halo(m, g.x - c, g.y, 7, 'rgba(243,210,127,.3)'); });
    FRAGMENTOS.forEach(fr => { if (!fr.tomado) halo(m, fr.x - c, fr.y, 10, 'rgba(243,210,127,.4)'); });
    NPCS.forEach(n => { if (n.tipo === 'lumi') halo(m, n.x - c, G - 16, 10, 'rgba(255,230,150,.5)'); });
    m.globalCompositeOperation = 'source-over';
  }

  // ---------------------------------------------------------- interfaz a resolución completa
  const redondo = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); };
  function cinta(e) {
    const cx = (e.puerta.wx - cam) * S; if (cx < -150 || cx > W + 150) return;
    const visitada = API.al.hecho(e.id), cy = (G + 11) * S;
    ctx.font = '600 14px Cinzel, Georgia, serif';
    const w = ctx.measureText(e.nombre).width + 50, h = 26, x = cx - w / 2, y = cy - h / 2;
    ctx.fillStyle = 'rgba(5,14,29,.86)'; ctx.strokeStyle = cerca === e ? '#f3d27f' : 'rgba(224,183,86,.55)'; ctx.lineWidth = cerca === e ? 2 : 1;
    redondo(x, y, w, h, 12); ctx.fill(); ctx.stroke();
    if (e.logo.complete && e.logo.naturalWidth) ctx.drawImage(e.logo, x + 5, y + 3, 18, 18);
    ctx.fillStyle = cerca === e ? '#f3d27f' : '#f4f7fd'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(e.nombre, x + 27, cy + 1);
    const bx = x + w - 12;
    if (visitada) { ctx.fillStyle = '#e0b756'; ctx.font = '11px Geist, sans-serif'; ctx.fillText('✓', bx - 4, cy + 1); }
    else { const p = 1 + Math.sin(t / 8) * .15; ctx.fillStyle = '#f3d27f'; ctx.beginPath(); ctx.arc(bx, cy, 6 * p, 0, 7); ctx.fill(); ctx.fillStyle = '#1b1405'; ctx.font = '8px "Press Start 2P", monospace'; ctx.textAlign = 'center'; ctx.fillText('!', bx + .5, cy + 1); }
  }
  function lineasTexto(txt, ancho) {
    const pal = txt.split(' '), out = []; let lin = '';
    pal.forEach(p => { const prueba = lin ? lin + ' ' + p : p; if (ctx.measureText(prueba).width > ancho && lin) { out.push(lin); lin = p; } else lin = prueba; });
    if (lin) out.push(lin); return out;
  }
  const retrato = lienzo(28, 34), rg = retrato.getContext('2d');
  function cuadroDialogo() {
    const d = dialogo; if (!d || d.cerrado) return;
    const x = 24, y = 16, w = W - 48, h = 108;
    ctx.fillStyle = 'rgba(5,14,29,.93)'; ctx.strokeStyle = '#e0b756'; ctx.lineWidth = 2; redondo(x, y, w, h, 12); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(224,183,86,.3)'; ctx.lineWidth = 1; redondo(x + 5, y + 5, w - 10, h - 10, 9); ctx.stroke();
    ctx.fillStyle = '#0d2144'; redondo(x + 14, y + 14, 80, 80, 8); ctx.fill(); ctx.strokeStyle = 'rgba(224,183,86,.6)'; ctx.stroke();
    rg.clearRect(0, 0, 28, 34); dibujarNPC(rg, d.npc, 14, 32, 1);
    ctx.imageSmoothingEnabled = false; ctx.drawImage(retrato, x + 20, y + 9, 28 * 2.4, 34 * 2.4);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f3d27f'; ctx.font = '700 15px Cinzel, Georgia, serif'; ctx.fillText(d.npc.nombre, x + 110, y + 32);
    ctx.fillStyle = '#f4f7fd'; ctx.font = '15px Geist, system-ui, sans-serif';
    lineasTexto(d.npc.lineas[d.linea].slice(0, d.chars | 0), w - 150).forEach((ln, i) => ctx.fillText(ln, x + 110, y + 56 + i * 21));
    ctx.font = '8px "Press Start 2P", monospace'; ctx.fillStyle = 'rgba(202,214,229,.7)'; ctx.textAlign = 'right';
    ctx.fillText(`${d.linea + 1}/${d.npc.lineas.length}`, x + w - 18, y + 26);
    if ((d.chars | 0) >= d.npc.lineas[d.linea].length && (t >> 4) % 2) { ctx.fillStyle = '#f3d27f'; ctx.fillText(d.linea < d.npc.lineas.length - 1 ? 'E > seguir' : 'E > cerrar', x + w - 18, y + h - 14); }
  }
  function interfaz() {
    const vi = ctx.createRadialGradient(W / 2, H / 2, H * .5, W / 2, H / 2, W * .7); vi.addColorStop(0, 'rgba(3,8,20,0)'); vi.addColorStop(1, 'rgba(3,8,20,.5)');
    ctx.fillStyle = vi; ctx.fillRect(0, 0, W, H);
    const ar = EDIFICIOS[2], ax = (388 + ar.off.x - cam) * S;
    if ((t / 30 | 0) % 7 !== 0 && ax > -60 && ax < W + 60) {
      ctx.save(); ctx.font = '9px "Press Start 2P", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = '#ff5fb0'; ctx.shadowBlur = 10; ctx.fillStyle = '#ffd1ea'; ctx.fillText('ARCADE', ax, (68.5 + ar.off.y) * S + 1); ctx.restore();
    }
    EDIFICIOS.forEach(cinta);
    NPCS.forEach(n => {                                                  // globos "!" sobre aldeanos sin conversar
      if (n.hablado || (dialogo && dialogo.npc === n)) return;
      const x = (n.x - cam) * S, y = (G - (n.tipo === 'lumi' ? 30 : 36)) * S + Math.sin(t / 10 + n.x) * 3; if (x < -20 || x > W + 20) return;
      ctx.fillStyle = 'rgba(5,14,29,.9)'; ctx.strokeStyle = '#f3d27f'; ctx.lineWidth = 2; redondo(x - 10, y - 12, 20, 20, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f3d27f'; ctx.font = '10px "Press Start 2P", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', x + 1, y - 1);
    });
    textos.forEach(k => { ctx.globalAlpha = Math.min(1, k.t / 20); ctx.fillStyle = '#9fe3ff'; ctx.font = '8px "Press Start 2P", monospace'; ctx.textAlign = 'center'; ctx.fillText(k.txt, (k.x - cam) * S, k.y * S); ctx.globalAlpha = 1; });
    if (P.meta) { const x = (P.meta.x - cam) * S, r = 7 + Math.sin(t / 5) * 2; ctx.strokeStyle = 'rgba(243,210,127,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, G * S, r, r * .45, 0, 0, 7); ctx.stroke(); }
    if (cerca) {
      const x = (P.x - cam) * S, y = (P.y - 28) * S + Math.sin(t / 8) * 3;
      ctx.fillStyle = 'rgba(5,14,29,.9)'; ctx.strokeStyle = '#f3d27f'; ctx.lineWidth = 2; redondo(x - 11, y - 11, 22, 22, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f3d27f'; ctx.font = '10px "Press Start 2P", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('E', x + 1, y + 1);
    }
    if (destello && destello.t-- > 0) { const k = destello.t / 30; ctx.strokeStyle = `rgba(243,210,127,${k})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc((destello.x - cam) * S, (G - 10) * S, (1 - k) * 60 + 10, 0, 7); ctx.stroke(); }
    if (!dialogo || dialogo.cerrado) {                                   // misión, gemas, puntos y controles
      const info = API.al.hud(), n = GEMAS.filter(g => g.tomada).length;
      ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      ctx.font = '600 14px Geist, sans-serif';
      const mw = Math.min(W - 250, ctx.measureText(info.mision).width + 36);
      ctx.fillStyle = 'rgba(5,14,29,.84)'; ctx.strokeStyle = 'rgba(224,183,86,.6)'; ctx.lineWidth = 1; redondo(14, 12, mw, 50, 10); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f3d27f'; ctx.font = '8px "Press Start 2P", monospace'; ctx.fillText(info.titulo, 28, 28);
      ctx.fillStyle = '#f4f7fd'; ctx.font = '600 14px Geist, sans-serif'; ctx.fillText(info.mision, 28, 47, mw - 28);
      ctx.textAlign = 'right'; ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillStyle = 'rgba(5,14,29,.84)'; redondo(W - 150, 12, 136, 50, 10); ctx.fill();
      ctx.fillStyle = '#f3d27f'; ctx.fillText(`◆ ${n}/${GEMAS.length}`, W - 26, 29);
      ctx.fillStyle = '#9dffc0'; ctx.fillText(`PH ${info.ph}`, W - 26, 49);
      if (document.activeElement === cv) { ctx.textAlign = 'left'; ctx.font = '12px Geist, sans-serif'; ctx.fillStyle = 'rgba(244,247,253,.7)'; ctx.fillText('A/D mover · Espacio saltar (x2) · S bajar · E hablar/entrar · Esc pausa', 16, 78); }
    }
    if (aviso && aviso.t > 0) {
      ctx.globalAlpha = Math.min(1, aviso.t / 30); ctx.font = '600 15px Geist, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const w = ctx.measureText(aviso.txt).width + 40;
      ctx.fillStyle = 'rgba(5,14,29,.92)'; ctx.strokeStyle = '#7ec8ff'; ctx.lineWidth = 2; redondo(W / 2 - w / 2, 150, w, 38, 19); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e6f7ff'; ctx.fillText(aviso.txt, W / 2, 170); ctx.globalAlpha = 1;
    }
    if (document.activeElement !== cv && !P.movio) {
      ctx.textBaseline = 'middle'; ctx.font = '10px "Press Start 2P", monospace'; ctx.textAlign = 'center';
      const txt = 'Haz clic en la aldea para jugar', w = ctx.measureText(txt).width + 40, a = .75 + Math.sin(t / 15) * .25;
      ctx.fillStyle = 'rgba(5,14,29,.85)'; ctx.strokeStyle = 'rgba(224,183,86,.7)'; ctx.lineWidth = 1;
      redondo(W / 2 - w / 2, 250, w, 34, 17); ctx.fill(); ctx.stroke();
      ctx.fillStyle = `rgba(243,210,127,${a})`; ctx.fillText(txt, W / 2, 268);
    }
    cuadroDialogo();
  }
  function dibujar() {
    componer();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(mundo, 0, 0, W, H);
    interfaz();
  }

  let activo = false, raf = 0;
  function bucle() { t++; actualizar(); dibujar(); raf = activo ? requestAnimationFrame(bucle) : 0; }
  const API = window.KRAldea = {
    activar() { activo = true; if (!raf) raf = requestAnimationFrame(bucle); cv.focus({ preventScroll: true }); },
    pausar() { activo = false; Object.keys(teclas).forEach(k => teclas[k] = false); P.meta = null; },
    fijar(p) {
      BARRERAS.forEach(b => { b.abierta = p.etapa > b.i; b.disolver = 0; });
      FRAGMENTOS.forEach((fr, i) => { fr.tomado = !!(p.fragmentos && p.fragmentos[i]); });
      if (typeof p.x === 'number') { P.x = p.x; P.y = G; cam = Math.max(0, Math.min(MUNDO - WW, P.x - WW * .45)); }
      dialogo = null;
    },
    abrirBarrera(i) { const b = BARRERAS[i]; if (b && !b.abierta) { b.abierta = true; b.disolver = 60; window.KR && KR.beep([[523, .08], [659, .08], [784, .08], [1047, .2]]); } },
    avisar(txt, dur) { aviso = { txt, t: dur || 180 }; },
    get x() { return P.x; },
    al: { entrar() {}, tecla() {}, fragmento() {}, hecho: () => false, hud: () => ({ titulo: '', mision: '', ph: 0 }) },
  };
  document.fonts && document.fonts.ready.then(() => dibujar());
})();

/* ==========================================================================
   Transiciones de videojuego para cambiar de juego en el modo escenas.
   Cada una cubre la pantalla (fase "cubre"), se cambia el contenido y la destapa (fase "revela").
   Se dibujan en un lienzo de baja resolución ampliado sin suavizado: píxeles de verdad.
     0 disolución de píxeles · 1 invasores del espacio · 2 come-cocos · 3 bloques que caen
   KRTransJuego.jugar(tipo, alCubrir) -> promesa que se resuelve al terminar.
   ========================================================================== */
(() => {
  const PX = 6, DUR = 650;                                  // tamaño del píxel y duración de cada fase (ms)
  const lienzo = document.createElement('canvas'); lienzo.className = 'trans-juego';
  document.body.appendChild(lienzo);
  const g = lienzo.getContext('2d');
  let W = 0, H = 0;
  function medir() {
    const top = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hud')) || 58;
    lienzo.style.top = top + 'px';
    W = Math.ceil(innerWidth / PX); H = Math.ceil((innerHeight - top) / PX);
    lienzo.width = W; lienzo.height = H;
  }
  const fondo = () => getComputedStyle(document.body).backgroundColor || '#071428';
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const sprite = (filas, x, y, c, k = 1) => filas.forEach((f, j) => [...f].forEach((ch, i) => { if (ch !== '.') R(x + i * k, y + j * k, k, k, typeof c === 'string' ? c : c[ch]); }));
  const bip = n => window.KR && KR.beep(n);

  // ---------------------------------------------------------- 0. disolución de píxeles (orden aleatorio, borde dorado)
  let orden = null;
  function disolucion(p, fase) {
    const n = W * H;
    if (!orden || orden.length !== n) { orden = Float32Array.from({ length: n }, () => Math.random()); }
    const col = fondo();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const r = orden[y * W + x], umbral = fase === 'cubre' ? p : 1 - p;
      if (r < umbral) R(x, y, 1, 1, umbral - r < .035 ? '#fabd18' : umbral - r < .07 ? '#b87406' : col);
    }
  }

  // ---------------------------------------------------------- 1. invasores del espacio que bajan marchando
  const INV = [['..x.....x..', '...x...x...', '..xxxxxxx..', '.xx.xxx.xx.', 'xxxxxxxxxxx', 'x.xxxxxxx.x', 'x.x.....x.x', '...xx.xx...'],
               ['..x.....x..', 'x..x...x..x', 'x.xxxxxxx.x', 'xxx.xxx.xxx', 'xxxxxxxxxxx', '.xxxxxxxxx.', '..x.....x..', '.x.......x.']];
  function invasores(p, fase) {
    const col = fondo(), borde = fase === 'cubre' ? p * (H + 12) : p * (H + 12);
    if (fase === 'cubre') R(0, 0, W, borde - 4, col); else R(0, borde, W, H, col);
    const marco = Math.floor(performance.now() / 160) % 2, desp = Math.round(Math.sin(performance.now() / 260) * 3);
    const colores = ['#6bd49a', '#f472b6', '#7ec8ff', '#fabd18'];
    for (let x = 2, k = 0; x < W - 12; x += 16, k++) sprite(INV[marco], x + desp, borde - 10, colores[k % 4]);
    if (fase === 'revela') {                                 // la nave dispara desde abajo
      const nx = Math.round(W / 2 + Math.sin(performance.now() / 300) * W / 3);
      sprite(['.....x.....', '....xxx....', '.xxxxxxxxx.', 'xxxxxxxxxxx'], nx - 5, H - 6, '#fcdf6b');
      for (let y = H - 8; y > borde; y -= 4) R(nx, y, 1, 2, '#ffffff');
    }
  }

  // ---------------------------------------------------------- 2. come-cocos recorre tres carriles y se come la pantalla
  function comecocos(p, fase) {
    const col = fondo(), carriles = 3, alto = Math.ceil(H / carriles), total = carriles * (W + alto);
    const recorrido = p * total, avance = Math.floor(recorrido / (W + alto)), resto = recorrido % (W + alto);
    for (let c = 0; c < carriles; c++) {
      const y = c * alto, izqDer = c % 2 === 0;
      const hecho = c < avance ? W : c === avance ? Math.min(W, resto - alto / 2) : 0;
      const tapado = fase === 'cubre' ? hecho : W - hecho;   // al revelar, lo comido se devuelve
      if (fase === 'cubre') { if (izqDer) R(0, y, tapado, alto, col); else R(W - tapado, y, tapado, alto, col); }
      else { if (izqDer) R(hecho, y, W - hecho, alto, col); else R(0, y, W - hecho, alto, col); }
      if (c === avance && hecho > -alto) {
        const cx = izqDer ? hecho + alto / 2 : W - hecho - alto / 2, cy = y + alto / 2, r = alto * .38;
        if (fase === 'cubre') for (let x = izqDer ? cx + r * 2 : cx - r * 2; izqDer ? x < W : x > 0; x += izqDer ? 10 : -10) R(x, cy - 1, 2, 2, '#fcdf6b');   // pastillas
        const boca = Math.abs(Math.sin(performance.now() / 70)) * .8;
        g.fillStyle = fase === 'cubre' ? '#fabd18' : '#f25c6a';
        g.beginPath();
        if (fase === 'cubre') { const a = izqDer ? 0 : Math.PI; g.moveTo(cx, cy); g.arc(cx, cy, r, a + boca / 2, a + Math.PI * 2 - boca / 2); g.closePath(); g.fill(); }
        else {                                               // un fantasma devuelve la pantalla
          g.arc(cx, cy, r, Math.PI, 0); g.lineTo(cx + r, cy + r); for (let i = 0; i < 4; i++) g.lineTo(cx + r - (i + .5) * r / 2, cy + r - (i % 2 ? 0 : r / 3)); g.lineTo(cx - r, cy + r); g.closePath(); g.fill();
          R(cx - r / 2, cy - r / 3, r / 3, r / 3, '#fff'); R(cx + r / 6, cy - r / 3, r / 3, r / 3, '#fff');
        }
      }
    }
  }

  // ---------------------------------------------------------- 3. bloques que caen y se apilan; al revelar, las líneas se limpian
  const PIEZA = ['#7ec8ff', '#fabd18', '#a78bfa', '#6bd49a', '#f25c6a', '#fb923c', '#5eead4'];
  let cols = null;
  function bloques(p, fase) {
    const B = 6, nc = Math.ceil(W / B), nf = Math.ceil(H / B);
    if (!cols || cols.length !== nc) cols = Array.from({ length: nc }, (_, i) => ({ d: Math.random() * .35, c: PIEZA[Math.floor(i / 2 + Math.random() * 2) % PIEZA.length] }));
    const celda = (x, y, c) => { R(x * B, y * B, B, B, c); R(x * B, y * B, B, 1, 'rgba(255,255,255,.45)'); R(x * B, y * B + B - 1, B, 1, 'rgba(0,0,0,.35)'); };
    if (fase === 'cubre') {
      cols.forEach((k, x) => {
        const lleno = Math.max(0, Math.min(nf, Math.floor((p * 1.35 - k.d) * nf)));
        for (let y = nf - lleno; y < nf; y++) celda(x, y, k.c);
        if (lleno < nf && lleno > 0) celda(x, nf - lleno - 1 - (Math.floor(performance.now() / 50) % 2), k.c);   // pieza cayendo
      });
    } else {                                                 // las filas se limpian de abajo hacia arriba con un destello
      const limpias = Math.floor(p * (nf + 2));
      for (let y = 0; y < nf; y++) {
        const desdeAbajo = nf - 1 - y;
        if (desdeAbajo < limpias - 1) continue;
        if (desdeAbajo === limpias - 1) { R(0, y * B, W, B, '#ffffff'); continue; }
        cols.forEach((k, x) => celda(x, y, k.c));
      }
    }
  }

  const TIPOS = [disolucion, invasores, comecocos, bloques];
  const SONIDO = [[[523, .04], [659, .04]], [[196, .06], [174, .06], [164, .06], [147, .08]], [[494, .04], [988, .04], [494, .04], [988, .04]], [[330, .05], [392, .05], [523, .08]]];

  function jugar(tipo, alCubrir) {
    return new Promise(listo => {
      medir(); lienzo.style.visibility = 'visible';
      const dibujar = TIPOS[tipo % TIPOS.length]; let fase = 'cubre', t0 = performance.now();
      bip(SONIDO[tipo % SONIDO.length]);
      (function cuadro(ahora) {
        const p = Math.min(1, (ahora - t0) / DUR);
        g.clearRect(0, 0, W, H); dibujar(p, fase);
        if (p < 1) return requestAnimationFrame(cuadro);
        if (fase === 'cubre') { alCubrir(); fase = 'revela'; t0 = ahora + 90; g.fillStyle = fondo(); g.fillRect(0, 0, W, H); return requestAnimationFrame(cuadro); }
        lienzo.style.visibility = 'hidden'; g.clearRect(0, 0, W, H); listo();
      })(t0);
    });
  }
  window.KRTransJuego = { jugar, duracion: (DUR * 2 + 90) / 1000 };
})();

/* ==========================================================================
   Ritmo Resonancia: homenaje a Proyecto Resonancia. Música sintetizada con Web Audio.
   crear(canvas, opciones) permite montarlo en el salón clásico y en la máquina arcade.
   ========================================================================== */
(function () {
  'use strict';
  function crear(cv, op) {
    const ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
    const CARRILES = 4, AC = 84, X0 = (W - CARRILES * AC) / 2, LINEA = H - 80, VIAJE = 1.55;
    const TECLAS = ['d', 'f', 'j', 'k'], COLORES = ['#e0b756', '#7ec8ff', '#f472b6', '#a78bfa'];
    const NOTAS_LEAD = [523.25, 587.33, 659.25, 783.99];            // do re mi sol (pentatónica)
    const BPM = 118, BEAT = 60 / BPM, COMPASES = 16;
    let actx = null, bus = null, inicio = 0, estado = 'menu', notas = [], pulsado = [0, 0, 0, 0], stats, efectos = [], t = 0;

    // ---------------------------------------------------------- partitura determinista
    function partitura() {
      const n = [];
      const patrones = [[0, 1, 2, 3], [3, 2, 1, 0], [0, 2, 1, 3], [1, 1, 2, 2], [0, 3, 0, 3], [2, 1, 3, 0]];
      for (let c = 0; c < COMPASES; c++) {
        const p = patrones[c % patrones.length], denso = c >= 4 && c % 4 !== 3;
        for (let b = 0; b < 4; b++) {
          const tiempo = (c * 4 + b) * BEAT;
          n.push({ t: tiempo, c: p[b], ok: null });
          if (denso && b % 2 === 1) n.push({ t: tiempo + BEAT / 2, c: p[(b + 2) % 4], ok: null });
          if (c >= 8 && c % 4 === 2 && b === 0) n.push({ t: tiempo, c: (p[b] + 2) % 4, ok: null });   // acordes dobles
        }
      }
      return n;
    }

    // ---------------------------------------------------------- síntesis de audio
    function sonido(tipo, tiempo, extra) {
      const o = actx.createOscillator(), g = actx.createGain();
      o.connect(g).connect(bus);
      if (tipo === 'bombo') { o.frequency.setValueAtTime(140, tiempo); o.frequency.exponentialRampToValueAtTime(40, tiempo + .15); g.gain.setValueAtTime(.55, tiempo); g.gain.exponentialRampToValueAtTime(.001, tiempo + .2); o.start(tiempo); o.stop(tiempo + .2); }
      if (tipo === 'bajo') { o.type = 'triangle'; o.frequency.value = extra; g.gain.setValueAtTime(.16, tiempo); g.gain.exponentialRampToValueAtTime(.001, tiempo + BEAT * .9); o.start(tiempo); o.stop(tiempo + BEAT); }
      if (tipo === 'lead') { o.type = 'square'; o.frequency.value = extra; g.gain.setValueAtTime(.07, tiempo); g.gain.exponentialRampToValueAtTime(.001, tiempo + .22); o.start(tiempo); o.stop(tiempo + .25); }
      if (tipo === 'pad') { o.type = 'sine'; o.frequency.value = extra; g.gain.setValueAtTime(.0001, tiempo); g.gain.linearRampToValueAtTime(.05, tiempo + .3); g.gain.linearRampToValueAtTime(.0001, tiempo + BEAT * 4); o.start(tiempo); o.stop(tiempo + BEAT * 4); }
    }
    function ruido(tiempo, dur, vol, hp) {
      const buf = actx.createBuffer(1, actx.sampleRate * dur, actx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const s = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain();
      f.type = 'highpass'; f.frequency.value = hp; s.buffer = buf; g.gain.setValueAtTime(vol, tiempo); g.gain.exponentialRampToValueAtTime(.001, tiempo + dur);
      s.connect(f).connect(g).connect(bus); s.start(tiempo);
    }
    function programarMusica() {
      const BAJOS = [130.81, 110, 87.31, 98];                          // do la fa sol
      const ACORDES = [[261.63, 329.63, 392], [220, 261.63, 329.63], [174.61, 220, 261.63], [196, 246.94, 293.66]];
      for (let c = 0; c < COMPASES; c++) {
        const base = inicio + c * 4 * BEAT, grado = c % 4;
        ACORDES[grado].forEach(f => sonido('pad', base, f));
        for (let b = 0; b < 4; b++) {
          const tb = base + b * BEAT;
          if (b % 2 === 0) sonido('bombo', tb);
          if (b % 2 === 1) ruido(tb, .12, .22, 1500);
          ruido(tb, .03, .06, 7000); ruido(tb + BEAT / 2, .03, .05, 7000);
          sonido('bajo', tb, BAJOS[grado] / (b % 2 ? 1 : 2));
        }
      }
    }

    // ---------------------------------------------------------- partida
    function empezar() {
      try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); actx.resume(); }
      catch (e) { estado = 'sinaudio'; return; }
      if (bus) bus.disconnect();
      bus = actx.createGain(); bus.connect(actx.destination);
      notas = partitura(); efectos = [];
      stats = { perfecto: 0, genial: 0, bien: 0, fallo: 0, combo: 0, max: 0, puntos: 0 };
      inicio = actx.currentTime + 1.6;
      programarMusica();
      estado = 'jugando'; cv.focus({ preventScroll: true }); arrancar();
    }
    const ahora = () => actx ? actx.currentTime - inicio : 0;
    function juzgar(c) {
      pulsado[c] = 8;
      if (estado !== 'jugando') return;
      const tt = ahora();
      let mejor = null;
      notas.forEach(n => { if (n.c === c && n.ok === null && Math.abs(n.t - tt) < .16 && (!mejor || Math.abs(n.t - tt) < Math.abs(mejor.t - tt))) mejor = n; });
      if (!mejor) return;
      const d = Math.abs(mejor.t - tt);
      const [calif, pts, col] = d < .05 ? ['perfecto', 300, '#f3d27f'] : d < .1 ? ['genial', 200, '#7ec8ff'] : ['bien', 100, '#cad6e5'];
      mejor.ok = calif; stats[calif]++; stats.combo++; stats.max = Math.max(stats.max, stats.combo);
      stats.puntos += pts + stats.combo * 5;
      sonido('lead', actx.currentTime, NOTAS_LEAD[c] * (calif === 'perfecto' ? 2 : 1));
      efectos.push({ c, txt: calif.toUpperCase(), col, t: 30 });
    }
    cv.addEventListener('keydown', e => {
      const c = TECLAS.indexOf(e.key.toLowerCase());
      if (c >= 0) { e.preventDefault(); if (!e.repeat) juzgar(c); }
      if ((e.key === 'Enter' || e.key === ' ') && estado !== 'jugando') { e.preventDefault(); empezar(); }
    });
    cv.addEventListener('pointerdown', e => {
      cv.focus({ preventScroll: true });
      if (estado !== 'jugando') { empezar(); return; }
      const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * W / r.width;
      const c = Math.floor((x - X0) / AC); if (c >= 0 && c < CARRILES) juzgar(c);
    });

    function actualizar() {
      const tt = ahora();
      notas.forEach(n => { if (n.ok === null && tt - n.t > .16) { n.ok = 'fallo'; stats.fallo++; stats.combo = 0; efectos.push({ c: n.c, txt: 'FALLO', col: '#f87171', t: 30 }); } });
      efectos = efectos.filter(e => --e.t > 0);
      pulsado = pulsado.map(p => Math.max(0, p - 1));
      if (tt > notas[notas.length - 1].t + 1.2) {
        estado = 'fin';
        const total = notas.length;
        stats.precision = (stats.perfecto + stats.genial * .7 + stats.bien * .4) / total;
        if (window.KR) { if (stats.precision >= .7) { if (!KR.desbloquear('ritmo')) KR.sumarXP(30, 'Otra gran partida de ritmo'); } else KR.sumarXP(20, 'Partida de ritmo completada'); }
        op.alTerminar && op.alTerminar(stats);
      }
    }

    // ---------------------------------------------------------- dibujo
    function escenario() {
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0b1733'); g.addColorStop(1, '#1a0f33');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const pulso = actx && estado === 'jugando' ? Math.max(0, 1 - (((ahora() % BEAT) + BEAT) % BEAT) / BEAT * 3) : 0;
      for (let i = 0; i < 26; i++) {                                    // ecualizador de fondo
        const h = 20 + Math.abs(Math.sin(i * 1.7 + t / 20)) * 60 * (.5 + pulso);
        ctx.fillStyle = 'rgba(167,139,250,.10)'; ctx.fillRect(i * 30, H - h, 22, h);
      }
      for (let c = 0; c < CARRILES; c++) {
        const x = X0 + c * AC;
        ctx.fillStyle = pulsado[c] ? COLORES[c] + '33' : 'rgba(255,255,255,.035)'; ctx.fillRect(x + 2, 0, AC - 4, H);
        ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.strokeRect(x + 2, 0, AC - 4, H);
      }
      // la línea dorada va detrás: los botones son sólidos y la tapan, así la letra queda limpia
      ctx.fillStyle = `rgba(224,183,86,${.6 + pulso * .4})`; ctx.fillRect(X0, LINEA - 2, CARRILES * AC, 4);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '16px "Press Start 2P", monospace';
      for (let c = 0; c < CARRILES; c++) {
        const cx = X0 + c * AC + AC / 2;
        ctx.beginPath(); ctx.arc(cx, LINEA, 26, 0, Math.PI * 2);
        ctx.fillStyle = pulsado[c] ? COLORES[c] : '#0d1a36'; ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = COLORES[c]; ctx.stroke();
        ctx.fillStyle = pulsado[c] ? '#071428' : COLORES[c];
        ctx.fillText(TECLAS[c].toUpperCase(), cx + 1, LINEA + 1);
      }
      ctx.textBaseline = 'alphabetic'; ctx.lineWidth = 1;
    }
    function dibujar() {
      escenario();
      if (estado === 'jugando') {
        const tt = ahora();
        notas.forEach(n => {
          if (n.ok !== null) return;
          const y = LINEA - (n.t - tt) / VIAJE * (LINEA + 30);
          if (y < -30 || y > H + 30) return;
          const x = X0 + n.c * AC + AC / 2;
          ctx.save(); ctx.shadowColor = COLORES[n.c]; ctx.shadowBlur = 14;
          ctx.fillStyle = COLORES[n.c]; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - 30, y - 10, 60, 20, 8) : ctx.rect(x - 30, y - 10, 60, 20); ctx.fill(); ctx.restore();
        });
        efectos.forEach(e => { ctx.globalAlpha = e.t / 30; ctx.fillStyle = e.col; ctx.font = '10px "Press Start 2P", monospace'; ctx.textAlign = 'center'; ctx.fillText(e.txt, X0 + e.c * AC + AC / 2, LINEA - 50 - (30 - e.t)); ctx.globalAlpha = 1; });
        ctx.textAlign = 'left'; ctx.fillStyle = '#f3d27f'; ctx.font = '12px "Press Start 2P", monospace'; ctx.fillText(`${stats.puntos}`, 16, 28);
        ctx.fillStyle = '#cad6e5'; ctx.font = '9px "Press Start 2P", monospace'; ctx.fillText(`COMBO ${stats.combo}`, 16, 48);
        if (tt < 0) { ctx.textAlign = 'center'; ctx.font = '28px "Press Start 2P", monospace'; ctx.fillStyle = '#f3d27f'; ctx.fillText(Math.ceil(-tt), W / 2, H / 2 - 40); }
        const prog = Math.min(1, Math.max(0, tt / (notas[notas.length - 1].t + 1))); ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fillRect(0, 0, W, 4); ctx.fillStyle = '#e0b756'; ctx.fillRect(0, 0, W * prog, 4);
      } else {
        ctx.fillStyle = 'rgba(5,14,29,.78)'; ctx.fillRect(0, 0, W, H); ctx.textAlign = 'center';
        if (estado === 'fin') {
          const p = stats.precision, nota = p >= .95 ? 'S' : p >= .85 ? 'A' : p >= .7 ? 'B' : p >= .5 ? 'C' : 'D';
          ctx.fillStyle = '#f3d27f'; ctx.font = '48px "Press Start 2P", monospace'; ctx.fillText(nota, W / 2, 130);
          ctx.font = '12px "Press Start 2P", monospace'; ctx.fillStyle = '#f4f7fd';
          ctx.fillText(`${stats.puntos} puntos · precisión ${Math.round(p * 100)}%`, W / 2, 180);
          ctx.fillStyle = '#cad6e5'; ctx.font = '9px "Press Start 2P", monospace';
          ctx.fillText(`Perfecto ${stats.perfecto} · Genial ${stats.genial} · Bien ${stats.bien} · Fallo ${stats.fallo} · Combo máx ${stats.max}`, W / 2, 215);
          ctx.fillStyle = p >= .7 ? '#6bd49a' : '#f472b6'; ctx.fillText(p >= .7 ? '¡Logro desbloqueado con 70% o más!' : 'Llega a 70% de precisión para el logro', W / 2, 250);
          ctx.fillStyle = Math.floor(t / 30) % 2 ? '#f3d27f' : '#fff'; ctx.fillText('Clic o Enter para repetir', W / 2, 300);
        } else if (estado === 'sinaudio') {
          ctx.fillStyle = '#f87171'; ctx.font = '11px "Press Start 2P", monospace'; ctx.fillText('Tu navegador no permite audio', W / 2, H / 2);
        } else {
          ctx.fillStyle = '#f3d27f'; ctx.font = '24px "Press Start 2P", monospace'; ctx.fillText('RITMO RESONANCIA', W / 2, 150);
          ctx.fillStyle = '#cad6e5'; ctx.font = '10px "Press Start 2P", monospace';
          ctx.fillText('Un homenaje a Proyecto Resonancia', W / 2, 185);
          ctx.fillText('Teclas D F J K o toca los carriles', W / 2, 225);
          ctx.fillStyle = Math.floor(t / 30) % 2 ? '#f3d27f' : '#fff'; ctx.fillText('Clic o Enter para empezar · sube el volumen', W / 2, 290);
        }
      }
    }

    let raf = 0;
    function bucle() {
      t++;
      if (estado === 'jugando') actualizar();
      dibujar();
      raf = op.activo() ? requestAnimationFrame(bucle) : 0;
    }
    function arrancar() { if (!raf) raf = requestAnimationFrame(bucle); }
    function detener() { if (bus) { bus.disconnect(); bus = null; } estado = 'menu'; }
    document.fonts && document.fonts.ready.then(() => dibujar());
    return { arrancar, detener, empezar, get estado() { return estado; } };
  }
  window.KRCrearRitmo = crear;

  // ---------------------------------------------------------- instancia del salón de juegos (portafolio clásico)
  const cvSalon = document.getElementById('ritmo-canvas'); if (!cvSalon) return;
  let visible = false;
  const salon = crear(cvSalon, { activo: () => visible && !document.getElementById('juego-ritmo').hidden });
  new IntersectionObserver(en => { visible = en[0].isIntersecting; if (visible) salon.arrancar(); }, { threshold: .1 }).observe(cvSalon);
  document.querySelectorAll('.salon-tab').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.salon-tab').forEach(x => { x.classList.toggle('activo', x === b); x.setAttribute('aria-selected', x === b); });
    const juego = b.dataset.juego;
    document.querySelectorAll('.salon-juego').forEach(j => { j.hidden = j.id !== 'juego-' + juego; });
    if (juego === 'ritmo') { visible = true; salon.arrancar(); }
    else if (salon.estado === 'jugando') salon.detener();
  }));
})();

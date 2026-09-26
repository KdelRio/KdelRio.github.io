/* ==========================================================================
   Informe de jugabilidad: convierte la telemetría de la Arena del Dato en un
   análisis didáctico en cinco pasos (datos → indicadores → visualización →
   hallazgos → acciones), con filtro por oleada. API: window.KRInforme.
   ========================================================================== */
(function () {
  'use strict';
  const COLOR = { slime: '#6bd49a', murcielago: '#a78bfa', arquero: '#e6e0d0', golem: '#8a8f9a' };
  const NOMBRE = { slime: 'Slime', murcielago: 'Murciélago', arquero: 'Arquero', golem: 'Gólem' };
  const TIPOS = Object.keys(COLOR);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
  const num = n => Number.isInteger(n) ? n : n.toFixed(1).replace('.', ',');

  // ---------------------------------------------------------- cálculo de indicadores
  function medir(T, ola) {
    const ev = T.eventos.filter(e => !ola || e.ola === ola);
    const c = tipo => ev.filter(e => e.tipo === tipo);
    const ataques = c('ataque'), aciertos = ataques.filter(e => e.acierto).length;
    const recibidos = c('recibido'), dano = recibidos.reduce((a, e) => a + e.dano, 0);
    const derrotas = c('derrota'), apariciones = c('aparicion');
    const olas = T.olas.filter(o => o && (!ola || o.n === ola));
    const tiempo = olas.reduce((a, o) => a + ((o.t1 ?? T.fin) - o.t0), 0) || .1;
    const porTipo = TIPOS.map(k => {
      const d = derrotas.filter(e => e.enemigo === k);
      return {
        k, generados: apariciones.filter(e => e.enemigo === k).length, derrotados: d.length,
        dano: recibidos.filter(e => e.enemigo === k).reduce((a, e) => a + e.dano, 0),
        golpes: c('golpe').filter(e => e.enemigo === k).length,
        ttk: d.length ? d.reduce((a, e) => a + e.ttk, 0) / d.length : 0,
      };
    });
    const vida = T.vida.filter(v => !ola || v.ola === ola);
    const pos = ola ? T.pos[ola - 1] : T.pos.reduce((a, p) => a.map((v, i) => v + p[i]), Array(T.pos[0].length).fill(0));
    const porOla = T.olas.filter(Boolean).map(o => {
      const e2 = T.eventos.filter(e => e.ola === o.n), d2 = e2.filter(e => e.tipo === 'recibido').reduce((a, e) => a + e.dano, 0), dur = ((o.t1 ?? T.fin) - o.t0) || .1;
      return { n: o.n, dano: d2, dur, dpm: d2 / dur * 60, derrotas: e2.filter(e => e.tipo === 'derrota').length };
    });
    return { especiales: c('especial').length, bloqueos: c('bloqueo').length, dron: c('golpe').filter(e => e.fuente && !['espada', 'especial'].includes(e.fuente)).length, ev, ataques: ataques.length, aciertos, precision: pct(aciertos, ataques.length), golpes: c('golpe').length, recibidos: recibidos.length, dano, derrotados: derrotas.length, generados: apariciones.length, curaciones: c('curacion').length, disparos: c('disparo').length, tiempo, porTipo, vida, pos, porOla, via: recibidos.reduce((a, e) => (a[e.via] = (a[e.via] || 0) + e.dano, a), {}) };
  }

  // ---------------------------------------------------------- gráficos SVG
  function barras(M) {
    const w = 440, h = 200, x0 = 34, y0 = 170, max = Math.max(1, ...M.porTipo.map(t => Math.max(t.generados, t.derrotados))), bw = 34;
    let s = `<svg viewBox="0 0 ${w} ${h}" class="inf-svg" role="img" aria-label="Enemigos generados y derrotados por tipo">`;
    for (let i = 0; i <= max; i += Math.max(1, Math.ceil(max / 4))) { const y = y0 - i / max * 140; s += `<line x1="${x0}" x2="${w - 10}" y1="${y}" y2="${y}" class="inf-rejilla"/><text x="${x0 - 8}" y="${y + 4}" class="inf-eje" text-anchor="end">${i}</text>`; }
    M.porTipo.forEach((t, i) => {
      const cx = x0 + 30 + i * 100, hg = t.generados / max * 140, hd = t.derrotados / max * 140;
      s += `<rect x="${cx}" y="${y0 - hg}" width="${bw}" height="${hg}" fill="${COLOR[t.k]}" opacity=".35" rx="3"><title>${NOMBRE[t.k]}: ${t.generados} aparecieron</title></rect>`;
      s += `<rect x="${cx + bw + 4}" y="${y0 - hd}" width="${bw}" height="${hd}" fill="${COLOR[t.k]}" rx="3"><title>${NOMBRE[t.k]}: ${t.derrotados} derrotados</title></rect>`;
      s += `<text x="${cx + bw + 2}" y="${y0 + 18}" class="inf-eje" text-anchor="middle">${NOMBRE[t.k]}</text>`;
    });
    return s + `</svg><p class="inf-leyenda"><i class="claro"></i>Aparecieron <i></i>Derrotados</p>`;
  }
  function dona(M) {
    const tot = M.dano;
    if (!tot) return '<p class="inf-vacio">No recibiste daño en este tramo. ¡Impecable!</p>';
    let a0 = -Math.PI / 2, s = '<svg viewBox="0 0 220 200" class="inf-svg inf-dona" role="img" aria-label="Origen del daño recibido">';
    M.porTipo.filter(t => t.dano).forEach(t => {
      const a1 = a0 + t.dano / tot * Math.PI * 2, gr = a1 - a0 > Math.PI ? 1 : 0, r = 80, ri = 48, cx = 110, cy = 100;
      const p = (a, rr) => `${cx + Math.cos(a) * rr},${cy + Math.sin(a) * rr}`;
      s += t.dano === tot ? `<circle cx="${cx}" cy="${cy}" r="${(r + ri) / 2}" stroke="${COLOR[t.k]}" stroke-width="${r - ri}" fill="none"><title>${NOMBRE[t.k]}: 100%</title></circle>`
        : `<path d="M${p(a0, r)} A${r},${r} 0 ${gr} 1 ${p(a1, r)} L${p(a1, ri)} A${ri},${ri} 0 ${gr} 0 ${p(a0, ri)}Z" fill="${COLOR[t.k]}"><title>${NOMBRE[t.k]}: ${t.dano} de daño (${pct(t.dano, tot)}%)</title></path>`;
      a0 = a1;
    });
    s += `<text x="110" y="98" text-anchor="middle" class="inf-dona-num">${tot}</text><text x="110" y="116" text-anchor="middle" class="inf-eje">de daño</text></svg>`;
    return s + '<ul class="inf-lista-dona">' + M.porTipo.filter(t => t.dano).map(t => `<li><i style="background:${COLOR[t.k]}"></i>${NOMBRE[t.k]} <b>${pct(t.dano, tot)}%</b></li>`).join('') + '</ul>';
  }
  function linea(T, M) {
    const v = M.vida; if (v.length < 2) return '<p class="inf-vacio">Tramo demasiado corto para trazar la vida.</p>';
    const w = 440, h = 190, x0 = 30, x1 = w - 10, y0 = 160, t0 = v[0].t, t1 = v[v.length - 1].t || t0 + 1;
    const X = t => x0 + (t - t0) / ((t1 - t0) || 1) * (x1 - x0), Y = hp => y0 - hp / T.hpMax * 130;
    let s = `<svg viewBox="0 0 ${w} ${h}" class="inf-svg" role="img" aria-label="Vida del jugador en el tiempo">`;
    T.olas.filter(o => o && o.t1 !== undefined).forEach(o => { const a = Math.max(t0, o.t0), b = Math.min(t1, o.t1 ?? t1); if (b > a) s += `<rect x="${X(a)}" y="20" width="${X(b) - X(a)}" height="${y0 - 20}" class="inf-banda b${o.n}"/><text x="${X(a) + 4}" y="32" class="inf-eje">Oleada ${o.n}</text>`; });
    for (let hp = 0; hp <= T.hpMax; hp += 2) s += `<line x1="${x0}" x2="${x1}" y1="${Y(hp)}" y2="${Y(hp)}" class="inf-rejilla"/><text x="${x0 - 6}" y="${Y(hp) + 4}" class="inf-eje" text-anchor="end">${hp}</text>`;
    s += `<polyline points="${v.map(p => `${X(p.t)},${Y(p.hp)}`).join(' ')}" class="inf-linea"/>`;
    const min = v.reduce((a, p) => p.hp < a.hp ? p : a, v[0]);
    s += `<circle cx="${X(min.t)}" cy="${Y(min.hp)}" r="5" class="inf-punto"><title>Vida mínima: ${min.hp} a los ${num(min.t)} s</title></circle>`;
    s += `<text x="${x0}" y="${h - 6}" class="inf-eje">${num(t0)} s</text><text x="${x1}" y="${h - 6}" class="inf-eje" text-anchor="end">${num(t1)} s</text></svg>`;
    return s;
  }
  function calor(M) {
    const C = KRBatalla.COLS, F = KRBatalla.FILAS, max = Math.max(1, ...M.pos), cw = 26, ch = 20;
    let s = `<svg viewBox="0 0 ${C * cw} ${F * ch}" class="inf-svg inf-calor" role="img" aria-label="Mapa de calor de posiciones en la arena">`;
    M.pos.forEach((v, i) => { const x = i % C, y = Math.floor(i / C), k = v / max; s += `<rect x="${x * cw}" y="${y * ch}" width="${cw - 1}" height="${ch - 1}" fill="rgba(${Math.round(60 + 190 * k)},${Math.round(90 + 60 * k)},${Math.round(200 - 150 * k)},${.12 + k * .88})"><title>${v} muestras</title></rect>`; });
    return s + '</svg>';
  }
  function ttk(M) {
    const t = M.porTipo.filter(x => x.ttk), max = Math.max(1, ...t.map(x => x.ttk));
    if (!t.length) return '<p class="inf-vacio">Sin enemigos derrotados en este tramo.</p>';
    return '<div class="inf-ttk">' + t.map(x => `<div><span>${NOMBRE[x.k]}</span><i style="width:${x.ttk / max * 100}%;background:${COLOR[x.k]}"></i><b>${num(x.ttk)} s</b></div>`).join('') + '</div>';
  }

  // ---------------------------------------------------------- hallazgos y recomendaciones
  function bordes(M) {
    const C = KRBatalla.COLS, F = KRBatalla.FILAS; let b = 0, tot = 0;
    M.pos.forEach((v, i) => { const x = i % C, y = Math.floor(i / C); tot += v; if (x < 2 || x > C - 3 || y < 1 || y > F - 2) b += v; });
    return pct(b, tot);
  }
  function hallazgos(T, M, ola) {
    const h = [], fuente = [...M.porTipo].sort((a, b) => b.dano - a.dano)[0], lento = [...M.porTipo].filter(x => x.ttk).sort((a, b) => b.ttk - a.ttk)[0];
    h.push(['🎯', `Acertaste <b>${M.aciertos} de ${M.ataques}</b> ataques: una precisión de <b>${M.precision}%</b>. ${M.precision >= 70 ? 'Muy buena lectura de distancias.' : M.precision >= 45 ? 'Hay margen para atacar con más intención.' : 'Muchos golpes fueron al aire.'}`]);
    if (M.dano) h.push(['🩸', `El <b>${pct(fuente.dano, M.dano)}%</b> del daño que recibiste vino de <b>${NOMBRE[fuente.k]}</b> (${fuente.dano} de ${M.dano}).`]);
    else h.push(['🛡️', 'No recibiste daño en este tramo.']);
    if (lento) h.push(['⏱️', `<b>${NOMBRE[lento.k]}</b> fue el enemigo más lento de derrotar: <b>${num(lento.ttk)} s</b> en promedio desde que apareció.`]);
    if (!ola) { const dura = [...M.porOla].sort((a, b) => b.dpm - a.dpm)[0]; if (dura && dura.dano) h.push(['📈', `La <b>oleada ${dura.n}</b> fue la más exigente: ${num(dura.dpm)} de daño por minuto.`]); }
    if (M.vida.length) { const min = M.vida.reduce((a, p) => p.hp < a.hp ? p : a, M.vida[0]); h.push(['❤️', `Tu vida mínima fue <b>${min.hp} de ${T.hpMax}</b>, a los ${num(min.t)} s.${M.curaciones ? ` Recogiste ${M.curaciones} corazón(es).` : ''}`]); }
    h.push(['🗺️', `Pasaste el <b>${bordes(M)}%</b> del tiempo junto a los muros de la arena.`]);
    h.push(['⚔️', `Diste <b>${M.golpes}</b> golpes y recibiste <b>${M.recibidos}</b>: un ratio de <b>${num(M.golpes / Math.max(1, M.recibidos))}</b> golpes dados por cada golpe recibido.`]);
    return h;
  }
  function acciones(T, M, ola) {
    const j = [], d = [], fuente = [...M.porTipo].sort((a, b) => b.dano - a.dano)[0];
    const consejo = {
      arquero: 'Prioriza a los arqueros: se acercan poco y disparan desde lejos. Avanza en diagonal y elimínalos primero.',
      golem: 'Cuando el gólem tiembla con ojos rojos va a embestir: apártate de su línea y atácalo mientras se recupera.',
      murcielago: 'Los murciélagos son erráticos: en vez de perseguirlos, espera quieto y golpéalos cuando se acerquen.',
      slime: 'Los slimes son lentos pero llegan en grupo: muévete en círculo para que no te rodeen.',
    };
    if (M.dano && fuente.dano) j.push(consejo[fuente.k]);
    if (M.precision < 60) j.push(`Reduce los ataques al aire: ${M.ataques - M.aciertos} de tus ataques no golpearon a nadie. Ataca cuando el enemigo esté a un paso.`);
    if (bordes(M) > 45) j.push('Te acorralaron contra los muros: mantente cerca del centro para tener rutas de escape.');
    if (M.curaciones === 0 && M.dano >= 3) j.push('Recoge los corazones que sueltan algunos enemigos: recuperan 1 punto de vida.');
    if (!j.length) j.push('¡Partida sobresaliente! Mantén el ritmo y prueba terminar más rápido.');
    const po = M.porOla;
    if (!ola && po.length >= 2) {
      const creciente = po.every((o, i) => i === 0 || o.dpm >= po[i - 1].dpm * .8);
      d.push(creciente ? 'La curva de dificultad es progresiva: el daño por minuto se mantiene o sube en cada oleada, como se espera en un buen diseño.' : 'La curva de dificultad no es creciente: una oleada intermedia resultó más dura que la siguiente. Conviene reordenar los enemigos o ajustar su cantidad.');
    }
    if (M.dano && pct(fuente.dano, M.dano) >= 50) d.push(`Si en muchos jugadores ${NOMBRE[fuente.k]} concentra más del 50% del daño, estaría desbalanceado: se podría reducir su cadencia, velocidad o daño.`);
    d.push(`Duración del tramo: ${num(M.tiempo)} s. ${M.tiempo > 150 ? 'Es larga para un minijuego; se podrían reducir enemigos.' : M.tiempo < 45 ? 'Es muy corta; se podrían sumar enemigos.' : 'Está en un rango cómodo para un minijuego (45 a 150 s).'}`);
    if (M.vida.length && Math.min(...M.vida.map(v => v.hp)) <= 2) d.push('El jugador llegó al borde de la derrota: evaluar más curaciones en la oleada final o telegrafiar mejor los ataques.');
    return { j, d };
  }

  // ---------------------------------------------------------- composición del informe
  function construir(cont, T, op) {
    let ola = 0, paso = 0;
    const PASOS = ['1 · Datos', '2 · Indicadores', '3 · Visualización', '4 · Hallazgos', '5 · Acciones'];
    function cuerpo() {
      const M = medir(T, ola);
      if (paso === 0) {
        const filas = M.ev.filter(e => e.tipo !== 'aparicion').slice(-60).reverse();
        const conteo = ['ataque', 'golpe', 'recibido', 'derrota', 'disparo', 'especial', 'bloqueo', 'curacion', 'aparicion'].map(k => `<span><b>${M.ev.filter(e => e.tipo === k).length}</b>${k}</span>`).join('');
        return `<p class="inf-explica">Todo análisis parte de datos crudos. Durante el combate se registró cada acción como una fila, igual que cada factura de Magic Foods era una fila de ventas. Aquí ves <b>${M.ev.length} eventos</b>${ola ? ` de la oleada ${ola}` : ''}.</p>
          <div class="inf-conteo">${conteo}</div>
          <div class="inf-tabla-caja"><table class="inf-tabla"><thead><tr><th>Tiempo</th><th>Oleada</th><th>Evento</th><th>Enemigo</th><th>Detalle</th></tr></thead><tbody>
          ${filas.map(e => `<tr><td>${num(e.t)} s</td><td>${e.ola}</td><td>${e.tipo}</td><td>${e.enemigo ? NOMBRE[e.enemigo] : '-'}</td><td>${e.tipo === 'ataque' ? (e.acierto ? `acierto ×${e.golpes}` : 'fallo') : e.dano ? `daño ${e.dano}${e.via ? ' · ' + e.via : ''}` : e.ttk ? `derrotado en ${num(e.ttk)} s` : ''}</td></tr>`).join('')}
          </tbody></table></div><p class="inf-nota">Se muestran los 60 eventos más recientes, sin contar las apariciones.</p>`;
      }
      if (paso === 1) {
        const k = [
          ['Golpes dados', M.golpes, 'Conteo de eventos «golpe»'], ['Precisión', M.precision + '%', 'Ataques con acierto ÷ ataques'], ['Golpes recibidos', M.recibidos, 'Conteo de eventos «recibido»'],
          ['Daño recibido', M.dano, 'Suma del daño de cada golpe recibido'], ['Enemigos derrotados', `${M.derrotados}/${M.generados}`, 'Derrotas ÷ apariciones'], ['Enemigos distintos', M.porTipo.filter(t => t.generados).length, 'Tipos con al menos una aparición'],
          ['Tiempo', num(M.tiempo) + ' s', 'Suma de la duración de las oleadas'], ['Derrotas por minuto', num(M.derrotados / M.tiempo * 60), 'Derrotas ÷ minutos'], ['Ratio de combate', num(M.golpes / Math.max(1, M.recibidos)), 'Golpes dados ÷ golpes recibidos'],
          ['Curaciones', M.curaciones, 'Corazones recogidos o regenerados'],
        ].concat(M.especiales ? [['Ondas de energía', M.especiales, 'Ataques especiales lanzados']] : [], M.dron ? [['Golpes de tu especialidad', M.dron, 'Torta, compañero, robot, esqueletos, confusión o aliados']] : [], M.bloqueos ? [['Bloqueos', M.bloqueos, 'Golpes anulados por el escudo']] : []);
        return `<p class="inf-explica">Un indicador (KPI) resume muchas filas en un número que responde una pregunta. Pasa el cursor por cada tarjeta para ver cómo se calcula.</p>
          <div class="inf-kpis">${k.map(([n, v, f]) => `<div class="inf-kpi" title="${esc(f)}"><span>${n}</span><b>${v}</b><small>${f}</small></div>`).join('')}</div>`;
      }
      if (paso === 2) {
        return `<p class="inf-explica">Un buen gráfico responde una sola pregunta. Pasa el cursor sobre barras, sectores y celdas para ver el detalle.</p>
          <div class="inf-graficos">
            <figure><figcaption>¿A quiénes enfrentaste y a cuántos derrotaste?</figcaption>${barras(M)}<p class="inf-lee">Cómo leerlo: la barra clara son los enemigos que aparecieron y la sólida los que derrotaste. Si son iguales, limpiaste ese tipo.</p></figure>
            <figure><figcaption>¿De dónde vino el daño?</figcaption>${dona(M)}<p class="inf-lee">Cómo leerlo: cada sector es la proporción del daño total causado por un tipo de enemigo.</p></figure>
            <figure><figcaption>¿Cómo evolucionó tu vida?</figcaption>${linea(T, M)}<p class="inf-lee">Cómo leerlo: las bajadas son golpes recibidos y las subidas, curaciones. El punto marca tu momento más crítico.</p></figure>
            <figure><figcaption>¿Dónde te moviste?</figcaption>${calor(M)}<p class="inf-lee">Cómo leerlo: la arena vista desde arriba. Mientras más cálido el color, más tiempo estuviste ahí.</p></figure>
            <figure class="ancho"><figcaption>¿Qué enemigo te costó más derrotar?</figcaption>${ttk(M)}<p class="inf-lee">Cómo leerlo: tiempo promedio entre la aparición de un enemigo y su derrota.</p></figure>
          </div>`;
      }
      if (paso === 3) {
        return `<p class="inf-explica">Un hallazgo es un patrón que los datos muestran y que vale la pena comunicar.</p>
          <ul class="inf-hallazgos">${hallazgos(T, M, ola).map(([i, t]) => `<li><span>${i}</span><p>${t}</p></li>`).join('')}</ul>`;
      }
      const a = acciones(T, M, ola);
      return `<p class="inf-explica">El análisis termina en decisiones. Estas acciones salen directamente de los hallazgos: unas son para ti como jugador y otras para quien diseña el juego.</p>
        <div class="inf-acciones"><section><h4>🎮 Para mejorar como jugador</h4><ol>${a.j.map(x => `<li>${x}</li>`).join('')}</ol></section>
        <section><h4>🛠️ Análisis de jugabilidad para el diseño</h4><ol>${a.d.map(x => `<li>${x}</li>`).join('')}</ol></section></div>
        <p class="inf-puente">Este es el mismo proceso que apliqué durante más de tres años en una empresa manufacturera de alimentos: <b>datos → indicadores → visualización → hallazgos → acciones</b>.</p>`;
    }
    function pintar() {
      const gano = T.resultado === 'victoria';
      cont.innerHTML = `<div class="inf">
        <header class="inf-cab">
          <div><p class="inf-kicker">Informe de jugabilidad · ${op.infinito ? 'Oleadas infinitas' : 'Arena del Dato'}</p><h2>${op.infinito ? `Llegaste a la oleada ${T.olaAlcanzada}${op.nuevo ? ' · ¡nuevo récord!' : ` · récord ${op.record}`}` : gano ? 'Victoria' : 'Derrota'} · ${T.eventos.length} eventos</h2></div>
          <div class="inf-filtro" role="group" aria-label="Filtrar por oleada">${['Todas'].concat(T.olas.filter(Boolean).slice(0, 12).map(o => (T.olas.length > 5 ? 'O' : 'Oleada ') + o.n)).map((n, i) => `<button type="button" data-ola="${i}" class="${i === ola ? 'activo' : ''}">${n}</button>`).join('')}</div>
        </header>
        <nav class="inf-pasos" role="tablist">${PASOS.map((n, i) => `<button type="button" role="tab" data-paso="${i}" class="${i === paso ? 'activo' : ''}" aria-selected="${i === paso}">${n}</button>`).join('')}</nav>
        <div class="inf-cuerpo">${cuerpo()}</div>
        <footer class="inf-pie">
          ${paso < 4 ? `<button type="button" class="btn btn-linea" data-sig>Siguiente paso ▶</button>` : ''}
          ${paso < 4 && !op.visto ? `<button type="button" class="btn btn-mini" data-saltar>Saltar al final</button>` : ''}
          ${op.puntos ? `<span class="inf-ph">+${op.puntos} puntos de habilidad</span>` : ''}
          ${paso === 4 || op.visto ? `<div class="inf-final">
            <p><b>¿Te gustó convertir datos en decisiones?</b> Revisa el análisis de datos de Magic Foods, proyecto de una empresa manufacturera de alimentos.</p>
            <div class="fila-botones"><button type="button" class="btn btn-oro" data-magic>Revisar análisis de datos de Magic Foods ↗</button>
            ${op.infinito ? '<button type="button" class="btn btn-linea" data-reintentar>∞ Otra partida</button><button type="button" class="btn btn-linea" data-continuar>Volver a la aldea</button>' : '<button type="button" class="btn btn-linea" data-continuar>Continuar la aventura ▶</button><button type="button" class="btn btn-mini" data-reintentar>Reintentar la batalla</button>'}</div>
            ${!op.infinito && !gano ? '<p class="inf-nota">Aunque caíste, cumpliste la misión: generaste datos y los analizaste. ¡Ganar da puntos extra!</p>' : ''}
          </div>` : ''}
        </footer></div>`;
    }
    cont.onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.ola !== undefined) { ola = +b.dataset.ola; pintar(); }
      else if (b.dataset.paso !== undefined) { paso = +b.dataset.paso; pintar(); if (paso === 4) op.visto = true; }
      else if (b.hasAttribute('data-saltar')) { paso = 4; op.visto = true; pintar(); }
      else if (b.hasAttribute('data-sig')) { paso++; if (paso === 4) op.visto = true; pintar(); cont.scrollTop = 0; }
      else if (b.hasAttribute('data-magic')) op.alMagic();
      else if (b.hasAttribute('data-continuar')) op.alContinuar();
      else if (b.hasAttribute('data-reintentar')) op.alReintentar();
      window.KR && KR.beep([[660, .03]]);
    };
    pintar();
  }
  window.KRInforme = { construir, medir };
})();

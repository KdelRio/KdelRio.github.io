/* ==========================================================================
   Torre del Dato: tablero interactivo con datos de Magic Foods, desafío y comparador BI
   ========================================================================== */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const NS = 'http://www.w3.org/2000/svg';
  const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const COL = { a2023: '#8fa3bd', a2024: '#e0b756', zonas: '#7ec8ff', mix: ['#e0b756', '#7ec8ff', '#f472b6', '#6bd49a', '#a78bfa'] };
  const fmt = (v, d = 0) => v.toLocaleString('es-CL', { minimumFractionDigits: d, maximumFractionDigits: d });
  const mill = v => '$' + fmt(v / 1e6) + ' mill.';
  let D = null;

  const el = (tag, attrs = {}, padre) => {
    const e = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
    if (padre) padre.appendChild(e);
    return e;
  };
  const svg = (w, h) => el('svg', { viewBox: `0 0 ${w} ${h}`, role: 'img' });

  // ---------------------------------------------------------- filtros
  const F = { anio: '', zona: '', canal: '' };
  const pasa = (r, sinAnio) => (sinAnio || !F.anio || r.anio === +F.anio) && (!F.zona || r.zona === F.zona) && (!F.canal || r.canal === F.canal);

  function filas() { return D.m.map(r => ({ anio: r[0], mes: r[1], zona: r[2], canal: r[3], fam: r[4], v: r[5], c: r[6], p: r[7], u: r[8] })); }
  let M = [], PR = [], PED = [];

  // ---------------------------------------------------------- gráficos SVG
  function lineas(cont) {
    cont.innerHTML = '';
    const w = 860, h = 240, pl = 44, pr = 16, pt = 14, pb = 28;
    const s = svg(w, h);
    const series = [2023, 2024].map(a => {
      const v = Array(12).fill(0);
      M.filter(r => r.anio === a && pasa(r, true)).forEach(r => v[r.mes - 1] += r.v);
      return { a, v };
    });
    const max = Math.max(1, ...series.flatMap(x => x.v)) * 1.1;
    const X = i => pl + i * (w - pl - pr) / 11, Y = v => pt + (h - pt - pb) * (1 - v / max);
    for (let k = 0; k <= 4; k++) {
      const v = max * k / 4, y = Y(v);
      el('line', { x1: pl, x2: w - pr, y1: y, y2: y, stroke: 'rgba(255,255,255,.08)' }, s);
      el('text', { x: pl - 6, y: y + 4, 'text-anchor': 'end' }, s).textContent = fmt(v / 1e6);
    }
    MESES.forEach((m, i) => el('text', { x: X(i), y: h - 8, 'text-anchor': 'middle' }, s).textContent = m);
    series.forEach(se => {
      const tenue = F.anio && +F.anio !== se.a;
      const color = se.a === 2024 ? COL.a2024 : COL.a2023;
      const d = se.v.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
      el('path', { d, fill: 'none', stroke: color, 'stroke-width': tenue ? 1.5 : 3, opacity: tenue ? .35 : 1, 'stroke-linejoin': 'round' }, s);
      se.v.forEach((v, i) => {
        const c = el('circle', { cx: X(i), cy: Y(v), r: tenue ? 2.5 : 4, fill: color, opacity: tenue ? .35 : 1 }, s);
        el('title', {}, c).textContent = `${MESES[i]} ${se.a}: ${mill(v)}`;
      });
      const lx = w - pr - (se.a === 2024 ? 60 : 130);
      el('rect', { x: lx, y: 2, width: 12, height: 4, fill: color }, s);
      el('text', { x: lx + 16, y: 8 }, s).textContent = se.a;
    });
    cont.appendChild(s);
    return series;
  }

  function barrasZonas(cont) {
    cont.innerHTML = '';
    const tot = {}; D.dims.zonas.forEach(z => tot[z] = 0);
    M.filter(r => (!F.anio || r.anio === +F.anio) && (!F.canal || r.canal === F.canal)).forEach(r => tot[r.zona] += r.v);
    const datos = D.dims.zonas.map(z => ({ z, v: tot[z] })).sort((a, b) => b.v - a.v);
    const max = Math.max(1, ...datos.map(d => d.v));
    const w = 300, fila = 34, h = datos.length * fila + 6;
    const s = svg(w, h);
    datos.forEach((d, i) => {
      const y = i * fila + 4, ancho = (w - 150) * d.v / max, activo = !F.zona || F.zona === d.z;
      el('text', { x: 0, y: y + 17 }, s).textContent = d.z;
      const r = el('rect', { x: 78, y: y + 4, width: Math.max(2, ancho), height: 18, rx: 4, fill: COL.zonas, opacity: activo ? 1 : .3, class: 'barra' }, s);
      el('title', {}, r).textContent = `${d.z}: ${mill(d.v)} · clic para filtrar`;
      r.addEventListener('click', () => { F.zona = F.zona === d.z ? '' : d.z; $('#f-zona').value = F.zona; actualizar(true); });
      el('text', { x: 84 + ancho, y: y + 17 }, s).textContent = fmt(d.v / 1e6);
    });
    cont.appendChild(s);
    return datos;
  }

  function dona(cont) {
    cont.innerHTML = '';
    const tot = {}; M.filter(r => pasa(r)).forEach(r => tot[r.fam] = (tot[r.fam] || 0) + r.v);
    const datos = Object.entries(tot).sort((a, b) => b[1] - a[1]);
    const suma = datos.reduce((a, d) => a + d[1], 0) || 1;
    const s = svg(200, 170), cx = 100, cy = 85, R = 70, r = 42;
    let ang = -Math.PI / 2;
    datos.forEach(([fam, v], i) => {
      const a2 = ang + v / suma * Math.PI * 2, largo = a2 - ang > Math.PI ? 1 : 0;
      const p = (rr, a) => `${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`;
      const path = el('path', { d: `M${p(R, ang)} A${R},${R} 0 ${largo} 1 ${p(R, a2)} L${p(r, a2)} A${r},${r} 0 ${largo} 0 ${p(r, ang)} Z`, fill: COL.mix[i % 5] }, s);
      el('title', {}, path).textContent = `${fam}: ${fmt(v / suma * 100, 1)}%`;
      ang = a2;
    });
    const t = el('text', { x: cx, y: cy + 5, 'text-anchor': 'middle', style: 'font: 700 15px Inter; fill: #f4f7fd' }, s);
    t.textContent = fmt(suma / 1e6) + ' M';
    cont.appendChild(s);
    const ley = document.createElement('div'); ley.className = 'leyenda-mix';
    datos.forEach(([fam, v], i) => { const sp = document.createElement('span'); sp.innerHTML = `<i style="background:${COL.mix[i % 5]}"></i>`; sp.append(`${fam} ${fmt(v / suma * 100)}%`); ley.appendChild(sp); });
    cont.appendChild(ley);
  }

  function top(cont) {
    const tot = {};
    PR.filter(r => pasa(r)).forEach(r => { const t = tot[r.prod] || (tot[r.prod] = { v: 0, c: 0 }); t.v += r.v; t.c += r.c; });
    const datos = Object.entries(tot).map(([prod, t]) => ({ prod, v: t.v, m: 1 - t.c / t.v })).sort((a, b) => b.v - a.v);
    cont.innerHTML = '';
    const ol = document.createElement('ol'); ol.className = 'lista-top';
    datos.slice(0, 5).forEach((d, i) => {
      const li = document.createElement('li');
      li.innerHTML = `<span>${i + 1}</span><span></span><small></small>`;
      li.children[1].textContent = d.prod; li.children[2].textContent = `${fmt(d.v / 1e6)} M · ${fmt(d.m * 100, 1)}%`;
      ol.appendChild(li);
    });
    cont.appendChild(ol);
    return datos;
  }

  // ---------------------------------------------------------- KPIs y hallazgo
  function actualizar(interaccion) {
    const sel = M.filter(r => pasa(r));
    const v = sel.reduce((a, r) => a + r.v, 0), c = sel.reduce((a, r) => a + r.c, 0), p = PED.filter(r => pasa(r)).reduce((a, r) => a + r.p, 0);
    $('#k-ventas').textContent = mill(v);
    $('#k-margen').textContent = v ? fmt((1 - c / v) * 100, 1) + '%' : '—';
    $('#k-pedidos').textContent = fmt(p);
    $('#k-ticket').textContent = p ? '$' + fmt(v / p) : '—';
    const ref = F.anio ? +F.anio : 2024;
    const sumA = a => M.filter(r => r.anio === a && pasa(r, true)).reduce((s, r) => s + r.v, 0);
    const act = sumA(ref), ant = sumA(ref - 1), kv = $('#k-var');
    if (ant) { const x = (act - ant) / ant * 100; kv.textContent = (x >= 0 ? '+' : '') + fmt(x, 1) + '%'; kv.className = x >= 0 ? 'pos' : 'neg'; }
    else { kv.textContent = '—'; kv.className = ''; }

    const series = lineas($('#g-linea'));
    const zonas = barrasZonas($('#g-zonas'));
    dona($('#g-mix'));
    const prods = top($('#g-top'));

    // hallazgo automático en lenguaje natural
    const serie = F.anio ? series.find(s => s.a === +F.anio).v : series[0].v.map((x, i) => x + series[1].v[i]);
    const positivos = serie.filter(x => x > 0), mMax = serie.indexOf(Math.max(...serie)), mMin = positivos.length ? serie.indexOf(Math.min(...positivos)) : mMax;
    const totZ = zonas.reduce((a, z) => a + z.v, 0) || 1;
    const peor = [...prods].filter(x => x.v > 5e6).sort((a, b) => a.m - b.m)[0];
    let txt = `💡 En esta selección, el mes más fuerte es <b>${MESES[mMax]}</b> y el más débil <b>${MESES[mMin]}</b>. `;
    if (!F.zona) txt += `La macrozona líder es <b>${zonas[0].z}</b> con ${fmt(zonas[0].v / totZ * 100)}% de las ventas. `;
    if (peor) txt += `Ojo con <b>${peor.prod}</b>: vende ${fmt(peor.v / 1e6)} millones pero deja solo ${fmt(peor.m * 100, 1)}% de margen.`;
    $('#lab-hallazgo').innerHTML = txt;
    if (interaccion) window.KR && KR.desbloquear('filtro');
  }

  // ---------------------------------------------------------- desafío con respuestas calculadas desde los datos
  function desafio() {
    const porZona = a => { const t = {}; M.filter(r => r.anio === a).forEach(r => t[r.zona] = (t[r.zona] || 0) + r.v); return t; };
    const z23 = porZona(2023), z24 = porZona(2024);
    const cae = D.dims.zonas.find(z => z24[z] < z23[z]);
    const porCanal = {}; M.forEach(r => porCanal[r.canal] = (porCanal[r.canal] || 0) + r.v);
    const canalTop = Object.entries(porCanal).sort((a, b) => b[1] - a[1])[0][0];
    const tp = {}; PR.forEach(r => { const t = tp[r.prod] || (tp[r.prod] = { v: 0, c: 0 }); t.v += r.v; t.c += r.c; });
    const bajos = Object.entries(tp).filter(([, t]) => t.v > 3e7).map(([k, t]) => ({ k, m: 1 - t.c / t.v })).sort((a, b) => a.m - b.m);
    const PREG = [
      { q: '¿Qué macrozona vendió menos en 2024 que en 2023?', ops: D.dims.zonas, ok: cae, pista: 'Filtra por año y compara el gráfico de macrozonas.' },
      { q: '¿Qué canal concentra la mayor parte de las ventas?', ops: D.dims.canales, ok: canalTop, pista: 'Prueba el filtro de canal y mira las ventas netas.' },
      { q: '¿Qué producto de alta venta tiene el margen más bajo?', ops: [...new Set([0, Math.floor(bajos.length / 3), Math.floor(bajos.length * 2 / 3), bajos.length - 1].map(i => bajos[i].k))].sort(), ok: bajos[0].k, pista: 'Revisa el hallazgo automático bajo los gráficos.' },
    ];
    const cont = $('#desafio-preguntas'); cont.innerHTML = '';
    const estado = (window.KR && KR.estado().extra) || {};
    estado.desafio = estado.desafio || {};
    PREG.forEach((p, i) => {
      const div = document.createElement('div'); div.className = 'pregunta';
      const t = document.createElement('p'); t.textContent = `${i + 1}. ${p.q}`;
      const ops = document.createElement('div'); ops.className = 'opciones';
      const res = document.createElement('p'); res.className = 'resultado';
      p.ops.forEach(o => {
        const b = document.createElement('button'); b.className = 'opcion'; b.textContent = o;
        b.addEventListener('click', () => {
          if (o === p.ok) {
            [...ops.children].forEach(x => x.disabled = true);
            b.classList.add('correcta'); res.textContent = '¡Correcto! Así se lee un tablero.';
            if (!estado.desafio[i]) { estado.desafio[i] = true; KR.guardar(); KR.sumarXP(40, 'Respuesta correcta'); }
            if (Object.keys(estado.desafio).length === PREG.length) KR.desbloquear('analista');
          } else { b.classList.add('incorrecta'); b.disabled = true; res.textContent = 'No es esa. Pista: ' + p.pista; }
        });
        ops.appendChild(b);
      });
      div.append(t, ops, res); cont.appendChild(div);
    });
  }

  // ---------------------------------------------------------- comparador Power BI ↔ Tableau
  const DASH = ['Resumen Comercial', 'Metas y Pedidos', 'Finanzas', 'Cobranza y Proveedores', 'Producción e Inventario', 'Personas', 'Calidad y Activos TI'];
  function comparador() {
    const tabs = $('#bi-tabs'), pbi = $('#cmp-pbi'), tab = $('#cmp-tab'), rango = $('#cmp-rango');
    const marco = $('#cmp-tableau-marco'), div = $('#cmp-divisor');
    const mostrar = i => {
      pbi.src = `assets/img/bi/powerbi-${i + 1}.jpg`; tab.src = `assets/img/bi/tableau-${i + 1}.jpg`;
      [...tabs.children].forEach((b, k) => { b.classList.toggle('activo', k === i); b.setAttribute('aria-selected', k === i); });
    };
    DASH.forEach((n, i) => {
      const b = document.createElement('button'); b.className = 'bi-tab'; b.textContent = n; b.setAttribute('role', 'tab');
      b.addEventListener('click', () => mostrar(i)); tabs.appendChild(b);
    });
    let movido = 0;
    rango.addEventListener('input', () => {
      const v = rango.value; marco.style.clipPath = `inset(0 0 0 ${v}%)`; div.style.left = v + '%';
      if (++movido === 8) window.KR && KR.desbloquear('bilingue');
    });
    mostrar(0);
  }

  // ---------------------------------------------------------- inicio
  function iniciar() {
    M = filas();
    PED = D.ped.map(r => ({ anio: r[0], mes: r[1], zona: r[2], canal: r[3], p: r[4] }));
    PR = D.prod.map(r => ({ anio: r[0], zona: r[1], canal: r[2], prod: r[3], v: r[4], c: r[5], u: r[6] }));
    const fz = $('#f-zona'), fc = $('#f-canal');
    D.dims.zonas.forEach(z => fz.add(new Option(z, z)));
    D.dims.canales.forEach(c => fc.add(new Option(c, c)));
    $('#f-anio').addEventListener('change', e => { F.anio = e.target.value; actualizar(true); });
    fz.addEventListener('change', e => { F.zona = e.target.value; actualizar(true); });
    fc.addEventListener('change', e => { F.canal = e.target.value; actualizar(true); });
    $('#f-limpiar').addEventListener('click', () => { F.anio = F.zona = F.canal = ''; $('#f-anio').value = fz.value = fc.value = ''; actualizar(); });
    actualizar(); desafio();
  }
  comparador();
  fetch('assets/data/magicfoods.json').then(r => r.json()).then(j => { D = j; iniciar(); })
    .catch(() => { $('#lab-hallazgo').textContent = 'No se pudieron cargar los datos del laboratorio. Si abriste el archivo localmente, usa un servidor web.'; });
})();

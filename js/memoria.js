/* ==========================================================================
   Memorize de habilidades: 12 pares con las disciplinas del árbol del Gremio.
   Íconos: Phosphor Icons (MIT), variante duotone.
   KRMemoria.montar(contenedor, { alPar(carta), alCompletar(movimientos) })
   se usa en el salón de la página clásica y en la misión 3 del modo arcade.
   ========================================================================== */
(function () {
  'use strict';
  const RAMAS = { datos: 'Datos y BI', juegos: 'Videojuegos', software: 'Software', ia: 'IA', gestion: 'Gestión', infra: 'Infraestructura', liderazgo: 'Liderazgo' };
  const CARTAS = [
    {
    "id": "powerbi",
    "nombre": "Power BI",
    "rama": "datos",
    "txt": "Modelos estrella, medidas DAX, Power Query y tableros para gerencia y jefaturas de área.",
    "svg": "<path d=\"M208,40V208H152V40Z\" opacity=\"0.2\"/><path d=\"M224,200h-8V40a8,8,0,0,0-8-8H152a8,8,0,0,0-8,8V80H96a8,8,0,0,0-8,8v40H48a8,8,0,0,0-8,8v64H32a8,8,0,0,0,0,16H224a8,8,0,0,0,0-16ZM160,48h40V200H160ZM104,96h40V200H104ZM56,144H88v56H56Z\"/>"
    },
    {
    "id": "tableau",
    "nombre": "Tableau",
    "rama": "datos",
    "txt": "Réplica 1:1 de los dashboards de Power BI con parámetros, campos calculados, doble eje y mapas.",
    "svg": "<path d=\"M96,37.5v72l-62.4,36A96,96,0,0,1,96,37.5Z\" opacity=\"0.2\"/><path d=\"M100,116.43a8,8,0,0,0,4-6.93v-72A8,8,0,0,0,93.34,30,104.06,104.06,0,0,0,25.73,147a8,8,0,0,0,4.52,5.81,7.86,7.86,0,0,0,3.35.74,8,8,0,0,0,4-1.07ZM88,49.62v55.26L40.12,132.51C40,131,40,129.48,40,128A88.12,88.12,0,0,1,88,49.62ZM128,24a8,8,0,0,0-8,8v91.82L41.19,169.73a8,8,0,0,0-2.87,11A104,104,0,1,0,128,24Zm0,192a88.47,88.47,0,0,1-71.49-36.68l75.52-44a8,8,0,0,0,4-6.92V40.36A88,88,0,0,1,128,216Z\"/>"
    },
    {
    "id": "sql",
    "nombre": "SQL y ETL",
    "rama": "datos",
    "txt": "Integración y transformación de datos desde SAP y fuentes operativas, con calidad del dato.",
    "svg": "<path d=\"M216,80c0,26.51-39.4,48-88,48S40,106.51,40,80s39.4-48,88-48S216,53.49,216,80Z\" opacity=\"0.2\"/><path d=\"M128,24C74.17,24,32,48.6,32,80v96c0,31.4,42.17,56,96,56s96-24.6,96-56V80C224,48.6,181.83,24,128,24Zm80,104c0,9.62-7.88,19.43-21.61,26.92C170.93,163.35,150.19,168,128,168s-42.93-4.65-58.39-13.08C55.88,147.43,48,137.62,48,128V111.36c17.06,15,46.23,24.64,80,24.64s62.94-9.68,80-24.64ZM69.61,53.08C85.07,44.65,105.81,40,128,40s42.93,4.65,58.39,13.08C200.12,60.57,208,70.38,208,80s-7.88,19.43-21.61,26.92C170.93,115.35,150.19,120,128,120s-42.93-4.65-58.39-13.08C55.88,99.43,48,89.62,48,80S55.88,60.57,69.61,53.08ZM186.39,202.92C170.93,211.35,150.19,216,128,216s-42.93-4.65-58.39-13.08C55.88,195.43,48,185.62,48,176V159.36c17.06,15,46.23,24.64,80,24.64s62.94-9.68,80-24.64V176C208,185.62,200.12,195.43,186.39,202.92Z\"/>"
    },
    {
    "id": "modelos",
    "nombre": "Modelos de datos",
    "rama": "datos",
    "txt": "Modelos relacionales y dimensionales para indicadores financieros, comerciales y operativos.",
    "svg": "<path d=\"M152,128a24,24,0,1,1-24-24A24,24,0,0,1,152,128Z\" opacity=\"0.2\"/><path d=\"M200,152a31.84,31.84,0,0,0-19.53,6.68l-23.11-18A31.65,31.65,0,0,0,160,128c0-.74,0-1.48-.08-2.21l13.23-4.41A32,32,0,1,0,168,104c0,.74,0,1.48.08,2.21l-13.23,4.41A32,32,0,0,0,128,96a32.59,32.59,0,0,0-5.27.44L115.89,81A32,32,0,1,0,96,88a32.59,32.59,0,0,0,5.27-.44l6.84,15.4a31.92,31.92,0,0,0-8.57,39.64L73.83,165.44a32.06,32.06,0,1,0,10.63,12l25.71-22.84a31.91,31.91,0,0,0,37.36-1.24l23.11,18A31.65,31.65,0,0,0,168,184a32,32,0,1,0,32-32Zm0-64a16,16,0,1,1-16,16A16,16,0,0,1,200,88ZM80,56A16,16,0,1,1,96,72,16,16,0,0,1,80,56ZM56,208a16,16,0,1,1,16-16A16,16,0,0,1,56,208Zm56-80a16,16,0,1,1,16,16A16,16,0,0,1,112,128Zm88,72a16,16,0,1,1,16-16A16,16,0,0,1,200,200Z\"/>"
    },
    {
    "id": "excel",
    "nombre": "Excel avanzado",
    "rama": "datos",
    "txt": "Modelos con fórmulas, validación de datos, formularios estandarizados y análisis de tendencias.",
    "svg": "<path d=\"M88,104v96H32V104Z\" opacity=\"0.2\"/><path d=\"M224,48H32a8,8,0,0,0-8,8V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A8,8,0,0,0,224,48ZM40,112H80v32H40Zm56,0H216v32H96ZM216,64V96H40V64ZM40,160H80v32H40Zm176,32H96V160H216v32Z\"/>"
    },
    {
    "id": "godot",
    "nombre": "Godot Engine",
    "rama": "juegos",
    "txt": "Motor principal del estudio: Dungeon Ascent, Proyecto Origen y VILU.",
    "svg": "<path d=\"M216.86,207.57a28,28,0,0,1-24.66-7.77L150.09,152H172a51.94,51.94,0,0,0,51.2-61h0l16.36,84.17A28,28,0,0,1,216.86,207.57Z\" opacity=\"0.2\"/><path d=\"M176,112H152a8,8,0,0,1,0-16h24a8,8,0,0,1,0,16ZM104,96H96V88a8,8,0,0,0-16,0v8H72a8,8,0,0,0,0,16h8v8a8,8,0,0,0,16,0v-8h8a8,8,0,0,0,0-16ZM241.48,200.65a36,36,0,0,1-54.94,4.81c-.12-.12-.24-.24-.35-.37L146.48,160h-37L69.81,205.09l-.35.37A36.08,36.08,0,0,1,44,216,36,36,0,0,1,8.56,173.75a.68.68,0,0,1,0-.14L24.93,89.52A59.88,59.88,0,0,1,83.89,40H172a60.08,60.08,0,0,1,59,49.25c0,.06,0,.12,0,.18l16.37,84.17a.68.68,0,0,1,0,.14A35.74,35.74,0,0,1,241.48,200.65ZM172,144a44,44,0,0,0,0-88H83.89A43.9,43.9,0,0,0,40.68,92.37l0,.13L24.3,176.59A20,20,0,0,0,58,194.3l41.92-47.59a8,8,0,0,1,6-2.71Zm59.7,32.59-8.74-45A60,60,0,0,1,172,160h-4.2L198,194.31a20.09,20.09,0,0,0,17.46,5.39,20,20,0,0,0,16.23-23.11Z\"/>"
    },
    {
    "id": "python",
    "nombre": "Python",
    "rama": "software",
    "txt": "Automatización, procesamiento y análisis de datos.",
    "svg": "<path d=\"M208,88H152V32Z\" opacity=\"0.2\"/><path d=\"M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40v72a8,8,0,0,0,16,0V40h88V88a8,8,0,0,0,8,8h48V216H168a8,8,0,0,0,0,16h32a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM64,144H48a8,8,0,0,0-8,8v56a8,8,0,0,0,16,0v-8h8a28,28,0,0,0,0-56Zm0,40H56V160h8a12,12,0,0,1,0,24Zm90.78-27.76-18.78,30V208a8,8,0,0,1-16,0V186.29l-18.78-30a8,8,0,1,1,13.56-8.48L128,168.91l13.22-21.15a8,8,0,1,1,13.56,8.48Z\"/>"
    },
    {
    "id": "js",
    "nombre": "JavaScript",
    "rama": "software",
    "txt": "Aplicaciones Electron, Web Audio y redes LAN con UDP y TCP. También esta página.",
    "svg": "<path d=\"M208,88H152V32Z\" opacity=\"0.2\"/><path d=\"M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40v72a8,8,0,0,0,16,0V40h88V88a8,8,0,0,0,8,8h48V216H176a8,8,0,0,0,0,16h24a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160Zm-12.19,145a20.82,20.82,0,0,1-9.19,15.23C133.43,215,127,216,121.13,216A61.14,61.14,0,0,1,106,214a8,8,0,1,1,4.3-15.41c4.38,1.2,15,2.7,19.55-.36.88-.59,1.83-1.52,2.14-3.93.35-2.67-.71-4.1-12.78-7.59-9.35-2.7-25-7.23-23-23.11a20.56,20.56,0,0,1,9-14.95c11.84-8,30.71-3.31,32.83-2.76a8,8,0,0,1-4.07,15.48c-4.49-1.17-15.23-2.56-19.83.56a4.54,4.54,0,0,0-2,3.67c-.12.9-.14,1.09,1.11,1.9,2.31,1.49,6.45,2.68,10.45,3.84C133.49,174.17,150.05,179,147.81,196.31ZM80,152v38a26,26,0,0,1-52,0,8,8,0,0,1,16,0,10,10,0,0,0,20,0V152a8,8,0,0,1,16,0Z\"/>"
    },
    {
    "id": "ia",
    "nombre": "IA generativa",
    "rama": "ia",
    "txt": "Herramientas de IA aplicadas a desarrollo, análisis y documentación.",
    "svg": "<path d=\"M194.82,151.43l-55.09,20.3-20.3,55.09a7.92,7.92,0,0,1-14.86,0l-20.3-55.09-55.09-20.3a7.92,7.92,0,0,1,0-14.86l55.09-20.3,20.3-55.09a7.92,7.92,0,0,1,14.86,0l20.3,55.09,55.09,20.3A7.92,7.92,0,0,1,194.82,151.43Z\" opacity=\"0.2\"/><path d=\"M197.58,129.06,146,110l-19-51.62a15.92,15.92,0,0,0-29.88,0L78,110l-51.62,19a15.92,15.92,0,0,0,0,29.88L78,178l19,51.62a15.92,15.92,0,0,0,29.88,0L146,178l51.62-19a15.92,15.92,0,0,0,0-29.88ZM137,164.22a8,8,0,0,0-4.74,4.74L112,223.85,91.78,169A8,8,0,0,0,87,164.22L32.15,144,87,123.78A8,8,0,0,0,91.78,119L112,64.15,132.22,119a8,8,0,0,0,4.74,4.74L191.85,144ZM144,40a8,8,0,0,1,8-8h16V16a8,8,0,0,1,16,0V32h16a8,8,0,0,1,0,16H184V64a8,8,0,0,1-16,0V48H152A8,8,0,0,1,144,40ZM248,88a8,8,0,0,1-8,8h-8v8a8,8,0,0,1-16,0V96h-8a8,8,0,0,1,0-16h8V72a8,8,0,0,1,16,0v8h8A8,8,0,0,1,248,88Z\"/>"
    },
    {
    "id": "proyectos",
    "nombre": "Gestión de proyectos",
    "rama": "gestion",
    "txt": "Planificación de hitos y entregables, control de avance y conducción de equipos técnicos.",
    "svg": "<path d=\"M216,56v64H160V56ZM40,208a8,8,0,0,0,8,8H88a8,8,0,0,0,8-8V120H40Z\" opacity=\"0.2\"/><path d=\"M216,48H40a8,8,0,0,0-8,8V208a16,16,0,0,0,16,16H88a16,16,0,0,0,16-16V160h48v16a16,16,0,0,0,16,16h40a16,16,0,0,0,16-16V56A8,8,0,0,0,216,48Zm-8,64H168V64h40ZM88,64v48H48V64Zm0,144H48V128H88Zm16-64V64h48v80Zm64,32V128h40v48Z\"/>"
    },
    {
    "id": "redes",
    "nombre": "Redes",
    "rama": "infra",
    "txt": "Fibra óptica, redes coaxiales y certificación de redes internas bajo la Ley de Ductos.",
    "svg": "<path d=\"M152,40V72a8,8,0,0,1-8,8H112a8,8,0,0,1-8-8V40a8,8,0,0,1,8-8h32A8,8,0,0,1,152,40ZM80,168H48a8,8,0,0,0-8,8v32a8,8,0,0,0,8,8H80a8,8,0,0,0,8-8V176A8,8,0,0,0,80,168Zm128,0H176a8,8,0,0,0-8,8v32a8,8,0,0,0,8,8h32a8,8,0,0,0,8-8V176A8,8,0,0,0,208,168Z\" opacity=\"0.2\"/><path d=\"M232,112H136V88h8a16,16,0,0,0,16-16V40a16,16,0,0,0-16-16H112A16,16,0,0,0,96,40V72a16,16,0,0,0,16,16h8v24H24a8,8,0,0,0,0,16H56v32H48a16,16,0,0,0-16,16v32a16,16,0,0,0,16,16H80a16,16,0,0,0,16-16V176a16,16,0,0,0-16-16H72V128H184v32h-8a16,16,0,0,0-16,16v32a16,16,0,0,0,16,16h32a16,16,0,0,0,16-16V176a16,16,0,0,0-16-16h-8V128h32a8,8,0,0,0,0-16ZM112,40h32V72H112ZM80,208H48V176H80Zm128,0H176V176h32Z\"/>"
    },
    {
    "id": "equipos",
    "nombre": "Liderazgo de equipos",
    "rama": "liderazgo",
    "txt": "Tres años liderando el área de Tecnologías de la Información.",
    "svg": "<path d=\"M168,144a40,40,0,1,1-40-40A40,40,0,0,1,168,144ZM64,56A32,32,0,1,0,96,88,32,32,0,0,0,64,56Zm128,0a32,32,0,1,0,32,32A32,32,0,0,0,192,56Z\" opacity=\"0.2\"/><path d=\"M244.8,150.4a8,8,0,0,1-11.2-1.6A51.6,51.6,0,0,0,192,128a8,8,0,0,1,0-16,24,24,0,1,0-23.24-30,8,8,0,1,1-15.5-4A40,40,0,1,1,219,117.51a67.94,67.94,0,0,1,27.43,21.68A8,8,0,0,1,244.8,150.4ZM190.92,212a8,8,0,1,1-13.85,8,57,57,0,0,0-98.15,0,8,8,0,1,1-13.84-8,72.06,72.06,0,0,1,33.74-29.92,48,48,0,1,1,58.36,0A72.06,72.06,0,0,1,190.92,212ZM128,176a32,32,0,1,0-32-32A32,32,0,0,0,128,176ZM72,120a8,8,0,0,0-8-8A24,24,0,1,1,87.24,82a8,8,0,1,0,15.5-4A40,40,0,1,0,37,117.51,67.94,67.94,0,0,0,9.6,139.19a8,8,0,1,0,12.8,9.61A51.6,51.6,0,0,1,64,128,8,8,0,0,0,72,120Z\"/>"
    }
    ];
  const barajar = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const beep = n => window.KR && KR.beep(n);

  function montar(el, op = {}) {
    const mazo = barajar([...CARTAS, ...CARTAS]);
    el.innerHTML = `
      <div class="mem-marcador"><span>Movimientos <b data-mov>0</b></span><span>Pares <b data-pares>0</b>/${CARTAS.length}</span></div>
      <div class="mem-grilla">${mazo.map((c, i) => `<button type="button" class="mem-carta" data-i="${i}" aria-label="Carta ${i + 1}, boca abajo">
        <span class="mem-cara mem-dorso"><img src="assets/img/logo-estrella.png" alt=""></span>
        <span class="mem-cara mem-frente" data-rama="${c.rama}"><svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">${c.svg}</svg><b>${c.nombre}</b><small>${RAMAS[c.rama]}</small></span>
      </button>`).join('')}</div>
      <div class="mem-info" aria-live="polite"><p>Da vuelta dos cartas por turno y encuentra los ${CARTAS.length} pares de habilidades.</p></div>`;
    const info = el.querySelector('.mem-info'), nMov = el.querySelector('[data-mov]'), nPares = el.querySelector('[data-pares]');
    let abiertas = [], bloqueo = false, mov = 0, pares = 0;
    el.querySelectorAll('.mem-carta').forEach(b => b.addEventListener('click', () => {
      if (bloqueo || b.classList.contains('abierta') || b.classList.contains('hecha')) return;
      const carta = mazo[+b.dataset.i];
      b.classList.add('abierta'); b.setAttribute('aria-label', carta.nombre); abiertas.push(b); beep([[523, .03]]);
      if (abiertas.length < 2) return;
      mov++; nMov.textContent = mov;
      const [a, c] = abiertas, ca = mazo[+a.dataset.i], cc = mazo[+c.dataset.i];
      if (ca.id === cc.id) {
        a.classList.add('hecha'); c.classList.add('hecha'); abiertas = []; pares++; nPares.textContent = pares;
        beep([[659, .06], [880, .1]]);
        info.innerHTML = `<p class="mem-par"><b>${ca.nombre}.</b> ${ca.txt}</p>`;
        op.alPar && op.alPar(ca);
        if (pares === CARTAS.length) {
          info.innerHTML = `<p class="mem-par"><b>Memorize completado en ${mov} movimientos.</b></p>`;
          op.alCompletar && op.alCompletar(mov, info);
        }
      } else {
        bloqueo = true; beep([[220, .06]]);
        setTimeout(() => {
          for (const x of [a, c]) { x.classList.remove('abierta'); x.setAttribute('aria-label', 'Carta boca abajo'); }
          abiertas = []; bloqueo = false;
        }, 850);
      }
    }));
  }

  window.KRMemoria = { CARTAS, montar };

  // salón de la página clásica
  const salon = document.getElementById('memoria-salon');
  if (salon) {
    const jugar = () => montar(salon, {
      alCompletar: (mov, info) => {
        window.KR && (KR.desbloquear('memoria') || KR.sumarXP(30, 'Otro memorize completado'));
        info.insertAdjacentHTML('beforeend', '<div class="fila-botones centro"><button type="button" class="btn btn-linea" data-otra>Barajar de nuevo</button></div>');
        info.querySelector('[data-otra]').onclick = jugar;
      }
    });
    jugar();
  }
})();

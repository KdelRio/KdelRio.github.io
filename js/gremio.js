/* ==========================================================================
   Gremio: árbol de habilidades desbloqueables + atributos de la hoja de personaje
   ========================================================================== */
(function () {
  'use strict';
  const RAMAS = [
    { ico: '📊', nombre: 'Datos y BI', nodos: [
      ['Power BI', 5, 'Modelos estrella, medidas DAX, Power Query y tableros para gerencia y jefaturas de área: finanzas, comercial, personas, inventario, producción y calidad.'],
      ['Tableau', 4, 'Réplica 1:1 de los dashboards de Power BI con parámetros como filtros globales, campos calculados, doble eje y mapas.'],
      ['SAP BusinessObjects', 4, 'Explotación de datos corporativos desde SAP para informes de gestión. Certificación SAP BusinessObjects Essentials.'],
      ['SQL y ETL', 4, 'Integración y transformación de datos desde SAP y fuentes operativas, normalización y calidad del dato.'],
      ['Modelamiento de datos', 5, 'Diseño de modelos relacionales y dimensionales que soportan indicadores financieros, comerciales y operativos.'],
      ['Excel avanzado', 5, 'Modelos con fórmulas, validación de datos, formularios estandarizados y análisis de tendencias.'],
    ] },
    { ico: '🎮', nombre: 'Videojuegos', nodos: [
      ['Godot Engine 4', 5, 'Motor principal del estudio: Dungeon Ascent, Proyecto Origen y VILU. Escenas, señales y autoloads.'],
      ['GDScript', 5, 'Sistemas de combate, inventario, crafteo, progresión, guardado y generación procedural de salas.'],
      ['Arquitectura orientada a datos', 5, 'Contenido definido en bases de datos declarativas para agregar pisos, enemigos u objetos sin tocar la lógica.'],
      ['IA de enemigos', 4, 'Máquinas de estado y NavigationAgent2D con perfiles perseguidor, tirador y embestidor.'],
      ['Audio interactivo', 3, 'Análisis de BPM, energía y espectro con Web Audio API y generación de charts rítmicos (Proyecto Resonancia).'],
      ['Pipeline 3D', 3, 'Integración Clip Studio Paint → Blender → Godot con shaders toon, agua, niebla y viento (VILU).'],
    ] },
    { ico: '💻', nombre: 'Software', nodos: [
      ['Arquitectura de software', 5, 'Definición de estructura, estándares y pipeline de producción como Lead Programmer.'],
      ['Python', 4, 'Automatización, procesamiento y análisis de datos.'],
      ['JavaScript y Node.js', 4, 'Aplicaciones Electron, Web Audio y redes LAN con UDP y TCP.'],
      ['Calidad de software', 4, 'Estándares, revisión y control de versiones con Git y Git LFS.'],
    ] },
    { ico: '🤖', nombre: 'IA y automatización', nodos: [
      ['IA generativa', 4, 'Uso profesional de herramientas de IA aplicadas a desarrollo, análisis y documentación.'],
      ['n8n', 3, 'Automatización de flujos de trabajo e integración de servicios.'],
      ['Model Context Protocol', 3, 'Integración de herramientas mediante MCP y procedimientos estandarizados para agentes.'],
    ] },
    { ico: '📋', nombre: 'Gestión', nodos: [
      ['Gestión de proyectos', 5, 'Planificación de hitos y entregables, control de avance y conducción de equipos técnicos.'],
      ['Requerimientos', 4, 'Levantamiento y planificación de requerimientos informáticos con áreas de negocio.'],
      ['Mejora de procesos', 5, 'Rediseño del flujo de información y de la captura de datos para auditorías.'],
      ['Fondos públicos', 4, 'Formulación de proyectos para fondos de la industria creativa (Semilla Gamedev).'],
      ['Administración de empresas', 4, 'Gestión societaria, planificación financiera y cumplimiento tributario.'],
    ] },
    { ico: '🌐', nombre: 'Infraestructura', nodos: [
      ['Servidores y web', 4, 'Administración y mantenimiento avanzado de servidores y plataformas web.'],
      ['Redes', 4, 'Fibra óptica y redes coaxiales, certificación de redes internas bajo la Ley de Ductos 20.808.'],
      ['Soporte POS', 3, 'Mantención de hardware y software de puntos de venta para retail.'],
    ] },
    { ico: '🧭', nombre: 'Liderazgo', nodos: [
      ['Conducción de equipos', 5, 'Tres años liderando el área de Tecnologías de la Información.'],
      ['Comunicación con negocio', 5, 'Traducir resultados del análisis en recomendaciones accionables para la dirección.'],
      ['Gestión de crisis', 4, 'Continuidad operativa de sistemas críticos en planta.'],
      ['Negociación', 4, 'Relación con proveedores, socios y organismos de financiamiento.'],
    ] },
  ];
  const ATRIBUTOS = [['Análisis de datos', 95], ['Business Intelligence', 95], ['Programación', 85], ['Liderazgo', 85], ['Gestión', 85], ['Creatividad', 80]];

  const arbol = document.getElementById('arbol'), detalle = document.getElementById('habilidad-detalle'), prog = document.getElementById('gremio-progreso');
  const total = RAMAS.reduce((a, r) => a + r.nodos.length, 0);
  const est = () => { const e = window.KR ? KR.estado().extra : {}; e.habilidades = e.habilidades || []; return e.habilidades; };

  function pintarProgreso() {
    const n = est().length; prog.textContent = `${n}/${total} desbloqueadas`;
    if (n === total) window.KR && KR.desbloquear('gremio');
  }
  RAMAS.forEach(r => {
    const rama = document.createElement('div'); rama.className = 'rama panel';
    const h = document.createElement('h3'); h.innerHTML = `<span>${r.ico}</span>`; h.append(r.nombre);
    const nodos = document.createElement('div'); nodos.className = 'nodos';
    r.nodos.forEach(([nombre, nivel, texto]) => {
      const b = document.createElement('button'); b.className = 'nodo';
      const clave = r.nombre + '·' + nombre;
      if (est().includes(clave)) b.classList.add('abierto');
      b.append(nombre);
      const es = document.createElement('span'); es.className = 'estrellas'; es.textContent = '★'.repeat(nivel) + '☆'.repeat(5 - nivel); b.appendChild(es);
      b.addEventListener('click', () => {
        document.querySelectorAll('.nodo.seleccionado').forEach(x => x.classList.remove('seleccionado'));
        b.classList.add('seleccionado');
        if (!b.classList.contains('abierto')) {
          b.classList.add('abierto'); est().push(clave); KR.guardar();
          KR.sumarXP(10); KR.beep([[523, .06], [784, .1]]); pintarProgreso();
        }
        detalle.innerHTML = '';
        const t = document.createElement('h4'); t.textContent = `${r.ico} ${nombre}`;
        const n = document.createElement('p'); n.className = 'estrellas-detalle'; n.textContent = `Nivel ${nivel} de 5 · ${'★'.repeat(nivel)}${'☆'.repeat(5 - nivel)}`;
        const p = document.createElement('p'); p.textContent = texto;
        detalle.append(t, n, p);
      });
      nodos.appendChild(b);
    });
    rama.append(h, nodos); arbol.appendChild(rama);
  });
  pintarProgreso();

  // atributos de la hoja de personaje, animados al entrar en pantalla
  const ul = document.getElementById('atributos');
  ATRIBUTOS.forEach(([n, v]) => {
    const li = document.createElement('li'); li.textContent = n;
    const b = document.createElement('div'); b.className = 'barra-attr'; const i = document.createElement('i'); i.dataset.v = v; b.appendChild(i); li.appendChild(b); ul.appendChild(li);
  });
  new IntersectionObserver((en, obs) => {
    if (en[0].isIntersecting) { ul.querySelectorAll('i').forEach(i => i.style.width = i.dataset.v + '%'); obs.disconnect(); }
  }, { threshold: .3 }).observe(ul);
})();

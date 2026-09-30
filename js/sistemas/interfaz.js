(function (J) {
  'use strict';

  // ---------------------------------------------------------------
  // Interfaz: menu principal cinematografico, pausa y transiciones.
  //
  // El menu no construye un mundo aparte: reutiliza la escena que el
  // juego ya tiene cargada y filma el coche parado con los faros
  // encendidos. Solo se anade una camara y un punado de polvo.
  // ---------------------------------------------------------------

  const ESTADOS = { CARGA: 'carga', MENU: 'menu', JUEGO: 'juego', PAUSA: 'pausa' };

  function crearTexturaPolvo() {
    const tam = 32;
    const c = document.createElement('canvas');
    c.width = tam;
    c.height = tam;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(tam / 2, tam / 2, 0, tam / 2, tam / 2, tam / 2);
    g.addColorStop(0, 'rgba(255,250,238,0.9)');
    g.addColorStop(0.35, 'rgba(255,246,226,0.28)');
    g.addColorStop(1, 'rgba(255,244,220,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, tam, tam);
    const t = new THREE.CanvasTexture(c);
    t.needsUpdate = true;
    return t;
  }

  J.crearInterfaz = function crearInterfaz(opciones) {
    const cfg = opciones || {};
    const escena = cfg.escena;
    const vehiculo = cfg.vehiculo;
    const camaraJuego = cfg.camara;
    const audio = cfg.audio;
    const dom = {
      inicio: document.getElementById('menu'),
      carga: document.getElementById('carga'),
      titulo: document.getElementById('titulo'),
      lema: document.getElementById('lema'),
      acciones: document.getElementById('menu-acciones'),
      panel: document.getElementById('panel-controles'),
      pausa: document.getElementById('pausa'),
      pausaAcciones: document.getElementById('pausa-acciones'),
      velo: document.getElementById('velo'),
      salida: document.getElementById('salida'),
      hud: document.getElementById('hud'),
    };

    let estado = ESTADOS.CARGA;
    let tiempo = 0;
    let tiempoMenu = 0;
    let panelAbierto = false;
    let pendienteInicio = false;
    let menuActivo = false;

    // ------------------------------------------- camara cinematografica
    const camara = new THREE.PerspectiveCamera(38, 1, 0.08, 620);
    const foco = new THREE.Vector3();
    const desplazamiento = new THREE.Vector3();

    // polvo: un solo objeto de puntos, se queda quieto en el mundo
    const POLVO = 340;
    const posiciones = new Float32Array(POLVO * 3);
    const fases = new Float32Array(POLVO);
    const alto = new Float32Array(POLVO);
    const origenPolvo = new THREE.Vector3();
    let polvo = null;

    function crearPolvo() {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));
      const mat = new THREE.PointsMaterial({
        map: crearTexturaPolvo(),
        size: 0.034,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        color: 0xfff2dc,
        fog: true,
      });
      const puntos = new THREE.Points(geo, mat);
      puntos.frustumCulled = false;
      puntos.renderOrder = 6;
      escena.add(puntos);
      return puntos;
    }

    function sembrarPolvo() {
      if (!vehiculo) return;
      origenPolvo.copy(vehiculo.posicion);
      origenPolvo.y += 1.1;
      for (let i = 0; i < POLVO; i += 1) {
        posiciones[i * 3] = origenPolvo.x + (Math.random() - 0.5) * 22;
        posiciones[i * 3 + 1] = origenPolvo.y + (Math.random() - 0.5) * 4.2;
        posiciones[i * 3 + 2] = origenPolvo.z + (Math.random() - 0.5) * 22;
        fases[i] = Math.random() * Math.PI * 2;
        alto[i] = 0.06 + Math.random() * 0.16;
      }
      if (polvo) polvo.geometry.attributes.position.needsUpdate = true;
    }

    function actualizarPolvo(dt) {
      if (!polvo) return;
      for (let i = 0; i < POLVO; i += 1) {
        const j = i * 3;
        fases[i] += dt * 0.32;
        posiciones[j] += Math.sin(fases[i] * 0.7) * dt * 0.12;
        posiciones[j + 1] += alto[i] * dt;
        posiciones[j + 2] += Math.cos(fases[i] * 0.53) * dt * 0.1;
        // deriva muy lenta hacia el coche, como si el aire tirase del polvo
        posiciones[j] += (origenPolvo.x - posiciones[j]) * dt * 0.012;
        posiciones[j + 2] += (origenPolvo.z - posiciones[j + 2]) * dt * 0.012;
        if (posiciones[j + 1] > origenPolvo.y + 2.4) posiciones[j + 1] = origenPolvo.y - 2.2;
      }
      polvo.geometry.attributes.position.needsUpdate = true;
    }

    // ------------------------------------------- encuadre del menu
    // Giro muy lento alrededor del coche, a baja altura, con la
    // carretera perdiéndose hacia la oscuridad.
    function colocarCamara(dt) {
      if (!vehiculo) return;
      tiempoMenu += dt;
      const t = tiempoMenu;
      const d = vehiculo.direccion;
      const sen = Math.sin(d);
      const cos = Math.cos(d);

      // radio y altura con respiracion muy lenta
      const radio = 5.9 + Math.sin(t * 0.11) * 0.45;
      const altura = 1.34 + Math.sin(t * 0.083 + 1.2) * 0.14;
      const deriva = Math.sin(t * 0.052) * 0.34;

      // desplazamiento lateral local -> mundo
      const lx = deriva;
      const lz = radio;
      camara.position.set(
        vehiculo.posicion.x + cos * lx + sen * lz,
        vehiculo.posicion.y + altura,
        vehiculo.posicion.z - sen * lx + cos * lz
      );

      // El punto de mira se queda a la izquierda del coche: asi el
      // automaton cae en el tercio derecho y no choca con el texto, y el
      // haz de los faros barre el centro del cuadro.
      desplazamiento.set(-1.75, 0.72, -4.6);
      foco.set(
        vehiculo.posicion.x + sen * desplazamiento.z + cos * desplazamiento.x,
        vehiculo.posicion.y + desplazamiento.y,
        vehiculo.posicion.z + cos * desplazamiento.z - sen * desplazamiento.x
      );
      camara.lookAt(foco);
      // un pelo de inclinacion, como una toma rodada a mano
      camara.rotation.z += Math.sin(t * 0.047) * 0.012;
    }

    function redimensionar() {
      const aspecto = window.innerWidth / Math.max(1, window.innerHeight);
      camara.aspect = aspecto;
      camara.updateProjectionMatrix();
    }
    window.addEventListener('resize', redimensionar);
    redimensionar();

    // ------------------------------------------- audio de interfaz
    function tic() {
      if (audio && audio.activo) audio.obturacion();
    }

    function ambienteMenu(dt) {
      if (!audio || !audio.activo) return;
      audio.ambiente(dt, { viento: 0.16, hojas: 0.05, ramas: 0.045, interior: false });
    }

    // ------------------------------------------- navegacion
    function marcarActivo(boton) {
      const lista = boton.parentNode.querySelectorAll('button');
      for (const b of lista) b.classList.toggle('activo', b === boton);
      if (audio && audio.activo && boton.classList.contains('activo')) audio.interferencia();
    }

    function arrancarEnlace() {
      panelAbierto = false;
      dom.panel.classList.remove('visible');
    }

    function abrirPanel() {
      panelAbierto = true;
      dom.panel.classList.add('visible');
    }

    function salir() {
      if (audio && audio.activo) audio.golpeLejano(0.4);
      estado = ESTADOS.CARGA;
      menuActivo = false;
      if (dom.inicio) dom.inicio.classList.add('oculto');
      if (dom.pausa) dom.pausa.classList.add('oculto');
      dom.velo.classList.remove('fundido');
      dom.velo.classList.add('negro');
      dom.salida.classList.remove('oculto');
    }

    function volverAlMenu() {
      estado = ESTADOS.MENU;
      menuActivo = true;
      if (audio && audio.activo) audio.portazo();
      dom.pausa.classList.add('oculto');
      dom.inicio.classList.remove('oculto', 'saliendo');
      dom.hud.classList.add('oculto');
      dom.velo.classList.remove('negro', 'velado');
      document.body.classList.remove('jugando');
      document.body.classList.remove('pausado');
      // el coche vuelve a estar parado con los faros encendidos
      if (vehiculo && cfg.alPausar) cfg.alPausar();
    }

    function nuevaPartida() {
      if (estado !== ESTADOS.MENU || pendienteInicio) return;
      pendienteInicio = true;
      if (audio && audio.activo) audio.portazo();
      dom.inicio.classList.add('saliendo');
      // fundido a negro corto y arranque
      setTimeout(function () {
        dom.velo.classList.add('negro');
        setTimeout(function () {
          estado = ESTADOS.JUEGO;
          menuActivo = false;
          pendienteInicio = false;
          dom.inicio.classList.add('oculto');
          dom.velo.classList.remove('negro');
          if (cfg.alEntrar) cfg.alEntrar();
        }, 520);
      }, 420);
    }

    function continuar() {
      if (estado !== ESTADOS.PAUSA) return;
      dom.pausa.classList.add('oculto');
      dom.velo.classList.remove('velado');
      estado = ESTADOS.JUEGO;
      if (cfg.alContinuar) cfg.alContinuar();
    }

    // ------------------------------------------- eventos de los menus
    function conectarMenu() {
      if (!dom.acciones) return;
      dom.acciones.addEventListener('click', function (ev) {
        const b = ev.target.closest('button');
        if (!b) return;
        if (panelAbierto) return;
        marcarActivo(b);
        const accion = b.dataset.accion;
        if (accion === 'nueva') nuevaPartida();
        else if (accion === 'controles') abrirPanel();
        else if (accion === 'salir') salir();
      });
      dom.acciones.addEventListener('mousemove', function (ev) {
        const b = ev.target.closest('button');
        if (b && !panelAbierto) marcarActivo(b);
      });
    }

    function conectarPausa() {
      if (!dom.pausaAcciones) return;
      dom.pausaAcciones.addEventListener('click', function (ev) {
        const b = ev.target.closest('button');
        if (!b) return;
        if (audio && audio.activo) audio.interferencia();
        const accion = b.dataset.accion;
        if (accion === 'seguir') continuar();
        else if (accion === 'controles') abrirPanel();
        else if (accion === 'menu') volverAlMenu();
      });
    }

    function conectarPanel() {
      if (!dom.panel) return;
      dom.panel.addEventListener('click', function (ev) {
        const b = ev.target.closest('button');
        if (!b) return;
        if (audio && audio.activo) audio.interferencia();
        arrancarEnlace();
      });
    }

    conectarMenu();
    conectarPausa();
    conectarPanel();

    // ------------------------------------------- API
    return {
      ESTADOS: ESTADOS,
      camara: camara,

      get estado() { return estado; },
      get menuActivo() { return menuActivo; },
      get panelAbierto() { return panelAbierto; },

      cargando(mensaje) {
        estado = ESTADOS.CARGA;
        if (dom.carga) dom.carga.textContent = mensaje;
      },

      // el mundo ya esta listo: entra el menu cinematografico
      mostrarMenu() {
        if (!vehiculo) return;
        estado = ESTADOS.MENU;
        menuActivo = true;
        if (!polvo) {
          polvo = crearPolvo();
          sembrarPolvo();
        }
        // faros encendidos: son la unica fuente de luz de la escena
        if (vehiculo.luces === false) vehiculo.alternarLuces();
        vehiculo.estacionar();
        vehiculo.estado.ocupado = false;
        if (dom.carga) dom.carga.textContent = '';
        dom.inicio.classList.remove('oculto', 'saliendo');
        dom.hud.classList.add('oculto');
        redimensionar();
        colocarCamara(0);
        // una pasada de update en reposo enciende los focos reales
        vehiculo.actualizar(1 / 60, null, false);
      },

      pausar() {
        if (estado !== ESTADOS.JUEGO) return;
        estado = ESTADOS.PAUSA;
        dom.pausa.classList.remove('oculto');
        dom.velo.classList.add('velado');
        document.body.classList.remove('jugando');
      },

      reanudar() {
        if (estado !== ESTADOS.PAUSA) return;
        dom.pausa.classList.add('oculto');
        dom.velo.classList.remove('velado');
        estado = ESTADOS.JUEGO;
        if (cfg.alContinuar) cfg.alContinuar();
      },

      cerrarPanel() { arrancarEnlace(); },

      // bucle del menu: avanza la camara y el polvo
      actualizar(dt) {
        tiempo += dt;
        if (menuActivo) {
          // el coche se mantiene asentado y con los faros encendidos
          if (vehiculo) vehiculo.actualizar(dt, null, false);
          colocarCamara(dt);
          actualizarPolvo(dt);
          ambienteMenu(dt);
        }
      },

      esMenu() { return menuActivo; },
      enPausa() { return estado === ESTADOS.PAUSA; },
    };
  };

  J.ESTADOS_UI = ESTADOS;
})(window.J = window.J || {});
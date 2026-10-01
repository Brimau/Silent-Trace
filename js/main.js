(function (J) {
  'use strict';

  const { CONFIG } = J;

  const el = {
    lienzo: document.getElementById('lienzo'),
    hud: document.getElementById('hud'),
    hudArriba: document.getElementById('hud-arriba'),
    guardado: document.getElementById('guardado'),
    carga: document.getElementById('carga'),
    velocimetro: document.getElementById('velocimetro'),
    objetivo: document.getElementById('objetivo'),
    zona: document.getElementById('zona'),
    mira: document.getElementById('mira'),
    prompt: document.getElementById('prompt'),
    promptTexto: document.getElementById('prompt-texto'),
    velocidad: document.getElementById('velocidad'),
    consejo: document.getElementById('consejo'),
    brindis: document.getElementById('brindis'),
  };

  const AUDIO = J.crearAudio();
  const progresion = J.crearProgresion();
  const guardado = J.crearGuardado({ clave: 'silent-trace:partida' });
  const C = CONFIG.camara;

  const cuaderno = {
    objetivo: 'Investigar las señales recientes de actividad humana.',
    evidencias: [],
    reloj: 0,
    nota: 'Volver a revisar el coche antes de entrar.',
  };

  let herramientas = null;

  let motor = null;
  let escena = null;
  let camara = null;
  let entrada = null;
  let bucle = null;
  let jugador = null;
  let vehiculo = null;
  let linterna = null;
  let interaccion = null;
  let hitos = null;
  let cielo = null;
  let caminos = null;
  let carretera = null;
  let terreno = null;
  let bosque = null;
  let listo = false;
  let jugando = false;
  let conduciendo = false;
  let interfaz = null;
  let hudTemporizador = 0;
  let ultimaZona = '';
  let transicion = -1;
  let origenCamara = null;
  let temporizadorBrindis = 0;
  let temporizadorGuardado = 0;
  let parpadeo = 0;
  let temblor = 0;
  let tiempoJuego = 0;
  let ultimaFase = -10;
  let escala = 1;
  let acumFps = 0;
  let cuadrosFps = 0;
  let rngEstado = 12345;
  const consejoVistos = new Set();
  let temporizadorConsejo = 0;

  function consejo(clave, texto) {
    if (consejoVistos.has(clave)) return;
    consejoVistos.add(clave);
    el.consejo.innerHTML = texto === undefined ? '' : texto;
    el.consejo.classList.add('visible');
    temporizadorConsejo = 5.5;
  }

  const mirada = { yaw: 0, pitch: 0 };
  const sacudida = { pitch: 0, yaw: 0, roll: 0, dx: 0, dy: 0, dz: 0 };
  let tSacudida = 0;

  function azar() {
    rngEstado = (rngEstado * 1103515245 + 12345) & 0x7fffffff;
    return rngEstado / 0x7fffffff;
  }

  const hud = {
    objetivo(texto) { el.objetivo.textContent = texto || ''; },
    zona(texto) { el.zona.textContent = texto || ''; },
    prompt(texto) {
      if (!texto) {
        el.prompt.classList.add('oculto');
        el.mira.classList.remove('activo');
        return;
      }
      el.prompt.classList.remove('oculto');
      el.mira.classList.add('activo');
      el.promptTexto.textContent = texto;
    },
    brindis(texto, objetivo) {
      if (objetivo !== undefined) { hud.objetivo(texto); return; }
      el.brindis.textContent = texto;
      el.brindis.classList.add('visible');
      temporizadorBrindis = 7;
    },
    guardado() {
      el.guardado.classList.add('visible');
      temporizadorGuardado = 1.1;
    },
    velocidad(kmh) {
      el.velocimetro.classList.toggle('oculto', kmh === null);
      if (kmh !== null) el.velocidad.textContent = Math.round(Math.abs(kmh));
    },
  };

  const eventos = {
    brindis(texto) { hud.brindis(texto); },
    sonido(nombre, fuerza) {
      if (nombre === 'radio') AUDIO.interferencia();
      else if (nombre === 'campanilla') AUDIO.campanilla();
      else if (nombre === 'golpe-lejano') AUDIO.golpeLejano(fuerza);
      else if (nombre === 'susurro') AUDIO.voz();
      else if (nombre === 'viento') AUDIO.vientoGolpe();
    },
  };

  function paso(mensaje) {
    el.carga.textContent = mensaje;
    return new Promise(function (resolver) {
      setTimeout(resolver, 0);
    });
  }

  async function construir() {
    try {
      await paso('Levantando el terreno…');
      motor = J.crearMotor('media');
      camara = motor.camara;
      escena = motor.escena;

      await paso('Trazando la carretera…');
      caminos = J.crearCaminos();
      terreno = J.crearTerreno(caminos);
      escena.add(terreno.malla);
      carretera = J.crearCarretera(escena, caminos, terreno);

      await paso('Plantando el bosque…');
      bosque = J.crearBosque(escena, caminos, terreno, { hierba: motor.calidades.hierba });

      await paso('Levantando el pueblo…');
      const colisiones = J.crearColisiones(terreno);
      J.crearProps(escena, caminos, terreno, colisiones);
      J.crearEdificios(escena, caminos, terreno, colisiones);
      J.crearHospital(escena, caminos, terreno, colisiones);
      colisiones.agregarTroncos(bosque.troncos);

      await paso('Encendiendo la luna…');
      cielo = J.crearCielo(escena, motor.calidades);
      hitos = J.crearHitos(escena, caminos, terreno, eventos);

      await paso('Calentando el motor…');
      const inicio = caminos.puntoEn('carretera', 10);
      vehiculo = J.crearVehiculo(escena, terreno, colisiones, {
        x: inicio.x, z: inicio.z, dir: Math.atan2(-inicio.tx, -inicio.tz),
      });
      vehiculo.estado.ocupado = true;
      conduciendo = true;
      camara.position.set(
        vehiculo.posicion.x - CONFIG.vehiculo.desplazamientoOjos * Math.cos(vehiculo.direccion) + 0.16 * Math.sin(vehiculo.direccion),
        vehiculo.posicion.y + CONFIG.vehiculo.alturaOjos,
        vehiculo.posicion.z + CONFIG.vehiculo.desplazamientoOjos * Math.sin(vehiculo.direccion) + 0.16 * Math.cos(vehiculo.direccion)
      );
      camara.rotation.set(0, -vehiculo.direccion, 0);
      mirada.yaw = -vehiculo.direccion;
      mirada.pitch = 0;
      cab.yaw = mirada.yaw;
      cab.localYaw = 0;
      cab.localPitch = 0;
      cab.roll = 0;
      jugador = J.crearJugador(terreno, colisiones);
      linterna = J.crearLinterna(escena);
      interaccion = J.crearInteraccion(colisiones, hud);
      herramientas = J.crearHerramientas(motor.post.escenaOverlay, motor.post.camaraOverlay, cuaderno);
      herramientas.fijarDisponibles(listaEquipo());
      herramientas.setLinterna(false);

      // ---- interfaz: menu cinematografico y pausa
      interfaz = J.crearInterfaz({
        escena: escena,
        vehiculo: vehiculo,
        camara: camara,
        audio: AUDIO,
        hayGuardado: function () { return guardado.existe(); },
        resumenGuardado: function () { return guardado.resumen(); },
        alBorrarGuardado: function () { guardado.borrar(); },
        alGuardarSalida: function () { if (jugando) guardado.guardar('salida'); },
        alAbrirOpciones: sincronizarOpciones,
        alVolverAlMenu: function () {
          if (entrada) entrada.setActivo(false);
          // la escena vuelve al coche parado del menu
          interfaz.refrescarPartida();
        },
        alEntrar: entrarEnJuego,
        alContinuar: function () {
          if (entrada) entrada.setActivo(true);
          document.body.classList.add('jugando');
          document.body.classList.remove('pausado');
          el.hud.classList.remove('oculto');
          entrada.bloquear();
        },
        alPausar: function () {
          conduciendo = false;
          vehiculo.estado.ocupado = false;
          vehiculo.estacionar();
        },
      });

      entrada = J.crearEntrada(el.lienzo);
      entrada.alBloquear(function (bloqueado) {
        if (bloqueado) {
          document.body.classList.add('jugando');
          document.body.classList.remove('pausado');
          el.hud.classList.remove('oculto');
          bucle.arrancar();
        } else if (jugando && interfaz && !interfaz.enPausa()) {
          // se perdio el cursor por otra via (cambio de pestana)
          document.body.classList.remove('jugando');
          document.body.classList.add('pausado');
          el.hud.classList.add('oculto');
          interfaz.pausar();
        }
      });

      bucle = J.crearBucle(actualizar, dibujar, 1 / 60, 5);

      registrarModulosGuardado();




      listo = true;
      // el menu entra con el mundo ya construido: se ve el coche real
      interfaz.mostrarMenu();
      bucle.arrancar();
    } catch (error) {
      el.carga.textContent = 'Error al construir el mundo: ' + error.message;
      throw error;
    }
  }

function entrarEnJuego(continuando) {
      jugando = true;
      conduciendo = true;
      escala = 1;
      aplicarOpciones();
      // lo tecleado en el menu no debe disparar acciones al empezar
      if (entrada) entrada.setActivo(true);
      // Continuar parte de un guardado existente.
      const datos = continuando ? guardado.leer() : null;
      let entroEnCoche = true;
      let jugadorRestaurado = false;
      if (datos && datos.modulos) {
        guardado.aplicar(datos.modulos);
        const j = datos.modulos.jugador;
        if (j && typeof j.x === 'number') {
          jugadorRestaurado = true;
          entroEnCoche = !!j.enCoche;
        }
      }
      vehiculo.estado.ocupado = entroEnCoche;
      conduciendo = entroEnCoche;
      if (!jugadorRestaurado) {
        // Sin posicion guardada: se coloca junto al coche. Si no, el
        // jugador se queda en el origen del mundo y eso es lo que se
        // guardaria en la siguiente escritura.
        const fuera = CONFIG.vehiculo.largo * 0.5 + 1.0;
        const sen = Math.sin(vehiculo.direccion);
        const cos = Math.cos(vehiculo.direccion);
        jugador.colocar(vehiculo.posicion.x - sen * fuera, vehiculo.posicion.z + cos * fuera);
      }
      cab.yaw = -vehiculo.direccion;
      cab.localYaw = 0;
      cab.localPitch = 0;
      cab.roll = 0;
      mirada.yaw = cab.yaw;
      mirada.pitch = 0;
      linterna.apagar();
      herramientas.setLinterna(false);
      el.hud.classList.remove('oculto');
      AUDIO.iniciar();
      bucle.arrancar();
      hud.objetivo(progresion.texto);
      hud.zona(progresion.zona || 'CARRETERA DEL BOSQUE');
      if (!continuando) {
        hud.brindis('03:40. Valdehoyos, doce kilómetros. No hay nadie más en la carretera.');
        ultimaZona = 'CARRETERA DEL BOSQUE';
      } else {
        hud.brindis('Vuelvo donde lo deje.');
      }
      hudTemporizador = 7;
      el.hudArriba.classList.remove('temporal');
      entrada.bloquear();
      if (!continuando) {
        setTimeout(function () { if (jugando) AUDIO.grillos(); }, 5000);
        setTimeout(function () { if (jugando) AUDIO.buho(); }, 17000);
      }
    }

  // el lienzo solo sirve para retomar el control cuando se ha perdido el cursor
  el.lienzo.addEventListener('click', function () {
    if (jugando && !interfaz.enPausa() && entrada && !entrada.bloqueado) entrada.bloquear();
  });

  function sanearCamara() {
    if (!Number.isFinite(camara.position.x)) camara.position.x = vehiculo.posicion.x;
    if (!Number.isFinite(camara.position.y)) camara.position.y = vehiculo.posicion.y + 2;
    if (!Number.isFinite(camara.position.z)) camara.position.z = vehiculo.posicion.z;
    if (!Number.isFinite(camara.rotation.x)) camara.rotation.x = 0;
    if (!Number.isFinite(camara.rotation.y)) camara.rotation.y = -vehiculo.direccion;
    if (!Number.isFinite(camara.rotation.z)) camara.rotation.z = 0;
    if (!Number.isFinite(camara.fov)) camara.fov = C.fov;
    if (!Number.isFinite(mirada.yaw)) mirada.yaw = camara.rotation.y;
    if (!Number.isFinite(mirada.pitch)) mirada.pitch = 0;
  }

  const cabCam = { x: 0, y: 0, z: 0, roll: 0, pitch: 0 };
  let tCab = 0;
  let golpeTope = 0;
  let bacheFase = 0;
  let suspensionY = 0;
  let suspensionV = 0;

  const COTEJO = { adelante: -0.030, atras: 0.020, lateral: 0.016, cabeceo: 0.011 };

  // ---------------------------------------------------------- camara interior
  // Magnitudes separadas a proposito, porque se mezclaban antes:
  //   rumbo      direccion del coche            (vehiculo.direccion)
  //   raton      desplazamiento local del jugador (cab.localYaw/localPitch)
  //   inercia    suavizado del rumbo hacia la camara (cab.yaw)
  //   suspension cabeceo y balanceo de la carroceria (cabCam.pitch/roll)
  // El jugador mira en un intervalo alrededor del coche; el coche nunca
  // arrastra la vista mas alla de ese intervalo.
  const cab = {
    localYaw: 0,
    localPitch: 0,
    yaw: 0,
    roll: 0,
  };
  const CD = C.conduciendo;

  function envolverAngulo(a) {
    return Math.atan2(Math.sin(a), Math.cos(a));
  }

  function mirarConduciendo(m) {
    // localYaw es el desplazamiento en radianes de yaw de camara, misma
    // convencion que a pie: raton a la derecha (movementX > 0) lo resta
    cab.localYaw = Math.max(-CD.yawMax, Math.min(CD.yawMax, cab.localYaw - m.x));
    cab.localPitch = Math.max(CD.pitchMin, Math.min(CD.pitchMax, cab.localPitch - m.y));
  }

  // Situa la camara dentro del habitaculo. Devuelve el roll ya suavizado.
  function camaraInterior(dt, info) {
    const objetivo = -vehiculo.direccion + cab.localYaw;
    const diferencia = envolverAngulo(objetivo - cab.yaw);
    cab.yaw += diferencia * Math.min(1, dt * CD.seguimiento);
    mirada.yaw = cab.yaw;

    const destinoPitch = cab.localPitch - (info.acelLong || 0) * 0.004;
    mirada.pitch += (destinoPitch - mirada.pitch) * Math.min(1, dt * CD.seguimiento);

    const giro = Math.max(-1, Math.min(1, (info.giro || 0) / 0.4));
    const carga = Math.min(1, Math.abs(info.velocidad) / 5);
    const lateral = Math.max(-1, Math.min(1, (info.lateral || 0) / 2.4));
    const objetivoRoll = -giro * carga * CD.rollPorGiro - lateral * 0.008;
    cab.roll += (objetivoRoll - cab.roll) * Math.min(1, dt * CD.rollSuavizado);
    return cab.roll;
  }

  function camaraCoche(dt, info, sen, cos, sueloY, alturaOjos, baseX, baseZ) {
    tCab += dt;
    tSacudida += dt;

    const v = info.velocidad;
    const absoluto = Math.abs(v);
    const rpm = info.rpm;

    const ralentido = 0.0022 * (1 - rpm);
    const vibracion = (Math.sin(tCab * 41) * 0.6 + Math.sin(tCab * 67.3) * 0.4) * ralentido;
    const vibracionMotor = Math.sin(tCab * 23 + rpm * 30) * 0.0012 * (0.35 + rpm);

    bacheFase += dt * (5.5 + absoluto * 0.9);
    const bache = Math.sin(bacheFase) * Math.min(0.016, absoluto * 0.0009);

    golpeTope = Math.max(0, golpeTope - dt * 3.2);
    if (info.golpeo) { golpeTope = 1; info.golpeo = 0; }

    const acel = info.acelLong || 0;
    const suavisado = (objetivo, actual, taux) => actual + (objetivo - actual) * Math.min(1, dt * taux);

    const acelHaciaDelante = Math.max(-1, Math.min(1, acel / 6));
    const cabeceoObjetivo = -acelHaciaDelante * COTEJO.cabeceo;
    const suspensionObjetivo = -acelHaciaDelante * COTEJO.adelante + (v < -0.15 ? COTEJO.atras : 0);
    const lateralSuave = Math.max(-1, Math.min(1, (info.lateral || 0) / 2.4));
    const lateralObjetivo = -lateralSuave * COTEJO.lateral;
    const giroSuave = Math.max(-1, Math.min(1, (info.giro || 0) / 0.4));
    const balanceoObjetivo = -giroSuave * Math.min(1, absoluto / 6) * 0.018 - lateralSuave * 0.006;
    const cabeceoVibra = (Math.sin(tSacudida * 9.3) * 0.6 + Math.sin(tSacudida * 15.7) * 0.4)
      * Math.min(0.006, absoluto * 0.00035);

    suspensionV += (suspensionObjetivo - suspensionY) * 70 * dt;
    suspensionV *= Math.max(0, 1 - dt * 9);
    suspensionY += suspensionV * dt;

    cabCam.pitch = suavisado(cabeceoObjetivo + cabeceoVibra + golpeTope * (azar() - 0.5) * 0.02, cabCam.pitch, 7);
    cabCam.roll = suavisado(balanceoObjetivo * CD.balanceoBucle, cabCam.roll, 6);

    const localX = cos * suspensionY + sen * lateralObjetivo * 0.5;
    const localZ = -sen * suspensionY + cos * lateralObjetivo * 0.5;
    cabCam.x = baseX + localX;
    cabCam.z = baseZ + localZ;
    cabCam.y = sueloY + alturaOjos + vibracion + vibracionMotor + bache
      + suspensionY * 0.35 - golpeTope * 0.045;
    return cabCam;
  }

  function limiteMirada(conduciendoAhora) {
    return conduciendoAhora
      ? { min: C.conduciendo.pitchMin, max: C.conduciendo.pitchMax }
      : { min: C.pitchMin, max: C.pitchMax };
  }

  function alternarConduccion() {
    if (vehiculo.estado.ocupado) {
      if (Math.abs(vehiculo.estado.velocidad) > 0.55) {
        hud.brindis('Debo detener el vehículo primero.');
        AUDIO.golpeLejano(0.2);
        return false;
      }
      vehiculo.estacionar();
      vehiculo.estado.ocupado = false;
      conduciendo = false;
      // bajar del coche en un punto cualquiera es un buen momento
      if (guardado) guardado.guardarPronto('bajada');
      const sen = Math.sin(vehiculo.direccion);
      const cos = Math.cos(vehiculo.direccion);
      const fuera = CONFIG.vehiculo.largo * 0.5 + 1.0;
      jugador.colocar(vehiculo.posicion.x - sen * fuera, vehiculo.posicion.z + cos * fuera);
      linterna.apagar();
      herramientas.setLinterna(false);
      // a pie las herramientas vuelven solas; si no hay que pulsar R
      herramientas.obtener();
      consejo('pie', '<b>W A S D</b> para moverte · <b>Ratón</b> para mirar');
      setTimeout(function () {
        if (jugando && !conduciendo) consejo('correr', '<b>Mayús</b> para correr');
      }, 6000);
    } else {
      vehiculo.estado.ocupado = true;
      conduciendo = true;
      linterna.apagar();
      herramientas.guardar();
      // arrancar mirando al frente del coche, sin desvios heredados
      cab.localYaw = 0;
      cab.localPitch = 0;
      cab.yaw = -vehiculo.direccion;
      cab.roll = 0;
      mirada.yaw = cab.yaw;
      mirada.pitch = 0;
    }
    origenCamara = { x: camara.position.x, y: camara.position.y, z: camara.position.z };
    transicion = 0;
    return true;
  }

  function anotarEvidencia(etiqueta) {
    if (cuaderno.evidencias.indexOf(etiqueta) >= 0) return;
    let texto = etiqueta;
    if (etiqueta.indexOf('coche') >= 0) texto = 'Vehículo abandonado en la carretera';
    else if (etiqueta.indexOf('cartel') >= 0) texto = 'Cartel de Valdehoyos';
    else if (etiqueta.indexOf('poste') >= 0) texto = 'Poste de teléfono, cable cortado';
    else if (etiqueta.indexOf('círculo') >= 0) texto = 'Círculo de piedras en el bosque';
    else if (etiqueta.indexOf('valla') >= 0) texto = 'Vallas de la Guardia Civil';
    else if (etiqueta.indexOf('puerta') >= 0) texto = 'Hospital: entrada encadenada';
    else if (etiqueta.indexOf('edificio') >= 0) texto = 'Edificio con la puerta cerrada';
    else return;
    cuaderno.evidencias.push(texto);
    // pista nueva: momento seguro de guardado
    if (guardado) guardado.guardar('pista');
  }

  function cercaDelCoche() {
    const dx = jugador.posicion.x - vehiculo.posicion.x;
    const dz = jugador.posicion.z - vehiculo.posicion.z;
    return dx * dx + dz * dz < 36;
  }

  const equipo = { linterna: true, camara: false, libreta: false };

  function listaEquipo() {
    return ['manos', 'linterna', 'camara', 'libreta'].filter(function (k) { return equipo[k]; });
  }

  function recoger(objeto) {
    if (!objeto.equipo || equipo[objeto.equipo]) return false;
    equipo[objeto.equipo] = true;
    herramientas.fijarDisponibles(listaEquipo());
    if (objeto.equipo === 'camara') vehiculo.recogerCamara();
    if (objeto.nodo) objeto.nodo.visible = false;
    hud.brindis(objeto.texto);
    if (objeto.equipo === 'camara') {
      consejo('camara', 'Cámara equipada. <b>R</b> para levantarla, <b>G</b> para fotografiar.');
    } else if (objeto.equipo === 'libreta') {
      consejo('libreta', 'Libreta en el bolsillo. <b>R</b> para revisarla.');
    }
    // hallazgo importante: punto seguro de guardado
    if (guardado) guardado.guardar('objeto');
    return true;
  }

  // ------------------------------------------------------ opciones
  // Tres ajustes que el juego ya tiene: nada de botones falsos.
  const CLAVE_OPCIONES = 'silent-trace:opciones';
  const opciones = { volumen: 0.8, sensibilidad: 1, calidad: 1 };

  function cargarOpciones() {
    try {
      const crudo = localStorage.getItem(CLAVE_OPCIONES);
      if (!crudo) return;
      const d = JSON.parse(crudo);
      if (typeof d.volumen === 'number') opciones.volumen = Math.max(0, Math.min(1, d.volumen));
      if (typeof d.sensibilidad === 'number') opciones.sensibilidad = Math.max(0.2, Math.min(3, d.sensibilidad));
      if (typeof d.calidad === 'number') opciones.calidad = Math.max(0.4, Math.min(1, d.calidad));
    } catch (e) {
      // sin opciones guardadas: los valores por defecto ya estan puestos
    }
  }

  function aplicarOpciones() {
    AUDIO.volumenGeneral(opciones.volumen);
    if (entrada) entrada.sensibilidad = CONFIG.camara.sensibilidad * opciones.sensibilidad;
    if (motor) {
      // Un pixelRatio de 0 deja el lienzo sin tamaño y la pantalla en
      // negro. El minimo se aplica aqui, no solo al cargar.
      const ratio = CONFIG.calidades.media.pixelRatio * opciones.calidad;
      motor.pixelRatio = Math.max(0.4, Math.min(2, ratio));
    }
  }

  function sincronizarOpciones() {
    const v = document.getElementById('opt-volumen');
    const s = document.getElementById('opt-sensibilidad');
    const c = document.getElementById('opt-calidad');
    if (!v || !s || !c) return;
    v.value = String(Math.round(opciones.volumen * 100));
    s.value = String(Math.round(opciones.sensibilidad * 100));
    c.value = String(Math.round(opciones.calidad * 100));
    if (v.dataset.listo) return;
    v.dataset.listo = '1';
    s.dataset.listo = '1';
    c.dataset.listo = '1';
    function guardar() {
      opciones.volumen = Number(v.value) / 100;
      opciones.sensibilidad = Number(s.value) / 100;
      opciones.calidad = Number(c.value) / 100;
      // topes en el sitio: un 0 en calidad dejaria la pantalla en negro
      opciones.volumen = Math.max(0, Math.min(1, opciones.volumen));
      opciones.sensibilidad = Math.max(0.2, Math.min(3, opciones.sensibilidad));
      opciones.calidad = Math.max(0.4, Math.min(1, opciones.calidad));
      v.value = String(Math.round(opciones.volumen * 100));
      s.value = String(Math.round(opciones.sensibilidad * 100));
      c.value = String(Math.round(opciones.calidad * 100));
      // al tocar la calidad se olvida la degradacion automatica anterior
      escala = 1;
      aplicarOpciones();
      try { localStorage.setItem(CLAVE_OPCIONES, JSON.stringify(opciones)); } catch (e) { /* sin espacio */ }
    }
    for (const el2 of [v, s, c]) el2.addEventListener('input', guardar);
  }

  cargarOpciones();

  // ------------------------------------------------------ autoguardado
  // Cada sistema aporta su trozo. Añadir capitulos, puertas, capitulos
  // narrativos o decisiones mas adelante es registrar otro modulo aqui.
  function registrarModulosGuardado() {
    guardado.registrar({
      id: 'jugador',
      guardar() {
        // Dentro del coche el jugador no tiene posicion propia: se
        // guardaria en el origen del mundo y al volver se caeria ahi.
        if (conduciendo) {
          return {
            x: vehiculo.posicion.x, y: vehiculo.posicion.y, z: vehiculo.posicion.z,
            yaw: -vehiculo.direccion, pitch: 0, enCoche: true,
          };
        }
        return {
          x: jugador.posicion.x, y: jugador.posicion.y, z: jugador.posicion.z,
          yaw: mirada.yaw, pitch: mirada.pitch, enCoche: false,
        };
      },
      restaurar(d) {
        if (typeof d.x !== 'number') return;
        jugador.colocar(d.x, d.z);
        mirada.yaw = typeof d.yaw === 'number' ? d.yaw : 0;
        mirada.pitch = typeof d.pitch === 'number' ? d.pitch : 0;
        cab.yaw = mirada.yaw;
        cab.localYaw = 0;
        cab.localPitch = 0;
        cab.roll = 0;
      },
    });

    guardado.registrar({ id: 'vehiculo', guardar: function () { return vehiculo.guardar(); }, restaurar: function (d) { vehiculo.restaurar(d); } });
    guardado.registrar({ id: 'progresion', guardar: function () { return progresion.guardar(); }, restaurar: function (d) { progresion.restaurar(d); } });
    guardado.registrar({ id: 'hitos', guardar: function () { return hitos.guardar(); }, restaurar: function (d) { hitos.restaurar(d); } });

    guardado.registrar({
      id: 'herramientas',
      guardar() {
        return { equipo: { linterna: equipo.linterna, camara: equipo.camara, libreta: equipo.libreta }, actual: herramientas.actual };
      },
      restaurar(d) {
        if (!d || !d.equipo) return;
        equipo.camara = !!d.equipo.camara;
        equipo.libreta = !!d.equipo.libreta;
        herramientas.fijarDisponibles(listaEquipo());
        if (d.actual) herramientas.seleccionar(d.actual);
      },
    });

    guardado.registrar({
      id: 'cuaderno',
      guardar() {
        return { evidencias: cuaderno.evidencias.slice(), reloj: cuaderno.reloj, nota: cuaderno.nota };
      },
      restaurar(d) {
        if (!d) return;
        if (Array.isArray(d.evidencias)) cuaderno.evidencias = d.evidencias.slice();
        if (typeof d.reloj === 'number') cuaderno.reloj = d.reloj;
        if (typeof d.nota === 'string') cuaderno.nota = d.nota;
      },
    });

    guardado.alGuardar(function () { hud.guardado(); });
  }

  function aplicarMirada() {
    const m = entrada.consumirMirada();
    if (conduciendo) {
      // dentro del habitaculo el raton mueve la vista *relativa al coche*,
      // nunca el rumbo absoluto: asi el giro no arrastra la camara
      mirarConduciendo(m);
      return;
    }
    const limites = limiteMirada(false);
    mirada.yaw -= m.x;
    mirada.pitch = Math.max(limites.min, Math.min(limites.max, mirada.pitch - m.y));
  }

  function actualizar(dt) {
    // el menu corre con su propia camara y no toca el gameplay
    if (interfaz && interfaz.esMenu()) {
      interfaz.actualizar(dt);
      cielo.actualizar(dt, interfaz.camara);
      return;
    }
    if (!jugando) return;
    if (interfaz && interfaz.enPausa()) {
      // Pausado: el mundo no avanza, pero la entrada si se consume. Si no
      // se limpiara, las teclas pulsadas durante la pausa se dispararian
      // al reanudar, y Esc no podria cerrar un panel abierto.
      if (entrada.pulso('pausa')) {
        if (interfaz.panelAbierto) interfaz.cerrarPanel();
        else { interfaz.reanudar(); if (entrada) entrada.setActivo(true); }
      }
      entrada.limpiar();
      return;
    }
    tiempoJuego += dt;
    aplicarMirada();

    if (entrada.pulso('post')) {
      const activo = motor.post.alternar();
      hud.brindis(activo ? 'Efecto cinematográfico activado.' : 'Efecto cinematográfico desactivado.');
    }
    if (entrada.pulso('faros')) {
      if (vehiculo.estado.ocupado) {
        vehiculo.alternarLuces();
      } else {
        hud.brindis('Los faros sólo se controlan desde el asiento.');
      }
    }
    if (entrada.pulso('linterna')) {
      if (vehiculo.estado.ocupado) hud.brindis('No se puede usar la linterna conduciendo.');
      else if (linterna.alternar()) {
        herramientas.seleccionar('linterna');
        herramientas.setLinterna(true);
        hud.brindis('Linterna encendida.');
        consejo('linterna-uso', 'Linterna en la mano. <b>F</b> para apagarla.');
      } else {
        herramientas.setLinterna(false);
        if (herramientas.actual === 'linterna') herramientas.seleccionar('manos');
      }
    }
    if (entrada.pulso('claxon') && vehiculo.estado.ocupado) AUDIO.golpeLejano(0.45);
    if (entrada.pulso('radio') && vehiculo.estado.ocupado) {
      const on = vehiculo.alternarRadio();
      hud.brindis(on ? 'Radio encendida. Sólo estática.' : 'Radio apagada.');
    }
    if (entrada.pulso('interactuar')) {
      if (vehiculo.estado.ocupado) {
        alternarConduccion();
      } else {
        herramientas.guardar();
        const encontrado = interaccion.consumir();
        if (encontrado) {
          if (encontrado.equipo) {
            if (!recoger(encontrado)) hud.brindis(encontrado.texto);
          } else {
            hud.brindis(encontrado.texto);
            anotarEvidencia(encontrado.etiqueta);
          }
          if (encontrado.etiqueta.indexOf('coche') >= 0 && cercaDelCoche()) {
            hud.prompt('E — subir al coche');
          }
        } else if (cercaDelCoche()) {
          alternarConduccion();
        }
      }
    }
    if (entrada.pulso('herramienta') && !vehiculo.estado.ocupado) {
      const antes = herramientas.actual;
      const nombre = herramientas.alternar();
      if (nombre && herramientas.actual !== antes) AUDIO.obturacion();
      if (herramientas.actual === 'libreta') {
        consejo('libreta', 'Libreta abierta. <b>R</b> para volver a guardarla.');
      } else if (herramientas.actual === 'camara') {
        consejo('camara-uso', 'Cámara lista. <b>G</b> para disparar.');
      } else if (herramientas.actual === 'linterna') {
        consejo('linterna-uso', 'Linterna en la mano. <b>F</b> para apagarla.');
      }
    }
    if (entrada.pulso('foto') && !vehiculo.estado.ocupado) {
      if (herramientas.puedeDisparar()) {
        herramientas.disparar();
        motor.post.destello = 0.85;
        AUDIO.obturacion();
        hud.brindis('Ha hecho una fotografía.');
        setTimeout(function () { AUDIO.golpeLejano(0.18); }, 90);
      } else if (!herramientas.visible) {
        herramientas.obtener();
      }
    }
    if (entrada.pulso('libreta') && !vehiculo.estado.ocupado) {
      if (herramientas.visible && herramientas.actual === 'libreta') herramientas.guardar();
      else herramientas.seleccionar('libreta');
    }

    const info = vehiculo.actualizar(dt, entrada, conduciendo);
    const enCoche = conduciendo;

    if (enCoche) {
      const cerca = caminos.consultar(vehiculo.posicion.x, vehiculo.posicion.z);
      const s = cerca.camino === caminos.porId.carretera ? cerca.s : 0;
      const objetivo = progresion.objetivoActual();
      if (s >= objetivo.s && progresion.avanzar()) {
        hud.objetivo(progresion.texto);
        if (guardado) guardado.guardar('objetivo');
      }
      const zona = s > 1392 ? 'VALDEHOYOS' : (s > 1150 ? 'CARRETERA DE VALDEHOYOS' : 'CARRETERA DEL BOSQUE');
      hud.zona(zona);
      // cambio de zona: un guardado, no uno por frame
      if (zona !== ultimaZona) {
        ultimaZona = zona;
        if (guardado) guardado.guardarPronto('zona');
      }
      hitos.actualizar(vehiculo.posicion);
    } else {
      hitos.actualizar(jugador.posicion);
    }

    let pasos = null;
    if (!enCoche) {
      pasos = jugador.actualizar(dt, entrada, camara);
    }

    const sen = Math.sin(vehiculo.direccion);
    const cos = Math.cos(vehiculo.direccion);
    const fuera = CONFIG.vehiculo.largo * 0.5 + 0.95;
    const desplazamientoX = enCoche
      ? -CONFIG.vehiculo.desplazamientoOjos * cos - 0.16 * sen
      : 0;
    const desplazamientoZ = enCoche
      ? CONFIG.vehiculo.desplazamientoOjos * sen - 0.16 * cos
      : 0;
    const objetivoX = enCoche ? vehiculo.posicion.x + desplazamientoX : jugador.posicion.x;
    const objetivoZ = enCoche ? vehiculo.posicion.z + desplazamientoZ : jugador.posicion.z;
    const sueloY = enCoche ? vehiculo.posicion.y : jugador.posicion.y;
    const alturaOjos = enCoche ? CONFIG.vehiculo.alturaOjos : jugador.alturaOjos;

    const limitesVista = limiteMirada(enCoche);
    let cabeceoAplied = 0;
    let balanceoAplicado = 0;

    if (transicion >= 0) {
      transicion += dt;
      const t = Math.min(1, transicion / (enCoche ? 0.85 : 0.7));
      const s2 = t * t * (3 - 2 * t);
      const ey = sueloY + alturaOjos;
      camara.position.set(
        origenCamara.x + (objetivoX - origenCamara.x) * s2,
        origenCamara.y + (ey - origenCamara.y) * s2 + Math.sin(t * Math.PI) * (enCoche ? -0.16 : 0),
        origenCamara.z + (objetivoZ - origenCamara.z) * s2
      );
      if (t >= 1) { transicion = -1; origenCamara = null; }
    } else if (enCoche) {
      const pos = camaraCoche(dt, info, sen, cos, sueloY, alturaOjos, objetivoX, objetivoZ);
      camara.position.set(pos.x, pos.y, pos.z);
      balanceoAplicado = camaraInterior(dt, info);
      cabeceoAplied = pos.pitch;
    } else {
      const b = jugador.balanceoCabeza;
      const respiracion = Math.sin(tiempoJuego * 1.15) * 0.0035;
      camara.position.set(objetivoX + b.x, sueloY + alturaOjos + b.y + respiracion, objetivoZ);
      balanceoAplicado = b.balanceo;
      cabeceoAplied = b.cabeceo;
    }
    camara.rotation.x = Math.max(limitesVista.min - 0.05, Math.min(limitesVista.max + 0.05, mirada.pitch + cabeceoAplied));
    camara.rotation.y = mirada.yaw;
    camara.rotation.z = balanceoAplicado;
    void fuera;

    const fovObjetivo = enCoche
      ? C.fovConduciendo + Math.min(5, Math.abs(info.velocidad) * 0.22)
      : C.fov;
    if (Math.abs(camara.fov - fovObjetivo) > 0.05) {
      camara.fov += (fovObjetivo - camara.fov) * Math.min(1, dt * 3.2);
      camara.updateProjectionMatrix();
    }

    linterna.actualizar(dt, camara, enCoche ? vehiculo : null, herramientas);
    if (carretera) carretera.actualizar(camara.position, dt);

    cuaderno.reloj = tiempoJuego;
    herramientas.actualizar(dt, {
      visible: !enCoche,
      bob: enCoche ? 0 : jugador.balanceoCabeza.x * 2.4,
      lateral: enCoche ? info.lateral * 0.1 : jugador.fuerzaLateral.x * 0.03,
      avance: enCoche ? 0 : Math.hypot(jugador.velocidad.x, jugador.velocidad.z),
      tiempo: tiempoJuego,
    });

    if (enCoche) {
      hud.prompt(Math.abs(info.velocidad) > 0.55 ? 'Detén el vehículo para salir' : 'E — bajar del coche');
    } else {
      const encontrado = interaccion.actualizar(camara);
      if (encontrado) {
        const extra = encontrado.etiqueta.indexOf('coche') >= 0 && cercaDelCoche()
          ? ' · E para subir'
          : '';
        hud.prompt('E — ' + encontrado.etiqueta + extra);
      } else if (cercaDelCoche()) {
        hud.prompt('E — subir al coche');
      } else {
        hud.prompt(null);
      }
    }

    if (pasos && pasos.paso >= 0) {
      const fase = pasos.paso;
      if (Math.abs(fase - ultimaFase) > 1.5) {
        ultimaFase = fase;
        AUDIO.pasos(0.5 + pasos.intensidad * 0.7, pasos.agachado, false);
      }
    } else if (enCoche) {
      ultimaFase = -10;
    }

    hud.velocidad(enCoche ? info.velocidad * 3.6 : null);

    if (temporizadorBrindis > 0) {
      temporizadorBrindis -= dt;
      if (temporizadorBrindis <= 0) {
        el.brindis.classList.remove('visible');
        hud.objetivo(progresion.texto);
      }
    }

    if (temporizadorConsejo > 0) {
      temporizadorConsejo -= dt;
      if (temporizadorConsejo <= 0) el.consejo.classList.remove('visible');
    }

    if (temporizadorGuardado > 0) {
      temporizadorGuardado -= dt;
      if (temporizadorGuardado <= 0) el.guardado.classList.remove('visible');
    }

    if (enCoche) {
      AUDIO.motor(info.rpm, info.acelerando, true);
      vehiculo.estado.radioRuido = vehiculo.radioEncendido ? (azar() < 0.03 ? 0.85 : azar() * 0.45) : 0;
      AUDIO.radio(vehiculo.radioEncendido, vehiculo.estado.radioRuido);
    } else {
      AUDIO.motor(info.rpm, false, false);
      AUDIO.radio(false, 0);
    }

    const ciudad = camara.position.z > 330;
    const velocidadSonido = enCoche ? Math.abs(info.velocidad) / CONFIG.vehiculo.velocidadMax : 0;
    AUDIO.ambiente(dt, {
      viento: enCoche ? velocidadSonido * 0.8 : 0.12 + (jugador.velocidad.x || 0) * 0.04,
      hojas: ciudad ? 0.03 : 0.11 + velocidadSonido * 0.4,
      ramas: enCoche ? velocidadSonido : 0.1,
      interior: enCoche,
    });

    if (azar() < dt * 0.045) AUDIO.crujidoRamas({
      x: camara.position.x + (azar() - 0.5) * 14,
      y: 0,
      z: camara.position.z + (azar() - 0.5) * 14,
    });
    if (azar() < dt * 0.02) AUDIO.grillos();
    if (azar() < dt * 0.006) AUDIO.buho();
    if (azar() < dt * 0.004) AUDIO.golpeLejano(0.5);
    if (azar() < dt * 0.003) AUDIO.animalLejano();
    const dirX = -Math.sin(camara.rotation.y);
    const dirZ = -Math.cos(camara.rotation.y);
    AUDIO.oyente(camara.position.x, camara.position.y, camara.position.z, dirX, dirZ);

    const dxH = jugador.posicion.x - J.MAPA.HOSPITAL.x;
    const dzH = jugador.posicion.z - J.MAPA.HOSPITAL.z;
    const distHospital = Math.sqrt(dxH * dxH + dzH * dzH);
    parpadeo = distHospital < 110 && azar() < 0.008 ? 0.6 : 0;
    if (parpadeo > 0) temblor = 1;
    temblor = Math.max(0, temblor - dt * 1.5);

    cielo.actualizar(dt, camara);

    // el HUD se apaga solo: objetivo y zona son solo el primer rato
    if (hudTemporizador > 0) {
      hudTemporizador -= dt;
      if (hudTemporizador <= 0) el.hudArriba.classList.add('temporal');
    }

    // ejecuta los guardados que se agruparon por intervalo
    if (guardado) guardado.vaciar();
    bosque.actualizarViento(dt, enCoche ? vehiculo.posicion : jugador.posicion);

    sanearCamara();
    // Esc pausa directamente: no depende de que el navegador conceda el
    // puntero, que es justo lo que falla en algunos entornos
    if (entrada.pulso('pausa')) {
      entrada.liberar();
      if (interfaz && !interfaz.enPausa()) {
        // el bucle sigue vivo: el mundo se ve detras, congelado
        el.hud.classList.add('oculto');
        if (entrada) entrada.setActivo(false);
        document.body.classList.add('pausado');
        document.body.classList.remove('jugando');
        interfaz.pausar();
      }
    }
    entrada.limpiar();
  }

  function dibujar(delta) {
    motor.renderer.info.reset();
    motor.post.preparar(delta, temblor, parpadeo);
    // pausado: se sigue pintando el mundo congelado, sin tocar el estado
    // en el menu se usa la camara cinematografica y no hay manos que pintar
    const enMenu = interfaz && interfaz.esMenu();
    const camaraActiva = enMenu ? interfaz.camara : camara;
    if (motor.post.activo) motor.post.dibujar(camaraActiva, !enMenu);
    else motor.renderer.render(motor.escena, camaraActiva);

    if (!jugando) return;
    cuadrosFps += 1;
    acumFps += delta;
    if (acumFps > 2.5) {
      const fps = cuadrosFps / acumFps;
      const base = CONFIG.calidades.media.pixelRatio * opciones.calidad;
      if (fps < 34 && escala > 0.64) {
        escala = Math.max(0.64, escala - 0.16);
        // La calidad que eligio el usuario es la base; la escala es solo
        // la degradacion automatica.
        motor.pixelRatio = Math.max(0.6, base * escala);
      } else if (fps < 26) {
        bosque.ajustar(0.55);
      } else if (fps > 54 && escala < 1) {
        // Sin esto la resolucion se degradaba una vez y no volvia nunca:
        // el juego se quedaba borroso para siempre aunque subieras la
        // calidad a mano.
        escala = Math.min(1, escala + 0.12);
        motor.pixelRatio = Math.max(0.6, base * escala);
      }
      acumFps = 0;
      cuadrosFps = 0;
    }
  }

  window.addEventListener('error', function (e) {
    if (!listo) {
      const c = document.getElementById('carga');
      if (c) c.textContent = 'Error: ' + e.message;
    }
  });

  construir();
})(window.J = window.J || {});

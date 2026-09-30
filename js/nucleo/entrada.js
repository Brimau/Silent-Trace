(function (J) {
  'use strict';

  const { CONFIG } = J;

  const CODIGOS = {
    adelante: ['KeyW', 'ArrowUp'],
    atras: ['KeyS', 'ArrowDown'],
    izquierda: ['KeyA', 'ArrowLeft'],
    derecha: ['KeyD', 'ArrowRight'],
    correr: ['ShiftLeft', 'ShiftRight'],
    agachar: ['ControlLeft', 'ControlRight'],
    espacio: ['Space'],
    linterna: ['KeyF'],
    interactuar: ['KeyE'],
    faros: ['KeyL'],
    claxon: ['KeyC'],
    radio: ['KeyM'],
    herramienta: ['KeyR'],
    foto: ['KeyG'],
    libreta: ['Tab'],
    post: ['KeyP'],
    pausa: ['Escape'],
  };

  J.crearEntrada = function crearEntrada(elemento) {
    const teclas = new Set();
    const pulsadas = new Set();
    const soltadas = new Set();
    const oyentesBloqueo = [];

    let sensibilidad = CONFIG.camara.sensibilidad;
    let mirarX = 0;
    let mirarY = 0;
    let bloqueado = false;
    // Solo mientras se juega se secuestran Tab y Espacio. Si no, el menu
    // se queda sin navegacion por teclado.
    let activo = false;

    function alPulsar(evento) {
      const codigo = evento.code;
      if (activo && (codigo === 'Tab' || codigo === 'Space')) evento.preventDefault();
      if (!teclas.has(codigo)) pulsadas.add(codigo);
      teclas.add(codigo);
    }

    function alSoltar(evento) {
      const codigo = evento.code;
      teclas.delete(codigo);
      soltadas.add(codigo);
    }

    function alMover(evento) {
      if (!bloqueado) return;
      mirarX += evento.movementX || 0;
      mirarY += evento.movementY || 0;
    }

    function alCambioBloqueo() {
      bloqueado = document.pointerLockElement === elemento;
      if (!bloqueado) teclas.clear();
      for (const fn of oyentesBloqueo) fn(bloqueado);
    }

    window.addEventListener('keydown', alPulsar);
    window.addEventListener('keyup', alSoltar);
    window.addEventListener('blur', function () { teclas.clear(); });
    document.addEventListener('mousemove', alMover);
    document.addEventListener('pointerlockchange', alCambioBloqueo);

    return {
      get bloqueado() { return bloqueado; },
      set sensibilidad(valor) { sensibilidad = valor; },
      abajo(accion) {
        const lista = CODIGOS[accion];
        for (let i = 0; i < lista.length; i += 1) if (teclas.has(lista[i])) return true;
        return false;
      },
      pulso(accion) {
        const lista = CODIGOS[accion];
        for (let i = 0; i < lista.length; i += 1) if (pulsadas.has(lista[i])) return true;
        return false;
      },
      soltar(accion) {
        const lista = CODIGOS[accion];
        for (let i = 0; i < lista.length; i += 1) if (soltadas.has(lista[i])) return true;
        return false;
      },
      consumirMirada() {
        const x = mirarX * sensibilidad;
        const y = mirarY * sensibilidad;
        mirarX = 0;
        mirarY = 0;
        return { x, y };
      },
      limpiar() { pulsadas.clear(); soltadas.clear(); },
      // Al empezar una partida se descarta lo tecleado en el menu.
      setActivo(v) {
        activo = !!v;
        if (!activo) { pulsadas.clear(); soltadas.clear(); teclas.clear(); }
      },
      get activo() { return activo; },
      alBloquear(fn) { oyentesBloqueo.push(fn); },
      bloquear() {
        try {
          const p = elemento.requestPointerLock();
          if (p && typeof p.catch === 'function') p.catch(function () {});
        } catch (e) { /* navegador sin bloqueo de puntero */ }
      },
      liberar() {
        if (document.pointerLockElement) document.exitPointerLock();
      },
    };
  };
})(window.J = window.J || {});

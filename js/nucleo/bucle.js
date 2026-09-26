(function (J) {
  'use strict';

  J.crearBucle = function crearBucle(actualizar, dibujar, paso, maximo) {
    const dt = paso || 1 / 60;
    const limite = maximo || 5;

    let acumulado = 0;
    let anterior = performance.now();
    let corriendo = false;
    let cuadros = 0;
    let fps = 0;
    let reloj = 0;

    function trama(ahora) {
      if (!corriendo) return;
      requestAnimationFrame(trama);

      let delta = (ahora - anterior) / 1000;
      anterior = ahora;
      if (delta > 0.25) delta = 0.25;

      acumulado += delta;
      let pasos = 0;
      while (acumulado >= dt && pasos < limite) {
        actualizar(dt);
        acumulado -= dt;
        pasos += 1;
      }
      if (pasos === limite) acumulado = 0;

      dibujar(delta, ahora / 1000);

      cuadros += 1;
      reloj += delta;
      if (reloj >= 0.5) {
        fps = Math.round(cuadros / reloj);
        cuadros = 0;
        reloj = 0;
      }
    }

    return {
      get fps() { return fps; },
      arrancar() {
        if (corriendo) return;
        corriendo = true;
        anterior = performance.now();
        requestAnimationFrame(trama);
      },
      parar() { corriendo = false; },
    };
  };
})(window.J = window.J || {});

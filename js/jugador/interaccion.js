(function (J) {
  'use strict';

  const { CONFIG } = J;

  J.crearInteraccion = function crearInteraccion(colisiones, hud) {
    const origen = new THREE.Vector3();
    const direccion = new THREE.Vector3();

    let actual = null;

    function actualizar(camara) {
      camara.getWorldPosition(origen);
      direccion.set(0, 0, -1).applyQuaternion(camara.quaternion);
      const golpe = colisiones.apuntar(origen, direccion, CONFIG.interaccion.distancia);
      actual = golpe ? golpe.nodo.userData.interaccion : null;
      if (actual) {
        hud.prompt(actual.etiqueta);
      } else {
        hud.prompt(null);
      }
      return actual;
    }

    return {
      get actual() { return actual; },
      actualizar: actualizar,
      consumir() {
        if (!actual) return null;
        const t = actual;
        actual = null;
        hud.prompt(null);
        return t;
      },
    };
  };
})(window.J = window.J || {});

(function (J) {
  'use strict';

  const { CONFIG } = J;

  J.crearLinterna = function crearLinterna(escena) {
    const F = CONFIG.linterna;
    const foco = new THREE.SpotLight(0xfff4e0, 0, F.distancia, F.angulo, F.penumbra, F.decaimiento);
    foco.castShadow = true;
    foco.shadow.mapSize.set(1024, 1024);
    foco.shadow.camera.near = 0.2;
    foco.shadow.camera.far = F.distancia;
    foco.shadow.bias = -0.0018;
    foco.shadow.normalBias = 0.04;
    escena.add(foco);
    escena.add(foco.target);

    const halo = new THREE.PointLight(0xffeccc, 0, 2.4, 1.8);
    escena.add(halo);

    const estado = { encendida: false, parpadeo: 0, pila: 1, origen: new THREE.Vector3() };
    const desplazamiento = new THREE.Vector3();
    const delante = new THREE.Vector3();
    const objetivo = new THREE.Vector3();

    function actualizar(dt, camara, vehiculo) {
      const meta = estado.encendida ? 1 : 0;
      estado.parpadeo += (meta - estado.parpadeo) * Math.min(1, dt * 14);

      let factor = estado.parpadeo;
      if (estado.encendida && estado.pila < 0.32) {
        factor *= Math.random() < 0.5 ? 0.12 : 1;
      }
      if (estado.encendida && estado.pila < 0.1) factor *= 0.2;

      foco.intensity = F.intensidad * factor;
      halo.intensity = 0.55 * factor;
      foco.visible = factor > 0.01;
      halo.visible = factor > 0.01;

      if (estado.encendida) {
        estado.pila = Math.max(0, estado.pila - dt * 0.0022);
      }

      delante.set(0, 0, -1).applyQuaternion(camara.quaternion);
      if (vehiculo && vehiculo.dentro) {
        const giro = -camara.rotation.y;
        desplazamiento.set(0.26, -0.14, -0.3)
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), giro);
      } else {
        desplazamiento.set(0.2, -0.15, -0.32).applyQuaternion(camara.quaternion);
      }
      estado.origen.copy(camara.position).add(desplazamiento);

      foco.position.copy(estado.origen);
      halo.position.copy(estado.origen);
      objetivo.copy(estado.origen).addScaledVector(delante, 14);
      foco.target.position.copy(objetivo);
      foco.target.updateMatrixWorld();
    }

    return {
      estado: estado,
      get encendida() { return estado.encendida; },
      get origen() { return estado.origen; },
      alternar() {
        if (!estado.encendida && estado.pila <= 0.02) return false;
        estado.encendida = !estado.encendida;
        return estado.encendida;
      },
      apagar() { estado.encendida = false; },
      actualizar: actualizar,
    };
  };
})(window.J = window.J || {});

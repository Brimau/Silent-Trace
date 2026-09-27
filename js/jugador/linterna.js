(function (J) {
  'use strict';

  const { CONFIG } = J;
  const TEX = J.TEX;

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

    // cono falso: un volumen aditivo muy tenue donde apunta el foco. No
    // proyecta sombra ni recibe luz, solo insinua el haz en el aire HUMedo.
    const conoLargo = F.distancia * 0.42;
    const conoGeo = new THREE.CylinderGeometry(0.035, F.distancia * 0.3, conoLargo, 18, 1, true);
    conoGeo.translate(0, -conoLargo / 2, 0);
    conoGeo.rotateX(-Math.PI / 2);
    const conoMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: { fuerza: { value: 0 } },
      vertexShader: [
        'varying float vH;',
        'void main() {',
        '  vH = clamp(-position.z / ' + conoLargo.toFixed(3) + ', 0.0, 1.0);',
        '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
        '}',
      ].join('\n'),
      fragmentShader: [
        'uniform float fuerza;',
        'varying float vH;',
        'void main() {',
        '  float a = (1.0 - vH) * (1.0 - vH) * fuerza;',
        '  gl_FragColor = vec4(1.0, 0.95, 0.82, a * 0.16);',
        '}',
      ].join('\n'),
    });
    const cono = new THREE.Mesh(conoGeo, conoMat);
    cono.frustumCulled = false;
    cono.renderOrder = 3;
    escena.add(cono);

    // halo de lente: sprite suave en la boca del haz
    const haloGeo = new THREE.SpriteMaterial({
      map: TEX.haloLinterna(),
      color: 0xfff2d8,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const haloLente = new THREE.Sprite(haloGeo);
    haloLente.scale.setScalar(0.5);
    haloLente.renderOrder = 4;
    escena.add(haloLente);

    const estado = { encendida: false, parpadeo: 0, pila: 1, origen: new THREE.Vector3() };
    const desplazamiento = new THREE.Vector3();
    const delante = new THREE.Vector3();
    const objetivo = new THREE.Vector3();
    const _arriba = new THREE.Vector3();
    const _mira = new THREE.Matrix4();

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

      // el cono nace en la boca de la linterna y se orienta al foco
      cono.position.copy(estado.origen);
      _arriba.set(0, 1, 0);
      _mira.lookAt(estado.origen, objetivo, _arriba);
      cono.quaternion.setFromRotationMatrix(_mira);
      conoMat.uniforms.fuerza.value = factor;
      cono.visible = factor > 0.02;

      haloLente.position.copy(estado.origen).addScaledVector(delante, 0.1);
      haloGeo.opacity = factor * 0.75;
      haloLente.visible = factor > 0.02;
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

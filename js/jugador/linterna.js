(function (J) {
  'use strict';

  const { CONFIG } = J;
  const TEX = J.TEX;

  J.crearLinterna = function crearLinterna(escena) {
    const F = CONFIG.linterna;
    const foco = new THREE.SpotLight(0xfff4e0, 0, F.distancia, F.angulo, F.penumbra, F.decaimiento);
    foco.castShadow = true;
    foco.shadow.mapSize.set(1024, 1024);
    foco.shadow.camera.near = 0.12;
    foco.shadow.camera.far = F.distancia;
    // el haz sale casi paralelo al suelo: sin un normalBias alto el
    // terreno se auto-sombrea cerca de los pies y queda un agujero negro
    foco.shadow.bias = -0.0035;
    foco.shadow.normalBias = 0.11;
    escena.add(foco);
    escena.add(foco.target);

    // derrame corto en la boca del haz: da cuerpo a la linterna. No
    // proyecta sombra, asi que el radio se mantiene muy corto.
    const derrame = new THREE.PointLight(0xffeccc, 0, 2.2, 2.0);
    escena.add(derrame);

    // cono falso: volumen aditivo, sin sombra, insinua el haz en el aire.
    // Se estrecha hacia fuera y se desvanece con la distancia.
    const conoLargo = F.distancia * 0.5;
    const conoGeo = new THREE.CylinderGeometry(0.03, Math.tan(F.angulo) * conoLargo, conoLargo, 20, 1, true);
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
        'varying vec3 vN;',
        'varying vec3 vVista;',
        'void main() {',
        '  vH = clamp(-position.z / LARGO, 0.0, 1.0);',
        '  vec4 mundo = modelMatrix * vec4(position, 1.0);',
        '  vN = normalize(mat3(modelMatrix) * normal);',
        '  vVista = normalize(cameraPosition - mundo.xyz);',
        '  gl_Position = projectionMatrix * viewMatrix * mundo;',
        '}',
      ].join('\n').replace('LARGO', conoLargo.toFixed(3)),
      fragmentShader: [
        'uniform float fuerza;',
        'varying float vH;',
        'varying vec3 vN;',
        'varying vec3 vVista;',
        'void main() {',
        // el borde del cono se ve mas: la superficie es casi tangente a la vista
        '  float borde = 1.0 - abs(dot(normalize(vN), normalize(vVista)));',
        '  float caida = (1.0 - vH) * (1.0 - vH);',
        // los primeros metros en blanco: si no, la boca del haz se ve
        '  float arranque = smoothstep(0.0, 0.16, vH);',
        '  float a = borde * borde * caida * arranque * fuerza;',
        '  gl_FragColor = vec4(1.0, 0.94, 0.80, a * 0.075);',
        '}',
      ].join('\n'),
    });
    const cono = new THREE.Mesh(conoGeo, conoMat);
    cono.frustumCulled = false;
    cono.renderOrder = 3;
    escena.add(cono);

    // halo de lente: destello corto en la boca
    const haloGeo = new THREE.SpriteMaterial({
      map: TEX.haloLinterna(),
      color: 0xfff2d8,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const haloLente = new THREE.Sprite(haloGeo);
    haloLente.scale.setScalar(0.34);
    haloLente.renderOrder = 4;
    escena.add(haloLente);

    const estado = { encendida: false, parpadeo: 0, pila: 1, origen: new THREE.Vector3() };
    const desplazamiento = new THREE.Vector3();
    const delante = new THREE.Vector3();
    const objetivo = new THREE.Vector3();
    const puntero = new THREE.Vector3();
    const _arriba = new THREE.Vector3();
    const _mira = new THREE.Matrix4();
    const girada = new THREE.Vector3();
    const _haciaCamara = new THREE.Vector3();
    const cuaternionMira = new THREE.Quaternion();
    const ejeY = new THREE.Vector3(0, 1, 0);

    function actualizar(dt, camara, vehiculo, herramientas) {
      const meta = estado.encendida ? 1 : 0;
      estado.parpadeo += (meta - estado.parpadeo) * Math.min(1, dt * 14);

      let factor = estado.parpadeo;
      if (estado.encendida && estado.pila < 0.32) {
        factor *= Math.random() < 0.5 ? 0.12 : 1;
      }
      if (estado.encendida && estado.pila < 0.1) factor *= 0.2;

      foco.intensity = F.intensidad * factor;
      derrame.intensity = 0.7 * factor;
      foco.visible = factor > 0.01;
      derrame.visible = factor > 0.01;

      if (estado.encendida) {
        estado.pila = Math.max(0, estado.pila - dt * 0.0022);
      }

      // El haz apunta a donde mira el jugador, no a donde apunta la mano:
      // asi el raton manda y la mano solo decide de donde sale la luz.
      delante.set(0, 0, -1).applyQuaternion(camara.quaternion);
      girada.copy(camara.position).addScaledVector(delante, 0.35);
      _arriba.copy(ejeY);
      _mira.lookAt(camara.position, girada, _arriba);
      cuaternionMira.setFromRotationMatrix(_mira);

      if (vehiculo && vehiculo.dentro) {
        const giro = -camara.rotation.y;
        desplazamiento.set(0.26, -0.14, -0.3).applyAxisAngle(ejeY, giro);
        estado.origen.copy(camara.position).add(desplazamiento);
      } else if (herramientas && herramientas.punteroLinterna(puntero)) {
        // nace en la lente que el jugador ve en la mano
        camara.localToWorld(puntero);
        estado.origen.copy(puntero);
      } else {
        desplazamiento.set(0.17, -0.13, -0.26).applyQuaternion(camara.quaternion);
        estado.origen.copy(camara.position).add(desplazamiento);
      }

      foco.position.copy(estado.origen);
      derrame.position.copy(estado.origen);
      objetivo.copy(estado.origen).addScaledVector(delante, 16);
      foco.target.position.copy(objetivo);
      foco.target.updateMatrixWorld();

      cono.position.copy(estado.origen);
      cono.quaternion.copy(cuaternionMira);
      // con la camara dentro del cono la malla aditiva solo lavaria la
      // pantalla: se apaga y deja trabajar al foco real
      _haciaCamara.subVectors(camara.position, estado.origen);
      const dentro = _haciaCamara.length() < conoLargo
        && _haciaCamara.normalize().dot(delante) > Math.cos(F.angulo);
      conoMat.uniforms.fuerza.value = factor * (dentro ? 0.12 : 1);
      cono.visible = factor > 0.02 && !dentro;

      haloLente.position.copy(estado.origen).addScaledVector(delante, 0.05);
      haloGeo.opacity = factor * 0.5;
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

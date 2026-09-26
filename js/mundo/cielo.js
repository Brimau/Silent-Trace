(function (J) {
  'use strict';

  const { CONFIG } = J;
  const TEX = J.TEX;
  const { crearPRNG } = J.ruido;

  const RUIDO_GLSL = [
    'float hash21(vec2 p) {',
    '  p = fract(p * vec2(123.34, 456.21));',
    '  p += dot(p, p + 45.32);',
    '  return fract(p.x * p.y);',
    '}',
    'float valorRuido(vec2 p) {',
    '  vec2 i = floor(p);',
    '  vec2 f = fract(p);',
    '  f = f * f * (3.0 - 2.0 * f);',
    '  float a = hash21(i);',
    '  float b = hash21(i + vec2(1.0, 0.0));',
    '  float c = hash21(i + vec2(0.0, 1.0));',
    '  float d = hash21(i + vec2(1.0, 1.0));',
    '  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);',
    '}',
    'float nubes(vec2 p) {',
    '  float s = 0.0;',
    '  float a = 0.5;',
    '  for (int i = 0; i < 5; i++) {',
    '    s += valorRuido(p) * a;',
    '    p *= 2.07;',
    '    a *= 0.5;',
    '  }',
    '  return s;',
    '}',
  ].join('\n');

  const DIR_LUNA = new THREE.Vector3(-0.48, 0.42, 0.77).normalize();
  const DIR_CLAVE = new THREE.Vector3(0.42, 0.66, -0.62).normalize();
  const LADO_CAPA = 150;
  const COLUMNAS = 4;

  J.crearCielo = function crearCielo(escena, calidades) {
    const grupo = new THREE.Group();
    grupo.name = 'cielo';
    escena.add(grupo);

    const uniformsCielo = {
      uCenit: { value: new THREE.Color(0x080d14) },
      uHorizonte: { value: new THREE.Color(0x1a2532) },
      uBruma: { value: new THREE.Color(0x222e3c) },
      uTiempo: { value: 0 },
    };

    const cupula = new THREE.Mesh(
      new THREE.SphereGeometry(480, 32, 20),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: uniformsCielo,
        vertexShader: 'varying vec3 vDir;\nvoid main() {\n  vDir = position;\n  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n}',
        fragmentShader: [
          'uniform vec3 uCenit;',
          'uniform vec3 uHorizonte;',
          'uniform vec3 uBruma;',
          'uniform float uTiempo;',
          'varying vec3 vDir;',
          RUIDO_GLSL,
          'void main() {',
          '  vec3 d = normalize(vDir);',
          '  float h = clamp(d.y * 0.5 + 0.5, 0.0, 1.0);',
          '  vec3 col = mix(uHorizonte, uCenit, pow(h, 0.62));',
          '  float mascara = smoothstep(0.02, 0.42, d.y);',
          '  float n = nubes(d.xz / max(abs(d.y) + 0.16, 0.16) * 0.75 + vec2(uTiempo * 0.0035, uTiempo * 0.0021));',
          '  col = mix(col, uBruma, smoothstep(0.46, 0.86, n) * mascara * 0.75);',
          '  col += uBruma * 0.35 * pow(1.0 - mascara, 3.0);',
          '  gl_FragColor = vec4(col, 1.0);',
          '}',
        ].join('\n'),
      })
    );
    cupula.renderOrder = -10;
    grupo.add(cupula);

    const luna = new THREE.Mesh(
      new THREE.CircleGeometry(7.5, 32),
      new THREE.MeshBasicMaterial({ color: 0x9db0c8, fog: false, toneMapped: false })
    );
    luna.position.copy(DIR_LUNA).multiplyScalar(430);
    luna.lookAt(0, 0, 0);
    grupo.add(luna);

    const haloLuna = new THREE.Sprite(new THREE.SpriteMaterial({
      map: TEX.resplandor(),
      color: 0x54687f,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    }));
    haloLuna.position.copy(DIR_LUNA).multiplyScalar(418);
    haloLuna.scale.setScalar(120);
    grupo.add(haloLuna);

    const luzLuna = new THREE.DirectionalLight(CONFIG.luna.color, CONFIG.luna.intensidad);
    luzLuna.position.copy(DIR_CLAVE).multiplyScalar(120);
    escena.add(luzLuna);
    escena.add(luzLuna.target);

    const hemisf = new THREE.HemisphereLight(CONFIG.luna.hemisfCielo, CONFIG.luna.colorSuelo, CONFIG.luna.intensidadHemisf);
    escena.add(hemisf);

    let estrellas = null;
    if (calidades.arboles > 0.5) {
      estrellas = crearEstrellas();
      estrellas.renderOrder = -9;
      grupo.add(estrellas);
    }

    const bruma = crearBruma(grupo, calidades);

    return {
      grupo: grupo,
      luzLuna: luzLuna,
      hemisf: hemisf,
      actualizar(dt, camara) {
        uniformsCielo.uTiempo.value += dt;
        grupo.position.set(camara.position.x, 0, camara.position.z);
        if (estrellas) estrellas.material.uniforms.uPixelRatio.value = window.devicePixelRatio;
        bruma.actualizar(camara.position);
      },
    };
  };

  function crearEstrellas() {
    const prng = crearPRNG(CONFIG.semilla + 77);
    const N = 620;
    const posiciones = new Float32Array(N * 3);
    const tamanos = new Float32Array(N);
    for (let i = 0; i < N; i += 1) {
      const theta = prng() * Math.PI * 2;
      const phi = Math.acos(1 - (prng() * 0.94 + 0.03));
      const r = 450;
      posiciones[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      posiciones[i * 3 + 1] = r * Math.cos(phi) + 60;
      posiciones[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      tamanos[i] = 0.6 + prng() * 1.2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(tamanos, 1));
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      fog: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uPixelRatio: { value: 1 } },
      vertexShader: [
        'attribute float size;',
        'uniform float uPixelRatio;',
        'varying float vBrillo;',
        'void main() {',
        '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
        '  float altura = clamp(normalize(position).y, 0.0, 1.0);',
        '  vBrillo = smoothstep(0.0, 0.35, altura) * (0.35 + 0.65 * smoothstep(0.35, 1.0, altura));',
        '  gl_PointSize = size * uPixelRatio * 2.4;',
        '  gl_Position = projectionMatrix * mv;',
        '}',
      ].join('\n'),
      fragmentShader: [
        'varying float vBrillo;',
        'void main() {',
        '  vec2 d = gl_PointCoord - 0.5;',
        '  float a = smoothstep(0.5, 0.06, length(d));',
        '  gl_FragColor = vec4(vec3(0.70, 0.76, 0.88), a * vBrillo * 0.38);',
        '}',
      ].join('\n'),
    });
    return new THREE.Points(geo, material);
  }

  function crearBruma(padre, calidades) {
    const cantidad = calidades.hierba > 0 ? CONFIG.niebla.capas : 6;
    const textura = TEX.bruma();
    const capas = [];
    const grupo = new THREE.Group();
    grupo.renderOrder = 5;
    padre.add(grupo);

    const prng = crearPRNG(CONFIG.semilla + 313);

    for (let i = 0; i < cantidad; i += 1) {
      const mapa = textura.clone();
      mapa.wrapS = THREE.RepeatWrapping;
      mapa.wrapT = THREE.RepeatWrapping;
      mapa.repeat.set(1 + prng() * 1.4, 1 + prng() * 1.4);
      mapa.offset.set(prng(), prng());
      mapa.needsUpdate = true;

      const material = new THREE.MeshBasicMaterial({
        map: mapa,
        transparent: true,
        depthWrite: false,
        opacity: 0.055 + prng() * 0.085,
        color: 0x9fb0be,
        side: THREE.DoubleSide,
      });

      const malla = new THREE.Mesh(new THREE.PlaneGeometry(LADO_CAPA, LADO_CAPA, 1, 1), material);
      malla.rotation.x = -Math.PI / 2;
      malla.rotation.z = prng() * Math.PI;
      grupo.add(malla);
      capas.push({
        malla: malla,
        deriva: (prng() - 0.5) * 0.35,
        fase: prng() * Math.PI * 2,
        base: material.opacity,
        altura: 0.35 + ((i * 37) % 100) / 100,
      });
    }

    return {
      grupo: grupo,
      actualizar(posicionCamara) {
        const cx = Math.round(posicionCamara.x / LADO_CAPA) * LADO_CAPA;
        const cz = Math.round(posicionCamara.z / LADO_CAPA) * LADO_CAPA;
        const t = performance.now() / 1000;
        for (let i = 0; i < capas.length; i += 1) {
          const capa = capas[i];
          const ix = i % COLUMNAS;
          const iz = Math.floor(i / COLUMNAS) % COLUMNAS;
          capa.malla.position.set(
            cx + (ix - (COLUMNAS - 1) / 2) * LADO_CAPA + Math.sin(t * capa.deriva + capa.fase) * 9,
            CONFIG.niebla.alturaCapa * capa.altura + Math.sin(t * 0.11 + capa.fase) * 0.22,
            cz + (iz - (COLUMNAS - 1) / 2) * LADO_CAPA + Math.cos(t * capa.deriva + capa.fase) * 9
          );
          capa.malla.material.opacity = capa.base * (0.8 + 0.2 * Math.sin(t * 0.23 + capa.fase));
        }
      },
    };
  }
})(window.J = window.J || {});

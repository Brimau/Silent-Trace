(function (J) {
  'use strict';

  const { CONFIG } = J;

  const VERT = [
    'varying vec2 vUv;',
    'void main() {',
    '  vUv = uv;',
    '  gl_Position = vec4(position.xy, 0.0, 1.0);',
    '}',
  ].join('\n');

  const EXPOSICION = 2.15;

  const TONO = [
    'vec3 aces(vec3 x) {',
    '  const float a = 2.51;',
    '  const float b = 0.03;',
    '  const float c = 2.43;',
    '  const float d = 0.59;',
    '  const float e = 0.14;',
    '  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);',
    '}',
    'vec3 aSrgb(vec3 c) {',
    '  vec3 lo = c * 12.92;',
    '  vec3 hi = 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055;',
    '  return mix(lo, hi, step(vec3(0.0031308), c));',
    '}',
  ].join('\n');

  const BRILLO = {
    uniforms: {
      tEntrada: { value: null },
      uUmbral: { value: CONFIG.post.bloom.threshold },
      uSuave: { value: 0.4 },
    },
    vertexShader: VERT,
    fragmentShader: [
      'uniform sampler2D tEntrada;',
      'uniform float uUmbral;',
      'uniform float uSuave;',
      'varying vec2 vUv;',
      'void main() {',
      '  vec3 c = texture2D(tEntrada, vUv).rgb;',
      '  float l = max(c.r, max(c.g, c.b));',
      '  float peso = smoothstep(uUmbral, uUmbral + uSuave, l);',
      '  gl_FragColor = vec4(c * peso, 1.0);',
      '}',
    ].join('\n'),
  };

  const DESENFOQUE = {
    uniforms: {
      tEntrada: { value: null },
      uDireccion: { value: new THREE.Vector2(1, 0) },
      uPaso: { value: new THREE.Vector2(1, 0) },
    },
    vertexShader: VERT,
    fragmentShader: [
      'uniform sampler2D tEntrada;',
      'uniform vec2 uDireccion;',
      'uniform vec2 uPaso;',
      'varying vec2 vUv;',
      'void main() {',
      '  vec2 d = uDireccion * uPaso;',
      '  vec3 s = texture2D(tEntrada, vUv).rgb * 0.227027;',
      '  s += texture2D(tEntrada, vUv + d * 1.3846153846).rgb * 0.3162162162;',
      '  s += texture2D(tEntrada, vUv - d * 1.3846153846).rgb * 0.3162162162;',
      '  s += texture2D(tEntrada, vUv + d * 3.2307692308).rgb * 0.0702702703;',
      '  s += texture2D(tEntrada, vUv - d * 3.2307692308).rgb * 0.0702702703;',
      '  gl_FragColor = vec4(s, 1.0);',
      '}',
    ].join('\n'),
  };

  const FINAL = {
    uniforms: {
      tEscena: { value: null },
      tHalo: { value: null },
      uTiempo: { value: 0 },
      uGrano: { value: CONFIG.post.grano },
      uVineta: { value: CONFIG.post.vineta },
      uAberracion: { value: CONFIG.post.aberracion },
      uContraste: { value: CONFIG.post.contraste },
      uSaturacion: { value: CONFIG.post.saturacion },
      uHalo: { value: CONFIG.post.bloom.strength },
      uTemblor: { value: 0 },
      uParpadeo: { value: 0 },
      uExposicion: { value: EXPOSICION },
      uElevacion: { value: CONFIG.post.elevacion },
      uElevacionColor: { value: new THREE.Vector3().fromArray(CONFIG.post.elevacionColor) },
    },
    vertexShader: VERT,
    fragmentShader: [
      'uniform sampler2D tEscena;',
      'uniform sampler2D tHalo;',
      'uniform float uTiempo;',
      'uniform float uGrano;',
      'uniform float uVineta;',
      'uniform float uAberracion;',
      'uniform float uContraste;',
      'uniform float uSaturacion;',
      'uniform float uHalo;',
      'uniform float uTemblor;',
      'uniform float uParpadeo;',
      'uniform float uExposicion;',
      'uniform float uElevacion;',
      'uniform vec3 uElevacionColor;',
      'varying vec2 vUv;',
      TONO,
      'float ruido(vec2 p) {',
      '  p = fract(p * vec2(443.897, 441.423));',
      '  p += dot(p, p + 19.19);',
      '  return fract((p.x + p.y) * p.x);',
      '}',
      'void main() {',
      '  vec2 uv = vUv;',
      '  vec2 c = uv - 0.5;',
      '  float r2 = dot(c, c);',
      '  uv += c * r2 * uTemblor * 0.02;',
      '  float ab = uAberracion * (0.3 + r2 * 3.6);',
      '  vec2 dir = c * inversesqrt(max(r2, 1e-6));',
      '  vec3 col;',
      '  col.r = texture2D(tEscena, uv + dir * ab).r;',
      '  col.g = texture2D(tEscena, uv).g;',
      '  col.b = texture2D(tEscena, uv - dir * ab).b;',
      '  col += texture2D(tHalo, uv).rgb * uHalo;',
      '  col = aces(col * uExposicion);',
      '  col = aSrgb(col);',
      '  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));',
      '  float sombra = 1.0 - smoothstep(0.0, 0.34, l);',
      '  col = col * (1.0 - uElevacion * sombra) + uElevacionColor * (uElevacion * sombra);',
      '  col = mix(vec3(l), col, uSaturacion);',
      '  col = clamp(col, 0.0, 1.0);',
      '  col = pow(col, vec3(1.0 / uContraste));',
      '  col *= 1.0 - uVineta * smoothstep(0.10, 0.58, r2);',
      '  col *= 1.0 - uParpadeo;',
      '  float g = ruido(gl_FragCoord.xy + vec2(uTiempo * 137.0, uTiempo * 71.0)) - 0.5;',
      '  col += g * uGrano * (0.5 + (1.0 - l) * 1.3);',
      '  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);',
      '}',
    ].join('\n'),
  };

  function objetivo(w, h, conProfundidad) {
    return new THREE.WebGLRenderTarget(Math.max(2, w), Math.max(2, h), {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: conProfundidad === true,
      stencilBuffer: false,
    });
  }

  J.crearPostProceso = function crearPostProceso(renderer, escena, camara) {
    const geometria = new THREE.BufferGeometry();
    geometria.setAttribute('position', new THREE.Float32BufferAttribute([-1, 3, 0, -1, -1, 0, 3, -1, 0], 3));
    geometria.setAttribute('uv', new THREE.Float32BufferAttribute([0, 2, 0, 0, 2, 0], 2));

    const quad = new THREE.Mesh(geometria, null);
    quad.frustumCulled = false;
    const escenaQuad = new THREE.Scene();
    escenaQuad.add(quad);
    const camaraQuad = new THREE.Camera();

    const escenaOverlay = new THREE.Scene();
    const camaraOverlay = new THREE.PerspectiveCamera(52, 1, 0.01, 4);

    const matBrillo = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(BRILLO.uniforms),
      vertexShader: BRILLO.vertexShader,
      fragmentShader: BRILLO.fragmentShader,
      depthTest: false,
      depthWrite: false,
    });
    const matDesenfoque = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(DESENFOQUE.uniforms),
      vertexShader: DESENFOQUE.vertexShader,
      fragmentShader: DESENFOQUE.fragmentShader,
      depthTest: false,
      depthWrite: false,
    });
    const matFinal = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(FINAL.uniforms),
      vertexShader: FINAL.vertexShader,
      fragmentShader: FINAL.fragmentShader,
      depthTest: false,
      depthWrite: false,
    });

    let rtEscena = objetivo(2, 2, true);
    let rtHaloA = objetivo(2, 2);
    let rtHaloB = objetivo(2, 2);

    let ancho = 2;
    let alto = 2;
    let nivel = 2;
    let tiempo = 0;

    function pintar(material, destino) {
      quad.material = material;
      renderer.setRenderTarget(destino);
      renderer.clear(true, false, false);
      renderer.render(escenaQuad, camaraQuad);
    }

    function ajustar(w, h) {
      ancho = Math.max(2, Math.floor(w));
      alto = Math.max(2, Math.floor(h));
      const escala = nivel >= 2 ? 0.5 : 0.25;
      rtEscena.setSize(ancho, alto);
      rtHaloA.setSize(Math.max(2, Math.floor(ancho * escala)), Math.max(2, Math.floor(alto * escala)));
      rtHaloB.setSize(Math.max(2, Math.floor(ancho * escala)), Math.max(2, Math.floor(alto * escala)));
      matDesenfoque.uniforms.uPaso.value.set(1 / rtHaloA.width, 1 / rtHaloA.height);
    }

    return {
      activo: true,
      get nivel() { return nivel; },
      set nivel(v) { nivel = v; ajustar(ancho, alto); },
      get tiempo() { return tiempo; },

      escenaOverlay: escenaOverlay,
      camaraOverlay: camaraOverlay,
      destello: 0,

      redimensionar(anchoPx, altoPx, aspecto) {
        ajustar(anchoPx, altoPx);
        if (aspecto) camaraOverlay.aspect = aspecto;
        camaraOverlay.updateProjectionMatrix();
      },

      alternar() {
        this.activo = !this.activo;
        return this.activo;
      },

      preparar(dt, temblor, parpadeo) {
        matFinal.uniforms.uExposicion.value = EXPOSICION;
        tiempo += dt;
        matFinal.uniforms.uTiempo.value = tiempo;
        matFinal.uniforms.uTemblor.value = temblor || 0;
        matFinal.uniforms.uParpadeo.value = parpadeo || 0;
      },



      dibujar(camaraVista) {
        const vista = camaraVista || camara;
        renderer.setRenderTarget(rtEscena);
        renderer.clear();
        renderer.render(escena, vista);
        if (escenaOverlay.children.length > 0) {
          const previo = renderer.autoClear;
          renderer.autoClear = false;
          renderer.clearDepth();
          // el overlay (manos) solo se pinta en la camara del juego
          if (!camaraVista) renderer.render(escenaOverlay, camaraOverlay);
          renderer.autoClear = previo;
        }

        matFinal.uniforms.tEscena.value = rtEscena.texture;
        matFinal.uniforms.uHalo.value = nivel >= 2 ? CONFIG.post.bloom.strength : 0;

        if (nivel >= 1) {
          matBrillo.uniforms.tEntrada.value = rtEscena.texture;
          pintar(matBrillo, rtHaloA);

          matDesenfoque.uniforms.tEntrada.value = rtHaloA.texture;
          matDesenfoque.uniforms.uDireccion.value.set(1, 0);
          pintar(matDesenfoque, rtHaloB);

          matDesenfoque.uniforms.tEntrada.value = rtHaloB.texture;
          matDesenfoque.uniforms.uDireccion.value.set(0, 1);
          pintar(matDesenfoque, rtHaloA);

          matDesenfoque.uniforms.tEntrada.value = rtHaloA.texture;
          matDesenfoque.uniforms.uDireccion.value.set(1.9, 0);
          pintar(matDesenfoque, rtHaloB);

          matDesenfoque.uniforms.tEntrada.value = rtHaloB.texture;
          matDesenfoque.uniforms.uDireccion.value.set(0, 1.9);
          pintar(matDesenfoque, rtHaloA);

          matFinal.uniforms.tHalo.value = rtHaloA.texture;
        } else {
          matFinal.uniforms.tHalo.value = rtHaloA.texture;
        }

        quad.material = matFinal;
        renderer.setRenderTarget(null);
        renderer.render(escenaQuad, camaraQuad);
      },
    };
  };
})(window.J = window.J || {});

(function (J) {
  'use strict';

  const { CONFIG } = J;

  J.crearMotor = function crearMotor(calidad) {
    const calidades = CONFIG.calidades[calidad] || CONFIG.calidades.media;
    const lienzo = document.getElementById('lienzo');

    const renderer = new THREE.WebGLRenderer({
      canvas: lienzo,
      antialias: false,
      powerPreference: 'high-performance',
      stencil: false,
      alpha: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, calidades.pixelRatio));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = calidades.sombras >= 1024 ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    renderer.info.autoReset = false;

    const escena = new THREE.Scene();
    escena.background = new THREE.Color(CONFIG.niebla.color);
    escena.fog = new THREE.FogExp2(CONFIG.niebla.color, CONFIG.niebla.densidad);

    const camara = new THREE.PerspectiveCamera(
      CONFIG.camara.fov,
      window.innerWidth / window.innerHeight,
      CONFIG.camara.near,
      CONFIG.camara.far
    );
    camara.rotation.order = 'YXZ';

    const post = J.crearPostProceso(renderer, escena, camara);
    post.activo = calidades.post !== false;
    post.nivel = calidades.post === 'alto' ? 2 : 2;

    let ratioActual = Math.min(window.devicePixelRatio, calidades.pixelRatio);

    function aplicar() {
      const ancho = window.innerWidth;
      const alto = window.innerHeight;
      ratioActual = Math.min(window.devicePixelRatio, calidades.pixelRatio);
      renderer.setPixelRatio(ratioActual);
      renderer.setSize(ancho, alto, false);
      camara.aspect = ancho / alto;
      camara.updateProjectionMatrix();
      post.redimensionar(ancho * ratioActual, alto * ratioActual, ancho / alto);
    }

    window.addEventListener('resize', aplicar);
    aplicar();

    return {
      renderer: renderer,
      escena: escena,
      camara: camara,
      post: post,
      calidades: calidades,
      redimensionar: aplicar,
      get pixelRatio() { return ratioActual; },
      set pixelRatio(valor) {
        calidades.pixelRatio = valor;
        aplicar();
      },
    };
  };
})(window.J = window.J || {});

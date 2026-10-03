(function (J) {
  'use strict';

  const TEX = J.TEX;

  const HERRAMIENTAS = ['manos', 'linterna', 'camara', 'libreta'];

  const NOMBRES = {
    manos: 'manos',
    linterna: 'linterna',
    camara: 'cámara',
    libreta: 'libreta',
  };

  function caja(w, h, d, x, y, z) {
    return { geometria: new THREE.BoxGeometry(w, h, d), matriz: J.matriz(x, y, z) };
  }

  function cilindro(rt, rb, h, seg, x, y, z, rx, rz) {
    return {
      geometria: new THREE.CylinderGeometry(rt, rb, h, seg, 1),
      matriz: J.matriz(x, y, z, rx || 0, 0, rz || 0),
    };
  }

  function texturaPagina() {
    if (texturaPagina.cache) return texturaPagina.cache;
    const tam = 1024;
    const c = document.createElement('canvas');
    c.width = tam;
    c.height = tam;
    const ctx = c.getContext('2d');
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    texturaPagina.cache = { canvas: c, ctx: ctx, textura: tex };
    return texturaPagina.cache;
  }

  function campoRuido(tam, celdas, semilla, opciones) {
    const g = new Float32Array(celdas * celdas);
    const opts = opciones || { octavas: 4, semilla: semilla };
    for (let j = 0; j < celdas; j += 1) {
      for (let i = 0; i < celdas; i += 1) {
        g[j * celdas + i] = J.ruido.fbm((i / celdas) * 8, (j / celdas) * 8, opts);
      }
    }
    const salida = new Float32Array(tam * tam);
    for (let y = 0; y < tam; y += 1) {
      const fy = (y / tam) * (celdas - 1);
      const y0 = Math.floor(fy);
      const y1 = Math.min(celdas - 1, y0 + 1);
      const ty = fy - y0;
      for (let x = 0; x < tam; x += 1) {
        const fx = (x / tam) * (celdas - 1);
        const x0 = Math.floor(fx);
        const x1 = Math.min(celdas - 1, x0 + 1);
        const tx = fx - x0;
        const a = g[y0 * celdas + x0] + (g[y0 * celdas + x1] - g[y0 * celdas + x0]) * tx;
        const b = g[y1 * celdas + x0] + (g[y1 * celdas + x1] - g[y1 * celdas + x0]) * tx;
        salida[y * tam + x] = a + (b - a) * ty;
      }
    }
    return salida;
  }

  function pintarPagina(estado) {
    const p = texturaPagina();
    const ctx = p.ctx;
    const tam = 1024;

    const grad = ctx.createLinearGradient(0, 0, 0, tam);
    grad.addColorStop(0, '#d8d2c2');
    grad.addColorStop(0.5, '#cfc9b8');
    grad.addColorStop(1, '#c2bca9');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, tam, tam);

    const grano = campoRuido(tam, 96, 991, { octavas: 4, semilla: 991 });
    const manchas = campoRuido(tam, 12, 313, { octavas: 2, semilla: 313 });
    const img = ctx.getImageData(0, 0, tam, tam);
    const d = img.data;
    for (let y = 0; y < tam; y += 1) {
      for (let x = 0; x < tam; x += 1) {
        const i = (y * tam + x) * 4;
        const idx = y * tam + x;
        const n = 0.80 + grano[idx] * 0.36 + manchas[idx] * 0.1;
        const borde = 1 - Math.min(1, Math.min(x, y, tam - x, tam - y) / 90) * 0.3;
        const v = n * borde;
        d[i] *= v; d[i + 1] *= v; d[i + 2] *= v * 0.99;
      }
    }
    ctx.putImageData(img, 0, 0);

    ctx.strokeStyle = 'rgba(90,110,130,0.16)';
    ctx.lineWidth = 1;
    for (let y = 120; y < tam - 40; y += 46) {
      ctx.beginPath();
      ctx.moveTo(70, y);
      ctx.lineTo(tam - 70, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(150,60,50,0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(110, 60);
    ctx.lineTo(110, tam - 60);
    ctx.stroke();

    ctx.fillStyle = '#2a2a26';
    ctx.textAlign = 'left';
    ctx.font = '700 46px ui-monospace, Consolas, monospace';
    ctx.fillText('CUADERNO', 150, 104);
    ctx.font = '400 26px ui-monospace, Consolas, monospace';
    ctx.fillStyle = '#5a5a52';
    ctx.fillText(' Caso: Valdehoyos · 03:40', 150, 140);

    let y = 220;
    ctx.fillStyle = '#3a3a34';
    ctx.font = '700 30px ui-monospace, Consolas, monospace';
    ctx.fillText('OBJETIVO', 150, y);
    y += 44;
    ctx.fillStyle = '#25251f';
    ctx.font = '400 30px ui-monospace, Consolas, monospace';
    const palabras = ('«' + estado.objetivo + '»').split(' ');
    let linea = '';
    for (let i = 0; i < palabras.length; i += 1) {
      const prueba = linea ? linea + ' ' + palabras[i] : palabras[i];
      if (ctx.measureText(prueba).width > tam - 320 && linea) {
        ctx.fillText(linea, 150, y);
        y += 40;
        linea = palabras[i];
      } else {
        linea = prueba;
      }
    }
    if (linea) { ctx.fillText(linea, 150, y); y += 40; }
    y += 46;
    ctx.fillStyle = '#3a3a34';
    ctx.font = '700 30px ui-monospace, Consolas, monospace';
    ctx.fillText('EVIDENCIAS', 150, y);
    y += 42;

    ctx.font = '400 27px ui-monospace, Consolas, monospace';
    if (estado.evidencias.length === 0) {
      ctx.fillStyle = 'rgba(60,60,52,0.5)';
      ctx.fillText('(nada anotado todavía)', 150, y);
    } else {
      for (let i = 0; i < estado.evidencias.length; i += 1) {
        const ev = estado.evidencias[i];
        if (y > tam - 70) break;
        ctx.fillStyle = '#2c2c26';
        ctx.fillText((i + 1) + '. ' + ev, 150, y, tam - 320);
        y += 38;
      }
    }

    if (estado.nota) {
      ctx.fillStyle = '#4a4030';
      ctx.font = 'italic 400 26px ui-monospace, Consolas, monospace';
      ctx.fillText(estado.nota, 150, Math.min(tam - 90, y + 40), tam - 320);
    }

    p.textura.needsUpdate = true;
    return p.textura;
  }

  J.crearHerramientas = function crearHerramientas(escenaOverlay, camaraOverlay, estado) {
    const raiz = new THREE.Group();
    raiz.name = 'herramientas';
    escenaOverlay.add(raiz);
    raiz.visible = false;

    const luz = new THREE.PointLight(0xcdd4d0, 0, 2.6, 1.5);
    luz.position.set(0.22, 0.26, 0.42);
    raiz.add(luz);

    const M = {
      piel: new THREE.MeshStandardMaterial({ color: 0x6a5340, roughness: 0.9, emissive: 0x140f0b, emissiveIntensity: 1 }),
      manga: new THREE.MeshStandardMaterial({ color: 0x2b3338, roughness: 0.96, emissive: 0x0b0e10, emissiveIntensity: 1 }),
      metal: new THREE.MeshStandardMaterial({ color: 0x474d52, roughness: 0.55, metalness: 0.22 }),
      oscuro: new THREE.MeshStandardMaterial({ color: 0x2b3034, roughness: 0.6, metalness: 0.15 }),
      caucho: new THREE.MeshStandardMaterial({ color: 0x0e0e0f, roughness: 0.98 }),
      cristal: new THREE.MeshStandardMaterial({
        color: 0x2a3a42, roughness: 0.08, metalness: 0.2,
        transparent: true, opacity: 0.28, side: THREE.DoubleSide,
      }),
      flash: new THREE.MeshStandardMaterial({ color: 0x33302a, emissive: 0xffeccc, emissiveIntensity: 0.25, roughness: 0.35 }),
      papel: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 }),
      cartulina: new THREE.MeshStandardMaterial({ color: 0x3a2f26, roughness: 0.98 }),
    };

    // Brazos: mismo rig que usa el volante (js/sistemas/manos.js)
    const izq = J.crearBrazo(M, true);
    const der = J.crearBrazo(M, true);
    raiz.add(izq);
    raiz.add(der);

    const _ad = new THREE.Vector3();
    const _hs = new THREE.Vector3();
    const _hc = new THREE.Vector3();
    const _hm = new THREE.Vector3();
    const _dd = new THREE.Vector3();
    // direcciones de los dedos por pose
    const DEDOS = {
      relaxed: new THREE.Vector3(0, -0.56, -0.83),
      ahead: new THREE.Vector3(0, -0.13, -0.99),
      foto: new THREE.Vector3(0, -0.05, -0.999),
      libro: new THREE.Vector3(0, -0.66, -0.75),
    };

    const _cero = new THREE.Vector3();
    const _qi = new THREE.Quaternion();
    const _arriba = new THREE.Vector3(0, 1, 0);
    const _df = new THREE.Vector3();
    const _mid = new THREE.Vector3();
    const _eje = new THREE.Vector3();
    const _perp = new THREE.Vector3();

    // Coloca el codo respetando la longitud de los huesos: dados hombro y
    // muneca, el codo sale del triangulo isosceles. `abertura` es el angulo
    // del codo respecto a la horizontal (negativo = hacia abajo).
    function codoDe(hombro, muneca, lado, apertura) {
      const L = J.REGISTRO.brazo.largoHombro;
      _mid.addVectors(hombro, muneca).multiplyScalar(0.5);
      _eje.subVectors(muneca, hombro);
      const d = _eje.length() || 0.0001;
      _eje.multiplyScalar(1 / d);
      _perp.crossVectors(_eje, _arriba);
      if (_perp.lengthSq() < 1e-9) _perp.set(1, 0, 0);
      else _perp.normalize();
      const h = Math.sqrt(Math.max(0.0004, L * L - (d * d) / 4));
      return _hc.copy(_mid)
        .addScaledVector(_perp, Math.cos(apertura) * h * lado)
        .addScaledVector(_arriba, Math.sin(apertura) * h);
    }

    // Coloca un brazo respetando la longitud de los huesos: `codo` y
    // `muneca` son solo direcciones hacia donde debe ir cada articulacion.
    // `dedos` es la direccion de los dedos; si se omite, siguen el antebrazo.
    function brazoEn(br, lado, hombro, codo, muneca, dedos) {
      const R = J.REGISTRO.brazo;
      br.position.copy(hombro);
      const c = br.userData.codo;
      J.apuntarHueso(br, hombro, codo);
      c.position.set(0, -R.largoHombro, 0);
      _df.subVectors(muneca, codo);
      if (_df.lengthSq() < 1e-9) _df.set(0, -1, 0);
      else _df.normalize();
      _qi.copy(br.quaternion).invert();
      _ad.copy(_df).applyQuaternion(_qi);
      J.apuntarHueso(c, _cero, _ad);
      J.orientarMuneca(c, c.userData.mano, dedos || _df, _arriba);
    }

    const camaraFoto = new THREE.Group();
    const cuerpoCam = new THREE.Mesh(J.fusionar([
      caja(0.15, 0.105, 0.075, 0, 0, 0),
      caja(0.05, 0.03, 0.05, 0, 0.062, -0.005),
      cilindro(0.038, 0.042, 0.06, 16, 0, 0.008, -0.062, Math.PI / 2),
      caja(0.03, 0.02, 0.03, -0.05, 0.062, 0.01),
    ]), M.metal);
    camaraFoto.add(cuerpoCam);
    const lente = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.008, 20), M.oscuro);
    lente.rotation.x = Math.PI / 2;
    lente.position.set(0, 0.008, -0.093);
    camaraFoto.add(lente);
    const cristalLente = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.004, 20), M.cristal);
    cristalLente.rotation.x = Math.PI / 2;
    cristalLente.position.set(0, 0.008, -0.096);
    camaraFoto.add(cristalLente);
    const flash = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.026, 0.012), M.flash);
    flash.position.set(-0.05, 0.078, 0.02);
    camaraFoto.add(flash);
    const tubo = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.115, 14), M.oscuro);
    tubo.position.set(0, -0.012, -0.15);
    camaraFoto.add(tubo);
    // Las herramientas se enganchan a la mano: lasdns siguen al rig.
    camaraFoto.position.set(0, -0.03, -0.035);
    camaraFoto.rotation.set(0, 0, 0);
    camaraFoto.scale.setScalar(1.06);
    der.userData.mano.add(camaraFoto);

    const pagina = new THREE.Mesh(
      new THREE.PlaneGeometry(0.235, 0.29),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.96 })
    );
    pagina.visible = false;
    raiz.add(pagina);

    const libreta = new THREE.Group();
    libreta.add(pagina);
    const tapa = new THREE.Mesh(new THREE.BoxGeometry(0.245, 0.3, 0.01), M.cartulina);
    tapa.position.set(0, 0, -0.007);
    libreta.add(tapa);
    const lomo = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.3, 0.014), M.cartulina);
    lomo.position.set(-0.118, 0, -0.003);
    libreta.add(lomo);
    const hoja = new THREE.Mesh(new THREE.PlaneGeometry(0.228, 0.282), M.papel);
    hoja.rotation.y = Math.PI;
    hoja.position.set(0, 0, -0.016);
    libreta.add(hoja);
    libreta.position.set(0, -0.03, -0.05);
    libreta.rotation.set(0.1, 0, 0.06);
    libreta.visible = false;
    izq.userData.mano.add(libreta);

    const linternaMano = new THREE.Group();
    const cuerpoLinterna = new THREE.Mesh(J.fusionar([
      cilindro(0.026, 0.03, 0.15, 16, 0, 0, -0.01, Math.PI / 2),
      cilindro(0.034, 0.03, 0.05, 16, 0, 0, -0.1, Math.PI / 2),
      cilindro(0.022, 0.022, 0.022, 14, 0, 0, 0.072, Math.PI / 2),
      caja(0.012, 0.03, 0.05, 0, -0.03, 0.03),
    ]), M.metal);
    linternaMano.add(cuerpoLinterna);
    const aroLinterna = new THREE.Mesh(new THREE.TorusGeometry(0.031, 0.006, 6, 16), M.oscuro);
    aroLinterna.position.set(0, 0, -0.122);
    linternaMano.add(aroLinterna);
    const lenteLinterna = new THREE.Mesh(new THREE.CircleGeometry(0.028, 18), new THREE.MeshStandardMaterial({
      color: 0xd8d2c0, emissive: 0xfff0cc, emissiveIntensity: 0, roughness: 0.35,
    }));
    lenteLinterna.position.set(0, 0, -0.124);
    linternaMano.add(lenteLinterna);
    linternaMano.position.set(0, 0, 0);
    linternaMano.visible = false;
    // Ancla siempre presente y nunca oculta: es la que usa la luz del
    // mundo. Si la luz dependiera de que el modelo este visible, al
    // cambiar de herramienta o al interactuar la luz se soltaria de la
    // mano y se quedaria clavada delante de los ojos.
    const anclaLinterna = new THREE.Group();
    anclaLinterna.position.set(0, -0.004, -0.154);
    der.userData.mano.add(anclaLinterna);
    anclaLinterna.add(linternaMano);

    let actual = 'manos';
    let showing = true;
    let disponibles = ['manos', 'linterna'];
    let anim = 0;
    let balanceo = 0;
    let ultimaFoto = -99;
    let tiempo = 0;
    let pasoFoto = 0;
    let linternaOn = false;

    function aplicarVisibilidad() {
      const arriba = showing;
      raiz.visible = arriba;
      const conFoto = actual === 'camara';
      const conLibreta = actual === 'libreta';
      const conLinterna = actual === 'linterna';
      // los dos brazos siempre visibles: sostienen la herramienta activa
      izq.visible = arriba;
      der.visible = arriba;
      camaraFoto.visible = arriba && conFoto;
      libreta.visible = arriba && conLibreta;
      pagina.visible = arriba && conLibreta;
      linternaMano.visible = arriba && conLinterna;
      luz.intensity = arriba ? (conLibreta ? 0.9 : conFoto ? 0.56 : 0.42) : 0;
    }

    const api = {
      raiz: raiz,
      camaraOverlay: camaraOverlay,

      get actual() { return actual; },
      get nombre() { return NOMBRES[actual]; },
      get visible() { return showing && anim > 0.5; },

      alternar() {
        if (api.visible) { api.guardar(); return NOMBRES[actual]; }
        const i = HERRAMIENTAS.indexOf(actual);
        for (let k = 1; k <= HERRAMIENTAS.length; k += 1) {
          const cand = HERRAMIENTAS[(i + k) % HERRAMIENTAS.length];
          if (disponibles.indexOf(cand) >= 0) return api.seleccionar(cand);
        }
        return NOMBRES[actual];
      },

      fijarDisponibles(lista) {
        disponibles = HERRAMIENTAS.filter(function (h) { return lista.indexOf(h) >= 0; });
        if (disponibles.indexOf('manos') < 0) disponibles.unshift('manos');
        if (disponibles.indexOf(actual) < 0) api.seleccionar('manos');
      },

      seleccionar(nombre) {
        if (nombre === 'libreta') {
          pagina.material.map = pintarPagina(estado);
          pagina.material.needsUpdate = true;
        }
        if (actual === nombre && showing) return NOMBRES[actual];
        actual = nombre;
        showing = true;
        pasoFoto = 0;
        aplicarVisibilidad();
        return NOMBRES[actual];
      },

      guardar() {
        if (!showing) return false;
        showing = false;
        aplicarVisibilidad();
        return true;
      },

      obtener() {
        if (!showing) { showing = true; aplicarVisibilidad(); return true; }
        return false;
      },

      setLinterna(encendida) {
        linternaOn = encendida;
        lenteLinterna.material.emissiveIntensity = encendida ? 2.6 : 0.04;
      },

      // Posicion de la lente en el espacio de la camara de overlay, que es
      // identico al espacio de la camara principal. La linterna del mundo
      // sale de aqui para que el haz nazca en la mano y no en los ojos.
      punteroLinterna(destino) {
        if (!linternaOn) return false;
        raiz.updateMatrixWorld(true);
        destino.setFromMatrixPosition(anclaLinterna.matrixWorld);
        return true;
      },

      puedeDisparar() {
        return showing && anim > 0.7 && actual === 'camara' && tiempo - ultimaFoto > 0.85;
      },

      disparar() {
        if (!api.puedeDisparar()) return false;
        ultimaFoto = tiempo;
        pasoFoto = 1;
        M.flash.emissiveIntensity = 3.4;
        estado.evidencias.push('Fotografía tomada (' + Math.floor(estado.reloj / 60) + 'h' + estado.reloj % 60 + 'm)');
        return true;
      },

      actualizar(dt, datos) {
        tiempo += dt;
        const permitido = datos.visible !== false;
        anim += ((showing && permitido ? 1 : 0) - anim) * Math.min(1, dt * 11);

        if (!mostrando() || anim <= 0.01) {
          raiz.visible = false;
          return;
        }
        raiz.visible = true;

        const cam = camaraOverlay;
        const bob = datos.bob || 0;
        const lateral = datos.lateral || 0;
        const avance = Math.min(1, (datos.avance || 0) / 3.4);
        const respiro = Math.sin(datos.tiempo * 1.1) * 0.005;
        const t = anim;
        const sube = (1 - t) * (1 - t);
        balanceo += (lateral * 0.5 - balanceo) * Math.min(1, dt * 7);
        const marcha = Math.sin(tiempo * 7.4) * avance * 0.016;
        const marchaL = Math.sin(tiempo * 7.4 + Math.PI) * avance * 0.012;

        if (actual === 'manos') {
          for (let k = 0; k < 2; k += 1) {
            const s = k ? 1 : -1;
            const en = k ? der : izq;
            const mar = k ? marcha : marchaL;
            _hs.set(s * 0.235, -0.26 - respiro - sube * 0.06, -0.28);
            _hm.set(s * 0.255 + s * mar * 1.2, -0.27 - Math.abs(bob) * 0.24 - sube * 0.05, -0.7);
            _dd.copy(DEDOS.relaxed);
            _dd.x += s * (mar * 1.5 + bob * 0.5);
            brazoEn(en, s, _hs, codoDe(_hs, _hm, s, -1 + bob * s * 0.3), _hm, _dd);
          }
        } else if (actual === 'linterna') {
          const fovObjetivo = 52;
          if (Math.abs(cam.fov - fovObjetivo) > 0.01) {
            cam.fov += (fovObjetivo - cam.fov) * Math.min(1, dt * 8);
            cam.updateProjectionMatrix();
          }
          _hs.set(0.2 + bob * 0.35, -0.26 - respiro - sube * 0.06, -0.28);
          _hm.set(0.1 - marcha * 0.6, -0.25 - Math.abs(bob) * 0.2, -0.66);
          _dd.copy(DEDOS.ahead);
          _dd.x += bob * 0.4 - marcha * 0.5;
          _dd.y += bob * 0.3;
          brazoEn(der, 1, _hs, codoDe(_hs, _hm, 1, -0.75 + balanceo * 0.4), _hm, _dd);
          _hs.set(-0.235, -0.26 - respiro - sube * 0.06, -0.28);
          _hm.set(-0.255 - marchaL, -0.27 - Math.abs(bob) * 0.24, -0.7);
          brazoEn(izq, -1, _hs, codoDe(_hs, _hm, -1, -1), _hm, DEDOS.relaxed);
        } else if (actual === 'camara') {
          pasoFoto = Math.max(0, pasoFoto - dt * 3.4);
          const disparo = pasoFoto > 0 ? Math.sin((1 - pasoFoto) * Math.PI) : 0;
          const fovObjetivo = 52 * (1 - t * 0.3) * (1 - disparo * 0.12);
          if (Math.abs(cam.fov - fovObjetivo) > 0.01) {
            cam.fov += (fovObjetivo - cam.fov) * Math.min(1, dt * 8);
            cam.updateProjectionMatrix();
          }
          _hs.set(0.17 + bob * 0.3, -0.26 - respiro - sube * 0.05, -0.26);
          _hm.set(0.075 + marcha, -0.27 - disparo * 0.1, -0.6);
          _dd.copy(DEDOS.foto);
          _dd.x += bob * 0.3;
          brazoEn(der, 1, _hs, codoDe(_hs, _hm, 1, -0.7 + balanceo * 0.3), _hm, _dd);
          _hs.set(-0.17 - bob * 0.3, -0.26 - respiro - sube * 0.05, -0.26);
          _hm.set(-0.055 - marcha, -0.28 - disparo * 0.1, -0.61);
          _dd.copy(DEDOS.foto);
          _dd.x -= bob * 0.3;
          brazoEn(izq, -1, _hs, codoDe(_hs, _hm, -1, -0.7), _hm, _dd);
          camaraFoto.position.set(0, -0.028 - disparo * 0.1, -0.03 + disparo * 0.03);
          M.flash.emissiveIntensity = Math.max(0.25, M.flash.emissiveIntensity - dt * 9);
        } else {
          const fovObjetivo = 52 * (1 - t * 0.1);
          if (Math.abs(cam.fov - fovObjetivo) > 0.01) {
            cam.fov += (fovObjetivo - cam.fov) * Math.min(1, dt * 8);
            cam.updateProjectionMatrix();
          }
          _hs.set(-0.21 - bob * 0.3, -0.26 - respiro - sube * 0.05, -0.28);
          _hm.set(-0.11 + marcha * 0.6, -0.28 - sube * 0.1, -0.6);
          _dd.copy(DEDOS.libro);
          _dd.x += marcha * 0.4;
          brazoEn(izq, -1, _hs, codoDe(_hs, _hm, -1, -0.7), _hm, _dd);
          libreta.rotation.set(-0.16 - sube * 0.1, 0, 0.05 + balanceo * 0.2);
          _hs.set(0.235, -0.26 - respiro - sube * 0.06, -0.28);
          _hm.set(0.255 - marcha, -0.27 - Math.abs(bob) * 0.24, -0.7);
          brazoEn(der, 1, _hs, codoDe(_hs, _hm, 1, -1), _hm, DEDOS.relaxed);
        }
      },
    };

    function mostrando() { return showing; }

    aplicarVisibilidad();
    return api;
  };
})(window.J = window.J || {});

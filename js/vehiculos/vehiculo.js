(function (J) {
  'use strict';

  const { CONFIG } = J;
  const TEX = J.TEX;
  const { crearPRNG } = J.ruido;
  const { fusionar, matriz } = J;

  function caja(w, h, d, x, y, z) {
    return { geometria: new THREE.BoxGeometry(w, h, d), matriz: matriz(x, y, z) };
  }

  // El modelo viene en X=largo, Y=arriba, Z=lateral, con +X al frente.
  // El juego usa -Z al frente y el conductor en -X, asi que se rota +90 grados.
  const GIRO = Math.PI / 2;
  const aJuego = function (mx, my, mz) {
    return { x: mz, y: my, z: -mx };
  };

  J.crearVehiculo = function crearVehiculo(escena, terreno, colisiones, puntoInicial) {
    const V = CONFIG.vehiculo;
    const F = CONFIG.faros;
    const az = crearPRNG(CONFIG.semilla + 1);
    const azar = function () { return az(); };

    const raiz = new THREE.Group();
    raiz.name = 'vehiculo';
    escena.add(raiz);
    const cuerpo = new THREE.Group();
    raiz.add(cuerpo);

    const L = V.largo;
    const A = V.ancho;
    const R = V.alturaRueda;

    // ---------------------------------------------------------------- modelo
    const modelo = J.cargarCoche(J.COCHE, { ruta: 'assets/' });
    const contenedor = new THREE.Group();
    contenedor.rotation.y = GIRO;
    contenedor.add(modelo.raiz);
    cuerpo.add(contenedor);

    const M = {
      pintura: new THREE.MeshStandardMaterial({
        map: TEX.detalle(), color: 0x1b1f24, roughness: 0.22, metalness: 0.72,
      }),
      bajos: new THREE.MeshStandardMaterial({
        map: TEX.detalle(), color: 0x14161a, roughness: 0.94, metalness: 0.2,
      }),
      cristal: new THREE.MeshStandardMaterial({
        color: 0x0d1418, roughness: 0.34, metalness: 0.0,
        transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false,
      }),
      caucho: new THREE.MeshStandardMaterial({
        map: TEX.detalle(), color: 0x101113, roughness: 0.99, metalness: 0.02,
      }),
      laton: new THREE.MeshStandardMaterial({ color: 0x6b5f45, roughness: 0.62, metalness: 0.8 }),
      interior: new THREE.MeshStandardMaterial({
        map: TEX.detalle(), color: 0x2b2e31, roughness: 0.97, metalness: 0.05,
      }),
      piel: new THREE.MeshStandardMaterial({ color: 0x6d5540, roughness: 0.88, emissive: 0x1c1510, emissiveIntensity: 1 }),
      manga: new THREE.MeshStandardMaterial({ map: TEX.detalle(), color: 0x2a3236, roughness: 0.97, emissive: 0x0d1113, emissiveIntensity: 1 }),
    };

    // capa propia del habitaculo: las luces interiores no tocan la carroceria
    const CAPA_INTERIOR = 2;

    const Pintado = ['Body', 'Bumper_Front', 'Bumper_rear', 'Hood', 'Trunkdoor'];
    const Bajos = ['Bottom', 'Suspension', 'Hood_Inner', 'Bumper_Front_Inner'];
    const Cristales = ['Windshield', 'Glass_Rear', 'Glass_Body', 'Glass_Driver', 'Glass_Passanger', 'Headlights_Glass', 'Taillight_Glass'];
    const Cauchos = ['WheelStock_FL', 'WheelStock_RL', 'WheelStock_FR', 'WheelStock_RR',
      'Calipers_FL', 'Calipers_FR', 'Calipers_RL', 'Calipers_RR'];
    const Interiores = ['Interior', 'Steering_Wheel'];

    function asignar(nombre, material, capas) {
      const g = modelo.buscar(nombre);
      if (!g) return null;
      const m = g.children[0];
      m.material = material;
      m.castShadow = true;
      m.receiveShadow = true;
      if (capas) m.layers.enable(capas);
      return { grupo: g, malla: m, mat: material };
    }

    for (const n of Pintado) asignar(n, M.pintura);
    for (const n of Bajos) asignar(n, M.bajos);
    for (const n of Cristales) asignar(n, M.cristal);
    for (const n of Cauchos) asignar(n, M.caucho);
    for (const n of Interiores) asignar(n, M.interior, CAPA_INTERIOR);
    asignar('Trunkdoor_Badges', M.laton);
    asignar('Hood_Badges', M.laton);
    asignar('Numberplate_Front', M.bajos);
    asignar('Numberplate_Rear', M.bajos);

    // Luces: material propio por pieza para poder gobernarlas por separado
    const Mfaro = M.pintura.clone();
    Mfaro.color = new THREE.Color(0x9a978c);
    Mfaro.emissive = new THREE.Color(0xfff0cc);
    Mfaro.emissiveIntensity = 0;
    Mfaro.roughness = 0.16;
    const Mfreno = M.pintura.clone();
    Mfreno.color = new THREE.Color(0x3a0d0b);
    Mfreno.emissive = new THREE.Color(0xff2200);
    Mfreno.emissiveIntensity = 0;
    const Mmarcha = M.pintura.clone();
    Mmarcha.color = new THREE.Color(0xd8d4c6);
    Mmarcha.emissive = new THREE.Color(0xfff4e0);
    Mmarcha.emissiveIntensity = 0;
    const Minterm = M.pintura.clone();
    Minterm.color = new THREE.Color(0x6b3410);
    Minterm.emissive = new THREE.Color(0xff8010);
    Minterm.emissiveIntensity = 0;
    const Mpiloto = M.pintura.clone();
    Mpiloto.color = new THREE.Color(0x3a0d0b);
    Mpiloto.emissive = new THREE.Color(0xff2a10);
    Mpiloto.emissiveIntensity = 0;

    const faroMalla = asignar('Headlights', Mfaro);
    const frenoMalla = asignar('Brakelights', Mfreno);
    const marchaMalla = asignar('Murphy92_Reverse', Mmarcha);
    const intermitenteMalla = asignar('Blinkers', Minterm);
    const pilotoMalla = asignar('Taillight_Glass', Mpiloto);
    const volanteMalla = modelo.buscar('Steering_Wheel');

    // ruedas: el grupo exterior dirige, la malla interior rueda
    const ruedas = [
      { grupo: modelo.buscar('WheelStock_FL'), z: -V.wheelbase / 2, delantera: true },
      { grupo: modelo.buscar('WheelStock_RL'), z: V.wheelbase / 2, delantera: false },
      { grupo: modelo.buscar('WheelStock_FR'), z: -V.wheelbase / 2, delantera: true },
      { grupo: modelo.buscar('WheelStock_RR'), z: V.wheelbase / 2, delantera: false },
    ].map(function (r) {
      return {
        grupo: r.grupo,
        malla: r.grupo ? r.grupo.children[0] : null,
        delantera: r.delantera,
      };
    });

    // ------------------------------------------------------- luces reales
    const faroIzq = new THREE.SpotLight(0xffeccc, 0, F.distancia, F.angulo, F.penumbra, F.decaimiento);
    faroIzq.castShadow = true;
    faroIzq.shadow.mapSize.set(CONFIG.calidades.media.sombras, CONFIG.calidades.media.sombras);
    faroIzq.shadow.camera.near = 0.4;
    faroIzq.shadow.camera.far = F.distancia;
    faroIzq.shadow.bias = -0.0016;
    faroIzq.shadow.normalBias = 0.05;
    raiz.add(faroIzq);
    raiz.add(faroIzq.target);

    const faroDer = new THREE.SpotLight(0xffeccc, 0, F.distancia, F.angulo, F.penumbra, F.decaimiento);
    raiz.add(faroDer);
    raiz.add(faroDer.target);

    const faroLargo = new THREE.SpotLight(0xffeccc, 0, 34, 0.34, 0.85, 0.8);
    raiz.add(faroLargo);
    raiz.add(faroLargo.target);

    const derrame = new THREE.PointLight(0xffdfae, 0, 20, 1.5);
    raiz.add(derrame);
    // las luces de habitaculo solo tocan el interior: si no, queman el
    // parabrisas desde dentro y el bloom lo convierte en una mancha
    const relleno = new THREE.PointLight(0x5a6a78, 0, 1.35, 1.8);
    relleno.layers.set(CAPA_INTERIOR);
    raiz.add(relleno);
    const luzCabina = new THREE.PointLight(0xffd2a0, 0, 1.7, 1.8);
    luzCabina.layers.set(CAPA_INTERIOR);
    raiz.add(luzCabina);
    const luzTablero = new THREE.PointLight(0x8fe8b4, 0, 0.9, 2.2);
    luzTablero.layers.set(CAPA_INTERIOR);
    raiz.add(luzTablero);

    // ------------------------------------------------- camara en el salpicadero
    const camaraCoche = new THREE.Group();
    camaraCoche.add(new THREE.Mesh(fusionar([
      caja(0.15, 0.1, 0.07, 0, 0, 0),
      caja(0.045, 0.028, 0.045, 0, 0.058, -0.004),
      caja(0.03, 0.018, 0.026, -0.048, 0.056, 0.008),
    ]), M.manga));
    const objetivoCoche = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.05, 14),
      new THREE.MeshStandardMaterial({ color: 0x1b1e21, roughness: 0.62, metalness: 0.15 }));
    objetivoCoche.rotation.x = Math.PI / 2;
    objetivoCoche.position.set(0, 0.006, -0.056);
    camaraCoche.add(objetivoCoche);
    const posCam = aJuego(0.95, 0.92, 0.34);
    camaraCoche.position.set(posCam.x, posCam.y, posCam.z);
    camaraCoche.scale.setScalar(1.5);
    camaraCoche.rotation.set(0, -0.6, 0);
    camaraCoche.userData.interaccion = {
      etiqueta: 'recoger la cámara',
      texto: 'Una cámara de bobina olvidada en el salpicadero. El objetivo está empañado por dentro.',
      equipo: 'camara',
    };
    cuerpo.add(camaraCoche);
    colisiones.registrar(camaraCoche);

    // ------------------------------------------------ brazos al volante
    // mismo rig que las viewmodels: el codo queda en la puerta y las manos
    // siguen al volante, que ademas gira con la direccion
    const manosVolante = new THREE.Group();
    manosVolante.name = 'manosVolante';
    const brazoVolIzq = J.crearBrazo(M, true);
    const brazoVolDer = J.crearBrazo(M, true);
    manosVolante.add(brazoVolIzq);
    manosVolante.add(brazoVolDer);
    manosVolante.traverse(function (o) { o.layers.enable(CAPA_INTERIOR); });
    raiz.add(manosVolante);

    const _arriba = new THREE.Vector3(0, 1, 0);
    const _hs = new THREE.Vector3();
    const _hc = new THREE.Vector3();
    const _hm = new THREE.Vector3();
    const _dedos = new THREE.Vector3();
    const _posVolante = new THREE.Vector3();
    const _centro = new THREE.Vector3();
    const _eje = new THREE.Vector3();
    const _perp = new THREE.Vector3();
    const _mid = new THREE.Vector3();

    function codoAnclado(hombro, muneca, lado, apertura) {
      const L = 0.3;
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

    function brazoEn(br, lado, hombro, codo, muneca, dedos) {
      br.position.copy(hombro);
      const c = br.userData.codo;
      J.apuntarHueso(br, hombro, codo);
      c.position.set(0, -0.3, 0);
      J.apuntarHueso(c, new THREE.Vector3(), new THREE.Vector3().copy(muneca).sub(codo).normalize());
      J.orientarMuneca(c, c.userData.mano, dedos, _arriba);
    }

    // punto de agarre en el volante, en coordenadas del coche
    function actualizarManosVolante(dt) {
      if (!volanteMalla) { manosVolante.visible = false; return; }
      manosVolante.visible = true;
      raiz.updateMatrixWorld(true);
      _centro.setFromMatrixPosition(volanteMalla.matrixWorld);
      raiz.worldToLocal(_centro);
      const ang = -estado.giro * V.anguloVolante;
      const radio = 0.165;
      const lat = 0.135;
      // los codos quedan en la puerta, casi fijos
      const puertaY = _centro.y - 0.06;
      const puertaZ = _centro.z - 0.34;
      for (let k = 0; k < 2; k += 1) {
        const s = k ? 1 : -1;
        const br = k ? brazoVolDer : brazoVolIzq;
        // agarre: sigue el giro del volante
        _hm.set(_centro.x + s * lat, _centro.y + Math.sin(ang) * radio * s * 0.8,
          _centro.z + Math.cos(ang) * radio - 0.03);
        _hs.set(_centro.x + s * 0.26, puertaY - 0.02, puertaZ);
        _dedos.copy(_hm).sub(_hs);
        _dedos.y = 0.22;
        _dedos.normalize();
        brazoEn(br, s, _hs, codoAnclado(_hs, _hm, s, -0.85), _hm, _dedos);
      }
    }

    // ------------------------------------------------------------- estado
    const estado = {
      posicion: new THREE.Vector3(),
      direccion: 0,
      velocidad: 0,
      velocidadLateral: 0,
      giro: 0,
      rotacionRuedas: 0,
      cabeceo: 0,
      balanceo: 0,
      luces: true,
      motorEncendido: true,
      ocupado: false,
      frenoMano: false,
      radioEncendido: false,
      radioRuido: 0,
      marchaAtras: false,
    };

    function aMundoLocal(lx, lz) {
      const sen = Math.sin(estado.direccion);
      const cos = Math.cos(estado.direccion);
      return { x: estado.posicion.x + lx * cos + lz * sen, z: estado.posicion.z - lx * sen + lz * cos };
    }

    function alturaEn(lx, lz) {
      const p = aMundoLocal(lx, lz);
      return terreno.altura(p.x, p.z);
    }

    function puntosColision() {
      const salida = [];
      const d = L / 2 - 0.45;
      salida.push(aMundoLocal(0, -d));
      salida.push(aMundoLocal(0, 0));
      salida.push(aMundoLocal(0, d));
      return salida;
    }

    function asentar() {
      const valores = [];
      for (let i = 0; i < 4; i += 1) {
        const lado = i < 2 ? -1 : 1;
        const z = i % 2 === 0 ? -V.wheelbase / 2 : V.wheelbase / 2;
        valores.push(alturaEn(lado * V.track / 2, z));
      }
      valores.sort(function (a, b) { return a - b; });
      return (valores[1] + valores[2]) * 0.5;
    }

    function pendiente() {
      const delante = alturaEn(0, -1.4);
      const atras = alturaEn(0, 1.4);
      return Math.atan2(delante - atras, 2.8);
    }

    function inclinacionLateral() {
      const der = alturaEn(V.track / 2, 0);
      const izq = alturaEn(-V.track / 2, 0);
      return Math.atan2(izq - der, V.track);
    }

    const inicio = puntoInicial || { x: -10, z: -1240, dir: 0 };
    estado.posicion.set(inicio.x, 0, inicio.z);
    estado.direccion = inicio.dir;
    estado.posicion.y = asentar();

    const info = {
      velocidad: 0, rpm: 0, acelerando: false, frenando: false,
      pendiente: 0, lateral: 0, acelLong: 0, giro: 0, golpeo: 0,
    };

    function aplicarPose() {
      raiz.position.copy(estado.posicion);
      raiz.rotation.set(0, estado.direccion, 0);
      raiz.rotateX(-pendiente() * 0.85 + estado.cabeceo);
      raiz.rotateZ(-inclinacionLateral() * 0.6 - estado.velocidadLateral * 0.006 + estado.balanceo);
    }

    function anguloRueda() {
      const vel = Math.max(1.6, Math.abs(estado.velocidad));
      return Math.max(-0.6, Math.min(0.6, Math.atan(V.wheelbase * estado.giro / vel)));
    }

    function aplicarDireccionRuedas(frenoMano) {
      const objetivo = anguloRueda();
      for (let i = 0; i < ruedas.length; i += 1) {
        const r = ruedas[i];
        if (!r.grupo) continue;
        if (r.malla) r.malla.rotation.z = estado.rotacionRuedas;
        if (r.delantera) {
          r.grupo.rotation.y += (objetivo - r.grupo.rotation.y) * 0.35;
        } else if (frenoMano) {
          r.grupo.rotation.y += (azar() - 0.5) * 0.05;
        } else {
          r.grupo.rotation.y *= 0.9;
        }
      }
    }

    function actualizarLuces(lucesFreno) {
      const faroOn = estado.luces ? 1 : 0;
      faroIzq.intensity = faroOn * F.intensidad;
      faroDer.intensity = faroOn * F.intensidad * 0.8;
      derrame.intensity = faroOn * 0.3;
      relleno.intensity = faroOn * 0.05;
      faroLargo.intensity = faroOn * 16;

      const alturaFaro = 0.66;
      faroIzq.position.set(-(A / 2 - 0.5), alturaFaro, -L / 2 + 0.1);
      faroDer.position.set(A / 2 - 0.5, alturaFaro, -L / 2 + 0.1);
      faroIzq.target.position.set(-0.55, -1.3, -28);
      faroDer.target.position.set(0.55, -1.3, -28);
      derrame.position.set(0, alturaFaro, -L / 2 - 2.2);
      relleno.position.set(-0.34, 1.05, -0.7);
      faroLargo.position.set(0, alturaFaro, -L / 2 + 0.3);
      faroLargo.target.position.set(0, -1.1, -30);
      faroIzq.target.updateMatrixWorld();
      faroDer.target.updateMatrixWorld();
      faroLargo.target.updateMatrixWorld();

      luzCabina.position.set(-0.36, 1.06, -0.55);
      luzCabina.intensity = faroOn * 0.1;
      luzCabina.visible = faroOn > 0;
      luzTablero.position.set(-0.36, 0.92, -0.5);
      luzTablero.intensity = estado.motorEncendido ? 0.05 : 0;
      luzTablero.visible = estado.motorEncendido;

      if (faroMalla) faroMalla.mat.emissiveIntensity = faroOn * 0.45;
      if (pilotoMalla) pilotoMalla.mat.emissiveIntensity = faroOn * 0.3;
      if (frenoMalla) frenoMalla.mat.emissiveIntensity = lucesFreno ? 2.2 : faroOn * 0.22;
      if (marchaMalla) marchaMalla.mat.emissiveIntensity = estado.marchaAtras ? 1.5 : faroOn * 0.14;
      if (intermitenteMalla) intermitenteMalla.mat.emissiveIntensity = faroOn * 0.35;
    }

    function actualizar(dt, entrada, conduction) {
      if (!conduction) return actualizarEstacionado(dt);

      const gas = (entrada.abajo('adelante') ? 1 : 0) - (entrada.abajo('atras') ? 1 : 0);
      const dirs = (entrada.abajo('izquierda') ? 1 : 0) - (entrada.abajo('derecha') ? 1 : 0);
      const freno = entrada.abajo('espacio');
      const absPrevio = Math.abs(estado.velocidad);
      const mano = freno && absPrevio > 3.5;
      estado.frenoMano = mano;

      let aceleracion = 0;
      if (estado.motorEncendido) {
        if (gas > 0) {
          const caida = 1 - estado.velocidad / V.velocidadMax;
          aceleracion += (V.fuerzaMotor / V.masa) * Math.max(0.15, caida);
        } else if (gas < 0) {
          if (estado.velocidad > 0.4) aceleracion -= (V.freno / V.masa) * 0.72;
          else aceleracion -= (V.fuerzaMarchaAtras / V.masa);
        } else {
          aceleracion -= (V.frenoMotor / V.masa) * Math.sign(estado.velocidad || 1);
        }
      } else {
        aceleracion -= Math.sign(estado.velocidad || 1) * 0.5;
      }

      if (freno && absPrevio > 0.1) {
        aceleracion -= Math.sign(estado.velocidad) * (V.freno / V.masa) * (mano ? 0.42 : 1);
      }

      const v = estado.velocidad;
      const resistencias = Math.sign(v) * (V.rodadura + V.resistenciaAerodinamica * v * v);
      estado.velocidad += (aceleracion - resistencias) * dt;

      if (Math.abs(estado.velocidad) < 0.04 && gas === 0) estado.velocidad = 0;
      if (estado.velocidad > V.velocidadMax) estado.velocidad = V.velocidadMax;
      if (estado.velocidad < -V.velocidadMaxAtras) estado.velocidad = -V.velocidadMaxAtras;
      estado.marchaAtras = estado.velocidad < -0.2;

      const abs = Math.abs(estado.velocidad);
      const frenando = (freno || (gas < 0 && estado.velocidad > 0.4)) && abs > 0.2;

      const velRef = Math.max(1.6, abs);
      const giroMax = Math.min(V.empujeMaxAngulo, V.aceleracionLateralMax / velRef);
      const objetivo = dirs * giroMax * (estado.velocidad < -0.2 ? -1 : 1);
      const sinGiro = dirs === 0 ? V.amortiguacionGiroRecto : V.amortiguacionGiro;
      estado.giro += (objetivo - estado.giro) * Math.min(1, dt * sinGiro);
      if (abs < 0.5) estado.giro *= Math.max(0, 1 - dt * 6);
      estado.direccion += estado.giro * dt;

      const agarre = mano ? 0.3 : 1;
      if (abs > 0.4) estado.velocidadLateral += -estado.giro * estado.velocidad * dt * V.deriva;
      const frenoLateral = Math.min(1, dt * V.adherenciaLateral * agarre);
      estado.velocidadLateral -= estado.velocidadLateral * frenoLateral;
      if (mano) estado.velocidadLateral += (azar() - 0.5) * 2.6 * dt * Math.min(1, abs / 8);
      const desvio = Math.abs(estado.velocidadLateral);
      const maxDesvio = 0.55 + abs * 0.07;
      if (desvio > maxDesvio) {
        estado.velocidadLateral = Math.sign(estado.velocidadLateral) * maxDesvio;
        estado.velocidad *= 1 - Math.min(0.35, dt * 0.7);
      }

      const sen = Math.sin(estado.direccion);
      const cos = Math.cos(estado.direccion);
      estado.posicion.x += (-sen * estado.velocidad + cos * estado.velocidadLateral) * dt;
      estado.posicion.z += (-cos * estado.velocidad - sen * estado.velocidadLateral) * dt;

      const puntos = puntosColision();
      let golpeo = false;
      for (let i = 0; i < puntos.length; i += 1) {
        const p = puntos[i];
        const guardado = { x: p.x, z: p.z };
        if (colisiones.resolver(guardado, 1.0, estado.posicion.y)) {
          p.x = guardado.x;
          p.z = guardado.z;
          golpeo = true;
        }
      }
      if (golpeo) {
        estado.velocidad *= 0.42;
        estado.velocidadLateral *= -0.12;
        estado.giro *= 0.3;
        info.golpeo = 1;
      }
      estado.posicion.x = puntos[1].x;
      estado.posicion.z = puntos[1].z;

      const suelo = asentar();
      estado.posicion.y += (suelo - estado.posicion.y) * Math.min(1, dt * V.suspension);

      const acelLong = (estado.velocidad - absPrevio) / Math.max(dt, 1e-4);
      estado.cabeceo += ((-acelLong / V.masa) * V.cabeceoAceleracion - estado.cabeceo) * Math.min(1, dt * 5);
      estado.balanceo += (estado.giro * estado.velocidad * V.balanceoGiro - estado.balanceo) * Math.min(1, dt * 4.5);

      aplicarPose();
      estado.rotacionRuedas += (estado.velocidad / R) * dt;
      estado.rotacionRuedas %= Math.PI * 2;
      aplicarDireccionRuedas(mano);
      if (volanteMalla) volanteMalla.rotation.x = -estado.giro * V.anguloVolante;
      actualizarManosVolante(dt);

      actualizarLuces(freno || (mano && abs > 0.4));
      info.velocidad = estado.velocidad;
      info.rpm = Math.min(1, abs / V.velocidadMax);
      info.acelerando = gas > 0;
      info.frenando = frenando;
      info.pendiente = pendiente();
      info.lateral = estado.velocidadLateral;
      info.acelLong = acelLong;
      info.giro = estado.giro;
      return info;
    }

    function actualizarEstacionado(dt) {
      estado.velocidad = 0;
      estado.velocidadLateral = 0;
      estado.giro *= Math.max(0, 1 - dt * 8);
      estado.frenoMano = true;

      const suelo = asentar();
      estado.posicion.y += (suelo - estado.posicion.y) * Math.min(1, dt * 6);
      estado.cabeceo += (0 - estado.cabeceo) * Math.min(1, dt * 4);
      estado.balanceo += (0 - estado.balanceo) * Math.min(1, dt * 4);

      aplicarPose();
      aplicarDireccionRuedas(true);
      if (volanteMalla) volanteMalla.rotation.x = -estado.giro * V.anguloVolante;
      actualizarManosVolante(dt);

      actualizarLuces(false);
      info.velocidad = 0;
      info.rpm = 0;
      info.acelerando = false;
      info.frenando = true;
      info.pendiente = pendiente();
      info.lateral = 0;
      info.acelLong = 0;
      info.giro = estado.giro;
      return info;
    }

    function estacionar() {
      estado.velocidad = 0;
      estado.velocidadLateral = 0;
      estado.giro = 0;
      estado.marchaAtras = false;
      estado.frenoMano = true;
      estado.cabeceo = 0;
      estado.balanceo = 0;
      estado.posicion.y = asentar();
    }

    aplicarPose();
    actualizarManosVolante(0);

    return {
      raiz: raiz,
      cuerpo: cuerpo,
      modelo: modelo,
      estado: estado,
      actualizar: actualizar,
      estacionar: estacionar,
      info: info,
      get posicion() { return estado.posicion; },
      get direccion() { return estado.direccion; },
      get velocidad() { return estado.velocidad; },
      get dentro() { return estado.ocupado; },
      get luces() { return estado.luces; },
      get marchaAtras() { return estado.marchaAtras; },
      get radioEncendido() { return estado.radioEncendido; },
      get radioRuido() { return estado.radioRuido; },
      alternarLuces() { estado.luces = !estado.luces; return estado.luces; },
      alternarRadio() { estado.radioEncendido = !estado.radioEncendido; return estado.radioEncendido; },
      recogerCamara() { camaraCoche.visible = false; return true; },
      get tieneCamara() { return camaraCoche.visible; },
      faros: { izq: faroIzq, der: faroDer, largo: faroLargo, derrame: derrame },
      medidas: { L: L, A: A, R: R, altura: V.altura },
    };
  };
})(window.J = window.J || {});

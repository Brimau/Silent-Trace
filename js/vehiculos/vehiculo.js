(function (J) {
  'use strict';

  const { CONFIG } = J;
  const TEX = J.TEX;
  const { crearPRNG } = J.ruido;
  const { fusionar, matriz } = J;

  function caja(w, h, d, x, y, z) {
    return { geometria: new THREE.BoxGeometry(w, h, d), matriz: matriz(x, y, z) };
  }

  function tubo(rt, rb, largo, seg, x, y, z, rx, rz) {
    return {
      geometria: new THREE.CylinderGeometry(rt, rb, largo, seg, 1),
      matriz: matriz(x, y, z, rx || 0, 0, rz || 0),
    };
  }

  J.crearVehiculo = function crearVehiculo(escena, terreno, colisiones, puntoInicial) {
    const V = CONFIG.vehiculo;
    const az = crearPRNG(CONFIG.semilla + 1);
    const azar = function () { return az(); };

    const raiz = new THREE.Group();
    raiz.name = 'vehiculo';
    escena.add(raiz);
    const cuerpo = new THREE.Group();
    raiz.add(cuerpo);

    const M = {
      pintura: new THREE.MeshStandardMaterial({ color: 0x272c30, roughness: 0.58, metalness: 0.28 }),
      interior: new THREE.MeshStandardMaterial({ map: TEX.detalle(), color: 0x2a2d31, roughness: 0.97 }),
     abitaculo: new THREE.MeshStandardMaterial({ map: TEX.detalle(), color: 0x33363a, roughness: 0.99 }),
      forro: new THREE.MeshStandardMaterial({ map: TEX.detalle(), color: 0x2b2a27, roughness: 1 }),
      volante: new THREE.MeshStandardMaterial({ color: 0x131415, roughness: 0.9 }),
      oscuro: new THREE.MeshStandardMaterial({ color: 0x1b1e21, roughness: 0.62, metalness: 0.35 }),
      piel: new THREE.MeshStandardMaterial({ color: 0x6d5540, roughness: 0.88, emissive: 0x1c1510, emissiveIntensity: 1 }),
      telaCoche: new THREE.MeshStandardMaterial({ map: TEX.detalle(), color: 0x33383a, roughness: 0.99 }),
      manga: new THREE.MeshStandardMaterial({ map: TEX.detalle(), color: 0x2a3236, roughness: 0.97, emissive: 0x0d1113, emissiveIntensity: 1 }),
      metal: new THREE.MeshStandardMaterial({ map: TEX.metal(), color: 0x7d8287, roughness: 0.55, metalness: 0.72 }),
      cromo: new THREE.MeshStandardMaterial({ color: 0x9aa0a4, roughness: 0.28, metalness: 0.9 }),
      caucho: new THREE.MeshStandardMaterial({ map: TEX.detalle(), color: 0x131315, roughness: 0.99 }),
      llanta: new THREE.MeshStandardMaterial({ color: 0x6a6f72, roughness: 0.52, metalness: 0.78 }),
      cristal: new THREE.MeshStandardMaterial({
        color: 0x101619, roughness: 0.22, metalness: 0.1,
        transparent: true, opacity: 0.13, side: THREE.DoubleSide,
      }),
      faro: new THREE.MeshStandardMaterial({ color: 0xd9d4c4, emissive: 0xfff0cc, emissiveIntensity: 0, roughness: 0.18, metalness: 0.1 }),
      freno: new THREE.MeshStandardMaterial({ color: 0x4a0f0f, emissive: 0xff2200, emissiveIntensity: 0, roughness: 0.35 }),
      piloto: new THREE.MeshStandardMaterial({ color: 0x3a1008, emissive: 0xff4010, emissiveIntensity: 0.7, roughness: 0.4 }),
      radio: new THREE.MeshStandardMaterial({ color: 0x0d0e0f, roughness: 0.5, emissive: 0x1c3022, emissiveIntensity: 0.5 }),
      cuadro: new THREE.MeshStandardMaterial({
        map: TEX.instrumento(), color: 0xffffff, roughness: 0.6,
        emissive: 0x1b2a1e, emissiveIntensity: 1.1, emissiveMap: TEX.instrumento(),
      }),
      radioPantalla: new THREE.MeshStandardMaterial({
        map: TEX.radio(), color: 0xffffff, roughness: 0.55,
        emissive: 0x2a4a34, emissiveIntensity: 0.9, emissiveMap: TEX.radio(),
      }),
    };

    const L = V.largo;
    const A = V.ancho;
    const R = V.alturaRueda;
    const bajo = 0.17;
    const cintura = 0.84;
    const techo = 1.44;
    const anchoCabina = 1.58;
    const F = CONFIG.faros;

    const fuera = [
      caja(A, 0.60, L, 0, bajo + 0.30, 0),
      caja(A * 0.99, 0.20, L, 0, bajo + 0.60, 0),
      caja(A, 0.32, 1.15, 0, 0.80, -L / 2 + 0.88),
      caja(A * 0.97, 0.42, L * 0.5, 0, 0.80, L * 0.21),
      caja(A, 0.22, 0.26, 0, 0.62, L / 2 - 0.09),
      caja(A, 0.2, 0.1, 0, 0.62, -L / 2 + 0.05),
      caja(0.13, 0.3, 0.13, 0, 1.0, -L / 2 + 0.7),
      caja(A * 0.9, 0.1, 0.9, 0, bajo + 0.06, -0.2),
    ];
    for (let i = 0; i < 4; i += 1) {
      const lado = i < 2 ? -1 : 1;
      const z = i % 2 === 0 ? L * 0.31 : -L * 0.31;
      fuera.push(caja(0.05, 0.54, 1.0, lado * (A / 2 + 0.005), 0.86, z));
      fuera.push(caja(0.05, 0.3, 0.8, lado * (A / 2 + 0.005), 0.36, z));
    }
    const mallaCuerpo = new THREE.Mesh(fusionar(fuera), M.pintura);
    mallaCuerpo.castShadow = true;
    mallaCuerpo.receiveShadow = true;
    cuerpo.add(mallaCuerpo);

    const cabinParts = [
      caja(anchoCabina, 0.08, 2.05, 0, techo, -0.16),
      caja(anchoCabina, 0.11, 0.11, 0, techo - 0.07, -1.13),
      caja(anchoCabina, 0.13, 0.13, 0, cintura + 0.04, -1.13),
      caja(anchoCabina, 0.11, 0.11, 0, techo - 0.07, 0.86),
      caja(anchoCabina, 0.12, 0.12, 0, cintura + 0.04, 0.86),
      caja(0.07, techo - cintura, 0.09, -anchoCabina / 2, (techo + cintura) / 2, -1.13),
      caja(0.07, techo - cintura, 0.09, anchoCabina / 2, (techo + cintura) / 2, -1.13),
      caja(0.07, techo - cintura, 0.09, -anchoCabina / 2, (techo + cintura) / 2, 0.86),
      caja(0.07, techo - cintura, 0.09, anchoCabina / 2, (techo + cintura) / 2, 0.86),
      caja(0.06, techo - cintura, 0.06, -anchoCabina / 2, (techo + cintura) / 2, -0.15),
      caja(0.06, techo - cintura, 0.06, anchoCabina / 2, (techo + cintura) / 2, -0.15),
      caja(anchoCabina, 0.07, 0.07, 0, techo - 0.05, 0.4),
      caja(0.06, 0.3, 0.06, -0.46, techo + 0.16, -0.46),
      caja(0.06, 0.3, 0.06, 0.46, techo + 0.16, -0.46),
    ];
    const mallaCabina = new THREE.Mesh(fusionar(cabinParts), M.interior);
    mallaCabina.castShadow = true;
    cuerpo.add(mallaCabina);

    const parabrisas = new THREE.Mesh(new THREE.BoxGeometry(anchoCabina * 0.97, 0.62, 0.02), M.cristal);
    parabrisas.position.set(0, (techo + cintura) / 2 + 0.02, -1.09);
    parabrisas.rotation.x = 0.32;
    parabrisas.userData.sinPicking = true;
    cuerpo.add(parabrisas);

    for (let i = 0; i < 2; i += 1) {
      const lado = i === 0 ? -1 : 1;
      const lateral = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.44, 1.6), M.cristal);
      lateral.position.set(lado * (anchoCabina / 2 - 0.005), (techo + cintura) / 2, -0.14);
      lateral.userData.sinPicking = true;
      cuerpo.add(lateral);
    }

    const interiorParts = [
      caja(1.46, 0.12, 0.5, 0, 0.44, -1.42),
      caja(1.46, 0.5, 0.1, 0, 0.72, -1.64),
      caja(0.1, 0.46, 0.46, -0.72, 0.7, -1.38),
      caja(0.1, 0.46, 0.46, 0.72, 0.7, -1.38),
      caja(0.46, 0.3, 0.09, 0, 0.86, -0.62),
      caja(0.07, 0.28, 0.07, 0, 0.7, -0.5),
      caja(1.38, 0.04, 0.42, 0, 0.48, 0.42),
      caja(1.38, 0.04, 0.42, 0, 0.48, 1.28),
      caja(0.04, 0.34, 0.04, 0, 0.66, 1.72),
      caja(0.2, 0.14, 0.12, 0.24, 0.92, -0.62),
      caja(0.09, 0.09, 0.46, -0.48, 0.6, -0.7),
      caja(0.09, 0.09, 0.46, 0.48, 0.6, -0.7),
      caja(1.5, 0.1, 0.5, 0, 0.34, 0.9),

      caja(1.5, 0.05, 1.9, 0, techo - 0.045, -0.16),

      caja(0.06, 0.56, 1.5, -anchoCabina / 2 + 0.03, 0.55, -0.1),
      caja(0.06, 0.56, 1.5, anchoCabina / 2 - 0.03, 0.55, -0.1),
      caja(0.1, 0.1, 1.3, -anchoCabina / 2 + 0.08, 0.86, -0.1),
      caja(0.1, 0.1, 1.3, anchoCabina / 2 - 0.08, 0.86, -0.1),
      caja(0.09, 0.09, 0.34, -anchoCabina / 2 + 0.09, 0.72, -0.62),
      caja(0.09, 0.09, 0.34, anchoCabina / 2 - 0.09, 0.72, -0.62),
      caja(0.05, 0.14, 0.9, -anchoCabina / 2 + 0.08, 0.48, -0.1),
      caja(0.05, 0.14, 0.9, anchoCabina / 2 - 0.08, 0.48, -0.1),

      caja(1.46, 0.3, 0.42, 0, 0.78, -0.78),
      caja(0.34, 0.26, 0.14, -0.38, 0.86, -0.72),
      caja(1.46, 0.24, 0.1, 0, 0.5, -1.02),
      caja(0.12, 0.5, 0.1, 0, 0.62, -1.0),
      caja(0.16, 0.06, 0.16, -0.38, 0.62, -0.5),
      caja(0.13, 0.26, 0.05, -0.2, 0.62, -0.52),
      caja(0.13, 0.26, 0.05, -0.56, 0.62, -0.52),
    ];
    cuerpo.add(new THREE.Mesh(fusionar(interiorParts), M.interior));

    const forroParts = [
      caja(1.44, 0.03, 1.85, 0, techo - 0.085, -0.16),
      caja(0.05, 0.42, 1.3, -anchoCabina / 2 + 0.055, 0.62, -0.12),
      caja(0.05, 0.42, 1.3, anchoCabina / 2 - 0.055, 0.62, -0.12),
      caja(0.36, 0.03, 0.5, 0, 0.36, -0.16),
    ];
    cuerpo.add(new THREE.Mesh(fusionar(forroParts), M.forro));

    const cromoParts = [
      caja(0.05, 0.035, 0.34, -anchoCabina / 2 + 0.09, 0.755, -0.62),
      caja(0.05, 0.035, 0.34, anchoCabina / 2 - 0.09, 0.755, -0.62),
      caja(0.42, 0.03, 0.06, 0, 1.0, -0.62),
      caja(0.06, 0.03, 0.5, -anchoCabina / 2 + 0.075, 0.5, -0.1),
      caja(0.06, 0.03, 0.5, anchoCabina / 2 - 0.075, 0.5, -0.1),
      caja(0.2, 0.05, 0.2, 0.38, 0.42, 0.02),
    ];
    cuerpo.add(new THREE.Mesh(fusionar(cromoParts), M.cromo));

    const visera = new THREE.Mesh(fusionar([
      caja(0.68, 0.02, 0.24, -0.36, techo - 0.13, -0.98, 0.22),
      caja(0.68, 0.02, 0.24, 0.36, techo - 0.13, -0.98, 0.22),
    ]), M.forro);
    cuerpo.add(visera);

    const espejo = new THREE.Mesh(fusionar([
      caja(0.3, 0.1, 0.04, 0, techo - 0.19, -0.62),
      caja(0.05, 0.14, 0.04, 0, techo - 0.11, -0.62),
    ]), M.interior);
    cuerpo.add(espejo);
    const espejoCristal = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.075, 0.01), M.cristal);
    espejoCristal.position.set(0, techo - 0.19, -0.645);
    espejoCristal.rotation.y = Math.PI;
    cuerpo.add(espejoCristal);

    const espejoLateral = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.13, 0.2), M.cromo);
    espejoLateral.position.set(-(A / 2 + 0.16), 0.98, -0.86);
    cuerpo.add(espejoLateral);

    const cuadro = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.17, 0.02), M.cuadro);
    cuadro.position.set(-0.38, 0.87, -0.66);
    cuadro.rotation.x = -0.22;
    cuadro.rotation.y = 0.16;
    cuerpo.add(cuadro);

    const agujaVelocidad = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.115, 0.006), new THREE.MeshStandardMaterial({
      color: 0x2a0806, emissive: 0xff3010, emissiveIntensity: 0.9, roughness: 0.5,
    }));
    agujaVelocidad.position.set(-0.5, 0.87, -0.632);
    agujaVelocidad.rotation.x = -0.22;
    agujaVelocidad.rotation.y = 0.16;
    cuerpo.add(agujaVelocidad);

    const agujaRpm = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.08, 0.006), new THREE.MeshStandardMaterial({
      color: 0x2a0806, emissive: 0xff3010, emissiveIntensity: 0.9, roughness: 0.5,
    }));
    agujaRpm.position.set(-0.28, 0.875, -0.63);
    agujaRpm.rotation.x = -0.22;
    agujaRpm.rotation.y = 0.16;
    cuerpo.add(agujaRpm);

    const radioPantalla = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.075, 0.02), M.radioPantalla);
    radioPantalla.position.set(0.24, 0.885, -0.655);
    radioPantalla.rotation.x = -0.2;
    cuerpo.add(radioPantalla);

    const luzTablero = new THREE.PointLight(0x8fe8b4, 0, 0.85, 2.2);
    luzTablero.position.set(-0.36, 0.82, -0.56);
    raiz.add(luzTablero);

    const farosPiloto = [];
    for (let i = 0; i < 2; i += 1) {
      const lado = i === 0 ? -1 : 1;
      farosPiloto.push({
        geometria: new THREE.CylinderGeometry(0.19, 0.19, 0.07, 14, 1),
        matriz: matriz(lado * (A / 2 - 0.42), F.altura, -L / 2 - 0.02, Math.PI / 2, 0, 0),
      });
    }
    cuerpo.add(new THREE.Mesh(fusionar(farosPiloto), M.faro));

    const traseros = [];
    for (let i = 0; i < 2; i += 1) {
      const lado = i === 0 ? -1 : 1;
      traseros.push({ geometria: new THREE.BoxGeometry(0.2, 0.11, 0.05), matriz: matriz(lado * (A / 2 - 0.48), 0.68, L / 2 - 0.01) });
    }
    const mallaPilotos = new THREE.Mesh(fusionar(traseros), M.piloto);
    cuerpo.add(mallaPilotos);

    const captura = new THREE.Group();
    for (let i = 0; i < 2; i += 1) {
      const x = (i === 0 ? -1 : 1) * 0.38;
      captura.add(new THREE.Mesh(fusionar([
        caja(0.5, 0.13, 0.52, x, 0.44, 0.16),
        caja(0.48, 0.6, 0.13, x, 0.76, 0.44, 0),
        caja(0.24, 0.15, 0.11, x, 1.11, 0.47),
        caja(0.06, 0.06, 0.06, x - 0.2, 0.56, 0.2),
        caja(0.06, 0.06, 0.06, x + 0.2, 0.56, 0.2),
      ]), M.telaCoche));
    }
    captura.add(new THREE.Mesh(fusionar([
      caja(1.32, 0.13, 0.46, 0, 0.44, 1.02),
      caja(1.32, 0.56, 0.12, 0, 0.74, 1.3),
      caja(0.2, 0.14, 0.1, -0.4, 1.06, 1.32),
      caja(0.2, 0.14, 0.1, 0.4, 1.06, 1.32),
    ]), M.telaCoche));
    for (const malla of captura.children) malla.castShadow = true;
    cuerpo.add(captura);

    const puertaParts = [];
    for (let i = 0; i < 2; i += 1) {
      const lado = i === 0 ? -1 : 1;
      const x = lado * (anchoCabina / 2 - 0.055);
      puertaParts.push(caja(0.05, 0.07, 0.62, x, 0.62, -0.28));
      puertaParts.push(caja(0.045, 0.05, 0.16, x - lado * 0.01, 0.78, -0.5));
      puertaParts.push(caja(0.05, 0.05, 1.24, x, 0.4, -0.08));
    }
    const puertas = new THREE.Mesh(fusionar(puertaParts), M.forro);
    cuerpo.add(puertas);

    const coronaTecho = new THREE.Mesh(fusionar([
      caja(anchoCabina - 0.5, 0.05, 1.9, 0, techo + 0.055, -0.16),
      caja(anchoCabina - 0.95, 0.04, 1.7, 0, techo + 0.095, -0.16),
    ]), M.pintura);
    cuerpo.add(coronaTecho);

    const soporteVolante = new THREE.Group();
    soporteVolante.position.set(-V.desplazamientoOjos, 0.9, -0.76);
    soporteVolante.rotation.x = 0.4;
    cuerpo.add(soporteVolante);
    const volante = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.021, 6, 20), M.volante);
    soporteVolante.add(volante);
    for (let i = 0; i < 3; i += 1) {
      const radio = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.018, 0.018), M.volante);
      radio.position.set(Math.cos((i / 3) * Math.PI * 2) * 0.07, Math.sin((i / 3) * Math.PI * 2) * 0.07, 0);
      radio.rotation.z = (i / 3) * Math.PI * 2;
      soporteVolante.add(radio);
    }
    const cuboVolante = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.03, 12), M.interior);
    cuboVolante.rotation.x = Math.PI / 2;
    soporteVolante.add(cuboVolante);

    function construirManoPiloto() {
      return fusionar([
        caja(0.075, 0.05, 0.1, 0, 0, 0),
        caja(0.07, 0.042, 0.055, 0, 0.012, -0.058),
        caja(0.026, 0.032, 0.05, -0.031, 0.028, -0.03),
        caja(0.026, 0.032, 0.05, 0.031, 0.028, -0.03),
        caja(0.024, 0.03, 0.046, -0.02, 0.036, -0.086),
        caja(0.024, 0.03, 0.046, 0.02, 0.036, -0.086),
      ]);
    }

    function construirAntebrazo() {
      return fusionar([
        tubo(0.05, 0.062, 0.34, 12, 0, 0, -0.19, Math.PI / 2),
        caja(0.086, 0.086, 0.045, 0, 0, -0.02),
      ]);
    }

    const manosVolante = new THREE.Group();
    const geoManoPiloto = construirManoPiloto();
    const geoAntebrazoPiloto = construirAntebrazo();
    for (let i = 0; i < 2; i += 1) {
      const lado = i === 0 ? -1 : 1;
      const ang = lado > 0 ? -0.32 : Math.PI + 0.32;
      const radio = 0.152;
      const mano = new THREE.Mesh(geoManoPiloto, M.piel);
      mano.position.set(Math.cos(ang) * radio, Math.sin(ang) * radio, 0.026);
      mano.rotation.z = ang + Math.PI / 2;
      manosVolante.add(mano);
      const antebrazo = new THREE.Mesh(geoAntebrazoPiloto, M.manga);
      antebrazo.position.set(Math.cos(ang) * (radio + 0.03), Math.sin(ang) * (radio + 0.03), 0.05);
      antebrazo.rotation.z = ang + Math.PI / 2;
      manosVolante.add(antebrazo);
    }
    soporteVolante.add(manosVolante);

    const luzCabina = new THREE.PointLight(0xffd2a0, 0, 1.35, 1.8);
    luzCabina.position.set(-0.36, 1.06, -0.95);
    cuerpo.add(luzCabina);

    const radioCaja = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.1, 0.08), M.interior);
    radioCaja.position.set(0.24, 0.88, -0.66);
    cuerpo.add(radioCaja);

    const camaraCoche = new THREE.Group();
    camaraCoche.add(new THREE.Mesh(fusionar([
      caja(0.14, 0.1, 0.07, 0, 0, 0),
      caja(0.045, 0.028, 0.045, 0, 0.058, -0.004),
      caja(0.03, 0.018, 0.026, -0.048, 0.056, 0.008),
    ]), M.metal));
    const objetivoCoche = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.05, 14), M.oscuro);
    objetivoCoche.rotation.x = Math.PI / 2;
    objetivoCoche.position.set(0, 0.006, -0.056);
    camaraCoche.add(objetivoCoche);
    camaraCoche.scale.setScalar(1.5);
    camaraCoche.position.set(0.44, 0.95, -0.58);
    camaraCoche.rotation.set(0, -0.62, 0);
    camaraCoche.userData.interaccion = {
      etiqueta: 'recoger la cámara',
      texto: 'Una cámara de bobina olvidada en el salpicadero. El objetivo está empañado por dentro.',
      equipo: 'camara',
    };
    cuerpo.add(camaraCoche);
    colisiones.registrar(camaraCoche);

    const ruedas = [];
    const geoGoma = new THREE.CylinderGeometry(R, R, 0.205, 20, 1);
    geoGoma.rotateZ(Math.PI / 2);
    const geoLlanta = new THREE.CylinderGeometry(R * 0.6, R * 0.6, 0.212, 16, 1);
    geoLlanta.rotateZ(Math.PI / 2);
    const geoCubo = new THREE.CylinderGeometry(R * 0.19, R * 0.19, 0.235, 10, 1);
    geoCubo.rotateZ(Math.PI / 2);
    for (let i = 0; i < 4; i += 1) {
      const lado = i < 2 ? -1 : 1;
      const z = i % 2 === 0 ? L * 0.31 : -L * 0.31;
      const grupo = new THREE.Group();
      grupo.position.set(lado * (A / 2 - 0.1), R, z);
      const goma = new THREE.Mesh(geoGoma, M.caucho);
      goma.castShadow = true;
      grupo.add(goma);
      const llanta = new THREE.Mesh(geoLlanta, M.llanta);
      llanta.position.x = lado * 0.012;
      grupo.add(llanta);
      const cubo = new THREE.Mesh(geoCubo, M.cromo);
      cubo.position.x = lado * 0.03;
      grupo.add(cubo);
      cuerpo.add(grupo);
      ruedas.push({ grupo: grupo, malla: goma, lado: lado, z: z, delantera: z < 0 });
    }

    const faroIzq = new THREE.SpotLight(0xffeccc, 0, CONFIG.faros.distancia, CONFIG.faros.angulo, CONFIG.faros.penumbra, CONFIG.faros.decaimiento);
    faroIzq.castShadow = true;
    faroIzq.shadow.mapSize.set(CONFIG.calidades.media.sombras, CONFIG.calidades.media.sombras);
    faroIzq.shadow.camera.near = 0.4;
    faroIzq.shadow.camera.far = CONFIG.faros.distancia;
    faroIzq.shadow.bias = -0.0016;
    faroIzq.shadow.normalBias = 0.05;
    raiz.add(faroIzq);
    raiz.add(faroIzq.target);

    const faroDer = new THREE.SpotLight(0xffeccc, 0, CONFIG.faros.distancia, CONFIG.faros.angulo, CONFIG.faros.penumbra, CONFIG.faros.decaimiento);
    raiz.add(faroDer);
    raiz.add(faroDer.target);

    const derrame = new THREE.PointLight(0xffdfae, 0, 20, 1.5);
    raiz.add(derrame);

    const relleno = new THREE.PointLight(0x5a6a78, 0, 2.2, 1.9);
    raiz.add(relleno);

    const faroLargo = new THREE.SpotLight(0xffeccc, 0, 34, 0.34, 0.85, 0.8);
    raiz.add(faroLargo);
    raiz.add(faroLargo.target);

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

    function aMundo(lx, lz) {
      const sen = Math.sin(estado.direccion);
      const cos = Math.cos(estado.direccion);
      return {
        x: estado.posicion.x + lx * cos + lz * sen,
        z: estado.posicion.z - lx * sen + lz * cos,
      };
    }

    function alturaEn(lx, lz) {
      const p = aMundo(lx, lz);
      return terreno.altura(p.x, p.z);
    }

    function puntosColision() {
      const salida = [];
      const d = L / 2 - 0.45;
      salida.push(aMundo(0, -d));
      salida.push(aMundo(0, 0));
      salida.push(aMundo(0, d));
      return salida;
    }

    function asentar() {
      const sen = Math.sin(estado.direccion);
      const cos = Math.cos(estado.direccion);
      const valores = [];
      for (let i = 0; i < 4; i += 1) {
        const lado = i < 2 ? -1 : 1;
        const z = i % 2 === 0 ? L * 0.31 : -L * 0.31;
        const lx = lado * (A / 2 - 0.09);
        valores.push(alturaEn(lx, z));
      }
      valores.sort(function (a, b) { return a - b; });
      void sen; void cos;
      return (valores[1] + valores[2]) * 0.5;
    }

    function pendiente() {
      const delante = alturaEn(0, -1.4);
      const atras = alturaEn(0, 1.4);
      return Math.atan2(delante - atras, 2.8);
    }

    function inclinacionLateral() {
      const der = alturaEn(0.9, 0);
      const izq = alturaEn(-0.9, 0);
      return Math.atan2(izq - der, 1.8);
    }

    const inicio = puntoInicial || { x: -10, z: -1240, dir: 0 };
    estado.posicion.set(inicio.x, 0, inicio.z);
    estado.direccion = inicio.dir;
    estado.posicion.y = asentar();

    const info = {
      velocidad: 0, rpm: 0, acelerando: false, frenando: false,
      pendiente: 0, lateral: 0, acelLong: 0, giro: 0, golpeo: 0,
    };

    function actualizar(dt, entrada, conduction) {
      if (!conduction) {
        return actualizarEstacionado(dt);
      }

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
      if (abs > 0.4) {
        estado.velocidadLateral += -estado.giro * estado.velocidad * dt * V.deriva;
      }
      const frenoLateral = Math.min(1, dt * V.adherenciaLateral * agarre);
      estado.velocidadLateral -= estado.velocidadLateral * frenoLateral;
      if (mano) {
        estado.velocidadLateral += (azar() - 0.5) * 2.6 * dt * Math.min(1, abs / 8);
      }
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

      raiz.position.copy(estado.posicion);
      raiz.rotation.set(0, estado.direccion, 0);
      raiz.rotateX(-pendiente() * 0.85 + estado.cabeceo);
      raiz.rotateZ(-inclinacionLateral() * 0.6 - estado.velocidadLateral * 0.006 + estado.balanceo);

      estado.rotacionRuedas += (estado.velocidad / R) * dt;
      aplicarDireccionRuedas(mano);
      estado.rotacionRuedas %= Math.PI * 2;
      soporteVolante.rotation.z = -estado.giro * V.anguloVolante;

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

      raiz.position.copy(estado.posicion);
      raiz.rotation.set(0, estado.direccion, 0);
      raiz.rotateX(-pendiente() * 0.85 + estado.cabeceo);
      raiz.rotateZ(-inclinacionLateral() * 0.6 + estado.balanceo);

      for (let i = 0; i < ruedas.length; i += 1) {
        ruedas[i].malla.rotation.x = estado.rotacionRuedas;
      }
      aplicarDireccionRuedas(true);
      soporteVolante.rotation.z = -estado.giro * V.anguloVolante;

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

    function anguloRueda() {
      const vel = Math.max(1.6, Math.abs(estado.velocidad));
      const base = L * 0.62;
      return Math.max(-0.6, Math.min(0.6, Math.atan(base * estado.giro / vel)));
    }

    function aplicarDireccionRuedas(frenoMano) {
      const objetivo = anguloRueda();
      for (let i = 0; i < ruedas.length; i += 1) {
        const r = ruedas[i];
        r.malla.rotation.x = estado.rotacionRuedas;
        if (r.delantera) {
          r.grupo.rotation.y += (objetivo - r.grupo.rotation.y) * 0.35;
          r.grupo.rotation.z *= 0.82;
        } else if (frenoMano) {
          r.grupo.rotation.z += (azar() - 0.5) * 0.7 * 0.016;
        } else {
          r.grupo.rotation.z *= 0.9;
        }
      }
    }

    function actualizarLuces(lucesFreno) {
      const faroOn = estado.luces ? 1 : 0;
      faroIzq.intensity = faroOn * CONFIG.faros.intensidad;
      faroDer.intensity = faroOn * CONFIG.faros.intensidad * 0.8;
      derrame.intensity = faroOn * 0.3;
      relleno.intensity = faroOn * 0.05;
      faroLargo.intensity = faroOn * 16;

      const alturaFaro = F.altura;
      faroIzq.position.set(-(A / 2 - 0.42), alturaFaro, -L / 2 - 0.14);
      faroDer.position.set(A / 2 - 0.42, alturaFaro, -L / 2 - 0.14);
      faroIzq.target.position.set(-0.55, -1.3, -28);
      faroDer.target.position.set(0.55, -1.3, -28);
      derrame.position.set(0, alturaFaro, -L / 2 - 2.2);
      relleno.position.set(0, 1.05, -0.9);
      faroLargo.position.set(0, alturaFaro, -L / 2 - 0.3);
      faroLargo.target.position.set(0, -1.1, -30);
      faroIzq.target.updateMatrixWorld();
      faroDer.target.updateMatrixWorld();
      faroLargo.target.updateMatrixWorld();

      M.faro.emissiveIntensity = faroOn * 1.7;
      M.freno.emissiveIntensity = lucesFreno ? 2.4 : 0;
      M.piloto.emissiveIntensity = faroOn * 0.8;
      M.cuadro.emissiveIntensity = estado.motorEncendido ? 0.4 : 0;
      M.radioPantalla.emissiveIntensity = estado.radioEncendido ? 0.2 + estado.radioRuido * 1.5 : 0.06;
      luzTablero.intensity = estado.motorEncendido ? 0.06 : 0;
      luzTablero.visible = estado.motorEncendido;
      luzCabina.intensity = faroOn * 0.085;
      luzCabina.visible = faroOn > 0;

      const kmh = Math.min(1, Math.abs(estado.velocidad) * 3.6 / 220);
      const rpmN = Math.min(1, Math.abs(estado.velocidad) / V.velocidadMax);
      agujaVelocidad.rotation.z = -(-1.05 + kmh * 2.1);
      agujaRpm.rotation.z = -(-1.05 + rpmN * 2.1);
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

    return {
      raiz: raiz,
      cuerpo: cuerpo,
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
      medidas: { L: L, A: A, R: R, bajo: bajo, cintura: cintura, techo: techo },
    };
  };
})(window.J = window.J || {});

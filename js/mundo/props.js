(function (J) {
  'use strict';

  const { CONFIG } = J;
  const TEX = J.TEX;
  const { crearPRNG, mezclar } = J.ruido;
  const { fusionar, matriz } = J;

  function materiales() {
    return {
      metal: new THREE.MeshStandardMaterial({ map: TEX.metal(), color: 0x5e5e5b, roughness: 0.78, metalness: 0.55 }),
      chapa: new THREE.MeshStandardMaterial({ map: TEX.metal(), color: 0x4c4f52, roughness: 0.68, metalness: 0.5 }),
      pintura: new THREE.MeshStandardMaterial({ color: 0x252a2b, roughness: 0.62, metalness: 0.35 }),
      caucho: new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.97 }),
      cristal: new THREE.MeshStandardMaterial({ color: 0x0b1013, roughness: 0.16, metalness: 0.6, transparent: true, opacity: 0.62 }),
      madera: new THREE.MeshStandardMaterial({ map: TEX.madera(true), color: 0x6d6558, roughness: 0.95 }),
      hormigon: new THREE.MeshStandardMaterial({ map: TEX.hormigon(), color: 0x6a6a65, roughness: 0.95 }),
      ladrillo: new THREE.MeshStandardMaterial({ map: TEX.ladrillo(), color: 0x726860, roughness: 0.95 }),
      piedra: new THREE.MeshStandardMaterial({ color: 0x35352f, roughness: 0.95, flatShading: true }),
      tierra: new THREE.MeshStandardMaterial({ color: 0x35302a, roughness: 1, flatShading: true }),
      pinturaClara: new THREE.MeshStandardMaterial({ color: 0x8d8a7c, roughness: 0.9 }),
    };
  }

  function caja(w, h, d, x, y, z, ry) {
    return { geometria: new THREE.BoxGeometry(w, h, d), matriz: matriz(x, y, z, 0, ry || 0, 0) };
  }

  function rueda(x, y, z, ry) {
    const g = new THREE.CylinderGeometry(0.33, 0.33, 0.22, 12, 1);
    g.rotateZ(Math.PI / 2);
    return { geometria: g, matriz: matriz(x, y, z, 0, ry || 0, 0) };
  }

  const FORMAS = [
    { largo: 4.3, ancho: 1.76, alto: 1.42, cabinX: -0.25, cabinL: 2.0, cabinA: 1.28, cabinAlto: 0.62,ruedaX: 1.42, ruedaR: 0.34 },
    { largo: 4.9, ancho: 1.86, alto: 2.1, cabinX: -0.1, cabinL: 3.2, cabinA: 1.78, cabinAlto: 1.35, ruedaX: 1.6, ruedaR: 0.37 },
    { largo: 4.7, ancho: 1.82, alto: 1.72, cabinX: 0.35, cabinL: 1.7, cabinA: 1.74, cabinAlto: 0.9, ruedaX: 1.55, ruedaR: 0.4 },
  ];

  function construirCoche(m, forma, estado) {
    const f = FORMAS[forma % FORMAS.length];
    const partes = [];

    partes.push(caja(f.ancho, f.alto * 0.52, f.largo, 0, 0.52 + f.ruedaR * 0.5, 0));
    partes.push({
      geometria: new THREE.BoxGeometry(f.cabinA, f.cabinAlto, f.cabinL),
      matriz: matriz(0, f.ruedaR + 0.52 + f.cabinAlto * 0.5, f.cabinX),
    });
    partes.push(caja(f.ancho * 0.98, 0.12, f.largo * 0.98, 0, f.ruedaR + 0.56 + f.cabinAlto, f.cabinX * 0.6));
    partes.push(caja(f.ancho * 1.02, 0.22, 0.3, 0, 0.62, f.largo * 0.5));
    partes.push(caja(f.ancho * 1.02, 0.2, 0.24, 0, 0.6, -f.largo * 0.5));

    const geo = fusionar(partes);
    const malla = new THREE.Mesh(geo, m.pintura);
    malla.castShadow = true;
    malla.receiveShadow = true;

    const grupo = new THREE.Group();
    grupo.add(malla);

    const vidrios = [];
    vidrios.push({ geometria: new THREE.BoxGeometry(f.cabinA * 1.02, f.cabinAlto * 0.8, f.cabinL * 0.92), matriz: matriz(0, f.ruedaR + 0.52 + f.cabinAlto * 0.52, f.cabinX) });
    const mv = new THREE.Mesh(fusionar(vidrios), m.cristal);
    grupo.add(mv);

    const ruedas = [];
    ruedas.push({ geometria: new THREE.CylinderGeometry(f.ruedaR, f.ruedaR, f.ancho * 0.96, 12, 1), matriz: matriz(0, f.ruedaR, f.ruedaX, 0, 0, Math.PI / 2) });
    ruedas.push({ geometria: new THREE.CylinderGeometry(f.ruedaR, f.ruedaR, f.ancho * 0.96, 12, 1), matriz: matriz(0, f.ruedaR, -f.ruedaX, 0, 0, Math.PI / 2) });
    ruedas.push({ geometria: new THREE.CylinderGeometry(f.ruedaR, f.ruedaR, f.ancho * 0.96, 12, 1), matriz: matriz(0, f.ruedaR + 0.42, f.largo * 0.3, 0, 0, Math.PI / 2) });
    ruedas.push({ geometria: new THREE.CylinderGeometry(f.ruedaR, f.ruedaR, f.ancho * 0.96, 12, 1), matriz: matriz(0, f.ruedaR + 0.42, -f.largo * 0.3, 0, 0, Math.PI / 2) });
    const mr = new THREE.Mesh(fusionar(ruedas), m.caucho);
    mr.castShadow = true;
    grupo.add(mr);

    if (estado === 1) {
      const puerta = new THREE.Group();
      const dp = new THREE.Mesh(
        new THREE.BoxGeometry(f.ancho * 0.06, 0.78, 1.0),
        m.pintura
      );
      dp.position.set(f.ancho * 0.5, f.ruedaR + 0.62, 0.5);
      puerta.add(dp);
      puerta.position.set(f.ancho * 0.5, 0, 0);
      puerta.rotation.y = -1.15;
      grupo.add(puerta);
    }
    if (estado === 2) {
      const rueda = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), m.caucho);
      rueda.position.set(2.2, 0.12, 1.4);
      rueda.scale.set(1, 0.45, 1.6);
      grupo.add(rueda);
    }
    return grupo;
  }

  J.crearProps = function crearProps(escena, caminos, terreno, colisiones) {
    const grupo = new THREE.Group();
    grupo.name = 'props';
    escena.add(grupo);
    const m = materiales();
    const rnd = crearPRNG(CONFIG.semilla + 4242);
    const interactivos = [];

    function base(x, z, rot) {
      return { x: x, y: terreno.altura(x, z), z: z, rot: rot };
    }

    function anclar(def) {
      const a = caminos.resolverAncla(def.ancla || { x: def.x, z: def.z, rot: def.rot });
      return base(a.x, a.z, def.ancla ? (def.rot || 0) + a.rot : a.rot);
    }

    function registrarInteractivo(nodo, etiqueta, texto, extra) {
      nodo.userData.interaccion = { etiqueta: etiqueta, texto: texto, extra: extra || null };
      colisiones.registrar(nodo);
      interactivos.push(nodo);
    }

    const CARTELES = {
      0: { lineas: ['VALDEHOYOS', '12 km'], color: 0x2c3a2e },
      1: { lineas: ['PROHIBIDO', 'EL PASO'], color: 0x3a2c2c },
      2: { lineas: ['CARRETERA', 'DE SERVICIO'], color: 0x2c343a },
    };

    const textos = {
      coche: 'Un coche igual que el suyo. registration borrada, la puerta del conductor abierta. En el asiento, un mapa de carreteras doblado en un sitio que no existe.',
      coche2: 'La segunda vez que ve un coche así en la misma carretera. Éste tiene las ruedas montadas hacia dentro.',
      senal: 'VALDEHOYOS, doce kilómetros. El poste está arrancado de cuajo y alguien lo volvió a clavar torcido.',
      telefono: 'Un cable que debería llevar corriente. Cuelga, y se mueve cuando pasa el coche. Un caja de conexiones abierta, sin fusibles.',
      piedras: 'Alguien apiló piedras en círculo. En el centro la tierra está hundida, como si algo hubiera permanecido mucho tiempo sentado.',
      barricada: 'Vallas de la Guardia Civil. Alguien las montó deprisa, desde el lado de la carretera.',
      hospital: 'La puerta tiene una cadena nueva y un candado que no está oxidado.',
    };

    for (const def of J.MAPA.PROPS) {
      const t = def.tipo;
      const p = anclar(def);
      const nodo = new THREE.Group();
      nodo.position.set(p.x, p.y, p.z);
      nodo.rotation.y = p.rot;
      grupo.add(nodo);

      if (t === 'vehiculoAbandonado') {
        const coche = construirCoche(m, def.forma, def.estado);
        nodo.add(coche);
        const primera = (def.ancla && def.ancla.s < 500);
        registrarInteractivo(nodo, 'examinar el coche', primera ? textos.coche : textos.coche2);
        colisiones.agregarCaja({ x: p.x, z: p.z, ancho: 1.9, fondo: 4.4, rot: p.rot, alto: 1.6, base: p.y });
        continue;
      }

      if (t === 'senal') {
        const partes = [];
        partes.push({ geometria: new THREE.CylinderGeometry(0.06, 0.07, 2.5, 6, 1), matriz: matriz(0, 1.25, 0) });
        const inclin = def.estado === 1 ? 0.55 : 0.12;
        nodo.rotation.z = inclin;
        const cartel = new THREE.Mesh(
          new THREE.BoxGeometry(0.86, 0.62, 0.05),
          new THREE.MeshStandardMaterial({
            map: TEX.cartel(CARTELES[def.estado].lineas, { fondo: '#26322a' }),
            roughness: 0.9, metalness: 0.1,
          })
        );
        cartel.position.set(0.42, 2.1, 0);
        cartel.castShadow = true;
        nodo.add(cartel);
        if (def.estado !== 1) {
          nodo.add(new THREE.Mesh(fusionar(partes), m.metal));
        } else {
          partes.push({ geometria: new THREE.BoxGeometry(0.5, 0.34, 0.04), matriz: matriz(0.42, 0.5, 0, 0, 0, 0.4) });
          nodo.add(new THREE.Mesh(fusionar(partes), m.metal));
        }
        registrarInteractivo(nodo, 'leer el cartel', textos.senal);
        colisiones.agregarCaja({ x: p.x, z: p.z, ancho: 0.3, fondo: 0.3, alto: 2.4, base: p.y });
        continue;
      }

      if (t === 'posteTelefono') {
        const partes = [];
        partes.push({ geometria: new THREE.CylinderGeometry(0.11, 0.14, 5.2, 7, 1), matriz: matriz(0, 2.6, 0) });
        partes.push({ geometria: new THREE.BoxGeometry(1.5, 0.09, 0.09), matriz: matriz(0, 4.9, 0) });
        for (let i = -1; i <= 1; i += 2) {
          partes.push({ geometria: new THREE.CylinderGeometry(0.05, 0.05, 0.16, 6, 1), matriz: matriz(i * 0.6, 5.02, 0) });
        }
        nodo.add(new THREE.Mesh(fusionar(partes), m.madera));
        const caida = def.estado * 1.4 + 0.6;
        const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, caida, 4, 1), m.caucho);
        cable.position.set(0.6, 4.9 - caida / 2, 0);
        cable.rotation.z = 0.16;
        nodo.add(cable);
        if (def.estado === 2) {
          const caja = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.44, 0.2), m.metal);
          caja.position.set(0, 2.3, 0.2);
          nodo.add(caja);
        }
        registrarInteractivo(nodo, 'mirar el poste', textos.telefono);
        colisiones.agregarCaja({ x: p.x, z: p.z, ancho: 0.4, fondo: 0.4, alto: 5, base: p.y });
        continue;
      }

      if (t === 'arbolCaido') {
        const largo = def.largo;
        const partes = [];
        partes.push({
          geometria: new THREE.CylinderGeometry(0.24, 0.4, largo, 8, 3),
          matriz: matriz(largo * 0.42, 0.36, 0, 0, 0, Math.PI / 2),
        });
        const r2 = crearPRNG(CONFIG.semilla + Math.round(p.x * 13 + p.z * 7));
        for (let i = 0; i < 9; i += 1) {
          const t2 = r2();
          partes.push({
            geometria: new THREE.CylinderGeometry(0.04, 0.09, 1.1 + r2() * 2.1, 5, 1),
            matriz: matriz(
              largo * (0.15 + t2 * 0.8), 0.5 + r2() * 0.7, 0,
              (r2() - 0.5) * 1.6, r2() * 6.28, (r2() - 0.5) * 1.4
            ),
          });
        }
        const malla = new THREE.Mesh(fusionar(partes), m.madera);
        malla.castShadow = true;
        malla.receiveShadow = true;
        nodo.add(malla);
        colisiones.agregarCaja({ x: p.x, z: p.z, ancho: 1.0, fondo: largo * 0.9, rot: p.rot, alto: 1.0, base: p.y, centro: 0 });
        continue;
      }

      if (t === 'piedras') {
        const partes = [];
        const n = 14;
        for (let i = 0; i < n; i += 1) {
          const a = (i / n) * Math.PI * 2 + rnd() * 0.3;
          const r = def.radio * (0.9 + rnd() * 0.2);
          const s = 0.22 + rnd() * 0.24;
          partes.push({
            geometria: new THREE.IcosahedronGeometry(s, 0),
            matriz: matriz(Math.cos(a) * r, s * 0.7, Math.sin(a) * r, rnd() * 3, rnd() * 6, rnd() * 3),
          });
        }
        partes.push({
          geometria: new THREE.CylinderGeometry(def.radio * 0.82, def.radio * 0.7, 0.14, 18, 1),
          matriz: matriz(0, 0.02, 0),
        });
        const malla = new THREE.Mesh(fusionar(partes), m.piedra);
        malla.receiveShadow = true;
        malla.castShadow = true;
        nodo.add(malla);
        registrarInteractivo(nodo, 'examinar el círculo', textos.piedras);
        continue;
      }

      if (t === 'colgante') {
        const partes = [];
        partes.push({ geometria: new THREE.CylinderGeometry(0.015, 0.015, def.alto, 4, 1), matriz: matriz(0, def.alto * 0.5, 0) });
        partes.push({ geometria: new THREE.IcosahedronGeometry(0.17, 0), matriz: matriz(0, def.alto - 0.2, 0.05) });
        partes.push({ geometria: new THREE.BoxGeometry(0.06, 0.5, 0.04), matriz: matriz(0, def.alto - 0.45, 0.02, 0, 0.3, 0.2) });
        const malla = new THREE.Mesh(fusionar(partes), m.madera);
        nodo.add(malla);
        nodo.userData.interaccion = {
          etiqueta: 'mirar de cerca',
          texto: 'Algo cuelga de una rama a la altura de una persona. No se ve bien qué es. Pesa.',
        };
        colisiones.registrar(nodo);
        interactivos.push(nodo);
        continue;
      }

      if (t === 'arco') {
        const H = 6.4;
        const partes = [];
        partes.push({ geometria: new THREE.BoxGeometry(0.7, H, 0.7), matriz: matriz(-6.2, H / 2, 0) });
        partes.push({ geometria: new THREE.BoxGeometry(0.7, H, 0.7), matriz: matriz(6.2, H / 2, 0) });
        partes.push({ geometria: new THREE.BoxGeometry(13.4, 0.9, 0.6), matriz: matriz(0, H - 0.3, 0) });
        partes.push({ geometria: new THREE.BoxGeometry(13.4, 0.3, 0.9), matriz: matriz(0, H - 2.1, 0) });
        const pil = new THREE.Mesh(fusionar(partes), m.hormigon);
        pil.castShadow = true; pil.receiveShadow = true;
        nodo.add(pil);
        const valla = new THREE.Mesh(new THREE.BoxGeometry(8.4, 1.7, 0.12), new THREE.MeshStandardMaterial({
          map: TEX.vallado(['VALDEHOYOS', 'PROHIBIDO EL PASO', 'GUARDIA CIVIL'], { fondo: '#20221f' }),
          roughness: 0.9, metalness: 0.2, side: THREE.DoubleSide,
        }));
        valla.position.set(0, 4.2, 0);
        valla.castShadow = true;
        nodo.add(valla);
        colisiones.agregarCaja({ x: p.x - 6.2, z: p.z, ancho: 0.9, fondo: 0.9, alto: H, base: p.y });
        colisiones.agregarCaja({ x: p.x + 6.2, z: p.z, ancho: 0.9, fondo: 0.9, alto: H, base: p.y });
        continue;
      }

      if (t === 'barricada') {
        const partes = [];
        for (let i = -1; i <= 1; i += 2) {
          partes.push({ geometria: new THREE.BoxGeometry(0.1, 1.1, 0.1), matriz: matriz(i * 1.4, 0.55, 0.3) });
          partes.push({ geometria: new THREE.BoxGeometry(0.1, 1.1, 0.1), matriz: matriz(i * 1.4, 0.55, -0.3) });
        }
        partes.push({ geometria: new THREE.BoxGeometry(3.2, 0.34, 0.09), matriz: matriz(0, 0.86, 0) });
        partes.push({ geometria: new THREE.BoxGeometry(3.2, 0.34, 0.09), matriz: matriz(0, 0.36, 0) });
        const legs = new THREE.Mesh(fusionar(partes), m.metal);
        legs.castShadow = true;
        nodo.add(legs);
        const panel = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.62, 0.05), new THREE.MeshStandardMaterial({
          map: TEX.vallado(['NO PASAR'], { fondo: '#2a2622', tinta: '#b0a68c' }),
          roughness: 0.9, side: THREE.DoubleSide,
        }));
        panel.position.set(0, 0.61, 0);
        panel.rotation.z = 0.05;
        panel.castShadow = true;
        nodo.add(panel);
        registrarInteractivo(nodo, 'mirar las vallas', textos.barricada);
        colisiones.agregarCaja({ x: p.x, z: p.z, ancho: 3.4, fondo: 0.7, rot: p.rot, alto: 1.1, base: p.y });
        continue;
      }

      if (t === 'posteElectrico') {
        const partes = [];
        partes.push({ geometria: new THREE.CylinderGeometry(0.13, 0.18, 8.2, 7, 1), matriz: matriz(0, 4.1, 0) });
        partes.push({ geometria: new THREE.BoxGeometry(1.7, 0.11, 0.11), matriz: matriz(0, 7.5, 0) });
        partes.push({ geometria: new THREE.BoxGeometry(1.2, 0.1, 0.1), matriz: matriz(0, 6.9, 0) });
        for (let i = -1; i <= 1; i += 2) {
          partes.push({ geometria: new THREE.CylinderGeometry(0.06, 0.06, 0.2, 5, 1), matriz: matriz(i * 0.72, 7.66, 0) });
        }
        nodo.rotation.z = (rnd() - 0.5) * 0.13;
        nodo.rotation.x = (rnd() - 0.5) * 0.1;
        const malla = new THREE.Mesh(fusionar(partes), m.hormigon);
        malla.castShadow = true;
        nodo.add(malla);
        colisiones.agregarCaja({ x: p.x, z: p.z, ancho: 0.4, fondo: 0.4, alto: 8, base: p.y });
        continue;
      }

      if (t === 'vallaMadera') {
        const partes = [];
        const L = def.largo;
        for (let i = 0; i < 3; i += 1) {
          partes.push({ geometria: new THREE.BoxGeometry(L, 0.11, 0.05), matriz: matriz(0, 0.5 + i * 0.42, 0, 0, 0, (rnd() - 0.5) * 0.05) });
        }
        for (let i = 0; i <= 2; i += 1) {
          partes.push({ geometria: new THREE.BoxGeometry(0.12, 1.5, 0.1), matriz: matriz(-L / 2 + (i * L) / 2, 0.75, 0) });
        }
        const malla = new THREE.Mesh(fusionar(partes), m.madera);
        malla.castShadow = true;
        nodo.add(malla);
        colisiones.agregarCaja({ x: p.x, z: p.z, ancho: L, fondo: 0.3, rot: p.rot, alto: 1.5, base: p.y });
        continue;
      }

      if (t === 'contenedor') {
        const partes = [];
        partes.push({ geometria: new THREE.BoxGeometry(6.06, 2.59, 2.44), matriz: matriz(0, 1.3, 0) });
        const malla = new THREE.Mesh(fusionar(partes), new THREE.MeshStandardMaterial({
          map: TEX.metal(), color: 0x3f3832, roughness: 0.85, metalness: 0.4,
        }));
        malla.castShadow = true; malla.receiveShadow = true;
        nodo.add(malla);
        colisiones.agregarCaja({ x: p.x, z: p.z, ancho: 6.1, fondo: 2.5, rot: p.rot, alto: 2.6, base: p.y });
        continue;
      }

      if (t === 'pilaCajas') {
        const partes = [];
        for (let i = 0; i < 7; i += 1) {
          partes.push({
            geometria: new THREE.BoxGeometry(0.72, 0.6, 0.62),
            matriz: matriz(
              (rnd() - 0.5) * 0.35, 0.3 + Math.floor(i / 3) * 0.62 + (i % 3) * 0.02, (rnd() - 0.5) * 0.3,
              0, (rnd() - 0.5) * 0.5, (rnd() - 0.5) * 0.2
            ),
          });
        }
        const malla = new THREE.Mesh(fusionar(partes), m.madera);
        malla.castShadow = true; malla.receiveShadow = true;
        nodo.add(malla);
        colisiones.agregarCaja({ x: p.x, z: p.z, ancho: 1.0, fondo: 1.0, rot: p.rot, alto: 1.3, base: p.y });
        continue;
      }

      if (t === 'buzon') {
        const partes = [];
        partes.push({ geometria: new THREE.BoxGeometry(0.1, 1.05, 0.1), matriz: matriz(0, 0.52, 0) });
        partes.push({ geometria: new THREE.BoxGeometry(0.24, 0.2, 0.42), matriz: matriz(0, 1.12, 0) });
        partes.push({ geometria: new THREE.CylinderGeometry(0.12, 0.12, 0.42, 8, 1, false, 0, Math.PI), matriz: matriz(0, 1.2, 0, Math.PI / 2, 0, 0) });
        const malla = new THREE.Mesh(fusionar(partes), m.metal);
        malla.castShadow = true;
        nodo.add(malla);
        colisiones.agregarCaja({ x: p.x, z: p.z, ancho: 0.3, fondo: 0.3, alto: 1.3, base: p.y });
        continue;
      }

      if (t === 'farola') {
        const partes = [];
        partes.push({ geometria: new THREE.CylinderGeometry(0.1, 0.14, 4.6, 7, 1), matriz: matriz(0, 2.3, 0) });
        partes.push({ geometria: new THREE.CylinderGeometry(0.07, 0.07, 1.1, 6, 1), matriz: matriz(-0.5, 4.5, 0, 0, 0, 0.7) });
        const poste = new THREE.Mesh(fusionar(partes), m.metal);
        poste.castShadow = true;
        nodo.add(poste);
        if (def.estado === 0) {
          const cabeza = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.28), m.metal);
          cabeza.position.set(-1.0, 4.78, 0);
          cabeza.castShadow = true;
          nodo.add(cabeza);
        } else if (def.estado === 1) {
          const cabeza = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.28), m.metal);
          cabeza.position.set(-1.0, 4.1, 0.1);
          cabeza.rotation.z = 1.3;
          nodo.add(cabeza);
        }
        colisiones.agregarCaja({ x: p.x, z: p.z, ancho: 0.3, fondo: 0.3, alto: 4.6, base: p.y });
        continue;
      }

      if (t === 'escombros') {
        const partes = [];
        const n = Math.round(def.radio * 7);
        for (let i = 0; i < n; i += 1) {
          const a = rnd() * 6.28;
          const r = rnd() * def.radio;
          const s = 0.16 + rnd() * 0.4;
          partes.push({
            geometria: rnd() > 0.45 ? new THREE.BoxGeometry(s * 2, s * 0.5, s * 1.6) : new THREE.IcosahedronGeometry(s, 0),
            matriz: matriz(Math.cos(a) * r, s * 0.3, Math.sin(a) * r, rnd() * 2, rnd() * 6, rnd() * 2),
          });
        }
        const malla = new THREE.Mesh(fusionar(partes), rnd() > 0.5 ? m.hormigon : m.piedra);
        malla.receiveShadow = true;
        malla.castShadow = true;
        nodo.add(malla);
        continue;
      }
    }

    return { grupo: grupo, interactivos: interactivos, materiales: m };
  };
})(window.J = window.J || {});

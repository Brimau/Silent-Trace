(function (J) {
  'use strict';

  const { CONFIG } = J;
  const TEX = J.TEX;
  const { crearPRNG } = J.ruido;
  const { fusionar, matriz } = J;
  const H = J.MAPA.HOSPITAL;

  function caja(w, h, d, x, y, z) {
    return { geometria: new THREE.BoxGeometry(w, h, d), matriz: matriz(x, y, z) };
  }

  J.crearHospital = function crearHospital(escena, caminos, terreno, colisiones) {
    const grupo = new THREE.Group();
    grupo.name = 'hospital';
    escena.add(grupo);

    const y = terreno.altura(H.x, H.z);
    const nodo = new THREE.Group();
    nodo.position.set(H.x, y, H.z);
    nodo.rotation.y = H.rot;
    grupo.add(nodo);

    const rnd = crearPRNG(CONFIG.semilla + 6160);

    const M = {
      hormigon: new THREE.MeshStandardMaterial({ map: TEX.hormigon(), color: 0x5c5c57, roughness: 0.96 }),
      enfoscado: new THREE.MeshStandardMaterial({ map: TEX.enlucido(), color: 0x5d5b55, roughness: 0.96 }),
      ventana: new THREE.MeshStandardMaterial({ map: TEX.ventana(), color: 0x686a64, roughness: 0.65, metalness: 0.15 }),
      metal: new THREE.MeshStandardMaterial({ map: TEX.metal(), color: 0x53565a, roughness: 0.8, metalness: 0.45 }),
    };

    const A = H.ancho;
    const F = H.fondo;
    const PH = H.alturaPlanta;
    const partes = [];
    const ventanas = [];
    const Cristales = [];

    partes.push(caja(A, PH * H.plantas, F, 0, PH * H.plantas / 2, 0));
    partes.push(caja(A + 1.2, 0.6, F + 1.2, 0, PH * H.plantas + 0.2, 0));
    partes.push(caja(A * 0.34, 3.0, F * 0.3, -A * 0.28, PH * H.plantas + 1.6, -F * 0.1));
    partes.push(caja(A * 0.18, 0.4, 1.6, A * 0.3, PH * H.plantas + 0.6, F * 0.2));

    for (let p = 0; p < H.plantas; p += 1) {
      const base = p * PH;
      const columnas = 13;
      for (let i = 0; i < columnas; i += 1) {
        if (p === 0 && Math.abs(i - 6) <= 0) continue;
        const fx = -A / 2 + 1.9 + i * ((A - 3.8) / (columnas - 1));
        const rotura = p === 2 && (i === 2 || i === 9 || i === 10);
        if (rotura) {
          for (let k = 0; k < 9; k += 1) {
            if (rnd() < 0.4) continue;
            partes.push({
              geometria: new THREE.BoxGeometry(0.62 + rnd() * 0.4, 0.4 + rnd() * 0.5, 0.14),
              matriz: matriz(
                fx - 0.5 + rnd() * 1.0, base + 1.05 + rnd() * 1.5, F / 2 + 0.04,
                (rnd() - 0.5) * 0.3, (rnd() - 0.5) * 0.4, (rnd() - 0.5) * 0.5
              ),
            });
          }
          continue;
        }
        ventanas.push(caja(1.24, 1.5, 0.14, fx, base + PH * 0.62, F / 2 + 0.02));
        if (rnd() < 0.42) {
          ventanas.push(caja(1.24, 1.5, 0.14, fx + 0.2, base + PH * 0.62, -F / 2 - 0.02));
        }
        if (i % 3 === 1) {
          partes.push(caja(A / columnas + 0.3, 0.24, 0.3, fx, base + PH - 0.15, F / 2 + 0.1));
        }
      }
    }

    for (let p = 0; p < H.plantas - 1; p += 1) {
      const base = p * PH;
      partes.push(caja(A + 0.5, 0.18, 0.9, 0, base + PH - 0.1, F / 2 + 0.3));
    }

    partes.push(caja(4.6, 3.4, 0.3, 0, 1.7, F / 2 + 0.05));
    partes.push(caja(5.4, 0.4, 1.5, 0, 3.5, F / 2 + 0.7));
    partes.push(caja(0.5, 3.4, 0.5, -2.3, 1.7, F / 2 + 0.6));
    partes.push(caja(0.5, 3.4, 0.5, 2.3, 1.7, F / 2 + 0.6));

    const cuerpo = new THREE.Mesh(fusionar(partes), M.hormigon);
    cuerpo.castShadow = true;
    cuerpo.receiveShadow = true;
    nodo.add(cuerpo);

    const vm = new THREE.Mesh(fusionar(ventanas), M.ventana);
    nodo.add(vm);

    const entrada = new THREE.Group();
    entrada.position.set(0, 0, F / 2 + 0.14);
    nodo.add(entrada);

    for (let i = -1; i <= 1; i += 2) {
      const hoja = new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.9, 0.09), M.metal);
      hoja.position.set(i * 0.98, 1.45, 0.1);
      hoja.rotation.y = i * 0.14;
      hoja.castShadow = true;
      entrada.add(hoja);
      const cristal = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.9, 0.03), M.ventana);
      cristal.position.set(i * 0.98, 1.75, 0.15);
      cristal.rotation.y = i * 0.14;
      entrada.add(cristal);
    }

    const cadena = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.035, 6, 14), M.metal);
    cadena.position.set(0, 1.45, 0.3);
    cadena.rotation.y = Math.PI / 2;
    entrada.add(cadena);
    const candado = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.24, 0.07), M.metal);
    candado.position.set(0, 1.22, 0.3);
    entrada.add(candado);

    const letrero = new THREE.Mesh(new THREE.PlaneGeometry(11, 1.9), new THREE.MeshStandardMaterial({
      map: TEX.cartel(['HOSPITAL', 'SAN IGNACIO'], { fondo: '#2c3330', tinta: '#9aa39a', tam: 74 }),
      roughness: 0.9, metalness: 0.1, side: THREE.DoubleSide,
    }));
    letrero.position.set(0, 5.6, F / 2 + 0.2);
    nodo.add(letrero);

    const cruz = [];
    cruz.push(caja(0.34, 0.34, 0.2, 0, 0, 0));
    cruz.push(caja(0.2, 1.1, 0.18, 0, 0.3, 0));
    cruz.push(caja(0.7, 0.2, 0.18, 0, 0.5, 0));
    const cm = new THREE.Mesh(fusionar(cruz), M.enfoscado);
    cm.position.set(A / 2 - 0.2, PH * 2.4, F / 2 - 0.3);
    cm.castShadow = true;
    nodo.add(cm);

    const ambulancias = [];
    ambulancias.push(caja(2.2, 2.0, 5.4, -A / 2 - 3.2, 1.3, F / 2 + 2));
    ambulancias.push(caja(2.1, 0.9, 1.6, -A / 2 - 3.2, 2.5, F / 2 + 0.4));
    const amb = new THREE.Mesh(fusionar(ambulancias), new THREE.MeshStandardMaterial({
      map: TEX.metal(), color: 0x4a4d49, roughness: 0.8, metalness: 0.4,
    }));
    amb.castShadow = true; amb.receiveShadow = true;
    amb.position.set(0, 0, 0);
    amb.rotation.y = 0.35;
    nodo.add(amb);
    for (let i = 0; i < 4; i += 1) {
      const rueda = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.26, 10, 1), new THREE.MeshStandardMaterial({ color: 0x131313, roughness: 0.97 }));
      rueda.rotation.z = Math.PI / 2;
      rueda.position.set(
        -A / 2 - 3.2 + (i < 2 ? -1.5 : 1.5) * Math.cos(0.35),
        0.44,
        F / 2 + 2 + (i < 2 ? -1.5 : 1.5) * -Math.sin(0.35)
      );
      nodo.add(rueda);
    }

    const entradaPos = new THREE.Vector3(H.x, y, H.z + F / 2);
    colisiones.agregarCaja({ x: H.x, z: H.z, ancho: A, fondo: F, rot: H.rot, alto: PH * H.plantas, base: y, etiqueta: 'hospital' });

    nodo.userData.interaccion = {
      etiqueta: 'probar la puerta',
      texto: 'La cadena no está oxidada. El candado es reciente, y la llave no está puesta.',
    };
    colisiones.registrar(nodo);

    return {
      grupo: grupo,
      nodo: nodo,
      entrada: entradaPos,
      altura: PH * H.plantas,
    };
  };
})(window.J = window.J || {});

(function (J) {
  'use strict';

  const { CONFIG } = J;
  const TEX = J.TEX;
  const { crearPRNG } = J.ruido;
  const { fusionar, matriz } = J;

  function caja(w, h, d, x, y, z, ry) {
    return { geometria: new THREE.BoxGeometry(w, h, d), matriz: matriz(x, y, z, 0, ry || 0, 0) };
  }

  const _INTERIOR = [];

  function construirInterior(nodo, def, y, M, colisiones, registro) {
    const ancho = def.ancho;
    const fondo = def.fondo;
    const alto = 3.1;
    const medio = fondo * 0.5;

    const sueloPartes = [caja(ancho - 0.4, 0.06, fondo - 0.4, 0, 0.03, 0)];
    const paredPartes = [
      caja(ancho - 0.4, alto, 0.2, 0, alto / 2, -medio + 0.1),
      caja(0.2, alto, fondo - 0.4, -ancho / 2 + 0.1, alto / 2, 0),
      caja(0.2, alto, fondo - 0.4, ancho / 2 - 0.1, alto / 2, 0),
    ];
    const techoPartes = [caja(ancho - 0.4, 0.12, fondo - 0.4, 0, alto - 0.06, 0)];

    const sueloMesh = new THREE.Mesh(fusionar(sueloPartes), M.hormigon);
    sueloMesh.receiveShadow = true;
    nodo.add(sueloMesh);
    const paredMesh = new THREE.Mesh(fusionar(paredPartes), M.enlucido);
    paredMesh.receiveShadow = true;
    nodo.add(paredMesh);
    const techoMesh = new THREE.Mesh(fusionar(techoPartes), M.hormigon);
    nodo.add(techoMesh);

    const hueco = 0.75;
    const mesa = new THREE.Mesh(fusionar([
      caja(1.5, 0.07, 0.85, 0, 0.76, -0.2),
      caja(0.09, 0.72, 0.09, -0.66, 0.38, -0.54),
      caja(0.09, 0.72, 0.09, 0.66, 0.38, -0.54),
      caja(0.09, 0.72, 0.09, -0.66, 0.38, 0.14),
      caja(0.09, 0.72, 0.09, 0.66, 0.38, 0.14),
      caja(0.4, 0.5, 0.34, 0.5, 0.27, 0.9),
    ]), M.madera);
    mesa.castShadow = true;
    mesa.receiveShadow = true;
    nodo.add(mesa);

    const silla = new THREE.Mesh(fusionar([
      caja(0.42, 0.05, 0.42, -0.1, 0.45, 0.6),
      caja(0.42, 0.5, 0.05, -0.1, 0.68, 0.8),
      caja(0.06, 0.44, 0.06, -0.28, 0.23, 0.42),
      caja(0.06, 0.44, 0.06, 0.08, 0.23, 0.42),
      caja(0.06, 0.44, 0.06, -0.28, 0.23, 0.78),
      caja(0.06, 0.44, 0.06, 0.08, 0.23, 0.78),
    ]), M.madera);
    silla.castShadow = true;
    silla.position.set(0, 0, 0.1);
    nodo.add(silla);

    const armario = new THREE.Mesh(fusionar([
      caja(1.1, 2.0, 0.5, -ancho / 2 + 0.65, 1.0, -medio + 0.45),
      caja(0.52, 1.9, 0.04, -ancho / 2 + 0.42, 1.0, -medio + 0.72),
      caja(0.52, 1.9, 0.04, -ancho / 2 + 0.88, 1.0, -medio + 0.72),
    ]), M.madera);
    armario.castShadow = true;
    nodo.add(armario);

    const papel = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.29),
      new THREE.MeshStandardMaterial({ color: 0xbdb6a4, roughness: 0.97 }));
    papel.rotation.set(-Math.PI / 2, 0, 0.22);
    papel.position.set(-0.12, 0.8, -0.16);
    nodo.add(papel);

    const lampara = new THREE.PointLight(0xffd9a0, 0, 7, 1.7);
    lampara.position.set(0, 2.4, 0.2);
    nodo.add(lampara);

    const bombilla = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0x2a2622, emissive: 0xffd9a0, emissiveIntensity: 0 }));
    bombilla.position.set(0, 2.36, 0.2);
    nodo.add(bombilla);
    const flexo = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.6, 4), M.metal);
    flexo.position.set(0, 2.7, 0.2);
    nodo.add(flexo);

    const documento = new THREE.Group();
    documento.position.set(-0.12, 0.805, -0.16);
    documento.rotation.y = 0.22;
    documento.userData.interaccion = {
      etiqueta: 'leer el papel',
      texto: def.documento || 'Una hoja con letra ilegible. Alguien ha subrayado una frase muchas veces.',
    };
    colisiones.registrar(documento);
    registro.push(documento);

    colisiones.agregarCaja({
      x: def.x, z: def.z, ancho: 1.6, fondo: 0.95, rot: def.rot,
      alto: 0.8, base: y, etiqueta: 'mesa',
    });

    if (def.libreta) {
      const libretaMesa = new THREE.Group();
      libretaMesa.add(new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.022, 0.23), M.cartulina));
      libretaMesa.add(new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.024, 0.23), M.cartulina));
      libretaMesa.position.set(0.26, 0.808, -0.24);
      libretaMesa.rotation.y = -0.42;
      libretaMesa.userData.interaccion = {
        etiqueta: 'recoger la libreta',
        texto: 'Una libreta de tapa dura con el borde redondeado por el uso.',
        equipo: 'libreta',
        nodo: libretaMesa,
      };
      nodo.add(libretaMesa);
      colisiones.registrar(libretaMesa);
      registro.push(libretaMesa);
    }

    return { lampara: lampara, bombilla: bombilla };
  }

  J.crearEdificios = function crearEdificios(escena, caminos, terreno, colisiones) {
    const grupo = new THREE.Group();
    grupo.name = 'edificios';
    escena.add(grupo);

    const rnd = crearPRNG(CONFIG.semilla + 5150);
    const defs = J.MAPA.EDIFICIOS;

    const M = {
      hormigon: new THREE.MeshStandardMaterial({ map: TEX.hormigon(), color: 0x5e5e59, roughness: 0.95 }),
      ladrillo: new THREE.MeshStandardMaterial({ map: TEX.ladrillo(), color: 0x63594f, roughness: 0.95 }),
      enlucido: new THREE.MeshStandardMaterial({ map: TEX.enlucido(), color: 0x605e58, roughness: 0.95 }),
      ventana: new THREE.MeshStandardMaterial({ map: TEX.ventana(), color: 0x6e6e68, roughness: 0.7, metalness: 0.1 }),
      madera: new THREE.MeshStandardMaterial({ map: TEX.madera(true), color: 0x6b6255, roughness: 0.95 }),
      metal: new THREE.MeshStandardMaterial({ map: TEX.metal(), color: 0x585b5e, roughness: 0.8, metalness: 0.45 }),
      teja: new THREE.MeshStandardMaterial({ color: 0x2c231d, roughness: 0.95 }),
      chapa: new THREE.MeshStandardMaterial({ map: TEX.metal(), color: 0x4a453f, roughness: 0.88, metalness: 0.35 }),
      tela: new THREE.MeshStandardMaterial({ color: 0x4a4239, roughness: 0.98, side: THREE.DoubleSide }),
      cristal: new THREE.MeshStandardMaterial({ color: 0x0a0f12, roughness: 0.14, metalness: 0.7, transparent: true, opacity: 0.6 }),
    };

    const interactivos = [];

    for (const def of defs) {
      const y = terreno.altura(def.x, def.z);
      const nodo = new THREE.Group();
      nodo.position.set(def.x, y, def.z);
      nodo.rotation.y = def.rot;
      grupo.add(nodo);

      const ancho = def.ancho;
      const fondo = def.fondo;
      const plantaH = 3.1;
      const total = def.plantas * plantaH;
      const partes = [];
      const ventanas = [];
      const dados = [];

      const esNave = def.tipo === 'nave' || def.tipo === 'granero' || def.tipo === 'gasolinera';
      const esTienda = def.tipo === 'tienda' || def.tipo === 'taller';
      const materialMuro = esNave ? M.hormigon : (esTienda ? M.ladrillo : (rnd() > 0.45 ? M.enlucido : M.ladrillo));

      if (esNave) {
        const h = total + 2.4;
        partes.push(caja(ancho, h, fondo, 0, h / 2, 0));
        if (def.estado === 'techoHundido') {
          partes.push({
            geometria: new THREE.CylinderGeometry(ancho * 0.52, ancho * 0.52, fondo, 14, 1, true, 0.4, Math.PI - 0.9),
            matriz: matriz(0, h - 0.1, 0, 0, 0, 0),
          });
        } else {
          partes.push({
            geometria: new THREE.CylinderGeometry(ancho * 0.52, ancho * 0.52, fondo, 14, 1, true, 0, Math.PI),
            matriz: matriz(0, h - 0.1, 0, 0, 0, 0),
          });
        }
      } else {
        for (let p = 0; p < def.plantas; p += 1) {
          const y0 = p * plantaH;
          const faltaMuro = def.estado === 'medioDerrucho' && p === def.plantas - 1;
          const sinTecho = def.estado === 'derrucho';
          if (faltaMuro) {
            partes.push(caja(ancho * 0.22, plantaH, fondo, -ancho * 0.39, y0 + plantaH / 2, 0));
            partes.push(caja(ancho * 0.3, plantaH * 0.55, fondo, ancho * 0.32, y0 + plantaH * 0.28, 0));
          } else if (sinTecho) {
            partes.push(caja(ancho, plantaH * 0.5, fondo * 0.5, 0, y0 + plantaH * 0.25, -fondo * 0.25));
            partes.push(caja(ancho, plantaH * 0.78, fondo * 0.22, 0, y0 + plantaH * 0.39, fondo * 0.38));
          } else if (def.interior && p === 0) {
            const hueco = 1.35;
            partes.push(caja(ancho / 2 - hueco / 2, plantaH, fondo, -(ancho + hueco) / 4, y0 + plantaH / 2, 0));
            partes.push(caja(ancho / 2 - hueco / 2, plantaH, fondo, (ancho + hueco) / 4, y0 + plantaH / 2, 0));
            partes.push(caja(hueco, plantaH - 2.3, fondo, 0, y0 + 2.3 + (plantaH - 2.3) / 2, 0));
          } else {
            partes.push(caja(ancho, plantaH, fondo, 0, y0 + plantaH / 2, 0));
          }

          for (let f = 0; f < Math.max(1, Math.floor(ancho / 2.6)); f += 1) {
            const fx = -ancho / 2 + 1.3 + f * (ancho - 2.6) / Math.max(1, Math.max(1, Math.floor(ancho / 2.6)) - 1);
            if (Math.abs(fx) > ancho / 2 - 0.7) continue;
            const wy = y0 + 1.75;
            if (p === 0 && esTienda && Math.abs(fx) < 1.3) {
              ventanas.push({ geometria: new THREE.BoxGeometry(1.9, 1.5, 0.12), matriz: matriz(fx, wy, fondo / 2 + 0.01) });
              continue;
            }
            if (rnd() < 0.12) continue;
            ventanas.push({ geometria: new THREE.BoxGeometry(0.86, 1.15, 0.12), matriz: matriz(fx, wy, fondo / 2 + 0.01) });
            if (rnd() < 0.5) {
              ventanas.push({ geometria: new THREE.BoxGeometry(0.86, 1.15, 0.12), matriz: matriz(ancho / 2 + 0.01, wy, fx * 0.75, 0, Math.PI / 2, 0) });
            }
          }
        }

        if (def.estado !== 'derrucho') {
          partes.push(caja(ancho + 0.5, 0.3, fondo + 0.5, 0, total + 0.1, 0));
          partes.push({
            geometria: new THREE.CylinderGeometry(fondo * 0.62, fondo * 0.62, ancho + 0.5, 12, 1, true, 0, Math.PI),
            matriz: matriz(0, total + 0.25, 0, 0, Math.PI / 2, 0),
          });
        } else {
          partes.push(caja(ancho * 0.4, 0.26, fondo * 0.5, -ancho * 0.2, total + 0.4, fondo * 0.1, 0.3));
        }

        const anchoPuerta = 1.1;
        if (!def.interior) {
          dados.push({ geometria: new THREE.BoxGeometry(anchoPuerta, 2.15, 0.14), matriz: matriz(0, 1.08, fondo / 2 + 0.02) });
        }
        dados.push({ geometria: new THREE.BoxGeometry(anchoPuerta + 0.5, 0.16, 0.3), matriz: matriz(0, 2.24, fondo / 2 + 0.12) });
      }

      if (def.tipo === 'gasolinera') {
        const marquesina = [
          { geometria: new THREE.BoxGeometry(0.5, 5.2, 0.5), matriz: matriz(-4.5, 2.6, fondo / 2 + 6) },
          { geometria: new THREE.BoxGeometry(0.5, 5.2, 0.5), matriz: matriz(4.5, 2.6, fondo / 2 + 6) },
          { geometria: new THREE.BoxGeometry(11, 0.7, 7.2), matriz: matriz(0, 5.4, fondo / 2 + 4) },
          { geometria: new THREE.BoxGeometry(9.4, 0.3, 6.4), matriz: matriz(0, 5.05, fondo / 2 + 4) },
        ];
        const mq = new THREE.Mesh(fusionar(marquesina), M.metal);
        mq.castShadow = true; mq.receiveShadow = true;
        nodo.add(mq);
        const letrero = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 1.2), new THREE.MeshStandardMaterial({
          map: TEX.cartel(['GASOLINERA', 'SERVICIO'], { fondo: '#3a3026', tinta: '#b3a893' }),
          roughness: 0.85, metalness: 0.2, side: THREE.DoubleSide,
        }));
        letrero.position.set(0, 5.9, fondo / 2 + 7.6);
        nodo.add(letrero);
        for (let i = -1; i <= 1; i += 2) {
          const surtidor = new THREE.Mesh(fusionar([
            { geometria: new THREE.BoxGeometry(0.6, 1.7, 0.4), matriz: matriz(0, 0.85, 0) },
            { geometria: new THREE.BoxGeometry(0.66, 0.5, 0.46), matriz: matriz(0, 1.9, 0) },
          ]), M.metal);
          surtidor.position.set(i * 4.2, 0, fondo / 2 + 4.2);
          surtidor.castShadow = true;
          nodo.add(surtidor);
        }
      }

      if (def.tipo === 'tienda') {
        const toldo = new THREE.Mesh(new THREE.BoxGeometry(ancho * 0.8, 0.12, 2.1), M.tela);
        toldo.position.set(0, 2.75, fondo / 2 + 1.0);
        toldo.rotation.x = -0.22;
        toldo.castShadow = true;
        nodo.add(toldo);
        const rotulo = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.0), new THREE.MeshStandardMaterial({
          map: TEX.tienda('C A P I T A N'), roughness: 0.9, side: THREE.DoubleSide,
        }));
        rotulo.position.set(0, 3.7, fondo / 2 + 0.06);
        nodo.add(rotulo);
      }

      if (def.tipo === 'taller') {
        const puerta = new THREE.Mesh(new THREE.BoxGeometry(4.2, 3.0, 0.16), M.metal);
        puerta.position.set(-2.4, 1.5, fondo / 2 + 0.05);
        puerta.rotation.z = 0.08;
        nodo.add(puerta);
        const rampa = new THREE.Mesh(new THREE.BoxGeometry(5, 0.16, 2.4), M.hormigon);
        rampa.position.set(-2.4, 0.08, fondo / 2 + 1.1);
        nodo.add(rampa);
      }

      if (def.interior) {
        construirInterior(nodo, def, y, M, colisiones, _INTERIOR);
      }

      if (partes.length) {
        const cuerpo = new THREE.Mesh(fusionar(partes), materialMuro);
        cuerpo.castShadow = true;
        cuerpo.receiveShadow = true;
        nodo.add(cuerpo);
      }
      if (ventanas.length) {
        const vm = new THREE.Mesh(fusionar(ventanas), M.ventana);
        vm.castShadow = false;
        nodo.add(vm);
      }
      if (dados.length) {
        const dm = new THREE.Mesh(fusionar(dados), M.ventana);
        nodo.add(dm);
      }

      if (def.interior) {
        const cos = Math.cos(def.rot);
        const sen = Math.sin(def.rot);
        const aMundo = function (lx, lz) {
          return { x: def.x + lx * cos + lz * sen, z: def.z - lx * sen + lz * cos };
        };
        const lateral = ancho / 2 + 0.3;
        [-1, 1].forEach(function (lado) {
          const p = aMundo(lado * lateral, 0);
          colisiones.agregarCaja({
            x: p.x, z: p.z, ancho: 0.3, fondo: fondo + 0.3,
            rot: def.rot, alto: total, base: y,
          });
        });
        const trasera = aMundo(0, -(fondo / 2 + 0.15));
        colisiones.agregarCaja({
          x: trasera.x, z: trasera.z, ancho: ancho + 0.3, fondo: 0.3,
          rot: def.rot, alto: total, base: y,
        });
        const huecoPuerta = 1.5;
        const tramo = (ancho + 0.3 - huecoPuerta) / 2;
        [-1, 1].forEach(function (lado) {
          const p = aMundo(lado * (huecoPuerta / 2 + tramo / 2), fondo / 2 + 0.15);
          colisiones.agregarCaja({
            x: p.x, z: p.z, ancho: tramo, fondo: 0.3,
            rot: def.rot, alto: total, base: y,
          });
        });
      } else {
        colisiones.agregarCaja({
          x: def.x, z: def.z, ancho: ancho + 0.3, fondo: fondo + 0.3,
          rot: def.rot, alto: total, base: y, etiqueta: def.tipo,
        });
      }

      nodo.userData.interaccion = def.interior
        ? {
          etiqueta: 'mirar dentro de la casa',
          texto: def.nota || 'Dentro hay una mesa y papeles. El aire está más tibio de lo que debería.',
        }
        : {
          etiqueta: 'entrar en ' + (def.tipo === 'casa' ? 'la casa' : 'el edificio'),
          texto: 'La puerta no cede. Alguien la cerró desde dentro, o la madera ya no da más de sí.',
        };
      colisiones.registrar(nodo);
      interactivos.push(nodo);
    }

    return { grupo: grupo, interactivos: interactivos };
  };
})(window.J = window.J || {});

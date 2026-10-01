(function (J) {
  'use strict';

  const { CONFIG } = J;
  const TEX = J.TEX;
  const { crearPRNG, mezclar } = J.ruido;
  const { fusionar, matriz } = J;

  const EXCESO = 4.0;

  function banda(perfil, estaciones, material, uvFn, colorFn) {
    const n = estaciones.length;
    const m = perfil.length;
    const posiciones = new Float32Array(n * m * 3);
    const uvs = new Float32Array(n * m * 2);
    const colores = colorFn ? new Float32Array(n * m * 3) : null;
    const indices = new Uint32Array((n - 1) * (m - 1) * 6);

    let k = 0;
    for (let j = 0; j < n - 1; j += 1) {
      for (let i = 0; i < m - 1; i += 1) {
        const a = j * m + i;
        indices[k] = a; indices[k + 1] = a + m; indices[k + 2] = a + 1;
        indices[k + 3] = a + 1; indices[k + 4] = a + m; indices[k + 5] = a + m + 1;
        k += 6;
      }
    }

    for (let j = 0; j < n; j += 1) {
      const e = estaciones[j];
      for (let i = 0; i < m; i += 1) {
        const p = perfil[i];
        const x = e.x + e.px * p.d;
        const z = e.z + e.pz * p.d;
        const y = e.y + (p.elevacion === undefined ? 0 : p.elevacion);
        const idx = j * m + i;
        posiciones[idx * 3] = x;
        posiciones[idx * 3 + 1] = y;
        posiciones[idx * 3 + 2] = z;
        const uv = uvFn(x, z, p.d, e.s, e);
        uvs[idx * 2] = uv[0];
        uvs[idx * 2 + 1] = uv[1];
        if (colores) {
          const c = colorFn(x, z, p.d, e);
          colores[idx * 3] = c[0];
          colores[idx * 3 + 1] = c[1];
          colores[idx * 3 + 2] = c[2];
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    if (colores) geo.setAttribute('color', new THREE.BufferAttribute(colores, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    geo.computeVertexNormals();
    geo.computeBoundingSphere();

    const malla = new THREE.Mesh(geo, material);
    malla.receiveShadow = true;
    malla.matrixAutoUpdate = false;
    return malla;
  }

  J.crearCarretera = function crearCarretera(escena, caminos, terreno) {
    const grupo = new THREE.Group();
    grupo.name = 'carreteras';
    escena.add(grupo);

    const matAsfalto = new THREE.MeshStandardMaterial({
      map: TEX.asfalto(),
      vertexColors: true,
      // mas lustroso que mate: de noche, el brillo ancho de los faros
      // sobre una superficie lisa es lo que la hace leer como asfalto
      roughness: 0.52,
      metalness: 0.07,
      dithering: true,
    });

    const matArcén = new THREE.MeshStandardMaterial({
      map: TEX.detalle(),
      vertexColors: true,
      roughness: 0.96,
      metalness: 0,
      dithering: true,
    });

    const colorAux = new THREE.Color();

    function uvAsfalto(x, z, d, s) {
      return [d * 0.24, s * 0.24];
    }

    function colorAsfalto(x, z, d, e) {
      const t = Math.abs(d) / e.medio;
      // el eje algo mas claro que los bordes, como una carretera real
      const brillo = 1.1 - t * t * 0.22;
      const roce = 0.95 + 0.05 * Math.cos(d * 2.1);
      return [brillo * roce, brillo * roce, brillo * roce * 1.01];
    }

    function uvTerreno(x, z) { return [x / 12, z / 12]; }

    function colorArcén(x, z, d) {
      J.colorTerreno(caminos, x, z, 0.05, colorAux);
      return [colorAux.r, colorAux.g, colorAux.b];
    }

    for (const camino of caminos.caminos) {
      const stations = [];
      for (const muestra of camino.muestras) {
        stations.push({
          x: muestra.x, y: muestra.y, z: muestra.z,
          px: muestra.px, pz: muestra.pz,
          tx: muestra.tx, tz: muestra.tz,
          s: muestra.s, medio: camino.medio, camino: camino,
        });
      }

      const perfilAsfalto = [
        { d: -camino.medio, elevacion: 0.0 },
        { d: -camino.medio * 0.5, elevacion: 0.05 },
        { d: 0, elevacion: 0.07 },
        { d: camino.medio * 0.5, elevacion: 0.05 },
        { d: camino.medio, elevacion: 0.0 },
      ];

      const perfilArcén = [
        { d: -(camino.borde + EXCESO) },
        { d: -camino.borde },
        { d: -camino.medio, elevacion: 0.0 },
        { d: camino.medio, elevacion: 0.0 },
        { d: camino.borde },
        { d: camino.borde + EXCESO },
      ];

      function ajustarArcén(estaciones) {
        for (const e of estaciones) {
          for (let i = 0; i < perfilArcén.length; i += 1) {
            const p = perfilArcén[i];
            if (Math.abs(p.d) <= camino.borde) continue;
            const x = e.x + e.px * p.d;
            const z = e.z + e.pz * p.d;
            p.elevacion = terreno.altura(x, z) - e.y;
          }
        }
      }
      ajustarArcén(stations);

      grupo.add(banda(perfilAsfalto, stations, matAsfalto, uvAsfalto, colorAsfalto));
      grupo.add(banda(perfilArcén, stations, matArcén, uvTerreno, colorArcén));
    }

    function gris(v) {
      const n = Math.max(0, Math.min(255, Math.round(v * 255)));
      return (n << 16) | (n << 8) | n;
    }

    // altura del asfalto segun el peralte: la calzada sube 7 cm en el eje y
    // cae hacia los bordes. Marcas y charcos tienen que seguirla o flotan
    // sobre el arcén y se hunden en el centro de la calzada.
    function peralte(medio, d) {
      const t = Math.min(1, Math.abs(d) / medio);
      return 0.07 * (1 - t * t);
    }

    // troceado por distancia: cada bloque se enciende y apaga con
    // histresis para que no parpadee al cruzar el umbral
    const TROCE = 90;
    const LECTURA = 240;
    const APAGADO = 300;
    const bloques = [];

    function crearBloques(items, material) {
      const mapa = new Map();
      for (const it of items) {
        const id = Math.floor(it.s / TROCE);
        if (!mapa.has(id)) mapa.set(id, []);
        mapa.get(id).push(it);
      }
      const contenedor = new THREE.Group();
      mapa.forEach(function (lista) {
        const partes = lista.map(function (it) {
          return { geometria: it.geometria, matriz: it.matriz, color: it.color };
        });
        const malla = new THREE.Mesh(fusionar(partes), material);
        malla.receiveShadow = true;
        let cx = 0; let cz = 0;
        for (const it of lista) { cx += it.x; cz += it.z; }
        malla.userData = { x: cx / lista.length, z: cz / lista.length };
        malla.visible = false;
        bloques.push(malla);
        contenedor.add(malla);
      });
      return contenedor;
    }

    let relojLod = 0;
    function actualizarDetalle(pos, dt) {
      relojLod -= dt;
      if (relojLod > 0) return;
      relojLod = 0.2;
      for (const b of bloques) {
        const dx = b.userData.x - pos.x;
        const dz = b.userData.z - pos.z;
        const d2 = dx * dx + dz * dz;
        if (b.visible) {
          if (d2 > APAGADO * APAGADO) b.visible = false;
        } else if (d2 < LECTURA * LECTURA) b.visible = true;
      }
    }

    function marcas() {
      const rnd = crearPRNG(CONFIG.semilla + 4242);
      const geoCentro = new THREE.PlaneGeometry(1, 1);
      geoCentro.rotateX(-Math.PI / 2);
      const geoBorde = new THREE.PlaneGeometry(1, 1);
      geoBorde.rotateX(-Math.PI / 2);
      const camino = caminos.porId.carretera;
      const items = [];

      function tramo(ini, fin, d, anchoLinea, geo) {
        const pasos = Math.max(1, Math.round((fin - ini) / 4));
        for (let i = 0; i < pasos; i += 1) {
          const s0 = ini + ((fin - ini) * i) / pasos;
          const s1 = ini + ((fin - ini) * (i + 1)) / pasos;
          const a = caminos.puntoEn('carretera', s0);
          const b = caminos.puntoEn('carretera', s1);
          const largo = Math.hypot(b.x - a.x, b.z - a.z);
          if (largo < 0.2) continue;
          const x = (a.x + b.x) / 2 + a.px * d;
          const z = (a.z + b.z) / 2 + a.pz * d;
          const y = (a.y + b.y) / 2 + peralte(camino.medio, d) + 0.012;
          const borde = Math.min(1, Math.max(0, Math.min(s0, camino.longitud - s0) / 40));
          const g = (0.46 + rnd() * 0.46) * (0.5 + borde * 0.5);
          items.push({
            s: (s0 + s1) / 2, x: x, z: z, geometria: geo, color: gris(g),
            matriz: matriz(x, y, z, 0, Math.atan2(b.x - a.x, b.z - a.z), 0, anchoLinea, 1, largo + 0.06),
          });
        }
      }

      for (let s = 24; s < camino.longitud - 24; s += 12) {
        if (rnd() < 0.3) continue;
        tramo(s, s + 3.2, (rnd() - 0.5) * 0.3, 0.1, geoCentro);
      }
      for (let s = 16; s < camino.longitud - 16; s += 6) {
        tramo(s, s + 6, camino.medio * 0.84, 0.085, geoBorde);
        tramo(s, s + 6, -camino.medio * 0.84, 0.085, geoBorde);
      }

      return crearBloques(items, new THREE.MeshStandardMaterial({
        color: 0xb9b6a8, vertexColors: true, roughness: 0.88, metalness: 0.0,
        polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
      }));
    }

    function charcos() {
      const rnd = crearPRNG(CONFIG.semilla + 777);
      const geo = new THREE.CircleGeometry(1, 12);
      geo.rotateX(-Math.PI / 2);
      const camino = caminos.porId.carretera;
      const items = [];
      for (let s = 40; s < camino.longitud - 40; s += 26 + rnd() * 90) {
        const m = caminos.puntoEn('carretera', s);
        const d = (rnd() - 0.5) * camino.medio * 1.1;
        const x = m.x + m.px * d;
        const z = m.z + m.pz * d;
        const r = 0.5 + rnd() * 1.5;
        items.push({
          s: s, x: x, z: z, geometria: geo,
          matriz: matriz(x, m.y + peralte(camino.medio, d) + 0.01, z, 0, rnd() * 3, 0, r, 1, r),
        });
      }
      if (!items.length) return null;
      return crearBloques(items, new THREE.MeshStandardMaterial({
        color: 0x39434b, roughness: 0.2, metalness: 0.04,
        polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      }));
    }

    function senales() {
      const g = new THREE.Group();
      const camino = caminos.porId.carretera;
      const posteMat = new THREE.MeshStandardMaterial({ color: 0x4a4640, roughness: 0.9, metalness: 0.4 });
      const textos = [
        ['CARRETERA', 'DE LA MONTAÑA'],
        ['FIN DEL', 'ASFALTADO'],
        ['PROHIBIDO', 'EL PASO'],
        ['CURVA', 'PRONUNCIADA'],
      ];
      const placas = textos.map(function (lineas, i) {
        return new THREE.MeshStandardMaterial({
          map: TEX.cartel(lineas, { fondo: i === 1 ? '#3a3226' : '#26262a' }),
          color: 0xa8a89c, roughness: 0.74, metalness: 0.18, side: THREE.DoubleSide,
        });
      });
      const geoPoste = new THREE.CylinderGeometry(0.045, 0.05, 2.3, 8);
      const geoPlaca = new THREE.BoxGeometry(0.66, 0.66, 0.035);
      const rnd = crearPRNG(CONFIG.semilla + 3131);
      let i = 0;
      for (let s = 120; s < camino.longitud - 120; s += 240 + rnd() * 190) {
        const m = caminos.puntoEn('carretera', s);
        const lado = rnd() < 0.5 ? -1 : 1;
        const d = (camino.medio + 1.9) * lado;
        const x = m.x + m.px * d;
        const z = m.z + m.pz * d;
        const y = terreno.altura(x, z);
        const poste = new THREE.Mesh(geoPoste, posteMat);
        poste.position.set(x, y + 1.1, z);
        poste.rotation.z = (rnd() - 0.5) * 0.16;
        poste.castShadow = true;
        g.add(poste);
        const placa = new THREE.Mesh(geoPlaca, placas[i % placas.length]);
        placa.position.set(x, y + 2.05, z);
        placa.rotation.y = Math.atan2(m.tx, m.tz) + (rnd() - 0.5) * 0.5;
        placa.rotation.z = (rnd() - 0.5) * 0.3;
        placa.castShadow = true;
        g.add(placa);
        i += 1;
      }
      return g;
    }

    const hitos = crearHitosCarretera(caminos, terreno);
    grupo.add(hitos.grupo);
    grupo.add(marcas());
    const agua = charcos();
    if (agua) grupo.add(agua);
    grupo.add(senales());

    return { grupo: grupo, hitos: hitos, actualizar: actualizarDetalle };
  };

  function crearHitosCarretera(caminos, terreno) {
    const grupo = new THREE.Group();
    const camino = caminos.porId.carretera;
    const posteMat = new THREE.MeshStandardMaterial({ color: 0x3a3128, roughness: 0.95 });
    const reflMat = new THREE.MeshStandardMaterial({
      color: 0x5a1512, roughness: 0.5, emissive: 0x220605, emissiveIntensity: 0.6,
    });
    const geoPoste = new THREE.BoxGeometry(0.09, 0.95, 0.09);
    const geoRefl = new THREE.PlaneGeometry(0.08, 0.11);

    const rnd = crearPRNG(CONFIG.semilla + 909);
    for (let s = 30; s < camino.longitud - 30; s += 34 + rnd() * 22) {
      const muestra = caminos.puntoEn('carretera', s);
      for (let lado = -1; lado <= 1; lado += 2) {
        const d = (camino.medio + 1.3) * lado;
        const x = muestra.x + muestra.px * d;
        const z = muestra.z + muestra.pz * d;
        const y = terreno.altura(x, z);
        const poste = new THREE.Mesh(geoPoste, posteMat);
        poste.position.set(x, y + 0.42, z);
        poste.rotation.y = muestra.t * 0 + (rnd() - 0.5) * 0.5;
        poste.rotation.z = (rnd() - 0.5) * 0.24;
        poste.castShadow = true;
        grupo.add(poste);

        const refl = new THREE.Mesh(geoRefl, reflMat);
        refl.position.set(x, y + 0.78, z);
        refl.rotation.y = Math.atan2(muestra.tx, muestra.tz) + (lado > 0 ? Math.PI / 2 : -Math.PI / 2);
        grupo.add(refl);
      }
    }
    return { grupo: grupo };
  }
})(window.J = window.J || {});

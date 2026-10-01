(function (J) {
  'use strict';

  const { CONFIG } = J;
  const TEX = J.TEX;
  const { crearPRNG, fbm, suave, elegir } = J.ruido;
  const { fusionar, deformar, matriz } = J;

  const ALCANCE = 96;
  const ALCANCE_VEGETACION = 46;
  const PASO = 5.0;
  const RADIO_CERCANO = 44;

  function geometriaArbol(arq, semilla) {
    const rnd = crearPRNG(semilla);
    const partes = [];
    const t = arq.tronco;

    const tronco = new THREE.CylinderGeometry(t.r * 0.52, t.r, t.h, 6, 2, true);
    deformar(tronco, 0.05, 2.2, semilla);
    partes.push({ geometria: tronco, matriz: matriz(0, t.h * 0.5, 0), color: 0x2a241d });

    const base = t.h * 0.92;

    if (arq.ramas) {
      const n = 5 + Math.floor(rnd() * 3);
      for (let i = 0; i < n; i += 1) {
        const largo = t.h * (0.22 + rnd() * 0.3);
        const r = 0.055 + rnd() * 0.05;
        const rama = new THREE.CylinderGeometry(r * 0.35, r, largo, 5, 1, true);
        const ang = rnd() * Math.PI * 2;
        const incl = 0.5 + rnd() * 0.75;
        const m = new THREE.Matrix4();
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(incl, ang, 0, 'YXZ'));
        m.compose(
          new THREE.Vector3(Math.cos(ang) * 0.12, base * (0.45 + rnd() * 0.5), Math.sin(ang) * 0.12),
          q,
          new THREE.Vector3(1, 1, 1)
        );
        partes.push({ geometria: rama, matriz: m, color: 0x35312a });
      }
      partes.push({ geometria: new THREE.ConeGeometry(t.r * 1.1, t.h * 0.12, 5, 1, true), matriz: matriz(0, t.h, 0), color: 0x2f2c24 });
    }

    if (arq.copa) {
      const c = arq.copa;
      if (c.bola) {
        const n = 3;
        for (let i = 0; i < n; i += 1) {
          const r = c.r * (0.62 + rnd() * 0.42);
          const bola = new THREE.IcosahedronGeometry(r, 0);
          deformar(bola, 0.22, 1.1, semilla + i * 17);
          const ang = (i / n) * Math.PI * 2 + rnd();
          partes.push({
            geometria: bola,
            matriz: matriz(
              Math.cos(ang) * c.r * 0.42,
              base + c.h * (0.28 + rnd() * 0.42),
              Math.sin(ang) * c.r * 0.42
            ),
            color: arq.color,
          });
        }
      } else {
        for (let i = 0; i < c.capas; i += 1) {
          const f = i / c.capas;
          const radio = c.r * (1 - f * 0.74);
          const alto = c.h * (0.3 - f * 0.055);
          const cono = new THREE.ConeGeometry(radio, alto, 7, 1, true);
          deformar(cono, 0.13, 1.6, semilla + i * 23);
          partes.push({
            geometria: cono,
            matriz: matriz(
              (rnd() - 0.5) * 0.14,
              base + f * c.h * 0.78 + alto * 0.5,
              (rnd() - 0.5) * 0.14,
              (rnd() - 0.5) * 0.08, rnd() * 3, (rnd() - 0.5) * 0.08
            ),
            color: f < 0.4 ? 0x151f14 : arq.color,
          });
        }
      }
    }

    return fusionar(partes);
  }

  function geometriaArbusto(tipo, semilla) {
    const rnd = crearPRNG(semilla);
    const partes = [];
    const n = tipo.segmentos;
    for (let i = 0; i < n; i += 1) {
      const r = tipo.r * (0.55 + rnd() * 0.5);
      const bola = new THREE.IcosahedronGeometry(r, 0);
      deformar(bola, 0.28, 1.5, semilla + i * 13);
      const ang = (i / n) * Math.PI * 2 + rnd() * 0.9;
      partes.push({
        geometria: bola,
        matriz: matriz(
          Math.cos(ang) * tipo.r * 0.5,
          tipo.h * (0.3 + rnd() * 0.45),
          Math.sin(ang) * tipo.r * 0.5
        ),
        color: tipo.color,
      });
    }
    return fusionar(partes);
  }

  function geometriaRoca(tipo, semilla) {
    const rnd = crearPRNG(semilla);
    const geo = new THREE.IcosahedronGeometry(tipo.r, 0);
    deformar(geo, 0.42, 0.9, semilla);
    const m = new THREE.Matrix4();
    m.compose(
      new THREE.Vector3(0, tipo.r * tipo.escalaY * 0.62, 0),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd() * 0.4, rnd() * 3, rnd() * 0.4)),
      new THREE.Vector3(1, tipo.escalaY, 1)
    );
    const g = geo.clone();
    g.applyMatrix4(m);
    return g;
  }

  J.crearBosque = function crearBosque(escena, caminos, terreno, opciones) {
    const o = opciones || {};
    const grupo = new THREE.Group();
    grupo.name = 'bosque';
    escena.add(grupo);

    const rnd = crearPRNG(CONFIG.semilla);
    const B = J.MAPA.BOSQUE;
    const claros = J.MAPA.CLAROS;
    const edificios = J.MAPA.EDIFICIOS;
    const m = CONFIG.mundo;

    const matMadera = new THREE.MeshStandardMaterial({
      map: TEX.corteza(), vertexColors: true, roughness: 0.97, metalness: 0,
    });
    const matArbusto = new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true,
    });
    const matRoca = new THREE.MeshStandardMaterial({
      color: 0x3a3a34, vertexColors: true, roughness: 0.94, metalness: 0.02, flatShading: true,
    });
    const matHierba = new THREE.MeshLambertMaterial({
      map: TEX.hierba(), alphaTest: 0.42, side: THREE.DoubleSide,
      color: 0x76855f, depthWrite: true,
    });

    const aldeanos = [];
    for (let i = 0; i < B.arquetipos.length; i += 1) aldeanos.push([]);
    const lejanos = [];
    for (let i = 0; i < B.arquetipos.length; i += 1) lejanos.push([]);

    const troncos = [];
    const arbustos = [];
    const ramas = [];
    const hojarasca = [];
    const rocas = [];
    const hierba = [];

    function enClaro(x, z) {
      let factor = 1;
      for (let i = 0; i < claros.length; i += 1) {
        const c = claros[i];
        const dx = (x - c.x) / c.rx;
        const dz = (z - c.z) / c.rz;
        const d = dx * dx + dz * dz;
        if (d < 1) factor = Math.min(factor, 0.22 + d * 0.5);
      }
      return factor;
    }

    function enEdificio(x, z, margen) {
      for (let i = 0; i < edificios.length; i += 1) {
        const e = edificios[i];
        const cos = Math.cos(e.rot);
        const sen = Math.sin(e.rot);
        const dx = x - e.x;
        const dz = z - e.z;
        const lx = Math.abs(dx * cos - dz * sen);
        const lz = Math.abs(dx * sen + dz * cos);
        if (lx < e.ancho * 0.5 + margen && lz < e.fondo * 0.5 + margen) return true;
      }
      return false;
    }

    const rejillaTroncos = new Map();
    const CELDAS_TRONCO = 6;

    function celdaTronco(x, z) {
      return Math.floor(x / CELDAS_TRONCO) + ':' + Math.floor(z / CELDAS_TRONCO);
    }

    function muyCerca(px, pz, minimo) {
      const cx = Math.floor(px / CELDAS_TRONCO);
      const cz = Math.floor(pz / CELDAS_TRONCO);
      const min2 = minimo * minimo;
      for (let ix = cx - 1; ix <= cx + 1; ix += 1) {
        for (let iz = cz - 1; iz <= cz + 1; iz += 1) {
          const grupo = rejillaTroncos.get(ix + ':' + iz);
          if (!grupo) continue;
          for (let i = 0; i < grupo.length; i += 1) {
            const dx = px - grupo[i][0];
            const dz = pz - grupo[i][1];
            if (dx * dx + dz * dz < min2) return true;
          }
        }
      }
      return false;
    }

    function registrarTronco(px, pz) {
      const k = celdaTronco(px, pz);
      let grupo = rejillaTroncos.get(k);
      if (!grupo) { grupo = []; rejillaTroncos.set(k, grupo); }
      grupo.push([px, pz]);
    }

    const pasoCandidato = 2.7;

    for (let z = m.minZ + 6; z < m.maxZ - 6; z += pasoCandidato) {
      for (let x = m.minX + 6; x < m.maxX - 6; x += pasoCandidato) {
        const cerca = caminos.consultar(x, z);
        if (!cerca.camino) continue;
        const d = cerca.d;
        if (d > ALCANCE) continue;
        if (d < cerca.camino.borde + 1.4) continue;

        const dCamino = cerca.camino.borde;
        const dist = d - dCamino;
        const pueblo = z > 352 ? (z > 420 ? 1 : suave(352, 420, z)) : 0;

        const region = fbm(x / 74, z / 74, { octavas: 3, semilla: CONFIG.semilla + 401 });
        const detalle = fbm(x / 21, z / 21, { octavas: 2, semilla: CONFIG.semilla + 419 });
        const claro = enClaro(x, z);

        let densidad = (0.05 + region * 0.3 + detalle * 0.14) * claro;
        if (dist >= B.paredBorde && dist <= B.paredBorde + B.paredAncho) {
          densidad *= B.paredDensidad;
        }
        densidad *= 1 - pueblo * 0.74;
        if (dist < 13) densidad *= 0.18;
        if (rnd() > densidad) continue;
        if (enEdificio(x, z, 4.5)) continue;

        const separacion = 3.0 + (1 - Math.min(1, densidad * 2.6)) * 5.4;
        const px = x + (rnd() - 0.5) * pasoCandidato * 1.6;
        const pz = z + (rnd() - 0.5) * pasoCandidato * 1.6;
        if (muyCerca(px, pz, separacion)) continue;
        registrarTronco(px, pz);

        const edad = fbm(x / 120, z / 120, { octavas: 2, semilla: CONFIG.semilla + 733 });
        const mature = region * 0.6 + edad * 0.6;

        const pool = mature > 0.62 ? B.arquetipos : B.arquetiposClaro;
        const pesos = mature > 0.62 ? B.pesos : B.pesosClaro;
        const arq = elegir(pool, pesos, rnd);
        const indice = (arq.copa ? B.arquetipos : B.arquetiposClaro).indexOf(arq);
        const destino = indice >= 0 ? indice : 0;
        const listaDestino = dist <= RADIO_CERCANO ? aldeanos[destino] : lejanos[destino];

        const escalaBase = (dist < 22 ? 0.8 : 1) * (0.62 + mature * 0.7);
        const escala = escalaBase * (0.86 + rnd() * 0.34);
        const inclinacion = (rnd() - 0.5) * 0.11;
        const alturaTronco = arq.tronco.h * escala;

        listaDestino.push({
          x: px, z: pz, y: terreno.altura(px, pz) - 0.28,
          ry: rnd() * Math.PI * 2,
          s: escala,
          inclinacion: inclinacion,
          d: dist,
        });

        if (arq.tronco.r * escala > 0.14) {
          troncos.push({
            x: px, z: pz,
            r: arq.tronco.r * escala + 0.22,
            alto: alturaTronco * 0.75,
            base: terreno.altura(px, pz),
          });
        }
      }
    }

    for (let z = m.minZ + 6; z < m.maxZ - 6; z += PASO * 0.7) {
      for (let x = m.minX + 6; x < m.maxX - 6; x += PASO * 0.7) {
        const px = x + (rnd() - 0.5) * 3.4;
        const pz = z + (rnd() - 0.5) * 3.4;
        const cerca = caminos.consultar(px, pz);
        if (!cerca.camino) continue;
        const dist = cerca.d - cerca.camino.borde;
        if (dist < 0.4 || dist > ALCANCE_VEGETACION) continue;
        const y = terreno.altura(px, pz);
        const dado = rnd();
        if (dado < 0.44) {
          const t = elegir(B.arbustos, B.pesosArbusto, rnd);
          const s = 0.5 + rnd() * 1.0;
          arbustos.push({ x: px, y: y - 0.1, z: pz, s: s, ry: rnd() * 6.28, t: t });
          // Los matorrales grandes frenan: antes se los atravesaba. Solo
          // los que tienen volumen suficiente, para no crear miles de
          // colisionadores por matas de helecho.
          const radioArbusto = t.r * s;
          if (radioArbusto > 0.52) {
            troncos.push({
              x: px, z: pz, r: radioArbusto * 0.72,
              alto: t.h * s, base: y, etiqueta: 'arbusto',
            });
          }
        } else if (dado < 0.62) {
          const t = elegir(B.rocas, B.pesosRoca, rnd);
          const s = 0.4 + rnd() * 1.0;
          rocas.push({ x: px, y: y - t.r * 0.3, z: pz, s: s, ry: rnd() * 6.28, rx: (rnd() - 0.5) * 0.5, t: t });
          const radioEfectivo = t.r * s;
          if (radioEfectivo > 0.62) {
            troncos.push({
              x: px, z: pz, r: radioEfectivo * 0.82,
              alto: radioEfectivo * 1.5, base: y, etiqueta: 'roca',
            });
          }
        } else if (dado < 0.86) {
          ramas.push({
            x: px, y: y + 0.04, z: pz,
            largo: 1.1 + rnd() * 3.4, radio: 0.045 + rnd() * 0.075,
            ry: rnd() * 6.28, incl: (rnd() - 0.5) * 0.22, ramas: rnd() < 0.5,
          });
        } else {
          hojarasca.push({ x: px, y: y + 0.02, z: pz, s: 0.7 + rnd() * 1.3, ry: rnd() * 6.28 });
        }
      }
    }

    if (o.hierba > 0) {
      const w = B.hierba.ancho;
      const h = B.hierba.alto;
      const pos = new Float32Array([
        -w / 2, 0, 0, w / 2, 0, 0, w / 2, h, 0, -w / 2, h, 0,
        0, 0, -w / 2, 0, 0, w / 2, 0, h, w / 2, 0, h, -w / 2,
      ]);
      const nor = new Float32Array([
        0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
        1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
      ]);
      const uvs = new Float32Array([
        0, 0, 1, 0, 1, 1, 0, 1,
        0, 0, 1, 0, 1, 1, 0, 1,
      ]);
      const cruz = new THREE.BufferGeometry();
      cruz.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      cruz.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      cruz.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
      cruz.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]);
      cruz.computeBoundingSphere();

      for (let z = m.minZ; z < m.maxZ; z += 4) {
        for (let x = m.minX; x < m.maxX; x += 4) {
          const px = x + (rnd() - 0.5) * 4;
          const pz = z + (rnd() - 0.5) * 4;
          const cerca = caminos.consultar(px, pz);
          if (!cerca.camino) continue;
          const dist = cerca.d - cerca.camino.borde;
          if (dist < 0.2 || dist > 20) continue;
          if (rnd() > (1 - dist / 20) * 0.9 * o.hierba + 0.12) continue;
          hierba.push({
            x: px, y: terreno.altura(px, pz) - 0.05, z: pz,
            s: 0.7 + rnd() * 0.8, ry: rnd() * 6.28, d: dist,
          });
        }
      }
      if (hierba.length) {
        const mesh = new THREE.InstancedMesh(cruz, matHierba, hierba.length);
        const mt = new THREE.Matrix4();
        const q = new THREE.Quaternion();
        const e = new THREE.Euler();
        const v = new THREE.Vector3();
        const sc = new THREE.Vector3();
        hierba.forEach(function (h, i) {
          e.set(0, h.ry, 0);
          q.setFromEuler(e);
          v.set(h.x, h.y, h.z);
          sc.set(h.s, h.s * (0.8 + (i % 5) * 0.09), h.s);
          mt.compose(v, q, sc);
          mesh.setMatrixAt(i, mt);
        });
        mesh.instanceMatrix.needsUpdate = true;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false;
        grupo.add(mesh);
      }
    }

    const mallas = [];

    function construirInstancia(geometria, material, lista, conSombra) {
      if (!lista.length) return null;
      const ordenados = lista.slice().sort(function (a, b) { return a.d - b.d; });
      const mesh = new THREE.InstancedMesh(geometria, material, ordenados.length);
      const mt = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const e = new THREE.Euler();
      const v = new THREE.Vector3();
      const sc = new THREE.Vector3();
      ordenados.forEach(function (inst, i) {
        e.set(inst.inclinacion || 0, inst.ry || 0, (inst.inclinacion || 0) * 0.6);
        q.setFromEuler(e);
        v.set(inst.x, inst.y, inst.z);
        if (inst.largo !== undefined) {
          sc.set(inst.radio, inst.radio, inst.largo);
        } else {
          sc.set(inst.s, inst.s, inst.s);
        }
        mt.compose(v, q, sc);
        mesh.setMatrixAt(i, mt);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = conSombra;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      mesh.userData.total = ordenados.length;
      grupo.add(mesh);
      mallas.push(mesh);
      return mesh;
    }

    const matRamas = new THREE.MeshStandardMaterial({
      map: TEX.corteza(), vertexColors: true, roughness: 0.97, metalness: 0,
    });
    const matHoja = new THREE.MeshLambertMaterial({
      map: TEX.hierba(), color: 0x6a5c3a, alphaTest: 0.36, side: THREE.DoubleSide,
    });

    const geoRama = (function () {
      const partes = [];
      const largo = 1;
      partes.push({ geometria: new THREE.CylinderGeometry(0.03, 0.055, largo, 5, 1), matriz: J.matriz(0, 0, largo * 0.5, Math.PI / 2, 0, 0), color: 0x332c22 });
      partes.push({ geometria: new THREE.CylinderGeometry(0.018, 0.03, 0.42, 4, 1), matriz: J.matriz(0.11, 0.05, largo * 0.62, Math.PI / 2.5, 0.6, 0), color: 0x2c261d });
      partes.push({ geometria: new THREE.CylinderGeometry(0.015, 0.026, 0.3, 4, 1), matriz: J.matriz(-0.08, 0.04, largo * 0.34, Math.PI / 2.1, -0.7, 0), color: 0x2c261d });
      return fusionar(partes);
    })();

    const geoHoja = (function () {
      const partes = [];
      const plano = new THREE.PlaneGeometry(1.1, 1.1, 1, 1);
      plano.rotateX(-Math.PI / 2);
      partes.push({ geometria: plano, matriz: J.matriz(0, 0, 0), color: 0xffffff });
      return fusionar(partes);
    })();

    if (ramas.length) {
      construirInstancia(geoRama, matRamas, ramas, false);
    }
    if (hojarasca.length && o.hierba > 0) {
      construirInstancia(geoHoja, matHoja, hojarasca, false);
    }

    for (let i = 0; i < B.arquetipos.length; i += 1) {
      const geo = geometriaArbol(B.arquetipos[i], CONFIG.semilla + 400 + i * 97);
      construirInstancia(geo, matMadera, aldeanos[i], true);
      construirInstancia(geo, matMadera, lejanos[i], false);
    }

    const arbustosPorTipo = {};
    for (const b of arbustos) {
      if (!arbustosPorTipo[b.t.id]) arbustosPorTipo[b.t.id] = [];
      arbustosPorTipo[b.t.id].push(b);
    }
    for (const id in arbustosPorTipo) {
      const lista = arbustosPorTipo[id];
      const tipo = lista[0].t;
      construirInstancia(geometriaArbusto(tipo, CONFIG.semilla + 700), matArbusto, lista, false);
    }

    const rocasPorTipo = {};
    for (const r of rocas) {
      const k = r.t.r;
      if (!rocasPorTipo[k]) rocasPorTipo[k] = [];
      rocasPorTipo[k].push(r);
    }
    for (const clave in rocasPorTipo) {
      const lista = rocasPorTipo[clave];
      construirInstancia(geometriaRoca(lista[0].t, CONFIG.semilla + 800 + clave * 7), matRoca, lista, true);
    }

    return {
      grupo: grupo,
      mallas: mallas,
      troncos: troncos,
      ramas: ramas.length,
      hojarasca: hojarasca.length,
      arboles: aldeanos.reduce(function (a, b) { return a + b.length; }, 0)
        + lejanos.reduce(function (a, b) { return a + b.length; }, 0),
      ajustar(factor) {
        for (let i = 0; i < mallas.length; i += 1) {
          const mesh = mallas[i];
          mesh.count = Math.max(1, Math.round(mesh.userData.total * factor));
        }
      },
    };
  };
})(window.J = window.J || {});

(function (J) {
  'use strict';

  const { fbm, hash2, suave, mezclar } = J.ruido;
  const { CONFIG } = J;
  const TEX = J.TEX;
  const S = CONFIG.semilla;
  const PALETA = TEX.PALETA;

  function alturaNatural(x, z) {
    const grande = (fbm(x / 268, z / 268, { octavas: 3, semilla: S + 11 }) - 0.5) * 11.4;
    const media = (fbm(x / 92, z / 92, { octavas: 3, semilla: S + 29 }) - 0.5) * 3.3;
    const fina = (fbm(x / 27, z / 27, { octavas: 2, semilla: S + 47 }) - 0.5) * 1.05;
    const hondonada = (fbm(x / 620, z / 620, { octavas: 2, semilla: S + 71 }) - 0.5) * 9.0;
    return grande + media + fina + hondonada;
  }

  const c1 = new THREE.Color();
  const c2 = new THREE.Color();

  J.colorTerreno = function colorTerreno(caminos, x, z, inclinacion, salida) {
    const pendiente = inclinacion === undefined ? 0.02 : inclinacion;
    const mancha = fbm(x / 34, z / 34, { octavas: 3, semilla: S + 131 });
    const humedad = fbm(x / 58, z / 58, { octavas: 2, semilla: S + 191 });
    const cerca = caminos.consultar(x, z);
    const dist = cerca.camino ? cerca.d : 9999;
    const borde = cerca.camino ? cerca.camino.borde : 0;
    const grava = 1 - suave(borde - 3.4, borde + 2.6, dist);

    c1.setHex(PALETA.hierba);
    c2.setHex(PALETA.humedo);
    c1.lerp(c2, suave(0.52, 0.24, humedad));
    c2.setHex(PALETA.hojarasca);
    c1.lerp(c2, suave(0.58, 0.86, mancha) * 0.7);
    c2.setHex(PALETA.tierra);
    c1.lerp(c2, suave(0.1, 0.42, pendiente) * 0.85);
    c2.setHex(PALETA.roca);
    c1.lerp(c2, suave(0.24, 0.52, pendiente));
    c2.setHex(PALETA.grava);
    c1.lerp(c2, grava * 0.92);
    return salida ? salida.copy(c1) : c1;
  };

  J.alturaNatural = alturaNatural;

  J.crearTerreno = function crearTerreno(caminos) {
    const m = CONFIG.mundo;
    const cols = Math.round((m.maxX - m.minX) / m.paso);
    const filas = Math.round((m.maxZ - m.minZ) / m.paso);
    const anchoV = cols + 1;
    const altoV = filas + 1;
    const alturas = new Float32Array(anchoV * altoV);

    const indices = new Uint32Array(cols * filas * 6);
    let k = 0;
    for (let j = 0; j < filas; j += 1) {
      for (let i = 0; i < cols; i += 1) {
        const a = j * anchoV + i;
        indices[k] = a; indices[k + 1] = a + anchoV; indices[k + 2] = a + 1;
        indices[k + 3] = a + 1; indices[k + 4] = a + anchoV; indices[k + 5] = a + anchoV + 1;
        k += 6;
      }
    }

    for (let j = 0; j < altoV; j += 1) {
      const z = m.minZ + j * m.paso;
      const pueblo = 1 - 0.74 * suave(320, 490, z);
      for (let i = 0; i < anchoV; i += 1) {
        const x = m.minX + i * m.paso;
        let y = alturaNatural(x, z) * pueblo;
        const cerca = caminos.consultar(x, z);
        if (cerca.camino) {
          const peso = caminos.pesoDeBorde(cerca.camino, cerca.d);
          if (peso > 0) y = mezclar(y * (0.34 + 0.66 * (1 - peso)), cerca.y, peso);
        }
        alturas[j * anchoV + i] = y;
      }
    }

    function altura(x, z) {
      let fi = (x - m.minX) / m.paso;
      let fj = (z - m.minZ) / m.paso;
      if (fi < 0) fi = 0; else if (fi > cols) fi = cols;
      if (fj < 0) fj = 0; else if (fj > filas) fj = filas;
      const i0 = Math.floor(fi);
      const j0 = Math.floor(fj);
      const i1 = i0 + 1 > cols ? cols : i0 + 1;
      const j1 = j0 + 1 > filas ? filas : j0 + 1;
      const tx = fi - i0;
      const tz = fj - j0;
      const fila0 = j0 * anchoV;
      const fila1 = j1 * anchoV;
      const a = alturas[fila0 + i0];
      const b = alturas[fila0 + i1];
      const c = alturas[fila1 + i0];
      const d = alturas[fila1 + i1];
      return mezclar(mezclar(a, b, tx), mezclar(c, d, tx), tz);
    }

    const tmp = new THREE.Vector3();
    function normal(x, z, salida) {
      const out = salida || tmp;
      const e = m.paso;
      return out.set(
        altura(x - e, z) - altura(x + e, z),
        2 * e,
        altura(x, z - e) - altura(x, z + e)
      ).normalize();
    }

    const posiciones = new Float32Array(anchoV * altoV * 3);
    const normales = new Float32Array(anchoV * altoV * 3);
    const uvs = new Float32Array(anchoV * altoV * 2);
    const colores = new Float32Array(anchoV * altoV * 3);
    const c1 = new THREE.Color();
    const c2 = new THREE.Color();

    for (let j = 0; j < altoV; j += 1) {
      const z = m.minZ + j * m.paso;
      for (let i = 0; i < anchoV; i += 1) {
        const x = m.minX + i * m.paso;
        const p = j * anchoV + i;
        posiciones[p * 3] = x;
        posiciones[p * 3 + 1] = alturas[p];
        posiciones[p * 3 + 2] = z;
        uvs[p * 2] = x / 12;
        uvs[p * 2 + 1] = z / 12;

        const iL = Math.max(0, i - 1);
        const iR = Math.min(cols, i + 1);
        const jA = Math.max(0, j - 1);
        const jB = Math.min(filas, j + 1);
        tmp.set(
          alturas[j * anchoV + iL] - alturas[j * anchoV + iR],
          2 * m.paso,
          alturas[jA * anchoV + i] - alturas[jB * anchoV + i]
        ).normalize();
        normales[p * 3] = tmp.x;
        normales[p * 3 + 1] = tmp.y;
        normales[p * 3 + 2] = tmp.z;

        const inclinacion = 1 - tmp.y;
        const mota = 0.86 + hash2(i, j, S) * 0.28;
        J.colorTerreno(caminos, x, z, inclinacion, c1);
        colores[p * 3] = c1.r * mota;
        colores[p * 3 + 1] = c1.g * mota;
        colores[p * 3 + 2] = c1.b * mota;
      }
    }

    const geometria = new THREE.BufferGeometry();
    geometria.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));
    geometria.setAttribute('normal', new THREE.BufferAttribute(normales, 3));
    geometria.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometria.setAttribute('color', new THREE.BufferAttribute(colores, 3));
    geometria.setIndex(new THREE.BufferAttribute(indices, 1));
    geometria.computeBoundingSphere();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: TEX.detalle(),
      roughness: 0.98,
      metalness: 0,
      dithering: true,
    });

    const malla = new THREE.Mesh(geometria, material);
    malla.name = 'terreno';
    malla.receiveShadow = true;
    malla.matrixAutoUpdate = false;
    malla.updateMatrix();

    return {
      malla: malla,
      geometria: geometria,
      alturas: alturas,
      cols: cols,
      filas: filas,
      paso: m.paso,
      altura: altura,
      normal: normal,
      minX: m.minX, maxX: m.maxX, minZ: m.minZ, maxZ: m.maxZ,
    };
  };
})(window.J = window.J || {});

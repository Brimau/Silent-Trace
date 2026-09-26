(function (J) {
  'use strict';

  function sinIndice(g) {
    if (!g.index) return g.clone();
    return g.toNonIndexed();
  }

  J.fusionar = function fusionar(partes) {
    const listas = [];
    let total = 0;
    let conUv = true;
    let conColor = false;

    for (let i = 0; i < partes.length; i += 1) {
      const parte = partes[i];
      const g = sinIndice(parte.geometria);
      if (parte.matriz) g.applyMatrix4(parte.matriz);
      if (!g.attributes.normal) g.computeVertexNormals();
      if (!g.attributes.uv) conUv = false;
      listas.push(g);
      total += g.attributes.position.count;
      if (parte.color !== undefined) conColor = true;
    }

    const posiciones = new Float32Array(total * 3);
    const normales = new Float32Array(total * 3);
    const uvs = conUv ? new Float32Array(total * 2) : null;
    const colores = conColor ? new Float32Array(total * 3) : null;

    let desplazamiento = 0;
    const color = new THREE.Color();
    for (let i = 0; i < listas.length; i += 1) {
      const g = listas[i];
      const n = g.attributes.position.count;
      posiciones.set(g.attributes.position.array.subarray(0, n * 3), desplazamiento * 3);
      normales.set(g.attributes.normal.array.subarray(0, n * 3), desplazamiento * 3);
      if (uvs && g.attributes.uv) uvs.set(g.attributes.uv.array.subarray(0, n * 2), desplazamiento * 2);
      if (colores) {
        const c = partes[i].color === undefined ? 1 : partes[i].color;
        color.set(c);
        for (let v = 0; v < n; v += 1) {
          colores[(desplazamiento + v) * 3] = color.r;
          colores[(desplazamiento + v) * 3 + 1] = color.g;
          colores[(desplazamiento + v) * 3 + 2] = color.b;
        }
      }
      desplazamiento += n;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(normales, 3));
    if (uvs) geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    if (colores) geo.setAttribute('color', new THREE.BufferAttribute(colores, 3));
    geo.computeBoundingSphere();
    return geo;
  };

  J.deformar = function deformar(geometria, cantidad, frecuencia, semilla) {
    const p = geometria.attributes.position;
    const n = geometria.attributes.normal;
    const v = new THREE.Vector3();
    const base = new THREE.Vector3();
    const ruido = J.ruido.ruidoValor;
    for (let i = 0; i < p.count; i += 1) {
      base.set(p.getX(i), p.getY(i), p.getZ(i));
      const largo = base.length() || 1;
      v.set(
        ruido(base.x * frecuencia + 11.3, base.z * frecuencia + base.y * frecuencia * 0.7, semilla),
        ruido(base.y * frecuencia + 41.7, base.x * frecuencia + base.z * frecuencia * 0.6, semilla + 17),
        ruido(base.z * frecuencia + 71.1, base.y * frecuencia + base.x * frecuencia * 0.8, semilla + 31)
      );
      v.multiplyScalar(cantidad * largo);
      p.setXYZ(i, base.x + v.x, base.y + v.y * 0.4, base.z + v.z);
    }
    p.needsUpdate = true;
    geometria.computeVertexNormals();
    void n;
    return geometria;
  };

  J.matriz = function matriz(px, py, pz, rx, ry, rz, sx, sy, sz) {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0));
    m.compose(
      new THREE.Vector3(px || 0, py || 0, pz || 0),
      q,
      new THREE.Vector3(sx === undefined ? 1 : sx, sy === undefined ? (sx === undefined ? 1 : sx) : sy, sz === undefined ? (sx === undefined ? 1 : sx) : sz)
    );
    return m;
  };
})(window.J = window.J || {});

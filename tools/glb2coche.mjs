// Conversor GLB -> formato compacto cargable desde file://
// - Aplica la jerarquia de nodos (transformaciones)
// - Conserva las piezas con nombre por separado (ruedas, volante, faros...)
// - Emite un pivote por pieza para poder animarlas
// - Escribe un .js con base64 porque file:// no permite fetch
import fs from 'node:fs';
import path from 'node:path';

const entrada = process.argv[2];
const destino = process.argv[3] || 'assets';

const buf = fs.readFileSync(entrada);
if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('no es un GLB');

const jsonLen = buf.readUInt32LE(12);
const gltf = JSON.parse(buf.slice(20, 20 + jsonLen).toString('utf8'));
let bin = buf.slice(20 + jsonLen);
if (bin.readUInt32LE(4) === 0x004e4942) bin = bin.slice(8);

const NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
const CS = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };

function leerAccesor(ai) {
  const acc = gltf.accessors[ai];
  const nc = NC[acc.type];
  const Arr = CS[acc.componentType];
  const tam = Arr.BYTES_PER_ELEMENT;
  const vista = gltf.bufferViews[acc.bufferView];
  const inicio = (vista.byteOffset || 0) + (acc.byteOffset || 0);
  const paso = vista.byteStride || nc * tam;
  const salida = new Arr(acc.count * nc);
  for (let i = 0; i < acc.count; i += 1) {
    const base = inicio + i * paso;
    for (let c = 0; c < nc; c += 1) {
      const dv = new DataView(bin.buffer, bin.byteOffset + base + c * tam, tam);
      salida[i * nc + c] = acc.componentType === 5126 ? dv.getFloat32(0, true)
        : acc.componentType === 5125 ? dv.getUint32(0, true)
        : acc.componentType === 5123 ? dv.getUint16(0, true)
        : acc.componentType === 5122 ? dv.getInt16(0, true)
        : acc.componentType === 5121 ? dv.getUint8(0)
        : dv.getInt8(0);
    }
  }
  return salida;
}

const mul = (a, b) => {
  const o = new Array(16);
  for (let c = 0; c < 4; c += 1) for (let r = 0; r < 4; r += 1) {
    let s = 0;
    for (let k = 0; k < 4; k += 1) s += a[k * 4 + r] * b[c * 4 + k];
    o[c * 4 + r] = s;
  }
  return o;
};
const ident = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

function matrizNodo(nd) {
  if (nd.matrix) return nd.matrix.slice();
  const t = nd.translation || [0, 0, 0];
  const r = nd.rotation || [0, 0, 0, 1];
  const s = nd.scale || [1, 1, 1];
  const [x, y, z, w] = r;
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2;
  const yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;
  return [
    (1 - (yy + zz)) * s[0], (xy + wz) * s[0], (xz - wy) * s[0], 0,
    (xy - wz) * s[1], (1 - (xx + zz)) * s[1], (yz + wx) * s[1], 0,
    (xz + wy) * s[2], (yz - wx) * s[2], (1 - (xx + yy)) * s[2], 0,
    t[0], t[1], t[2], 1,
  ];
}

const mundo = new Map();
(function recorrer(i, padre) {
  const m = mul(padre, matrizNodo(gltf.nodes[i]));
  mundo.set(i, m);
  for (const c of (gltf.nodes[i].children || [])) recorrer(c, m);
})(gltf.scenes[0].nodes[0], ident);

const aplicar = (m, x, y, z) => [
  m[0] * x + m[4] * y + m[8] * z + m[12],
  m[1] * x + m[5] * y + m[9] * z + m[13],
  m[2] * x + m[6] * y + m[10] * z + m[14],
];

// --- 1. collecting pieces with their world bbox ---
const piezas = [];
let minG = [Infinity, Infinity, Infinity];
let maxG = [-Infinity, -Infinity, -Infinity];

for (let i = 0; i < gltf.nodes.length; i += 1) {
  const nd = gltf.nodes[i];
  if (nd.mesh === undefined || !mundo.has(i)) continue;
  const m = mundo.get(i);
  const bruto = nd.name || 'pieza' + i;
  // los nombres vienen como <pieza>_<material>_<n>: se recorta el sufijo
  let nombre = bruto;
  const primera = (gltf.meshes[nd.mesh].primitives && gltf.meshes[nd.mesh].primitives[0]) || null;
  const matN = primera && primera.material !== undefined ? gltf.materials[primera.material] : null;
  if (matN && matN.name) {
    const sufijo = '_' + matN.name;
    if (nombre.indexOf(sufijo) > 0) nombre = nombre.slice(0, nombre.indexOf(sufijo));
  }
  const caja = { nodo: i, nombre, mat: -1, min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity], primos: [] };
  for (const p of gltf.meshes[nd.mesh].primitives) {
    if (p.mode !== undefined && p.mode !== 4) continue;
    if (p.attributes.POSITION === undefined) continue;
   caja.mat = p.material === undefined ? -1 : p.material;
   caja.primos.push(p);
    const pos = leerAccesor(p.attributes.POSITION);
    for (let k = 0; k < pos.length; k += 3) {
      const w = aplicar(m, pos[k], pos[k + 1], pos[k + 2]);
      for (let a = 0; a < 3; a += 1) {
        if (w[a] < caja.min[a]) caja.min[a] = w[a];
        if (w[a] > caja.max[a]) caja.max[a] = w[a];
        if (w[a] < minG[a]) minG[a] = w[a];
        if (w[a] > maxG[a]) maxG[a] = w[a];
      }
    }
  }
  if (caja.primos.length) piezas.push(caja);
}

// --- 2. orientation: longest axis = length, shortest of the rest = up ---
const tam = [maxG[0] - minG[0], maxG[1] - minG[1], maxG[2] - minG[2]];
const ejeLargo = tam.indexOf(Math.max(...tam));
const otros = [0, 1, 2].filter((a) => a !== ejeLargo);
const ejeArriba = otros[tam[otros[0]] < tam[otros[1]] ? 0 : 1];
const ejeLateral = otros.find((a) => a !== ejeArriba);

// reorient to X=length, Y=up, Z=lateral  (permutation + sign)
const perm = { 0: [0, 1, 2], 1: [2, 0, 1], 2: [1, 2, 0] }[ejeLargo];
const reorientar = (x, y, z) => {
  const v = [x, y, z];
  const out = [v[perm[0]], v[perm[1]], v[perm[2]]];
  // ensure Y up is positive: flip all if the mass is below
  return out;
};

// --- 3. build geometry per piece, reoriented, pivoted on its own centre ---
const partes = [];
let bytes = 0;
const trozos = [];

for (const pz of piezas) {
  const centro = [
    (pz.min[0] + pz.max[0]) / 2,
    (pz.min[1] + pz.max[1]) / 2,
    (pz.min[2] + pz.max[2]) / 2,
  ];
  const pos = [], nrm = [], uv = [], idx = [];
  for (const p of pz.primos) {
    const m = mundo.get(pz.nodo);
    const P = leerAccesor(p.attributes.POSITION);
    const N = p.attributes.NORMAL !== undefined ? leerAccesor(p.attributes.NORMAL) : null;
    const T = p.attributes.TEXCOORD_0 !== undefined ? leerAccesor(p.attributes.TEXCOORD_0) : null;
    const I = p.indices !== undefined ? leerAccesor(p.indices) : null;
    const base = pos.length / 3;
    for (let k = 0; k < P.length; k += 3) {
      let w = aplicar(m, P[k], P[k + 1], P[k + 2]);
      w = reorientar(w[0], w[1], w[2]);
      pos.push(w[0] - centro[0], w[1] - centro[1], w[2] - centro[2]);
      if (N) {
        const nx = m[0] * N[k] + m[4] * N[k + 1] + m[8] * N[k + 2];
        const ny = m[1] * N[k] + m[5] * N[k + 1] + m[9] * N[k + 2];
        const nz = m[2] * N[k] + m[6] * N[k + 1] + m[10] * N[k + 2];
        const r = reorientar(nx, ny, nz);
        const l = Math.hypot(r[0], r[1], r[2]) || 1;
        nrm.push(r[0] / l, r[1] / l, r[2] / l);
      } else nrm.push(0, 1, 0);
      uv.push(T ? T[(k / 3) * 2] : 0, T ? T[(k / 3) * 2 + 1] : 0);
    }
    if (I) for (let k = 0; k < I.length; k += 1) idx.push(I[k] + base);
    else for (let k = 0; k < P.length / 3; k += 1) idx.push(k + base);
  }
  if (!idx.length) continue;
  const off = bytes;
  const aPos = new Float32Array(pos);
  const aNrm = new Float32Array(nrm);
  const aUv = new Float32Array(uv);
  const aIdx = new Uint32Array(idx);
  trozos.push(new Uint8Array(aPos.buffer), new Uint8Array(aNrm.buffer), new Uint8Array(aUv.buffer), new Uint8Array(aIdx.buffer));
  bytes += aPos.byteLength + aNrm.byteLength + aUv.byteLength + aIdx.byteLength;
  partes.push({
    n: pz.nombre,
    m: pz.mat,
    pos: off,
    nrm: off + aPos.byteLength,
    uv: off + aPos.byteLength + aNrm.byteLength,
    idx: off + aPos.byteLength + aNrm.byteLength + aUv.byteLength,
    v: aPos.length / 3,
    t: aIdx.length / 3,
    piv: centro.map((v) => +v.toFixed(5)),
  });
}

const blob = Buffer.concat(trozos);

// --- 4. textures: not extracted ---
// file:// blocks external images (cross-origin taint on texSubImage2D), and
// these atlases add 7 MB. Materials are rebuilt procedurally at runtime.
const texturas = [];

// --- 5. materials (metadata only; the runtime rebuilds them) ---
const materiales = (gltf.materials || []).map((m, i) => {
  const p = m.pbrMetallicRoughness || {};
  const c = p.baseColorFactor || [1, 1, 1, 1];
  return {
    i,
    nombre: m.name || `mat${i}`,
    color: c.map((v) => +(+v).toFixed(4)),
    metal: p.metallicFactor === undefined ? 1 : +p.metallicFactor,
    rough: p.roughnessFactor === undefined ? 1 : +p.roughnessFactor,
    textura: p.baseColorTexture !== undefined ? texturas[p.baseColorTexture.index] : null,
    doble: !!m.doubleSided,
    blend: m.alphaMode === 'BLEND' || c[3] < 1,
    alfa: +c[3].toFixed(3),
  };
});

// --- 6. box reoriented, for placement ---
let rMin = [Infinity, Infinity, Infinity];
let rMax = [-Infinity, -Infinity, -Infinity];
for (let x = minG[0]; x <= maxG[0]; x += (maxG[0] - minG[0]) / 8) {
  for (let y = minG[1]; y <= maxG[1]; y += (maxG[1] - minG[1]) / 8) {
    for (let z = minG[2]; z <= maxG[2]; z += (maxG[2] - minG[2]) / 8) {
      const r = reorientar(x, y, z);
      for (let a = 0; a < 3; a += 1) {
        if (r[a] < rMin[a]) rMin[a] = r[a];
        if (r[a] > rMax[a]) rMax[a] = r[a];
      }
    }
  }
}

const meta = { partes, materiales, bytes, caja: { min: rMin, max: rMax } };
fs.mkdirSync(destino, { recursive: true });
fs.writeFileSync(path.join(destino, 'coche.js'),
  `/* Generado por tools/glb2coche.mjs - no editar a mano */
(function (raiz) {
  raiz.COCHE = { meta: ${JSON.stringify(meta)}, b64: "${blob.toString('base64')}" };
})(window.J = window.J || {});
`);

console.log('piezas       :', partes.length);
console.log('triangulos   :', partes.reduce((a, p) => a + p.t, 0));
console.log('vertices     :', partes.reduce((a, p) => a + p.v, 0));
console.log('bytes geo    :', bytes);
console.log('texturas     :', texturas.filter(Boolean).length);
console.log('coche.js     :', (fs.statSync(path.join(destino, 'coche.js')).size / 1048576).toFixed(2), 'MB');
console.log('eje largo    :', 'XYZ'[ejeLargo], '=', tam[ejeLargo].toFixed(2));
console.log('eje arriba   :', 'XYZ'[ejeArriba], '=', tam[ejeArriba].toFixed(2));
console.log('eje lateral  :', 'XYZ'[ejeLateral], '=', tam[ejeLateral].toFixed(2));
console.log('caja rotada  : min', rMin.map((v) => v.toFixed(2)).join(','), 'max', rMax.map((v) => v.toFixed(2)).join(','));
console.log('\npiezas:');
partes.forEach((p) => console.log('  ', p.n.padEnd(30), 'mat', String(p.m).padStart(2), 'tris', String(p.t).padStart(5), 'piv', p.piv.map((v) => v.toFixed(2)).join(',')));

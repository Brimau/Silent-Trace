(function (J) {
  'use strict';

  function base64ABin(b64) {
    const bytes = new Uint8Array(Math.floor((b64.length * 3) / 4));
    let pos = 0;
    const trozo = 4 * 8192;
    for (let i = 0; i < b64.length; i += trozo) {
      const bin = atob(b64.slice(i, Math.min(i + trozo, b64.length)));
      for (let j = 0; j < bin.length; j += 1) bytes[pos++] = bin.charCodeAt(j);
    }
    return bytes;
  }

  function clavePieza(nombre) {
    return String(nombre);
  }

  J.cargarCoche = function cargarCoche(base, opciones) {
    const cfg = opciones || {};
    void cfg;
    const raiz = new THREE.Group();
    raiz.name = 'coche';
    const info = {
      raiz: raiz,
      piezas: {},
      lista: [],
      materiales: [],
      porNombre: {},
      buscar: function (clave) {
        const exacta = 'Murphy92_' + clave;
        for (const nombre in info.porNombre) {
          if (nombre === exacta) return info.porNombre[nombre];
        }
        for (const nombre in info.porNombre) {
          if (nombre.indexOf(exacta) >= 0) return info.porNombre[nombre];
        }
        return null;
      },
      malla: function (fragmento) {
        const g = info.buscar(fragmento);
        return g && g.children.length ? g.children[0] : null;
      },
    };
    if (!base || !base.meta) return info;

    const bytes = base64ABin(base.b64);
    const f32 = new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4);
    const u32 = new Uint32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4);

    const mats = [];
    for (const def of base.meta.materiales) {
      const c = def.color;
      // sin baseColorFactor el glTF deja el factor a 1 (blanco): se modera
      const sinColor = c[0] === 1 && c[1] === 1 && c[2] === 1;
      const m = new THREE.MeshStandardMaterial({
        color: new THREE.Color(sinColor ? 0.5 : c[0], sinColor ? 0.5 : c[1], sinColor ? 0.5 : c[2]),
        metalness: def.metal,
        roughness: def.rough,
        side: def.doble ? THREE.DoubleSide : THREE.FrontSide,
      });
      if (def.blend) { m.transparent = true; m.opacity = def.alfa; m.depthWrite = false; }
      // Las texturas del GLB no se usan: file:// las bloquea por CORS.
      // vehiculo.js reasigna los materiales por pieza.
      mats.push(m);
      info.materiales.push(m);
    }

    for (const p of base.meta.partes) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(f32.slice(p.pos / 4, p.pos / 4 + p.v * 3), 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(f32.slice(p.nrm / 4, p.nrm / 4 + p.v * 3), 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(f32.slice(p.uv / 4, p.uv / 4 + p.v * 2), 2));
      geo.setIndex(new THREE.BufferAttribute(u32.slice(p.idx / 4, p.idx / 4 + p.t * 3), 1));
      geo.computeBoundingSphere();

      const soporte = new THREE.Group();
      soporte.name = p.n;
      soporte.position.set(p.piv[0], p.piv[1], p.piv[2]);
      const malla = new THREE.Mesh(geo, mats[p.m] || mats[0]);
      malla.castShadow = cfg.sombras !== false;
      malla.receiveShadow = cfg.sombras !== false;
      soporte.add(malla);
      raiz.add(soporte);

      info.piezas[clavePieza(p.n)] = soporte;
      info.porNombre[p.n] = soporte;
      info.lista.push(soporte);
    }

    info.caja = base.meta.caja;
    return info;
  };
})(window.J = window.J || {});

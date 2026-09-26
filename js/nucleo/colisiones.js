(function (J) {
  'use strict';

  const TAMANIO_CELDA = 10;

  J.crearColisiones = function crearColisiones(terreno) {
    const cajas = [];
    const interactivos = new Set();
    const rejilla = new Map();
    const vacio = [];

    function clave(ix, iz) { return ix + ',' + iz; }

    function agregarCaja(datos) {
      const rot = datos.rot || 0;
      const caja = {
        cx: datos.x,
        cz: datos.z,
        hx: (datos.ancho || 1) * 0.5,
        hz: (datos.fondo || 1) * 0.5,
        alto: datos.alto === undefined ? 4 : datos.alto,
        base: datos.base || 0,
        rot,
        cos: Math.cos(rot),
        sen: Math.sin(rot),
        redondo: datos.redondo === true,
        radio: datos.radio || ((datos.ancho || 1) * 0.5),
        etiqueta: datos.etiqueta || null,
        id: datos.id || null,
        ref: datos.ref || null,
      };
      cajas.push(caja);

      const alcance = caja.redondo ? caja.radio + 0.6 : Math.hypot(caja.hx, caja.hz) + 0.6;
      const x0 = Math.floor((caja.cx - alcance) / TAMANIO_CELDA);
      const x1 = Math.floor((caja.cx + alcance) / TAMANIO_CELDA);
      const z0 = Math.floor((caja.cz - alcance) / TAMANIO_CELDA);
      const z1 = Math.floor((caja.cz + alcance) / TAMANIO_CELDA);
      for (let ix = x0; ix <= x1; ix += 1) {
        for (let iz = z0; iz <= z1; iz += 1) {
          const k = clave(ix, iz);
          let cubo = rejilla.get(k);
          if (!cubo) { cubo = []; rejilla.set(k, cubo); }
          cubo.push(caja);
        }
      }
      return caja;
    }

    function candidatos(x, z) {
      return rejilla.get(clave(Math.floor(x / TAMANIO_CELDA), Math.floor(z / TAMANIO_CELDA))) || vacio;
    }

    function resolverCaja(pos, radio, caja) {
      if (caja.redondo) {
        const dx = pos.x - caja.cx;
        const dz = pos.z - caja.cz;
        const suma = caja.radio + radio;
        const d2 = dx * dx + dz * dz;
        if (d2 > suma * suma) return false;
        const d = Math.sqrt(d2);
        if (d < 1e-5) {
          pos.x += suma;
          return true;
        }
        const empuje = (suma - d) / d;
        pos.x += dx * empuje;
        pos.z += dz * empuje;
        return true;
      }

      const dx = pos.x - caja.cx;
      const dz = pos.z - caja.cz;
      const lx = dx * caja.cos - dz * caja.sen;
      const lz = dx * caja.sen + dz * caja.cos;
      const px = lx < -caja.hx ? -caja.hx : (lx > caja.hx ? caja.hx : lx);
      const pz = lz < -caja.hz ? -caja.hz : (lz > caja.hz ? caja.hz : lz);
      const ex = lx - px;
      const ez = lz - pz;
      const d2 = ex * ex + ez * ez;
      if (d2 > radio * radio) return false;

      let nx;
      let nz;
      let penetracion;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        nx = ex / d;
        nz = ez / d;
        penetracion = radio - d;
      } else {
        const sobreX = caja.hx - (lx < 0 ? -lx : lx);
        const sobreZ = caja.hz - (lz < 0 ? -lz : lz);
        if (sobreX < sobreZ) { nx = lx < 0 ? -1 : 1; nz = 0; penetracion = sobreX + radio; }
        else { nx = 0; nz = lz < 0 ? -1 : 1; penetracion = sobreZ + radio; }
      }

      pos.x += (nx * caja.cos + nz * caja.sen) * penetracion;
      pos.z += (-nx * caja.sen + nz * caja.cos) * penetracion;
      return true;
    }

    function resolver(pos, radio, alturaPies) {
      let golpeo = false;
      for (let vuelta = 0; vuelta < 3; vuelta += 1) {
        const lista = candidatos(pos.x, pos.z);
        let toco = false;
        for (let i = 0; i < lista.length; i += 1) {
          const caja = lista[i];
          if (alturaPies + 1.75 < caja.base || alturaPies - 0.3 > caja.base + caja.alto) continue;
          if (resolverCaja(pos, radio, caja)) { toco = true; golpeo = true; }
        }
        if (!toco) break;
      }
      return golpeo;
    }

    function agregarTroncos(lista) {
      for (let i = 0; i < lista.length; i += 1) {
        const t = lista[i];
        agregarCaja({
          x: t.x, z: t.z, radio: t.r, alto: t.alto, base: t.base,
          redondo: true, etiqueta: t.etiqueta || 'tronco',
        });
      }
    }

    function puntoSolido(x, z) {
      const lista = candidatos(x, z);
      for (let i = 0; i < lista.length; i += 1) {
        const c = lista[i];
        if (c.redondo) {
          const dx = x - c.cx;
          const dz = z - c.cz;
          if (dx * dx + dz * dz < c.radio * c.radio) return c;
          continue;
        }
        const dx = x - c.cx;
        const dz = z - c.cz;
        const lx = dx * c.cos - dz * c.sen;
        const lz = dx * c.sen + dz * c.cos;
        if (lx > -c.hx && lx < c.hx && lz > -c.hz && lz < c.hz) return c;
      }
      return null;
    }

    const raycaster = new THREE.Raycaster();

    function apuntar(origen, direccion, distancia) {
      raycaster.set(origen, direccion);
      raycaster.far = distancia;
      const blancos = [];
      for (const obj of interactivos) {
        if (obj.visible && !obj.userData.sinPicking) blancos.push(obj);
      }
      if (blancos.length === 0) return null;
      const impactos = raycaster.intersectObjects(blancos, true);
      for (let i = 0; i < impactos.length; i += 1) {
        const impacto = impactos[i];
        let nodo = impacto.object;
        while (nodo && !nodo.userData.interaccion) nodo = nodo.parent;
        if (nodo) {
          return { nodo: nodo, punto: impacto.point, distancia: impacto.distance, objeto: impacto.object };
        }
      }
      return null;
    }

    return {
      cajas,
      agregarCaja,
      agregarTroncos,
      resolver,
      puntoSolido,
      apuntar,
      registrar(objeto) { interactivos.add(objeto); },
      quitar(objeto) { interactivos.delete(objeto); },
      alturaSuelo(x, z) { return terreno.altura(x, z); },
      normalSuelo(x, z) { return terreno.normal(x, z); },
      get total() { return cajas.length; },
    };
  };
})(window.J = window.J || {});

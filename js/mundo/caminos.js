(function (J) {
  'use strict';

  const { suave, mezclar } = J.ruido;
  const { CARRETERA, CALLES } = J.MAPA;

  const PASO_MUESTREO = 1.2;
  const CUBO_Z = 4;
  const VENTANA = 3;
  const TALUD = 16;

  function construir(def) {
    const puntos = def.puntos.map(function (p) { return new THREE.Vector3(p.x, p.y, p.z); });
    const curva = new THREE.CatmullRomCurve3(puntos, false, 'catmullrom', 0.5);
    const longitud = curva.getLength();
    const n = Math.max(2, Math.round(longitud / PASO_MUESTREO));
    const arcun = def.arcun === undefined ? 1.4 : def.arcun;
    const camino = {
      id: def.id,
      ancho: def.ancho,
      arcun: arcun,
      medio: def.ancho * 0.5 + arcun,
      curva: curva,
      longitud: longitud,
      muestras: [],
      inicio: 0,
      fin: 0,
    };
    camino.verde = camino.medio + (def.verge === undefined ? 4.0 : def.verge);
    camino.borde = camino.medio + (def.verge === undefined ? 4.0 : def.verge);

    const t3 = new THREE.Vector3();
    const p3 = new THREE.Vector3();
    for (let i = 0; i <= n; i += 1) {
      const t = i / n;
      curva.getPoint(t, p3);
      curva.getTangent(t, t3).normalize();
      const muestra = {
        camino: camino,
        x: p3.x, y: p3.y, z: p3.z,
        tx: t3.x, tz: t3.z,
        px: -t3.z, pz: t3.x,
        s: t * longitud,
        t: t,
        global: 0,
      };
      camino.muestras.push(muestra);
    }
    return camino;
  }

  J.crearCaminos = function crearCaminos() {
    const caminos = [CARRETERA].concat(CALLES).map(construir);
    const porId = {};
    for (const camino of caminos) porId[camino.id] = camino;

    const muestras = [];
    const indice = new Map();
    for (const camino of caminos) {
      camino.inicio = muestras.length;
      for (const muestra of camino.muestras) {
        muestra.global = muestras.length;
        muestras.push(muestra);
        const cubo = Math.floor(muestra.z / CUBO_Z);
        let lista = indice.get(cubo);
        if (!lista) { lista = []; indice.set(cubo, lista); }
        lista.push(muestra);
      }
      camino.fin = muestras.length - 1;
    }

    const buffer = new Array(256);
    let bufferN = 0;

    function llenarRegion(z) {
      const base = Math.floor(z / CUBO_Z);
      bufferN = 0;
      for (let c = base - VENTANA; c <= base + VENTANA; c += 1) {
        const grupo = indice.get(c);
        if (!grupo) continue;
        for (let i = 0; i < grupo.length; i += 1) {
          if (bufferN >= buffer.length) return;
          buffer[bufferN] = grupo[i];
          bufferN += 1;
        }
      }
    }

    function refinar(muestra, x, z) {
      const camino = muestra.camino;
      let mejorD = Infinity;
      let mejorY = 0;
      let mejorS = 0;
      const desde = Math.max(camino.inicio, muestra.global - 8);
      const hasta = Math.min(camino.fin, muestra.global + 8);
      for (let i = desde; i <= hasta; i += 1) {
        const a = muestras[i];
        const b = muestras[i + 1];
        if (!b) break;
        const ex = b.x - a.x;
        const ez = b.z - a.z;
        const largo2 = ex * ex + ez * ez;
        let t = largo2 > 1e-9 ? ((x - a.x) * ex + (z - a.z) * ez) / largo2 : 0;
        if (t < 0) t = 0; else if (t > 1) t = 1;
        const px = a.x + ex * t;
        const pz = a.z + ez * t;
        const dx = x - px;
        const dz = z - pz;
        const d = dx * dx + dz * dz;
        if (d < mejorD) {
          mejorD = d;
          mejorY = mezclar(a.y, b.y, t);
          mejorS = mezclar(a.s, b.s, t);
        }
      }
      return { d: Math.sqrt(mejorD), y: mejorY, s: mejorS };
    }

    function semillaDe(camino, x, z) {
      let mejor = Infinity;
      let elegida = camino.muestras[0];
      for (let i = 0; i < bufferN; i += 1) {
        if (buffer[i].camino !== camino) continue;
        const dx = x - buffer[i].x;
        const dz = z - buffer[i].z;
        const d = dx * dx + dz * dz;
        if (d < mejor) { mejor = d; elegida = buffer[i]; }
      }
      return elegida;
    }

    const consulta = { camino: null, d: Infinity, y: 0, s: 0 };

    function consultar(x, z) {
      llenarRegion(z);
      if (bufferN === 0) {
        consulta.camino = null;
        consulta.d = Infinity;
        return consulta;
      }
      let mejor = Infinity;
      let mejorMuestra = buffer[0];
      for (let i = 0; i < bufferN; i += 1) {
        const dx = x - buffer[i].x;
        const dz = z - buffer[i].z;
        const d = dx * dx + dz * dz;
        if (d < mejor) { mejor = d; mejorMuestra = buffer[i]; }
      }
      let caminoPrevio = null;
      let resultado = null;
      for (let i = 0; i < bufferN; i += 1) {
        const camino = buffer[i].camino;
        if (camino === caminoPrevio) continue;
        caminoPrevio = camino;
        const semilla = buffer[i] === mejorMuestra ? mejorMuestra : semillaDe(camino, x, z);
        const refinado = refinar(semilla, x, z);
        if (!resultado || refinado.d < resultado.d) {
          resultado = { camino: camino, d: refinado.d, y: refinado.y, s: refinado.s };
        }
      }
      consulta.camino = resultado.camino;
      consulta.d = resultado.d;
      consulta.y = resultado.y;
      consulta.s = resultado.s;
      return consulta;
    }

    function pesoDeBorde(camino, d) {
      if (!camino) return 0;
      if (d <= camino.borde) return 1;
      return 1 - suave(camino.borde, camino.borde + TALUD, d);
    }

    function puntoEn(id, s) {
      const camino = porId[id];
      if (!camino) return null;
      const objetivo = s < 0 ? 0 : (s > camino.longitud ? camino.longitud : s);
      let mejor = camino.muestras[0];
      let diferencia = Infinity;
      for (const muestra of camino.muestras) {
        const d = Math.abs(muestra.s - objetivo);
        if (d < diferencia) { diferencia = d; mejor = muestra; }
      }
      return mejor;
    }

    function resolverAncla(ancla) {
      if (ancla.camino) {
        const muestra = puntoEn(ancla.camino, ancla.s);
        if (!muestra) return { x: 0, z: 0, rot: 0 };
        const lado = ancla.lado === undefined ? 1 : ancla.lado;
        const offset = ancla.offset || 0;
        return {
          x: muestra.x + muestra.px * offset * lado,
          z: muestra.z + muestra.pz * offset * lado,
          rot: Math.atan2(muestra.tx, muestra.tz) + (ancla.perpendicular ? Math.PI / 2 : 0),
        };
      }
      return { x: ancla.x, z: ancla.z, rot: ancla.rot || 0 };
    }

    return {
      caminos: caminos,
      porId: porId,
      consultar: consultar,
      pesoDeBorde: pesoDeBorde,
      puntoEn: puntoEn,
      resolverAncla: resolverAncla,
      talud: TALUD,
    };
  };
})(window.J = window.J || {});

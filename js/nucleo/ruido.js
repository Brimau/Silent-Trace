(function (J) {
  'use strict';

  function crearPRNG(semilla) {
    let a = semilla >>> 0;
    return function siguiente() {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hash2(ix, iy, semilla) {
    const s = semilla || 0;
    let h = Math.imul(ix | 0, 374761393) ^ Math.imul(iy | 0, 668265263) ^ Math.imul(s | 0, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  function hash3(ix, iy, iz, semilla) {
    const s = semilla || 0;
    let h = Math.imul(ix | 0, 374761393) ^ Math.imul(iy | 0, 668265263)
      ^ Math.imul(iz | 0, 2147483647) ^ Math.imul(s | 0, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  function smoother(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  function ruidoValor(x, y, semilla) {
    const s = semilla || 0;
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = smoother(x - ix);
    const fy = smoother(y - iy);
    const a = hash2(ix, iy, s);
    const b = hash2(ix + 1, iy, s);
    const c = hash2(ix, iy + 1, s);
    const d = hash2(ix + 1, iy + 1, s);
    return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
  }

  function fbm(x, y, opciones) {
    const o = opciones || {};
    const octavas = o.octavas || 4;
    const frecuencia = o.frecuencia || 1;
    const lacunaridad = o.lacunaridad || 2.03;
    const ganancia = o.ganancia || 0.5;
    const semilla = o.semilla || 0;
    let suma = 0;
    let amplitud = 1;
    let normalizacion = 0;
    let f = frecuencia;
    for (let i = 0; i < octavas; i += 1) {
      suma += ruidoValor(x * f, y * f, semilla + i * 131) * amplitud;
      normalizacion += amplitud;
      amplitud *= ganancia;
      f *= lacunaridad;
    }
    return suma / normalizacion;
  }

  function suave(borde0, borde1, x) {
    const t = Math.max(0, Math.min(1, (x - borde0) / (borde1 - borde0)));
    return t * t * (3 - 2 * t);
  }

  function envolver(v, periodo) {
    return ((v % periodo) + periodo) % periodo;
  }

  function ruidoValorPeriodico(x, y, semilla, periodo) {
    const s = semilla || 0;
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = smoother(x - ix);
    const fy = smoother(y - iy);
    const x0 = envolver(ix, periodo);
    const y0 = envolver(iy, periodo);
    const x1 = envolver(ix + 1, periodo);
    const y1 = envolver(iy + 1, periodo);
    const a = hash2(x0, y0, s);
    const b = hash2(x1, y0, s);
    const c = hash2(x0, y1, s);
    const d = hash2(x1, y1, s);
    return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
  }

  function fbmPeriodico(x, y, opciones) {
    const o = opciones || {};
    const octavas = o.octavas || 4;
    const periodo = o.periodo || 8;
    const semilla = o.semilla || 0;
    let suma = 0;
    let amplitud = 1;
    let normalizacion = 0;
    let f = 1;
    for (let i = 0; i < octavas; i += 1) {
      suma += ruidoValorPeriodico(x * periodo * f, y * periodo * f, semilla + i * 131, periodo) * amplitud;
      normalizacion += amplitud;
      amplitud *= 0.5;
      f *= 2;
    }
    return suma / normalizacion;
  }

  function mezclar(a, b, t) { return a + (b - a) * t; }

  function elegir(lista, pesos, rnd) {
    let total = 0;
    for (let i = 0; i < pesos.length; i += 1) total += pesos[i];
    let objetivo = rnd() * total;
    for (let i = 0; i < lista.length; i += 1) {
      objetivo -= pesos[i];
      if (objetivo <= 0) return lista[i];
    }
    return lista[lista.length - 1];
  }

  J.ruido = {
    crearPRNG, hash2, hash3, ruidoValor, ruidoValorPeriodico, fbm, fbmPeriodico, suave, mezclar, elegir,
  };
})(window.J = window.J || {});

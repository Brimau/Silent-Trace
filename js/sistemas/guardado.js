(function (J) {
  'use strict';

  // ---------------------------------------------------------------
  // Guardado en localStorage.
  //
  // El guardado se arma por modulos: cada sistema aporta su propia
  // pieza y sabe como volver a aplicarla. Añadir capitulos, pistas,
  // puertas o decisiones mas adelante es registrar otro modulo, sin
  // tocar este archivo ni los anteriores.
  //
  //   J.crearGuardado({ Clave })
  //   g.registrar({ id, guardar, restaurar })
  //   g.guardar(motivo)   -> bool
  //   g.leer()             -> datos|null
  //   g.existe()           -> bool
  //   g.borrar()
  // ---------------------------------------------------------------

  const VERSION = 1;
  const INTERVALO = 4;   // segundos minimos entre guardados automaticos

  function crearGuardado(opciones) {
    const cfg = opciones || {};
    const clave = cfg.clave || 'silent-trace:partida';
    const modulos = [];
    let ultimo = 0;
    let pendiente = null;
    let avisado = null;

    function disponible() {
      try {
        const k = '__st_prueba__';
        localStorage.setItem(k, '1');
        localStorage.removeItem(k);
        return true;
      } catch (e) {
        return false;
      }
    }

    const funciona = disponible();

    function registrar(modulo) {
      if (!modulo || !modulo.id) return;
      modulos.push(modulo);
    }

    function percepcion() {
      const salida = {};
      for (const m of modulos) {
        try {
          const d = m.guardar();
          if (d && typeof d === 'object') salida[m.id] = d;
        } catch (e) {
          // un modulo roto no debe impedir guardar el resto
          if (typeof console !== 'undefined') console.warn('guardado: fallo en ' + m.id, e);
        }
      }
      return salida;
    }

    function aplicar(datos) {
      let completo = 0;
      for (const m of modulos) {
        if (!datos || datos[m.id] === undefined) continue;
        try {
          m.restaurar(datos[m.id]);
          completo += 1;
        } catch (e) {
          if (typeof console !== 'undefined') console.warn('guardado: no se pudo restaurar ' + m.id, e);
        }
      }
      return completo;
    }

    function escribir() {
      if (!funciona) return false;
      const datos = {
        version: VERSION,
        marca: Date.now(),
        modulos: percepcion(),
      };
      try {
        localStorage.setItem(clave, JSON.stringify(datos));
        return true;
      } catch (e) {
        if (typeof console !== 'undefined') console.warn('guardado: no se pudo escribir', e);
        return false;
      }
    }

    //---------------------------------------------------------------- API
    return {
      get disponible() { return funciona; },

      registrar: registrar,

      // Guardado inmediato, saltandose el intervalo minimo.
      guardar(motivo) {
        if (!funciona) return false;
        const ok = escribir();
        if (ok) {
          ultimo = Date.now();
          pendiente = null;
          if (avisado) avisado(motivo || 'partida');
        }
        return ok;
      },

      // GuardadoDiferido: se agrupa en un instante. Sirve para eventos que
      // pueden repetirse (una pista cada pocos pasos, por ejemplo).
      guardarPronto(motivo) {
        if (!funciona) return false;
        const ahora = Date.now();
        if (ahora - ultimo < INTERVALO * 1000) {
          pendiente = motivo || 'partida';
          return false;
        }
        return this.guardar(motivo);
      },

      // Se llama desde el bucle: ejecuta lo que quedo pendiente.
      vaciar() {
        if (!funciona || !pendiente) return;
        if (Date.now() - ultimo < INTERVALO * 1000) return;
        const motivo = pendiente;
        this.guardar(motivo);
      },

      leer() {
        if (!funciona) return null;
        let crudo;
        try {
          crudo = localStorage.getItem(clave);
        } catch (e) {
          return null;
        }
        if (!crudo) return null;
        let datos;
        try {
          datos = JSON.parse(crudo);
        } catch (e) {
          return null;
        }
        if (!datos || datos.version !== VERSION) return null;
        return datos;
      },

      existe() { return this.leer() !== null; },

      resumen() {
        const d = this.leer();
        if (!d) return null;
        const m = d.modulos || {};
        const p = m.progresion || {};
        return {
          version: d.version,
          marca: d.marca,
          objetivo: p.objetivo || '',
          zona: p.zona || '',
          enCoche: !!(m.jugador && m.jugador.enCoche),
        };
      },

      aplicar: aplicar,

      borrar() {
        if (!funciona) return false;
        try {
          localStorage.removeItem(clave);
          ultimo = 0;
          pendiente = null;
          return true;
        } catch (e) {
          return false;
        }
      },

      alGuardar(fn) { avisado = fn; },
    };
  }

  J.crearGuardado = crearGuardado;
  J.VERSION_GUARDADO = VERSION;
})(window.J = window.J || {});
(function (J) {
  'use strict';

  const { CONFIG } = J;

  J.crearJugador = function crearJugador(terreno, colisiones) {
    const P = CONFIG.jugador;
    const C = CONFIG.camara;

    const posicion = new THREE.Vector3();
    const velocidad = new THREE.Vector3();
    const direccion = new THREE.Vector3();
    const derecha = new THREE.Vector3();
    const deseada = new THREE.Vector3();
    const normalTerreno = new THREE.Vector3(0, 1, 0);
    const balanceoCabeza = { x: 0, y: 0, balanceo: 0, cabeceo: 0 };
    const fuerzaLateral = { x: 0, z: 0 };

    let alturaVertical = 0;
    let cAgachado = 0;
    let agachado = false;
    let pasos = 0;
    let caida = 0;
    let inclinacion = 0;
    let superficie = 0;
    let ultimoChoque = 0;

    function alturaOjos() {
      return C.alturaOjos - cAgachado * (C.alturaOjos - C.alturaAgachado);
    }

    function colocar(x, z) {
      posicion.x = x;
      posicion.z = z;
      posicion.y = terreno.altura(x, z);
      alturaVertical = 0;
      velocidad.set(0, 0, 0);
      pasos = 0;
      caida = 0;
    }

    function actualizar(dt, entrada, camara) {
      const quiereAgacharse = entrada.abajo('agachar');
      cAgachado += ((quiereAgacharse ? 1 : 0) - cAgachado) * Math.min(1, dt * 11);
      agachado = cAgachado > 0.5;

      direccion.set(0, 0, -1).applyEuler(camara.rotation);
      direccion.y = 0;
      if (direccion.lengthSq() > 1e-6) direccion.normalize();
      derecha.set(1, 0, 0).applyEuler(camara.rotation);
      derecha.y = 0;
      if (derecha.lengthSq() > 1e-6) derecha.normalize();

      const adelante = (entrada.abajo('adelante') ? 1 : 0) - (entrada.abajo('atras') ? 1 : 0);
      const lateral = (entrada.abajo('derecha') ? 1 : 0) - (entrada.abajo('izquierda') ? 1 : 0);
      const corriendo = entrada.abajo('correr') && !agachado && adelante > 0;
      const maxVel = agachado ? P.velocidadAgachado : (corriendo ? P.velocidadCorrer : P.velocidadCaminar);

      let quiereMover = false;
      deseada.set(0, 0, 0);
      if (adelante !== 0 || lateral !== 0) {
        quiereMover = true;
        deseada.addScaledVector(direccion, adelante);
        deseada.addScaledVector(derecha, lateral * 0.78);
        const largo = Math.sqrt(deseada.x * deseada.x + deseada.z * deseada.z);
        if (largo > 0.001) {
          // Hay que escalar a maxVel, no solo limitar: antes el factor era
          // min(1, maxVel/largo) y como la direccion ya es unitaria el
          // jugador se movia siempre a 1 m/s, tanto caminando como
          // corriendo. Caminar y correr no se distinguian.
          const factor = maxVel / largo;
          deseada.x *= factor;
          deseada.z *= factor;
        }
      }

      const n = terreno.normal(posicion.x, posicion.z, normalTerreno);
      const alineado = Math.max(0.3, n.y);

      const acelerando = quiereMover
        && (deseada.x * velocidad.x + deseada.z * velocidad.z) >= 0;
      const tasa = (acelerando ? P.aceleracion : P.frenado) * alineado;
      const respuesta = Math.min(1, dt * tasa);
      velocidad.x += (deseada.x - velocidad.x) * respuesta;
      velocidad.z += (deseada.z - velocidad.z) * respuesta;

      if (!quiereMover) {
        const freno = Math.min(1, dt * P.friccionSuelo);
        velocidad.x -= velocidad.x * freno;
        velocidad.z -= velocidad.z * freno;
        if (Math.abs(velocidad.x) < 0.02) velocidad.x = 0;
        if (Math.abs(velocidad.z) < 0.02) velocidad.z = 0;
      }

      const antesX = posicion.x;
      const antesZ = posicion.z;
      posicion.x += velocidad.x * dt;
      posicion.z += velocidad.z * dt;

      if (colisiones.resolver(posicion, P.radio, posicion.y)) {
        const movX = posicion.x - antesX;
        const movZ = posicion.z - antesZ;
        const movido = Math.sqrt(movX * movX + movZ * movZ);
        const previsto = Math.sqrt(velocidad.x * velocidad.x + velocidad.z * velocidad.z) * dt;
        if (movido < previsto * 0.55) {
          ultimoChoque = 1;
          const freno = 0.22;
          velocidad.x *= freno;
          velocidad.z *= freno;
        }
      }
      ultimoChoque = Math.max(0, ultimoChoque - dt * 3.5);

      const limX = Math.max(terreno.minX + 5, Math.min(terreno.maxX - 5, posicion.x));
      const limZ = Math.max(terreno.minZ + 5, Math.min(terreno.maxZ - 5, posicion.z));
      if (limX !== posicion.x || limZ !== posicion.z) {
        velocidad.x = 0;
        velocidad.z = 0;
        posicion.x = limX;
        posicion.z = limZ;
      }

      const suelo = terreno.altura(posicion.x, posicion.z);
      const dy = suelo - posicion.y;
      if (dy > 0.02) {
        if (alturaVertical < -1.5) caida = Math.min(1, -alturaVertical / 6);
        posicion.y = suelo;
        alturaVertical = 0;
      } else {
        alturaVertical -= P.gravedad * dt;
        posicion.y += alturaVertical * dt;
        if (posicion.y <= suelo) {
          posicion.y = suelo;
          alturaVertical = 0;
        }
      }
      caida = Math.max(0, caida - dt * 3.2);

      const rapidez = Math.sqrt(velocidad.x * velocidad.x + velocidad.z * velocidad.z);
      const corriendoAhora = corriendo && rapidez > P.velocidadCaminar * 0.7;
      if (alturaVertical === 0 && rapidez > 0.35) {
        pasos += (rapidez * dt) / (corriendoAhora ? P.longitudZancada : P.longitudZancada * 0.82);
      }

      const relativo = Math.min(1, rapidez / P.velocidadCaminar);
      const amplitud = (corriendoAhora ? P.bobCorriendo : 1) * relativo * (agachado ? 0.55 : 1);
      const desfase = pasos * Math.PI * 2;

      balanceoCabeza.y = Math.sin(desfase * 2) * P.bobVertical * amplitud - caida * 0.09;
      balanceoCabeza.x = Math.sin(desfase) * P.bobLateral * amplitud;
      balanceoCabeza.cabeceo = Math.sin(desfase * 2 + 0.6) * P.bobCabeceo * amplitud - caida * 0.05;
      balanceoCabeza.balanceo = -Math.sin(desfase) * P.bobBalanceo * amplitud
        - (lateral * 0.012) + ultimoChoque * (Math.random() - 0.5) * 0.05;

      inclinacion = -(velocidad.x * derecha.z - velocidad.z * derecha.x) / Math.max(1, P.velocidadCorrer);
      balanceoCabeza.balanceo += inclinacion * 0.02;

      fuerzaLateral.x = velocidad.x;
      fuerzaLateral.z = velocidad.z;

      return {
        ojos: alturaOjos(),
        paso: (alturaVertical === 0 && rapidez > 0.5) ? (desfase % (Math.PI * 2)) : -1,
        intensidad: relativo,
        agachado: agachado,
        corriendo: corriendoAhora,
        rapidez: rapidez,
      };
    }

    return {
      posicion: posicion,
      velocidad: velocidad,
      balanceoCabeza: balanceoCabeza,
      fuerzaLateral: fuerzaLateral,
      colocar: colocar,
      actualizar: actualizar,
      get agachado() { return agachado; },
      get alturaOjos() { return alturaOjos(); },
    };
  };
})(window.J = window.J || {});

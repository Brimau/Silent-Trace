(function (J) {
  'use strict';

  J.CONFIG = {
    semilla: 0x4a3f21,

    mundo: {
      minX: -300, maxX: 300,
      minZ: -1250, maxZ: 1200,
      paso: 3.0,
    },

    niebla: {
      // mas densa: a partir de unos 30 m no se ve lo que hay delante
      densidad: 0.0165,
      color: 0x0b1017,
      alturaCapa: 1.25,
      capas: 18,
      opacidad: 0.085,
    },

    luna: {
      // la luna solo insinua siluetas. Sin relleno ambiental casi todo el
      // mundo queda negro y solo se ve lo que ilumina la linterna o el coche
      intensidad: 0.40,
      color: 0x6d84a8,
      intensidadHemisf: 0.14,
      colorSuelo: 0x0a0f0e,
      hemisfCielo: 0x18222f,
    },

    camara: {
      fov: 72,
      fovConduciendo: 66,
      alturaOjos: 1.68,
      alturaAgachado: 1.02,
      sensibilidad: 0.0022,
      pitchMin: -1.35,
      pitchMax: 1.32,
      near: 0.08,
      far: 620,
      // camara dentro del habitaculo. Los limites de yaw son relativos al
      // rumbo del coche: mirar de lado no puede hacer perder la carretera.
      conduciendo: {
        yawMax: 2.3,        // ~132 grados de vista lateral a cada lado
        seguimiento: 5.5,   // how smoothly the camera catches the car heading
        inerciaGiro: 4.5,   // extra lag on the steering, gives the camera weight
        rollPorGiro: 0.038, // roll at full lock, in radians
        rollSuavizado: 4.5,
        pitchMin: -0.52,
        pitchMax: 0.30,
        balanceoBucle: 0.16,
      },
    },

    jugador: {
      radio: 0.34,
      altura: 1.8,
      velocidadCaminar: 3.35,
      velocidadCorrer: 5.9,
      velocidadAgachado: 1.55,
      aceleracion: 13,
      frenado: 17,
      friccionSuelo: 14,
      gravedad: 19.5,
      longitudZancada: 1.62,
      alcanceManos: 2.7,
      bobVertical: 0.034,
      bobLateral: 0.021,
      bobCabeceo: 0.0075,
      bobBalanceo: 0.011,
      bobCorriendo: 1.32,
    },

    vehiculo: {
      masa: 1420,
      fuerzaMotor: 2750,
      fuerzaMarchaAtras: 1250,
      freno: 7400,
      frenoMano: 3200,
      frenoMotor: 950,
      rodadura: 0.38,
      resistenciaAerodinamica: 0.0034,
      velocidadMax: 22.5,
      velocidadMaxAtras: 6.0,
      empujeMaxAngulo: 0.47,
      aceleracionLateralMax: 6.4,
      adherenciaLateral: 17.0,
      adherenciaEje: 0.9,
      deriva: 0.34,
      amortiguacionGiro: 7.5,
      amortiguacionGiroRecto: 11.0,
      largo: 4.95,
      ancho: 1.82,
      altura: 1.40,
      alturaOjos: 1.13,
      desplazamientoOjos: 0.40,
      alturaRueda: 0.31,
      wheelbase: 2.79,
      track: 1.52,
      suspension: 7.0,
      cabeceoAceleracion: 0.016,
      // inclinacion maxima de la carrocería en curva, en radianes (~5,4 grados)
      balanceoMax: 0.095,
      anguloVolante: 5.0,
      multiplicadorRueda: 2.2,
    },

    linterna: {
      intensidad: 15,
      distancia: 27,
      angulo: 0.4,
      penumbra: 0.66,
      decaimiento: 1.0,
    },

    faros: {
      intensidad: 132,
      distancia: 95,
      angulo: 0.62,
      penumbra: 0.55,
      decaimiento: 0.95,
      altura: 0.68,
      desplazamiento: 0.66,
    },

    interaccion: { distancia: 2.9 },

    post: {
      bloom: { strength: 0.34, radius: 0.65, threshold: 0.66 },
      grano: 0.058,
      vineta: 0.82,
      aberracion: 0.0013,
      contraste: 1.2,
      saturacion: 0.62,
      // el levantamiento en azul deja los negros profundos, no gris
      elevacion: 0.032,
      elevacionColor: [0.07, 0.10, 0.16],
    },

    calidades: {
      alta: { pixelRatio: 1.6, sombras: 2048, arboles: 1.0, arbustos: 1.0, hierba: 1.0, sombrasVegetacion: true, post: true },
      media: { pixelRatio: 1.25, sombras: 1024, arboles: 0.85, arbustos: 0.85, hierba: 0.55, sombrasVegetacion: true, post: true },
      baja: { pixelRatio: 0.9, sombras: 512, arboles: 0.5, arbustos: 0.4, hierba: 0.0, sombrasVegetacion: false, post: false },
    },
  };
})(window.J = window.J || {});

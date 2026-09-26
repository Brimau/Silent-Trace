(function (J) {
  'use strict';

  J.MAPA = {
    CARRETERA: {
      id: 'carretera',
      ancho: 8.4,
      arcun: 1.4,
      verge: 5.0,
      puntos: [
        { x: -10, z: -1250, y: 1.2 },
        { x: -4, z: -1130, y: 0.9 },
        { x: 4, z: -1010, y: 0.4 },
        { x: 22, z: -900, y: 0.2 },
        { x: 44, z: -790, y: 0.5 },
        { x: 56, z: -670, y: 1.0 },
        { x: 48, z: -540, y: 1.4 },
        { x: 22, z: -430, y: 1.2 },
        { x: -8, z: -340, y: 0.7 },
        { x: -30, z: -240, y: 0.4 },
        { x: -34, z: -130, y: 0.2 },
        { x: -20, z: -20, y: 0.3 },
        { x: 4, z: 80, y: 0.5 },
        { x: 22, z: 180, y: 0.4 },
        { x: 16, z: 270, y: 0.2 },
        { x: 0, z: 350, y: 0.1 },
      ],
    },

    CALLES: [
      {
        id: 'principal', ancho: 11.0, arcun: 1.8, verge: 4.4,
        puntos: [
          { x: 0, z: 340, y: 0.1 }, { x: 0, z: 430, y: 0.0 },
          { x: 6, z: 520, y: -0.1 }, { x: 8, z: 620, y: -0.2 },
          { x: 2, z: 720, y: -0.1 }, { x: -2, z: 820, y: 0.0 },
          { x: 0, z: 920, y: 0.1 }, { x: 2, z: 1005, y: 0.2 },
        ],
      },
      {
        id: 'norte', ancho: 8.0, arcun: 1.4, verge: 3.6,
        puntos: [
          { x: 6, z: 520, y: -0.1 }, { x: 70, z: 536, y: -0.2 },
          { x: 140, z: 548, y: -0.3 }, { x: 208, z: 556, y: -0.45 },
        ],
      },
      {
        id: 'oeste', ancho: 8.0, arcun: 1.4, verge: 3.6,
        puntos: [
          { x: 2, z: 700, y: -0.1 }, { x: -60, z: 712, y: -0.2 },
          { x: -120, z: 722, y: -0.3 }, { x: -182, z: 730, y: -0.45 },
        ],
      },
      {
        id: 'este', ancho: 7.5, arcun: 1.3, verge: 3.4,
        puntos: [
          { x: -2, z: 845, y: 0.0 }, { x: 60, z: 855, y: -0.1 },
          { x: 122, z: 864, y: -0.25 },
        ],
      },
      {
        id: 'hospital', ancho: 9.0, arcun: 2.0, verge: 5.0,
        puntos: [
          { x: 2, z: 1000, y: 0.2 }, { x: 6, z: 1060, y: 0.4 },
          { x: 8, z: 1112, y: 0.6 },
        ],
      },
    ],

    HOSPITAL: {
      x: 8, z: 1140, rot: 0,
      ancho: 48, fondo: 32, plantas: 3, alturaPlanta: 4.5,
      nombre: 'HOSPITAL SAN IGNACIO',
    },

    BOSQUE: {
      paredBorde: 19,
      paredAncho: 24,
      paredDensidad: 1.5,
      densidadBase: 1.0,
      densidadMax: 70,
      arquetipos: [
        { id: 'pinoAlto', tronco: { r: 0.30, h: 15.0 }, copa: { r: 1.95, h: 11.0, capas: 5 }, color: 0x2a3a25 },
        { id: 'pinoMedio', tronco: { r: 0.26, h: 11.0 }, copa: { r: 1.62, h: 8.5, capas: 4 }, color: 0x2b3b26 },
        { id: 'pinoJoven', tronco: { r: 0.17, h: 6.5 }, copa: { r: 1.22, h: 5.5, capas: 4 }, color: 0x33452a },
        { id: 'robleAncho', tronco: { r: 0.40, h: 6.2 }, copa: { r: 3.3, h: 5.2, capas: 3 }, color: 0x303d24, bola: true },
        { id: 'robleMedio', tronco: { r: 0.28, h: 4.6 }, copa: { r: 2.5, h: 4.0, capas: 3 }, color: 0x333f25, bola: true },
        { id: 'seco', tronco: { r: 0.29, h: 12.5 }, ramas: true, color: 0x453f31 },
        { id: 'secoBajo', tronco: { r: 0.22, h: 7.0 }, ramas: true, color: 0x474132 },
      ],
      pesos: [0.20, 0.24, 0.15, 0.12, 0.13, 0.09, 0.07],
      arquetiposClaro: [
        { id: 'pinoJoven', tronco: { r: 0.15, h: 4.2 }, copa: { r: 1.0, h: 3.6, capas: 3 }, color: 0x2a3a24 },
        { id: 'robleMedio', tronco: { r: 0.18, h: 2.8 }, copa: { r: 1.5, h: 2.4, capas: 2 }, color: 0x2c3622, bola: true },
        { id: 'secoBajo', tronco: { r: 0.14, h: 3.6 }, ramas: true, color: 0x3d392e },
      ],
      pesosClaro: [0.4, 0.4, 0.2],
      arbustos: [
        { id: 'matorral', r: 0.85, h: 0.95, segmentos: 3, color: 0x212b1a },
        { id: 'matorralAlto', r: 1.35, h: 1.9, segmentos: 4, color: 0x1d2717 },
        { id: 'helecho', r: 0.95, h: 0.7, segmentos: 5, color: 0x25311d },
        { id: 'junco', r: 0.55, h: 1.5, segmentos: 4, color: 0x2a3322 },
      ],
      pesosArbusto: [0.34, 0.2, 0.28, 0.18],
      rocas: [
        { r: 0.55, escalaY: 0.6 }, { r: 1.1, escalaY: 0.72 },
        { r: 1.9, escalaY: 0.55 }, { r: 3.0, escalaY: 0.42 },
      ],
      pesosRoca: [0.3, 0.34, 0.24, 0.12],
      hierba: { alto: 0.44, ancho: 0.36, porMetro: 240, colorBase: 0x29311e, colorPunta: 0x3a4327 },
    },

    CLAROS: [
      { x: 22, z: -345, rx: 34, rz: 46 },
      { x: -33, z: -128, rx: 30, rz: 40 },
      { x: 55, z: -668, rx: 42, rz: 54 },
      { x: -31, z: -242, rx: 28, rz: 36 },
      { x: 2, z: 62, rx: 48, rz: 46 },
      { x: 62, z: -562, rx: 26, rz: 34 },
      { x: 96, z: -520, rx: 32, rz: 42 },
      { x: 78, z: -300, rx: 28, rz: 36 },
      { x: -70, z: -60, rx: 32, rz: 44 },
      { x: 88, z: 120, rx: 30, rz: 38 },
    ],

    EDIFICIOS: [
      { tipo: 'casa', x: -23, z: 404, rot: 1.5708, ancho: 9.5, fondo: 7.5, plantas: 2, estado: 'intacta' },
      { tipo: 'tienda', x: -31, z: 474, rot: 1.5708, ancho: 16.5, fondo: 11.0, plantas: 1, estado: 'intacta', toldo: true },
      { tipo: 'casa', x: -20, z: 566, rot: 1.5708, ancho: 8.5, fondo: 7.0, plantas: 1, estado: 'intacta' },
      { tipo: 'casa', x: -25, z: 646, rot: 1.5708, ancho: 10.5, fondo: 8.0, plantas: 2, estado: 'derrucho' },
      { tipo: 'nave', x: -36, z: 748, rot: 1.5708, ancho: 23.0, fondo: 14.0, plantas: 1, estado: 'techoHundido' },
      { tipo: 'casa', x: -21, z: 862, rot: 1.5708, ancho: 9.0, fondo: 7.0, plantas: 1, estado: 'intacta' },
      { tipo: 'casa', x: -26, z: 944, rot: 1.5708, ancho: 10.0, fondo: 8.0, plantas: 2, estado: 'intacta' },

      { tipo: 'gasolinera', x: 35, z: 432, rot: -1.5708, ancho: 20.0, fondo: 12.0, plantas: 1, estado: 'intacta' },
      { tipo: 'casa', x: 23, z: 508, rot: -1.5708, ancho: 9.0, fondo: 7.0, plantas: 1, estado: 'intacta', interior: true,
        documento: 'Un parte de guardia del 14 de marzo. «Valdehoyos: sin incidencias». La misma letra, catorce veces, cada vez más apretada.' },
      { tipo: 'casa', x: 27, z: 594, rot: -1.5708, ancho: 11.0, fondo: 8.5, plantas: 2, estado: 'medioDerrucho' },
      { tipo: 'casa', x: 21, z: 686, rot: -1.5708, ancho: 8.5, fondo: 7.0, plantas: 1, estado: 'intacta', interior: true, libreta: true,
        documento: 'Una foto de la familia en el aparador. Alguien ha rayado con bolígrafo las caras una por una. En el margen: «no volvió ninguno».' },
      { tipo: 'taller', x: 33, z: 806, rot: -1.5708, ancho: 15.0, fondo: 10.5, plantas: 1, estado: 'intacta' },
      { tipo: 'casa', x: 25, z: 906, rot: -1.5708, ancho: 9.0, fondo: 7.0, plantas: 1, estado: 'intacta' },

      { tipo: 'casa', x: 84, z: 520, rot: 0, ancho: 9.0, fondo: 7.5, plantas: 1, estado: 'intacta' },
      { tipo: 'casa', x: 152, z: 532, rot: 0, ancho: 10.0, fondo: 8.0, plantas: 1, estado: 'derrucho' },
      { tipo: 'casa', x: 196, z: 540, rot: 0, ancho: 8.0, fondo: 7.0, planta: 1, estado: 'intacta' },

      { tipo: 'casa', x: -74, z: 694, rot: 3.1416, ancho: 9.5, fondo: 7.5, plantas: 1, estado: 'intacta' },
      { tipo: 'casa', x: -134, z: 708, rot: 3.1416, ancho: 8.5, fondo: 7.0, plantas: 1, estado: 'medioDerrucho' },
      { tipo: 'granero', x: -176, z: 716, rot: 3.1416, ancho: 17.0, fondo: 12.0, plantas: 1, estado: 'techoHundido' },

      { tipo: 'casa', x: 74, z: 838, rot: 3.1416, ancho: 9.0, fondo: 7.0, plantas: 1, estado: 'intacta' },
      { tipo: 'casa', x: 118, z: 848, rot: 3.1416, ancho: 8.5, fondo: 7.0, planta: 1, estado: 'intacta' },
    ],

    PROPS: [
      { tipo: 'vehiculoAbandonado', forma: 0, rot: 0.09, estado: 1, ancla: { camino: 'carretera', s: 428, lado: 1, offset: 6.2 } },
      { tipo: 'vehiculoAbandonado', forma: 1, rot: 0.02, estado: 2, ancla: { camino: 'carretera', s: 452, lado: -1, offset: 6.4 } },
      { tipo: 'vehiculoAbandonado', forma: 2, rot: 1.52, estado: 0, ancla: { camino: 'carretera', s: 1096, lado: 1, offset: 8.4 } },
      { tipo: 'vehiculoAbandonado', forma: 0, rot: 3.15, estado: 1, x: 20, z: 470 },
      { tipo: 'vehiculoAbandonado', forma: 2, rot: 1.58, estado: 2, x: -16, z: 792 },
      { tipo: 'vehiculoAbandonado', forma: 1, rot: 4.70, estado: 0, x: 46, z: 812 },

      { tipo: 'senal', rot: 0.2, estado: 0, ancla: { camino: 'carretera', s: 372, lado: -1, offset: 6.6 } },
      { tipo: 'senal', rot: -0.15, estado: 1, ancla: { camino: 'carretera', s: 640, lado: 1, offset: 6.6 } },
      { tipo: 'senal', rot: 0.5, estado: 0, ancla: { camino: 'carretera', s: 1010, lado: -1, offset: 7.4 } },

      { tipo: 'posteTelefono', rot: 0.12, estado: 0, ancla: { camino: 'carretera', s: 636, lado: -1, offset: 6.9 } },
      { tipo: 'posteTelefono', rot: -0.3, estado: 1, ancla: { camino: 'carretera', s: 1148, lado: 1, offset: 6.9 } },

      { tipo: 'arbolCaido', rot: 0.7, largo: 21, ancla: { camino: 'carretera', s: 286, lado: -1, offset: 22 } },
      { tipo: 'arbolCaido', rot: 2.1, largo: 17, ancla: { camino: 'carretera', s: 830, lado: 1, offset: 19 } },
      { tipo: 'arbolCaido', rot: 4.4, largo: 24, ancla: { camino: 'carretera', s: 1204, lado: -1, offset: 24 } },
      { tipo: 'arbolCaido', rot: 1.2, largo: 19, x: -96, z: -520 },
      { tipo: 'arbolCaido', rot: 3.3, largo: 22, x: 108, z: -300 },

      { tipo: 'piedras', radio: 4.2, x: 78, z: -300 },
      { tipo: 'colgante', alto: 3.1, x: 84, z: -292 },

      { tipo: 'arco', rot: 0.0, x: 0, z: 358 },
      { tipo: 'barricada', rot: 0.02, x: 0.4, z: 368 },

      { tipo: 'posteElectrico', rot: 0.03, x: 15.5, z: 392 },
      { tipo: 'posteElectrico', rot: -0.05, x: 15.2, z: 452 },
      { tipo: 'posteElectrico', rot: 0.09, x: 16.4, z: 512 },
      { tipo: 'posteElectrico', rot: -0.11, x: 16.8, z: 572 },
      { tipo: 'posteElectrico', rot: 0.04, x: 15.0, z: 632 },
      { tipo: 'posteElectrico', rot: 0.14, x: 13.6, z: 692 },
      { tipo: 'posteElectrico', rot: -0.07, x: 13.0, z: 752 },
      { tipo: 'posteElectrico', rot: 0.06, x: 13.8, z: 812 },
      { tipo: 'posteElectrico', rot: -0.12, x: 14.6, z: 872 },
      { tipo: 'posteElectrico', rot: 0.02, x: 15.2, z: 932 },
      { tipo: 'posteElectrico', rot: -0.05, x: 15.8, z: 992 },

      { tipo: 'posteTelefono', rot: 0.4, estado: 0, x: 14, z: 604 },
      { tipo: 'posteTelefono', rot: 0.1, estado: 2, x: 13, z: 856 },
      { tipo: 'posteTelefono', rot: 0.2, estado: 1, x: -14, z: 736 },

      { tipo: 'vallaMadera', rot: 0.06, largo: 6, x: 10, z: 520 },
      { tipo: 'vallaMadera', rot: 0.06, largo: 6, x: 10, z: 534 },
      { tipo: 'vallaMadera', rot: 0.1, largo: 5, x: -6, z: 830 },
      { tipo: 'vallaMadera', rot: 0.1, largo: 5, x: -6, z: 843 },

      { tipo: 'contenedor', rot: 0.1, x: 30, z: 700 },
      { tipo: 'contenedor', rot: 1.62, x: -44, z: 560 },
      { tipo: 'contenedor', rot: 0.2, x: 18, z: 880 },

      { tipo: 'pilaCajas', rot: 0.3, x: 24, z: 520 },
      { tipo: 'pilaCajas', rot: 1.2, x: 40, z: 800 },
      { tipo: 'pilaCajas', rot: 0.7, x: -18, z: 620 },

      { tipo: 'buzon', rot: 0.1, x: 12, z: 420 },
      { tipo: 'buzon', rot: -0.1, x: 11, z: 560 },
      { tipo: 'buzon', rot: 0.05, x: 12, z: 700 },
      { tipo: 'buzon', rot: 0.0, x: 10, z: 900 },
      { tipo: 'buzon', rot: 0.1, x: 82, z: 512 },
      { tipo: 'buzon', rot: -0.1, x: -70, z: 686 },

      { tipo: 'farola', rot: 0, estado: 0, x: 10, z: 470 },
      { tipo: 'farola', rot: 0, estado: 1, x: 11, z: 600 },
      { tipo: 'farola', rot: 0, estado: 2, x: 9, z: 750 },
      { tipo: 'farola', rot: 0, estado: 0, x: 10, z: 910 },

      { tipo: 'escombros', rot: 0.4, radio: 5.5, x: -25, z: 646 },
      { tipo: 'escombros', rot: 1.1, radio: 4.2, x: 27, z: 594 },
      { tipo: 'escombros', rot: 0.2, radio: 4.8, x: 152, z: 532 },
      { tipo: 'escombros', rot: 2.2, radio: 3.6, x: -134, z: 708 },
      { tipo: 'escombros', rot: 0.9, radio: 5.0, x: -36, z: 748 },
    ],

    HITOS: [
      { id: 'radio', s: 26, radio: 300, unaVez: true, sonido: 'radio',
        texto: 'La radio sólo emite estática. Una voz, un instante, y después nada.' },
      { id: 'figura', x: 96, z: -520, radioAparece: 105, radioHuye: 32, unaVez: true, aparicion: 'figura', sonido: 'susurro' },
      { id: 'vehiculo', s: 420, radio: 30, unaVez: true,
        texto: 'Un coche igual que el suyo. La puerta del conductor, abierta.' },
      { id: 'senal', s: 372, radio: 24, unaVez: true,
        texto: 'El cartel se mantiene en pie por pura inercia.' },
      { id: 'telefono', s: 636, radio: 28, unaVez: true, sonido: 'campanilla',
        texto: 'El cable cuelga del poste. Todavía se mueve un poco.' },
      { id: 'piedras', s: 790, radio: 34, unaVez: true,
        texto: 'Alguien apiló piedras en círculo. En el centro, la tierra está hundida.' },
      { id: 'hospital', s: 1150, radio: 300, unaVez: true,
        texto: 'Al fondo del valle, una silueta demasiado grande para este pueblo.' },
      { id: 'barricada', s: 1352, radio: 34, unaVez: true,
        texto: 'No ha llegado muy lejos.' },
    ],

    OBJETIVOS: [
      { s: 1320, texto: 'Conducir hasta el pueblo' },
      { s: 1396, texto: 'Detenerse en la entrada de Valdehoyos' },
      { s: 1410, texto: 'Salir del coche y explorar el pueblo' },
    ],
  };
})(window.J = window.J || {});

(function (J) {
  'use strict';

  const { CONFIG } = J;

  J.crearProgresion = function crearProgresion() {
    const objetivos = J.MAPA.OBJETIVOS;
    const estado = {
      indice: 0,
      zona: '',
      texto: objetivos[0].texto,
    };

    return {
      get texto() { return estado.texto; },
      get zona() { return estado.zona; },
      avanzar() {
        if (estado.indice < objetivos.length - 1) {
          estado.indice += 1;
          estado.texto = objetivos[estado.indice].texto;
          return true;
        }
        return false;
      },
      objetivoActual() { return objetivos[estado.indice]; },
      setZona(z) { estado.zona = z || ''; },
    };
  };
})(window.J = window.J || {});

(function (J) {
  'use strict';

  const { CONFIG } = J;

  J.crearHitos = function crearHitos(escena, caminos, terreno, eventos) {
    const grupo = new THREE.Group();
    grupo.name = 'hitos';
    escena.add(grupo);

    const M = {
      piel: new THREE.MeshStandardMaterial({ color: 0x2b2723, roughness: 0.95 }),
      tela: new THREE.MeshStandardMaterial({ color: 0x191b1d, roughness: 1 }),
    };

    const figura = new THREE.Group();
    figura.visible = false;
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 1.0, 4, 10), M.tela);
    torso.position.y = 0.79;
    figura.add(torso);
    const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.115, 10, 8), M.piel);
    cabeza.position.y = 1.5;
    figura.add(cabeza);
    grupo.add(figura);

    const porDistancia = [];
    for (const h of J.MAPA.HITOS) {
      if (h.s === undefined) continue;
      const muestra = caminos.puntoEn('carretera', h.s);
      porDistancia.push({
        def: h,
        punto: new THREE.Vector3(muestra.x, muestra.y, muestra.z),
        hecho: false,
      });
    }

    const porLugar = [];
    for (const h of J.MAPA.HITOS) {
      if (h.x === undefined) continue;
      porLugar.push({
        def: h,
        punto: new THREE.Vector3(h.x, terreno.altura(h.x, h.z), h.z),
        radioAparece: h.radioAparece || 100,
        radioHuye: h.radioHuye || 30,
        nodo: h.aparicion === 'figura' ? figura : null,
        visible: false,
        hecho: false,
      });
    }

    return {
      grupo: grupo,
      figura: figura,
      actualizar(posicion) {
        for (const h of porDistancia) {
          if (h.hecho) continue;
          const dx = posicion.x - h.punto.x;
          const dz = posicion.z - h.punto.z;
          if (dx * dx + dz * dz < h.def.radio * h.def.radio) {
            h.hecho = true;
            if (h.def.texto) eventos.brindis(h.def.texto);
            if (h.def.sonido) eventos.sonido(h.def.sonido);
          }
        }

        for (const a of porLugar) {
          if (a.hecho) continue;
          const dx = posicion.x - a.punto.x;
          const dz = posicion.z - a.punto.z;
          const d = Math.sqrt(dx * dx + dz * dz);
          if (!a.visible && d < a.radioAparece && d > a.radioHuye) {
            a.visible = true;
            if (a.nodo) {
              a.nodo.visible = true;
              a.nodo.position.copy(a.punto);
              a.nodo.lookAt(posicion.x, a.punto.y, posicion.z);
            }
            eventos.sonido(a.def.sonido || 'susurro', 0.6);
          } else if (a.visible && d < a.radioHuye) {
            a.visible = false;
            a.hecho = true;
            if (a.nodo) a.nodo.visible = false;
            eventos.brindis('Estaba ahí hace un segundo. Ahora el claro está vacío.');
            eventos.sonido('golpe-lejano');
          }
        }

        if (figura.visible) {
          figura.rotation.z = Math.sin(performance.now() / 1100) * 0.04;
        }
      },
    };
  };
})(window.J = window.J || {});

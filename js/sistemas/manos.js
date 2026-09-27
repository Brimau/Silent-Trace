(function (J) {
  'use strict';

  // ---------------------------------------------------------------
  // Rig de brazos. Misma convencion de huesos que un rig GLTF:
  //   - el hijo de un hueso esta en (0, -largo, 0)
  //   - el eje -Y del hueso apunta hacia su hijo
  // La geometria se construye con la articulacion en y=0 y el miembro
  //.extendiendose hacia -Y. Sustituir las primitivas por un modelo
  // real es cambiar una sola funcion: J.REGISTRO.brazo.
  // ---------------------------------------------------------------

  const TEX = J.TEX;

  function caja(w, h, d, x, y, z) {
    return { geometria: new THREE.BoxGeometry(w, h, d), matriz: J.matriz(x, y, z) };
  }

  function tubo(rt, rb, largo, seg, x, y, z) {
    return { geometria: new THREE.CylinderGeometry(rt, rb, largo, seg, 1), matriz: J.matriz(x, y, z) };
  }

  // --- geometria base -------------------------------------------------
  // palma en el origen, dedos hacia -Z, muñeca hacia +Z
  function construirMano() {
    return J.fusionar([
      caja(0.056, 0.036, 0.1, 0, 0, 0.012),
      caja(0.05, 0.03, 0.045, 0, -0.004, -0.062),
      caja(0.02, 0.022, 0.05, -0.026, 0.004, -0.09),
      caja(0.02, 0.022, 0.05, 0.026, 0.004, -0.09),
      caja(0.02, 0.02, 0.042, -0.02, 0.002, -0.14),
      caja(0.02, 0.02, 0.038, 0.008, -0.002, -0.142),
    ]);
  }

  // antebrazo: del codo (y=0) a la muñeca (y=-largo)
  function construirAntebrazo() {
    return J.fusionar([
      tubo(0.04, 0.052, 0.3, 12, 0, -0.15, 0),
      caja(0.068, 0.068, 0.05, 0, -0.014, 0),
    ]);
  }

  // manga: cubre desde el codo hacia abajo
  function construirManga() {
    return J.fusionar([
      tubo(0.05, 0.062, 0.19, 12, 0, -0.095, 0),
      caja(0.082, 0.082, 0.032, 0, -0.006, 0),
      caja(0.06, 0.06, 0.028, 0, -0.2, 0),
    ]);
  }

  // brazo superior: del hombro (y=0) al codo (y=-largo)
  function construirHombro() {
    return J.fusionar([
      tubo(0.058, 0.068, 0.3, 12, 0, -0.15, 0),
    ]);
  }

  const REGISTRO = {
    mano: construirMano,
    antebrazo: construirAntebrazo,
    manga: construirManga,
    hombro: construirHombro,
    largoHombro: 0.3,
    largoAntebrazo: 0.3,
  };

  function crearMateriales() {
    return {
      piel: new THREE.MeshStandardMaterial({
        color: 0x6a5340, roughness: 0.88, emissive: 0x1a1410, emissiveIntensity: 1,
      }),
      manga: new THREE.MeshStandardMaterial({
        map: TEX.detalle(), color: 0x2b3338, roughness: 0.97,
        emissive: 0x0c1013, emissiveIntensity: 1,
      }),
    };
  }

  // hombro -> codo -> muneca -> mano
  function crearBrazo(mats, conHombro) {
    const hombro = new THREE.Group();
    hombro.name = 'hombro';

    if (conHombro !== false) {
      const sup = new THREE.Mesh(REGISTRO.hombro(), mats.manga);
      hombro.add(sup);
      hombro.userData.superior = sup;
    }

    const codo = new THREE.Group();
    codo.name = 'codo';
    codo.position.y = -REGISTRO.largoHombro;
    hombro.add(codo);

    const ante = new THREE.Mesh(REGISTRO.antebrazo(), mats.piel);
    codo.add(ante);
    const manga = new THREE.Mesh(REGISTRO.manga(), mats.manga);
    codo.add(manga);

    const muneca = new THREE.Group();
    muneca.name = 'muneca';
    muneca.position.y = -REGISTRO.largoAntebrazo;
    codo.add(muneca);

    const mano = new THREE.Group();
    mano.name = 'mano';
    mano.add(new THREE.Mesh(REGISTRO.mano(), mats.piel));
    muneca.add(mano);

    hombro.userData.codo = codo;
    hombro.userData.muneca = muneca;
    hombro.userData.mano = mano;
    hombro.userData.manga = manga;
    hombro.userData.antebrazo = ante;
    codo.userData.muneca = muneca;
    codo.userData.mano = mano;
    muneca.userData.mano = mano;
    return hombro;
  }

  // Orienta un hueso para que su -Y apunte de `desde` a `destino`
  const _ad = new THREE.Vector3();
  const _q = new THREE.Quaternion();
  const EJE = new THREE.Vector3(0, -1, 0);

  function apuntar(hueso, desde, destino) {
    _ad.subVectors(destino, desde);
    if (_ad.lengthSq() < 1e-9) return false;
    _ad.normalize();
    _q.setFromUnitVectors(EJE, _ad);
    hueso.quaternion.copy(_q);
    return true;
  }

  // Orienta la muñeca de forma explicita: los dedos siguen -Z de la mano y
  // la palma mira hacia `arriba`. Sin esto el roll del antebrazo deja los
  // dedos apuntando al cielo.
  const _mx = new THREE.Vector3();
  const _my = new THREE.Vector3();
  const _mz = new THREE.Vector3();
  const _m4 = new THREE.Matrix4();
  const _qw = new THREE.Quaternion();
  const _ql = new THREE.Quaternion();

  function orientarMuno(padre, mano, dirDedos, arriba) {
    _mz.copy(dirDedos).multiplyScalar(-1);
    if (_mz.lengthSq() < 1e-9) return false;
    _mz.normalize();
    _my.copy(arriba);
    _mx.crossVectors(_my, _mz);
    if (_mx.lengthSq() < 1e-9) _mx.set(1, 0, 0);
    else _mx.normalize();
    _my.crossVectors(_mz, _mx).normalize();
    _m4.makeBasis(_mx, _my, _mz);
    _ql.setFromRotationMatrix(_m4);
    padre.getWorldQuaternion(_qw);
    mano.quaternion.copy(_qw.invert().multiply(_ql));
    return true;
  }

  J.crearBrazo = crearBrazo;
  J.crearMaterialesBrazo = crearMateriales;
  J.apuntarHueso = apuntar;
  J.orientarMuneca = orientarMuno;
  J.REGISTRO = J.REGISTRO || {};
  J.REGISTRO.brazo = REGISTRO;
})(window.J = window.J || {});

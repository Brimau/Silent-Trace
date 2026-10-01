(function (J) {
  'use strict';

  const { fbm, fbmPeriodico, hash2, suave, mezclar } = J.ruido;
  const { CONFIG } = J;
  const S = CONFIG.semilla;

  const PALETA = {
    hierba: 0x46542f,
    humedo: 0x2c3c24,
    hojarasca: 0x4a3c2a,
    tierra: 0x453b2e,
    roca: 0x4e4e46,
    grava: 0x565247,
  };

  const cache = new Map();

  function lienzo(tam) {
    const c = document.createElement('canvas');
    c.width = tam;
    c.height = tam;
    return c;
  }

  function conTextura(clave, tam, pintor, opciones) {
    if (cache.has(clave)) return cache.get(clave);
    const o = opciones || {};
    const c = lienzo(tam);
    const ctx = c.getContext('2d');
    pintor(ctx, tam);
    const textura = new THREE.CanvasTexture(c);
    textura.wrapS = THREE.RepeatWrapping;
    textura.wrapT = THREE.RepeatWrapping;
    textura.colorSpace = o.datos ? THREE.NoColorSpace : THREE.SRGBColorSpace;
    textura.anisotropy = o.anisotropia || 4;
    textura.needsUpdate = true;
    cache.set(clave, textura);
    return textura;
  }

  function pixeles(ctx, tam, fn) {
    const imagen = ctx.createImageData(tam, tam);
    const d = imagen.data;
    for (let y = 0; y < tam; y += 1) {
      for (let x = 0; x < tam; x += 1) {
        const i = (y * tam + x) * 4;
        const r = fn(x, y);
        d[i] = r[0];
        d[i + 1] = r[1];
        d[i + 2] = r[2];
        d[i + 3] = r.length > 3 ? r[3] : 255;
      }
    }
    ctx.putImageData(imagen, 0, 0);
  }

  function a2(v) {
    const n = v * 255;
    return n < 0 ? 0 : (n > 255 ? 255 : n | 0);
  }

  function texturaDetalle() {
    return conTextura('detalle', 256, function (ctx, tam) {
      pixeles(ctx, tam, function (x, y) {
        const fino = fbm(x / 3.1, y / 3.1, { octavas: 3, semilla: S + 5 });
        const medio = fbm(x / 11, y / 11, { octavas: 2, semilla: S + 7 });
        const grano = hash2(x, y, S + 9);
        const g = a2(0.80 + fino * 0.13 + medio * 0.05 + grano * 0.02);
        return [g, g, g];
      });
    }, { anisotropia: 8 });
  }

  function campoPeriodico(campos, lado, semilla, opciones) {
    const g = new Float32Array(lado * lado);
    for (let j = 0; j < lado; j += 1) {
      for (let i = 0; i < lado; i += 1) {
        g[j * lado + i] = fbmPeriodico(i / lado, j / lado, {
          octavas: opciones.octavas, periodo: campos, semilla: semilla,
        });
      }
    }
    return g;
  }

  function muestrear(campo, lado, u, w) {
    const fx = u * lado;
    const fy = w * lado;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const x1 = (x0 + 1) % lado;
    const y1 = (y0 + 1) % lado;
    const tx = fx - x0;
    const ty = fy - y0;
    const a = campo[y0 * lado + x0] + (campo[y0 * lado + x1] - campo[y0 * lado + x0]) * tx;
    const b = campo[y1 * lado + x0] + (campo[y1 * lado + x1] - campo[y1 * lado + x0]) * tx;
    return a + (b - a) * ty;
  }

  function texturaAsfalto() {
    const lado = 96;
    const base = campoPeriodico(6, lado, S + 300, { octavas: 4 });
    const grava = campoPeriodico(24, lado, S + 310, { octavas: 2 });
    const grietaC = campoPeriodico(4, lado, S + 330, { octavas: 3 });
    const grietaF = campoPeriodico(14, lado, S + 336, { octavas: 2 });
    const parche = campoPeriodico(3, lado, S + 340, { octavas: 2 });
    const mancha = campoPeriodico(2, lado, S + 350, { octavas: 2 });
    const derrame = campoPeriodico(5, lado, S + 360, { octavas: 2 });
    return conTextura('asfalto', 512, function (ctx, tam) {
      pixeles(ctx, tam, function (x, y) {
        const u = x / tam;
        const w = y / tam;
        const brillo = hash2(x, y, S + 320);
        // Base algo mas clara y menos contraste: con las grietas y manchas
        // tan marcadas el asfalto parecia tierra. Ahora se lee como una
        // superficie lisa y gastada, que es lo que hace que los faros
        // dibujen un brillo continuo sobre ella.
        let v = 0.26 + muestrear(base, lado, u, w) * 0.09
          + muestrear(grava, lado, u, w) * 0.06 + brillo * 0.035;

        const grieta = Math.abs(muestrear(grietaC, lado, u, w) - 0.5);
        const grietaFina = Math.abs(muestrear(grietaF, lado, u, w) - 0.5);
        v = mezclar(v, 0.15, (1 - suave(0.012, 0.055, grieta)) * 0.55);
        v = mezclar(v, 0.18, (1 - suave(0.004, 0.022, grietaFina)) * 0.35);
        v = mezclar(v, 0.30, suave(0.54, 0.63, muestrear(parche, lado, u, w)) * 0.5);
        v *= 1 - suave(0.62, 0.86, muestrear(mancha, lado, u, w)) * 0.22;
        v = mezclar(v, 0.20, suave(0.8, 0.95, muestrear(derrame, lado, u, w)) * 0.3);

        // Gris frio, no calido. La paleta del bosque es toda marron
        // (tierra 0x453b2e, hojarasca 0x4a3c2a): con un asfalto calido la
        // calzada se fundia con el suelo y parecian tierra. El asfalto
        // viejo y mojado de noche tira a azul, y eso es justo lo que lo
        // separa de la tierra.
        return [a2(v * 0.93), a2(v * 0.98), a2(v * 1.11)];
      });
    }, { anisotropia: 8 });
  }

  function texturaHormigon() {
    return conTextura('hormigon', 512, function (ctx, tam) {
      pixeles(ctx, tam, function (x, y) {
        const base = fbm(x / 30, y / 30, { octavas: 4, semilla: S + 400 });
        const manchas = fbm(x / 9, y / 9, { octavas: 3, semilla: S + 410 });
        let v = 0.52 + base * 0.24 - suave(0.48, 0.72, manchas) * 0.17;
        const grieta = Math.abs(fbm(x / 90, y / 90, { octavas: 2, semilla: S + 420 }) - 0.5);
        v = mezclar(v, 0.22, (1 - suave(0.0, 0.035, grieta)) * 0.75);
        return [a2(v), a2(v * 0.99), a2(v * 0.95)];
      });
    });
  }

  function texturaLadrillo() {
    return conTextura('ladrillo', 512, function (ctx, tam) {
      const alto = 26;
      const ancho = 62;
      pixeles(ctx, tam, function (x, y) {
        const fila = Math.floor(y / alto);
        const desfase = (fila % 2) * (ancho / 2);
        const bx = ((x + desfase) % ancho) / ancho;
        const by = (y % alto) / alto;
        const mortero = suave(0, 0.055, bx) * suave(1, 0.945, bx) * suave(0, 0.13, by) * suave(1, 0.87, by);
        const tono = hash2(Math.floor((x + desfase) / ancho), fila, S + 500);
        const grano = fbm(x / 5, y / 5, { octavas: 2, semilla: S + 510 });
        const ladrillo = [0.44 + tono * 0.11 + grano * 0.08, 0.28 + tono * 0.08 + grano * 0.06, 0.22 + tono * 0.06 + grano * 0.05];
        const gris = [0.38 + grano * 0.1, 0.37 + grano * 0.1, 0.35 + grano * 0.09];
        return [
          a2(mezclar(gris[0], ladrillo[0], mortero)),
          a2(mezclar(gris[1], ladrillo[1], mortero)),
          a2(mezclar(gris[2], ladrillo[2], mortero)),
        ];
      });
    });
  }

  function texturaEnlucido() {
    return conTextura('enlucido', 512, function (ctx, tam) {
      pixeles(ctx, tam, function (x, y) {
        const grano = fbm(x / 7, y / 7, { octavas: 3, semilla: S + 600 });
        const desconchado = fbm(x / 26, y / 26, { octavas: 3, semilla: S + 610 });
        const v = 0.68 + grano * 0.13;
        const cal = [v * 0.92, v * 0.9, v * 0.84];
        const ladrillo = [0.42 + grano * 0.1, 0.27 + grano * 0.07, 0.21 + grano * 0.05];
        const mortero = [0.36 + grano * 0.1, 0.35 + grano * 0.1, 0.33 + grano * 0.09];
        const caida = suave(0.5, 0.62, desconchado) * (0.5 + fbm(x / 60, y / 90, { octavas: 2, semilla: S + 620 }) * 0.9);
        const c1 = [mezclar(cal[0], mortero[0], caida), mezclar(cal[1], mortero[1], caida), mezclar(cal[2], mortero[2], caida)];
        const profundo = suave(0.6, 0.72, desconchado);
        return [
          a2(mezclar(c1[0], ladrillo[0], profundo)),
          a2(mezclar(c1[1], ladrillo[1], profundo)),
          a2(mezclar(c1[2], ladrillo[2], profundo)),
        ];
      });
    });
  }

  function texturaMadera(oscuro) {
    return conTextura(oscuro ? 'madera-oscura' : 'madera', 512, function (ctx, tam) {
      pixeles(ctx, tam, function (x, y) {
        const veta = fbm(x / 46, y / 5.5, { octavas: 4, semilla: S + 700 });
        const grano = hash2(x, y, S + 720);
        const v = (0.2 + veta * 0.2 + grano * 0.05) * (oscuro ? 1.15 : 1.85);
        return [a2(v), a2(v * 0.87), a2(v * 0.7)];
      });
    });
  }

  function texturaMetal() {
    return conTextura('metal', 512, function (ctx, tam) {
      pixeles(ctx, tam, function (x, y) {
        const oxido = fbm(x / 18, y / 18, { octavas: 4, semilla: S + 800 });
        const picado = fbm(x / 3.4, y / 3.4, { octavas: 2, semilla: S + 810 });
        const cantidad = suave(0.36, 0.72, oxido);
        return [
          a2(mezclar(0.36 + picado * 0.14, 0.44 + picado * 0.14, cantidad)),
          a2(mezclar(0.37 + picado * 0.14, 0.27 + picado * 0.1, cantidad)),
          a2(mezclar(0.38 + picado * 0.14, 0.19 + picado * 0.07, cantidad)),
        ];
      });
    });
  }

  function texturaCorteza() {
    return conTextura('corteza', 256, function (ctx, tam) {
      pixeles(ctx, tam, function (x, y) {
        const grietas = fbm(x / 4.5, y / 16, { octavas: 4, semilla: S + 900 });
        const v = 0.19 + grietas * 0.3;
        return [a2(v * 1.05), a2(v * 0.95), a2(v * 0.78)];
      });
    });
  }

  function texturaVentana() {
    return conTextura('ventana', 256, function (ctx, tam) {
      pixeles(ctx, tam, function (x, y) {
        const dentro = x > 24 && x < tam - 24 && y > 26 && y < tam - 26;
        const tabla = Math.floor((y - 26) / 32);
        const grano = fbm(x / 6, y / 6, { octavas: 3, semilla: S + 1000 });
        if (dentro) {
          const hueco = 1 - suave(0, 0.18, Math.abs(Math.sin((y - 26) * 0.098)));
          return [a2(0.012 + grano * 0.02), a2(0.015 + grano * 0.02), a2(0.02 + grano * 0.02), a2(hueco)];
        }
        const v = 0.4 + grano * 0.18 + hash2(tabla, 0, S + 1010) * 0.1;
        return [a2(v), a2(v * 0.88), a2(v * 0.72)];
      });
    });
  }

  function texturaHierba() {
    return conTextura('hierba', 128, function (ctx, tam) {
      ctx.clearRect(0, 0, tam, tam);
      for (let i = 0; i < 46; i += 1) {
        const x0 = hash2(i, 1, S + 1100) * tam;
        const alto = tam * (0.45 + hash2(i, 2, S + 1100) * 0.55);
        const curva = (hash2(i, 3, S + 1100) - 0.5) * tam * 0.5;
        const ancho = 1.6 + hash2(i, 4, S + 1100) * 2.4;
        const tono = 0.42 + hash2(i, 5, S + 1100) * 0.5;
        const g = ctx.createLinearGradient(x0, tam, x0 + curva, tam - alto);
        g.addColorStop(0, 'rgba(' + a2(0.14 * tono) + ',' + a2(0.21 * tono) + ',' + a2(0.09 * tono) + ',1)');
        g.addColorStop(1, 'rgba(' + a2(0.32 * tono) + ',' + a2(0.4 * tono) + ',' + a2(0.2 * tono) + ',0.85)');
        ctx.strokeStyle = g;
        ctx.lineWidth = ancho;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x0, tam);
        ctx.quadraticCurveTo(x0 + curva * 0.4, tam - alto * 0.55, x0 + curva, tam - alto);
        ctx.stroke();
      }
    });
  }

  function texturaBruma() {
    return conTextura('bruma', 256, function (ctx, tam) {
      pixeles(ctx, tam, function (x, y) {
        const u = x / tam;
        const v = y / tam;
        const borde = suave(0, 0.34, u) * suave(1, 0.66, u) * suave(0, 0.34, v) * suave(1, 0.66, v);
        const n = fbm(x / 34, y / 34, { octavas: 4, semilla: S + 1400 });
        const n2 = fbm(x / 11, y / 11, { octavas: 3, semilla: S + 1410 });
        const a = Math.max(0, n * 0.75 + n2 * 0.35 - 0.34) * borde;
        return [255, 255, 255, a2(Math.min(1, a))];
      });
    });
  }

  function texturaResplandor() {
    return conTextura('resplandor', 128, function (ctx, tam) {
      pixeles(ctx, tam, function (x, y) {
        const u = (x / tam - 0.5) * 2;
        const v = (y / tam - 0.5) * 2;
        const a = Math.max(0, 1 - Math.sqrt(u * u + v * v));
        return [255, 255, 255, a2(Math.pow(a, 3.4))];
      });
    });
  }

  function textoSobre(ctx, tam, lineas, opciones) {
    const o = opciones || {};
    ctx.save();
    ctx.globalAlpha = o.alfa === undefined ? 0.82 : o.alfa;
    ctx.fillStyle = o.tinta || '#8d9088';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const fuente = o.tam || 58;
    ctx.font = '700 ' + fuente + 'px ui-monospace, Consolas, monospace';
    const bloque = lineas.length * fuente * 1.32;
    for (let i = 0; i < lineas.length; i += 1) {
      const y = tam / 2 - bloque / 2 + fuente * 0.68 + i * fuente * 1.32;
      ctx.fillText(lineas[i], tam / 2, y, tam * 0.86);
    }
    ctx.restore();
  }

  function desgaste(ctx, tam, fuerza) {
    const f = fuerza === undefined ? 1 : fuerza;
    const img = ctx.getImageData(0, 0, tam, tam);
    const d = img.data;
    for (let y = 0; y < tam; y += 1) {
      for (let x = 0; x < tam; x += 1) {
        const i = (y * tam + x) * 4;
        const n = 0.5 + fbm(x / 12, y / 12, { octavas: 4, semilla: S + 1200 }) * 0.6;
        const manchas = 1 - suave(0.5, 0.8, fbm(x / 55, y / 55, { octavas: 3, semilla: S + 1210 })) * 0.5;
        const mordida = 1 - (1 - suave(0.3, 0.52, fbm(x / 7, y / 7, { octavas: 3, semilla: S + 1220 }))) * 0.55;
        const v = n * manchas * mordida * f;
        d[i] *= v; d[i + 1] *= v; d[i + 2] *= v;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  function texturaCartel(lineas, opciones) {
    const clave = 'cartel:' + lineas.join('|') + ':' + JSON.stringify(opciones || {});
    return conTextura(clave, 512, function (ctx, tam) {
      const o = opciones || {};
      ctx.fillStyle = o.fondo || '#2a2a26';
      ctx.fillRect(0, 0, tam, tam);
      textoSobre(ctx, tam, lineas, o);
      desgaste(ctx, tam, 1);
    });
  }

  function texturaVallado(lineas, opciones) {
    const clave = 'valla:' + lineas.join('|') + ':' + JSON.stringify(opciones || {});
    return conTextura(clave, 512, function (ctx, tam) {
      const o = opciones || {};
      ctx.fillStyle = o.fondo || '#1b1d1a';
      ctx.fillRect(0, 0, tam, tam);
      ctx.strokeStyle = 'rgba(150,152,144,0.32)';
      ctx.lineWidth = 5;
      ctx.strokeRect(10, 10, tam - 20, tam - 20);
      textoSobre(ctx, tam, lineas, { tam: 46, tinta: '#9a9d95' });
      desgaste(ctx, tam, 0.9);
    });
  }

  function texturaTienda(nombre) {
    const clave = 'tienda:' + nombre;
    return conTextura(clave, 512, function (ctx, tam) {
      ctx.fillStyle = '#2b2c28';
      ctx.fillRect(0, 0, tam, tam);
      textoSobre(ctx, tam, nombre.split(''), { tam: 96, tinta: '#9c9f95', alfa: 0.9 });
      desgaste(ctx, tam, 1.1);
    });
  }

  function texturaInstrumento() {
    return conTextura('instrumento', 512, function (ctx, tam) {
      ctx.fillStyle = '#0c0f11';
      ctx.fillRect(0, 0, tam, tam);
      const dial = function (cx, cy, r, etiqueta, maximo) {
        ctx.strokeStyle = 'rgba(150,160,150,0.5)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        for (let i = 0; i <= 10; i += 1) {
          const a = Math.PI * 0.78 + (i / 10) * Math.PI * 1.44;
          const largo = i % 5 === 0 ? r * 0.2 : r * 0.1;
          ctx.strokeStyle = i > 7 ? 'rgba(190,120,90,0.85)' : 'rgba(170,180,168,0.7)';
          ctx.lineWidth = i % 5 === 0 ? 5 : 3;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
          ctx.lineTo(cx + Math.cos(a) * (r - largo), cy + Math.sin(a) * (r - largo));
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(150,160,150,0.65)';
        ctx.font = '700 34px ui-monospace, Consolas, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(etiqueta, cx, cy + r * 0.42);
        ctx.font = '700 24px ui-monospace, Consolas, monospace';
        ctx.fillStyle = 'rgba(130,140,132,0.5)';
        ctx.fillText(maximo, cx, cy + r * 0.72);
      };
      dial(150, 256, 118, 'km/h', '220');
      dial(370, 256, 86, 'rpm', '6');
      ctx.fillStyle = 'rgba(120,150,120,0.5)';
      for (let i = 0; i < 6; i += 1) {
        ctx.fillRect(300 + (i % 2) * 66, 92 + Math.floor(i / 2) * 26, 44, 12);
      }
      const img = ctx.getImageData(0, 0, tam, tam);
      const d = img.data;
      for (let y = 0; y < tam; y += 1) {
        for (let x = 0; x < tam; x += 1) {
          const i = (y * tam + x) * 4;
          const n = 0.75 + fbm(x / 9, y / 9, { octavas: 3, semilla: S + 1400 }) * 0.5;
          d[i] *= n; d[i + 1] *= n; d[i + 2] *= n;
        }
      }
      ctx.putImageData(img, 0, 0);
    });
  }

  function texturaRadio() {
    return conTextura('radio', 256, function (ctx, tam) {
      ctx.fillStyle = '#111312';
      ctx.fillRect(0, 0, tam, tam);
      ctx.fillStyle = 'rgba(90,150,110,0.85)';
      ctx.fillRect(28, 60, 200, 54);
      ctx.fillStyle = 'rgba(60,90,70,0.7)';
      for (let i = 0; i < 5; i += 1) ctx.fillRect(38 + i * 38, 74, 26, 26);
      ctx.fillStyle = 'rgba(150,155,148,0.6)';
      ctx.fillRect(28, 150, 200, 16);
      ctx.fillRect(28, 180, 120, 14);
      ctx.fillRect(28, 206, 90, 14);
      ctx.fillStyle = 'rgba(180,120,90,0.75)';
      ctx.beginPath();
      ctx.arc(196, 196, 24, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // halo radial para el lente de la linterna y los faros
  function texturaHalo() {
    return conTextura('halo', 128, function (ctx, tam) {
      const c = tam / 2;
      const g = ctx.createRadialGradient(c, c, 0, c, c, c);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.18, 'rgba(255,246,226,0.72)');
      g.addColorStop(0.45, 'rgba(255,238,205,0.24)');
      g.addColorStop(0.75, 'rgba(255,230,190,0.05)');
      g.addColorStop(1, 'rgba(255,230,190,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, tam, tam);
    });
  }

  J.TEX = {
    PALETA: PALETA,
    detalle: texturaDetalle,
    halo: texturaHalo,
    haloLinterna: texturaHalo,
    asfalto: texturaAsfalto,
    hormigon: texturaHormigon,
    ladrillo: texturaLadrillo,
    enlucido: texturaEnlucido,
    madera: texturaMadera,
    metal: texturaMetal,
    corteza: texturaCorteza,
    ventana: texturaVentana,
    hierba: texturaHierba,
    bruma: texturaBruma,
    resplandor: texturaResplandor,
    cartel: texturaCartel,
    vallado: texturaVallado,
    tienda: texturaTienda,
    instrumento: texturaInstrumento,
    radio: texturaRadio,
  };
})(window.J = window.J || {});

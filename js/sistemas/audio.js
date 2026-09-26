(function (J) {
  'use strict';

  J.crearAudio = function crearAudio() {
    let ctx = null;
    let maestro = null;
    let oyente = null;
    let activo = true;
    let reloj = 0;
    let silencio = 0;
    let sala = 0;

    const bus = {};
    const nodos = {};

    function ahora() {
      return ctx ? ctx.currentTime : 0;
    }

    function ruidoBlanco(segundos) {
      const n = Math.floor(ctx.sampleRate * segundos);
      const buffer = ctx.createBuffer(1, n, ctx.sampleRate);
      const d = buffer.getChannelData(0);
      for (let i = 0; i < n; i += 1) d[i] = Math.random() * 2 - 1;
      return buffer;
    }

    function ruidoRosa(segundos) {
      const n = Math.floor(ctx.sampleRate * segundos);
      const buffer = ctx.createBuffer(1, n, ctx.sampleRate);
      const d = buffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < n; i += 1) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.96900 * b2 + w * 0.1538520;
        b3 = 0.86650 * b3 + w * 0.3104856;
        b4 = 0.55000 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.0168980;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      }
      return buffer;
    }

    function crearBus(nombre, volumen) {
      const g = ctx.createGain();
      g.gain.value = volumen;
      g.connect(maestro);
      bus[nombre] = g;
      return g;
    }

    function iniciar() {
      if (ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { activo = false; return; }
      ctx = new AC();
      maestro = ctx.createGain();
      maestro.gain.value = 0.95;
      maestro.connect(ctx.destination);

      if (ctx.listener.forwardX) {
        oyente = ctx.listener;
      }

      crearBus('ambiente', 0.9);
      crearBus('motor', 0);
      crearBus('radio', 0);
      crearBus('efectos', 0.95);
      crearBus('voz', 0.75);
      crearBus('espacial', 0.9);

      const rosa = ctx.createBufferSource();
      rosa.buffer = ruidoRosa(6);
      rosa.loop = true;
      const filtroViento = ctx.createBiquadFilter();
      filtroViento.type = 'lowpass';
      filtroViento.frequency.value = 420;
      filtroViento.Q.value = 0.6;
      const gananciaViento = ctx.createGain();
      gananciaViento.gain.value = 0.16;
      rosa.connect(filtroViento).connect(gananciaViento).connect(bus.ambiente);
      rosa.start();
      nodos.viento = { ganancia: gananciaViento, filtro: filtroViento };

      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.07;
      const lfoGanancia = ctx.createGain();
      lfoGanancia.gain.value = 190;
      lfo.connect(lfoGanancia).connect(filtroViento.frequency);
      lfo.start();

      const hojas = ctx.createBufferSource();
      hojas.buffer = ruidoBlanco(4);
      hojas.loop = true;
      const filtroHojas = ctx.createBiquadFilter();
      filtroHojas.type = 'bandpass';
      filtroHojas.frequency.value = 5200;
      filtroHojas.Q.value = 0.55;
      const gananciaHojas = ctx.createGain();
      gananciaHojas.gain.value = 0;
      hojas.connect(filtroHojas).connect(gananciaHojas).connect(bus.ambiente);
      hojas.start();
      nodos.hojas = { ganancia: gananciaHojas, filtro: filtroHojas };

      const ramas = ctx.createBufferSource();
      ramas.buffer = ruidoBlanco(4);
      ramas.loop = true;
      const filtroRamas = ctx.createBiquadFilter();
      filtroRamas.type = 'bandpass';
      filtroRamas.frequency.value = 2200;
      filtroRamas.Q.value = 0.9;
      const gananciaRamas = ctx.createGain();
      gananciaRamas.gain.value = 0;
      ramas.connect(filtroRamas).connect(gananciaRamas).connect(bus.ambiente);
      ramas.start();
      nodos.ramas = { ganancia: gananciaRamas, filtro: filtroRamas };

      const motor1 = ctx.createOscillator();
      motor1.type = 'sawtooth';
      motor1.frequency.value = 42;
      const motor2 = ctx.createOscillator();
      motor2.type = 'square';
      motor2.frequency.value = 21;
      const sub = ctx.createOscillator();
      sub.type = 'sine';
      sub.frequency.value = 42;
      const filtroMotor = ctx.createBiquadFilter();
      filtroMotor.type = 'lowpass';
      filtroMotor.frequency.value = 320;
      filtroMotor.Q.value = 3.2;
      const motorGain = ctx.createGain();
      motorGain.gain.value = 0;
      motor1.connect(filtroMotor);
      motor2.connect(filtroMotor);
      sub.connect(filtroMotor);
      filtroMotor.connect(motorGain).connect(bus.motor);
      motor1.start(); motor2.start(); sub.start();
      nodos.motor = { osc1: motor1, osc2: motor2, sub: sub, filtro: filtroMotor };

      const rodadura = ctx.createBufferSource();
      rodadura.buffer = ruidoRosa(3);
      rodadura.loop = true;
      const filtroRod = ctx.createBiquadFilter();
      filtroRod.type = 'bandpass';
      filtroRod.frequency.value = 900;
      filtroRod.Q.value = 0.7;
      const gananciaRod = ctx.createGain();
      gananciaRod.gain.value = 0;
      rodadura.connect(filtroRod).connect(gananciaRod).connect(bus.motor);
      rodadura.start();
      nodos.rodadura = { ganancia: gananciaRod, filtro: filtroRod };

      const estadura = ctx.createBufferSource();
      estadura.buffer = ruidoBlanco(3);
      estadura.loop = true;
      const filtroEstatica = ctx.createBiquadFilter();
      filtroEstatica.type = 'bandpass';
      filtroEstatica.frequency.value = 1500;
      filtroEstatica.Q.value = 0.5;
      const gananciaEstatica = ctx.createGain();
      gananciaEstatica.gain.value = 0;
      estadura.connect(filtroEstatica).connect(gananciaEstatica).connect(bus.radio);
      estadura.start();
      nodos.radio = { ganancia: gananciaEstatica, filtro: filtroEstatica };

      if (ctx.state === 'suspended') ctx.resume();
    }

    function paneo(pan) {
      if (ctx.createStereoPanner) {
        const p = ctx.createStereoPanner();
        p.pan.value = Math.max(-1, Math.min(1, pan));
        return p;
      }
      const g = ctx.createGain();
      return g;
    }

    const direccionOyente = { x: 0, y: 0, z: 1 };
    const origenOyente = { x: 0, y: 0, z: 0 };

    function posicional(x, y, z) {
      if (ctx.createPanner) {
        const p = ctx.createPanner();
        p.panningModel = 'equalpower';
        p.distanceModel = 'inverse';
        p.refDistance = 7;
        p.maxDistance = 95;
        p.rolloffFactor = 1.05;
        if (p.positionX) {
          p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z;
        } else {
          p.setPosition(x, y, z);
        }
        return p;
      }
      const dx = x - origenOyente.x;
      const dz = z - origenOyente.z;
      const largo = Math.hypot(dx, dz) || 1;
      const det = (dx / largo) * direccionOyente.x + (dz / largo) * direccionOyente.z;
      const lejos = Math.min(1, largo / 45);
      const g = ctx.createGain();
      g.gain.value = 1 - lejos * 0.72;
      const p = paneo(-det * (1 - lejos * 0.6));
      p.connect(g);
      const salida = { connect: function (destino) { g.connect(destino); } };
      return salida;
    }

    function destino(dur, pico, tipo, frec, q, espacial) {
      const t = ahora();
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, pico), t + Math.min(0.02, dur * 0.2));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      let salida = g;
      if (espacial && espacial !== true) {
        const p = posicional(espacial.x, espacial.y, espacial.z);
        g.connect(p);
        salida = p;
      }
      salida.connect(bus.efectos);
      if (espacial === true) salida.connect(bus.espacial);
      return { gain: g, fin: t + dur + 0.05, salida: salida };
    }

    function explosion(pico, dur, tipo, frec, q, pos) {
      const src = ctx.createBufferSource();
      src.buffer = ruidoBlanco(Math.max(0.4, dur + 0.2));
      const f = ctx.createBiquadFilter();
      f.type = tipo || 'bandpass';
      f.frequency.value = frec;
      f.Q.value = q || 1;
      const t = ahora();
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, pico), t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f).connect(g);
      if (pos) {
        const p = posicional(pos.x, pos.y, pos.z);
        g.connect(p);
        p.connect(bus.efectos);
      } else {
        g.connect(bus.efectos);
      }
      src.start(t);
      src.stop(t + dur + 0.05);
      return g;
    }

    function tono(freq, tipo, pico, dur, pos) {
      const o = ctx.createOscillator();
      o.type = tipo || 'sine';
      const t = ahora();
      o.frequency.setValueAtTime(freq, t);
      const env = destino(dur, pico, null, 0, 0, pos);
      o.connect(env.gain);
      o.start(t);
      o.stop(env.fin);
      return o;
    }

    const api = {
      iniciar: iniciar,
      get contexto() { return ctx; },
      get activo() { return activo; },
      get silenciado() { return sala > 0.5; },

      volumenGeneral(v) { if (maestro) maestro.gain.value = v; },

      oyente(x, y, z, adelanteX, adelanteZ) {
        origenOyente.x = x; origenOyente.y = y; origenOyente.z = z;
        direccionOyente.x = adelanteX; direccionOyente.z = adelanteZ;
        if (!oyente) return;
        if (oyente.positionX) {
          oyente.positionX.value = x; oyente.positionY.value = y; oyente.positionZ.value = z;
          oyente.forwardX.value = adelanteX; oyente.forwardZ.value = adelanteZ;
          oyente.upX.value = 0; oyente.upY.value = 1; oyente.upZ.value = 0;
        } else {
          oyente.setPosition(x, y, z);
          oyente.setOrientation(adelanteX, 0, adelanteZ, 0, 1, 0);
        }
      },

      ambiente(dt, opciones) {
        if (!ctx || !activo) return;
        const t = ahora();
        reloj += dt;

        const viento = opciones.viento || 0;
        const hojas = opciones.hojas === undefined ? 0.05 : opciones.hojas;
        const ramasN = opciones.ramas || 0;
        const interior = opciones.interior ? 1 : 0;

        if (sala > 0) {
          sala = Math.max(0, sala - dt * 0.35);
        } else if (reloj > 26 + Math.random() * 34 && Math.random() < dt * 0.09) {
          sala = 1;
        }

        const atenuacion = 1 - sala * 0.72;
        const techo = interior ? 0.35 : 1;

        nodos.viento.ganancia.gain.setTargetAtTime((0.1 + viento * 0.55) * atenuacion * techo, t, 0.5);
        nodos.viento.filtro.frequency.setTargetAtTime(280 + viento * 900, t, 0.6);
        nodos.hojas.ganancia.gain.setTargetAtTime(hojas * 0.05 * atenuacion * techo, t, 0.7);
        nodos.hojas.filtro.frequency.setTargetAtTime(4200 + hojas * 2600, t, 0.8);
        nodos.ramas.ganancia.gain.setTargetAtTime(ramasN * 0.11 * atenuacion * techo, t, 0.5);
        nodos.ramas.filtro.frequency.setTargetAtTime(1600 + ramasN * 2400, t, 0.6);
      },

      motor(rpm, cargado, dentro) {
        if (!ctx || !activo) return;
        const t = ahora();
        const base = 32 + rpm * 88;
        nodos.motor.osc1.frequency.setTargetAtTime(base, t, 0.07);
        nodos.motor.osc2.frequency.setTargetAtTime(base * 0.5, t, 0.07);
        nodos.motor.sub.frequency.setTargetAtTime(base * 0.5, t, 0.07);
        nodos.motor.filtro.frequency.setTargetAtTime(220 + rpm * 1400 + (cargado ? 520 : 0), t, 0.1);
        bus.motor.gain.setTargetAtTime(dentro ? 0.32 : 0.05, t, 0.14);
        nodos.rodadura.ganancia.gain.setTargetAtTime(dentro ? rpm * 0.2 : rpm * 0.09, t, 0.12);
        nodos.rodadura.filtro.frequency.setTargetAtTime(500 + rpm * 1900, t, 0.12);
      },

      radio(encendida, ruido) {
        if (!ctx || !activo || !nodos.radio) return;
        const t = ahora();
        bus.radio.gain.setTargetAtTime(encendida ? 0.5 : 0, t, 0.15);
        nodos.radio.ganancia.gain.setTargetAtTime(0.035 + ruido * 0.28, t, 0.1);
        nodos.radio.filtro.frequency.setTargetAtTime(700 + ruido * 2600 + Math.sin(t * 7) * 500, t, 0.1);
      },

      pasos(fuerza, agachado, enCarro) {
        if (!ctx || !activo) return;
        if (enCarro) {
          explosion(0.05 * fuerza, 0.1, 'lowpass', 260, 0.8);
          return;
        }
        explosion((agachado ? 0.035 : 0.085) * fuerza, 0.11, 'lowpass', 700 + Math.random() * 600, 0.9);
      },

      chirrido() {
        if (!ctx || !activo) return;
        const t = ahora();
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(180 + Math.random() * 80, t);
        o.frequency.exponentialRampToValueAtTime(70 + Math.random() * 30, t + 0.9);
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = 800;
        f.Q.value = 5;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.075, t + 0.12);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);
        o.connect(f).connect(g).connect(bus.efectos);
        o.start(t);
        o.stop(t + 1);
      },

      golpeLejano(intensidad) {
        if (!ctx || !activo) return;
        const v = intensidad === undefined ? 1 : intensidad;
        const ang = Math.random() * Math.PI * 2;
        const d = 25 + Math.random() * 55;
        const pos = {
          x: origenOyente.x + Math.cos(ang) * d,
          y: 0,
          z: origenOyente.z + Math.sin(ang) * d,
        };
        explosion(0.09 * v, 0.5, 'lowpass', 320, 0.7, pos);
        const t = ahora();
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(52, t);
        o.frequency.exponentialRampToValueAtTime(24, t + 0.7);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.12 * v, t + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
        const p = posicional(pos.x, pos.y, pos.z);
        o.connect(g).connect(p).connect(bus.efectos);
        o.start(t);
        o.stop(t + 0.85);
      },

      crujidoRamas(pos) {
        if (!ctx || !activo) return;
        explosion(0.05 + Math.random() * 0.05, 0.26, 'bandpass', 2400 + Math.random() * 2200, 1.6, pos || null);
      },

      chapoteo() {
        if (!ctx || !activo) return;
        explosion(0.05, 0.1, 'lowpass', 500, 0.9);
      },

      portazo() {
        if (!ctx || !activo) return;
        const t = ahora();
        explosion(0.12, 0.3, 'lowpass', 260, 0.8);
        tono(120, 'sine', 0.06, 0.28);
        void t;
      },

      campanilla(pos) {
        if (!ctx || !activo) return;
        tono(1620, 'sine', 0.05, 0.9, pos);
        setTimeout(function () { if (activo) tono(1230, 'sine', 0.035, 1.2, pos); }, 210);
      },

      grillos(pos) {
        if (!ctx || !activo) return;
        const base = 3600 + Math.random() * 1600;
        const p = pos || { x: origenOyente.x + (Math.random() - 0.5) * 30, y: 0, z: origenOyente.z + (Math.random() - 0.5) * 30 };
        for (let i = 0; i < 6; i += 1) {
          setTimeout(function () {
            if (!activo || !ctx) return;
            const t = ahora();
            const o = ctx.createOscillator();
            o.type = 'triangle';
            o.frequency.value = base;
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(0.011, t + 0.008);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
            const pan = posicional(p.x, p.y, p.z);
            o.connect(g).connect(pan).connect(bus.espacial);
            o.start(t);
            o.stop(t + 0.06);
          }, i * 65);
        }
      },

      buho() {
        if (!ctx || !activo) return;
        const t = ahora();
        const ang = Math.random() * Math.PI * 2;
        const d = 18 + Math.random() * 30;
        const pos = { x: origenOyente.x + Math.cos(ang) * d, y: 3, z: origenOyente.z + Math.sin(ang) * d };
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(430, t);
        o.frequency.setValueAtTime(368, t + 0.3);
        o.frequency.setValueAtTime(424, t + 0.52);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.026, t + 0.09);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.62);
        const p = posicional(pos.x, pos.y, pos.z);
        o.connect(g).connect(p).connect(bus.espacial);
        o.start(t);
        o.stop(t + 0.7);
      },

      animalLejano() {
        if (!ctx || !activo) return;
        const ang = Math.random() * Math.PI * 2;
        const d = 35 + Math.random() * 45;
        const pos = { x: origenOyente.x + Math.cos(ang) * d, y: 0, z: origenOyente.z + Math.sin(ang) * d };
        if (Math.random() < 0.5) {
          explosion(0.05, 0.35, 'bandpass', 900, 3, pos);
        } else {
          tono(220 + Math.random() * 120, 'sawtooth', 0.018, 0.5, pos);
        }
      },

      interferencia() {
        if (!ctx || !activo) return;
        explosion(0.035 + Math.random() * 0.07, 0.3, 'bandpass', 1200 + Math.random() * 2400, 0.6);
      },

      voz(pos) {
        if (!ctx || !activo) return;
        const t = ahora();
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(105 + Math.random() * 40, t);
        o.frequency.linearRampToValueAtTime(88 + Math.random() * 30, t + 0.55);
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = 720;
        f.Q.value = 2.6;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.045, t + 0.09);
        g.gain.setValueAtTime(0.045, t + 0.22);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
        o.connect(f).connect(g);
        if (pos) {
          const p = posicional(pos.x, pos.y, pos.z);
          g.connect(p).connect(bus.voz);
        } else {
          g.connect(bus.voz);
        }
        o.start(t);
        o.stop(t + 0.65);
      },

      vientoGolpe() {
        if (!ctx || !activo) return;
        explosion(0.1, 1.7, 'bandpass', 560, 0.5);
      },

      obturacion() {
        if (!ctx || !activo) return;
        explosion(0.05, 0.22, 'bandpass', 900, 2.4);
      },
    };

    return api;
  };
})(window.J = window.J || {});

# Silent-Trace

Juego 3D de terror psicológico. Un pueblo abandonado, un bosque denso y un coche
que se queda sin gasolina a mitad de la carretera.

Three.js/WebGL puro, sin build, sin servidor, sin dependencias en tiempo de
ejecución. Three.js está vendorizado en `js/vendor/`.

## Cómo jugar

Abre `index.html` con doble clic. Funciona directamente desde `file://`.

No requiere instalación, ni build, ni servidor local. Casi todo el contenido
(texturas, sonido, terreno, vegetación) se genera por código en tiempo de carga.
La única excepción es la geometría del coche, que viene de un modelo 3D
convertido a un archivo de datos (ver [Assets](#assets)).

## Controles

| Tecla | Acción |
| --- | --- |
| `W A S D` | Conducir / caminar |
| `Ratón` | Mirar |
| `Mayús` | Correr |
| `Espacio` | Freno / freno de mano |
| `E` | Interactuar · entrar y salir del coche |
| `L` | Faros (sólo desde el asiento) |
| `F` | Linterna |
| `R` | Cambiar de herramienta |
| `G` | Hacer una fotografía |
| `Tab` | Revisar la libreta |
| `M` | Radio |
| `C` | Claxon |
| `P` | Efecto cinematográfico |
| `Esc` | Pausa |

## Estructura

```
index.html          punto de entrada, orden de scripts
css/estilos.css     interfaz
js/vendor/          Three.js r185 vendorizado
js/datos/           configuración y mapa
js/nucleo/          motor, bucle, entrada, colisiones, post-proceso, ruido
js/mundo/           terreno, caminos, carretera, bosque, pueblo, hospital
js/jugador/         jugador, linterna, interacción
js/vehiculos/       vehículo y cargador del modelo
js/sistemas/        audio, herramientas, manos, progresión, interfaz, guardado
js/main.js          orquestación
assets/             datos del modelo del coche (generado)
tools/              conversor GLB -> assets (Node, fuera del navegador)
```

Todo el código usa el namespace global `J` y scripts clásicos, sin módulos.

## Interfaz

`js/sistemas/interfaz.js` lleva la máquina de estados `carga → menu ⇄ juego ⇄ pausa`.

El menú principal **no construye un mundo aparte**: espera a que el mundo real
esté construido y filma el coche de juego con los faros encendidos desde una
cámara propia (`interfaz.camara`), con un giro muy lento y unas 340 partículas
de polvo. Lo único que se añade al escenario es esa cámara y un `THREE.Points`.

La pausa es una identidad distinta: no cambia de cámara ni de escena, solo
atenúa y desenfoca un poco el lienzo congelado y pone el menú encima.

`js/nucleo/postproceso.js` acepta la cámara como argumento en `dibujar()` para
pintar el menú con la suya, y se salta la escena de overlay (las manos), que
solo tiene sentido con la cámara del juego.

## Guardado

`localStorage`, clave `silent-trace:partida`. Funciona con `file://`, sin
servidor: se comprobó que Chrome guarda y recupera entre sesiones con la
pestaña cerrada.

El guardado es **modular**. Cada sistema registra su trozo y sabe aplicarlo
solo; añadir capítulos, puertas, fotografías o decisiones más adelante es
llamar a `guardado.registrar({ id, guardar, restaurar })` con un `id` nuevo,
sin tocar el archivo de guardado ni los anteriores.

```js
guardado.registrar({
  id: 'miSistema',
  guardar() { return { dato: valor }; },
  restaurar(d) { valor = d.dato; },
});
```

Módulos actuales: `jugador`, `vehiculo`, `progresion`, `hitos`,
`herramientas`, `cuaderno`. El formato lleva `version`, así que un guardado
viejo se descarta en vez de romperse.

**Cuándo se guarda** (nunca por frame):

- cambio de zona de la carretera, agrupado con un intervalo mínimo de 4 s;
- avance de objetivo;
- recoger un objeto con equipo;
- anotar una evidencia nueva;
- bajar del vehículo;
- volver al menú principal.

`guardar(motivo)` escribe ya. `guardarPronto(motivo)` agrupa lo que se repita
dentro del intervalo y `vaciar()` lo ejecuta desde el bucle. Cuando escribe,
el HUD muestra `PARTIDA GUARDADA` durante un segundo.

**NUEVA PARTIDA** pide confirmación si hay algo guardado y no borra nada
mientras se espere la respuesta. Las preferencias de volumen, sensibilidad y
calidad van aparte, en `silent-trace:opciones`.

## Assets

El coche es el único contenido que no se genera en tiempo de carga. El flujo es:

```
murphy_92_-_low_poly_model.glb   entrada, no se versiona
        |
        |  node tools/glb2coche.mjs
        v
assets/coche.js                  salida, versionada (868 KB)
        |
        |  js/vehiculos/cargador.js
        v
34 piezas animables en la escena
```

Para cambiar el modelo, deja el `.glb` en la raíz del proyecto y ejecuta:

```sh
node tools/glb2coche.mjs [ruta/al/modelo.glb]
```

y sube el `assets/coche.js` resultante. El conversor es determinista: mismo
`.glb`, mismo resultado byte a byte.

Dos detalles que explican por qué la geometría está en base64 y no como GLB:

- `file://` no permite `fetch`, así que los datos van incrustados en un `.js`
  que se carga como script clásico.
- Las texturas del modelo no se incluyen. Chrome bloquea los `.bin` externos
  desde `file://` por CORS, y pesaban 7 MB. El coche usa materiales
  procedurales definidos en `js/vehiculos/vehiculo.js`.

El `.glb` no está en el repositorio a propósito: es un binario de 8 MB que solo
hace falta para regenerar el coche, y el juego nunca lo lee.

## Licencia

Three.js se distribuye bajo su propia licencia, en `js/vendor/LICENSE`.

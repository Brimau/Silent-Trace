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
| `Esc` | Liberar el cursor |

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
js/sistemas/        audio, herramientas, manos, progresión
js/main.js          orquestación
assets/             datos del modelo del coche (generado)
tools/              conversor GLB -> assets (Node, fuera del navegador)
```

Todo el código usa el namespace global `J` y scripts clásicos, sin módulos.

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

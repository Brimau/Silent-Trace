# Silent-Trace

Juego 3D de terror psicológico. Un pueblo abandonado, un bosque denso y un coche
que se queda sin gasolina a mitad de la carretera.

Three.js/WebGL puro, sin build, sin servidor, sin dependencias en tiempo de
ejecución. Three.js está vendorizado en `js/vendor/`.

## Cómo jugar

Abre `index.html` con doble clic. Funciona directamente desde `file://`.

No requiere instalación, ni build, ni servidor local. Todo el contenido
(texturas, sonido, geometría) se genera por código.

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
js/vehiculos/       vehículo
js/sistemas/        audio, herramientas, progresión
js/main.js          orquestación
```

Todo el código usa el namespace global `J` y scripts clásicos, sin módulos.

## Licencia

Three.js se distribuye bajo su propia licencia, en `js/vendor/LICENSE`.

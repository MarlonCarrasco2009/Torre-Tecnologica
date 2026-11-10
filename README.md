# SENATI 3D — Torres Tecnológicas (planta baja)

**Versión:** 0.3, patio de Torre A actualizado al croquis del 10 de noviembre de 2026.

Esta maqueta en HTML, CSS, JavaScript y **Three.js** dibuja el **primer piso de las tres torres** y permite recorrer los **vestíbulos de elevadores del piso 1 al 11**:

- **Torre C (izquierda):** cafetería, cocina, otros ambientes y terraza comedor próxima a la torre.
- **Torre B (centro):** biblioteca, aula y elevadores.
- **Torre A (derecha):** Sala de Conferencias, Atención al Estudiante (Experiencia Estudiantil), Administración y tópico.
- **Proporciones distintas:** C más ancha, B más larga y A de dimensiones diferentes; son aproximaciones sin cotas reales.
- **Conexión con muros:** pórticos abiertos unen los extremos de las tres torres con el cerramiento; dos franjas de pasarelas con columnas conectan las torres entre sí.
- **Acceso principal:** a la **derecha** de la fachada, no en el centro; puedes editarlo en `CONFIG.ingreso`.
- Entre torres: corredores abiertos, columnas y vigas de conexión.
- Terreno: muros grises (base blanca y paneles superiores), rampas/escaleras del color del pavimento y áreas verdes.

**Importante:** las proporciones y las divisiones son **interpretaciones aproximadas** del croquis recibido, no planos técnicos verificados. En los pisos 2 a 11 solo está representado el núcleo de elevadores y su vestíbulo, no las aulas ni la distribución completa de las torres. La imagen del croquis original está en `assets/croquis-referencia.png`.

## 1. Cómo abrir

1. Descomprime `SENATI-3D.zip` en tu computadora.
2. Abre la carpeta `SENATI-3D` en **Visual Studio Code**.
3. Instala la extensión **Live Server** si no la tienes.
4. Abre `index.html` y pulsa **Go Live** o clic derecho → **Open with Live Server**.
5. Se abrirá la maqueta en tu navegador; necesitas internet para cargar Three.js desde jsDelivr.

**Alternativa:** desde la terminal en la carpeta del proyecto, ejecuta `py -m http.server 5500` (o `python -m http.server 5500`) y abre `http://localhost:5500/`.

No abras `index.html` haciendo doble clic: un servidor local evita problemas con los módulos JavaScript.

## 2. Cómo usar

- Arrastra con el botón izquierdo del mouse para rotar la cámara.
- Usa la rueda para acercar/alejar.
- Haz clic derecho y arrastra para desplazar la vista.
- Haz clic sobre el suelo de un ambiente para consultar sus datos.
- El panel izquierdo permite enfocar cada torre y ocultar las capas.
- El botón **Planta** cambia a vista superior.
- **Ver patio del croquis** enfoca la distribución corregida de Torre A; **Ver fachadas de Torre A** muestra los paneles y rótulos de Conferencias y Experiencia Estudiantil y oculta las etiquetas flotantes. Se pueden volver a activar en **Nombres de espacios**.
- **Recorrer** activa la cámara en tercera persona con un estudiante 3D estilizado, inspirado en la referencia del polo azul SENATI y pantalón oscuro.
- En recorrido: **WASD o flechas** para caminar, **Shift** para correr y **E** para saludar. Arrastra sobre la vista para girar la cámara y usa la rueda para acercarla o alejarla.
- También hay botones en pantalla: mantén las flechas para moverte, activa **Correr** para cambiar la velocidad y pulsa **Saludar**. Funcionan con ratón y pantalla táctil.
- **Esc**, **Salir del recorrido** o **Volver a la maqueta** restauran la cámara y las capas anteriores. **Volver al inicio** devuelve al personaje a la zona abierta de la Torre A.
- El personaje tiene animaciones de reposo, caminata, carrera y saludo; sigue el desnivel de rampas y escalones. Las colisiones impiden atravesar muros, columnas y jardineras o abandonar un borde alto.
- **Ver área de elevadores** enfoca las cuatro cabinas, las paredes de vidrio con marcos negros y el jardín lateral en L.
- **Ir a los elevadores · Pisos 1–11** inicia el recorrido dentro del vestíbulo. Acércate a una cabina y pulsa **F** o **Entrar al elevador**. Las puertas se abren y el personaje entra; elige un número del **1 al 11** en la botonera.
- Durante el viaje se cierran las puertas, asciende o desciende la cabina con el personaje y se muestra el piso actual. Al llegar, **Salir al piso** permite recorrer el vestíbulo y volver a llamar una cabina. Los niveles superiores tienen cerramientos para impedir salir al vacío.
- **Volver al inicio**, salir del recorrido o cambiar de vista restablece las cabinas en el piso 1 y oculta los vestíbulos superiores.

## 3. Archivos principales

```text
SENATI-3D/
├── index.html                     Interfaz web y carga de librerías
├── css/estilos.css                Diseño responsive
├── js/
│   ├── main.js                    Cámara, render, botones, selección
│   ├── config.js                  Ubicación y ambientes de cada torre
│   ├── geometria.js               Funciones para cajas, columnas, etiquetas
│   ├── exteriores.js              Muros, terreno, jardines, rampas
│   └── floors/
│       ├── piso1.js               Construcción de cada planta baja
│       └── registro.js            Registro de torres y de pisos futuros
└── assets/croquis-referencia.png  Croquis proporcionado por el equipo
```

## 4. Cómo ajustar el primer piso

En `js/config.js` encontrarás `CONFIG.torres` y `AMBIENTES`. Por ejemplo:

```js
{ id:'b-biblioteca', nombre:'Biblioteca', x:0, z:-1.5, ancho:13, fondo:22.5, ... }
```

- `x` mueve la zona hacia izquierda/derecha **dentro de su torre**.
- `z` mueve la zona hacia adelante/atrás; **Z positivo apunta hacia el ingreso**.
- `ancho` y `fondo` cambian las dimensiones de la zona.
- `paredes` indica en cuáles bordes hay muros: `norte`, `sur`, `este`, `oeste`.
- **No añadas muros continuos donde el croquis tiene líneas discontinuas:** esas áreas se sostienen con columnas.

Para mover una torre completa, cambia sus `x` y `z` en `CONFIG.torres`, pero recuerda revisar las conexiones exteriores si modificas mucho la separación.

## 5. ¿Cómo agregará cada compañero un piso nuevo?

Cada piso futuro será un archivo independiente que devuelva un objeto `THREE.Group`.

Por ejemplo, cuando tu compañero haya hecho su propio croquis del piso 2 de la Torre A, podrá crear `js/floors/piso2A.js`:

```js
import * as THREE from 'three';
import { placa, bloque } from '../geometria.js';
import { CONFIG } from '../config.js';

export function crearPiso2A() {
  const piso = new THREE.Group();
  placa(piso, { ancho: CONFIG.torres.A.ancho, fondo: CONFIG.torres.A.fondo, color: '#dce4eb' });
  // Aquí se agregan los salones según el croquis del piso 2.
  // Ejemplo de muro:
  // bloque(piso, { x: 0, y: 1.6, z: 0, ancho: 8, alto: 3.2, fondo: 0.3 });
  return piso;
}
```

Después, en `js/main.js` se importará la función nueva y el registro:

```js
import { agregarPiso } from './floors/registro.js';
import { crearPiso2A } from './floors/piso2A.js';

// Debajo de `const torres = crearTorres(...)`:
agregarPiso(torres, 'A', 2, crearPiso2A);
```

`agregarPiso` coloca automáticamente el nivel a `(numeroPiso - 1) × CONFIG.altoPiso` y evita duplicar el mismo piso en una torre.

**Atención:** el ejemplo anterior es para integrar pisos en el futuro; **NO está añadido** en esta versión de la maqueta.

## 6. Limitaciones actuales

- Los muros interiores, columnas, conexiones y dimensiones son **aproximados**; faltan cotas y planos por piso.
- El recorrido tiene colisiones aproximadas sobre la geometría de la maqueta; no permite saltar ni atravesar puertas cerradas. Los elevadores son una simulación visual con once paradas; no hay búsqueda real de aulas ni plantas superiores completas.
- Las rampas y escaleras tienen una geometría simplificada, y no verifican accesibilidad ni características estructurales reales.
- El modelo de muros es una representación visual, no una reproducción arquitectónica exacta.

## 7. Recomendaciones para el trabajo en equipo

- Usen un repositorio Git compartido.
- Mantengan los pisos en archivos distintos: `piso2A.js`, `piso3A.js`, `piso2B.js`, etc.
- Guarden una copia de cada croquis y anoten qué medidas están confirmadas o son estimadas.
- No modifiquen `js/floors/piso1.js` salvo que estén corrigiendo la planta baja.
- No suban información privada, planos restringidos ni datos personales en la maqueta pública.

Hecho como **prototipo editable** a partir del croquis aportado por el estudiante.

## 8. Corrección realizada en v0.2 (noviembre 2026)

- Las tres torres ya **no tienen la misma huella**: C = 21 × 69; B = 16.5 × 74; A = 18.5 × 70 (unidades de maqueta, **no metros**).
- Los ambientes se escalan en cada torre de manera proporcional para mantener una base que permita sumar pisos más adelante.
- En `js/exteriores.js`, `unirTorresAlMuro` agrega pórticos hasta el muro delantero y posterior. `unirTorresEntreSi` crea dos conexiones transversales por pares de torres.
- La entrada peatonal está al lado derecho: `js/config.js`, `CONFIG.ingreso = { x: 68, ancho: 1.8 }`, como un hueco pequeño sin puerta ni pórtico. La zona ajardinada tiene una escala transversal de 1.5 y el cerco derecho se extendió 24.5 unidades. Las torres tienen bases macizas elevadas (`CONFIG.baseY = 1.82`); un paseo elevado separa la torre A de los jardines desplazados lateralmente. Las parejas de escaleras se unificaron en tramos anchos, el césped llega a su borde y las rampas suben progresivamente desde la plaza hasta el nivel de la torre.
- Este sigue siendo un prototipo visual; **ninguna proporción ni ubicación está verificada con medidas de campo**. Corrige las dimensiones cuando tengas los croquis acotados.

## 9. Croquis de Torre A actualizado · 10 de noviembre de 2026

Referencia conservada en `assets/croquis-torre-a-2026-11-10.png`. Las medidas siguen siendo unidades aproximadas de maqueta.

- Jardín rectangular, isla trapezoidal, jardín derecho con entrante en L y franjas verdes frontal y posterior recolocados según el dibujo. Ingreso peatonal, caja y plazoleta de piedra en la esquina posterior derecha.
- Pasillo central horizontal a la misma cota que Torre A y el ingreso. En el pasillo exterior se recuperó una rampa a la izquierda de la escalera: conecta directamente el piso bajo con el descanso superior, junto a la isla trapezoidal. A su derecha permanece el pasillo inclinado con la escalera junto al jardín en L.
- Tres conjuntos de escaleras: el frontal de la isla trapezoidal tiene **dos tramos contiguos de 11 peldaños cada uno**, que suben hacia las torres (-X), separados por una baranda central. La pareja posterior de la isla rectangular se retiró al elevar todo el piso a una misma cota. La escalera posterior junto a Torre A tiene 11 peldaños y la exterior junto al jardín en L tiene 5. Los peldaños se calculan por el desnivel, con una contrahuella de maqueta no mayor a 0.16; el croquis no confirma un número real de peldaños.
- Sala de Conferencias ampliada y alineada con el jardín: cinco hojas grises, agrupadas en dos parejas y una individual, con vanos transitables.
- Atención al Estudiante incorpora la fachada de **Experiencia Estudiantil**, con dos hojas de vidrio de 0.035 unidades de espesor, perfiles metálicos, tiradores largos, paños fijos y franja esmerilada. Paneles grises y claros y rótulos físicos basados en las fotos de referencia.
- El recorrido comienza dentro del acceso frontal. Se mantienen las torres B y C y el funcionamiento de sus elevadores.
- El piso entre el ingreso peatonal y Torre A es completamente horizontal a la cota 1.83, con relleno macizo. El paso central entre jardines y el pavimento de piedra del ingreso comparten esa altura. Se eliminaron la depresión, la pendiente de enlace y la escalera posterior que ya no tenía desnivel que salvar.

Validación: `tests/recorrido.test.mjs` comprueba el paso por las siete hojas, la subida y bajada por todos los carriles de las escaleras, las parejas orientadas hacia las torres con baranda central, la rampa izquierda de recorrido continuo, la altura uniforme del patio y del pasillo central, las colisiones y los cuatro elevadores entre los pisos 1 y 11. Ejecutar con `node tests/recorrido.test.mjs RUTA/three.core.mjs`, usando Three.js 0.180.0.

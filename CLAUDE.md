# Elenco DFUN 90 años

Herramienta para que el maestro del Grupo de Danzas Folclóricas de la Universidad Nacional arme el elenco de la Gala 90 años (miércoles 18 de noviembre) y para que cada bailarín vea en vivo qué baila.

## Stack
- HTML, CSS y JavaScript en módulos ES, sin paso de compilación.
- Alojamiento: Cloudflare Workers con assets estáticos, conectado a este repositorio. `main` = producción en `dfun.app` y `elenco-dfun-90.bonillahermes.workers.dev`; otras ramas = vista previa en `<rama>-elenco-dfun-90.bonillahermes.workers.dev`. Sin build.
- Firebase Authentication (Google, solo cuentas `@unal.edu.co`) y Cloud Firestore en tiempo real. SDK 10.12.2 desde gstatic.
- SheetJS 0.18.5 desde cdnjs para importar y exportar Excel.
- Pruebas: `node --test tests/reglas.test.mjs` (no requiere dependencias).

## Estructura
- `public/`: todo lo que se publica (index.html, css, js, _headers). `wrangler.jsonc` apunta ahí.
- `public/js/montaje.js`: bloques, danzas con horas, reglas y minuto a minuto. Es la única fuente de verdad del montaje.
- `public/js/reglas.js`: motor de reglas puro (sin DOM ni red). Cubierto por `tests/`.
- `public/js/datos.js`: capa de datos con dos implementaciones de la misma interfaz: Firebase y local (localStorage). Si `public/js/config.js` no tiene `apiKey`, corre en modo local de prueba (`?correo=x@unal.edu.co` simula la vista de un bailarín).
- `public/js/excel.js`: lectura y escritura de Excel (hoja `Inscripción`).
- `public/js/app.js`: interfaz. Página de inicio pública con botón Ingresar. Maestro: Matriz, Por danza, Por persona, Logística, Programa, Datos. Bailarín: su programa y el programa general.
- `scripts/sembrar.mjs`: carga inicial única a Firestore con firebase-admin y credenciales de `gcloud auth application-default login`. Lee `datos/semilla.json` (fuera de git).
- `firestore.rules`: leen cuentas UNAL verificadas; escriben solo los maestros. La lista de maestros está en `firestore.rules` y en `MAESTROS` de `public/js/config.js`; deben coincidir.

## Datos en Firestore
- `personas/{id}`: nombre, rol (Hombre | Mujer), vinculo, correo, postulaciones[], obs, creado.
- `elenco/{id}`: danzas[], actualizado, por. El id es el de la persona.
- `config/estado`: definidas { [danza]: true }.

## Reglas del montaje (dadas por el maestro)
- 7 bloques; dentro de un bloque se comparte vestuario.
- Entre danzas de bloques distintos: 0 min = imposible, 1 a 4 min = cambio rápido (advertencia), 5 o más = normal. Se evalúa por pares consecutivos de las danzas de cada persona.
- Guaneña y Danza de Nariño son una sola columna. Cortadeña exige Fandanguillo. Bullerengue es solo de mujeres y no comparte gente con Cumbia. Cumbia sugiere Pilanderas (no obliga).
- Mujeres: máximo 4 danzas. Hombres: sin límite.
- Cupos fijos por danza y rol (`CUPOS` en montaje.js, de la matriz de vestuario): no se puede asignar por encima del cupo.
- "Definida" marca un elenco ya acordado (Palo negro): se puede cambiar, con confirmación.

## Vestuario
- `VESTUARIO` en montaje.js: prendas por danza y rol como [nombre, disponible, necesarias?]; sin "necesarias" se usa el cupo. Faltantes se compran; la pestaña Vestuario los muestra.
- `PIEZAS_COMPARTIDAS`: prendas físicas que pasan de una danza a otra de distinto bloque; se calcula quién entrega y quién recibe.
- El bailarín ve una ficha por danza: hora, danza anterior y siguiente en escena, su cambio, vestuario a alistar, elenco y recomendaciones.

## Roles
- Administrador: hyate@unal.edu.co (Hermes). Todo lo del maestro, más restaurar datos desde Excel y borrar personas.
- Maestro: arma el elenco. Lista en `MAESTROS` (config.js) y en `maestro()` de firestore.rules.
- Bailarín: cualquier cuenta UNAL cuyo correo esté vinculado a una persona; ve su propio programa.
- Un mismo usuario puede tener varios roles: si es maestro y bailarín, el encabezado ofrece "Elenco | Mi programa".

## Principio de uso
- La operación diaria no usa Excel: todo se guarda en Firestore. El Excel es solo respaldo (exportar) o restauración de emergencia.

## Convenciones
- Interfaz y textos en español con tildes. Sin datos personales en el repositorio (los Excel están en .gitignore).
- Probar en ancho de teléfono: la página no debe desbordarse horizontalmente.

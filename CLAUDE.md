# Elenco DFUN 90 años

Herramienta para que el maestro del Grupo de Danzas Folclóricas de la Universidad Nacional arme el elenco de la Gala 90 años (miércoles 18 de noviembre) y para que cada bailarín vea en vivo qué baila.

## Stack
- HTML, CSS y JavaScript en módulos ES, sin paso de compilación.
- Alojamiento: Cloudflare Workers con assets estáticos, conectado a este repositorio. `main` = producción en `dfun.app` y `elenco-dfun-90.bonillahermes.workers.dev`; otras ramas = vista previa en `<rama>-elenco-dfun-90.bonillahermes.workers.dev`. Sin build.
- Firebase Authentication (Google, solo cuentas `@unal.edu.co`) y Cloud Firestore en tiempo real. SDK 10.12.2 desde gstatic.
- SheetJS 0.18.5 desde cdnjs para importar y exportar Excel.
- Pruebas: `node --test tests/reglas.test.mjs` (no requiere dependencias).

## Estructura
- `js/montaje.js`: bloques, danzas con horas, reglas y minuto a minuto. Es la única fuente de verdad del montaje.
- `js/reglas.js`: motor de reglas puro (sin DOM ni red). Cubierto por `tests/`.
- `js/datos.js`: capa de datos con dos implementaciones de la misma interfaz: Firebase y local (localStorage). Si `js/config.js` no tiene `apiKey`, corre en modo local de prueba (`?correo=x@unal.edu.co` simula la vista de un bailarín).
- `js/excel.js`: lectura y escritura de Excel (hoja `Inscripción`).
- `js/app.js`: interfaz. Página de inicio pública con botón Ingresar. Maestro: Matriz, Por danza, Por persona, Logística, Programa, Datos. Bailarín: su programa y el programa general.
- `scripts/sembrar.mjs`: carga inicial única a Firestore con firebase-admin y credenciales de `gcloud auth application-default login`. Lee `datos/semilla.json` (fuera de git).
- `firestore.rules`: leen cuentas UNAL verificadas; escriben solo los maestros. La lista de maestros está en `firestore.rules` y en `MAESTROS` de `js/config.js`; deben coincidir.

## Datos en Firestore
- `personas/{id}`: nombre, rol (Hombre | Mujer), vinculo, correo, postulaciones[], obs, creado.
- `elenco/{id}`: danzas[], actualizado, por. El id es el de la persona.
- `config/estado`: definidas { [danza]: true }.

## Reglas del montaje (dadas por el maestro)
- 7 bloques; dentro de un bloque se comparte vestuario.
- Entre danzas de bloques distintos: 0 min = imposible, 1 a 4 min = cambio rápido (advertencia), 5 o más = normal. Se evalúa por pares consecutivos de las danzas de cada persona.
- Guaneña y Danza de Nariño son una sola columna. Cortadeña exige Fandanguillo. Bullerengue es solo de mujeres y no comparte gente con Cumbia. Cumbia sugiere Pilanderas (no obliga).
- Mujeres: máximo 4 danzas. Hombres: sin límite.
- "Definida" marca un elenco ya acordado (Palo negro): se puede cambiar, con confirmación.

## Maestros
- bsilvab@unal.edu.co (maestro del grupo) y hyate@unal.edu.co (Hermes, administrador).

## Principio de uso
- La operación diaria no usa Excel: todo se guarda en Firestore. El Excel es solo respaldo (exportar) o restauración de emergencia.

## Convenciones
- Interfaz y textos en español con tildes. Sin datos personales en el repositorio (los Excel están en .gitignore).
- Probar en ancho de teléfono: la página no debe desbordarse horizontalmente.

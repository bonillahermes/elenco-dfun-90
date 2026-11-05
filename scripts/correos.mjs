// Vincula correos a personas existentes en Firestore, cruzando por nombre.
// Solo escribe el campo correo: no toca danzas, elenco ni ningún otro dato, y nunca reemplaza un correo ya vinculado.
// Uso:
//   gcloud auth application-default login      (una vez, con la cuenta dueña del proyecto)
//   cd scripts && npm install
//   node correos.mjs ../datos/correos.tsv --proyecto dfun-app                       (simulación, no escribe)
//   node correos.mjs ../datos/correos.tsv --proyecto dfun-app --aplicar             (escribe las coincidencias exactas)
//   node correos.mjs ../datos/correos.tsv --proyecto dfun-app --aplicar --aceptar-sugeridos
//        (además vincula los nombres incompletos que coinciden con una única persona; revíselos antes en la simulación)
// El archivo es texto con dos columnas separadas por tabulación: nombre y correo. Guárdelo en datos/ (fuera de git).
import { readFileSync } from "node:fs";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { leerTSV, cruzar } from "./cruzar-correos.mjs";

const args = process.argv.slice(2);
const valor = (op) => { const i = args.indexOf(op); return i >= 0 ? args[i + 1] : null; };
const proyecto = valor("--proyecto");
const archivo = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--proyecto");
const aplicar = args.includes("--aplicar"), aceptarSugeridos = args.includes("--aceptar-sugeridos");
if (!archivo || !proyecto) { console.error("Uso: node correos.mjs <correos.tsv> --proyecto <id> [--aplicar] [--aceptar-sugeridos]"); process.exit(1); }

const filas = leerTSV(readFileSync(archivo, "utf8"));
initializeApp({ credential: applicationDefault(), projectId: proyecto });
const db = getFirestore();
const personas = (await db.collection("personas").get()).docs.map((d) => ({ id: d.id, ref: d.ref, ...d.data() }));
const { cambios, sugeridos, problemas, iguales } = cruzar(filas, personas, { aceptarSugeridos });

console.log(`Personas en la base: ${personas.length}. Filas en el archivo: ${filas.length}.`);
console.log(`Por vincular: ${cambios.length}. Sugeridos sin aplicar: ${sugeridos.length}. Ya vinculadas igual: ${iguales.length}. Con problema: ${problemas.length}.`);
cambios.forEach((x) => console.log(`  + ${x.p.nombre}  ${x.correo}${x.sugerido ? `  (en el archivo: ${x.fila.nombre})` : ""}`));
sugeridos.forEach((x) => console.log(`  ~ ${x.fila.nombre} -> ${x.p.nombre}  ${x.correo}  (se aplica solo con --aceptar-sugeridos)`));
problemas.forEach((x) => console.log(`  ! ${x}`));

if (!aplicar) { console.log("Simulación: no se escribió nada. Agregue --aplicar para guardar."); process.exit(0); }
for (let i = 0; i < cambios.length; i += 400) {
  const b = db.batch();
  cambios.slice(i, i + 400).forEach((x) => b.update(x.p.ref, { correo: x.correo }));
  await b.commit();
}
const conCorreo = new Set(personas.filter((p) => p.correo).map((p) => p.id));
cambios.forEach((x) => conCorreo.add(x.p.id));
console.log(`Listo: ${cambios.length} correos vinculados. Quedan ${personas.length - conCorreo.size} personas sin correo.`);

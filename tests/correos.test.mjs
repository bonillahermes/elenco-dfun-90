// Pruebas del cruce de correos por nombre (scripts/cruzar-correos.mjs). Nombres y correos ficticios.
import { test } from "node:test";
import assert from "node:assert/strict";
import { leerTSV, cruzar } from "../scripts/cruzar-correos.mjs";

const base = () => [
  { id: "a", nombre: "Andrés Pérez Gómez", correo: "" },
  { id: "b", nombre: "María Angélica Ruiz Torres", correo: "" },
  { id: "c", nombre: "Lucía Mora Díaz", correo: "lmora@unal.edu.co" },
  { id: "d", nombre: "Juan Díaz", correo: "" },
  { id: "e", nombre: "Juan Díaz Ortiz", correo: "" },
  { id: "f", nombre: "Pedro Gil Rey", correo: "" },
];
const tsv = (filas) => leerTSV(filas.map(([n, c]) => `${n}\t${c}`).join("\n"));

test("lee el archivo, limpia espacios y pasa el correo a minúsculas", () => {
  const f = tsv([["  Andres Perez Gomez ", " APerez@unal.edu.co"]]);
  assert.deepEqual(f[0], { linea: 1, nombre: "Andres Perez Gomez", correo: "aperez@unal.edu.co" });
});

test("vincula por nombre exacto aunque falten tildes", () => {
  const r = cruzar(tsv([["Andres Perez Gomez", "aperez@unal.edu.co"]]), base());
  assert.equal(r.cambios.length, 1);
  assert.equal(r.cambios[0].p.id, "a");
});

test("un nombre incompleto queda como sugerido y no se aplica sin la opción", () => {
  const filas = tsv([["Angélica Ruiz Torres", "mruiz@unal.edu.co"]]);
  const r = cruzar(filas, base());
  assert.equal(r.cambios.length, 0);
  assert.equal(r.sugeridos[0].p.id, "b");
  const r2 = cruzar(filas, base(), { aceptarSugeridos: true });
  assert.equal(r2.cambios[0].p.id, "b");
});

test("si el nombre incompleto coincide con varias personas, no vincula y las nombra", () => {
  const sinExacto = [...base().filter((p) => p.id !== "d"), { id: "g", nombre: "Juan Díaz Rey", correo: "" }];
  const r = cruzar(tsv([["Juan Díaz", "jdiaz@unal.edu.co"]]), sinExacto, { aceptarSugeridos: true });
  assert.equal(r.cambios.length, 0);
  assert.match(r.problemas[0], /podría ser Juan Díaz Ortiz o Juan Díaz Rey/);
  const r2 = cruzar(tsv([["Gil Rey", "x@unal.edu.co"], ["Díaz", "y@unal.edu.co"]]), base(), { aceptarSugeridos: true });
  assert.equal(r2.cambios[0].p.id, "f");
  assert.match(r2.problemas[0], /no está en la base/);
});

test("no reemplaza un correo ya vinculado y reconoce el que ya estaba igual", () => {
  const r = cruzar(tsv([["Lucía Mora Díaz", "otra@unal.edu.co"], ["Lucia Mora Diaz", "LMORA@unal.edu.co"]]), base());
  assert.equal(r.cambios.length, 0);
  assert.match(r.problemas[0], /no se reemplaza/);
  assert.deepEqual(r.iguales, ["Lucía Mora Díaz"]);
});

test("rechaza correos mal escritos o repetidos", () => {
  const r = cruzar(tsv([["Andrés Pérez Gómez", "a@gmail"], ["Pedro Gil Rey", "pe dro@unal.edu.co"], ["Juan Díaz Ortiz", "j@unal.edu.co"], ["Juan Díaz", "j@unal.edu.co"]]), base());
  assert.equal(r.cambios.length, 1);
  assert.equal(r.problemas.length, 3);
});

test("acepta correos externos de egresados y los marca", () => {
  const r = cruzar(tsv([["Andrés Pérez Gómez", "A.Perez@Gmail.com"], ["Pedro Gil Rey", "pgil@unal.edu.co"]]), base());
  assert.deepEqual(r.cambios.map((x) => [x.p.id, x.correo, x.externo]), [["a", "a.perez@gmail.com", true], ["f", "pgil@unal.edu.co", false]]);
  const ya = cruzar(tsv([["Lucía Mora Díaz", "lmora@gmail.com"]]), [{ id: "c", nombre: "Lucía Mora Díaz", correo: "lmora@gmail.com" }]);
  assert.deepEqual(ya.externosIguales.map((x) => x.correo), ["lmora@gmail.com"]);
});

test("no asigna dos correos a la misma persona ni un correo de otra", () => {
  const r = cruzar(tsv([["Pedro Gil Rey", "pgil@unal.edu.co"], ["Pedro Gil Rey", "pgil2@unal.edu.co"], ["Juan Díaz", "lmora@unal.edu.co"]]), base());
  assert.equal(r.cambios.length, 1);
  assert.match(r.problemas[0], /ya recibe otro correo/);
  assert.match(r.problemas[1], /ya está vinculado a Lucía Mora Díaz/);
});

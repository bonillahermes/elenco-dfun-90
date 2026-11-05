// Pruebas del motor de reglas. Ejecutar: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { crearMotor, cambios } from "../public/js/reglas.js";

const H = (id) => ({ id, nombre: id, rol: "Hombre" });
const M = (id) => ({ id, nombre: id, rol: "Mujer" });
const motor = (elenco = {}, definidas = {}, personas = [H("h"), M("m")]) => crearMotor({ personas, elenco, definidas });

test("dentro de un bloque no hay cambio de vestuario", () => {
  assert.deepEqual(cambios(["Arcos", "Chicha"]), []);
  assert.deepEqual(cambios(["Cumbia", "Pilanderas"]), []);
});

test("bloques seguidos sin intervención son incompatibles", () => {
  assert.equal(motor({ h: ["Guaneña y Bambuco sureño"] }).evaluar(H("h"), "Fandanguillo").st, "block");
  assert.equal(motor({ h: ["Chicha"] }).evaluar(H("h"), "Palo negro").st, "block");
  assert.equal(motor({ h: ["Palo negro"] }).evaluar(H("h"), "Cumbia").st, "block");
});

test("por danza: Arcos y Palo negro sí, Palo negro y Pilanderas sí", () => {
  assert.equal(motor({ h: ["Palo negro"] }).evaluar(H("h"), "Arcos").st, "ok");
  assert.equal(motor({ h: ["Palo negro"] }).evaluar(H("h"), "Pilanderas").st, "ok");
  assert.equal(motor({ h: ["Chicha"] }).evaluar(H("h"), "Pilanderas").st, "ok");
});

test("cambios rápidos quedan en advertencia", () => {
  assert.equal(motor({ h: ["Guabina"] }).evaluar(H("h"), "Guaneña y Bambuco sureño").st, "warn");
  assert.equal(motor({ h: ["Chicha"] }).evaluar(H("h"), "Cumbia").st, "warn");
});

test("Cortadeña agrega Fandanguillo y quitar Fandanguillo quita Cortadeña", () => {
  const r = motor().alternar(H("h"), "Cortadeña");
  assert.deepEqual(r.danzas, ["Fandanguillo", "Cortadeña"]);
  const q = motor({ h: ["Fandanguillo", "Cortadeña"] }).alternar(H("h"), "Fandanguillo");
  assert.deepEqual(q.danzas, []);
});

test("Bullerengue solo mujeres y excluye Cumbia", () => {
  assert.equal(motor().evaluar(H("h"), "Bullerengue").st, "na");
  assert.equal(motor({ m: ["Bullerengue"] }).evaluar(M("m"), "Cumbia").st, "block");
});

test("mujeres máximo 4 danzas, hombres sin límite", () => {
  const cuatro = ["Guabina", "Rajaleña", "Arcos", "Chicha"];
  assert.equal(motor({ m: cuatro }).evaluar(M("m"), "Pilanderas").st, "block");
  assert.equal(motor({ h: cuatro }).evaluar(H("h"), "Pilanderas").st, "ok");
});

test("elenco definido se puede cambiar pero queda marcado", () => {
  const r = motor({}, { "Palo negro": true }).alternar(H("h"), "Palo negro");
  assert.equal(r.ok, true);
  assert.equal(r.def, true);
});

test("Cumbia sugiere Pilanderas", () => {
  assert.equal(motor().alternar(M("m"), "Cumbia").sugerencia, "Pilanderas");
});

test("cupo fijo: no se puede pasar del cupo por rol", () => {
  const hs = Array.from({ length: 3 }, (_, i) => H("h" + i));
  const m = crearMotor({ personas: [...hs, H("x")], elenco: { h0: ["Palo negro"], h1: ["Palo negro"], h2: ["Palo negro"] }, definidas: {} });
  const r = m.evaluar(H("x"), "Palo negro");
  assert.equal(r.st, "block");
  assert.match(r.why, /Cupo lleno/);
});

test("Bullerengue tiene cupo de 8 mujeres", () => {
  const ms = Array.from({ length: 8 }, (_, i) => M("m" + i));
  const elenco = Object.fromEntries(ms.map((m) => [m.id, ["Bullerengue"]]));
  const m = crearMotor({ personas: [...ms, M("y")], elenco, definidas: {} });
  assert.equal(m.evaluar(M("y"), "Bullerengue").st, "block");
});

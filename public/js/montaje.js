// Configuración del montaje de la Gala 90 años DFUN (miércoles 18 de noviembre).
// Fuente: minuto a minuto de producción y reglas dadas por el maestro.
// Cambiar aquí horas, bloques o reglas; el resto de la aplicación se recalcula.

export const BLOQUES = [
  { id: 1, nombre: "Guabina" },
  { id: 2, nombre: "Sur", corto: "Sur" },
  { id: 3, nombre: "Fandanguillo y Cortadeña", corto: "Fand. y Cort." },
  { id: 4, nombre: "Rajaleña" },
  { id: 5, nombre: "Arcos y Chicha" },
  { id: 6, nombre: "Palo negro" },
  { id: 7, nombre: "Costas" },
];

// id: clave estable en la base de datos. b: bloque. s/e: inicio y fin (p. m.).
// Dentro de un bloque se comparte vestuario.
export const DANZAS = [
  { id: "Guabina", label: "Guabina", b: 1, s: "7:23", e: "7:26", pareja: true },
  { id: "Guaneña y Bambuco sureño", label: "Guaneña y Nariño", b: 2, s: "7:28", e: "7:34" },
  { id: "Fandanguillo", label: "Fandanguillo", b: 3, s: "7:34", e: "7:39" },
  { id: "Cortadeña", label: "Cortadeña", b: 3, s: "7:39", e: "7:42", requiere: "Fandanguillo" },
  { id: "Rajaleña", label: "Rajaleña", b: 4, s: "7:47", e: "7:51" },
  { id: "Arcos", label: "Arcos", b: 5, s: "7:56", e: "7:59" },
  { id: "Chicha", label: "Chicha", b: 5, s: "8:02", e: "8:05" },
  { id: "Palo negro", label: "Palo negro", b: 6, s: "8:05", e: "8:08", pareja: true },
  { id: "Cumbia", label: "Cumbia", b: 7, s: "8:08", e: "8:12", pareja: true, excluye: "Bullerengue" },
  { id: "Bullerengue", label: "Bullerengue", b: 7, s: "8:12", e: "8:15", soloMujeres: true, excluye: "Cumbia" },
  { id: "Pilanderas", label: "Pilanderas", b: 7, s: "8:15", e: "8:19", sugeridaPor: "Cumbia" },
];

export const REGLAS = {
  maxDanzas: { Mujer: 4, Hombre: null }, // null = sin límite
  margenRapido: 5, // minutos: 0 = imposible, 1 a 4 = cambio rápido, 5 o más = normal
};

export const PROGRAMA = [
  { i: "7:10", e: "7:20", a: "Palabras de inicio y bienvenida" },
  { i: "7:20", e: "7:23", a: "Instalación DFUN – Jacinto" },
  { i: "7:23", e: "7:26", d: "Guabina", n: "Objeto articulador: mantilla" },
  { i: "7:26", e: "7:28", a: "Intervención / voz M. Sandino" },
  { i: "7:28", e: "7:34", d: "Guaneña y Bambuco sureño", n: "Guaneña 7:28 · Danza de Nariño 7:31 (objeto: bebé)" },
  { i: "7:34", e: "7:39", d: "Fandanguillo", n: "Coplas para Marla Patricia" },
  { i: "7:39", e: "7:42", d: "Cortadeña" },
  { i: "7:42", e: "7:47", a: "Intervención Rafa" },
  { i: "7:47", e: "7:51", d: "Rajaleña" },
  { i: "7:51", e: "7:56", a: "Intervención Felipe (objeto: arcos)" },
  { i: "7:56", e: "7:59", d: "Arcos" },
  { i: "7:59", e: "8:02", a: "Brindis por José David (chicha y vasos)" },
  { i: "8:02", e: "8:05", d: "Chicha" },
  { i: "8:05", e: "8:08", d: "Palo negro" },
  { i: "8:08", e: "8:12", d: "Cumbia", n: "Objeto articulador: velas" },
  { i: "8:12", e: "8:15", d: "Bullerengue", n: "Delia" },
  { i: "8:15", e: "8:19", d: "Pilanderas", n: "Objeto articulador: balay y pilón" },
  { i: "8:19", e: "8:23", a: "Voz de despedida" },
  { i: "8:23", e: "8:28", a: "Venias y fotografía grupal final" },
];

// Elencos marcados como "pareja definida" al iniciar (el maestro puede cambiarlos).
export const DEFINIDAS_INICIALES = { "Palo negro": true };

export const toMin = (t) => { const [h, m] = t.split(":").map(Number); return (h + 12) * 60 + m; };
export const fmt = (m) => `${Math.floor(m / 60) - 12}:${String(m % 60).padStart(2, "0")}`;

DANZAS.forEach((d) => { d.ini = toMin(d.s); d.fin = toMin(d.e); });
BLOQUES.forEach((b) => {
  const ds = DANZAS.filter((d) => d.b === b.id);
  b.ini = Math.min(...ds.map((d) => d.ini));
  b.fin = Math.max(...ds.map((d) => d.fin));
  b.danzas = ds.map((d) => d.id);
});
export const DZ = Object.fromEntries(DANZAS.map((d) => [d.id, d]));
export const BQ = Object.fromEntries(BLOQUES.map((b) => [b.id, b]));

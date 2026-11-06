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
  // Los hombres son pocos: para ellos 0 min no bloquea, queda como cambio rápido (advertencia).
  bloqueaSinTiempo: { Mujer: true, Hombre: false },
};

export const PROGRAMA = [
  { i: "7:10", e: "7:20", a: "Palabras de inicio y bienvenida" },
  { i: "7:20", e: "7:23", a: "Instalación DFUN – Jacinto" },
  { i: "7:23", e: "7:26", d: "Guabina", n: "Objeto articulador: mantilla" },
  { i: "7:26", e: "7:28", a: "Intervención / voz M. Sandino" },
  { i: "7:28", e: "7:34", d: "Guaneña y Bambuco sureño", n: "Guaneña 7:28 (una sola pareja) · Danza de Nariño 7:31" },
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

// Cupos fijos por danza (fuente: matriz de vestuario de la gala).
export const CUPOS = {
  "Guabina": { Hombre: 8, Mujer: 8 },
  "Guaneña y Bambuco sureño": { Hombre: 9, Mujer: 9 },
  "Fandanguillo": { Hombre: 16, Mujer: 16 },
  "Cortadeña": { Hombre: 8, Mujer: 8 },
  "Rajaleña": { Hombre: 12, Mujer: 12 },
  "Arcos": { Hombre: 12, Mujer: 12 },
  "Chicha": { Hombre: 12, Mujer: 12 },
  "Palo negro": { Hombre: 3, Mujer: 3 },
  "Cumbia": { Hombre: 8, Mujer: 8 },
  "Bullerengue": { Hombre: 0, Mujer: 8 },
  "Pilanderas": { Hombre: 8, Mujer: 8 },
};

// Vestuario por danza y rol (fuente: matriz de vestuario). Cada prenda: [nombre, disponible hoy, necesarias].
// Si falta "necesarias", se usa el cupo del rol. Guaneña es de una sola pareja, con vestuario propio (solista).
// "pend" = pendientes anotados. Se compran faltantes el fin de semana.
export const VESTUARIO = {
  "Guabina": {
    Mujer: { prendas: [["Mantilla", 7], ["Sombrero", 7], ["Blusa", 6], ["Falda", 9]], pend: ["Falta 1 sombrero", "Faltan 2 blusas"] },
    Hombre: { prendas: [["Pantalón gris", 10], ["Pañoleta roja", 15], ["Sombrero negro", 9], ["Camisa blanca", 5], ["Ruana", 0]], pend: ["Falta traer 8 ruanas"] },
  },
  "Guaneña y Bambuco sureño": {
    Mujer: { prendas: [["Falda", 8, 8], ["Blusa blanca", 6, 8], ["Chal negro", 8, 8], ["Chal vinotinto (solista)", 1, 1], ["Vestuario Guaneña completo (solista)", 1, 1]], pend: ["El inventario dice que hay 8 blusas de Nariño", "Coordinar accesorios: aretes y collares"] },
    Hombre: { prendas: [["Pantalón café", 8, 8], ["Camisa", 4, 8], ["Pañoleta", 8, 8], ["Fajón", 8, 8], ["Pantalón beige (solista)", 1, 1], ["Camisa dorada con negro (solista)", 1, 1]], pend: ["El inventario dice que hay 8 camisas de Nariño", "Falta el pantalón del solista de Guaneña"] },
  },
  "Fandanguillo": {
    Mujer: { prendas: [["Falda Antioquia vinotinto", 8], ["Blusa Antioquia vinotinto", 8]], pend: [] },
    Hombre: { prendas: [["Poncho", 21], ["Carriel", 6], ["Pantalón (4 verdes y 5 cafés)", 9], ["Cincho", 9], ["Forro de machete", 19], ["Machete", 12]], pend: ["Cada cuadrante usa camisas distintas", "2 carrieles dañados"] },
  },
  "Cortadeña": {
    Mujer: { prendas: [["Falda Antioquia vinotinto", 8], ["Blusa Antioquia vinotinto", 8]], pend: ["Revisar delantales"] },
    Hombre: { prendas: [["Poncho", 21], ["Carriel", 6], ["Pantalón (4 verdes y 5 cafés)", 9], ["Cincho", 9], ["Forro de machete", 19], ["Machete", 12]], pend: [] },
  },
  "Rajaleña": {
    Mujer: { prendas: [["Blusa (azul bebé, rosado, azul oscuro)", 3]], pend: ["Faltan blusas: 2 rojas, 1 naranja, 1 verde, 1 amarilla, 1 azul oscuro", "No figuran faldas"] },
    Hombre: { prendas: [["Camisa", 12], ["Pantalón blanco", 10], ["Pañoleta", 12], ["Cincho", 9], ["Forro de machete", 19], ["Machete", 12], ["Poncho", 21], ["Sombrero", 8]], pend: [] },
  },
  "Arcos": {
    Mujer: { prendas: [["Falda", 9], ["Blusa", 6]], pend: ["El inventario dice que hay 10 blusas de Cundinamarca"] },
    Hombre: { prendas: [], pend: ["Vestuario de hombres sin definir en la matriz"] },
  },
  "Chicha": {
    Mujer: { prendas: [["Falda", 9], ["Blusa", 6]], pend: ["El inventario dice que hay 10 blusas de Cundinamarca"] },
    Hombre: { prendas: [["Perrero", 9]], pend: ["Resto del vestuario de hombres sin definir en la matriz"] },
  },
  "Palo negro": {
    Mujer: { prendas: [["Blusa de Bullerengue", 3], ["Falda", 3]], pend: ["Pendiente hacer tocados"] },
    Hombre: { prendas: [], pend: ["Vestuario de hombres sin definir en la matriz"] },
  },
  "Cumbia": {
    Mujer: { prendas: [["Falda", 8], ["Blusa", 8]], pend: [] },
    Hombre: { prendas: [["Camisa", 9], ["Pañoleta roja", 15], ["Mochila", 16], ["Fajón", 7], ["Pantalón blanco", 10]], pend: [] },
  },
  "Bullerengue": {
    Mujer: { prendas: [["Falda", 8]], pend: ["Blusas y tocados los hace Clau"] },
  },
  "Pilanderas": {
    Mujer: { prendas: [["Falda fandango", 8], ["Blusa fandango", 7]], pend: ["Falta 1 blusa rosada fandango"] },
    Hombre: { prendas: [["Camisa", 9], ["Pantalón blanco", 10], ["Mochila", 16]], pend: [] },
  },
};

// Piezas físicas que se usan en danzas de bloques distintos y deben pasar de mano.
export const PIEZAS_COMPARTIDAS = [
  { pieza: "Ponchos, machetes, forros y cinchos", rol: "Hombre", de: ["Fandanguillo", "Cortadeña"], a: ["Rajaleña"] },
  { pieza: "Pantalones blancos", rol: "Hombre", de: ["Rajaleña"], a: ["Cumbia", "Pilanderas"] },
  { pieza: "Pañoletas rojas", rol: "Hombre", de: ["Guabina"], a: ["Cumbia"] },
  { pieza: "Blusas de Bullerengue", rol: "Mujer", de: ["Palo negro"], a: ["Bullerengue"] },
];

// Llamados generales del día (minuto a minuto de producción).
export const LLAMADOS = [
  ["2:00 p. m.", "Llegada y reunión general de producción"],
  ["2:30 p. m.", "Reconocimiento del escenario y marcación"],
  ["5:00 p. m.", "Ensayo general"],
  ["6:00 p. m.", "Revisión final de vestuario, maquillaje y utilería"],
  ["6:30 p. m.", "Calentamiento corporal y vocal"],
  ["7:10 p. m.", "Inicio de la función"],
];

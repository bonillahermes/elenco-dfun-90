// Cruce de correos con personas por nombre. Lógica pura (sin red ni Firebase), usada por correos.mjs y por tests/.
// No contiene datos personales: los nombres y correos vienen del archivo que se le pasa al script.

export const CORREO_UNAL = /^[^@\s]+@unal\.edu\.co$/;
export const norm = (x) => String(x || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const tokens = (x) => norm(x).split(" ").filter((t) => t.length > 1);

// Texto con dos columnas separadas por tabulación: nombre y correo.
export function leerTSV(texto) {
  return texto.split(/\r?\n/).map((l, i) => ({ l, linea: i + 1 })).filter(({ l }) => l.trim()).map(({ l, linea }) => {
    const [nombre, correo] = l.split("\t");
    return { linea, nombre: (nombre || "").trim(), correo: (correo || "").trim().toLowerCase() };
  });
}

// Devuelve qué se vincularía, qué ya estaba igual y qué tiene problema. No escribe nada.
// Con aceptarSugeridos, un nombre incompleto se vincula solo si coincide con una única persona.
export function cruzar(filas, personas, { aceptarSugeridos = false } = {}) {
  const porCorreo = new Map(personas.filter((p) => p.correo).map((p) => [p.correo.toLowerCase(), p]));
  const cambios = [], sugeridos = [], problemas = [], iguales = [];
  const vistos = new Map(), asignadas = new Map();
  for (const f of filas) {
    const donde = `línea ${f.linea}: ${f.nombre || "(sin nombre)"}`;
    if (!CORREO_UNAL.test(f.correo)) { problemas.push(`${donde}: correo no institucional o mal escrito (${f.correo || "vacío"})`); continue; }
    if (vistos.has(f.correo)) { problemas.push(`${donde}: ${f.correo} ya aparece en la línea ${vistos.get(f.correo)}`); continue; }
    vistos.set(f.correo, f.linea);

    let p, sugerido = false;
    const exactas = personas.filter((x) => norm(x.nombre) === norm(f.nombre));
    if (exactas.length > 1) { problemas.push(`${donde}: hay ${exactas.length} personas con ese nombre en la base`); continue; }
    if (exactas.length === 1) p = exactas[0];
    else {
      // Nombre incompleto: personas cuyo nombre contiene todas las palabras de la fila.
      const t = tokens(f.nombre), cand = t.length >= 2 ? personas.filter((x) => { const s = new Set(tokens(x.nombre)); return t.every((w) => s.has(w)); }) : [];
      if (cand.length !== 1) { problemas.push(`${donde}: no está en la base con ese nombre${cand.length ? `; podría ser ${cand.map((x) => x.nombre).join(" o ")}` : ""}`); continue; }
      p = cand[0]; sugerido = true;
    }

    if (asignadas.has(p.id)) { problemas.push(`${donde}: ${p.nombre} ya recibe otro correo en la línea ${asignadas.get(p.id)}`); continue; }
    const actual = (p.correo || "").toLowerCase(), otro = porCorreo.get(f.correo);
    if (otro && otro.id !== p.id) { problemas.push(`${donde}: ${f.correo} ya está vinculado a ${otro.nombre}`); continue; }
    if (actual === f.correo) { iguales.push(p.nombre); asignadas.set(p.id, f.linea); continue; }
    if (actual) { problemas.push(`${donde}: ${p.nombre} ya tiene ${actual}; no se reemplaza`); continue; }
    asignadas.set(p.id, f.linea);
    if (sugerido && !aceptarSugeridos) { sugeridos.push({ p, correo: f.correo, fila: f }); continue; }
    cambios.push({ p, correo: f.correo, sugerido, fila: f });
  }
  return { cambios, sugeridos, problemas, iguales };
}

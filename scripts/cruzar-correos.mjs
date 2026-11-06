// Cruce de correos con personas por nombre. Lógica pura (sin red ni Firebase), usada por correos.mjs y por tests/.
// No contiene datos personales: los nombres y correos vienen del archivo que se le pasa al script.

export const CORREO_UNAL = /^[^@\s]+@unal\.edu\.co$/;
// Cualquier correo bien escrito. Los que no son UNAL (egresados con Gmail) necesitan además una autorización en externos/{correo}.
export const CORREO_VALIDO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const esExterno = (c) => !!c && !CORREO_UNAL.test(c);
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
  const cambios = [], sugeridos = [], problemas = [], iguales = [], externosIguales = [];
  const vistos = new Map(), asignadas = new Map();
  for (const f of filas) {
    const donde = `línea ${f.linea}: ${f.nombre || "(sin nombre)"}`;
    if (!CORREO_VALIDO.test(f.correo)) { problemas.push(`${donde}: correo mal escrito (${f.correo || "vacío"})`); continue; }
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
    if (actual === f.correo) { iguales.push(p.nombre); asignadas.set(p.id, f.linea); if (esExterno(f.correo)) externosIguales.push({ p, correo: f.correo }); continue; }
    if (actual) { problemas.push(`${donde}: ${p.nombre} ya tiene ${actual}; no se reemplaza`); continue; }
    asignadas.set(p.id, f.linea);
    if (sugerido && !aceptarSugeridos) { sugeridos.push({ p, correo: f.correo, fila: f }); continue; }
    cambios.push({ p, correo: f.correo, sugerido, fila: f, externo: esExterno(f.correo) });
  }
  // externosIguales: correos externos ya vinculados; el script les vuelve a escribir la autorización por si falta.
  return { cambios, sugeridos, problemas, iguales, externosIguales };
}

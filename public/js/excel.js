// Importar y exportar Excel con SheetJS (cargado desde cdnjs en index.html).
import { DANZAS, DZ, BQ } from "./montaje.js";
import { cambios, ordenar } from "./reglas.js";

const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

// Lee la hoja "Inscripción": Nombre, Rol, Vínculo, Correo, una columna por danza
// ("Confirmado" = asignado por el maestro; "Postulado" o "X" = se postuló), Observaciones.
export async function leerExcel(file) {
  if (typeof XLSX === "undefined") throw new Error("No cargó la librería de Excel. Revise la conexión.");
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const ws = wb.Sheets["Inscripción"] || wb.Sheets[wb.SheetNames[0]];
  const a = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  const h = a[0].map((x) => String(x).trim());
  const col = (n) => h.findIndex((x) => norm(x) === norm(n));
  const iN = col("Nombre"), iR = col("Rol"), iV = col("Vínculo"), iC = col("Correo"), iO = col("Observaciones");
  if (iN < 0) throw new Error("No se encontró la columna Nombre.");
  const personas = [], elenco = {};
  a.slice(1).forEach((r, k) => {
    const nombre = String(r[iN] || "").replace(/\s+/g, " ").trim(); if (!nombre) return;
    const id = "i" + String(k).padStart(3, "0"), post = [], conf = [];
    DANZAS.forEach((d) => {
      const j = col(d.id); if (j < 0) return;
      const v = norm(r[j]);
      if (v.startsWith("conf")) { conf.push(d.id); post.push(d.id); } else if (v.startsWith("post") || v === "x") post.push(d.id);
    });
    const rol = norm(r[iR]).startsWith("h") ? "Hombre" : norm(r[iR]).startsWith("m") ? "Mujer" : "";
    personas.push({ id, nombre, rol, vinculo: iV >= 0 ? String(r[iV]).trim() : "", correo: iC >= 0 ? String(r[iC]).trim().toLowerCase() : "",
      postulaciones: post, obs: iO >= 0 ? String(r[iO]).trim() : "", creado: Date.now() + k });
    if (conf.length) elenco[id] = ordenar(conf);
  });
  if (!personas.length) throw new Error("El archivo no tiene personas.");
  return { personas, elenco };
}

export function exportarExcel(datos, motor) {
  const wb = XLSX.utils.book_new(), ps = datos.personas;
  const a1 = [["Nombre", "Rol", "Vínculo", "Correo", ...DANZAS.map((d) => d.id), "Observaciones"]].concat(ps.map((p) => {
    const S = motor.asig(p.id), P = p.postulaciones || [];
    return [p.nombre, p.rol || "", p.vinculo || "", p.correo || "", ...DANZAS.map((d) => (S.includes(d.id) ? "Confirmado" : P.includes(d.id) ? "Postulado" : "")), p.obs || ""];
  }));
  const w1 = XLSX.utils.aoa_to_sheet(a1);
  w1["!cols"] = [{ wch: 36 }, { wch: 9 }, { wch: 12 }, { wch: 30 }, ...DANZAS.map(() => ({ wch: 12 })), { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, w1, "Inscripción");
  const a2 = [["Danza", "Hora", "Bloque", "Rol", "Nombre"]];
  DANZAS.forEach((d) => motor.elencoDe(d.id).forEach((p) => a2.push([d.label, d.s, BQ[d.b].nombre, p.rol || "", p.nombre])));
  const w2 = XLSX.utils.aoa_to_sheet(a2); w2["!cols"] = [{ wch: 22 }, { wch: 7 }, { wch: 24 }, { wch: 9 }, { wch: 36 }];
  XLSX.utils.book_append_sheet(wb, w2, "Elenco por danza");
  const a3 = [["Nombre", "Rol", "Danzas", "Cambios", "Detalle"]];
  ps.forEach((p) => { const S = motor.asig(p.id); if (!S.length) return; const cs = cambios(S);
    a3.push([p.nombre, p.rol || "", S.map((d) => DZ[d].label).join(", "), cs.length, cs.map((c) => `${DZ[c.de].label} → ${DZ[c.a].label} (${c.min} min)`).join("; ")]); });
  const w3 = XLSX.utils.aoa_to_sheet(a3); w3["!cols"] = [{ wch: 36 }, { wch: 9 }, { wch: 60 }, { wch: 9 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, w3, "Programa por persona");
  const f = new Date();
  XLSX.writeFile(wb, `Elenco_DFUN_90_${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}.xlsx`);
}

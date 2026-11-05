// Motor de reglas: funciones puras sobre el estado { personas, elenco, definidas }.
// personas: [{ id, nombre, rol: "Hombre" | "Mujer", ... }]
// elenco:   { [personaId]: ["Guabina", ...] }
// definidas:{ [danzaId]: true }
import { DANZAS, DZ, BLOQUES, REGLAS } from "./montaje.js";

export const ordenar = (ds) => ds.filter((d) => DZ[d]).sort((a, b) => DZ[a].ini - DZ[b].ini);
export const nivel = (min) => (min <= 0 ? "block" : min < REGLAS.margenRapido ? "warn" : "ok");
export const maxDe = (p) => REGLAS.maxDanzas[p.rol] ?? null;

// Cambios de vestuario: pares consecutivos de danzas en bloques distintos.
export function cambios(ds) {
  const s = ordenar(ds), out = [];
  for (let i = 1; i < s.length; i++) {
    const a = DZ[s[i - 1]], b = DZ[s[i]];
    if (a.b !== b.b) out.push({ de: a.id, a: b.id, min: b.ini - a.fin });
  }
  return out;
}
const peorDe = (cs) => cs.reduce((m, c) => (!m || c.min < m.min ? c : m), null);

export function crearMotor(estado) {
  const asig = (id) => ordenar(estado.elenco[id] || []);
  const definida = (d) => !!estado.definidas[d];

  // Qué pasaría si se asigna la danza d a la persona p.
  // st: on | ok | warn | block | na. add: danzas que se agregarían.
  function evaluar(p, d) {
    const S = asig(p.id), D = DZ[d];
    if (S.includes(d)) return { st: "on", ...revisar(p, S, d) };
    if (D.soloMujeres && p.rol !== "Mujer") return { st: "na", why: "Danza solo de mujeres" };
    const add = [d];
    if (D.requiere && !S.includes(D.requiere)) add.push(D.requiere);
    for (const x of add) { const ex = DZ[x].excluye; if (ex && S.includes(ex)) return { st: "block", why: `No se combina con ${DZ[ex].label}` }; }
    const N = S.concat(add), mx = maxDe(p);
    if (mx && N.length > mx) return { st: "block", why: `Llegaría a ${N.length} danzas (máximo ${mx})` };
    const peor = peorDe(cambios(N).filter((c) => add.includes(c.de) || add.includes(c.a)));
    const extra = add.length > 1 ? ` · incluye ${add.slice(1).map((x) => DZ[x].label).join(", ")}` : "";
    const def = add.some(definida);
    if (peor && nivel(peor.min) === "block") return { st: "block", why: `Sin tiempo: ${DZ[peor.de].label} → ${DZ[peor.a].label} (0 min)` };
    if (peor && nivel(peor.min) === "warn") return { st: "warn", why: `Cambio rápido: ${DZ[peor.de].label} → ${DZ[peor.a].label} (${peor.min} min)${extra}`, add, def };
    return { st: "ok", why: (peor ? `Cambio de ${peor.min} min` : "Sin cambio de vestuario") + extra, add, def };
  }

  // Problemas de una danza ya asignada (por si cambian reglas o datos).
  function revisar(p, S, d) {
    const D = DZ[d];
    if (D.soloMujeres && p.rol !== "Mujer") return { bad: true, why: "Danza solo de mujeres" };
    if (D.requiere && !S.includes(D.requiere)) return { bad: true, why: `Falta ${DZ[D.requiere].label}` };
    if (D.excluye && S.includes(D.excluye)) return { bad: true, why: `No se combina con ${DZ[D.excluye].label}` };
    const mx = maxDe(p); if (mx && S.length > mx) return { bad: true, why: `${S.length} danzas (máximo ${mx})` };
    const peor = peorDe(cambios(S).filter((c) => c.de === d || c.a === d));
    if (peor && peor.min <= 0) return { bad: true, why: `Sin tiempo: ${DZ[peor.de].label} → ${DZ[peor.a].label}` };
    if (peor && peor.min < REGLAS.margenRapido) return { warn: true, why: `Cambio rápido de ${peor.min} min` };
    return { why: "Asignado" };
  }

  // Calcula el nuevo conjunto al asignar o quitar. No escribe nada.
  function alternar(p, d) {
    const S = asig(p.id);
    if (S.includes(d)) {
      const quitar = new Set([d]);
      DANZAS.forEach((x) => { if (x.requiere === d && S.includes(x.id)) quitar.add(x.id); });
      return { ok: true, accion: "quitar", danzas: S.filter((x) => !quitar.has(x)), cambiadas: [...quitar], def: [...quitar].some(definida) };
    }
    const ev = evaluar(p, d);
    if (ev.st === "block" || ev.st === "na") return { ok: false, why: ev.why };
    const sug = DANZAS.find((x) => x.sugeridaPor === d && !S.includes(x.id));
    return { ok: true, accion: "asignar", danzas: ordenar(S.concat(ev.add)), cambiadas: ev.add, aviso: ev.st === "warn" ? ev.why : null, def: ev.def, sugerencia: sug?.id || null };
  }

  const elencoDe = (d) => estado.personas.filter((p) => asig(p.id).includes(d));
  function balance(d) {
    const l = elencoDe(d), h = l.filter((p) => p.rol === "Hombre").length, m = l.filter((p) => p.rol === "Mujer").length;
    return { l, h, m, par: Math.min(h, m) };
  }
  // Cambios agrupados por bloque de llegada.
  function transiciones() {
    const out = BLOQUES.slice(1).map((B, i) => ({ A: BLOQUES[i], B, min: B.ini - BLOQUES[i].fin, gente: [] }));
    estado.personas.forEach((p) => cambios(asig(p.id)).forEach((c) => {
      const t = out.find((t) => t.B.id === DZ[c.a].b); if (t) t.gente.push({ p, c });
    }));
    out.forEach((t) => { t.presion = t.gente.reduce((s, g) => s + 1 / Math.max(g.c.min, 1), 0); });
    return out;
  }
  const conProblemas = () => estado.personas.filter((p) => asig(p.id).some((d) => revisar(p, asig(p.id), d).bad));

  return { asig, definida, evaluar, revisar, alternar, elencoDe, balance, transiciones, conProblemas };
}

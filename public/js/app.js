import { BLOQUES, DANZAS, DZ, BQ, PROGRAMA, REGLAS, fmt } from "./montaje.js";
import { crearMotor, cambios, nivel, maxDe } from "./reglas.js";
import { crearStore } from "./datos.js";
import { leerExcel, exportarExcel } from "./excel.js";

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const isH = (p) => p.rol === "Hombre", isM = (p) => p.rol === "Mujer";
const pl = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

let motor, renderPend = false;
const store = crearStore(() => { if (!renderPend) { renderPend = true; requestAnimationFrame(() => { renderPend = false; render(); }); } });
const D = () => store.datos;
const persona = (id) => D().personas.find((p) => p.id === id);

/* ---------- utilidades de interfaz ---------- */
let tTimer;
function toast(t) { const e = $("#toast"); e.textContent = t; e.hidden = false; clearTimeout(tTimer); tTimer = setTimeout(() => (e.hidden = true), 4500); }
function msg(t, k = "") { const e = $("#status"); e.textContent = t; e.className = "msg " + k; }
function confirmar(titulo, cuerpo) {
  return new Promise((res) => {
    $("#modal-t").textContent = titulo; $("#modal-b").textContent = cuerpo; $("#modal").hidden = false;
    const fin = (v) => { $("#modal").hidden = true; $("#modal-si").onclick = $("#modal-no").onclick = null; res(v); };
    $("#modal-si").onclick = () => fin(true); $("#modal-no").onclick = () => fin(false); $("#modal-si").focus();
  });
}
const rolTag = (p) => (p.rol ? `<span class="rol ${isH(p) ? "H" : "M"}">${isH(p) ? "H" : "M"}</span>` : "");
const cntTag = (p) => { const mx = maxDe(p), n = motor.asig(p.id).length; return mx ? `<span class="cnt ${n >= mx ? "full" : ""}">${n}/${mx}</span>` : `<span class="cnt">${n}</span>`; };
const defTag = (d) => (motor.definida(d) ? ` <span class="badge">Definida</span>` : "");

/* ---------- acción central: asignar o quitar ---------- */
async function alternar(p, d) {
  const r = motor.alternar(p, d);
  if (!r.ok) return msg(`${p.nombre} no puede bailar ${DZ[d].label}: ${r.why}.`, "bad");
  if (r.def) {
    const qué = r.cambiadas.filter((x) => motor.definida(x)).map((x) => DZ[x].label).join(", ");
    const ok = await confirmar(`${qué} tiene el elenco definido`,
      `¿Seguro que quiere ${r.accion === "quitar" ? "quitar a" : "agregar a"} ${p.nombre} ${r.accion === "quitar" ? "de" : "en"} ${qué}?`);
    if (!ok) return;
  }
  try {
    await store.guardarElenco(p.id, r.danzas);
    const lista = r.cambiadas.map((x) => DZ[x].label).join(" y ");
    if (r.accion === "quitar") msg(`${p.nombre}: se quitó ${lista}.`);
    else msg(`${p.nombre}: asignado a ${lista}.${r.aviso ? " " + r.aviso + "." : ""}`, r.aviso ? "warn" : "ok");
    if (r.sugerencia) toast(`Sugerencia: ${p.nombre} también podría bailar ${DZ[r.sugerencia].label}.`);
  } catch (e) { msg("No se pudo guardar. Revise la conexión o sus permisos.", "bad"); console.error(e); }
}

/* ---------- maestro: pestañas ---------- */
const VIEWS = ["matriz", "danza", "persona", "logistica", "programa", "datos"];
function show(v) {
  document.querySelectorAll(".tab").forEach((t) => t.setAttribute("aria-selected", t.dataset.view === v));
  VIEWS.forEach((x) => ($("#v-" + x).hidden = x !== v));
  try { localStorage.setItem("dfun-v2-tab", v); } catch (e) {}
}
$(".tabs").addEventListener("click", (e) => { const t = e.target.closest(".tab"); if (t) { e.preventDefault(); show(t.dataset.view); } });

function renderSummary() {
  const ps = D().personas, asg = ps.filter((p) => motor.asig(p.id).length), malos = motor.conProblemas().length;
  const sinCorreo = ps.filter((p) => !p.correo).length;
  $("#summary").innerHTML = `<span><b>${ps.length}</b> en el grupo</span><span><span class="dot H"></span><b>${ps.filter(isH).length}</b> hombres</span><span><span class="dot M"></span><b>${ps.filter(isM).length}</b> mujeres</span><span><b>${asg.length}</b> con danza asignada</span>${malos ? `<span style="color:var(--bad)"><b style="color:var(--bad)">${malos}</b> con asignaciones que rompen reglas</span>` : ""}${sinCorreo && ps.length ? `<span><b>${sinCorreo}</b> sin correo vinculado</span>` : ""}`;
}

const bstart = (i) => (i === 0 || DANZAS[i - 1].b !== DANZAS[i].b ? "bstart" : "");
function renderMatriz() {
  const t = $("#mx"), q = norm($("#q").value), fr = document.querySelector('input[name="frol"]:checked').value;
  const ps = D().personas.filter((p) => (!q || norm(p.nombre).includes(q)) && (!fr || p.rol === fr));
  t.tHead.innerHTML = `<tr class="b"><th class="name"></th>${BLOQUES.map((b) => `<th colspan="${b.danzas.length}" class="bstart" title="${esc(b.nombre)}">${esc(b.corto || b.nombre)}</th>`).join("")}</tr>
  <tr class="d"><th class="name">Nombre</th>${DANZAS.map((d, i) => `<th class="${bstart(i)}"><span>${esc(d.label)}${motor.definida(d.id) ? " ★" : ""}</span><small>${d.s}</small></th>`).join("")}</tr>`;
  if (!ps.length) { t.tBodies[0].innerHTML = `<tr><td class="name" colspan="${DANZAS.length + 1}" style="padding:16px">${D().personas.length ? "Nadie coincide con la búsqueda." : "Aún no hay personas. Cárguelas desde la pestaña Datos."}</td></tr>`; t.tFoot.innerHTML = ""; return; }
  t.tBodies[0].innerHTML = ps.map((p) => {
    const post = new Set(p.postulaciones || []);
    return `<tr data-id="${esc(p.id)}"><td class="name"><button class="cell" data-act="persona" style="width:auto;height:auto;text-align:left;font-weight:600;font-size:14px;padding:2px 0">${esc(p.nombre)}</button> ${rolTag(p)}${cntTag(p)}</td>${DANZAS.map((d, i) => {
      const ev = motor.evaluar(p, d.id); let cls = "cell", tip = ev.why || "";
      if (ev.st === "on") cls += " on" + (ev.bad ? " bad" : ev.warn ? " warn" : ""); else cls += " s-" + ev.st;
      if (post.has(d.id)) { cls += " post"; tip += " · Se postuló"; }
      return `<td class="${bstart(i)}"><button class="${cls}" data-d="${esc(d.id)}" title="${esc(d.label)}: ${esc(tip)}" aria-label="${esc(d.label)}, ${esc(p.nombre)}: ${esc(tip)}"></button></td>`;
    }).join("")}</tr>`;
  }).join("");
  t.tFoot.innerHTML = `<tr><td class="name">Hombres / Mujeres</td>${DANZAS.map((d, i) => { const b = motor.balance(d.id); return `<td class="${bstart(i)}" title="${b.h} hombres, ${b.m} mujeres">${b.h}/${b.m}</td>`; }).join("")}</tr>`;
}
$("#mx").addEventListener("click", (e) => {
  const tr = e.target.closest("tr[data-id]"); if (!tr) return; const p = persona(tr.dataset.id); if (!p) return;
  if (e.target.closest('[data-act="persona"]')) { $("#p-sel").value = p.id; renderPersona(); show("persona"); return; }
  const c = e.target.closest(".cell[data-d]"); if (c) alternar(p, c.dataset.d);
});
$("#q").addEventListener("input", renderMatriz);
document.querySelectorAll('input[name="frol"]').forEach((i) => i.addEventListener("change", renderMatriz));

/* Por danza */
$("#d-sel").innerHTML = DANZAS.map((d) => `<option value="${esc(d.id)}">${esc(d.label)} · ${d.s}</option>`).join("");
const itemHTML = (p, ev) => `<li class="item ${ev.st === "on" ? "on" : ev.st}" data-id="${esc(p.id)}"><span>${esc(p.nombre)} ${rolTag(p)}${cntTag(p)}<span class="why">${esc(ev.why || "")}</span></span>${ev.st === "on" || ev.st === "ok" || ev.st === "warn" ? `<button class="btn small ${ev.st === "on" ? "ghost" : ""}" data-act="toggle">${ev.st === "on" ? "Quitar" : "Asignar"}</button>` : ""}</li>`;
function renderDanza() {
  const d = $("#d-sel").value, X = DZ[d], b = motor.balance(d);
  $("#d-head").innerHTML = `Bloque ${X.b} · ${esc(BQ[X.b].nombre)} · ${X.s} a ${X.e}${X.soloMujeres ? " · solo mujeres" : ""}${X.pareja ? " · en parejas" : ""}${X.requiere ? ` · exige ${DZ[X.requiere].label}` : ""}${defTag(d)}`;
  const pend = X.pareja ? Math.abs(b.h - b.m) : 0;
  $("#d-kpis").innerHTML = `<div class="kpi"><b>${b.h}</b><span>hombres asignados</span></div><div class="kpi"><b>${b.m}</b><span>mujeres asignadas</span></div>${X.pareja ? `<div class="kpi"><b>${b.par}</b><span>parejas${pend ? ` · faltan ${pend} ${b.h > b.m ? "mujer(es)" : "hombre(s)"}` : ""}</span></div>` : ""}`;
  $("#d-actions").innerHTML = `<button class="btn ghost small" data-act="def">${motor.definida(d) ? "Quitar marca de definida" : "Marcar como definida"}</button><span class="hint">Una danza definida se puede cambiar, pero pide confirmación.</span>`;
  const g = { on: [], ok: [], warn: [], block: [] };
  D().personas.forEach((p) => { const ev = motor.evaluar(p, d); if (g[ev.st]) g[ev.st].push([p, ev]); });
  const col = (t, l, note) => `<div class="card" style="display:grid;gap:8px"><h3>${t} · ${l.length}</h3>${note ? `<p class="hint" style="margin:0">${note}</p>` : ""}${l.length ? `<ul class="list">${l.map(([p, ev]) => itemHTML(p, ev)).join("")}</ul>` : `<p class="hint" style="margin:0">Nadie.</p>`}</div>`;
  const byRol = (l, r) => l.filter(([p]) => p.rol === r);
  $("#d-cols").innerHTML = col("Asignados", g.on) + col("Disponibles · hombres", byRol(g.ok, "Hombre")) + col("Disponibles · mujeres", byRol(g.ok, "Mujer"))
    + col("Con cambio rápido", g.warn, "Pueden entrar, pero con 1 a 4 minutos para cambiarse.") + col("No pueden", g.block);
}
$("#d-sel").addEventListener("change", renderDanza);
$("#v-danza").addEventListener("click", async (e) => {
  const d = $("#d-sel").value;
  if (e.target.closest('[data-act="def"]')) { try { await store.definir(d, !motor.definida(d)); } catch (err) { msg("No se pudo guardar.", "bad"); } return; }
  const li = e.target.closest("li[data-id]"); if (li && e.target.closest('[data-act="toggle"]')) { const p = persona(li.dataset.id); if (p) alternar(p, d); }
});

/* Por persona */
function renderPersonaSel() {
  const cur = $("#p-sel").value;
  $("#p-sel").innerHTML = D().personas.map((p) => `<option value="${esc(p.id)}">${esc(p.nombre)}${p.rol ? ` (${isH(p) ? "H" : "M"})` : ""}</option>`).join("");
  if (cur && persona(cur)) $("#p-sel").value = cur;
}
function timelineHTML(p) {
  const S = motor.asig(p.id), cs = cambios(S);
  if (!S.length) return `<div><span class="hint">Sin danzas asignadas.</span></div>`;
  let h = "";
  S.forEach((d, i) => {
    if (i) { const c = cs.find((c) => c.a === d); if (c) { const n = nivel(c.min); h += `<div class="chg ${n === "ok" ? "" : n === "warn" ? "warn" : "bad"}">Cambio de vestuario: ${c.min} min</div>`; } }
    const X = DZ[d], pr = motor.revisar(p, S, d);
    h += `<div class="dz"><time>${X.s} – ${X.e}</time><div><b>${esc(X.label)}</b> <span class="hint">· ${esc(BQ[X.b].nombre)}</span>${pr.bad ? `<div class="msg bad">${esc(pr.why)}</div>` : ""}</div></div>`;
  });
  return h;
}
function renderPersona() {
  const p = persona($("#p-sel").value);
  if (!p) { $("#p-head").textContent = "No hay personas cargadas."; $("#p-tl").innerHTML = ""; $("#p-opts").innerHTML = ""; $("#p-form").hidden = true; return; }
  $("#p-form").hidden = false;
  const S = motor.asig(p.id), cs = cambios(S), mx = maxDe(p);
  $("#p-head").innerHTML = `${rolTag(p)} ${S.length} danza${S.length === 1 ? "" : "s"}${mx ? ` de ${mx} posibles` : ""} · ${cs.length} cambio${cs.length === 1 ? "" : "s"} de vestuario${p.correo ? ` · ${esc(p.correo)}` : " · sin correo vinculado"}`;
  if (document.activeElement?.closest("#p-form") == null) { $("#p-correo").value = p.correo || ""; $("#p-rol").value = p.rol || ""; $("#p-vin").value = p.vinculo || ""; }
  $("#p-tl").innerHTML = timelineHTML(p);
  const ord = { ok: 1, warn: 2, block: 3, na: 4 };
  $("#p-opts").innerHTML = DANZAS.map((d) => [d, motor.evaluar(p, d.id)]).filter(([, ev]) => ev.st !== "on").sort((a, b) => ord[a[1].st] - ord[b[1].st] || a[0].ini - b[0].ini)
    .map(([d, ev]) => `<li class="item ${ev.st === "na" ? "block" : ev.st}" data-d="${esc(d.id)}"><span><b>${esc(d.label)}</b> <span class="hint">${d.s}</span>${defTag(d.id)}<span class="why">${esc(ev.why || "")}</span></span>${ev.st === "ok" || ev.st === "warn" ? `<button class="btn small" data-act="add">Asignar</button>` : ""}</li>`).join("");
}
$("#p-sel").addEventListener("change", () => { $("#p-correo").blur(); renderPersona(); });
$("#p-opts").addEventListener("click", (e) => { const li = e.target.closest("li[data-d]"); if (li && e.target.closest('[data-act="add"]')) { const p = persona($("#p-sel").value); if (p) alternar(p, li.dataset.d); } });
$("#p-form").addEventListener("submit", async (e) => {
  e.preventDefault(); const p = persona($("#p-sel").value); if (!p) return;
  const correo = $("#p-correo").value.trim().toLowerCase();
  if (correo && !/^[^@\s]+@unal\.edu\.co$/.test(correo)) return msg("El correo debe terminar en @unal.edu.co.", "bad");
  if (correo && D().personas.some((x) => x.id !== p.id && x.correo === correo)) return msg("Ese correo ya está vinculado a otra persona.", "bad");
  try { await store.actualizarPersona(p.id, { correo, rol: $("#p-rol").value, vinculo: $("#p-vin").value }); msg(`Datos de ${p.nombre} guardados.`, "ok"); document.activeElement?.blur(); }
  catch (err) { msg("No se pudo guardar.", "bad"); }
});

/* Logística */
function renderLogistica() {
  const ts = motor.transiciones(), ps = D().personas.filter((p) => motor.asig(p.id).length);
  const total = ts.reduce((s, t) => s + t.gente.length, 0), rapidos = ts.reduce((s, t) => s + t.gente.filter((g) => g.c.min < REGLAS.margenRapido).length, 0);
  const vest = BLOQUES.reduce((s, b) => s + D().personas.filter((p) => motor.asig(p.id).some((d) => DZ[d].b === b.id)).length, 0);
  const peor = ts.reduce((m, t) => (!m || t.presion > m.presion ? t : m), null);
  $("#l-kpis").innerHTML = `<div class="kpi"><b>${ps.length}</b><span>personas con danza</span></div><div class="kpi"><b>${vest}</b><span>vestuarios a alistar (persona × bloque)</span></div><div class="kpi"><b>${total}</b><span>cambios de vestuario</span></div><div class="kpi"><b style="color:${rapidos ? "var(--warn)" : "inherit"}">${rapidos}</b><span>cambios rápidos (menos de ${REGLAS.margenRapido} min)</span></div>${peor && peor.gente.length ? `<div class="kpi"><b>→ ${esc(peor.B.nombre)}</b><span>llegada más exigente</span></div>` : ""}`;
  const maxP = Math.max(1, ...ts.map((t) => t.presion));
  const tag = (min) => { const n = nivel(min); return `<span class="tag ${n === "ok" ? "ok" : n === "warn" ? "warn" : "bad"}">${min} min</span>`; };
  $("#l-trans").innerHTML = `<tr><th>Transición</th><th>Margen</th><th>Se cambian</th><th>Presión</th><th>Quiénes</th></tr>` + ts.map((t) =>
    `<tr><td><b>${esc(t.A.nombre)}</b> → <b>${esc(t.B.nombre)}</b><div class="hint">${fmt(t.A.fin)} a ${fmt(t.B.ini)}</div></td><td>${tag(t.min)}</td><td>${t.gente.length}</td><td><div class="bar"><i style="width:${(t.presion / maxP) * 100}%"></i></div></td><td class="hint">${t.gente.map((g) => `${esc(g.p.nombre)} (${esc(DZ[g.c.de].label)}, ${g.c.min} min)`).join(", ") || "Nadie"}</td></tr>`).join("")
    + `<tr><td colspan="5" class="hint">El margen es entre bloques seguidos; 0 min significa que nadie pasa directo del uno al otro. Quien llega desde una danza anterior aparece con su propio margen entre paréntesis.</td></tr>`;
  $("#l-bal").innerHTML = `<tr><th>Danza</th><th>Hora</th><th>Hombres</th><th>Mujeres</th><th>Parejas</th><th>Estado</th></tr>` + DANZAS.map((d) => {
    const b = motor.balance(d.id), dif = d.pareja ? b.h - b.m : 0;
    return `<tr><td><b>${esc(d.label)}</b>${defTag(d.id)}</td><td>${d.s}</td><td>${b.h}</td><td>${b.m}</td><td>${d.pareja ? b.par : d.soloMujeres ? "solo mujeres" : "–"}</td><td>${dif ? `<span class="tag warn">faltan ${Math.abs(dif)} ${dif > 0 ? "mujer(es)" : "hombre(s)"}</span>` : ""}</td></tr>`;
  }).join("");
  const rows = ps.map((p) => { const cs = cambios(motor.asig(p.id)); return { p, n: motor.asig(p.id).length, cs: cs.length, mn: cs.length ? Math.min(...cs.map((c) => c.min)) : null }; }).sort((a, b) => (a.mn ?? 99) - (b.mn ?? 99) || b.n - a.n);
  $("#l-per").innerHTML = `<tr><th>Persona</th><th>Danzas</th><th>Cambios</th><th>Cambio más corto</th></tr>` + (rows.length ? rows.map((r) => `<tr><td>${esc(r.p.nombre)} ${rolTag(r.p)}</td><td>${r.n}${maxDe(r.p) ? ` / ${maxDe(r.p)}` : ""}</td><td>${r.cs}</td><td>${r.mn === null ? "–" : tag(r.mn)}</td></tr>`).join("") : `<tr><td colspan="4" class="hint">Aún no hay asignaciones.</td></tr>`);
}

/* Programa (compartido con el bailarín) */
function programaHTML(conNombres) {
  return PROGRAMA.map((x) => {
    if (!x.d) return `<div><time>${x.i} – ${x.e}</time><div class="hint">${esc(x.a)}</div></div>`;
    const b = motor.balance(x.d), X = DZ[x.d];
    const nombres = conNombres && b.l.length ? `<div class="dz-names">${b.l.map((p) => esc(p.nombre)).join(" · ")}</div>` : "";
    return `<div class="dz"><time>${x.i} – ${x.e}</time><div><b>${esc(X.label)}</b>${defTag(x.d)} <span class="hint">· ${esc(BQ[X.b].nombre)}${x.n ? " · " + esc(x.n) : ""}</span><div class="hint"><span class="dot H"></span>${pl(b.h, "hombre", "hombres")} · <span class="dot M"></span>${pl(b.m, "mujer", "mujeres")}${X.pareja ? ` · ${pl(b.par, "pareja", "parejas")}` : ""}</div>${nombres}</div></div>`;
  }).join("");
}

/* Datos: inscribir, importar, exportar */
$("#f-new").addEventListener("submit", async (e) => {
  e.preventDefault();
  const nombre = $("#f-nombre").value.replace(/\s+/g, " ").trim(), correo = $("#f-correo").value.trim().toLowerCase();
  const rol = document.querySelector('input[name="rol"]:checked')?.value, vinculo = document.querySelector('input[name="vin"]:checked')?.value || "";
  if (!nombre || !rol) return ($("#f-msg").textContent = "Escriba el nombre y elija el rol.");
  if (correo && !/^[^@\s]+@unal\.edu\.co$/.test(correo)) return ($("#f-msg").textContent = "El correo debe terminar en @unal.edu.co.");
  if (D().personas.some((p) => norm(p.nombre) === norm(nombre))) return ($("#f-msg").textContent = "Esa persona ya está en el grupo.");
  try { await store.crearPersona({ nombre, rol, vinculo, correo, postulaciones: [], obs: "" }); e.target.reset(); $("#f-msg").textContent = `${nombre} quedó inscrito(a).`; }
  catch (err) { $("#f-msg").textContent = "No se pudo guardar."; }
});
$("#xls").addEventListener("click", () => { try { exportarExcel(D(), motor); msg("Archivo exportado.", "ok"); } catch (e) { msg("No se pudo exportar: " + e.message, "bad"); } });
$("#imp").addEventListener("change", async (e) => {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  try {
    const { personas, elenco } = await leerExcel(f);
    if (D().personas.length && !(await confirmar("Reemplazar todos los datos", `Se cargarán ${personas.length} personas y se borrarán las ${D().personas.length} actuales con sus asignaciones. Esto afecta a todos los usuarios.`))) return;
    msg("Importando…"); await store.importar(personas, elenco); msg(`Se importaron ${personas.length} personas.`, "ok");
  } catch (err) { msg("No se pudo importar: " + (err.message || "archivo no válido"), "bad"); }
});

/* ---------- bailarín ---------- */
function renderBailarin() {
  const s = store.sesion, p = D().personas.find((x) => (x.correo || "").toLowerCase() === s.correo);
  let h = "";
  if (!D().personas.length) h += `<div class="card"><p class="hint" style="margin:0">Cargando el elenco…</p></div>`;
  else if (!p) h += `<div class="card" style="display:grid;gap:6px"><h2>Tu correo aún no está vinculado</h2><p class="hint" style="margin:0">Ingresaste como <b>${esc(s.correo)}</b>, pero no aparece en el elenco. Pídele al maestro que lo agregue a tu nombre.</p></div>`;
  else {
    const S = motor.asig(p.id), cs = cambios(S);
    h += `<div class="card" style="display:grid;gap:10px"><h2>Hola, ${esc(p.nombre.split(" ")[0])}</h2><p class="hint" style="margin:0">${S.length ? `Bailas ${S.length} danza${S.length === 1 ? "" : "s"} y tienes ${cs.length} cambio${cs.length === 1 ? "" : "s"} de vestuario. Se actualiza en vivo cuando el maestro hace cambios.` : "El maestro aún no te ha asignado danzas. Esta página se actualiza sola."}</p></div>`;
    h += `<div style="display:grid;gap:8px"><h3>Tu programa</h3><div class="tl">${timelineHTML(p)}</div></div>`;
  }
  h += `<div style="display:grid;gap:8px"><h3>Programa de la función</h3><div class="tl">${programaHTML(true)}</div></div>`;
  $("#v-bailarin").innerHTML = h;
}

/* ---------- página de inicio ---------- */
const notas = { "Guabina": "mantilla", "Guaneña y Bambuco sureño": "bebé", "Fandanguillo": "coplas para Marla Patricia", "Arcos": "arcos", "Chicha": "brindis con chicha", "Cumbia": "velas", "Bullerengue": "Delia", "Pilanderas": "balay y pilón" };
const nombreInicio = { "Guaneña y Bambuco sureño": "Guaneña y Danza de Nariño" };
$("#momentos").innerHTML = BLOQUES.map((b) => `<li class="momento"><time>${fmt(b.ini)} p. m.</time><h3>${esc(b.nombre)}</h3><ul>${b.danzas.map((d) =>
  `<li>${esc(nombreInicio[d] || DZ[d].label)}${notas[d] ? ` <small>· ${esc(notas[d])}</small>` : ""}</li>`).join("")}</ul></li>`).join("");
let verInicio = true;
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-entrar]")) { if (store.sesion?.estado === "listo") { verInicio = false; render(); } else { verInicio = false; store.entrar(); } }
  if (e.target.closest("[data-inicio]")) { verInicio = true; render(); window.scrollTo(0, 0); }
});

/* ---------- render general ---------- */
function render() {
  const s = store.sesion || { estado: "cargando" };
  $("#local").hidden = store.modo !== "local";
  const listo = s.estado === "listo";
  const enInicio = !listo || verInicio;
  $("#v-inicio").hidden = !enInicio;
  $("#app").hidden = enInicio;
  document.querySelectorAll("[data-entrar]").forEach((b) => { b.disabled = s.estado === "cargando"; b.textContent = listo ? (s.maestro ? "Ir al elenco" : "Ver mi programa") : b.dataset.txt || (b.dataset.txt = b.textContent); });
  $("#login-msg").textContent = s.estado === "dominio" ? `${s.correo} no es una cuenta @unal.edu.co. Ingrese con su correo de la universidad.` : s.estado === "error" ? s.msg : "";
  $("#v-cargando").hidden = true;
  $("#user").hidden = !listo;
  if (listo) $("#user").innerHTML = `<button class="btn ghost small" data-inicio type="button">Inicio</button><span>${esc(s.correo)}${s.maestro ? ' <span class="badge">Maestro</span>' : ""}</span><button class="btn ghost small" id="salir" type="button">Salir</button>`;
  if (enInicio) return;
  $("#v-maestro").hidden = !(listo && s.maestro);
  $("#v-bailarin").hidden = !(listo && !s.maestro);
  if (!listo) return;
  if (s.error) msg(s.error, "bad");
  motor = crearMotor(D());
  if (s.maestro) { renderSummary(); renderMatriz(); renderPersonaSel(); renderPersona(); renderDanza(); renderLogistica(); $("#prog").innerHTML = programaHTML(false); }
  else renderBailarin();
}
document.addEventListener("click", (e) => { if (e.target.id === "salir") { verInicio = true; store.salir(); } });

try { const v = localStorage.getItem("dfun-v2-tab"); if (VIEWS.includes(v)) show(v); } catch (e) {}
render();
store.iniciar().catch((e) => { console.error(e); msg("No se pudo iniciar la aplicación. Recargue la página.", "bad"); });

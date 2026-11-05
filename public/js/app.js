import { BLOQUES, DANZAS, DZ, BQ, PROGRAMA, REGLAS, CUPOS, VESTUARIO, PIEZAS_COMPARTIDAS, LLAMADOS, fmt } from "./montaje.js";
import { crearMotor, cambios, nivel, maxDe } from "./reglas.js";
import { crearStore } from "./datos.js";
import { leerExcel, exportarExcel } from "./excel.js";
import { iniciarPortada } from "./portada.js";

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
const VIEWS = ["matriz", "danza", "persona", "logistica", "vestuario", "programa", "datos"];
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
  const esAdmin = rolActivo === "admin" && store.sesion?.admin;
  $("#f-sincorreo").hidden = !esAdmin;
  if (!esAdmin && fr === "sincorreo") { document.querySelector('input[name="frol"][value=""]').checked = true; return renderMatriz(); }
  const ps = D().personas.filter((p) => (!q || norm(p.nombre).includes(q)) && (fr === "sincorreo" ? esAdmin && !p.correo : !fr || p.rol === fr));
  t.tHead.innerHTML = `<tr class="b"><th class="name"></th>${BLOQUES.map((b) => `<th colspan="${b.danzas.length}" class="bstart" title="${esc(b.nombre)}">${esc(b.corto || b.nombre)}</th>`).join("")}</tr>
  <tr class="d"><th class="name">Nombre</th>${DANZAS.map((d, i) => `<th class="${bstart(i)}"><span>${esc(d.label)}${motor.definida(d.id) ? " ★" : ""}</span><small>${d.s}</small></th>`).join("")}</tr>`;
  if (!ps.length) { t.tBodies[0].innerHTML = `<tr><td class="name" colspan="${DANZAS.length + 1}" style="padding:16px">${D().personas.length ? "Nadie coincide con la búsqueda." : "Aún no hay personas. Cárguelas desde la pestaña Datos."}</td></tr>`; t.tFoot.innerHTML = ""; return; }
  t.tBodies[0].innerHTML = ps.map((p) => {
    const post = new Set(p.postulaciones || []);
    return `<tr data-id="${esc(p.id)}"><td class="name"><button class="cell" data-act="persona" style="width:auto;height:auto;text-align:left;font-weight:600;font-size:14px;padding:2px 0">${esc(p.nombre)}</button> ${rolTag(p)}${cntTag(p)}${esAdmin && !p.correo ? ' <span class="tag warn" title="Sin correo vinculado: no puede ver su programa">sin correo</span>' : ""}</td>${DANZAS.map((d, i) => {
      const ev = motor.evaluar(p, d.id); let cls = "cell", tip = ev.why || "";
      if (ev.st === "on") cls += " on" + (ev.bad ? " bad" : ev.warn ? " warn" : ""); else cls += " s-" + ev.st;
      if (post.has(d.id)) { cls += " post"; tip += " · Se postuló"; }
      return `<td class="${bstart(i)}"><button class="${cls}" data-d="${esc(d.id)}" title="${esc(d.label)}: ${esc(tip)}" aria-label="${esc(d.label)}, ${esc(p.nombre)}: ${esc(tip)}"></button></td>`;
    }).join("")}</tr>`;
  }).join("");
  const cupoTxt = (n, c) => (c ? `<span style="color:${n > c ? "var(--bad)" : n === c ? "var(--ok)" : "inherit"}">${n}/${c}</span>` : "–");
  t.tFoot.innerHTML = `<tr><td class="name">Hombres (asignados/cupo)</td>${DANZAS.map((d, i) => `<td class="${bstart(i)}">${cupoTxt(motor.balance(d.id).h, CUPOS[d.id]?.Hombre)}</td>`).join("")}</tr>
  <tr><td class="name">Mujeres (asignadas/cupo)</td>${DANZAS.map((d, i) => `<td class="${bstart(i)}">${cupoTxt(motor.balance(d.id).m, CUPOS[d.id]?.Mujer)}</td>`).join("")}</tr>`;
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
  const cu = CUPOS[d] || {};
  $("#d-kpis").innerHTML = `<div class="kpi"><b>${b.h}${cu.Hombre != null ? ` / ${cu.Hombre}` : ""}</b><span>hombres asignados / cupo</span></div><div class="kpi"><b>${b.m}${cu.Mujer != null ? ` / ${cu.Mujer}` : ""}</b><span>mujeres asignadas / cupo</span></div>${X.pareja ? `<div class="kpi"><b>${b.par}</b><span>parejas${pend ? ` · faltan ${pend} ${b.h > b.m ? "mujer(es)" : "hombre(s)"}` : ""}</span></div>` : ""}`;
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
  const esAdmin = rolActivo === "admin" && store.sesion?.admin;
  $("#p-sel").innerHTML = D().personas.map((p) => `<option value="${esc(p.id)}">${esc(p.nombre)}${p.rol ? ` (${isH(p) ? "H" : "M"})` : ""}${esAdmin && !p.correo ? " · sin correo" : ""}</option>`).join("");
  if (cur && persona(cur)) $("#p-sel").value = cur;
}
function timelineHTML(p) {
  const S = motor.asig(p.id), cs = cambios(S);
  if (!S.length) return `<div><span class="hint">Sin danzas asignadas.</span></div>`;
  let h = "";
  S.forEach((d, i) => {
    if (i) { const c = cs.find((c) => c.a === d); if (c) { const n = nivel(c.min, p.rol); h += `<div class="chg ${n === "ok" ? "" : n === "warn" ? "warn" : "bad"}">Cambio de vestuario: ${c.min} min</div>`; } }
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
  if ($("#p-ficha").open) $("#p-ficha-c").innerHTML = fichaHTML(p, false);
  const ord = { ok: 1, warn: 2, block: 3, na: 4 };
  $("#p-opts").innerHTML = DANZAS.map((d) => [d, motor.evaluar(p, d.id)]).filter(([, ev]) => ev.st !== "on").sort((a, b) => ord[a[1].st] - ord[b[1].st] || a[0].ini - b[0].ini)
    .map(([d, ev]) => `<li class="item ${ev.st === "na" ? "block" : ev.st}" data-d="${esc(d.id)}"><span><b>${esc(d.label)}</b> <span class="hint">${d.s}</span>${defTag(d.id)}<span class="why">${esc(ev.why || "")}</span></span>${ev.st === "ok" || ev.st === "warn" ? `<button class="btn small" data-act="add">Asignar</button>` : ""}</li>`).join("");
}
$("#p-sel").addEventListener("change", () => { $("#p-correo").blur(); renderPersona(); });
$("#p-ficha").addEventListener("toggle", () => renderPersona());
$("#p-opts").addEventListener("click", (e) => { const li = e.target.closest("li[data-d]"); if (li && e.target.closest('[data-act="add"]')) { const p = persona($("#p-sel").value); if (p) alternar(p, li.dataset.d); } });
$("#p-form").addEventListener("submit", async (e) => {
  e.preventDefault(); const p = persona($("#p-sel").value); if (!p) return;
  const correo = store.sesion?.admin ? $("#p-correo").value.trim().toLowerCase() : (p.correo || "");
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
  $("#l-bal").innerHTML = `<tr><th>Danza</th><th>Hora</th><th>Hombres / cupo</th><th>Mujeres / cupo</th><th>Parejas</th><th>Estado</th></tr>` + DANZAS.map((d) => {
    const b = motor.balance(d.id), dif = d.pareja ? b.h - b.m : 0, cu = CUPOS[d.id] || {};
    return `<tr><td><b>${esc(d.label)}</b>${defTag(d.id)}</td><td>${d.s}</td><td>${b.h} / ${cu.Hombre ?? "–"}</td><td>${b.m} / ${cu.Mujer ?? "–"}</td><td>${d.pareja ? b.par : d.soloMujeres ? "solo mujeres" : "–"}</td><td>${dif ? `<span class="tag warn">faltan ${Math.abs(dif)} ${dif > 0 ? "mujer(es)" : "hombre(s)"}</span>` : ""}</td></tr>`;
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
  const nombre = $("#f-nombre").value.replace(/\s+/g, " ").trim(), correo = store.sesion?.admin ? $("#f-correo").value.trim().toLowerCase() : "";
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
  if (!store.sesion?.admin || rolActivo !== "admin") return msg("Solo el administrador puede restaurar datos.", "bad");
  try {
    const { personas, elenco } = await leerExcel(f);
    // Conserva los correos ya vinculados cuando el archivo no los trae.
    let conservados = 0;
    personas.forEach((p) => { if (!p.correo) { const old = D().personas.find((x) => x.correo && norm(x.nombre) === norm(p.nombre)); if (old) { p.correo = old.correo; conservados++; } } });
    if (D().personas.length && !(await confirmar("Reemplazar todos los datos", `Se cargarán ${personas.length} personas y se borrarán las ${D().personas.length} actuales con sus asignaciones. Esto afecta a todos los usuarios.`))) return;
    msg("Importando…"); await store.importar(personas, elenco); msg(`Se importaron ${personas.length} personas${conservados ? ` y se ${conservados === 1 ? "conservó" : "conservaron"} ${pl(conservados, "correo vinculado", "correos vinculados")}` : ""}.`, "ok");
  } catch (err) { msg("No se pudo importar: " + (err.message || "archivo no válido"), "bad"); }
});

/* ---------- vestuario (maestro) ---------- */
const ROLES = ["Mujer", "Hombre"];
const nombreRol = { Mujer: "Mujeres", Hombre: "Hombres" };
function piezasAnalisis() {
  return PIEZAS_COMPARTIDAS.map((x) => {
    const usa = (ds) => new Set(D().personas.filter((p) => p.rol === x.rol && motor.asig(p.id).some((d) => ds.includes(d))).map((p) => p.id));
    const A = usa(x.de), B = usa(x.a);
    const entregan = [...A].filter((id) => !B.has(id)).length, reciben = [...B].filter((id) => !A.has(id)).length;
    const min = Math.min(...x.a.map((d) => DZ[d].ini)) - Math.max(...x.de.map((d) => DZ[d].fin));
    return { ...x, A, B, entregan, reciben, min };
  });
}
function renderVestuario() {
  $("#v-tabla").innerHTML = DANZAS.map((d) => {
    const v = VESTUARIO[d.id] || {}, b = motor.balance(d.id);
    const filas = ROLES.filter((r) => v[r] && (CUPOS[d.id]?.[r] ?? 0) > 0).map((r) => {
      const cupo = CUPOS[d.id][r], asig = r === "Hombre" ? b.h : b.m;
      const prendas = v[r].prendas.map(([n, hay, nec]) => { const need = nec ?? cupo, falta = Math.max(0, need - hay); return `<li>${esc(n)} <span class="hint">${hay}/${need}</span>${falta ? ` <span class="tag warn">faltan ${falta}</span>` : ""}</li>`; }).join("") || `<li class="hint">Sin prendas registradas</li>`;
      const pend = v[r].pend.length ? `<div class="hint" style="margin-top:6px">${v[r].pend.map(esc).join(" · ")}</div>` : "";
      return `<div><h4 class="vh"><span class="dot ${r === "Hombre" ? "H" : "M"}"></span>${nombreRol[r]} · ${asig} de ${cupo} asignados</h4><ul class="plist">${prendas}</ul>${pend}</div>`;
    }).join("");
    return `<div class="card vcard"><h3>${esc(d.label)} <span class="hint">· ${d.s} · ${esc(BQ[d.b].nombre)}</span></h3><div class="vgrid">${filas}</div></div>`;
  }).join("");
  $("#v-piezas").innerHTML = `<tr><th>Pieza</th><th>Pasa de</th><th>A</th><th>Margen</th><th>Entregan / reciben</th></tr>` + piezasAnalisis().map((x) => {
    const n = nivel(x.min), riesgo = x.entregan && x.reciben && n !== "ok";
    return `<tr><td><b>${esc(x.pieza)}</b> <span class="hint">(${nombreRol[x.rol].toLowerCase()})</span></td><td>${x.de.map((d) => esc(DZ[d].label)).join(", ")}</td><td>${x.a.map((d) => esc(DZ[d].label)).join(", ")}</td><td><span class="tag ${n === "ok" ? "ok" : n === "warn" ? "warn" : "bad"}">${x.min} min</span></td><td>${x.entregan} entregan · ${x.reciben} reciben${riesgo ? ' <span class="tag bad">riesgo</span>' : ""}</td></tr>`;
  }).join("") + `<tr><td colspan="5" class="hint">Quien baila en ambos lados conserva la pieza. "Entregan" son quienes salen y no siguen; "reciben" son quienes entran sin haberla usado antes.</td></tr>`;
}

/* ---------- ficha del bailarín (la usan el bailarín y el maestro) ---------- */
const NOTAS_ESCENA = Object.fromEntries(PROGRAMA.filter((x) => x.d && x.n).map((x) => [x.d, x.n]));
function vecinos(d) {
  const i = PROGRAMA.findIndex((x) => x.d === d);
  const nom = (x) => (x ? (x.d ? DZ[x.d].label : x.a) + ` (${x.i})` : null);
  return { antes: nom(PROGRAMA[i - 1]), despues: nom(PROGRAMA[i + 1]) };
}
function recomendaciones(p) {
  const S = motor.asig(p.id), cs = cambios(S), out = [];
  cs.forEach((c) => {
    if (c.min <= 0) out.push(`Sales de ${DZ[c.de].label} y entras directo a ${DZ[c.a].label}, sin tiempo entre las dos: pide al maestro qué prendas cambias, lleva el vestuario de ${DZ[c.a].label} puesto debajo o listo junto al escenario, y busca a alguien que te ayude a cambiarte.`);
    else if (c.min < REGLAS.margenRapido) out.push(`Cambio rápido de ${c.min} min entre ${DZ[c.de].label} y ${DZ[c.a].label}: deja el vestuario de ${DZ[c.a].label} listo en el camerino, en el orden en que te lo pones, antes de que empiece la función.`);
    else out.push(`Tienes ${c.min} min para cambiarte entre ${DZ[c.de].label} y ${DZ[c.a].label}.`);
  });
  BLOQUES.forEach((b) => { const en = S.filter((d) => DZ[d].b === b.id); if (en.length > 1) out.push(`${en.map((d) => DZ[d].label).join(" y ")} usan el mismo vestuario: no te cambias entre ellas.`); });
  piezasAnalisis().forEach((x) => {
    if (x.A.has(p.id) && !x.B.has(p.id) && x.B.size) out.push(`Al terminar ${x.de.map((d) => DZ[d].label).join(" / ")}, entrega ${x.pieza.toLowerCase()} a quienes entran en ${x.a.map((d) => DZ[d].label).join(" / ")} (${x.min} min después).`);
    if (x.B.has(p.id) && !x.A.has(p.id) && x.A.size) out.push(`Recibes ${x.pieza.toLowerCase()} de quienes salen de ${x.de.map((d) => DZ[d].label).join(" / ")}: acuerda con ellos dónde te los dejan.`);
  });
  S.forEach((d) => { if (NOTAS_ESCENA[d] && /objeto/i.test(NOTAS_ESCENA[d])) out.push(`${DZ[d].label}: ${NOTAS_ESCENA[d].replace(/^Objeto articulador:/i, "objeto en escena:")}. Confirma con producción dónde lo recoges.`); });
  out.push("Marca cada prenda con tu nombre y revisa que esté completa antes del ensayo general de las 5:00 p. m.");
  out.push("Lleva ropa base cómoda para los cambios, agua y lo necesario para maquillaje y peinado.");
  return out;
}
function fichaHTML(p, propio) {
  const S = motor.asig(p.id), cs = cambios(S);
  let h = `<div class="card" style="display:grid;gap:8px"><h2>${propio ? `Hola, ${esc(p.nombre.split(" ")[0])}` : esc(p.nombre)}</h2><p class="hint" style="margin:0">${S.length ? `${pl(S.length, "danza", "danzas")} · ${pl(cs.length, "cambio de vestuario", "cambios de vestuario")}.${propio ? " Se actualiza en vivo cuando el maestro hace cambios." : ""}` : propio ? "Aún no tienes danzas asignadas. Esta página se actualiza sola cuando el maestro te asigne." : "Aún no tiene danzas asignadas."}</p></div>`;
  if (!S.length) return h;
  h += `<div class="card" style="display:grid;gap:8px"><h3>Llamados del día · miércoles 18 de noviembre</h3><ul class="llamados">${LLAMADOS.map(([t, a]) => `<li><time>${t}</time> ${esc(a)}</li>`).join("")}</ul></div>`;
  S.forEach((d, i) => {
    const X = DZ[d], v = vecinos(d), b = motor.balance(d), vest = VESTUARIO[d]?.[p.rol];
    const llega = i ? cs.find((c) => c.a === d) : null, mismo = i && !llega;
    const lista = (r) => b.l.filter((x) => x.rol === r).map((x) => x.id === p.id ? `<b>${esc(x.nombre)}</b>` : esc(x.nombre)).join(" · ") || "Aún sin asignar";
    h += `<article class="card ficha"><div class="ficha-h"><time>${X.s} – ${X.e}</time><h3>${esc(X.label)}</h3><span class="hint">${esc(BQ[X.b].nombre)}${NOTAS_ESCENA[d] ? " · " + esc(NOTAS_ESCENA[d]) : ""}</span></div>
      <div class="ficha-g">
        <div><span class="k">En escena antes</span>${esc(v.antes || "Inicio de la función")}</div>
        <div><span class="k">En escena después</span>${esc(v.despues || "Cierre")}</div>
        <div><span class="k">Tu cambio</span>${i === 0 ? "Primera danza: llega vestido desde el calentamiento" : mismo ? "Mismo vestuario que tu danza anterior" : `${llega.min} min desde ${esc(DZ[llega.de].label)}`}</div>
      </div>
      <div><span class="k">Vestuario a alistar</span>${vest && vest.prendas.length ? `<ul class="plist">${vest.prendas.map(([n]) => `<li>${esc(n.replace(/ \(solista\)$/, ""))}${/solista/.test(n) ? ' <span class="hint">(solo solista)</span>' : ""}</li>`).join("")}</ul>` : `<p class="hint" style="margin:4px 0 0">Pendiente de definir con el maestro.</p>`}${vest && vest.pend.length ? `<p class="hint" style="margin:6px 0 0">Pendiente del grupo: ${vest.pend.map(esc).join(" · ")}</p>` : ""}</div>
      <div><span class="k">Elenco</span><div class="hint"><span class="dot H"></span>${lista("Hombre")}</div><div class="hint"><span class="dot M"></span>${lista("Mujer")}</div></div>
    </article>`;
  });
  h += `<div class="card" style="display:grid;gap:8px"><h3>Recomendaciones</h3><ul class="recs">${recomendaciones(p).map((r) => `<li>${esc(r)}</li>`).join("")}</ul></div>`;
  return h;
}

/* ---------- bailarín ---------- */
function renderBailarin() {
  const s = store.sesion, p = D().personas.find((x) => (x.correo || "").toLowerCase() === s.correo);
  let h = "";
  if (!D().personas.length) h += `<div class="card"><p class="hint" style="margin:0">Cargando el elenco…</p></div>`;
  else if (!p) h += `<div class="card" style="display:grid;gap:6px"><h2>Tu correo aún no está vinculado</h2><p class="hint" style="margin:0">Ingresaste como <b>${esc(s.correo)}</b>, pero aún no está unido a tu nombre del elenco, así que no podemos mostrarte tus danzas. ${s.admin ? "Cámbiate a <b>Administrador</b> y vincúlalo desde Inicio." : "Pídele al administrador que lo vincule a tu nombre."}</p></div>`;
  else h += fichaHTML(p, true);
  h += `<div style="display:grid;gap:8px"><h3>Programa de la función</h3><div class="tl">${programaHTML(true)}</div></div>`;
  $("#v-bailarin").innerHTML = h;
}

/* ---------- página de inicio ---------- */
// La portada pública (telón y fotos de la apertura) vive en portada.js. Un fallo ahí no debe frenar la aplicación.
try { iniciarPortada(); } catch (e) { console.error(e); }
let verPortada = true, vista = "panel", rolActivo = null;
try { rolActivo = localStorage.getItem("dfun-v2-rol"); } catch (e) {}
// Roles que puede usar la sesión y el rol con el que está viendo la página.
const rolesDe = (s) => [...(s.admin ? ["admin"] : []), ...(s.maestro ? ["maestro"] : []), "bailarin"];
const NOMBRE_ROL = { admin: "Administrador", maestro: "Maestro", bailarin: "Bailarín" };
function permisos(s) {
  const roles = rolesDe(s);
  if (!roles.includes(rolActivo)) rolActivo = roles[0];
  return { rol: rolActivo, roles, admin: rolActivo === "admin", maestro: rolActivo === "admin" || rolActivo === "maestro" };
}
const yoDe = (s) => D().personas.find((x) => (x.correo || "").toLowerCase() === s.correo) || null;
function ir(v) { vista = v; verPortada = false; render(); window.scrollTo(0, 0); }
document.addEventListener("click", async (e) => {
  if (e.target.closest("[data-entrar]")) { if (store.sesion?.estado === "listo") ir("panel"); else { verPortada = false; vista = "panel"; store.entrar(); } return; }
  if (e.target.closest("[data-inicio]")) return ir("panel");
  if (e.target.closest("[data-portada]")) { verPortada = true; render(); window.scrollTo(0, 0); return; }
  const v = e.target.closest("[data-vista]"); if (v) return ir(v.dataset.vista);
  if (e.target.closest("[data-ir-sincorreo]")) { const r = document.querySelector('input[name="frol"][value="sincorreo"]'); if (r) r.checked = true; show("matriz"); return ir("maestro"); }
  if (e.target.id === "salir") { verPortada = true; vista = "panel"; store.salir(); return; }
  if (e.target.closest("[data-rol]")) { rolActivo = e.target.closest("[data-rol]").dataset.rol; try { localStorage.setItem("dfun-v2-rol", rolActivo); } catch (err) {} return ir(rolActivo === "bailarin" ? "bailarin" : "panel"); }
  if (e.target.id === "vincular" || e.target.closest("[data-vincular-id]")) {
    if (!store.sesion?.admin || rolActivo !== "admin") return msg("Solo el administrador puede vincular correos.", "bad");
    const id = e.target.closest("[data-vincular-id]")?.dataset.vincularId || $("#vincular-sel").value, p = persona(id); if (!p) return;
    if (p.correo && p.correo !== store.sesion.correo) return msg(`${p.nombre} ya está vinculado a otro correo.`, "bad");
    const previo = yoDe(store.sesion);
    try { if (previo && previo.id !== id) await store.actualizarPersona(previo.id, { correo: "" }); await store.actualizarPersona(id, { correo: store.sesion.correo }); msg(`Tu correo quedó vinculado a ${p.nombre}.`, "ok"); }
    catch (err) { msg("No se pudo vincular. Revise sus permisos.", "bad"); }
  }
});

/* ---------- panel de inicio (después de ingresar) ---------- */
// Sugiere la persona del elenco cuyo nombre más se parece al nombre de la cuenta de Google.
function sugerido(s) {
  const t = new Set(norm(s.nombre || "").split(" ").filter((x) => x.length > 2));
  if (t.size < 2) return null;
  let mejor = null, max = 0;
  D().personas.filter((p) => !p.correo).forEach((p) => { const n = norm(p.nombre).split(" ").filter((x) => t.has(x)).length; if (n > max) { max = n; mejor = p; } });
  return max >= 2 ? mejor : null;
}
function vincularHTML(s) {
  const ps = D().personas.filter((p) => !p.correo);
  if (!ps.length) return "";
  const sug = sugerido(s);
  return `<div class="card" style="display:grid;gap:10px"><h3>Vincula tu nombre</h3>
    ${sug ? `<p style="margin:0">¿Eres <b>${esc(sug.nombre)}</b>?</p><div class="row"><button class="btn small" type="button" data-vincular-id="${esc(sug.id)}">Sí, vincular mi correo</button></div><p class="hint" style="margin:0">Si no eres tú, elige tu nombre en la lista:</p>` : `<p class="hint" style="margin:0">Elige tu nombre del elenco para ver tu propio programa como bailarín.</p>`}
    <div class="row"><select id="vincular-sel" style="max-width:360px">${ps.map((p) => `<option value="${esc(p.id)}" ${sug && sug.id === p.id ? "selected" : ""}>${esc(p.nombre)}</option>`).join("")}</select><button class="btn small ${sug ? "ghost" : ""}" id="vincular" type="button">Vincular</button></div></div>`;
}
function renderPanel() {
  const s = store.sesion, yo = yoDe(s), ps = D().personas, P = permisos(s);
  const nombre = (yo?.nombre || (s.nombre && !s.nombre.includes("@") ? s.nombre : s.correo.split("@")[0])).split(" ")[0];
  const S = yo ? motor.asig(yo.id) : [];
  const tarjetas = [];
  if (P.maestro) {
    const conDanza = ps.filter((p) => motor.asig(p.id).length).length, malos = motor.conProblemas().length;
    const completas = DANZAS.filter((d) => { const b = motor.balance(d.id), c = CUPOS[d.id] || {}; return (c.Hombre ?? 0) === b.h && (c.Mujer ?? 0) === b.m; }).length;
    tarjetas.push(`<article class="card rolcard"><span class="badge">${NOMBRE_ROL[P.rol]}</span><h2>Armar el elenco</h2>
      <p class="hint">${ps.length ? `${conDanza} de ${ps.length} personas tienen danza. ${completas} de ${DANZAS.length} danzas tienen el cupo completo.${malos ? ` <b style="color:var(--bad)">${malos} con reglas rotas.</b>` : ""}` : "Aún no hay personas cargadas."}</p>
      <ul class="encontraras">
        <li><b>Matriz</b>: asigna danzas con un toque; el semáforo dice quién puede entrar y por qué.</li>
        <li><b>Por danza</b>: cupo, parejas, disponibles por rol y quién no puede.</li>
        <li><b>Por persona</b>: programa de cada bailarín, su correo y lo que él ve al ingresar.</li>
        <li><b>Logística</b>: cambios de vestuario, presión de camerino y balance por danza.</li>
        <li><b>Vestuario</b>: disponible frente a cupo, faltantes y piezas que pasan de mano.</li>
        <li><b>Programa</b> y <b>Datos</b>: minuto a minuto, inscribir personas y respaldo en Excel.</li>
      </ul>
      <button class="btn" type="button" data-vista="maestro">Ir al elenco</button></article>`);
  }
  if (yo || P.rol === "bailarin") {
    tarjetas.push(`<article class="card rolcard"><span class="badge">Bailarín</span><h2>Mi programa</h2>
      <p class="hint">${yo ? (S.length ? `Bailas ${pl(S.length, "danza", "danzas")}: ${S.map((d) => DZ[d].label).join(", ")}. Primera salida a escena: ${DZ[S[0]].s} p. m.` : "Aún no tienes danzas asignadas.") : `Tu correo ${esc(s.correo)} aún no está vinculado a un nombre del elenco.${P.admin ? " Vincúlalo aquí abajo." : s.admin ? " Cámbiate a Administrador para vincularlo." : " Pídeselo al administrador."}`}</p>
      <ul class="encontraras">
        <li><b>Llamados del día</b>: llegada, ensayo general, calentamiento y función.</li>
        <li><b>Una ficha por danza</b>: hora, qué va antes y después en escena y cuánto tiempo tienes para cambiarte.</li>
        <li><b>Vestuario a alistar</b> para cada danza y lo que aún falta del grupo.</li>
        <li><b>El elenco</b> con el que bailas cada danza.</li>
        <li><b>Recomendaciones</b>: cambios rápidos, prendas que entregas o recibes y objetos en escena.</li>
      </ul>
      ${yo ? `<button class="btn" type="button" data-vista="bailarin">Ver mi programa</button>` : ""}</article>`);
  }
  const vincular = P.admin && !yo ? vincularHTML(s) : "";
  const sinCorreo = ps.filter((p) => !p.correo);
  const aviso = P.admin && ps.length && sinCorreo.length ? `<div class="card aviso" style="display:grid;gap:8px"><h3>${sinCorreo.length} de ${ps.length} personas sin correo vinculado</h3><p class="hint" style="margin:0">No podrán ver su programa al ingresar. ${sinCorreo.filter((p) => motor.asig(p.id).length).length} de ellas ya tienen danzas asignadas. Vincúlalas en <b>Elenco</b>, pestaña <b>Por persona</b>, o con el filtro "Sin correo" de la matriz.</p><div class="row"><button class="btn small" type="button" data-ir-sincorreo>Ver quiénes faltan</button></div></div>` : "";
  const cambioRol = P.roles.length > 1 ? `<div class="card" style="display:grid;gap:10px"><h3>Cambiar de rol</h3><p class="hint" style="margin:0">Estás viendo la página como <b>${NOMBRE_ROL[P.rol]}</b>. Cambia para ver exactamente lo que ve cada rol.</p><div class="row">${P.roles.map((r) => `<button class="btn small ${r === P.rol ? "" : "ghost"}" type="button" data-rol="${r}">${NOMBRE_ROL[r]}</button>`).join("")}</div></div>` : "";
  $("#v-panel").innerHTML = `<div class="panel-h"><h2 class="sec-t">Hola, ${esc(nombre)}</h2><p class="sec-sub">Gala 90 años, miércoles 18 de noviembre. La función empieza a las 7:10 p. m.</p></div>
    ${aviso}<div class="rolgrid">${tarjetas.join("")}</div>${vincular}${cambioRol}
    <p class="hint"><button class="linkbtn" type="button" data-portada>Ver la portada del grupo</button></p>`;
}

document.addEventListener("change", (e) => {
  if (e.target.id !== "rol-sel") return;
  rolActivo = e.target.value; try { localStorage.setItem("dfun-v2-rol", rolActivo); } catch (err) {}
  ir(rolActivo === "bailarin" ? "bailarin" : vista === "bailarin" ? "panel" : vista === "maestro" && rolActivo !== "bailarin" ? "maestro" : "panel");
});

/* ---------- render general ---------- */
function render() {
  const s = store.sesion || { estado: "cargando" };
  $("#local").hidden = store.modo !== "local";
  const listo = s.estado === "listo";
  const enPortada = !listo || verPortada;
  $("#v-inicio").hidden = !enPortada;
  $("#app").hidden = enPortada;
  document.querySelectorAll("[data-entrar]").forEach((b) => { b.disabled = s.estado === "cargando"; b.textContent = listo ? "Ir a mi inicio" : b.dataset.txt || (b.dataset.txt = b.textContent); });
  $("#login-msg").textContent = s.estado === "dominio" ? `${s.correo} no es una cuenta @unal.edu.co. Ingrese con su correo de la universidad.` : s.estado === "error" ? s.msg : "";
  $("#v-cargando").hidden = true;
  $("#user").hidden = !listo;
  if (!listo) return;
  motor = crearMotor(D());
  const yo = yoDe(s), P = permisos(s);
  if (vista === "maestro" && !P.maestro) vista = "panel";
  const nav = [["panel", "Inicio"], ...(P.maestro ? [["maestro", "Elenco"]] : []), ...(yo || P.rol === "bailarin" ? [["bailarin", "Mi programa"]] : [])];
  const selRol = P.roles.length > 1 ? `<label class="rolsel"><span class="hint">Ver como</span><select id="rol-sel" aria-label="Ver como">${P.roles.map((r) => `<option value="${r}" ${r === P.rol ? "selected" : ""}>${NOMBRE_ROL[r]}</option>`).join("")}</select></label>` : `<span class="badge">${NOMBRE_ROL[P.rol]}</span>`;
  $("#user").innerHTML = `<div class="seg" role="group" aria-label="Secciones">${nav.map(([k, t]) => `<button type="button" data-vista="${k}" aria-pressed="${vista === k}">${t}</button>`).join("")}</div>${selRol}<span class="hint">${esc(s.correo)}</span><button class="btn ghost small" id="salir" type="button">Salir</button>`;
  if (enPortada) return;
  $("#v-panel").hidden = vista !== "panel";
  $("#v-maestro").hidden = vista !== "maestro";
  $("#v-bailarin").hidden = vista !== "bailarin";
  document.querySelectorAll("[data-admin]").forEach((el) => (el.hidden = !P.admin));
  if (s.error) msg(s.error, "bad");
  if (vista === "panel") renderPanel();
  else if (vista === "maestro") { renderSummary(); renderMatriz(); renderPersonaSel(); renderPersona(); renderDanza(); renderLogistica(); renderVestuario(); $("#prog").innerHTML = programaHTML(false); }
  else renderBailarin();
}

try { const v = localStorage.getItem("dfun-v2-tab"); if (VIEWS.includes(v)) show(v); } catch (e) {}
render();
store.iniciar().catch((e) => { console.error(e); msg("No se pudo iniciar la aplicación. Recargue la página.", "bad"); });

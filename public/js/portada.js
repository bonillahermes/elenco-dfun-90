// Portada pública (#v-inicio): telón que se abre una vez, fotos que rotan en la apertura y recorrido fijo de la función.
// Horas, bloques y danzas salen de montaje.js; aquí solo va la presentación de cada bloque.
import { BLOQUES, DANZAS, DZ, fmt } from "./montaje.js";

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Color (paleta del vestuario), foto y frase de cada bloque, por id de bloque.
// Las fotos se eligieron por el vestuario que se ve en cada una; "foto" es el data-foto del HTML.
const ESCENA = {
  1: { c: "var(--po-panoleta)", foto: "ruanas", frase: "Pañoletas rojas y sombreros negros abren la noche." },
  2: { c: "var(--po-chal)", foto: "bebe", frase: "Chales negros y faldas del sur." },
  3: { c: "var(--po-vinotinto)", foto: "vinotinto", frase: "Faldas vinotinto de Antioquia, ponchos y machetes." },
  4: { c: "var(--po-rajalena)", foto: "panuelos", frase: "Blusas de colores y pantalones blancos." },
  5: { c: "var(--po-arcos)", foto: "bastones", frase: "Arcos de flores y un brindis en escena." },
  6: { c: "var(--po-tinta)", foto: "manos", frase: "Tres parejas, tocados hechos a mano." },
  7: { c: "var(--po-vela)", t: "var(--po-tinta)", foto: "bateas", frase: "Las velas encendidas cierran el recorrido." },
};
// Nombre para el público y objeto en escena, por id de danza.
const NOMBRE = { "Guaneña y Bambuco sureño": "Guaneña y Danza de Nariño" };
const NOTA = {
  "Guabina": "con mantilla",
  "Guaneña y Bambuco sureño": "con el bebé",
  "Fandanguillo": "coplas para Marla Patricia",
  "Chicha": "después del brindis",
  "Cumbia": "con velas",
  "Pilanderas": "con balay y pilón",
};
const linea = (id) => (NOMBRE[id] || DZ[id].label) + (NOTA[id] ? `, ${NOTA[id]}` : "");

export const MOMENTOS = BLOQUES.map((b) => ({
  id: b.id,
  hora: fmt(b.ini),
  nombre: b.nombre,
  danzas: b.danzas.map(linea),
  c: "var(--po-panoleta)", t: "#fff", foto: "ruanas", frase: "",
  ...ESCENA[b.id],
}));

export function iniciarPortada() {
  const raiz = $("#v-inicio");
  if (!raiz) return;
  const quieto = matchMedia("(prefers-reduced-motion: reduce)");
  telon(raiz, quieto);
  hero(raiz, quieto);
  recorrido(raiz, quieto);
  ecoLogin(raiz);
  cuenta(raiz);
}

// El telón se abre una sola vez: al terminar se retira, para que no vuelva a correr al regresar a la portada.
function telon(raiz, quieto) {
  const t = $(".po-telon", raiz);
  if (!t) return;
  if (quieto.matches) return t.remove();
  t.addEventListener("animationend", () => t.remove(), { once: true });
  setTimeout(() => t.remove(), 2600);
}

// Fotos de la apertura: la primera viene en el HTML; las demás se cargan después de la página y se cruzan cada 7 s.
// Se detienen con el botón de pausa, fuera de pantalla, con la pestaña oculta o con movimiento reducido.
function hero(raiz, quieto) {
  const caja = $("#po-fotos", raiz), boton = $("#po-pausa", raiz);
  const fotos = caja ? [...caja.querySelectorAll("[data-slide]")] : [];
  if (fotos.length < 2 || quieto.matches) return;
  const cargar = () => fotos.forEach((p) => {
    p.querySelectorAll("source[data-srcset]").forEach((e) => { e.srcset = e.dataset.srcset; e.removeAttribute("data-srcset"); });
    p.querySelectorAll("img[data-src]").forEach((e) => { e.src = e.dataset.src; e.removeAttribute("data-src"); });
  });
  if (document.readyState === "complete") cargar(); else addEventListener("load", cargar, { once: true });
  const lista = (p) => { const img = p.querySelector("img"); return !!img.getAttribute("src") && img.complete && img.naturalWidth > 0; };
  let actual = 0, pausado = false, visible = true;
  const mostrar = (k) => {
    actual = k;
    fotos.forEach((p, j) => { p.classList.toggle("po-on", j === k); if (j === k) p.removeAttribute("aria-hidden"); else p.setAttribute("aria-hidden", "true"); });
  };
  setInterval(() => {
    if (pausado || !visible || document.hidden || raiz.hidden) return;
    for (let paso = 1; paso < fotos.length; paso++) { const k = (actual + paso) % fotos.length; if (lista(fotos[k])) return mostrar(k); }
  }, 7000);
  if ("IntersectionObserver" in window) new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(caja);
  setTimeout(() => caja.classList.add("po-vivo"), 50);
  if (boton) {
    boton.hidden = false;
    boton.addEventListener("click", () => {
      pausado = !pausado;
      boton.setAttribute("aria-pressed", String(pausado));
      boton.textContent = pausado ? "Reanudar fotos" : "Pausar fotos";
      caja.classList.toggle("po-vivo", !pausado);
    });
  }
}

function recorrido(raiz, quieto) {
  const sec = $("#recorrido", raiz), escena = $("#po-escena", raiz);
  if (!sec || !escena) return;
  const mom = $("#po-mom", raiz), pasos = $("#po-pasos", raiz);
  const fotos = [...raiz.querySelectorAll(".po-escena [data-foto]")];

  // Versión completa para lectores de pantalla; la escena animada queda solo para la vista.
  $("#po-rec-lista", raiz).innerHTML = MOMENTOS.map((m) => `<li>${m.hora} p. m., ${esc(m.nombre)}: ${m.danzas.map(esc).join("; ")}.</li>`).join("");
  escena.setAttribute("aria-hidden", "true");
  pasos.innerHTML = MOMENTOS.map(() => "<i></i>").join("");
  sec.style.setProperty("--n", MOMENTOS.length);
  sec.classList.add("po-vivo");

  let actual = -1, timer = 0;
  const escribir = (m) => {
    $("#po-reloj", raiz).textContent = m.hora;
    $("#po-mnom", raiz).textContent = m.nombre;
    $("#po-mdz", raiz).innerHTML = m.danzas.map((d) => `<li>${esc(d)}</li>`).join("");
    $("#po-mque", raiz).textContent = m.frase;
  };
  function pintar(i, inmediato) {
    if (i === actual) return;
    actual = i;
    const m = MOMENTOS[i];
    escena.style.setProperty("--c", m.c);
    escena.style.setProperty("--t", m.t);
    [...pasos.children].forEach((p, k) => p.classList.toggle("po-on", k === i));
    fotos.forEach((f) => f.classList.toggle("po-on", f.dataset.foto === m.foto));
    // Color, foto y texto cambian a la vez: el texto se apaga mientras el fondo y la foto se cruzan.
    clearTimeout(timer);
    if (inmediato || quieto.matches) { mom.classList.remove("po-sale"); return escribir(m); }
    mom.classList.add("po-sale");
    timer = setTimeout(() => { escribir(m); mom.classList.remove("po-sale"); }, 250);
  }
  function medir(inmediato) {
    if (raiz.hidden) return;
    const r = sec.getBoundingClientRect(), total = r.height - escena.offsetHeight;
    const p = total > 0 ? Math.min(Math.max(-r.top / total, 0), 0.9999) : 0;
    pintar(Math.floor(p * MOMENTOS.length), inmediato);
  }
  let pendiente = false;
  const alMover = () => { if (pendiente) return; pendiente = true; requestAnimationFrame(() => { pendiente = false; medir(false); }); };
  addEventListener("scroll", alMover, { passive: true });
  addEventListener("resize", alMover);
  medir(true);
}

// #login-msg está junto al botón de la apertura; se repite junto al botón del elenco para quien ingresó desde abajo.
function ecoLogin(raiz) {
  const origen = $("#login-msg", raiz), eco = $("[data-eco-login]", raiz);
  if (!origen || !eco) return;
  const copiar = () => { eco.textContent = origen.textContent; };
  new MutationObserver(copiar).observe(origen, { childList: true, characterData: true, subtree: true });
  copiar();
}

// Cuántas danzas y bloques tiene la función, en palabras, desde montaje.js. El HTML trae el mismo texto de respaldo.
const PALABRAS = ["cero", "una", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve", "veinte"];
const enLetras = (n, masculino) => (masculino && n === 1 ? "un" : PALABRAS[n] || String(n));
export const textoCuenta = (danzas = DANZAS.length, bloques = BLOQUES.length) => {
  const t = `${enLetras(danzas)} ${danzas === 1 ? "danza" : "danzas"} en ${enLetras(bloques, true)} ${bloques === 1 ? "bloque" : "bloques"}.`;
  return t[0].toUpperCase() + t.slice(1);
};
function cuenta(raiz) {
  const e = $("#po-cuenta", raiz);
  if (e) e.textContent = textoCuenta();
}

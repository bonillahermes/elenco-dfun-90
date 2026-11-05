// Portada pública (#v-inicio): telón que se abre una vez, fotos que rotan en la apertura y cifras de la gala.
// El número de danzas y bloques sale de montaje.js.
import { BLOQUES, DANZAS } from "./montaje.js";

const $ = (s, r = document) => r.querySelector(s);

export function iniciarPortada() {
  const raiz = $("#v-inicio");
  if (!raiz) return;
  const quieto = matchMedia("(prefers-reduced-motion: reduce)");
  telon(raiz, quieto);
  hero(raiz, quieto);
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

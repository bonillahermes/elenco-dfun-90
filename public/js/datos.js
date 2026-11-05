// Capa de datos. Dos implementaciones con la misma interfaz:
//  - Firebase (Auth con Google @unal.edu.co + Firestore en tiempo real)
//  - Local (localStorage), para probar sin Firebase
//
// Firestore:
//   personas/{id}   { nombre, rol, vinculo, correo, postulaciones[], obs, creado }
//   elenco/{id}     { danzas[], actualizado, por }        (id = id de la persona)
//   config/estado   { definidas: { [danza]: true } }
// Roles (admin, maestro) en config.js y en firestore.rules.
import { firebaseConfig, DOMINIO, MAESTROS, ADMINS } from "./config.js";
import { DEFINIDAS_INICIALES } from "./montaje.js";

const SDK = "https://www.gstatic.com/firebasejs/10.12.2";
const vacio = () => ({ personas: [], elenco: {}, definidas: {} });
const nuevoId = () => "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const ordenarPersonas = (ps) => ps.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

export function crearStore(notificar) {
  return firebaseConfig.apiKey ? storeFirebase(notificar) : storeLocal(notificar);
}

/* ---------------- Firebase ---------------- */
function storeFirebase(notificar) {
  const s = { modo: "firebase", sesion: { estado: "cargando" }, datos: vacio() };
  let fb, unsubs = [];

  async function cargarSDK() {
    if (fb) return fb;
    const [app, auth, fs] = await Promise.all([
      import(`${SDK}/firebase-app.js`), import(`${SDK}/firebase-auth.js`), import(`${SDK}/firebase-firestore.js`),
    ]);
    const a = app.initializeApp(firebaseConfig);
    fb = { auth, fs, A: auth.getAuth(a), db: fs.getFirestore(a) };
    return fb;
  }
  const cortar = () => { unsubs.forEach((u) => u()); unsubs = []; s.datos = vacio(); };

  s.iniciar = async () => {
    const { auth, fs, A, db } = await cargarSDK();
    try { await auth.getRedirectResult(A); } catch (e) { s.sesion = { estado: "error", msg: mensajeAuth(e) }; notificar(); }
    auth.onAuthStateChanged(A, async (u) => {
      cortar();
      if (!u) { s.sesion = { estado: "anonimo" }; return notificar(); }
      const correo = (u.email || "").toLowerCase();
      if (!correo.endsWith("@" + DOMINIO) || !u.emailVerified) {
        await auth.signOut(A);
        s.sesion = { estado: "dominio", correo };
        return notificar();
      }
      const admin = ADMINS.includes(correo), maestro = admin || MAESTROS.includes(correo);
      s.sesion = { estado: "listo", correo, nombre: u.displayName || correo, maestro, admin };
      const err = (e) => { s.sesion.error = "No se pudo leer la base de datos. Revise su conexión."; notificar(); console.error(e); };
      unsubs.push(fs.onSnapshot(fs.collection(db, "personas"), (q) => {
        s.datos.personas = ordenarPersonas(q.docs.map((d) => ({ id: d.id, ...d.data() }))); notificar();
      }, err));
      unsubs.push(fs.onSnapshot(fs.collection(db, "elenco"), (q) => {
        s.datos.elenco = Object.fromEntries(q.docs.map((d) => [d.id, d.data().danzas || []])); notificar();
      }, err));
      unsubs.push(fs.onSnapshot(fs.doc(db, "config", "estado"), (d) => {
        s.datos.definidas = d.exists() ? d.data().definidas || {} : { ...DEFINIDAS_INICIALES }; notificar();
      }, err));
      notificar();
    });
  };

  s.entrar = async () => {
    const { auth, A } = await cargarSDK();
    const p = new auth.GoogleAuthProvider();
    p.setCustomParameters({ hd: DOMINIO, prompt: "select_account" });
    try { await auth.signInWithPopup(A, p); }
    catch (e) {
      if (["auth/popup-blocked", "auth/operation-not-supported-in-this-environment"].includes(e.code)) return auth.signInWithRedirect(A, p);
      if (e.code !== "auth/popup-closed-by-user" && e.code !== "auth/cancelled-popup-request") { s.sesion = { estado: "error", msg: mensajeAuth(e) }; notificar(); }
    }
  };
  s.salir = async () => { const { auth, A } = await cargarSDK(); await auth.signOut(A); };

  const meta = () => ({ actualizado: fb.fs.serverTimestamp(), por: s.sesion.correo });
  s.guardarElenco = (id, danzas) => fb.fs.setDoc(fb.fs.doc(fb.db, "elenco", id), { danzas, ...meta() });
  s.crearPersona = (p) => { const id = nuevoId(); return fb.fs.setDoc(fb.fs.doc(fb.db, "personas", id), { ...p, creado: Date.now() }).then(() => id); };
  s.actualizarPersona = (id, patch) => fb.fs.updateDoc(fb.fs.doc(fb.db, "personas", id), patch);
  s.definir = (d, v) => {
    const def = { ...s.datos.definidas }; if (v) def[d] = true; else delete def[d];
    return fb.fs.setDoc(fb.fs.doc(fb.db, "config", "estado"), { definidas: def });
  };
  // Importación completa: reemplaza personas y elenco (en lotes de 400 escrituras).
  s.importar = async (personas, elenco) => {
    const { fs, db } = fb, ops = [];
    s.datos.personas.forEach((p) => ops.push((b) => b.delete(fs.doc(db, "personas", p.id))));
    Object.keys(s.datos.elenco).forEach((id) => ops.push((b) => b.delete(fs.doc(db, "elenco", id))));
    personas.forEach((p) => { const { id, ...v } = p; ops.push((b) => b.set(fs.doc(db, "personas", id), v)); });
    Object.entries(elenco).forEach(([id, danzas]) => ops.push((b) => b.set(fs.doc(db, "elenco", id), { danzas, actualizado: fs.serverTimestamp(), por: s.sesion.correo })));
    ops.push((b) => b.set(fs.doc(db, "config", "estado"), { definidas: Object.keys(s.datos.definidas).length ? s.datos.definidas : { ...DEFINIDAS_INICIALES } }));
    for (let i = 0; i < ops.length; i += 400) { const b = fs.writeBatch(db); ops.slice(i, i + 400).forEach((f) => f(b)); await b.commit(); }
  };
  return s;
}

function mensajeAuth(e) {
  const m = {
    "auth/unauthorized-domain": "Este dominio no está autorizado en Firebase.",
    "auth/network-request-failed": "Sin conexión. Intente de nuevo.",
    "auth/admin-restricted-operation": "La universidad no permite este inicio de sesión.",
  };
  return m[e.code] || "No se pudo iniciar sesión. Intente de nuevo.";
}

/* ---------------- Local (prueba sin Firebase) ---------------- */
function storeLocal(notificar) {
  const KEY = "dfun-v2-local";
  const s = { modo: "local", datos: vacio() };
  const params = new URLSearchParams(location.search);
  const comoBailarin = params.get("correo");
  let raw = null; try { raw = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  s.datos = raw || { personas: [], elenco: {}, definidas: { ...DEFINIDAS_INICIALES } };
  const guardar = () => { try { localStorage.setItem(KEY, JSON.stringify(s.datos)); } catch (e) {} ordenarPersonas(s.datos.personas); notificar(); return Promise.resolve(); };

  const abrir = () => {
    s.sesion = comoBailarin
      ? { estado: "listo", correo: comoBailarin, nombre: comoBailarin, maestro: MAESTROS.includes(comoBailarin), admin: ADMINS.includes(comoBailarin) }
      : { estado: "listo", correo: ADMINS[0], nombre: ADMINS[0], maestro: true, admin: true };
    ordenarPersonas(s.datos.personas); notificar();
  };
  s.iniciar = async () => { s.sesion = { estado: "anonimo" }; notificar(); };
  s.entrar = async () => abrir();
  s.salir = async () => { s.sesion = { estado: "anonimo" }; notificar(); };
  s.guardarElenco = (id, danzas) => { s.datos.elenco[id] = danzas; return guardar(); };
  s.crearPersona = (p) => { const id = nuevoId(); s.datos.personas.push({ id, ...p, creado: Date.now() }); return guardar().then(() => id); };
  s.actualizarPersona = (id, patch) => { Object.assign(s.datos.personas.find((p) => p.id === id) || {}, patch); return guardar(); };
  s.definir = (d, v) => { if (v) s.datos.definidas[d] = true; else delete s.datos.definidas[d]; return guardar(); };
  s.importar = (personas, elenco) => { s.datos.personas = personas; s.datos.elenco = elenco; return guardar(); };
  return s;
}

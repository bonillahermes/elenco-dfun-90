// Configuración web de Firebase (no es secreta: la seguridad está en firestore.rules).
// Mientras apiKey esté vacío, la aplicación funciona en modo local de prueba.
export const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
};

// Dominio de correo permitido para iniciar sesión.
export const DOMINIO = "unal.edu.co";

// Correos con permiso de edición. Debe coincidir con la lista de firestore.rules.
export const MAESTROS = ["bsilvab@unal.edu.co", "hyate@unal.edu.co"];

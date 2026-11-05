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

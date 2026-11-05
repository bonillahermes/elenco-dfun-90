// Configuración web de Firebase (no es secreta: la seguridad está en firestore.rules).
// Si apiKey se deja vacío, la aplicación funciona en modo local de prueba.
export const firebaseConfig = {
  apiKey: "AIzaSyDCPzOsiK0gCPxd4bd_GDGqC296UbZ3UJo",
  authDomain: "dfun-app.firebaseapp.com",
  projectId: "dfun-app",
  storageBucket: "dfun-app.firebasestorage.app",
  messagingSenderId: "691549828361",
  appId: "1:691549828361:web:a64da04709055749ee0fd8",
};

// Dominio de correo permitido para iniciar sesión.
export const DOMINIO = "unal.edu.co";

// Correos con permiso de edición. Debe coincidir con la lista de firestore.rules.
export const MAESTROS = ["bsilvab@unal.edu.co", "hyate@unal.edu.co"];

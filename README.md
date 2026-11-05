# Elenco DFUN 90 años

Herramienta del maestro para armar el elenco de la Gala 90 años del Grupo de Danzas Folclóricas de la Universidad Nacional. Cada bailarín entra con su correo @unal.edu.co y ve su programa en vivo.

- Sitio: https://dfun.app
- Detalles técnicos y reglas del montaje: [CLAUDE.md](CLAUDE.md)

## Puesta en marcha
1. Firebase: proyecto con Authentication (Google) y Firestore. Copiar la configuración web en `js/config.js`.
2. Firebase → Authentication → Authorized domains: `dfun.app` y el dominio `*.pages.dev`.
3. Firestore: crear `maestros/{correo}` para cada persona que puede editar.
4. Reglas: `firebase deploy --only firestore:rules` (o pegar `firestore.rules` en la consola).
5. Cloudflare Pages: conectar el repositorio, sin build, salida `/`, dominio `dfun.app`.
6. Ingresar como maestro, pestaña Datos, Importar Excel.

## Desarrollo
- Servidor local: `npx serve .` (los módulos ES no funcionan abriendo el archivo directamente).
- Pruebas: `node --test tests/reglas.test.mjs`.

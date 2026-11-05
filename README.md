# Elenco DFUN 90 años

Herramienta del maestro para armar el elenco de la Gala 90 años del Grupo de Danzas Folclóricas de la Universidad Nacional. Cada bailarín entra con su correo @unal.edu.co y ve su programa en vivo.

- Sitio: https://dfun.app
- Detalles técnicos y reglas del montaje: [CLAUDE.md](CLAUDE.md)

## Puesta en marcha
1. Firebase: proyecto con Authentication (Google) y Firestore. Copiar la configuración web en `public/js/config.js`.
2. Firebase → Authentication → Authorized domains: `dfun.app`.
   Agregar también `elenco-dfun-90.bonillahermes.workers.dev` y `v2-elenco-dfun-90.bonillahermes.workers.dev`.
3. Reglas: `firebase deploy --only firestore:rules` (o pegar `firestore.rules` en la consola).
4. Carga inicial (una sola vez): `gcloud auth application-default login`, luego `cd scripts && npm install && node sembrar.mjs ../datos/semilla.json --proyecto <id>`.
5. Cloudflare: el Worker `elenco-dfun-90` ya está conectado al repositorio y a `dfun.app`.

## Desarrollo
- Servidor local: `npx serve public` (los módulos ES no funcionan abriendo el archivo directamente).
- Pruebas: `node --test tests/reglas.test.mjs`.

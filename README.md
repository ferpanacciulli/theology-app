# Teología (e-Sword web)

Estudio bíblico en el navegador, compatible con módulos de e-Sword.

    npm install
    npm run dev

Los módulos (.bblx, .cmtx, .dctx, ...) se importan desde la barra lateral y se
guardan en IndexedDB. Se leen con sql.js (SQLite en WASM).

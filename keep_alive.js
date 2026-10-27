#!/usr/bin/env node
/**
 * keep_alive.js
 * Ejecuta cada día a las 00:00 la función keep_alive de Supabase
 * para mantener la base de datos "viva" (evitar que entre en modo suspensión
 * por inactividad en la plan gratuita).
 *
 * Uso:
 * 1. Configura las variables de entorno o edita las constantes URL_KEY.
 * 2. Ejecuta: node keep_alive.js
 * 3. Programa en cron:
 *    0 0 * * * /usr/bin/node /ruta/completa/keep_alive.js
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://staafojijxyuylsszzsn.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_marYssn5DyUSuM7h95m1XQ_B8eRGL2z";

const KEEP_ALIVE_URL = `${SUPABASE_URL}/functions/v1/keep-alive`;

async function keepAlive() {
  try {
    const response = await fetch(KEEP_ALIVE_URL, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Error en keep_alive: ${response.status} ${error}`);
      process.exit(1);
    }

    console.log(`✅ keep_alive ejecutado OK a las ${new Date().toISOString()}`);
  } catch (error) {
    console.error("Error de conexión:", error.message);
    process.exit(1);
  }
}

keepAlive();

console.log("⏰ keep_alive listo. Se ejecutará las 00:00 todos los días (cron).");

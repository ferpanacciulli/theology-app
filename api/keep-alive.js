/**
 * Vercel Function: keep_alive
 *
 * Llamada por el cron de Vercel todos los días a las 00:00 UTC.
 * Llama a la función RPC keep_alive() de Supabase para evitar que
 * la base de datos entre en modo suspensión por inactividad.
 *
 * Variables de entorno necesarias en Vercel (Settings → Environment Variables):
 *   SUPABASE_URL             → https://tu-proyecto.supabase.co
 *   SUPABASE_PUBLISHABLE_KEY → sb_publishable_xxxx...
 *
 * NOTA: NO usar el prefijo VITE_ acá — esas variables solo las
 * inyecta Vite en el frontend, no están disponibles en serverless functions.
 */

export default async function handler(req, res) {
  // Vercel cron triggers usan GET, no POST
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Faltan variables de entorno: SUPABASE_URL y/o SUPABASE_PUBLISHABLE_KEY");
    return res.status(500).json({
      error: "Variables de entorno no configuradas",
      hint: "Agregá SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY en Vercel → Settings → Environment Variables (sin el prefijo VITE_)"
    });
  }

  try {
    // URL correcta para llamar a una función RPC de Supabase
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/keep_alive`, {
      method: "POST",
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Supabase keep_alive error: ${response.status}`, errorText);
      return res.status(500).json({
        error: "Error al ejecutar keep_alive en Supabase",
        status: response.status,
        detail: errorText,
      });
    }

    const now = new Date().toISOString();
    console.log(`keep_alive ejecutado OK a las ${now}`);
    return res.status(200).json({ success: true, executedAt: now });

  } catch (error) {
    console.error("Error inesperado en keep_alive:", error);
    return res.status(500).json({ error: "Error interno", detail: error.message });
  }
}

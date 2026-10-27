/**
 * Vercel Function: keep_alive
 *
 * Este endpoint es llamado por el cron de Vercel todos los días a las 00:00.
 * Su tarea: mantener la base de datos de Supabase "viva" (evitar que entre en
 * modo suspensión por inactividad).
 *
 * Solo se requiere la variable de entorno SUPABASE_URL (la URL del proyecto).
 * La función POST /rest/v1/public.keep_alive llama a la función SQL RPC
 * public.keep_alive() que escribe la fecha actual en la tabla keep_alive.
 */

export default async function handler(req, res) {
  // Solo aceptar POST (Vercel llama con POST en los cron triggers)
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;

    if (!supabaseUrl) {
      console.error("SUPABASE_URL no está configurada");
      return res.status(500).json({ error: "Primer configura SUPABASE_URL" });
    }

    // Llamar a la función RPC keep_alive de Supabase
    const response = await fetch(`${supabaseUrl}/rest/v1/public.keep_alive`, {
      method: "POST",
      headers: {
        "apikey": process.env.SUPABASE_PUBLISHABLE_KEY,
        "Authorization": `Bearer ${process.env.SUPABASE_PUBLISHABLE_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error al llamar a la función keep_alive de Supabase: ${response.status} ${errorText}`);
      return res.status(500).json({ error: "Error al ejecutar keep_alive" });
    }

    // Vercel devuelve un código 200 por defecto si el fetch éxito
    return res.status(200).json({ success: true, message: "keep_alive ejecutado" });
  } catch (error) {
    console.error("Error en keep_alive:", error);
    return res.status(500).json({ error: "Error interno" });
  }
}

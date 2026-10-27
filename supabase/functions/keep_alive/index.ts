import { serve } from "@hono/node-server";
import { Hono } from "hono";

const app = new Hono();

// Endpoint que llama a la función RPC keep_alive
app.post("/keep-alive", async (c) => {
  try {
    // Llamar a la función RPC de Supabase
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/public.keep_alive`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Usamos la clave anónima que ya tiene la app
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
      }
    );

    const data = await res.json();

    if (!res.ok) {
      return c.json({ error: data.message || "Error en keep-alive" }, res.status);
    }

    return c.json({ success: true, message: "keep_alive ejecutado" });
  } catch (err) {
    console.error("keep-alive error:", err);
    return c.json({ error: "Error interno" }, 500);
  }
});

serve(app, {
  port: parseInt(Deno.env.get("PORT") || "8080"),
});

export default app;
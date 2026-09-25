# Cuentas con Supabase

Con esto, la posición de lectura y la disposición de paneles te siguen entre
dispositivos. Los módulos importados (Biblias, comentarios, diccionarios)
NUNCA se suben: pesan mucho y quedan solo en cada dispositivo, tal como
funcionaban antes.

## 1. Crear el proyecto

1. Entra a [supabase.com](https://supabase.com) y crea un proyecto (el plan
   gratuito alcanza de sobra para esto).
2. En **Project Settings -> API Keys**, pestaña **Publishable and secret API
   keys**, copia la **Project URL** y la **Publishable key** (empieza con
   `sb_publishable_...`). Es la que reemplazó a la vieja clave "anon"; hace
   lo mismo y es igual de segura para usar en el navegador.

## 2. Configurar la app

Copia `.env.example` a `.env` y completa:

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxx
```

Sin este archivo, la app funciona exactamente igual que hasta ahora, solo
que sin botón de cuenta.

## 3. Crear la tabla

En Supabase, ve a **SQL Editor**, pega el contenido de `supabase/schema.sql`
y ejecútalo. Crea una sola tabla, `user_state`, con seguridad a nivel de fila
(cada persona solo puede leer y escribir su propia fila).

## 4. Activar el inicio de sesión por correo

En **Authentication -> Providers**, confirma que **Email** esté activado.
Por defecto usa "enlace mágico" (sin contraseña): la persona escribe su
correo, recibe un enlace, y al tocarlo queda con la sesión iniciada.

En **Authentication -> URL Configuration**, agrega la URL donde vas a
publicar la app (y `http://localhost:5173` mientras desarrollas) a
**Redirect URLs**, o el enlace del correo no va a volver a la app.

## 5. Probar

`npm run dev`, y en la esquina superior derecha aparece un botón para
ingresar con el correo. Al iniciar sesión en un dispositivo nuevo, la
página se recarga una vez para acomodar los paneles como los tenías.

## Qué se sincroniza y qué no

- ✅ Libro, capítulo y versículo donde te quedaste.
- ✅ Qué pestañas tenías abiertas y cómo estaban acomodados los paneles.
- ✅ Qué versión de Biblia y qué comentario tenías elegidos en cada panel.
- ⬜ Notas y subrayados: todavía no están implementados como función; cuando
  se agreguen, se sincronizan de la misma manera.
- ❌ Los módulos importados (`.bblx`, `.cmtx`, `.dctx`...). Siguen viviendo
  solo en el navegador de cada dispositivo (IndexedDB), como hasta ahora.

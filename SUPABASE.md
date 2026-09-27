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

## 4. Activar el inicio de sesión con correo y contraseña

En **Authentication -> Providers**, confirma que **Email** esté activado.
La app usa correo y contraseña, no enlace mágico.

Por defecto, Supabase pide confirmar el correo antes de poder ingresar por
primera vez (un solo correo, no en cada inicio de sesión). Si preferís que
no haga falta ni eso, en **Authentication -> Sign In / Providers -> Email**
apagá "Confirm email" — quedan las cuentas creadas sin ese paso extra.

En **Authentication -> URL Configuration**, agrega la URL donde vas a
publicar la app (y `http://localhost:5173` mientras desarrollas) a
**Redirect URLs**, o el enlace de "olvidé mi contraseña" no va a volver a
la app.

## 5. Probar

`npm run dev`, y en la esquina superior derecha aparece un botón para crear
una cuenta o ingresar con correo y contraseña. Al iniciar sesión en un
dispositivo nuevo, la página se recarga una vez para acomodar los paneles
como los tenías.

## Qué se sincroniza y qué no

- ✅ Libro, capítulo y versículo donde te quedaste.
- ✅ Qué pestañas tenías abiertas y cómo estaban acomodados los paneles.
- ✅ Qué versión de Biblia y qué comentario tenías elegidos en cada panel.
- ✅ Tus subrayados y notas por versículo, y los nombres que le pusiste a
  los colores. También funcionan sin cuenta (quedan en el dispositivo) y se
  mezclan con lo de la nube apenas inicias sesión.
- ❌ Los módulos importados (`.bblx`, `.cmtx`, `.dctx`...). Siguen viviendo
  solo en el navegador de cada dispositivo (IndexedDB), como hasta ahora.

Si ya habías corrido `supabase/schema.sql` antes, volvé a correrlo entero:
se puede ejecutar las veces que quieras sin romper nada, y esta vez agrega
la tabla de subrayados y la columna para los nombres de los colores.

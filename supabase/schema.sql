-- Ejecutar en Supabase -> SQL Editor. Se puede volver a correr entero sin
-- problema aunque ya lo hayas ejecutado antes (todo usa "if not exists").
--
-- Guarda SOLO configuración liviana por usuario (posición de lectura,
-- disposición de paneles, nombres de colores) y los subrayados/notas por
-- versículo. Los módulos importados (Biblias, comentarios, diccionarios)
-- NUNCA se guardan acá: quedan solo en cada dispositivo.

create table if not exists public.user_state (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  position      jsonb,
  layout        jsonb,
  color_labels  jsonb,
  plans         jsonb,
  updated_at    timestamptz not null default now()
);

alter table public.user_state add column if not exists color_labels jsonb;
alter table public.user_state add column if not exists plans jsonb;

alter table public.user_state enable row level security;

drop policy if exists "select_own_state" on public.user_state;
create policy "select_own_state" on public.user_state
  for select using (auth.uid() = user_id);

drop policy if exists "insert_own_state" on public.user_state;
create policy "insert_own_state" on public.user_state
  for insert with check (auth.uid() = user_id);

drop policy if exists "update_own_state" on public.user_state;
create policy "update_own_state" on public.user_state
  for update using (auth.uid() = user_id);

-- Un subrayado/nota por versículo por usuario.
create table if not exists public.highlights (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  book       smallint not null,
  chapter    smallint not null,
  verse      smallint not null,
  color      text,
  note       text,
  updated_at timestamptz not null default now(),
  unique (user_id, book, chapter, verse)
);

alter table public.highlights enable row level security;

drop policy if exists "select_own_highlights" on public.highlights;
create policy "select_own_highlights" on public.highlights
  for select using (auth.uid() = user_id);

drop policy if exists "insert_own_highlights" on public.highlights;
create policy "insert_own_highlights" on public.highlights
  for insert with check (auth.uid() = user_id);

drop policy if exists "update_own_highlights" on public.highlights;
create policy "update_own_highlights" on public.highlights
  for update using (auth.uid() = user_id);

drop policy if exists "delete_own_highlights" on public.highlights;
create policy "delete_own_highlights" on public.highlights
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Recuperación de contraseña SIN correo
-- ---------------------------------------------------------------------------
-- El plan gratis de Supabase no envía correos (el SMTP interno solo llega a los
-- miembros del proyecto), así que en vez de "olvidé mi contraseña" por email la
-- app usa un CÓDIGO DE RECUPERACIÓN: la persona lo ve una sola vez al crear la
-- cuenta (y puede regenerarlo entrando), y con ese código + su correo puede
-- elegir una contraseña nueva. Nada de esto necesita pagar ni configurar SMTP.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.recovery_codes (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  code_hash   text not null,          -- sha256 del código, en hexadecimal
  created_at  timestamptz not null default now()
);

alter table public.recovery_codes enable row level security;

drop policy if exists "manage_own_recovery_code" on public.recovery_codes;
create policy "manage_own_recovery_code" on public.recovery_codes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Cambia la contraseña de una cuenta verificando su código de recuperación.
-- Es "security definer" porque tocar auth.users solo lo puede hacer el servidor;
-- la seguridad está en que sin el código correcto no cambia nada.
create or replace function public.reset_password_with_code(
  p_email        text,
  p_code         text,
  p_new_password text
) returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid;
  v_hash    text;
begin
  if p_new_password is null or length(p_new_password) < 6 then
    raise exception 'La contraseña nueva debe tener al menos 6 caracteres.';
  end if;

  select rc.user_id, rc.code_hash into v_user_id, v_hash
  from public.recovery_codes rc
  join auth.users u on u.id = rc.user_id
  where lower(u.email) = lower(trim(p_email))
  limit 1;

  if v_user_id is null or v_hash is null then
    return false;
  end if;

  -- constant-ish time: se compara siempre, no solo cuando no coincide
  if v_hash <> encode(extensions.digest(upper(trim(p_code)), 'sha256'), 'hex') then
    return false;
  end if;

  update auth.users
     set encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
         updated_at = now()
   where id = v_user_id;

  -- Cierra las sesiones abiertas: la contraseña nueva serve para entrar de nuevo.
  delete from auth.sessions where user_id = v_user_id;

  return true;
end;
$$;

revoke all on function public.reset_password_with_code(text, text, text) from public;
grant execute on function public.reset_password_with_code(text, text, text) to anon, authenticated;

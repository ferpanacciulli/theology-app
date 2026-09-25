-- Ejecutar en Supabase -> SQL Editor.
-- Guarda SOLO configuración liviana por usuario (posición de lectura y
-- disposición de paneles). Los módulos importados (Biblias, comentarios,
-- diccionarios) NUNCA se guardan acá: quedan solo en cada dispositivo.

create table if not exists public.user_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  position   jsonb,
  layout     jsonb,
  updated_at timestamptz not null default now()
);

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

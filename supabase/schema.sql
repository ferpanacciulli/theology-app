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

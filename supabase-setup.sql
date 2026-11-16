-- Ejecuta este script en el SQL Editor de tu proyecto en Supabase
-- 1. Crear tabla para los escritos y videos del blog
create table if not exists public.blog_posts (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  kind text not null check (kind in ('escrito', 'video_archivo', 'video_instagram', 'video_youtube')),
  summary text not null default '',
  content text not null default '',
  media_url text not null default '',
  cover_url text not null default '',
  is_paid boolean not null default false,
  price integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

-- Si ya habías creado la tabla antes, estas líneas la actualizan sin perder datos:
alter table public.blog_posts drop constraint if exists blog_posts_kind_check;
alter table public.blog_posts add constraint blog_posts_kind_check
  check (kind in ('escrito', 'video_archivo', 'video_instagram', 'video_youtube'));
alter table public.blog_posts add column if not exists is_paid boolean not null default false;
alter table public.blog_posts add column if not exists price integer not null default 0;

-- 2. Habilitar seguridad por filas (RLS)
alter table public.blog_posts enable row level security;

-- Cualquiera puede leer las publicaciones marcadas como publicadas
create policy "Publicacion visible para todos"
  on public.blog_posts for select
  using (published = true);

-- Solo usuarios autenticados (Karen en admin.html) pueden ver borradores, crear, editar y borrar
create policy "Admin lectura total"
  on public.blog_posts for select
  to authenticated
  using (true);

create policy "Admin crear"
  on public.blog_posts for insert
  to authenticated
  with check (true);

create policy "Admin actualizar"
  on public.blog_posts for update
  to authenticated
  using (true)
  with check (true);

create policy "Admin eliminar"
  on public.blog_posts for delete
  to authenticated
  using (true);

-- 3. Crear bucket público para videos e imágenes propias
insert into storage.buckets (id, name, public)
values ('blog-media', 'blog-media', true)
on conflict (id) do nothing;

-- Políticas del bucket blog-media
create policy "Lectura publica de media"
  on storage.objects for select
  using (bucket_id = 'blog-media');

create policy "Admin sube media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'blog-media');

create policy "Admin elimina media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'blog-media');

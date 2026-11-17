-- ENDURECIMIENTO DE SEGURIDAD (ejecutar en Supabase -> SQL Editor, después de supabase-setup.sql)
-- Es seguro ejecutarlo varias veces.

-- 1. Tabla de administradores: solo estos correos podrán escribir.
create table if not exists public.admin_users (
  email text primary key
);
alter table public.admin_users enable row level security;
-- Sin políticas: nadie puede leerla desde la web; solo la usa la función is_admin().

-- >>> CAMBIA ESTE CORREO por el de Karen (el mismo que creaste en Authentication -> Users) <<<
insert into public.admin_users (email) values ('CORREO_DE_KAREN@ejemplo.com')
on conflict do nothing;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.admin_users
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- 2. Políticas de blog_posts: solo admin escribe/lee borradores.
drop policy if exists "Admin lectura total" on public.blog_posts;
drop policy if exists "Admin crear" on public.blog_posts;
drop policy if exists "Admin actualizar" on public.blog_posts;
drop policy if exists "Admin eliminar" on public.blog_posts;

create policy "Admin lectura total" on public.blog_posts
  for select to authenticated using (public.is_admin());
create policy "Admin crear" on public.blog_posts
  for insert to authenticated with check (public.is_admin());
create policy "Admin actualizar" on public.blog_posts
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admin eliminar" on public.blog_posts
  for delete to authenticated using (public.is_admin());

-- 3. Bucket: límites de tamaño y tipos permitidos (50 MB; imágenes y video).
update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array[
      'image/jpeg','image/png','image/webp','image/gif',
      'video/mp4','video/quicktime','video/webm'
    ]
where id = 'blog-media';

-- 4. Políticas del storage: solo admin sube/borra; se quita la lectura/listado abierto
--    (un bucket público sirve los archivos por URL sin necesitar esa política).
drop policy if exists "Lectura publica de media" on storage.objects;
drop policy if exists "Admin sube media" on storage.objects;
drop policy if exists "Admin elimina media" on storage.objects;

create policy "Admin sube media" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'blog-media' and public.is_admin());
create policy "Admin elimina media" on storage.objects
  for delete to authenticated
  using (bucket_id = 'blog-media' and public.is_admin());

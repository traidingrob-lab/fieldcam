-- =============================================
-- FIELDCAM — Migración 001
-- Ejecuta esto UNA VEZ en: supabase.com > tu proyecto > SQL Editor
-- =============================================

-- Falta la columna email en team_members (no existe forma de leer el email
-- real de un colaborador sin esto, ya que auth.users no es accesible desde
-- el cliente). Se llena al invitar, en api/invite-member.js.
alter table public.team_members add column if not exists email text;

-- Fix: la policy original de team_members solo dejaba ver tu propia fila
-- (auth.uid() = user_id), por lo que el dueño de la cuenta nunca podía ver
-- la lista de su equipo. Ahora se puede ver por org_id (el dueño) o por
-- user_id (el propio miembro viendo su fila).
drop policy if exists "Users see own team" on public.team_members;

create policy "Users see own team" on public.team_members
  for select using (auth.uid() = org_id or auth.uid() = user_id);

create policy "Org owner manages team" on public.team_members
  for insert with check (auth.uid() = org_id);

create policy "Org owner updates team" on public.team_members
  for update using (auth.uid() = org_id);

create policy "Org owner deletes team" on public.team_members
  for delete using (auth.uid() = org_id);

-- Fix: no existía policy de DELETE para el bucket 'photos' en storage,
-- así que nunca se podía borrar el archivo real al eliminar una foto.
-- Se limita a la carpeta del propio usuario (los archivos se suben como
-- "<user_id>/archivo.jpg", ver PhotosPage.tsx).
create policy "Users delete own photos in storage" on storage.objects
  for delete using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

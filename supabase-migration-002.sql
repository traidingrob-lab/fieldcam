-- =============================================
-- FIELDCAM — Migración 002
-- Ejecuta esto UNA VEZ en: supabase.com > tu proyecto > SQL Editor
-- =============================================

-- El campo "Tipo de trabajo" del formulario de proyecto era decorativo:
-- no existía columna en la tabla para guardarlo. Se agrega aquí.
alter table public.projects add column if not exists work_type text;

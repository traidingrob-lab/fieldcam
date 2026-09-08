-- =============================================
-- FIELDCAM — Esquema completo de Supabase
-- Ejecuta esto en: supabase.com > SQL Editor
-- =============================================

-- Habilitar extensiones
create extension if not exists "uuid-ossp";
create extension if not exists "postgis";

-- =============================================
-- TABLA: projects
-- =============================================
create table public.projects (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  status text default 'active' check (status in ('active','complete','pending','archived')),
  address text,
  city text,
  lat double precision,
  lng double precision,
  cover_photo_url text,
  owner_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================
-- TABLA: photos
-- =============================================
create table public.photos (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  url text not null,
  thumbnail_url text,
  caption text,
  tags text[] default '{}',
  lat double precision,
  lng double precision,
  taken_at timestamptz default now(),
  created_at timestamptz default now(),
  ai_description text
);

-- =============================================
-- TABLA: checklists
-- =============================================
create table public.checklists (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  created_by uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now()
);

create table public.checklist_items (
  id uuid default uuid_generate_v4() primary key,
  checklist_id uuid references public.checklists(id) on delete cascade not null,
  text text not null,
  completed boolean default false,
  assigned_to uuid references auth.users(id) on delete set null,
  completed_at timestamptz,
  order_index integer default 0
);

-- =============================================
-- TABLA: team_members
-- =============================================
create table public.team_members (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  org_id uuid not null,
  role text default 'technician' check (role in ('admin','supervisor','technician','client')),
  full_name text not null,
  avatar_url text,
  status text default 'active' check (status in ('active','away','offline')),
  created_at timestamptz default now()
);

-- =============================================
-- TABLA: invoices
-- =============================================
create table public.invoices (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  client_name text not null,
  amount numeric(12,2) not null,
  status text default 'pending' check (status in ('paid','pending','overdue')),
  due_date date,
  stripe_invoice_id text,
  created_at timestamptz default now()
);

-- =============================================
-- TABLA: reports
-- =============================================
create table public.reports (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  type text default 'photo' check (type in ('photo','ai_summary','client_gallery','inspection')),
  pdf_url text,
  share_token text unique default encode(gen_random_bytes(16), 'hex'),
  content text,
  created_by uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now()
);

-- =============================================
-- TABLA: annotations (en fotos)
-- =============================================
create table public.annotations (
  id uuid default uuid_generate_v4() primary key,
  photo_id uuid references public.photos(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text default 'comment' check (type in ('comment','arrow','box','text')),
  content text,
  x_pct double precision,
  y_pct double precision,
  created_at timestamptz default now()
);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================
alter table public.projects enable row level security;
alter table public.photos enable row level security;
alter table public.checklists enable row level security;
alter table public.checklist_items enable row level security;
alter table public.team_members enable row level security;
alter table public.invoices enable row level security;
alter table public.reports enable row level security;
alter table public.annotations enable row level security;

-- Policies: usuarios ven solo sus propios datos
create policy "Users see own projects" on public.projects
  for all using (auth.uid() = owner_id);

create policy "Users see own photos" on public.photos
  for all using (auth.uid() = user_id);

create policy "Users manage own checklists" on public.checklists
  for all using (auth.uid() = created_by);

create policy "Users see checklist items" on public.checklist_items
  for all using (
    exists (
      select 1 from public.checklists c
      where c.id = checklist_id and c.created_by = auth.uid()
    )
  );

create policy "Users see own team" on public.team_members
  for all using (auth.uid() = user_id);

create policy "Users see own invoices" on public.invoices
  for all using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );

create policy "Users manage own reports" on public.reports
  for all using (auth.uid() = created_by);

create policy "Users see own annotations" on public.annotations
  for all using (auth.uid() = user_id);

-- =============================================
-- STORAGE BUCKETS
-- =============================================
insert into storage.buckets (id, name, public) values ('photos', 'photos', true);
insert into storage.buckets (id, name, public) values ('reports', 'reports', false);
insert into storage.buckets (id, name, public) values ('signatures', 'signatures', false);

create policy "Authenticated users upload photos" on storage.objects
  for insert with check (bucket_id = 'photos' and auth.role() = 'authenticated');

create policy "Public read photos" on storage.objects
  for select using (bucket_id = 'photos');

-- =============================================
-- FUNCIÓN: updated_at automático
-- =============================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_projects_updated
  before update on public.projects
  for each row execute procedure public.handle_updated_at();

-- =============================================
-- DATOS DE EJEMPLO (opcional)
-- =============================================
-- Descomenta para cargar datos de prueba:
/*
insert into public.projects (name, description, status, city, owner_id)
values
  ('Remodelación López', 'Remodelación completa de cocina y sala', 'active', 'Guadalajara', auth.uid()),
  ('Techo Martínez', 'Impermeabilización de techo plano', 'complete', 'CDMX', auth.uid()),
  ('Plomería Sánchez', 'Instalación de sistema de agua caliente', 'pending', 'Monterrey', auth.uid());
*/

-- Bolsillo · esquema inicial (Fase 2)
-- Cada tabla tiene user_id y Row Level Security: cada usuario solo ve y modifica sus propios datos.
-- Los ids son texto porque la app los genera (UUID, o "regla@mes" para los fijos generados),
-- y la clave primaria es (user_id, id) para que no choquen entre usuarios.

-- Perfil: moneda principal y presupuesto mensual
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  currency text not null default 'ARS' check (currency in ('ARS', 'USD', 'EUR', 'BRL', 'CLP', 'UYU')),
  budget numeric(14, 2) not null default 0 check (budget >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cards (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (char_length(id) between 1 and 64),
  name text not null check (char_length(name) between 1 and 30),
  closing_day smallint not null check (closing_day between 1 and 31),
  due_day smallint not null check (due_day between 1 and 31),
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.recurring_rules (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (char_length(id) between 1 and 64),
  kind text not null check (kind in ('gasto', 'ingreso')),
  amount numeric(14, 2) not null check (amount > 0),
  category text not null check (char_length(category) between 1 and 40),
  description text not null check (char_length(description) between 1 and 80),
  method text not null check (method in ('efectivo', 'debito', 'credito', 'transferencia')),
  day_of_month smallint not null check (day_of_month between 1 and 31),
  start_month text not null check (start_month ~ '^\d{4}-\d{2}$'),
  end_month text check (end_month ~ '^\d{4}-\d{2}$'),
  skipped_months text[] not null default '{}',
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.movements (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (char_length(id) between 1 and 80),
  kind text not null check (kind in ('gasto', 'ingreso')),
  amount numeric(14, 2) not null check (amount > 0),
  category text not null check (char_length(category) between 1 and 40),
  date date not null,
  description text not null check (char_length(description) between 1 and 80),
  method text not null check (method in ('efectivo', 'debito', 'credito', 'transferencia')),
  installments smallint check (installments between 1 and 24),
  recurring_id text,
  card_id text,
  payment_start date,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists movements_user_date_idx on public.movements (user_id, date);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.cards enable row level security;
alter table public.recurring_rules enable row level security;
alter table public.movements enable row level security;

drop policy if exists "perfil propio: leer" on public.profiles;
drop policy if exists "perfil propio: actualizar" on public.profiles;
drop policy if exists "perfil propio: crear" on public.profiles;
create policy "perfil propio: leer" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "perfil propio: crear" on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy "perfil propio: actualizar" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

do $$
declare t text;
begin
  foreach t in array array['cards', 'recurring_rules', 'movements'] loop
    execute format('drop policy if exists "datos propios" on public.%I', t);
    execute format(
      'create policy "datos propios" on public.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t
    );
  end loop;
end $$;

-- Permisos de la API: solo usuarios con sesión; los anónimos no acceden a nada
revoke all on public.profiles, public.cards, public.recurring_rules, public.movements from anon;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.cards, public.recurring_rules, public.movements to authenticated;

-- Crea el perfil automáticamente al registrarse
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mantiene updated_at del perfil
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

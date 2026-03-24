-- profiles
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now()
);

-- locations
create table public.locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

-- hives
create table public.hives (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  is_public boolean not null default false,
  status text not null default 'active' check (status in ('active','dead','sold')),
  species text,
  installed_at date,
  created_at timestamptz not null default now()
);

-- harvests
create table public.harvests (
  id uuid primary key default gen_random_uuid(),
  hive_id uuid not null references public.hives on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  harvested_at date not null default current_date,
  weight_kg numeric(8,3) not null,
  notes text,
  created_at timestamptz not null default now()
);

-- inspections
create table public.inspections (
  id uuid primary key default gen_random_uuid(),
  hive_id uuid not null references public.hives on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  inspected_at timestamptz not null default now(),
  queen_seen boolean,
  brood_pattern text check (brood_pattern in ('good','fair','poor')),
  population text check (population in ('strong','medium','weak')),
  temperament text check (temperament in ('calm','moderate','aggressive')),
  honey_stores text check (honey_stores in ('full','partial','low')),
  notes text,
  next_action text,
  created_at timestamptz not null default now()
);

-- inspection_photos
create table public.inspection_photos (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

-- notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  hive_id uuid references public.hives on delete cascade,
  type text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

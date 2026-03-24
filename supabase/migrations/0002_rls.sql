alter table public.profiles enable row level security;
alter table public.locations enable row level security;
alter table public.hives enable row level security;
alter table public.harvests enable row level security;
alter table public.inspections enable row level security;
alter table public.inspection_photos enable row level security;
alter table public.notifications enable row level security;

-- profiles
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_insert" on public.profiles for insert with check (id = auth.uid());
create policy "profiles_update" on public.profiles for update using (id = auth.uid());

-- locations
create policy "locations_all" on public.locations for all using (user_id = auth.uid());

-- hives
create policy "hives_select" on public.hives for select
  using (user_id = auth.uid() or is_public = true);
create policy "hives_insert" on public.hives for insert with check (user_id = auth.uid());
create policy "hives_update" on public.hives for update using (user_id = auth.uid());
create policy "hives_delete" on public.hives for delete using (user_id = auth.uid());

-- harvests
create policy "harvests_select" on public.harvests for select
  using (exists (
    select 1 from public.hives h
    where h.id = hive_id and (h.user_id = auth.uid() or h.is_public = true)
  ));
create policy "harvests_insert" on public.harvests for insert with check (user_id = auth.uid());
create policy "harvests_update" on public.harvests for update using (user_id = auth.uid());
create policy "harvests_delete" on public.harvests for delete using (user_id = auth.uid());

-- inspections
create policy "inspections_select" on public.inspections for select
  using (exists (
    select 1 from public.hives h
    where h.id = hive_id and (h.user_id = auth.uid() or h.is_public = true)
  ));
create policy "inspections_insert" on public.inspections for insert with check (user_id = auth.uid());
create policy "inspections_update" on public.inspections for update using (user_id = auth.uid());
create policy "inspections_delete" on public.inspections for delete using (user_id = auth.uid());

-- inspection_photos
create policy "photos_select" on public.inspection_photos for select
  using (exists (
    select 1 from public.inspections i
    join public.hives h on h.id = i.hive_id
    where i.id = inspection_id and (h.user_id = auth.uid() or h.is_public = true)
  ));
create policy "photos_insert" on public.inspection_photos for insert with check (user_id = auth.uid());
create policy "photos_delete" on public.inspection_photos for delete using (user_id = auth.uid());

-- notifications
create policy "notifications_select" on public.notifications for select using (user_id = auth.uid());
create policy "notifications_update" on public.notifications for update using (user_id = auth.uid());

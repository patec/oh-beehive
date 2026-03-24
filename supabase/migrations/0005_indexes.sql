-- Indexes on foreign key columns for RLS performance
create index idx_locations_user_id on public.locations(user_id);

create index idx_hives_location_id on public.hives(location_id);
create index idx_hives_user_id on public.hives(user_id);

create index idx_harvests_hive_id on public.harvests(hive_id);
create index idx_harvests_user_id on public.harvests(user_id);

create index idx_inspections_hive_id on public.inspections(hive_id);
create index idx_inspections_user_id on public.inspections(user_id);

create index idx_inspection_photos_inspection_id on public.inspection_photos(inspection_id);
create index idx_inspection_photos_user_id on public.inspection_photos(user_id);

create index idx_notifications_user_id on public.notifications(user_id);
create index idx_notifications_hive_id on public.notifications(hive_id);

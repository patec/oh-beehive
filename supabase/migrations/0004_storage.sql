-- Create private storage bucket for inspection photos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'inspection-photos',
  'inspection-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/heic']
)
on conflict (id) do nothing;

-- Storage RLS: allow authenticated users to upload to their own folder
create policy "photos_upload" on storage.objects for insert
  to authenticated
  with check (bucket_id = 'inspection-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Storage RLS: allow authenticated users to read their own photos
create policy "photos_read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'inspection-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

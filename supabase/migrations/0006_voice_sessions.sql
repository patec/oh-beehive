create table voice_sessions (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users(id) on delete cascade,
  audio_path       text        not null,
  duration_seconds integer,
  transcript       text,
  parsed_data      jsonb,
  status           text        not null default 'processing'
                               check (status in ('processing', 'review', 'saved', 'failed')),
  error            text,
  created_at       timestamptz not null default now()
);

alter table voice_sessions enable row level security;

create policy "users manage own voice sessions"
  on voice_sessions for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index voice_sessions_user_id_idx on voice_sessions (user_id);
create index voice_sessions_status_idx  on voice_sessions (user_id, status);

-- Storage bucket for voice recordings (private, max 150 MB per file)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'voice-recordings',
  'voice-recordings',
  false,
  157286400,
  array['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/x-m4a']
)
on conflict (id) do nothing;

create policy "users upload own voice recordings"
  on storage.objects for insert
  with check (bucket_id = 'voice-recordings' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "users read own voice recordings"
  on storage.objects for select
  using (bucket_id = 'voice-recordings' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "users delete own voice recordings"
  on storage.objects for delete
  using (bucket_id = 'voice-recordings' and auth.uid()::text = (storage.foldername(name))[1]);

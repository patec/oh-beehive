# Voice Inspection Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record long-form voice walkthroughs of an apiary, transcribe them, use AI to parse inspection data per hive, present a review UI to confirm/edit, and bulk-save as inspections.

**Architecture:** Browser `MediaRecorder` → Supabase Storage → Whisper (transcription) → Claude (structured parsing) → review/edit UI → bulk insert inspections.

**Tech Stack:** Next.js 16 App Router, Supabase (DB + Storage), OpenAI Whisper API, Anthropic Claude API (`claude-haiku-4-5`), `@dnd-kit/core` for drag-to-assign on mobile.

---

## File Map

**New files:**
- `supabase/migrations/0006_voice_sessions.sql` — table + RLS + storage bucket
- `src/lib/actions/voice.ts` — server actions (create session, save inspections, get audio URL)
- `src/app/api/voice/process/route.ts` — API route: download audio → Whisper → Claude → update session
- `src/components/voice/record-button.tsx` — floating mic button (mobile only), opens overlay
- `src/components/voice/recording-overlay.tsx` — full-screen recording UI with timer + stop
- `src/app/(protected)/voice-sessions/[sessionId]/review/page.tsx` — server shell, fetches session + hives
- `src/components/voice/review-client.tsx` — interactive review (dnd-kit, editable cards, save)

**Modified files:**
- `src/lib/types.ts` — add `VoiceSession`, `ParsedInspection` types
- `src/components/layout/app-shell.tsx` — add `<RecordButton>` inside mobile div
- `.env.example` — add `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`

---

## ParsedInspection shape (Claude output per hive segment)

```typescript
type ParsedInspection = {
  hiveId: string | null          // matched to actual hive.id; null = unassigned
  hiveName: string               // what was said (for display)
  transcriptExcerpt: string      // relevant transcript chunk
  queen_seen: boolean | null
  brood_pattern: 'good' | 'fair' | 'poor' | null
  population: 'strong' | 'medium' | 'weak' | null
  temperament: 'calm' | 'moderate' | 'aggressive' | null
  honey_stores: 'full' | 'partial' | 'low' | null
  notes: string | null
  next_action: string | null
}
```

---

## Task 1: Install packages and update env example

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `.env.example`

- [ ] **Step 1: Install AI and dnd-kit packages**

```bash
npm install openai @anthropic-ai/sdk @dnd-kit/core @dnd-kit/utilities
```

Expected: packages appear in `node_modules/`, `package.json` updated.

- [ ] **Step 2: Add env vars to .env.example**

Append to `.env.example`:
```
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

- [ ] **Step 3: Verify imports work**

```bash
node -e "require('./node_modules/openai'); require('./node_modules/@anthropic-ai/sdk'); console.log('ok')"
```

Expected: prints `ok`.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "Add openai, anthropic SDK, and dnd-kit packages for voice inspection."
```

---

## Task 2: DB migration — voice_sessions table + storage bucket

**Files:**
- Create: `supabase/migrations/0006_voice_sessions.sql`

- [ ] **Step 1: Write migration**

```sql
-- supabase/migrations/0006_voice_sessions.sql

create table voice_sessions (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users(id) on delete cascade,
  audio_path    text        not null,
  duration_seconds integer,
  transcript    text,
  parsed_data   jsonb,
  status        text        not null default 'processing'
                            check (status in ('processing', 'review', 'saved', 'failed')),
  error         text,
  created_at    timestamptz not null default now()
);

alter table voice_sessions enable row level security;

create policy "users manage own voice sessions"
  on voice_sessions for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index voice_sessions_user_id_idx on voice_sessions (user_id);
create index voice_sessions_status_idx  on voice_sessions (user_id, status);

-- Storage bucket for voice recordings (private)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'voice-recordings',
  'voice-recordings',
  false,
  157286400,   -- 150 MB
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
```

- [ ] **Step 2: Apply migration locally**

```bash
npx supabase db push
```

Expected: migration applied, no errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0006_voice_sessions.sql
git commit -m "Add voice_sessions table and voice-recordings storage bucket."
```

---

## Task 3: Add VoiceSession types

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Add types at the end of types.ts**

```typescript
export type VoiceSessionStatus = 'processing' | 'review' | 'saved' | 'failed'

export type ParsedInspection = {
  hiveId: string | null
  hiveName: string
  transcriptExcerpt: string
  queen_seen: boolean | null
  brood_pattern: BroodPattern | null
  population: Population | null
  temperament: Temperament | null
  honey_stores: HoneyStores | null
  notes: string | null
  next_action: string | null
}

export type VoiceSession = {
  id: string
  user_id: string
  audio_path: string
  duration_seconds: number | null
  transcript: string | null
  parsed_data: ParsedInspection[] | null
  status: VoiceSessionStatus
  error: string | null
  created_at: string
}
export type VoiceSessionInsert = Pick<VoiceSession, 'user_id' | 'audio_path'> & {
  duration_seconds?: number | null
}
```

- [ ] **Step 2: Check TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "Add VoiceSession and ParsedInspection types."
```

---

## Task 4: Voice server actions

**Files:**
- Create: `src/lib/actions/voice.ts`

- [ ] **Step 1: Write server actions**

```typescript
'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ParsedInspection, VoiceSession, VoiceSessionInsert, InspectionInsert } from '@/lib/types'

export async function createVoiceSession(audioPath: string, durationSeconds: number | null): Promise<{ sessionId: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const insert: VoiceSessionInsert = { user_id: user.id, audio_path: audioPath, duration_seconds: durationSeconds }
  const { data, error } = await (supabase.from('voice_sessions').insert(insert).select('id').single() as unknown as Promise<{ data: { id: string } | null; error: unknown }>)
  if (error || !data) return { error: 'Failed to create session' }
  return { sessionId: data.id }
}

export async function getVoiceSession(sessionId: string): Promise<VoiceSession | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await (supabase.from('voice_sessions').select('*').eq('id', sessionId).eq('user_id', user.id).single() as unknown as Promise<{ data: VoiceSession | null }>)
  return data
}

export async function getVoiceSessionAudioUrl(audioPath: string): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase.storage.from('voice-recordings').createSignedUrl(audioPath, 3600)
  return data?.signedUrl ?? null
}

export async function saveVoiceSession(sessionId: string, inspections: ParsedInspection[]): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: session } = await (supabase.from('voice_sessions').select('id').eq('id', sessionId).eq('user_id', user.id).single() as unknown as Promise<{ data: { id: string } | null }>)
  if (!session) return { error: 'Session not found' }

  const rows: InspectionInsert[] = inspections
    .filter(i => i.hiveId !== null)
    .map(i => ({
      hive_id: i.hiveId!,
      queen_seen: i.queen_seen ?? undefined,
      brood_pattern: i.brood_pattern ?? undefined,
      population: i.population ?? undefined,
      temperament: i.temperament ?? undefined,
      honey_stores: i.honey_stores ?? undefined,
      notes: i.notes ?? undefined,
      next_action: i.next_action ?? undefined,
    }))

  if (rows.length > 0) {
    const { error } = await supabase.from('inspections').insert(rows)
    if (error) return { error: 'Failed to save inspections' }
  }

  await supabase.from('voice_sessions').update({ status: 'saved' }).eq('id', sessionId)
  revalidatePath('/hives', 'layout')
  return {}
}
```

- [ ] **Step 2: Check TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/voice.ts
git commit -m "Add voice session server actions."
```

---

## Task 5: Voice processing API route (Whisper + Claude)

**Files:**
- Create: `src/app/api/voice/process/route.ts`

This route downloads the audio from Supabase storage, transcribes with Whisper, parses with Claude, and updates the session. It has a 120s timeout for long audio.

- [ ] **Step 1: Write the route**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import type { ParsedInspection, Hive } from '@/lib/types'

export const maxDuration = 120

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sessionId } = await req.json() as { sessionId: string }

  const { data: session } = await (supabase
    .from('voice_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single() as unknown as Promise<{ data: { id: string; audio_path: string } | null }>)

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  try {
    // 1. Get signed URL and download audio
    const { data: urlData } = await supabase.storage
      .from('voice-recordings')
      .createSignedUrl(session.audio_path, 300)
    if (!urlData?.signedUrl) throw new Error('Could not get audio URL')

    const audioResponse = await fetch(urlData.signedUrl)
    if (!audioResponse.ok) throw new Error('Could not download audio')
    const audioBuffer = await audioResponse.arrayBuffer()

    // Determine file extension from audio_path
    const ext = session.audio_path.split('.').pop() ?? 'webm'
    const mimeMap: Record<string, string> = {
      webm: 'audio/webm', mp4: 'audio/mp4', m4a: 'audio/x-m4a',
      wav: 'audio/wav', mp3: 'audio/mpeg',
    }
    const mimeType = mimeMap[ext] ?? 'audio/webm'
    const audioFile = new File([audioBuffer], `recording.${ext}`, { type: mimeType })

    // 2. Transcribe with Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en',
    })
    const transcript = transcription.text

    await supabase.from('voice_sessions').update({ transcript }).eq('id', sessionId)

    // 3. Fetch user's hives for Claude context
    const { data: hives } = await (supabase
      .from('hives')
      .select('id, name')
      .eq('user_id', user.id)
      .eq('status', 'active') as unknown as Promise<{ data: Pick<Hive, 'id' | 'name'>[] | null }>)

    const hiveList = (hives ?? []).map(h => `{ "id": "${h.id}", "name": "${h.name}" }`).join(', ')

    // 4. Parse with Claude
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: `You are parsing a beekeeper's voice notes from an apiary walkthrough.

The beekeeper's active hives are: [${hiveList}]

Parse the transcript and return a JSON array of inspection objects — one per hive mentioned.
For each hive segment return exactly this shape:
{
  "hiveId": "<id from the hive list, or null if unrecognised>",
  "hiveName": "<name as spoken>",
  "transcriptExcerpt": "<the relevant portion of transcript>",
  "queen_seen": <true|false|null>,
  "brood_pattern": <"good"|"fair"|"poor"|null>,
  "population": <"strong"|"medium"|"weak"|null>,
  "temperament": <"calm"|"moderate"|"aggressive"|null>,
  "honey_stores": <"full"|"partial"|"low"|null>,
  "notes": "<free text observations, or null>",
  "next_action": "<what to do next visit, or null>"
}

Match hive names fuzzily (e.g. "the yellow one" might be "Yellow"). If a segment can't be matched to a hive, set hiveId to null.
Return ONLY valid JSON array — no markdown, no explanation.`,
      messages: [{ role: 'user', content: transcript }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : '[]'
    let parsed: ParsedInspection[]
    try {
      parsed = JSON.parse(raw) as ParsedInspection[]
    } catch {
      parsed = []
    }

    await supabase
      .from('voice_sessions')
      .update({ parsed_data: parsed as unknown as Record<string, unknown>[], status: 'review' })
      .eq('id', sessionId)

    return NextResponse.json({ status: 'review', sessionId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Processing failed'
    await supabase.from('voice_sessions').update({ status: 'failed', error: message }).eq('id', sessionId)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Check TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/voice/process/route.ts
git commit -m "Add voice processing API route (Whisper transcription + Claude parsing)."
```

---

## Task 6: Recording UI — overlay and floating button

**Files:**
- Create: `src/components/voice/recording-overlay.tsx`
- Create: `src/components/voice/record-button.tsx`

The recording overlay handles the entire flow: record → upload → process → redirect.

- [ ] **Step 1: Write the recording overlay**

```typescript
// src/components/voice/recording-overlay.tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mic, Square, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { createVoiceSession } from '@/lib/actions/voice'

type Phase = 'idle' | 'recording' | 'uploading' | 'processing' | 'error'

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export function RecordingOverlay({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)

  useEffect(() => {
    startRecording()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/webm'

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      chunksRef.current = []
      startTimeRef.current = Date.now()

      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.start(1000)
      setPhase('recording')

      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 1000)
    } catch {
      setErrorMsg('Microphone access denied. Please allow microphone access and try again.')
      setPhase('error')
    }
  }

  async function stopRecording() {
    const recorder = mediaRecorderRef.current
    if (!recorder) return

    await new Promise<void>(resolve => {
      recorder.onstop = () => resolve()
      recorder.stop()
      recorder.stream.getTracks().forEach(t => t.stop())
    })

    if (timerRef.current) clearInterval(timerRef.current)
    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000)

    const mimeType = recorder.mimeType
    const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm'
    const blob = new Blob(chunksRef.current, { type: mimeType })

    setPhase('uploading')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const filename = `${user.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('voice-recordings')
        .upload(filename, blob, { contentType: mimeType })
      if (uploadError) throw new Error(uploadError.message)

      const result = await createVoiceSession(filename, duration)
      if ('error' in result) throw new Error(result.error)
      const { sessionId } = result

      setPhase('processing')
      const res = await fetch('/api/voice/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? 'Processing failed')
      }

      router.push(`/voice-sessions/${sessionId}/review`)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
      setPhase('error')
    }
  }

  const PHASE_LABEL: Record<Phase, string> = {
    idle: 'Starting...',
    recording: 'Recording',
    uploading: 'Uploading...',
    processing: 'Transcribing & analysing...',
    error: 'Something went wrong',
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 text-white">
      <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10">
        <X size={24} />
      </button>

      <div className="flex flex-col items-center gap-8">
        {phase === 'recording' && (
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
              <Mic size={40} />
            </div>
            <div className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
          </div>
        )}
        {(phase === 'uploading' || phase === 'processing') && (
          <div className="w-24 h-24 rounded-full bg-amber-500 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {phase === 'error' && (
          <div className="w-24 h-24 rounded-full bg-red-800 flex items-center justify-center text-4xl">!</div>
        )}

        <div className="text-center space-y-1">
          <p className="text-lg font-bold">{PHASE_LABEL[phase]}</p>
          {phase === 'recording' && (
            <p className="text-4xl font-black tabular-nums text-amber-400">{formatDuration(elapsed)}</p>
          )}
          {phase === 'error' && (
            <p className="text-sm text-red-300 max-w-xs text-center">{errorMsg}</p>
          )}
          {phase === 'processing' && (
            <p className="text-sm text-white/60">This can take up to a minute for long recordings</p>
          )}
        </div>

        {phase === 'recording' && (
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 bg-white text-black font-bold px-8 py-4 rounded-full hover:bg-amber-100 transition-colors text-lg"
          >
            <Square size={20} fill="currentColor" /> Stop Recording
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write the floating record button**

```typescript
// src/components/voice/record-button.tsx
'use client'
import { useState } from 'react'
import { Mic } from 'lucide-react'
import { RecordingOverlay } from './recording-overlay'

export function RecordButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-amber-500 text-white shadow-lg hover:bg-amber-600 active:scale-95 transition-all flex items-center justify-center md:hidden"
        aria-label="Start voice inspection"
      >
        <Mic size={24} />
      </button>
      {open && <RecordingOverlay onClose={() => setOpen(false)} />}
    </>
  )
}
```

- [ ] **Step 3: Check TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/voice/recording-overlay.tsx src/components/voice/record-button.tsx
git commit -m "Add voice recording overlay and floating mic button."
```

---

## Task 7: Add RecordButton to AppShell

**Files:**
- Modify: `src/components/layout/app-shell.tsx`

- [ ] **Step 1: Import and render RecordButton**

Current `app-shell.tsx`:
```typescript
import { MobileNav } from './mobile-nav'
import { DesktopSidebar } from './desktop-sidebar'

export function AppShell({ children, unreadCount }: { children: React.ReactNode; unreadCount: number }) {
  return (
    <div className="flex min-h-screen">
      <DesktopSidebar unreadCount={unreadCount} />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <div className="md:hidden">
        <MobileNav unreadCount={unreadCount} />
      </div>
    </div>
  )
}
```

Updated:
```typescript
import { MobileNav } from './mobile-nav'
import { DesktopSidebar } from './desktop-sidebar'
import { RecordButton } from '@/components/voice/record-button'

export function AppShell({ children, unreadCount }: { children: React.ReactNode; unreadCount: number }) {
  return (
    <div className="flex min-h-screen">
      <DesktopSidebar unreadCount={unreadCount} />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <div className="md:hidden">
        <MobileNav unreadCount={unreadCount} />
        <RecordButton />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Check TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/app-shell.tsx
git commit -m "Add voice RecordButton to mobile app shell."
```

---

## Task 8: Review page

**Files:**
- Create: `src/app/(protected)/voice-sessions/[sessionId]/review/page.tsx`
- Create: `src/components/voice/review-client.tsx`

The server page fetches the session + user hives. The client component handles the interactive review with dnd-kit drag-to-assign.

- [ ] **Step 1: Write the server page**

```typescript
// src/app/(protected)/voice-sessions/[sessionId]/review/page.tsx
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getVoiceSession, getVoiceSessionAudioUrl } from '@/lib/actions/voice'
import { ReviewClient } from '@/components/voice/review-client'
import type { Hive } from '@/lib/types'

export default async function VoiceSessionReviewPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params
  const session = await getVoiceSession(sessionId)

  if (!session) notFound()
  if (session.status === 'saved') redirect('/hives')
  if (session.status === 'failed') {
    return (
      <div className="p-6 max-w-lg mx-auto text-center space-y-4">
        <p className="text-2xl font-black text-red-600">Processing failed</p>
        <p className="text-muted-foreground">{session.error ?? 'Unknown error'}</p>
      </div>
    )
  }
  if (session.status === 'processing') {
    return (
      <div className="p-6 max-w-lg mx-auto text-center space-y-4">
        <p className="text-2xl font-black text-amber-600">Still processing...</p>
        <p className="text-muted-foreground">Refresh in a moment.</p>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: hivesRaw } = await (supabase.from('hives').select('id, name, status').eq('user_id', user!.id).eq('status', 'active') as unknown as Promise<{ data: Pick<Hive, 'id' | 'name' | 'status'>[] | null }>)
  const hives = hivesRaw ?? []

  const audioUrl = await getVoiceSessionAudioUrl(session.audio_path)

  return (
    <ReviewClient
      session={session}
      hives={hives}
      audioUrl={audioUrl}
    />
  )
}
```

- [ ] **Step 2: Write the interactive review client**

```typescript
// src/components/voice/review-client.tsx
'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { DndContext, DragEndEvent, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { saveVoiceSession } from '@/lib/actions/voice'
import { Button } from '@/components/ui/button'
import { GripVertical, Check } from 'lucide-react'
import type { VoiceSession, ParsedInspection } from '@/lib/types'

type Hive = { id: string; name: string }

function DraggableSegment({ item, index }: { item: ParsedInspection; index: number }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `unassigned-${index}` })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.5 : 1 }}
      className="bg-card border rounded-xl p-3 space-y-1 shadow-sm cursor-grab active:cursor-grabbing touch-none"
      {...listeners}
      {...attributes}
    >
      <div className="flex items-start gap-2">
        <GripVertical size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
        <div className="space-y-1 min-w-0">
          <p className="text-xs font-bold text-amber-700">{item.hiveName || 'Unidentified hive'}</p>
          <p className="text-xs text-muted-foreground italic line-clamp-3">&ldquo;{item.transcriptExcerpt}&rdquo;</p>
          {item.notes && <p className="text-xs">{item.notes}</p>}
        </div>
      </div>
    </div>
  )
}

function DroppableHiveCard({
  hive,
  inspections,
  onUpdate,
}: {
  hive: Hive
  inspections: ParsedInspection[]
  onUpdate: (hiveId: string, updated: ParsedInspection[]) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `hive-${hive.id}` })

  function updateField(index: number, field: keyof ParsedInspection, value: unknown) {
    const next = inspections.map((item, i) => i === index ? { ...item, [field]: value } : item)
    onUpdate(hive.id, next)
  }

  function removeInspection(index: number) {
    onUpdate(hive.id, inspections.filter((_, i) => i !== index))
  }

  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl border-2 transition-colors ${isOver ? 'border-amber-400 bg-amber-50' : 'border-amber-200 bg-card'} p-4 space-y-3`}
    >
      <h3 className="font-bold text-amber-800 text-lg">{hive.name}</h3>
      {inspections.length === 0 && (
        <div className="text-center py-6 text-sm text-muted-foreground border-2 border-dashed border-amber-200 rounded-xl">
          Drop a segment here to assign it
        </div>
      )}
      {inspections.map((insp, i) => (
        <div key={i} className="bg-amber-50/60 rounded-xl p-3 space-y-2 border border-amber-100">
          <div className="flex flex-wrap gap-2">
            {([
              ['Queen seen', 'queen_seen', ['Yes', 'No'], (v: string) => v === 'Yes'],
              ['Brood', 'brood_pattern', ['good', 'fair', 'poor'], (v: string) => v],
              ['Population', 'population', ['strong', 'medium', 'weak'], (v: string) => v],
              ['Temperament', 'temperament', ['calm', 'moderate', 'aggressive'], (v: string) => v],
              ['Honey', 'honey_stores', ['full', 'partial', 'low'], (v: string) => v],
            ] as const).map(([label, field, options, transform]) => (
              <div key={field} className="space-y-0.5">
                <label className="text-xs font-semibold text-muted-foreground block">{label}</label>
                <select
                  className="text-xs border rounded-lg px-2 py-1 bg-white"
                  value={insp[field] === null || insp[field] === undefined ? '' : String(insp[field] === true ? 'Yes' : insp[field] === false ? 'No' : insp[field])}
                  onChange={e => updateField(i, field, e.target.value === '' ? null : transform(e.target.value))}
                >
                  <option value="">—</option>
                  {options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>
          <textarea
            className="w-full text-xs border rounded-lg p-2 bg-white resize-none"
            rows={2}
            placeholder="Notes..."
            value={insp.notes ?? ''}
            onChange={e => updateField(i, 'notes', e.target.value || null)}
          />
          <input
            className="w-full text-xs border rounded-lg p-2 bg-white"
            placeholder="Next action..."
            value={insp.next_action ?? ''}
            onChange={e => updateField(i, 'next_action', e.target.value || null)}
          />
          <button onClick={() => removeInspection(i)} className="text-xs text-destructive hover:underline">Remove</button>
        </div>
      ))}
    </div>
  )
}

export function ReviewClient({ session, hives, audioUrl }: { session: VoiceSession; hives: Hive[]; audioUrl: string | null }) {
  const router = useRouter()
  const parsed = session.parsed_data ?? []

  // Split into assigned and unassigned
  const [assignedMap, setAssignedMap] = useState<Record<string, ParsedInspection[]>>(() => {
    const map: Record<string, ParsedInspection[]> = {}
    for (const item of parsed) {
      if (item.hiveId) {
        if (!map[item.hiveId]) map[item.hiveId] = []
        map[item.hiveId].push(item)
      }
    }
    return map
  })
  const [unassigned, setUnassigned] = useState<ParsedInspection[]>(() => parsed.filter(i => !i.hiveId))
  const [saving, setSaving] = useState(false)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)

  function updateHive(hiveId: string, updated: ParsedInspection[]) {
    setAssignedMap(prev => ({ ...prev, [hiveId]: updated }))
  }

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDragId(null)
    const { active, over } = event
    if (!over) return

    const dragId = active.id as string
    const dropId = over.id as string

    if (!dragId.startsWith('unassigned-') || !dropId.startsWith('hive-')) return
    const index = parseInt(dragId.replace('unassigned-', ''))
    const hiveId = dropId.replace('hive-', '')
    const item = unassigned[index]
    if (!item) return

    setUnassigned(prev => prev.filter((_, i) => i !== index))
    setAssignedMap(prev => ({
      ...prev,
      [hiveId]: [...(prev[hiveId] ?? []), { ...item, hiveId }],
    }))
  }, [unassigned])

  async function handleSave() {
    setSaving(true)
    const allInspections: ParsedInspection[] = Object.entries(assignedMap).flatMap(([hiveId, items]) =>
      items.map(item => ({ ...item, hiveId }))
    )
    const result = await saveVoiceSession(session.id, allInspections)
    if (result.error) {
      alert(result.error)
      setSaving(false)
    } else {
      router.push('/hives')
    }
  }

  const hivesWithAssigned = hives.filter(h => (assignedMap[h.id]?.length ?? 0) > 0)
  const hivesWithoutAssigned = hives.filter(h => !(assignedMap[h.id]?.length))
  const orderedHives = [...hivesWithAssigned, ...hivesWithoutAssigned]

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6 pb-32">
      <div>
        <h1 className="text-2xl font-black text-amber-800">Review Voice Inspection</h1>
        <p className="text-sm text-muted-foreground font-semibold">Check the parsed results, edit anything that&apos;s off, then save.</p>
      </div>

      {audioUrl && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-xs font-bold text-amber-700 mb-2">Your recording</p>
          <audio controls src={audioUrl} className="w-full" />
        </div>
      )}

      {session.transcript && (
        <details className="bg-card border rounded-xl p-4">
          <summary className="text-sm font-bold text-amber-700 cursor-pointer">Full transcript</summary>
          <p className="text-sm text-muted-foreground mt-3 whitespace-pre-wrap">{session.transcript}</p>
        </details>
      )}

      <DndContext onDragStart={e => setActiveDragId(e.active.id as string)} onDragEnd={handleDragEnd}>
        {unassigned.length > 0 && (
          <div className="space-y-2">
            <h2 className="font-bold text-sm text-muted-foreground uppercase tracking-wide">
              Unassigned segments — drag to a hive below
            </h2>
            <div className="space-y-2">
              {unassigned.map((item, i) => (
                <DraggableSegment key={i} item={item} index={i} />
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="font-bold text-sm text-muted-foreground uppercase tracking-wide">Hives</h2>
          {orderedHives.map(hive => (
            <DroppableHiveCard
              key={hive.id}
              hive={hive}
              inspections={assignedMap[hive.id] ?? []}
              onUpdate={updateHive}
            />
          ))}
        </div>

        <DragOverlay>
          {activeDragId && activeDragId.startsWith('unassigned-') && (() => {
            const index = parseInt(activeDragId.replace('unassigned-', ''))
            const item = unassigned[index]
            return item ? (
              <div className="bg-card border-2 border-amber-400 rounded-xl p-3 shadow-xl opacity-90">
                <p className="text-xs font-bold text-amber-700">{item.hiveName}</p>
                <p className="text-xs text-muted-foreground italic line-clamp-2">{item.transcriptExcerpt}</p>
              </div>
            ) : null
          })()}
        </DragOverlay>
      </DndContext>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t md:sticky md:bottom-auto md:bg-transparent md:border-0 md:backdrop-blur-none">
        <Button
          className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-6 text-lg shadow-lg"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : <><Check size={20} className="mr-2" /> Save All Inspections</>}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Check TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(protected\)/voice-sessions src/components/voice/review-client.tsx
git commit -m "Add voice session review page with drag-to-assign and bulk save."
```

---

## Task 9: End-to-end smoke test + push

- [ ] **Step 1: Push migration to production**

```bash
npx supabase db push
```

Expected: 0006 migration applied.

- [ ] **Step 2: Set env vars in Vercel**

In Vercel dashboard → Settings → Environment Variables, add:
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`

- [ ] **Step 3: Push code**

```bash
git push
```

- [ ] **Step 4: Smoke test on phone**
  - Open app on mobile browser
  - Tap the amber mic button (bottom right)
  - Allow microphone
  - Say: "At Hive 1, queen is present, brood looks good, honey stores are partial. Next time I need to check for varroa."
  - Tap Stop
  - Watch upload → processing spinner
  - Review page loads — confirm Hive 1 is populated correctly
  - Tap Save
  - Verify inspection appears on Hive 1 detail page

- [ ] **Step 5: Commit any fixes found during smoke test**

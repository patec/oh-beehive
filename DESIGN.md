# Oh Beehive — Design Document

## Overview

Oh Beehive is a mobile-first beekeeping hive management web app. It lets beekeepers log inspections, harvests, and reminders across multiple hives and locations. A key differentiator is the AI-powered voice inspection workflow: beekeepers record audio in the field, and the app uses Whisper + Claude to transcribe and parse it into structured inspection data.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Runtime | React 19 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Database | Supabase (PostgreSQL + Auth + Storage) |
| Hosting | Vercel |
| Transcription | OpenAI Whisper (`whisper-1`) |
| AI Parsing | Anthropic Claude (`claude-haiku-4-5-20251001`) |
| Drag & Drop | @dnd-kit/core |

---

## Database Schema

### profiles
Auto-created on signup via DB trigger.
- `id` (uuid PK → auth.users), `display_name`, `avatar_url`, `created_at`

### locations
A place where hives are kept (yard, farm, etc).
- `id`, `user_id`, `name`, `description`, `created_at`
- Cascade: delete location → deletes all child hives

### hives
A single beehive at a location.
- `id`, `location_id`, `user_id`, `name`, `is_public`, `status` (active/dead/sold), `species`, `installed_at`, `created_at`
- Cascade: delete hive → deletes inspections, harvests, notifications

### inspections
A single hive visit with structured + freeform data.
- `id`, `hive_id`, `user_id`, `inspected_at`
- `queen_seen` (bool), `brood_pattern` (good/fair/poor), `population` (strong/medium/weak)
- `temperament` (calm/moderate/aggressive), `honey_stores` (full/partial/low)
- `notes`, `next_action`, `created_at`
- Cascade: delete inspection → deletes inspection_photos (storage cleanup done server-side)

### inspection_photos
Photos attached to inspections, stored in Supabase Storage.
- `id`, `inspection_id`, `user_id`, `storage_path`, `created_at`
- Constraints: max 5 per inspection, 5 MB each, JPEG/PNG/HEIC only
- Private bucket; signed URLs (1-hour) generated server-side at render time

### harvests
Honey harvest events, independent of inspections.
- `id`, `hive_id`, `user_id`, `harvested_at`, `weight_kg` (numeric, positive), `notes`, `created_at`

### reminders
User-created reminders tied to hives (hive optional).
- `id`, `user_id`, `hive_id` (nullable), `title`, `due_date`, `completed`, `created_at`

### notifications
In-app notifications for overdue inspections and reminders.
- `id`, `user_id`, `hive_id` (nullable), `type` (overdue_inspection/reminder_due), `message`, `read`, `created_at`
- Dedup: 24-hour window to prevent repeat notifications
- Insert via admin client (service role, server-side only); reads via user RLS

### voice_sessions
Tracks voice recordings through the AI processing pipeline.
- `id`, `user_id`, `audio_path`, `duration_seconds`, `transcript`, `parsed_data` (jsonb), `status` (processing/review/saved/failed), `error`, `created_at`
- Private `voice-recordings` bucket, max 150 MB per file

---

## Features

### Authentication
- Email/password and Google OAuth via Supabase Auth
- Protected routes under `(protected)` redirect unauthenticated users to `/login`
- Password reset via email link

### Dashboard (`/dashboard`)
- All locations grouped with their hives
- Each hive shows: name, status badge, days since last inspection
- Hives 14+ days without inspection highlighted in red
- Add hive button per location

### Locations (`/locations`)
- Create, edit, delete locations
- Cascading delete with user warning

### Hive Detail (`/hives/[hiveId]`)
Three tabs:
1. **Inspections** — reverse-chronological list; add/edit/delete; photo carousel
2. **Harvests** — total weight summary; add/edit/delete
3. **Reminders** — pending reminders for this hive; inline add form

Owner sees edit/add/delete. Public hive (non-owner): read-only, no forms. Private hive (non-owner): 404 (not login redirect, to avoid leaking existence).

### Inspections
Form fields: date/time, queen_seen (button group), brood pattern, population, temperament, honey stores (dropdowns), notes, next_action, photos.
Optional: "Schedule follow-up reminder" checkbox → creates reminder inline.

### Harvests
Fields: weight_kg (required, positive), harvested_at, notes.
Displays total weight summary per hive.

### Reminders (`/reminders`)
- Upcoming and completed sections sorted by due date
- Mark complete / delete
- Can be hive-linked or standalone

### Notifications (`/notifications`)
- Bell icon with unread count badge in nav
- Types: `overdue_inspection` (14+ days since last inspection), `reminder_due` (due date reached)
- Mark individual or all as read
- Notifications triggered on protected page load (not background job)

### Voice Inspection (AI-Powered)

**Flow:**
1. Tap floating mic button (mobile only, bottom-right)
2. `RecordingOverlay` opens: request mic permission → record audio
3. Stop → upload audio to Supabase Storage
4. `createVoiceSession` creates DB record (status: `processing`)
5. POST to `/api/voice/process`:
   - Download audio → Whisper API (transcription)
   - Update session with transcript
   - Fetch user's active hives (context for Claude)
   - Send transcript to Claude with hive list → returns `ParsedInspection[]` JSON
   - Update session: `parsed_data`, status → `review`
6. Redirect to `/voice-sessions/[sessionId]/review`
7. `ReviewClient`: drag-and-drop unassigned segments onto hive drop zones; edit fields inline
8. Save → bulk insert inspections; session → `saved`; redirect to `/hives`

**Key types:**
```typescript
type ParsedInspection = {
  hiveId: string | null
  hiveName: string
  transcriptExcerpt: string
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

## Server Actions

| File | Actions |
|------|---------|
| `auth.ts` | signIn, signUp, resetPassword, signOut, signInWithGoogle |
| `locations.ts` | createLocation, updateLocation, deleteLocation |
| `hives.ts` | createHive, updateHive, deleteHive |
| `inspections.ts` | createInspection, updateInspection, deleteInspection, deleteInspectionPhoto |
| `harvests.ts` | createHarvest, updateHarvest, deleteHarvest |
| `reminders.ts` | createReminder, createReminderForHive, completeReminder, deleteReminder |
| `notifications.ts` | triggerOverdueNotifications, triggerReminderNotifications, markNotificationRead, markAllNotificationsRead |
| `voice.ts` | createVoiceSession, getVoiceSession, getVoiceSessionAudioUrl, saveVoiceSession |

## API Routes

| Route | Purpose |
|-------|---------|
| `POST /api/voice/process` | Whisper transcription + Claude parsing pipeline (120s Vercel timeout) |
| `GET /auth/callback` | OAuth + email confirmation callback |

---

## Security

- **RLS** on every table — enforced at DB layer, not application layer
- **Private hive → 404** (not 401) to avoid existence leakage
- **Signed URLs** for all photos and audio (1-hour expiry, server-side only)
- **Admin client** (`SUPABASE_SERVICE_ROLE_KEY`) never exposed to client — `server-only` import guard
- **Service role** used only for notification inserts; reads still gated by user RLS

---

## Environment Variables

| Variable | Where |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public |
| `NEXT_PUBLIC_SITE_URL` | Public (OAuth redirect) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only |
| `OPENAI_API_KEY` | Server only |
| `ANTHROPIC_API_KEY` | Server only |

---

## Performance Notes

- Dashboard and hive detail are server components (minimal client JS)
- `revalidatePath()` used in server actions for targeted cache invalidation
- Signed URLs batch-generated to avoid N+1 calls
- FK indexes on all `user_id`, `hive_id`, `inspection_id` columns

---

## Not in v1 (Known Gaps)

- Varroa mite count tracking
- Treatment / medication logs
- Disease / pest observation log
- Queen age tracking (no queen-specific fields beyond `queen_seen`)
- Swarm management
- Colony splits / merges
- Feeding log
- Equipment inventory
- Financial tracking (income / expenses)
- Hive weight / scale integration
- Weather integration
- Map view for locations
- QR / NFC hive tags
- Email notifications (in-app only)
- Offline / PWA support
- Background jobs for notifications (currently triggered on page load)
- Multi-user hive sharing
- Weight unit preferences (always kg)

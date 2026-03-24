# Oh Beehave — Design Spec
_Date: 2026-03-24_

## Overview

Oh Beehave is a multi-tenant SaaS web application for beekeepers to track their hives, locations, and inspections. Initial target is sharing with members of a beekeeping club, with paid tiers planned for later.

## Goals

- Let beekeepers log hive inspections quickly from a phone while at the hive
- Organise hives across multiple locations per user
- Support a public/private toggle per hive for sharing within a club
- Provide in-app notifications for overdue inspections
- Be free to host initially (Vercel + Supabase free tiers)

## Out of Scope (v1)

- Paid tiers / Stripe billing
- Email notifications
- Club / organisation management
- Offline / PWA mode
- Map view for locations
- Varroa mite count tracking
- Harvest / weight logging

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | Next.js 15 (App Router) | Server components, RSC, Vercel-native |
| Hosting | Vercel | Free tier, zero-config Next.js deployment |
| Database | Supabase PostgreSQL | Free tier, bundles auth + storage |
| Auth | Supabase Auth | Email + Google OAuth, built-in session management |
| File storage | Supabase Storage | Photo uploads, same platform |
| Styling | Tailwind CSS + shadcn/ui | Mobile-first, accessible components |
| Data access | Supabase JS client | Type-safe, server + client, RLS enforced |

Privacy is enforced at the database layer via Supabase Row Level Security (RLS). Private hives are invisible to other users even if they know the URL — this is not application-layer filtering.

---

## Data Model

### `users`
Managed by Supabase Auth. Extended with a `profiles` table for display name and avatar.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key (from auth.users) |
| display_name | text | |
| avatar_url | text | Optional |
| created_at | timestamptz | |

### `locations`
A named place where one or more hives are kept (e.g. home yard, a friend's farm).

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | FK → auth.users |
| name | text | |
| description | text | Optional |
| created_at | timestamptz | |

### `hives`
A single beehive at a location.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| location_id | uuid | FK → locations |
| user_id | uuid | FK → auth.users (denormalised for RLS) |
| name | text | e.g. "Hive 1", "The Blue Box" |
| is_public | boolean | Controls public visibility |
| status | enum | `active`, `dead`, `sold` |
| species | text | Optional (e.g. Italian, Carniolan) |
| installed_at | date | Optional |
| created_at | timestamptz | |

RLS policy: select allowed if `user_id = auth.uid()` OR `is_public = true`.

### `inspections`
A logged visit to a hive. Combines structured quick-entry fields with freeform notes.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| hive_id | uuid | FK → hives |
| user_id | uuid | FK → auth.users |
| inspected_at | timestamptz | Defaults to now(), editable |
| queen_seen | boolean | Nullable (not checked) |
| brood_pattern | enum | `good`, `fair`, `poor` — nullable |
| population | enum | `strong`, `medium`, `weak` — nullable |
| temperament | enum | `calm`, `moderate`, `aggressive` — nullable |
| honey_stores | enum | `full`, `partial`, `low` — nullable |
| notes | text | Freeform — nullable |
| next_action | text | Reminder note for next visit — nullable |
| created_at | timestamptz | |

RLS policy: inherits hive visibility (join required). Mutations restricted to `user_id = auth.uid()`.

### `inspection_photos`
Photos attached to an inspection, stored in Supabase Storage.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| inspection_id | uuid | FK → inspections |
| storage_path | text | Path within Supabase Storage bucket |
| created_at | timestamptz | |

### `notifications`
In-app notifications per user.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | FK → auth.users |
| hive_id | uuid | FK → hives — nullable |
| message | text | |
| read | boolean | Defaults false |
| created_at | timestamptz | |

RLS policy: select/update restricted to `user_id = auth.uid()`.

---

## Features

### Authentication
- Email + password signup/login via Supabase Auth
- Google OAuth
- Password reset flow
- Protected routes redirect unauthenticated users to login

### Locations
- Create, edit, delete a location
- List all locations on the dashboard
- Each location shows its hives with last-inspection status

### Hives
- Create, edit, delete a hive under a location
- Public/private toggle — private hives only visible to the owner; public hives visible to anyone with the link
- Hive status: active / dead / sold
- Hive detail page shows all inspections in reverse-chronological order
- Days-since-last-inspection shown on dashboard cards (highlights if > 14 days)

### Inspections
- Add inspection from a hive detail page (or via the `+` shortcut in nav)
- Structured fields — tap-to-select button groups (not dropdowns) for fast phone entry:
  - Queen seen: Yes / No
  - Brood pattern: Good / Fair / Poor
  - Population: Strong / Medium / Weak
  - Temperament: Calm / Moderate / Aggressive
  - Honey stores: Full / Partial / Low
- All structured fields are optional — a beekeeper can log notes-only
- Freeform notes (textarea)
- Next action (single-line text — appears in notification system)
- Date/time — defaults to now, editable
- Photo upload — multiple photos per inspection, stored in Supabase Storage
- View and edit past inspections
- Delete an inspection

### Notifications
- Bell icon in nav with unread count badge
- Notification list page
- Notifications generated when a hive has not been inspected for 14 days (checked server-side on page load / via Supabase Edge Function cron)
- Tapping a notification marks it read and navigates to the hive
- Mark all as read action

### Public Hive View
- Shareable URL for public hives (no login required)
- Shows hive info and inspection history (read-only)
- Structured fields displayed as readable labels, not raw enums

---

## Navigation

### Mobile (bottom nav bar)
- Home (dashboard)
- Locations
- `+` (centre — add inspection)
- Notifications (with badge)
- Profile

### Desktop (left sidebar)
- Oh Beehave logo / wordmark
- Dashboard
- Locations
- Notifications
- Profile
- Add Inspection button

---

## UI / UX Principles

- Mobile-first: large tap targets, button groups instead of dropdowns, minimal typing required
- Inspection form completable in under 60 seconds at the hive
- shadcn/ui components for consistency and accessibility
- Tailwind for all styling — no custom CSS files

---

## Notification Trigger Logic

On each authenticated page load, a server action checks whether any of the user's active hives have no inspection in the past 14 days and creates a notification if one does not already exist for that hive in the past 24 hours. This avoids spam while keeping the system simple (no background workers required for v1).

---

## Deployment

- Vercel free tier (hobby plan) — auto-deploy from `main` branch
- Supabase free tier — one active project
- Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `.env.local` for local development — never committed

---

## Future Considerations (not v1)

- Stripe integration for paid tiers (Supabase Edge Functions for webhooks)
- Email notifications via Resend
- Club / organisation model (shared locations, member roles)
- PWA / offline inspection logging with sync
- Varroa mite count and treatment tracking
- Harvest weight logging
- Map view for locations

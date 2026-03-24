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
---

## Tech Stack

| Layer | Choice | Version | Reason |
|---|---|---|---|
| Frontend | Next.js (App Router) | 16.2.1 | Server components, RSC, Vercel-native |
| Runtime | React | 19.2.4 | Latest stable, pairs with Next.js 16 |
| Language | TypeScript | 6.0.2 | Latest stable |
| Hosting | Vercel | — | Free tier, zero-config Next.js deployment |
| Database | Supabase PostgreSQL | — | Free tier, bundles auth + storage |
| Auth | Supabase Auth | — | Email + Google OAuth, built-in session management |
| File storage | Supabase Storage | — | Photo uploads, same platform |
| Styling | Tailwind CSS + shadcn/ui | 4.2.2 | Mobile-first, accessible components |
| Data access | @supabase/supabase-js | 2.100.0 | Type-safe, server + client, RLS enforced |
| SSR helpers | @supabase/ssr | 0.9.0 | Cookie-based auth for Next.js App Router |

Privacy is enforced at the database layer via Supabase Row Level Security (RLS). Private hives are invisible to other users even if they know the URL — this is not application-layer filtering.

---

## Data Model

### `profiles`
Extends Supabase Auth users with display name and avatar. Created automatically on user signup via a database trigger.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, FK → auth.users ON DELETE CASCADE |
| display_name | text | |
| avatar_url | text | Optional |
| created_at | timestamptz | |

RLS policy: select public; insert/update restricted to `id = auth.uid()`.

### `locations`
A named place where one or more hives are kept (e.g. home yard, a friend's farm).

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | FK → auth.users ON DELETE CASCADE |
| name | text | |
| description | text | Optional |
| created_at | timestamptz | |

RLS policy: all operations restricted to `user_id = auth.uid()`.
Delete behaviour: deleting a location cascades to all child hives.

### `hives`
A single beehive at a location.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| location_id | uuid | FK → locations ON DELETE CASCADE |
| user_id | uuid | FK → auth.users ON DELETE CASCADE — denormalised for RLS |
| name | text | e.g. "Hive 1", "The Blue Box" |
| is_public | boolean | Controls public visibility, default false |
| status | text | `active`, `dead`, `sold` — enforced via CHECK constraint, default `active` |
| species | text | Optional (e.g. Italian, Carniolan) |
| installed_at | date | Optional |
| created_at | timestamptz | |

RLS policy: select allowed if `user_id = auth.uid()` OR `is_public = true`. Insert/update/delete restricted to `user_id = auth.uid()`.
Delete behaviour: deleting a hive cascades to all child inspections, harvests, and notifications.

### `harvests`
A honey harvest event recorded against a hive. Independent of inspections — a beekeeper may harvest without doing a full inspection.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| hive_id | uuid | FK → hives ON DELETE CASCADE |
| user_id | uuid | FK → auth.users ON DELETE CASCADE — denormalised for RLS |
| harvested_at | date | Date of harvest, defaults to today, editable |
| weight_kg | numeric(8,3) | Harvest weight in kilograms — required |
| notes | text | Optional freeform notes |
| created_at | timestamptz | |

RLS policy: select allowed when parent hive is owned by user OR `is_public = true` (policy joins to hives, same logic as inspections). Insert/update/delete restricted to `user_id = auth.uid()`.
Delete behaviour: deleting a harvest is a hard delete with no child records.

`harvested_at` is `date` (not `timestamptz`) because harvest precision is day-level — a beekeeper records which day they harvested, not the exact time.

### `inspections`
A logged visit to a hive. Combines structured quick-entry fields with freeform notes.

In v1, only the hive owner can create, edit, or delete inspections — even on public hives. The `user_id` column is denormalised from the hive for RLS efficiency and will always equal `hives.user_id` in v1.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| hive_id | uuid | FK → hives ON DELETE CASCADE |
| user_id | uuid | FK → auth.users ON DELETE CASCADE — denormalised for RLS |
| inspected_at | timestamptz | Defaults to now(), editable |
| queen_seen | boolean | Nullable (not checked = unknown) |
| brood_pattern | text | `good`, `fair`, `poor` — CHECK constraint, nullable |
| population | text | `strong`, `medium`, `weak` — CHECK constraint, nullable |
| temperament | text | `calm`, `moderate`, `aggressive` — CHECK constraint, nullable |
| honey_stores | text | `full`, `partial`, `low` — CHECK constraint, nullable |
| notes | text | Freeform — nullable |
| next_action | text | Reminder note for next visit — nullable |
| created_at | timestamptz | |

RLS policy: select allowed when parent hive is owned by user OR `is_public = true` (policy joins to hives). Insert/update/delete restricted to `user_id = auth.uid()`.
Delete behaviour: deleting an inspection cascades to child `inspection_photos` rows via FK. The corresponding Supabase Storage objects must be deleted explicitly in a server action before the DB row is deleted — storage and database have no automatic FK relationship. Notifications are not cascaded from inspection deletion; they cascade from hive deletion via `hive_id`.

### `inspection_photos`
Photos attached to an inspection, stored in Supabase Storage.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| inspection_id | uuid | FK → inspections ON DELETE CASCADE |
| user_id | uuid | FK → auth.users ON DELETE CASCADE — denormalised for RLS |
| storage_path | text | Path within Supabase Storage bucket |
| created_at | timestamptz | |

RLS policy: select allowed when parent inspection is visible (joins through inspections → hives using same public/owner logic). Insert/delete restricted to `user_id = auth.uid()`.

**Storage bucket:** The `inspection-photos` bucket is **private**. Photos are served via short-lived signed URLs generated server-side at render time. This prevents direct access to photos from private hives even if a storage path is guessed.

**Storage cleanup:** When an inspection is deleted, the server action must first delete all associated storage objects from the `inspection-photos` bucket using the Supabase Storage API, then delete the `inspection_photos` rows, then delete the `inspections` row. The same cleanup applies when a hive is deleted (cascade from hive → inspections → photos requires explicit storage deletion in the server action before the hive row is removed from the DB).

**Constraints:** Maximum 5 photos per inspection, enforced at the application layer before upload. Maximum file size 5 MB per photo. Accepted MIME types: `image/jpeg`, `image/png`, `image/heic`.

### `notifications`
In-app notifications per user.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | FK → auth.users ON DELETE CASCADE |
| hive_id | uuid | FK → hives ON DELETE CASCADE — nullable |
| type | text | Notification kind, e.g. `overdue_inspection` |
| message | text | |
| read | boolean | Default false |
| created_at | timestamptz | |

RLS policy: select/update restricted to `user_id = auth.uid()`. Insert performed server-side using `SUPABASE_SERVICE_ROLE_KEY` (which bypasses RLS for the insert only — select/update RLS still applies to all reads). See Notification Trigger Logic and Deployment sections.

---

## Features

### Authentication
- Email + password signup/login via Supabase Auth
- Google OAuth
- Password reset flow
- Protected routes redirect unauthenticated users to login
- On signup, a `profiles` row is created via a Supabase database trigger

### Dashboard (Home)
The dashboard is the landing page after login. It shows a summary of the user's activity:
- All locations listed, each showing its hives as cards
- Each hive card shows the hive name, status, and days since last inspection
- Hive cards with no inspection in 14+ days are visually flagged
- Unread notification count in the nav

The Locations nav item opens a dedicated locations management page (add/edit/delete locations, reorder). It is not the same as the dashboard.

### Locations
- Create, edit, delete a location from the Locations page
- Deleting a location requires confirmation; cascades to all child hives and their data

### Hives
- Create, edit, delete a hive from within a location
- Public/private toggle — private hives (default) are only visible to the owner; public hives are visible to anyone with the link (no login required)
- Hive status: active / dead / sold
- Hive detail page uses two tabs: **Inspections** and **Harvests** — each showing records in reverse-chronological order. Both the authenticated owner view and the public hive view use the same two-tab layout.
- Hive detail page shows total cumulative harvest weight as a summary above the Harvests tab, computed via SQL aggregate (`SUM(weight_kg)`) at render time
- Deleting a hive requires confirmation; cascades to all child inspections, harvests, and their photos

### Inspections
- Add inspection from a hive detail page, or via the `+` nav button
- `+` nav button flow: opens a hive picker modal showing all active hives grouped by location; selecting a hive opens the inspection form pre-populated with that hive
- Structured fields — tap-to-select button groups (not dropdowns) for fast phone entry:
  - Queen seen: Yes / No
  - Brood pattern: Good / Fair / Poor
  - Population: Strong / Medium / Weak
  - Temperament: Calm / Moderate / Aggressive
  - Honey stores: Full / Partial / Low
- All structured fields are optional — a beekeeper can log notes-only
- Freeform notes (textarea)
- Next action (single-line text — displayed on hive detail, feeds notification system)
- Date/time — defaults to now, editable
- Photo upload — up to 5 photos per inspection (JPEG/PNG/HEIC, max 5 MB each), stored in Supabase Storage private bucket, served via signed URLs
- View, edit, and delete past inspections; all fields are editable on existing inspections, including adding or removing photos
- Only the hive owner can create, edit, or delete inspections (even on public hives)

### Harvests
- Add a harvest record from the hive detail page
- Required field: weight in kg (numeric input)
- Optional: date (defaults to today, editable), freeform notes
- Harvest list displayed on the Harvests tab of the hive detail page in reverse-chronological order, showing date and weight
- Hive detail page shows cumulative total harvest weight as a summary above the Harvests tab (SQL aggregate, computed at render time)
- Harvests are only accessible from the hive detail page — there is no global add-harvest shortcut in the nav
- Edit and delete individual harvest records; delete requires confirmation
- Only the hive owner can create, edit, or delete harvests (even on public hives)
- Weight is stored in kg; the UI displays kg with 3 decimal places (e.g. 2.450 kg)

### Notifications
- Bell icon in nav with unread count badge
- Notification list page shows all notifications in reverse-chronological order
- Notification type `overdue_inspection`: generated when an active hive has had no inspection in 14+ days
- Tapping a notification marks it read and navigates to the hive
- Mark all as read action

### Public Hive View
- URL pattern: `/hives/[hive_id]` — accessible without login for public hives
- Unauthenticated users visiting a private hive URL receive a 404 (not a login redirect, to avoid leaking existence)
- Shows hive info, full inspection history, and harvest records using the same two-tab layout as the owner view (read-only)
- Shows cumulative harvest weight summary above the Harvests tab
- Structured fields displayed as readable labels (e.g. "Good" not "good")
- No inspection form, harvest form, or edit controls visible

---

## Navigation

### Mobile (bottom nav bar)
- Home (dashboard)
- Locations
- `+` (centre — opens hive picker, then inspection form)
- Notifications (with unread badge)
- Profile

### Desktop (left sidebar)
- Oh Beehave logo / wordmark
- Dashboard
- Locations
- Notifications
- Profile
- Add Inspection button (opens hive picker, then inspection form)

---

## UI / UX Principles

- Mobile-first: large tap targets, button groups instead of dropdowns, minimal typing required
- Inspection form completable in under 60 seconds at the hive
- shadcn/ui components for consistency and accessibility
- Tailwind for all styling — no custom CSS files

---

## Notification Trigger Logic

On each authenticated page load, a server action checks whether any of the user's active hives (`status = 'active'`) have no inspection in the past 14 days. For each qualifying hive, a notification of type `overdue_inspection` is created only if no `overdue_inspection` notification for that hive already exists with `created_at` in the past 24 hours. This prevents duplicate notifications while requiring no background worker or cron job in v1.

---

## Deployment

- Vercel free tier (hobby plan) — auto-deploy from `main` branch
- Supabase free tier — one active project
- Environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL` — public, used in client and server
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public, used in client components with RLS enforced
  - `SUPABASE_SERVICE_ROLE_KEY` — **server-side only** (Server Actions, Route Handlers); bypasses RLS; never used in client components or passed to the browser; used only for the notification insert logic
- `.env.local` for local development — never committed

---

## Future Considerations (not v1)

- Stripe integration for paid tiers (Supabase Edge Functions for webhooks)
- Email notifications via Resend
- Club / organisation model (shared locations, member roles)
- PWA / offline inspection logging with sync
- Varroa mite count and treatment tracking
- User-selectable weight units (lbs / kg)
- Map view for locations

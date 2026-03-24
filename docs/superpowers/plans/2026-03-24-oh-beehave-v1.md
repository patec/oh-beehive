# Oh Beehave v1 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-tenant beehive tracking SaaS with locations, hives, inspections, harvests, and in-app notifications.

**Architecture:** Next.js 16 App Router on Vercel with Supabase handling auth, PostgreSQL, and file storage. Server Actions handle all mutations. RLS enforces privacy at the DB layer — private hives are invisible to non-owners even at the query level.

**Tech Stack:** Next.js 16.2.1, React 19.2.4, TypeScript 6.0.2, Tailwind 4.2.2, shadcn/ui, @supabase/supabase-js 2.100.0, @supabase/ssr 0.9.0, Vitest, React Testing Library

---

## File Map

```
oh-beehave/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── reset-password/page.tsx
│   │   └── auth/callback/route.ts       # OAuth + magic link handler
│   ├── (protected)/
│   │   ├── layout.tsx                   # auth guard + notification trigger
│   │   ├── dashboard/page.tsx
│   │   ├── locations/page.tsx
│   │   ├── notifications/page.tsx
│   │   └── profile/page.tsx
│   ├── hives/
│   │   └── [hiveId]/page.tsx            # public + owner view
│   ├── layout.tsx                       # root layout, fonts
│   └── page.tsx                         # redirect → /dashboard
├── components/
│   ├── layout/
│   │   ├── app-shell.tsx                # responsive wrapper (mobile nav vs sidebar)
│   │   ├── mobile-nav.tsx               # bottom bar with + button
│   │   └── desktop-sidebar.tsx
│   ├── locations/
│   │   └── location-form.tsx            # create/edit dialog
│   ├── hives/
│   │   ├── hive-form.tsx                # create/edit dialog
│   │   ├── hive-card.tsx                # card showing name, status, days since inspection
│   │   ├── hive-detail-tabs.tsx         # Inspections / Harvests tabs
│   │   └── hive-picker-modal.tsx        # modal for + nav button
│   ├── inspections/
│   │   ├── inspection-form.tsx          # full form with structured fields + photos
│   │   ├── inspection-card.tsx          # read-only summary card
│   │   └── field-select.tsx             # reusable tap-to-select button group
│   ├── harvests/
│   │   ├── harvest-form.tsx
│   │   └── harvest-card.tsx
│   └── notifications/
│       ├── notification-bell.tsx        # icon + unread badge
│       └── notification-item.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts                    # createBrowserClient()
│   │   ├── server.ts                    # createServerClient() for RSC + actions
│   │   └── admin.ts                     # service role client — server-only
│   ├── actions/
│   │   ├── auth.ts
│   │   ├── locations.ts
│   │   ├── hives.ts
│   │   ├── inspections.ts
│   │   ├── harvests.ts
│   │   └── notifications.ts
│   └── types.ts                         # shared DB row types
├── middleware.ts                         # session refresh on every request
├── supabase/
│   └── migrations/
│       ├── 0001_schema.sql
│       ├── 0002_rls.sql
│       └── 0003_triggers.sql
├── tests/
│   ├── setup.ts
│   ├── actions/
│   │   ├── locations.test.ts
│   │   ├── hives.test.ts
│   │   ├── inspections.test.ts
│   │   ├── harvests.test.ts
│   │   └── notifications.test.ts
│   └── components/
│       ├── field-select.test.tsx
│       ├── inspection-form.test.tsx
│       └── harvest-form.test.tsx
├── Makefile
└── .gitignore
```

---

## Task 1: Scaffold Project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `Makefile`, `.gitignore`

- [ ] **Step 1: Create Next.js app**

```bash
cd /Users/pate/projects/oh-beehave
npx create-next-app@16.2.1 . --typescript --tailwind --app --src-dir no --import-alias "@/*" --yes
```

- [ ] **Step 2: Install Supabase and test dependencies**

```bash
npm install @supabase/supabase-js@2.100.0 @supabase/ssr@0.9.0
npm install --save-dev vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom @types/testing-library__jest-dom
```

- [ ] **Step 3: Install shadcn/ui**

```bash
npx shadcn@latest init --defaults
npx shadcn@latest add button input label textarea dialog tabs card badge separator alert
```

- [ ] **Step 4: Configure Vitest — create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': resolve(__dirname, '.') },
  },
})
```

- [ ] **Step 5: Create `tests/setup.ts`**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 6: Write Makefile**

```makefile
.PHONY: help build test run-tests clean dev

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'

build: ## Build production bundle
	npm run build

dev: ## Start development server (run manually: make dev)
	@echo "Run: npm run dev"

test: ## Run all tests
	npx vitest run

run-tests: test ## Alias for test

clean: ## Remove build artifacts
	rm -rf .next out
```

- [ ] **Step 7: Verify tests run**

```bash
make test
```
Expected: no tests found yet, exits 0.

- [ ] **Step 8: Commit**

```bash
git add package.json tsconfig.json next.config.ts vitest.config.ts Makefile tests/setup.ts .gitignore
git commit -m "Scaffold Next.js 16 project with Supabase, Tailwind, shadcn, Vitest."
```

---

## Task 2: Database Schema Migration

**Files:**
- Create: `supabase/migrations/0001_schema.sql`
- Create: `supabase/migrations/0002_rls.sql`
- Create: `supabase/migrations/0003_triggers.sql`

- [ ] **Step 1: Install Supabase CLI and init**

```bash
npm install --save-dev supabase
npx supabase init
npx supabase start
```

- [ ] **Step 2: Write `supabase/migrations/0001_schema.sql`**

```sql
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
```

- [ ] **Step 3: Write `supabase/migrations/0002_rls.sql`**

```sql
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
```

- [ ] **Step 4: Write `supabase/migrations/0003_triggers.sql`**

```sql
-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

- [ ] **Step 5: Apply migrations locally**

```bash
npx supabase db reset
```
Expected: migrations apply cleanly, no errors.

- [ ] **Step 6: Create storage bucket**

In Supabase dashboard (or via CLI): create a private bucket named `inspection-photos`.

```bash
# Via CLI after supabase start:
npx supabase storage create inspection-photos --private
```

- [ ] **Step 7: Commit**

```bash
git add supabase/
git commit -m "Add database schema, RLS policies, and profile trigger migration."
```

---

## Task 3: Supabase Client Setup

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/admin.ts`
- Create: `middleware.ts`
- Create: `.env.local` (not committed)

- [ ] **Step 1: Create `.env.local`**

```bash
# Copy from Supabase dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<local-service-role-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

- [ ] **Step 2: Write `lib/supabase/client.ts`**

```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 3: Write `lib/supabase/server.ts`**

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/types'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Step 4: Write `lib/supabase/admin.ts`**

```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types'

// Server-side only. Bypasses RLS. Never import in client components.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

- [ ] **Step 5: Write `middleware.ts`**

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isProtected = request.nextUrl.pathname.startsWith('/(protected)') ||
    ['/dashboard', '/locations', '/notifications', '/profile'].some(p =>
      request.nextUrl.pathname.startsWith(p)
    )

  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

- [ ] **Step 6: Write `lib/types.ts` (generated stub — will be replaced by Supabase codegen)**

```typescript
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: ProfileInsert; Update: ProfileUpdate }
      locations: { Row: Location; Insert: LocationInsert; Update: LocationUpdate }
      hives: { Row: Hive; Insert: HiveInsert; Update: HiveUpdate }
      harvests: { Row: Harvest; Insert: HarvestInsert; Update: HarvestUpdate }
      inspections: { Row: Inspection; Insert: InspectionInsert; Update: InspectionUpdate }
      inspection_photos: { Row: InspectionPhoto; Insert: InspectionPhotoInsert; Update: InspectionPhotoInsert }
      notifications: { Row: Notification; Insert: NotificationInsert; Update: NotificationUpdate }
    }
  }
}

export type Profile = {
  id: string; display_name: string; avatar_url: string | null; created_at: string
}
export type ProfileInsert = Omit<Profile, 'created_at'>
export type ProfileUpdate = Partial<ProfileInsert>

export type Location = {
  id: string; user_id: string; name: string; description: string | null; created_at: string
}
export type LocationInsert = Pick<Location, 'name'> & { description?: string | null }
export type LocationUpdate = Partial<LocationInsert>

export type HiveStatus = 'active' | 'dead' | 'sold'
export type Hive = {
  id: string; location_id: string; user_id: string; name: string
  is_public: boolean; status: HiveStatus; species: string | null
  installed_at: string | null; created_at: string
}
export type HiveInsert = Pick<Hive, 'location_id' | 'name'> & {
  is_public?: boolean; status?: HiveStatus; species?: string | null; installed_at?: string | null
}
export type HiveUpdate = Partial<Omit<HiveInsert, 'location_id'>>

export type Harvest = {
  id: string; hive_id: string; user_id: string
  harvested_at: string; weight_kg: number; notes: string | null; created_at: string
}
export type HarvestInsert = Pick<Harvest, 'hive_id' | 'weight_kg'> & {
  harvested_at?: string; notes?: string | null
}
export type HarvestUpdate = Partial<Omit<HarvestInsert, 'hive_id'>>

export type BroodPattern = 'good' | 'fair' | 'poor'
export type Population = 'strong' | 'medium' | 'weak'
export type Temperament = 'calm' | 'moderate' | 'aggressive'
export type HoneyStores = 'full' | 'partial' | 'low'

export type Inspection = {
  id: string; hive_id: string; user_id: string; inspected_at: string
  queen_seen: boolean | null; brood_pattern: BroodPattern | null
  population: Population | null; temperament: Temperament | null
  honey_stores: HoneyStores | null; notes: string | null
  next_action: string | null; created_at: string
}
export type InspectionInsert = Pick<Inspection, 'hive_id'> & {
  inspected_at?: string; queen_seen?: boolean | null
  brood_pattern?: BroodPattern | null; population?: Population | null
  temperament?: Temperament | null; honey_stores?: HoneyStores | null
  notes?: string | null; next_action?: string | null
}
export type InspectionUpdate = Partial<Omit<InspectionInsert, 'hive_id'>>

export type InspectionPhoto = {
  id: string; inspection_id: string; user_id: string; storage_path: string; created_at: string
}
export type InspectionPhotoInsert = Pick<InspectionPhoto, 'inspection_id' | 'user_id' | 'storage_path'>

export type Notification = {
  id: string; user_id: string; hive_id: string | null
  type: string; message: string; read: boolean; created_at: string
}
export type NotificationInsert = Pick<Notification, 'user_id' | 'type' | 'message'> & {
  hive_id?: string | null
}
export type NotificationUpdate = { read: boolean }
```

- [ ] **Step 7: Commit**

```bash
git add lib/ middleware.ts
git commit -m "Add Supabase client helpers, middleware, and shared types."
```

---

## Task 4: Auth Pages

**Files:**
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(auth)/signup/page.tsx`
- Create: `app/(auth)/reset-password/page.tsx`
- Create: `app/auth/callback/route.ts`
- Create: `lib/actions/auth.ts`
- Test: `tests/actions/auth.test.ts`

- [ ] **Step 1: Write failing test for login action**

```typescript
// tests/actions/auth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSignInWithPassword = vi.fn()
const mockSignUp = vi.fn()
const mockResetPasswordForEmail = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      resetPasswordForEmail: mockResetPasswordForEmail,
    },
  })),
}))

vi.mock('next/headers', () => ({ cookies: vi.fn(() => ({ getAll: vi.fn(() => []), setAll: vi.fn() })) }))
vi.mock('next/navigation', () => ({ redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`) }) }))

describe('signIn', () => {
  beforeEach(() => vi.clearAllMocks())

  it('redirects to /dashboard on success', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null })
    const { signIn } = await import('@/lib/actions/auth')
    const form = new FormData()
    form.set('email', 'test@example.com')
    form.set('password', 'password123')
    await expect(signIn({}, form)).rejects.toThrow('REDIRECT:/dashboard')
  })

  it('returns error message on failure', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: { message: 'Invalid credentials' } })
    const { signIn } = await import('@/lib/actions/auth')
    const form = new FormData()
    form.set('email', 'test@example.com')
    form.set('password', 'wrong')
    const result = await signIn({}, form)
    expect(result).toEqual({ error: 'Invalid credentials' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
make test
```
Expected: FAIL — `@/lib/actions/auth` not found.

- [ ] **Step 3: Write `lib/actions/auth.ts`**

```typescript
'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signIn(_: unknown, formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })
  if (error) return { error: error.message }
  redirect('/dashboard')
}

export async function signUp(_: unknown, formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })
  if (error) return { error: error.message }
  return { message: 'Check your email to confirm your account.' }
}

export async function resetPassword(_: unknown, formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(
    formData.get('email') as string,
    { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/reset-password` }
  )
  if (error) return { error: error.message }
  return { message: 'Check your email for the reset link.' }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
make test
```
Expected: PASS.

- [ ] **Step 5: Write `app/auth/callback/route.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
  }
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
```

- [ ] **Step 6: Write `app/(auth)/login/page.tsx`**

```typescript
'use client'
import { useActionState } from 'react'
import { signIn } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

export default function LoginPage() {
  const [state, action, pending] = useActionState(signIn, {})
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-bold text-center">Oh Beehave</h1>
        <form action={action} className="space-y-4">
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        <p className="text-sm text-center text-muted-foreground">
          No account? <Link href="/signup" className="underline">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Write `app/(auth)/signup/page.tsx`**

```typescript
'use client'
import { useActionState } from 'react'
import { signUp } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

export default function SignupPage() {
  const [state, action, pending] = useActionState(signUp, {})
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-bold text-center">Create account</h1>
        {state?.message ? (
          <p className="text-sm text-center text-muted-foreground">{state.message}</p>
        ) : (
          <form action={action} className="space-y-4">
            {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required minLength={8} />
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
        )}
        <p className="text-sm text-center text-muted-foreground">
          Have an account? <Link href="/login" className="underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 8: Write `app/(auth)/reset-password/page.tsx`**

```typescript
'use client'
import { useActionState } from 'react'
import { resetPassword } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const [state, action, pending] = useActionState(resetPassword, {})
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-bold text-center">Reset password</h1>
        {state?.message ? (
          <p className="text-sm text-center text-muted-foreground">{state.message}</p>
        ) : (
          <form action={action} className="space-y-4">
            {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? 'Sending…' : 'Send reset link'}
            </Button>
          </form>
        )}
        <p className="text-sm text-center text-muted-foreground">
          <Link href="/login" className="underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 8: Commit**

```bash
git add app/(auth)/ app/auth/ lib/actions/auth.ts tests/actions/auth.test.ts
git commit -m "Add auth pages, server actions, and OAuth callback route."
```

---

## Task 5: App Shell & Navigation

**Files:**
- Create: `app/layout.tsx`
- Create: `app/(protected)/layout.tsx`
- Create: `app/page.tsx`
- Create: `components/layout/app-shell.tsx`
- Create: `components/layout/mobile-nav.tsx`
- Create: `components/layout/desktop-sidebar.tsx`

- [ ] **Step 1: Write `app/layout.tsx`**

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = { title: 'Oh Beehave', description: 'Track your beehives' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
```

- [ ] **Step 2: Write `app/page.tsx`**

```typescript
import { redirect } from 'next/navigation'
export default function RootPage() { redirect('/dashboard') }
```

- [ ] **Step 3: Write `components/layout/mobile-nav.tsx`**

```typescript
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, MapPin, Plus, Bell, User } from 'lucide-react'
import { useState } from 'react'
import { HivePickerModal } from '@/components/hives/hive-picker-modal'

export function MobileNav({ unreadCount }: { unreadCount: number }) {
  const pathname = usePathname()
  const [pickerOpen, setPickerOpen] = useState(false)
  const active = (href: string) => pathname.startsWith(href) ? 'text-primary' : 'text-muted-foreground'

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t flex items-center justify-around px-2 pb-safe">
        <Link href="/dashboard" className={`flex flex-col items-center py-2 text-xs gap-1 ${active('/dashboard')}`}>
          <Home size={22} /><span>Home</span>
        </Link>
        <Link href="/locations" className={`flex flex-col items-center py-2 text-xs gap-1 ${active('/locations')}`}>
          <MapPin size={22} /><span>Locations</span>
        </Link>
        <button
          onClick={() => setPickerOpen(true)}
          className="flex flex-col items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground -mt-4 shadow-lg"
        >
          <Plus size={24} />
        </button>
        <Link href="/notifications" className={`flex flex-col items-center py-2 text-xs gap-1 relative ${active('/notifications')}`}>
          <Bell size={22} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          <span>Alerts</span>
        </Link>
        <Link href="/profile" className={`flex flex-col items-center py-2 text-xs gap-1 ${active('/profile')}`}>
          <User size={22} /><span>Profile</span>
        </Link>
      </nav>
      <HivePickerModal open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </>
  )
}
```

- [ ] **Step 4: Write `components/layout/desktop-sidebar.tsx`**

```typescript
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, MapPin, Bell, User, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { HivePickerModal } from '@/components/hives/hive-picker-modal'

export function DesktopSidebar({ unreadCount }: { unreadCount: number }) {
  const pathname = usePathname()
  const [pickerOpen, setPickerOpen] = useState(false)
  const active = (href: string) => pathname.startsWith(href) ? 'bg-accent' : ''

  return (
    <>
      <aside className="hidden md:flex flex-col w-56 border-r h-screen sticky top-0 p-4 gap-1">
        <span className="font-bold text-lg mb-4 px-2">Oh Beehave</span>
        <Link href="/dashboard" className={`flex items-center gap-2 px-2 py-2 rounded-md text-sm ${active('/dashboard')}`}>
          <Home size={18} /> Dashboard
        </Link>
        <Link href="/locations" className={`flex items-center gap-2 px-2 py-2 rounded-md text-sm ${active('/locations')}`}>
          <MapPin size={18} /> Locations
        </Link>
        <Link href="/notifications" className={`flex items-center gap-2 px-2 py-2 rounded-md text-sm relative ${active('/notifications')}`}>
          <Bell size={18} /> Notifications
          {unreadCount > 0 && (
            <span className="ml-auto text-xs bg-destructive text-destructive-foreground rounded-full px-1.5">
              {unreadCount}
            </span>
          )}
        </Link>
        <Link href="/profile" className={`flex items-center gap-2 px-2 py-2 rounded-md text-sm ${active('/profile')}`}>
          <User size={18} /> Profile
        </Link>
        <div className="mt-auto">
          <Button className="w-full" onClick={() => setPickerOpen(true)}>
            <Plus size={16} className="mr-2" /> Add Inspection
          </Button>
        </div>
      </aside>
      <HivePickerModal open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </>
  )
}
```

- [ ] **Step 5: Write `components/layout/app-shell.tsx`**

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

- [ ] **Step 6: Write `app/(protected)/layout.tsx`**

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/app-shell'
import { triggerOverdueNotifications } from '@/lib/actions/notifications'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await triggerOverdueNotifications(user.id)

  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false)

  return <AppShell unreadCount={count ?? 0}>{children}</AppShell>
}
```

- [ ] **Step 7: Commit**

```bash
git add app/layout.tsx app/page.tsx app/(protected)/layout.tsx components/layout/
git commit -m "Add app shell, mobile nav, desktop sidebar, and protected layout."
```

---

## Task 6: Location Actions & Page

**Files:**
- Create: `lib/actions/locations.ts`
- Create: `components/locations/location-form.tsx`
- Create: `app/(protected)/locations/page.tsx`
- Test: `tests/actions/locations.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/actions/locations.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(() => ({ from: mockFrom, auth: { getUser: vi.fn(() => ({ data: { user: { id: 'user-1' } } })) } })) }))
vi.mock('next/headers', () => ({ cookies: vi.fn(() => ({ getAll: vi.fn(() => []), setAll: vi.fn() })) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

describe('createLocation', () => {
  beforeEach(() => vi.clearAllMocks())

  it('inserts a location and revalidates', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null })
    mockFrom.mockReturnValue({ insert: vi.fn().mockReturnValue({ select: vi.fn().mockResolvedValue({ data: [{ id: '1', name: 'Home' }], error: null }) }) })
    const { createLocation } = await import('@/lib/actions/locations')
    const form = new FormData()
    form.set('name', 'Home Yard')
    const result = await createLocation({}, form)
    expect(result).not.toHaveProperty('error')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
make test
```

- [ ] **Step 3: Write `lib/actions/locations.ts`**

```typescript
'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createLocation(_: unknown, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase.from('locations').insert({
    user_id: user.id,
    name: formData.get('name') as string,
    description: formData.get('description') as string || null,
  })
  if (error) return { error: error.message }
  revalidatePath('/locations')
  revalidatePath('/dashboard')
}

export async function updateLocation(_: unknown, formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.from('locations')
    .update({
      name: formData.get('name') as string,
      description: formData.get('description') as string || null,
    })
    .eq('id', formData.get('id') as string)
  if (error) return { error: error.message }
  revalidatePath('/locations')
  revalidatePath('/dashboard')
}

export async function deleteLocation(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('locations').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/locations')
  revalidatePath('/dashboard')
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
make test
```

- [ ] **Step 5: Add AlertDialog shadcn component**

```bash
npx shadcn@latest add alert-dialog
```

- [ ] **Step 6: Write `components/locations/location-form.tsx`**

```typescript
'use client'
import { useActionState } from 'react'
import { createLocation, updateLocation } from '@/lib/actions/locations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Location } from '@/lib/types'

export function LocationForm({ location, onSuccess }: { location?: Location; onSuccess?: () => void }) {
  const action = location ? updateLocation : createLocation
  const [state, formAction, pending] = useActionState(action, {})
  return (
    <form action={formAction} className="space-y-4">
      {location && <input type="hidden" name="id" value={location.id} />}
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={location?.name} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" defaultValue={location?.description ?? ''} />
      </div>
      <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save'}</Button>
    </form>
  )
}
```

- [ ] **Step 6: Write `app/(protected)/locations/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { LocationForm } from '@/components/locations/location-form'
import { deleteLocation } from '@/lib/actions/locations'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export default async function LocationsPage() {
  const supabase = await createClient()
  const { data: locations } = await supabase.from('locations').select('*').order('created_at')

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Locations</h1>
        <Dialog>
          <DialogTrigger asChild><Button size="sm">Add location</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New location</DialogTitle></DialogHeader>
            <LocationForm />
          </DialogContent>
        </Dialog>
      </div>
      <ul className="space-y-2">
        {locations?.map(loc => (
          <li key={loc.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">{loc.name}</p>
              {loc.description && <p className="text-sm text-muted-foreground">{loc.description}</p>}
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm">Delete</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {loc.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all hives, inspections, and harvests at this location.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <form action={deleteLocation.bind(null, loc.id)}>
                    <AlertDialogAction type="submit">Delete</AlertDialogAction>
                  </form>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add lib/actions/locations.ts components/locations/ app/(protected)/locations/ tests/actions/locations.test.ts
git commit -m "Add location server actions, form component, and locations page."
```

---

## Task 7: Hive Actions

**Files:**
- Create: `lib/actions/hives.ts`
- Test: `tests/actions/hives.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/actions/hives.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(() => ({ from: mockFrom, auth: { getUser: vi.fn(() => ({ data: { user: { id: 'user-1' } } })) } })) }))
vi.mock('next/headers', () => ({ cookies: vi.fn(() => ({ getAll: vi.fn(() => []), setAll: vi.fn() })) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

describe('createHive', () => {
  it('returns error if location_id missing', async () => {
    const { createHive } = await import('@/lib/actions/hives')
    const form = new FormData()
    form.set('name', 'Hive 1')
    const result = await createHive({}, form)
    expect(result?.error).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
make test
```

- [ ] **Step 3: Write `lib/actions/hives.ts`**

```typescript
'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createHive(_: unknown, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const locationId = formData.get('location_id') as string
  if (!locationId) return { error: 'location_id required' }

  const { error } = await supabase.from('hives').insert({
    location_id: locationId,
    user_id: user.id,
    name: formData.get('name') as string,
    species: formData.get('species') as string || null,
    installed_at: formData.get('installed_at') as string || null,
    is_public: formData.get('is_public') === 'true',
  })
  if (error) return { error: error.message }
  revalidatePath('/dashboard')
}

export async function updateHive(_: unknown, formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string
  const { error } = await supabase.from('hives').update({
    name: formData.get('name') as string,
    species: formData.get('species') as string || null,
    installed_at: formData.get('installed_at') as string || null,
    is_public: formData.get('is_public') === 'true',
    status: formData.get('status') as string,
  }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  revalidatePath(`/hives/${id}`)
}

export async function deleteHive(hiveId: string) {
  const supabase = await createClient()
  // Fetch photo storage paths before cascade delete
  const { data: photos } = await supabase
    .from('inspection_photos')
    .select('storage_path')
    .in('inspection_id',
      supabase.from('inspections').select('id').eq('hive_id', hiveId) as any
    )

  if (photos?.length) {
    await supabase.storage.from('inspection-photos')
      .remove(photos.map(p => p.storage_path))
  }

  const { error } = await supabase.from('hives').delete().eq('id', hiveId)
  if (error) return { error: error.message }
  revalidatePath('/dashboard')
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
make test
```

- [ ] **Step 5: Commit**

```bash
git add lib/actions/hives.ts tests/actions/hives.test.ts
git commit -m "Add hive server actions with storage cleanup on delete."
```

---

## Task 8: Dashboard Page

**Files:**
- Create: `components/hives/hive-card.tsx`
- Create: `app/(protected)/dashboard/page.tsx`

- [ ] **Step 1: Write `components/hives/hive-card.tsx`**

```typescript
import Link from 'next/link'
import type { Hive, Inspection } from '@/lib/types'

type Props = { hive: Hive; lastInspection: Inspection | null }

export function HiveCard({ hive, lastInspection }: Props) {
  const daysSince = lastInspection
    ? Math.floor((Date.now() - new Date(lastInspection.inspected_at).getTime()) / 86400000)
    : null
  const overdue = daysSince === null || daysSince >= 14

  return (
    <Link href={`/hives/${hive.id}`} className="block p-3 border rounded-lg hover:bg-accent transition-colors">
      <div className="flex items-center justify-between">
        <span className="font-medium">{hive.name}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          hive.status === 'active' ? 'bg-green-100 text-green-800' :
          hive.status === 'dead' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>{hive.status}</span>
      </div>
      <p className={`text-sm mt-1 ${overdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
        {daysSince === null ? 'Never inspected' : `Inspected ${daysSince}d ago${overdue ? ' — due!' : ''}`}
      </p>
    </Link>
  )
}
```

- [ ] **Step 2: Write `app/(protected)/dashboard/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { HiveCard } from '@/components/hives/hive-card'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: locations } = await supabase.from('locations').select('*, hives(*)').order('created_at')

  const hiveIds = locations?.flatMap(l => l.hives.map((h: any) => h.id)) ?? []
  const { data: allInspections } = hiveIds.length
    ? await supabase.from('inspections')
        .select('hive_id, inspected_at')
        .in('hive_id', hiveIds)
        .order('inspected_at', { ascending: false })
    : { data: [] }

  // Keep only the most recent inspection per hive (rows are already ordered descending)
  const lastByHive: Record<string, { hive_id: string; inspected_at: string }> = {}
  for (const i of allInspections ?? []) {
    if (!lastByHive[i.hive_id]) lastByHive[i.hive_id] = i
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      {locations?.map(loc => (
        <div key={loc.id}>
          <h2 className="font-medium text-muted-foreground mb-2">{loc.name}</h2>
          <div className="space-y-2">
            {loc.hives.map((hive: any) => (
              <HiveCard key={hive.id} hive={hive} lastInspection={lastByHive[hive.id] ?? null} />
            ))}
          </div>
        </div>
      ))}
      {!locations?.length && (
        <p className="text-muted-foreground">No locations yet. Add one in Locations.</p>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/hives/hive-card.tsx components/locations/ app/(protected)/dashboard/
git commit -m "Add dashboard page with location/hive cards and overdue highlighting."
```

---

## Task 9: FieldSelect Component

**Files:**
- Create: `components/inspections/field-select.tsx`
- Test: `tests/components/field-select.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/components/field-select.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { FieldSelect } from '@/components/inspections/field-select'

describe('FieldSelect', () => {
  it('renders all options', () => {
    render(<FieldSelect name="brood_pattern" options={['good', 'fair', 'poor']} />)
    expect(screen.getByText('good')).toBeInTheDocument()
    expect(screen.getByText('fair')).toBeInTheDocument()
    expect(screen.getByText('poor')).toBeInTheDocument()
  })

  it('calls onChange with selected value', async () => {
    const onChange = vi.fn()
    render(<FieldSelect name="brood_pattern" options={['good', 'fair', 'poor']} onChange={onChange} />)
    await userEvent.click(screen.getByText('fair'))
    expect(onChange).toHaveBeenCalledWith('fair')
  })

  it('deselects when clicking selected option', async () => {
    const onChange = vi.fn()
    render(<FieldSelect name="brood_pattern" options={['good', 'fair', 'poor']} value="fair" onChange={onChange} />)
    await userEvent.click(screen.getByText('fair'))
    expect(onChange).toHaveBeenCalledWith(null)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
make test
```

- [ ] **Step 3: Write `components/inspections/field-select.tsx`**

```typescript
'use client'

type Props = {
  name: string
  options: string[]
  value?: string | null
  onChange?: (value: string | null) => void
  label?: string
}

export function FieldSelect({ name, options, value, onChange, label }: Props) {
  return (
    <div className="space-y-2">
      {label && <p className="text-sm text-muted-foreground">{label}</p>}
      <input type="hidden" name={name} value={value ?? ''} />
      <div className="flex gap-2 flex-wrap">
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange?.(value === opt ? null : opt)}
            className={`px-3 py-1.5 rounded-md text-sm border transition-colors capitalize ${
              value === opt
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-foreground border-border hover:bg-accent'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
make test
```

- [ ] **Step 5: Commit**

```bash
git add components/inspections/field-select.tsx tests/components/field-select.test.tsx
git commit -m "Add FieldSelect tap-to-select component with tests."
```

---

## Task 10: Inspection Actions & Form

**Files:**
- Create: `lib/actions/inspections.ts`
- Create: `components/inspections/inspection-form.tsx`
- Create: `components/inspections/inspection-card.tsx`
- Test: `tests/actions/inspections.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/actions/inspections.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
const mockStorage = { from: vi.fn(() => ({ upload: vi.fn(), remove: vi.fn() })) }
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(() => ({ from: mockFrom, storage: mockStorage, auth: { getUser: vi.fn(() => ({ data: { user: { id: 'user-1' } } })) } })) }))
vi.mock('next/headers', () => ({ cookies: vi.fn(() => ({ getAll: vi.fn(() => []), setAll: vi.fn() })) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

describe('createInspection', () => {
  it('returns error if hive_id missing', async () => {
    const { createInspection } = await import('@/lib/actions/inspections')
    const form = new FormData()
    const result = await createInspection({}, form)
    expect(result?.error).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
make test
```

- [ ] **Step 3: Write `lib/actions/inspections.ts`**

```typescript
'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createInspection(_: unknown, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const hiveId = formData.get('hive_id') as string
  if (!hiveId) return { error: 'hive_id required' }

  const { data: inspection, error } = await supabase.from('inspections').insert({
    hive_id: hiveId,
    user_id: user.id,
    inspected_at: formData.get('inspected_at') as string || new Date().toISOString(),
    queen_seen: formData.get('queen_seen') ? formData.get('queen_seen') === 'true' : null,
    brood_pattern: formData.get('brood_pattern') as string || null,
    population: formData.get('population') as string || null,
    temperament: formData.get('temperament') as string || null,
    honey_stores: formData.get('honey_stores') as string || null,
    notes: formData.get('notes') as string || null,
    next_action: formData.get('next_action') as string || null,
  }).select().single()

  if (error) return { error: error.message }

  // Upload photos
  const photos = formData.getAll('photos') as File[]
  const validPhotos = photos.filter(f => f.size > 0 && f.size <= 5 * 1024 * 1024)
  if (validPhotos.length > 5) return { error: 'Maximum 5 photos per inspection' }

  for (const photo of validPhotos) {
    const path = `${user.id}/${inspection.id}/${crypto.randomUUID()}`
    const { error: uploadError } = await supabase.storage.from('inspection-photos').upload(path, photo)
    if (uploadError) continue
    await supabase.from('inspection_photos').insert({ inspection_id: inspection.id, user_id: user.id, storage_path: path })
  }

  revalidatePath(`/hives/${hiveId}`)
}

export async function updateInspection(_: unknown, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const id = formData.get('id') as string
  const { data: existing } = await supabase.from('inspections').select('hive_id').eq('id', id).single()

  const { error } = await supabase.from('inspections').update({
    inspected_at: formData.get('inspected_at') as string,
    queen_seen: formData.get('queen_seen') ? formData.get('queen_seen') === 'true' : null,
    brood_pattern: formData.get('brood_pattern') as string || null,
    population: formData.get('population') as string || null,
    temperament: formData.get('temperament') as string || null,
    honey_stores: formData.get('honey_stores') as string || null,
    notes: formData.get('notes') as string || null,
    next_action: formData.get('next_action') as string || null,
  }).eq('id', id)

  if (error) return { error: error.message }

  // Upload any new photos added during edit
  const photos = formData.getAll('photos') as File[]
  const validPhotos = photos.filter(f => f.size > 0 && f.size <= 5 * 1024 * 1024)
  const { count: existingCount } = await supabase
    .from('inspection_photos').select('*', { count: 'exact', head: true }).eq('inspection_id', id)
  if ((existingCount ?? 0) + validPhotos.length > 5) return { error: 'Maximum 5 photos per inspection' }

  for (const photo of validPhotos) {
    const path = `${user.id}/${id}/${crypto.randomUUID()}`
    const { error: uploadError } = await supabase.storage.from('inspection-photos').upload(path, photo)
    if (uploadError) continue
    await supabase.from('inspection_photos').insert({ inspection_id: id, user_id: user.id, storage_path: path })
  }

  if (existing) revalidatePath(`/hives/${existing.hive_id}`)
}

export async function deleteInspection(inspectionId: string, hiveId: string) {
  const supabase = await createClient()
  const { data: photos } = await supabase.from('inspection_photos').select('storage_path').eq('inspection_id', inspectionId)
  if (photos?.length) {
    await supabase.storage.from('inspection-photos').remove(photos.map(p => p.storage_path))
  }
  const { error } = await supabase.from('inspections').delete().eq('id', inspectionId)
  if (error) return { error: error.message }
  revalidatePath(`/hives/${hiveId}`)
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
make test
```

- [ ] **Step 5: Write `components/inspections/inspection-form.tsx`**

```typescript
'use client'
import { useState, useActionState } from 'react'
import { createInspection, updateInspection } from '@/lib/actions/inspections'
import { FieldSelect } from './field-select'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Inspection } from '@/lib/types'

type Props = { hiveId: string; inspection?: Inspection; onSuccess?: () => void }

export function InspectionForm({ hiveId, inspection }: Props) {
  const action = inspection ? updateInspection : createInspection
  const [state, formAction, pending] = useActionState(action, {})
  const [queenSeen, setQueenSeen] = useState<boolean | null>(inspection?.queen_seen ?? null)
  const [broodPattern, setBroodPattern] = useState(inspection?.brood_pattern ?? null)
  const [population, setPopulation] = useState(inspection?.population ?? null)
  const [temperament, setTemperament] = useState(inspection?.temperament ?? null)
  const [honeyStores, setHoneyStores] = useState(inspection?.honey_stores ?? null)

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="hive_id" value={hiveId} />
      {inspection && <input type="hidden" name="id" value={inspection.id} />}
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="space-y-2">
        <Label>Date & Time</Label>
        <Input type="datetime-local" name="inspected_at"
          defaultValue={inspection?.inspected_at
            ? new Date(inspection.inspected_at).toISOString().slice(0, 16)
            : new Date().toISOString().slice(0, 16)} />
      </div>

      <div className="space-y-2">
        <Label>Queen seen?</Label>
        <input type="hidden" name="queen_seen" value={queenSeen === null ? '' : String(queenSeen)} />
        <div className="flex gap-2">
          {[true, false].map(v => (
            <button key={String(v)} type="button"
              onClick={() => setQueenSeen(queenSeen === v ? null : v)}
              className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${queenSeen === v ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:bg-accent'}`}>
              {v ? 'Yes' : 'No'}
            </button>
          ))}
        </div>
      </div>

      <FieldSelect name="brood_pattern" label="Brood pattern" options={['good','fair','poor']} value={broodPattern} onChange={v => setBroodPattern(v as any)} />
      <FieldSelect name="population" label="Population" options={['strong','medium','weak']} value={population} onChange={v => setPopulation(v as any)} />
      <FieldSelect name="temperament" label="Temperament" options={['calm','moderate','aggressive']} value={temperament} onChange={v => setTemperament(v as any)} />
      <FieldSelect name="honey_stores" label="Honey stores" options={['full','partial','low']} value={honeyStores} onChange={v => setHoneyStores(v as any)} />

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" defaultValue={inspection?.notes ?? ''} rows={3} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="next_action">Next action</Label>
        <Input id="next_action" name="next_action" defaultValue={inspection?.next_action ?? ''} />
      </div>

      <div className="space-y-2">
        <Label>Photos (max 5, 5 MB each)</Label>
        <Input type="file" name="photos" accept="image/jpeg,image/png,image/heic" multiple />
        {inspection && (
          <p className="text-xs text-muted-foreground">
            Upload new photos to add them. To remove existing photos, use the delete button on each photo below.
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Saving…' : 'Save inspection'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 6: Write `components/inspections/inspection-card.tsx`**

```typescript
import type { Inspection } from '@/lib/types'

export function InspectionCard({ inspection }: { inspection: Inspection }) {
  const fields: [string, string | null][] = [
    ['Queen', inspection.queen_seen === null ? null : inspection.queen_seen ? 'Yes' : 'No'],
    ['Brood', inspection.brood_pattern],
    ['Population', inspection.population],
    ['Temperament', inspection.temperament],
    ['Honey', inspection.honey_stores],
  ]
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <p className="text-sm text-muted-foreground">
        {new Date(inspection.inspected_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}
      </p>
      <div className="flex flex-wrap gap-2">
        {fields.filter(([, v]) => v !== null).map(([label, value]) => (
          <span key={label} className="text-xs bg-secondary px-2 py-1 rounded capitalize">
            {label}: {value}
          </span>
        ))}
      </div>
      {inspection.notes && <p className="text-sm">{inspection.notes}</p>}
      {inspection.next_action && (
        <p className="text-sm text-muted-foreground">Next: {inspection.next_action}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add lib/actions/inspections.ts components/inspections/ tests/actions/inspections.test.ts
git commit -m "Add inspection server actions, form with structured fields, and inspection card."
```

---

## Task 11: Harvest Actions & Form

**Files:**
- Create: `lib/actions/harvests.ts`
- Create: `components/harvests/harvest-form.tsx`
- Create: `components/harvests/harvest-card.tsx`
- Test: `tests/actions/harvests.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/actions/harvests.test.ts
import { describe, it, expect, vi } from 'vitest'

const mockFrom = vi.fn()
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(() => ({ from: mockFrom, auth: { getUser: vi.fn(() => ({ data: { user: { id: 'user-1' } } })) } })) }))
vi.mock('next/headers', () => ({ cookies: vi.fn(() => ({ getAll: vi.fn(() => []), setAll: vi.fn() })) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

describe('createHarvest', () => {
  it('returns error if weight_kg is missing', async () => {
    const { createHarvest } = await import('@/lib/actions/harvests')
    const form = new FormData()
    form.set('hive_id', 'hive-1')
    const result = await createHarvest({}, form)
    expect(result?.error).toBeDefined()
  })

  it('returns error if weight_kg is not a positive number', async () => {
    const { createHarvest } = await import('@/lib/actions/harvests')
    const form = new FormData()
    form.set('hive_id', 'hive-1')
    form.set('weight_kg', '-1')
    const result = await createHarvest({}, form)
    expect(result?.error).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
make test
```

- [ ] **Step 3: Write `lib/actions/harvests.ts`**

```typescript
'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createHarvest(_: unknown, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const hiveId = formData.get('hive_id') as string
  if (!hiveId) return { error: 'hive_id required' }

  const weightKg = parseFloat(formData.get('weight_kg') as string)
  if (isNaN(weightKg) || weightKg <= 0) return { error: 'Weight must be a positive number' }

  const { error } = await supabase.from('harvests').insert({
    hive_id: hiveId,
    user_id: user.id,
    weight_kg: weightKg,
    harvested_at: formData.get('harvested_at') as string || new Date().toISOString().slice(0, 10),
    notes: formData.get('notes') as string || null,
  })
  if (error) return { error: error.message }
  revalidatePath(`/hives/${hiveId}`)
}

export async function updateHarvest(_: unknown, formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string
  const weightKg = parseFloat(formData.get('weight_kg') as string)
  if (isNaN(weightKg) || weightKg <= 0) return { error: 'Weight must be a positive number' }

  const { data: existing } = await supabase.from('harvests').select('hive_id').eq('id', id).single()
  const { error } = await supabase.from('harvests').update({
    weight_kg: weightKg,
    harvested_at: formData.get('harvested_at') as string,
    notes: formData.get('notes') as string || null,
  }).eq('id', id)

  if (error) return { error: error.message }
  if (existing) revalidatePath(`/hives/${existing.hive_id}`)
}

export async function deleteHarvest(harvestId: string, hiveId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('harvests').delete().eq('id', harvestId)
  if (error) return { error: error.message }
  revalidatePath(`/hives/${hiveId}`)
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
make test
```

- [ ] **Step 5: Write `components/harvests/harvest-form.tsx`**

```typescript
'use client'
import { useActionState } from 'react'
import { createHarvest, updateHarvest } from '@/lib/actions/harvests'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Harvest } from '@/lib/types'

export function HarvestForm({ hiveId, harvest }: { hiveId: string; harvest?: Harvest }) {
  const action = harvest ? updateHarvest : createHarvest
  const [state, formAction, pending] = useActionState(action, {})
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="hive_id" value={hiveId} />
      {harvest && <input type="hidden" name="id" value={harvest.id} />}
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div className="space-y-2">
        <Label htmlFor="weight_kg">Weight (kg)</Label>
        <Input id="weight_kg" name="weight_kg" type="number" step="0.001" min="0.001"
          defaultValue={harvest?.weight_kg ?? ''} required placeholder="e.g. 2.450" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="harvested_at">Date</Label>
        <Input id="harvested_at" name="harvested_at" type="date"
          defaultValue={harvest?.harvested_at ?? new Date().toISOString().slice(0, 10)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" defaultValue={harvest?.notes ?? ''} rows={2} />
      </div>
      <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save harvest'}</Button>
    </form>
  )
}
```

- [ ] **Step 6: Write `components/harvests/harvest-card.tsx`**

```typescript
import type { Harvest } from '@/lib/types'
import { deleteHarvest } from '@/lib/actions/harvests'
import { Button } from '@/components/ui/button'

'use client'
import { useState } from 'react'
import { deleteHarvest } from '@/lib/actions/harvests'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import type { Harvest } from '@/lib/types'
import { HarvestForm } from './harvest-form'

export function HarvestCard({ harvest, hiveId, isOwner }: { harvest: Harvest; hiveId: string; isOwner: boolean }) {
  const [editOpen, setEditOpen] = useState(false)
  return (
    <div className="border rounded-lg p-4 flex items-center justify-between">
      <div>
        <p className="font-medium">{Number(harvest.weight_kg).toFixed(3)} kg</p>
        <p className="text-sm text-muted-foreground">
          {new Date(harvest.harvested_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}
        </p>
        {harvest.notes && <p className="text-sm mt-1">{harvest.notes}</p>}
      </div>
      {isOwner && (
        <div className="flex gap-1">
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm">Edit</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Edit harvest</DialogTitle></DialogHeader>
              <HarvestForm hiveId={hiveId} harvest={harvest} />
            </DialogContent>
          </Dialog>
          <form action={deleteHarvest.bind(null, harvest.id, hiveId)}>
            <Button variant="ghost" size="sm" type="submit">Delete</Button>
          </form>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add lib/actions/harvests.ts components/harvests/ tests/actions/harvests.test.ts
git commit -m "Add harvest server actions, form, and card components with tests."
```

---

## Task 12: Hive Detail Page & Tabs

**Files:**
- Create: `components/hives/hive-detail-tabs.tsx`
- Create: `components/hives/hive-form.tsx`
- Create: `app/hives/[hiveId]/page.tsx`

- [ ] **Step 1: Write `components/hives/hive-detail-tabs.tsx`**

```typescript
'use client'
import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { InspectionCard } from '@/components/inspections/inspection-card'
import { HarvestCard } from '@/components/harvests/harvest-card'
import type { Inspection, Harvest } from '@/lib/types'

type Props = {
  inspections: Inspection[]
  harvests: Harvest[]
  hiveId: string
  totalHarvestKg: number
  isOwner: boolean
}

export function HiveDetailTabs({ inspections, harvests, hiveId, totalHarvestKg, isOwner }: Props) {
  return (
    <Tabs defaultValue="inspections" className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="inspections" className="flex-1">Inspections ({inspections.length})</TabsTrigger>
        <TabsTrigger value="harvests" className="flex-1">Harvests ({harvests.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="inspections" className="space-y-3 mt-4">
        {inspections.map(i => <InspectionCard key={i.id} inspection={i} />)}
        {!inspections.length && <p className="text-muted-foreground text-sm">No inspections yet.</p>}
      </TabsContent>
      <TabsContent value="harvests" className="space-y-3 mt-4">
        {totalHarvestKg > 0 && (
          <div className="p-3 bg-secondary rounded-lg">
            <p className="text-sm font-medium">Total harvested: {totalHarvestKg.toFixed(3)} kg</p>
          </div>
        )}
        {harvests.map(h => <HarvestCard key={h.id} harvest={h} hiveId={hiveId} isOwner={isOwner} />)}
        {!harvests.length && <p className="text-muted-foreground text-sm">No harvests recorded yet.</p>}
      </TabsContent>
    </Tabs>
  )
}
```

- [ ] **Step 2: Write `app/hives/[hiveId]/page.tsx`**

```typescript
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { HiveDetailTabs } from '@/components/hives/hive-detail-tabs'
import { InspectionForm } from '@/components/inspections/inspection-form'
import { HarvestForm } from '@/components/harvests/harvest-form'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export default async function HiveDetailPage({ params }: { params: Promise<{ hiveId: string }> }) {
  const { hiveId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: hive } = await supabase.from('hives').select('*').eq('id', hiveId).single()
  if (!hive) notFound()
  // RLS ensures private hives return null for unauthenticated users
  if (!hive.is_public && hive.user_id !== user?.id) notFound()

  const isOwner = user?.id === hive.user_id
  const autoOpenInspection = isOwner // wired via query param below in JSX

  const [{ data: inspections }, { data: harvests }] = await Promise.all([
    supabase.from('inspections').select('*, inspection_photos(*)').eq('hive_id', hive.id).order('inspected_at', { ascending: false }),
    supabase.from('harvests').select('*').eq('hive_id', hive.id).order('harvested_at', { ascending: false }),
  ])

  const totalHarvestKg = (harvests ?? []).reduce((sum, h) => sum + Number(h.weight_kg), 0)

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{hive.name}</h1>
          <p className="text-sm text-muted-foreground capitalize">{hive.status}{hive.species ? ` · ${hive.species}` : ''}</p>
        </div>
        {isOwner && (
          <div className="flex gap-2">
            {/* autoOpen when navigated from hive picker (+) button via ?add_inspection=1 */}
            <AutoOpenInspectionDialog hiveId={hive.id} />
            <Dialog>
              <DialogTrigger asChild><Button size="sm" variant="outline">+ Harvest</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Log harvest</DialogTitle></DialogHeader>
                <HarvestForm hiveId={hive.id} />
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
      <HiveDetailTabs
        inspections={inspections ?? []}
        harvests={harvests ?? []}
        hiveId={hive.id}
        totalHarvestKg={totalHarvestKg}
        isOwner={isOwner}
      />
    </div>
  )
}
```

- [ ] **Step 3: Create `components/hives/auto-open-inspection-dialog.tsx`** — client component that reads `?add_inspection=1` from the URL and auto-opens the inspection dialog

```typescript
'use client'
import { useState, useEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { InspectionForm } from '@/components/inspections/inspection-form'

export function AutoOpenInspectionDialog({ hiveId }: { hiveId: string }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (searchParams.get('add_inspection') === '1') {
      setOpen(true)
      const params = new URLSearchParams(searchParams.toString())
      params.delete('add_inspection')
      router.replace(`${pathname}?${params.toString()}`)
    }
  }, [searchParams, router, pathname])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm">+ Inspection</Button></DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New inspection</DialogTitle></DialogHeader>
        <InspectionForm hiveId={hiveId} />
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/hives/ components/hives/hive-detail-tabs.tsx components/hives/auto-open-inspection-dialog.tsx
git commit -m "Add hive detail page with tabbed inspections and harvests views."
```

---

## Task 13: Hive Picker Modal

**Files:**
- Create: `components/hives/hive-picker-modal.tsx`
- Create: `components/hives/hive-form.tsx`

- [ ] **Step 1: Write `components/hives/hive-picker-modal.tsx`**

```typescript
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Hive, Location } from '@/lib/types'

type HiveWithLocation = Hive & { locations: Location }

export function HivePickerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [hives, setHives] = useState<HiveWithLocation[]>([])

  useEffect(() => {
    if (!open) return
    const supabase = createClient()
    supabase.from('hives').select('*, locations(name)').eq('status', 'active')
      .then(({ data }) => setHives((data as any) ?? []))
  }, [open])

  const grouped = hives.reduce<Record<string, HiveWithLocation[]>>((acc, h) => {
    const loc = (h.locations as any)?.name ?? 'Unknown'
    acc[loc] = [...(acc[loc] ?? []), h]
    return acc
  }, {})

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Select a hive</DialogTitle></DialogHeader>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {Object.entries(grouped).map(([loc, hs]) => (
            <div key={loc}>
              <p className="text-xs font-medium text-muted-foreground uppercase mb-2">{loc}</p>
              {hs.map(h => (
                <button key={h.id} className="w-full text-left px-3 py-2 rounded-md hover:bg-accent text-sm"
                  onClick={() => { onClose(); router.push(`/hives/${h.id}?add_inspection=1`) }}>
                  {h.name}
                </button>
              ))}
            </div>
          ))}
          {!hives.length && <p className="text-sm text-muted-foreground">No active hives found.</p>}
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Write `components/hives/hive-form.tsx`**

```typescript
'use client'
import { useActionState } from 'react'
import { createHive, updateHive } from '@/lib/actions/hives'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Hive } from '@/lib/types'

export function HiveForm({ locationId, hive }: { locationId?: string; hive?: Hive }) {
  const action = hive ? updateHive : createHive
  const [state, formAction, pending] = useActionState(action, {})
  return (
    <form action={formAction} className="space-y-4">
      {locationId && <input type="hidden" name="location_id" value={locationId} />}
      {hive && <input type="hidden" name="id" value={hive.id} />}
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={hive?.name} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="species">Species (optional)</Label>
        <Input id="species" name="species" defaultValue={hive?.species ?? ''} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="installed_at">Installation date (optional)</Label>
        <Input id="installed_at" name="installed_at" type="date" defaultValue={hive?.installed_at ?? ''} />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="is_public" name="is_public" value="true"
          defaultChecked={hive?.is_public ?? false} className="rounded" />
        <Label htmlFor="is_public">Make hive public</Label>
      </div>
      <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save'}</Button>
    </form>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/hives/hive-picker-modal.tsx components/hives/hive-form.tsx
git commit -m "Add hive picker modal and hive form component."
```

---

## Task 14: Notifications

**Files:**
- Create: `lib/actions/notifications.ts`
- Create: `components/notifications/notification-bell.tsx`
- Create: `components/notifications/notification-item.tsx`
- Create: `app/(protected)/notifications/page.tsx`
- Test: `tests/actions/notifications.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/actions/notifications.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn(() => ({ from: mockFrom })) }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(() => ({
  from: mockFrom,
  auth: { getUser: vi.fn(() => ({ data: { user: { id: 'user-1' } } })) }
})) }))
vi.mock('next/headers', () => ({ cookies: vi.fn(() => ({ getAll: vi.fn(() => []), setAll: vi.fn() })) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

describe('triggerOverdueNotifications', () => {
  it('does not throw when no hives found', async () => {
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [] }) }) })
    const { triggerOverdueNotifications } = await import('@/lib/actions/notifications')
    await expect(triggerOverdueNotifications('user-1')).resolves.not.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
make test
```

- [ ] **Step 3: Write `lib/actions/notifications.ts`**

```typescript
'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const OVERDUE_DAYS = 14
const DEDUP_HOURS = 24

export async function triggerOverdueNotifications(userId: string) {
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: hives } = await supabase
    .from('hives')
    .select('id, name')
    .eq('user_id', userId)
    .eq('status', 'active')

  if (!hives?.length) return

  const cutoff = new Date(Date.now() - OVERDUE_DAYS * 86400000).toISOString()
  const dedupCutoff = new Date(Date.now() - DEDUP_HOURS * 3600000).toISOString()

  for (const hive of hives) {
    // Check last inspection
    const { data: lastInspection } = await supabase
      .from('inspections')
      .select('inspected_at')
      .eq('hive_id', hive.id)
      .order('inspected_at', { ascending: false })
      .limit(1)
      .single()

    const isOverdue = !lastInspection || lastInspection.inspected_at < cutoff
    if (!isOverdue) continue

    // Dedup check
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('hive_id', hive.id)
      .eq('type', 'overdue_inspection')
      .gte('created_at', dedupCutoff)
      .limit(1)
      .single()

    if (existing) continue

    await admin.from('notifications').insert({
      user_id: userId,
      hive_id: hive.id,
      type: 'overdue_inspection',
      message: `${hive.name} hasn't been inspected in ${OVERDUE_DAYS}+ days.`,
    })
  }
}

export async function markNotificationRead(id: string) {
  const supabase = await createClient()
  await supabase.from('notifications').update({ read: true }).eq('id', id)
  revalidatePath('/notifications')
}

export async function markAllNotificationsRead() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
  revalidatePath('/notifications')
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
make test
```

- [ ] **Step 5: Write `app/(protected)/notifications/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { markNotificationRead, markAllNotificationsRead } from '@/lib/actions/notifications'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: notifications } = await supabase
    .from('notifications').select('*').eq('user_id', user!.id).order('created_at', { ascending: false })

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Notifications</h1>
        {notifications?.some(n => !n.read) && (
          <form action={markAllNotificationsRead}>
            <Button variant="ghost" size="sm" type="submit">Mark all read</Button>
          </form>
        )}
      </div>
      <ul className="space-y-2">
        {notifications?.map(n => (
          <li key={n.id} className={`p-3 border rounded-lg ${!n.read ? 'bg-accent' : ''}`}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm">{n.message}</p>
              <div className="flex gap-2 flex-shrink-0">
                {n.hive_id && (
                  <Link href={`/hives/${n.hive_id}`}>
                    <Button variant="ghost" size="sm">View</Button>
                  </Link>
                )}
                {!n.read && (
                  <form action={markNotificationRead.bind(null, n.id)}>
                    <Button variant="ghost" size="sm" type="submit">Dismiss</Button>
                  </form>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(n.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}
            </p>
          </li>
        ))}
        {!notifications?.length && <p className="text-muted-foreground text-sm">No notifications.</p>}
      </ul>
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/actions/notifications.ts components/notifications/ app/(protected)/notifications/ tests/actions/notifications.test.ts
git commit -m "Add notification trigger logic, list page, and mark-read actions."
```

---

## Task 15: Profile Page & Final Wiring

**Files:**
- Create: `app/(protected)/profile/page.tsx`

- [ ] **Step 1: Write `app/(protected)/profile/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single()

  return (
    <div className="p-4 max-w-sm mx-auto space-y-6">
      <h1 className="text-xl font-semibold">Profile</h1>
      <div className="space-y-1">
        <p className="font-medium">{profile?.display_name}</p>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
      </div>
      <form action={signOut}>
        <Button variant="outline" type="submit" className="w-full">Sign out</Button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Run full test suite**

```bash
make test
```
Expected: all tests pass.

- [ ] **Step 3: Run build to verify no type errors**

```bash
make build
```
Expected: build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add app/(protected)/profile/
git commit -m "Add profile page with sign out."
```

---

## Task 16: Deploy to Vercel + Supabase

- [ ] **Step 1: Create Supabase project**

Visit supabase.com → New project. Copy URL and keys.

- [ ] **Step 2: Apply migrations to production**

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

- [ ] **Step 3: Create production storage bucket**

In Supabase dashboard → Storage → New bucket: `inspection-photos`, private.

- [ ] **Step 4: Push to GitHub and connect Vercel**

```bash
git remote add origin https://github.com/<you>/oh-beehave.git
git push -u origin main
```

Connect repo in vercel.com → New Project. Set env vars:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL` (your Vercel URL)

- [ ] **Step 5: Enable Google OAuth in Supabase**

Supabase dashboard → Auth → Providers → Google. Follow OAuth setup guide. Add Vercel URL to allowed redirects.

- [ ] **Step 6: Verify deployment**

Open Vercel URL. Sign up, create a location, add a hive, log an inspection with a photo, log a harvest. Confirm public hive link works unauthenticated.

- [ ] **Step 7: Final commit**

```bash
git add vercel.json next.config.ts .env.example
git commit -m "Add production deployment configuration."
```

Where `.env.example` contains (no real values — safe to commit):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=
```

import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types'

// Bypasses RLS. The server-only import above causes a build error if this is ever bundled client-side.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

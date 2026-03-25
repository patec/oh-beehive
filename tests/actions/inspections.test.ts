import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
const mockStorage = { from: vi.fn(() => ({ upload: vi.fn(), remove: vi.fn() })) }
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(() => ({ from: mockFrom, storage: mockStorage, auth: { getUser: vi.fn(() => ({ data: { user: { id: 'user-1' } } })) } })) }))
vi.mock('next/headers', () => ({ cookies: vi.fn(() => ({ getAll: vi.fn(() => []), setAll: vi.fn() })) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

describe('createInspection', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns error if hive_id missing', async () => {
    const { createInspection } = await import('@/lib/actions/inspections')
    const form = new FormData()
    const result = await createInspection({}, form)
    expect(result?.error).toBeDefined()
  })
})

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

  it('returns error if name missing', async () => {
    const { createHive } = await import('@/lib/actions/hives')
    const form = new FormData()
    form.set('location_id', 'loc-1')
    const result = await createHive({}, form)
    expect(result?.error).toBeDefined()
  })
})

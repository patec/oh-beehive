import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(() => ({ from: mockFrom, auth: { getUser: vi.fn(() => ({ data: { user: { id: 'user-1' } } })) } })) }))
vi.mock('next/headers', () => ({ cookies: vi.fn(() => ({ getAll: vi.fn(() => []), setAll: vi.fn() })) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

describe('createLocation', () => {
  beforeEach(() => vi.clearAllMocks())

  it('inserts a location and revalidates', async () => {
    mockFrom.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) })
    const { createLocation } = await import('@/lib/actions/locations')
    const form = new FormData()
    form.set('name', 'Home Yard')
    const result = await createLocation({}, form)
    expect(result).not.toHaveProperty('error')
  })

  it('returns error when name is missing', async () => {
    const { createLocation } = await import('@/lib/actions/locations')
    const form = new FormData()
    const result = await createLocation({}, form)
    expect(result).toHaveProperty('error')
  })
})

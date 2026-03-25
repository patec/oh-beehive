import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(() => ({ from: mockFrom, auth: { getUser: vi.fn(() => ({ data: { user: { id: 'user-1' } } })) } })) }))
vi.mock('next/headers', () => ({ cookies: vi.fn(() => ({ getAll: vi.fn(() => []), setAll: vi.fn() })) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

describe('createHarvest', () => {
  beforeEach(() => vi.clearAllMocks())

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

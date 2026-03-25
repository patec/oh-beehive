import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn(() => ({ data: { user: { id: 'user-1' } } }))
const mockFrom = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}))
vi.mock('next/headers', () => ({ cookies: vi.fn(() => ({ getAll: vi.fn(() => []), setAll: vi.fn() })) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

describe('createHarvest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockReturnValue({ data: { user: { id: 'user-1' } } })
  })

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

  it('returns error when unauthenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } } as never)
    const { createHarvest } = await import('@/lib/actions/harvests')
    const form = new FormData()
    form.set('hive_id', 'hive-1')
    form.set('weight_kg', '1.5')
    const result = await createHarvest({}, form)
    expect(result?.error).toBe('Unauthorized')
  })
})

describe('updateHarvest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockReturnValue({ data: { user: { id: 'user-1' } } })
  })

  it('returns error when unauthenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } } as never)
    const { updateHarvest } = await import('@/lib/actions/harvests')
    const form = new FormData()
    form.set('id', 'harvest-1')
    form.set('weight_kg', '2.0')
    const result = await updateHarvest({}, form)
    expect(result?.error).toBe('Unauthorized')
  })

  it('returns error when weight_kg is negative', async () => {
    const { updateHarvest } = await import('@/lib/actions/harvests')
    const form = new FormData()
    form.set('id', 'harvest-1')
    form.set('weight_kg', '-5')
    const result = await updateHarvest({}, form)
    expect(result?.error).toBeDefined()
  })
})

describe('deleteHarvest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockReturnValue({ data: { user: { id: 'user-1' } } })
  })

  it('returns error when unauthenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } } as never)
    const { deleteHarvest } = await import('@/lib/actions/harvests')
    const result = await deleteHarvest('harvest-1', 'hive-1')
    expect(result?.error).toBe('Unauthorized')
  })

  it('succeeds when given valid inputs', async () => {
    const mockDelete = vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) }))
    mockFrom.mockReturnValue({ delete: mockDelete })
    const { deleteHarvest } = await import('@/lib/actions/harvests')
    const result = await deleteHarvest('harvest-1', 'hive-1')
    expect(result).toBeUndefined()
  })
})

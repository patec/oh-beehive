import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn(() => ({ data: { user: { id: 'user-1' } } }))
const mockFrom = vi.fn()
const mockStorage = { from: vi.fn(() => ({ upload: vi.fn(), remove: vi.fn() })) }
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
    storage: mockStorage,
    auth: { getUser: mockGetUser },
  })),
}))
vi.mock('next/headers', () => ({ cookies: vi.fn(() => ({ getAll: vi.fn(() => []), setAll: vi.fn() })) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

describe('createInspection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockReturnValue({ data: { user: { id: 'user-1' } } })
  })

  it('returns error if hive_id missing', async () => {
    const { createInspection } = await import('@/lib/actions/inspections')
    const form = new FormData()
    const result = await createInspection({}, form)
    expect(result?.error).toBeDefined()
  })

  it('returns error when unauthenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } } as never)
    const { createInspection } = await import('@/lib/actions/inspections')
    const form = new FormData()
    form.set('hive_id', 'hive-1')
    const result = await createInspection({}, form)
    expect(result?.error).toBe('Unauthorized')
  })

  it('returns error when more than 5 photos are provided', async () => {
    const mockInsert = vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn(() => ({ data: { id: 'insp-1' }, error: null })) })) }))
    mockFrom.mockReturnValue({ insert: mockInsert })
    const { createInspection } = await import('@/lib/actions/inspections')
    const form = new FormData()
    form.set('hive_id', 'hive-1')
    for (let i = 0; i < 6; i++) {
      form.append('photos', new File(['x'], 'test.jpg', { type: 'image/jpeg' }))
    }
    const result = await createInspection({}, form)
    expect(result?.error).toBeDefined()
  })

  it('returns warning when a photo has a disallowed MIME type', async () => {
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'insp-1', hive_id: 'hive-1' }, error: null })
        })
      }),
    })
    const { createInspection } = await import('@/lib/actions/inspections')
    const form = new FormData()
    form.set('hive_id', 'hive-1')
    form.append('photos', new File(['x'], 'test.gif', { type: 'image/gif' }))
    const result = await createInspection({}, form)
    expect(result?.warning).toMatch(/1 photo\(s\) were skipped/)
  })
})

describe('updateInspection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockReturnValue({ data: { user: { id: 'user-1' } } })
  })

  it('returns error when unauthenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } } as never)
    const { updateInspection } = await import('@/lib/actions/inspections')
    const form = new FormData()
    form.set('id', 'insp-1')
    const result = await updateInspection({}, form)
    expect(result?.error).toBe('Unauthorized')
  })

  it('returns error when id is missing from FormData', async () => {
    const { updateInspection } = await import('@/lib/actions/inspections')
    const form = new FormData()
    const result = await updateInspection({}, form)
    expect(result?.error).toBeDefined()
  })
})

describe('deleteInspection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockReturnValue({ data: { user: { id: 'user-1' } } })
  })

  it('returns error when unauthenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } } as never)
    const { deleteInspection } = await import('@/lib/actions/inspections')
    const result = await deleteInspection('insp-1', 'hive-1')
    expect(result?.error).toBe('Unauthorized')
  })
})

describe('deleteInspectionPhoto', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockReturnValue({ data: { user: { id: 'user-1' } } })
  })

  it('returns error when unauthenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } } as never)
    const { deleteInspectionPhoto } = await import('@/lib/actions/inspections')
    const result = await deleteInspectionPhoto('photo-1', 'user-1/insp-1/uuid', 'hive-1')
    expect(result?.error).toBe('Unauthorized')
  })
})

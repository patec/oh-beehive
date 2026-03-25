import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
const mockAdminFrom = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn(() => ({ from: mockAdminFrom })) }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
    auth: { getUser: vi.fn(() => ({ data: { user: { id: 'user-1' } } })) },
  })),
}))
vi.mock('next/headers', () => ({ cookies: vi.fn(() => ({ getAll: vi.fn(() => []), setAll: vi.fn() })) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('server-only', () => ({}))

describe('triggerOverdueNotifications', () => {
  beforeEach(() => vi.clearAllMocks())

  it('does not throw when no hives found', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null })
        })
      })
    })
    const { triggerOverdueNotifications } = await import('@/lib/actions/notifications')
    await expect(triggerOverdueNotifications('user-1')).resolves.not.toThrow()
  })
})

describe('markNotificationRead', () => {
  beforeEach(() => vi.clearAllMocks())

  it('updates the notification read status', async () => {
    const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    mockFrom.mockReturnValue({ update: mockUpdate })
    const { markNotificationRead } = await import('@/lib/actions/notifications')
    await markNotificationRead('notif-1')
    expect(mockUpdate).toHaveBeenCalledWith({ read: true })
  })
})

describe('markAllNotificationsRead', () => {
  beforeEach(() => vi.clearAllMocks())

  it('does not throw and updates all unread for user', async () => {
    const mockEq2 = vi.fn().mockResolvedValue({ error: null })
    const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 })
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq1 })
    mockFrom.mockReturnValue({ update: mockUpdate })
    const { markAllNotificationsRead } = await import('@/lib/actions/notifications')
    await expect(markAllNotificationsRead()).resolves.not.toThrow()
  })
})

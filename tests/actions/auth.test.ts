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

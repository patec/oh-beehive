import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSignInWithPassword = vi.fn()
const mockSignUp = vi.fn()
const mockResetPasswordForEmail = vi.fn()
const mockSignOut = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      resetPasswordForEmail: mockResetPasswordForEmail,
      signOut: mockSignOut,
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

describe('signUp', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns success message on success', async () => {
    mockSignUp.mockResolvedValue({ error: null })
    const { signUp } = await import('@/lib/actions/auth')
    const form = new FormData()
    form.set('email', 'test@example.com')
    form.set('password', 'password123')
    const result = await signUp({}, form)
    expect(result).toEqual({ message: 'Check your email to confirm your account.' })
  })

  it('returns error message on failure', async () => {
    mockSignUp.mockResolvedValue({ error: { message: 'Email already registered' } })
    const { signUp } = await import('@/lib/actions/auth')
    const form = new FormData()
    form.set('email', 'existing@example.com')
    form.set('password', 'password123')
    const result = await signUp({}, form)
    expect(result).toEqual({ error: 'Email already registered' })
  })

  it('returns error when password too short', async () => {
    const { signUp } = await import('@/lib/actions/auth')
    const form = new FormData()
    form.set('email', 'test@example.com')
    form.set('password', 'short')
    const result = await signUp({}, form)
    expect(result).toEqual({ error: 'Password must be at least 8 characters.' })
  })
})

describe('resetPassword', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns success message on success', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: null })
    const { resetPassword } = await import('@/lib/actions/auth')
    const form = new FormData()
    form.set('email', 'test@example.com')
    const result = await resetPassword({}, form)
    expect(result).toEqual({ message: 'Check your email for the reset link.' })
  })

  it('returns error on failure', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: { message: 'Rate limit exceeded' } })
    const { resetPassword } = await import('@/lib/actions/auth')
    const form = new FormData()
    form.set('email', 'test@example.com')
    const result = await resetPassword({}, form)
    expect(result).toEqual({ error: 'Rate limit exceeded' })
  })
})

describe('signOut', () => {
  beforeEach(() => vi.clearAllMocks())

  it('redirects to /login on success', async () => {
    mockSignOut.mockResolvedValue({ error: null })
    const { signOut } = await import('@/lib/actions/auth')
    await expect(signOut()).rejects.toThrow('REDIRECT:/login')
  })

  it('returns error on failure', async () => {
    mockSignOut.mockResolvedValue({ error: { message: 'Sign out failed' } })
    const { signOut } = await import('@/lib/actions/auth')
    const result = await signOut()
    expect(result).toEqual({ error: 'Sign out failed' })
  })
})

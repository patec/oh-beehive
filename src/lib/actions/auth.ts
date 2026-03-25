'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signIn(_: { error?: string }, formData: FormData) {
  const email = formData.get('email') as string | null
  const password = formData.get('password') as string | null
  if (!email || !password) return { error: 'Email and password are required.' }
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: error.message }
  redirect('/dashboard')
}

export async function signUp(_: { error?: string; message?: string }, formData: FormData) {
  const email = formData.get('email') as string | null
  const password = formData.get('password') as string | null
  if (!email || !password) return { error: 'Email and password are required.' }
  if (password.length < 8) return { error: 'Password must be at least 8 characters.' }
  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({ email, password })
  if (error) return { error: error.message }
  return { message: 'Check your email to confirm your account.' }
}

export async function resetPassword(_: { error?: string; message?: string }, formData: FormData) {
  const email = formData.get('email') as string | null
  if (!email) return { error: 'Email is required.' }
  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(
    email,
    { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/reset-password` }
  )
  if (error) return { error: error.message }
  return { message: 'Check your email for the reset link.' }
}

export async function signOut() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()
  if (error) return { error: error.message }
  redirect('/login')
}

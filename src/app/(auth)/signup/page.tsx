'use client'
import { useActionState } from 'react'
import { signUp } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

export default function SignupPage() {
  const [state, action, pending] = useActionState<{ error?: string; message?: string }, FormData>(signUp, {})
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-bold text-center">Create account</h1>
        {state?.message ? (
          <p className="text-sm text-center text-muted-foreground">{state.message}</p>
        ) : (
          <form action={action} className="space-y-4">
            {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required minLength={8} />
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? 'Creating account\u2026' : 'Create account'}
            </Button>
          </form>
        )}
        <p className="text-sm text-center text-muted-foreground">
          Have an account? <Link href="/login" className="underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}

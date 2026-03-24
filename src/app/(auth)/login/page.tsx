'use client'
import { useActionState } from 'react'
import { signIn } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

export default function LoginPage() {
  const [state, action, pending] = useActionState<{ error?: string }, FormData>(signIn, {})
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-bold text-center">Oh Beehave</h1>
        <form action={action} className="space-y-4">
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? 'Signing in\u2026' : 'Sign in'}
          </Button>
        </form>
        <p className="text-sm text-center text-muted-foreground">
          No account? <Link href="/signup" className="underline">Sign up</Link>
        </p>
      </div>
    </div>
  )
}

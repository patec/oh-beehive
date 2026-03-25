import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await (supabase.from('profiles') as any).select('*').eq('id', user!.id).single()

  async function handleSignOut() {
    'use server'
    await signOut()
  }

  return (
    <div className="p-4 max-w-sm mx-auto space-y-6">
      <h1 className="text-xl font-semibold">Profile</h1>
      <div className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Display name</p>
          <p className="font-medium">{profile?.display_name || '—'}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Email</p>
          <p className="font-medium">{user?.email}</p>
        </div>
      </div>
      <form action={handleSignOut}>
        <Button variant="outline" type="submit" className="w-full">Sign out</Button>
      </form>
    </div>
  )
}

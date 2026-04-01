import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/app-shell'
import { triggerOverdueNotifications, triggerReminderNotifications } from '@/lib/actions/notifications'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await Promise.all([
    triggerOverdueNotifications(user.id),
    triggerReminderNotifications(user.id),
  ])

  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false)

  return <AppShell unreadCount={count ?? 0}>{children}</AppShell>
}

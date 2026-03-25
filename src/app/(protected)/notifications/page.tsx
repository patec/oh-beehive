import { createClient } from '@/lib/supabase/server'
import { markAllNotificationsRead } from '@/lib/actions/notifications'
import { NotificationItem } from '@/components/notifications/notification-item'
import { Button } from '@/components/ui/button'
import type { Notification } from '@/lib/types'

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: notifications } = await (supabase.from('notifications') as any)
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false }) as { data: Notification[] | null }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Notifications</h1>
        {notifications?.some(n => !n.read) && (
          <form action={markAllNotificationsRead}>
            <Button variant="ghost" size="sm" type="submit">Mark all read</Button>
          </form>
        )}
      </div>
      <ul className="space-y-2">
        {notifications?.map(n => (
          <NotificationItem key={n.id} notification={n} />
        ))}
        {!notifications?.length && (
          <p className="text-muted-foreground text-sm">No notifications.</p>
        )}
      </ul>
    </div>
  )
}

import type { Notification } from '@/lib/types'
import { markNotificationRead } from '@/lib/actions/notifications'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export function NotificationItem({ notification }: { notification: Notification }) {
  return (
    <li className={`p-3 border rounded-lg ${!notification.read ? 'bg-accent' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm">{notification.message}</p>
        <div className="flex gap-2 flex-shrink-0">
          {notification.hive_id && (
            <Link href={`/hives/${notification.hive_id}`}>
              <Button variant="ghost" size="sm">View</Button>
            </Link>
          )}
          {!notification.read && (
            <form action={markNotificationRead.bind(null, notification.id)}>
              <Button variant="ghost" size="sm" type="submit">Dismiss</Button>
            </form>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        {new Date(notification.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}
      </p>
    </li>
  )
}

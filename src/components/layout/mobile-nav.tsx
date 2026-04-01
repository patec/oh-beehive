'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, MapPin, Plus, Bell, User, Calendar } from 'lucide-react'
import { useState } from 'react'
import { HivePickerModal } from '@/components/hives/hive-picker-modal'

export function MobileNav({ unreadCount }: { unreadCount: number }) {
  const pathname = usePathname()
  const [pickerOpen, setPickerOpen] = useState(false)
  const active = (href: string) => pathname.startsWith(href) ? 'text-primary' : 'text-muted-foreground'

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t flex items-center justify-around px-2 pb-safe">
        <Link href="/dashboard" className={`flex flex-col items-center py-2 text-xs gap-1 ${active('/dashboard')}`}>
          <Home size={22} /><span>Home</span>
        </Link>
        <Link href="/reminders" className={`flex flex-col items-center py-2 text-xs gap-1 ${active('/reminders')}`}>
          <Calendar size={22} /><span>Reminders</span>
        </Link>
        <button
          onClick={() => setPickerOpen(true)}
          className="flex flex-col items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground -mt-4 shadow-lg"
        >
          <Plus size={24} />
        </button>
        <Link href="/notifications" className={`flex flex-col items-center py-2 text-xs gap-1 relative ${active('/notifications')}`}>
          <Bell size={22} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          <span>Alerts</span>
        </Link>
        <Link href="/profile" className={`flex flex-col items-center py-2 text-xs gap-1 ${active('/profile')}`}>
          <User size={22} /><span>Profile</span>
        </Link>
      </nav>
      <HivePickerModal open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </>
  )
}

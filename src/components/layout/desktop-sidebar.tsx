'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, MapPin, Bell, User, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { HivePickerModal } from '@/components/hives/hive-picker-modal'

export function DesktopSidebar({ unreadCount }: { unreadCount: number }) {
  const pathname = usePathname()
  const [pickerOpen, setPickerOpen] = useState(false)
  const active = (href: string) => pathname.startsWith(href) ? 'bg-accent' : ''

  return (
    <>
      <aside className="hidden md:flex flex-col w-56 border-r h-screen sticky top-0 p-4 gap-1">
        <span className="font-bold text-lg mb-4 px-2">Oh Beehave</span>
        <Link href="/dashboard" className={`flex items-center gap-2 px-2 py-2 rounded-md text-sm ${active('/dashboard')}`}>
          <Home size={18} /> Dashboard
        </Link>
        <Link href="/locations" className={`flex items-center gap-2 px-2 py-2 rounded-md text-sm ${active('/locations')}`}>
          <MapPin size={18} /> Locations
        </Link>
        <Link href="/notifications" className={`flex items-center gap-2 px-2 py-2 rounded-md text-sm relative ${active('/notifications')}`}>
          <Bell size={18} /> Notifications
          {unreadCount > 0 && (
            <span className="ml-auto text-xs bg-destructive text-destructive-foreground rounded-full px-1.5">
              {unreadCount}
            </span>
          )}
        </Link>
        <Link href="/profile" className={`flex items-center gap-2 px-2 py-2 rounded-md text-sm ${active('/profile')}`}>
          <User size={18} /> Profile
        </Link>
        <div className="mt-auto">
          <Button className="w-full" onClick={() => setPickerOpen(true)}>
            <Plus size={16} className="mr-2" /> Add Inspection
          </Button>
        </div>
      </aside>
      <HivePickerModal open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </>
  )
}

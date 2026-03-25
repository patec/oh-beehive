'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Home, MapPin, Bell, LogOut, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { HivePickerModal } from '@/components/hives/hive-picker-modal'
import { handleSignOut } from '@/lib/actions/auth'

export function DesktopSidebar({ unreadCount }: { unreadCount: number }) {
  const pathname = usePathname()
  const [pickerOpen, setPickerOpen] = useState(false)
  const active = (href: string) =>
    pathname.startsWith(href)
      ? 'bg-primary/10 text-primary font-medium'
      : 'text-muted-foreground hover:bg-accent hover:text-foreground'

  return (
    <>
      <aside className="hidden md:flex flex-col w-60 border-r h-screen sticky top-0 p-4 gap-1 bg-background">
        <div className="mb-5 px-1 flex items-center gap-3">
          <Image src="/oh-beehive.jpg" alt="Oh Beehive" width={44} height={44} className="rounded-xl" />
          <div>
            <span className="text-lg font-black text-amber-500 tracking-tight leading-none block">Oh Beehive!</span>
            <span className="text-xs text-muted-foreground">Yeah, baby!</span>
          </div>
        </div>
        <Link href="/dashboard" className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${active('/dashboard')}`}>
          <Home size={16} /> Dashboard
        </Link>
        <Link href="/locations" className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${active('/locations')}`}>
          <MapPin size={16} /> Locations
        </Link>
        <Link href="/notifications" className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors relative ${active('/notifications')}`}>
          <Bell size={16} /> Notifications
          {unreadCount > 0 && (
            <span className="ml-auto text-xs bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>
        <div className="mt-auto space-y-2">
          <Button className="w-full" onClick={() => setPickerOpen(true)}>
            <Plus size={16} className="mr-2" /> Add Inspection, baby!
          </Button>
          <form action={handleSignOut}>
            <Button variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-foreground" type="submit">
              <LogOut size={14} className="mr-2" /> Cheerio, baby!
            </Button>
          </form>
        </div>
      </aside>
      <HivePickerModal open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </>
  )
}

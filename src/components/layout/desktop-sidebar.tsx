'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Home, MapPin, Bell, LogOut, Plus, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { HivePickerModal } from '@/components/hives/hive-picker-modal'
import { handleSignOut } from '@/lib/actions/auth'

export function DesktopSidebar({ unreadCount }: { unreadCount: number }) {
  const pathname = usePathname()
  const [pickerOpen, setPickerOpen] = useState(false)
  const active = (href: string) =>
    pathname.startsWith(href)
      ? 'bg-amber-500/20 text-amber-900 font-bold shadow-sm'
      : 'text-amber-900/70 hover:bg-amber-500/10 hover:text-amber-900'

  return (
    <>
      <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 p-4 gap-1 border-r border-amber-300/60 bg-gradient-to-b from-amber-100 via-amber-50 to-orange-50 shadow-[2px_0_12px_0_rgba(251,191,36,0.15)]">
        <div className="mb-6 px-1 flex flex-col items-center text-center gap-2">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-amber-400/30 blur-md scale-110" />
            <Image
              src="/oh-beehive.jpg"
              alt="Oh Beehive"
              width={148}
              height={148}
              className="relative rounded-2xl shadow-md ring-2 ring-amber-300/60"
            />
          </div>
          <div className="mt-1">
            <span className="text-xl font-black text-amber-600 tracking-tight leading-none block drop-shadow-sm">Oh Beehive!</span>
            <span className="text-xs text-amber-700/70 font-semibold">Yeah, baby!</span>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          <Link href="/dashboard" className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 ${active('/dashboard')}`}>
            <Home size={16} /> Dashboard
          </Link>
          <Link href="/hives" className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 ${active('/hives')}`}>
            <Layers size={16} /> Hives
          </Link>
          <Link href="/locations" className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 ${active('/locations')}`}>
            <MapPin size={16} /> Locations
          </Link>
          <Link href="/notifications" className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 relative ${active('/notifications')}`}>
            <Bell size={16} /> Notifications
            {unreadCount > 0 && (
              <span className="ml-auto text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5 font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        </nav>

        <div className="mt-auto space-y-2">
          <Button
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-md hover:shadow-lg transition-all"
            onClick={() => setPickerOpen(true)}
          >
            <Plus size={16} className="mr-2" /> Add Inspection, baby!
          </Button>
          <form action={handleSignOut}>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-amber-800/60 hover:text-amber-900 hover:bg-amber-500/10"
              type="submit"
            >
              <LogOut size={14} className="mr-2" /> Cheerio, baby!
            </Button>
          </form>
        </div>
      </aside>
      <HivePickerModal open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </>
  )
}

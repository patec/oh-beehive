import { MobileNav } from './mobile-nav'
import { DesktopSidebar } from './desktop-sidebar'

export function AppShell({ children, unreadCount }: { children: React.ReactNode; unreadCount: number }) {
  return (
    <div className="flex min-h-screen">
      <DesktopSidebar unreadCount={unreadCount} />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <div className="md:hidden">
        <MobileNav unreadCount={unreadCount} />
      </div>
    </div>
  )
}

'use client'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Mic } from 'lucide-react'
import { RecordingOverlay } from './recording-overlay'

export function RecordButton() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close the overlay when navigation completes so the overlay stays visible
  // through the transition and the underlying page never flashes.
  useEffect(() => {
    if (open) setOpen(false)
  }, [pathname])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-[60] w-14 h-14 rounded-full bg-amber-500 text-white shadow-lg hover:bg-amber-600 active:scale-95 transition-all flex items-center justify-center md:bottom-8"
        aria-label="Start voice inspection"
        title="Voice inspection"
      >
        <Mic size={24} />
      </button>
      {open && <RecordingOverlay onClose={() => setOpen(false)} />}
    </>
  )
}

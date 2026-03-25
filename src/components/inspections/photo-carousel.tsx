'use client'
import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import type { InspectionPhotoWithUrl } from '@/lib/types'

const PREVIEW_COUNT = 3

export function PhotoCarousel({ photos }: { photos: InspectionPhotoWithUrl[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [showAll, setShowAll] = useState(false)

  if (!photos.length) return null

  const visible = showAll ? photos : photos.slice(0, PREVIEW_COUNT)
  const hiddenCount = photos.length - PREVIEW_COUNT

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        {visible.map((photo, i) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setLightboxIndex(i)}
            className="relative w-20 h-20 rounded-lg overflow-hidden border hover:opacity-90 transition-opacity flex-shrink-0"
          >
            <Image src={photo.signedUrl} alt="Inspection photo" fill className="object-cover" sizes="80px" />
          </button>
        ))}
        {!showAll && hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="w-20 h-20 rounded-lg border border-dashed flex items-center justify-center text-sm text-muted-foreground hover:bg-accent transition-colors flex-shrink-0"
          >
            +{hiddenCount}
          </button>
        )}
      </div>

      <Dialog open={lightboxIndex !== null} onOpenChange={v => !v && setLightboxIndex(null)}>
        <DialogContent className="max-w-2xl p-2 bg-black border-0">
          {lightboxIndex !== null && (
            <div className="relative">
              <div className="relative w-full aspect-square sm:aspect-video">
                <Image
                  src={photos[lightboxIndex].signedUrl}
                  alt="Inspection photo"
                  fill
                  className="object-contain"
                  sizes="(max-width: 640px) 100vw, 672px"
                />
              </div>
              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setLightboxIndex((lightboxIndex - 1 + photos.length) % photos.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setLightboxIndex((lightboxIndex + 1) % photos.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors"
                  >
                    <ChevronRight size={20} />
                  </button>
                  <p className="text-center text-xs text-white/60 mt-1">
                    {lightboxIndex + 1} / {photos.length}
                  </p>
                </>
              )}
              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

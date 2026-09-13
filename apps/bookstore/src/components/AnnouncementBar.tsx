import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Megaphone, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getActiveAnnouncement } from '@/services/announcement'

/**
 * Site-wide announcement bar.
 *
 * Renders BELOW the header as its own element — deliberately not inside
 * the Navbar component, so it can't interfere with the navbar's sticky
 * positioning or z-index, and pages that don't want it simply don't
 * mount it.
 *
 * Returns null when nothing is live, so the layout is untouched the rest
 * of the time.
 */
const AnnouncementBar = () => {
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const { data: announcement } = useQuery({
    queryKey: ['announcement-active'],
    queryFn: getActiveAnnouncement,
    // The server caches for 60s; match it here so navigating between
    // pages doesn't refetch on every mount.
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  if (!announcement || dismissed) return null

  const hasDetails = Boolean(announcement.body || announcement.linkUrl)

  return (
    <>
      <div className="w-full bg-primary text-primary-foreground">
        <div className="container flex items-center gap-3 py-2">
          <Megaphone className="h-4 w-4 shrink-0" aria-hidden />

          {/* Marquee. The track holds the text twice so the loop is
              seamless: as copy #1 leaves, copy #2 is already in view. */}
          <button
            type="button"
            onClick={() => hasDetails && setOpen(true)}
            className="group relative flex-1 overflow-hidden text-left"
            aria-label={
              hasDetails
                ? `Announcement: ${announcement.message}. Open for details`
                : `Announcement: ${announcement.message}`
            }
          >
            <div className="announcement-marquee flex w-max gap-12 whitespace-nowrap">
              <span className="text-sm font-medium">
                {announcement.message}
              </span>
              <span className="text-sm font-medium" aria-hidden>
                {announcement.message}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss announcement"
            className="shrink-0 rounded p-1 hover:bg-white/15"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Scoped keyframes — kept with the component rather than in
          index.css so the whole feature is self-contained.
          `prefers-reduced-motion` stops the scroll for users who ask
          for that; the text stays readable, just static. */}
      <style>{`
        @keyframes announcement-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .announcement-marquee {
          animation: announcement-scroll 22s linear infinite;
        }
        .group:hover .announcement-marquee {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .announcement-marquee { animation: none; }
        }
      `}</style>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              Announcement
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="font-medium">{announcement.message}</p>
            {announcement.body && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {announcement.body}
              </p>
            )}
            {announcement.linkUrl && (
              <a
                href={announcement.linkUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-sm font-medium text-primary underline"
              >
                {announcement.linkLabel || 'Learn more'}
              </a>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default AnnouncementBar

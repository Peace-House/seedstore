import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Bell, Mail, Users } from 'lucide-react'
import { useTargetingFilters } from './communications/useTargetingFilters'
import {
  useRecipientPreview,
  RecipientPreviewDialog,
} from './communications/RecipientPreview'
import TargetingFiltersPanel from './communications/TargetingFiltersPanel'
import EmailComposer from './communications/EmailComposer'
import PushComposer from './communications/PushComposer'
import CommunicationsHistory from './communications/CommunicationsHistory'
import type { Channel, ComposerHandle } from './communications/types'

interface PendingEdit {
  channel: Channel
  id: string
  nonce: number
}

const CommunicationsManagement = ({
  defaultChannel = 'email',
}: {
  defaultChannel?: Channel
}) => {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'compose' | 'history'>('compose')
  const [channel, setChannel] = useState<Channel>(defaultChannel)
  const [pendingEdit, setPendingEdit] = useState<PendingEdit | null>(null)

  const emailRef = useRef<ComposerHandle>(null)
  const pushRef = useRef<ComposerHandle>(null)

  // One shared targeting state powers both channels — target the audience
  // once, then choose how to reach it.
  const tf = useTargetingFilters()
  const rp = useRecipientPreview(tf.buildFilters, tf.excludeRecipientEmail)

  const refreshHistory = () => {
    queryClient.invalidateQueries({
      queryKey: ['communications', 'newsletter-campaigns'],
    })
    queryClient.invalidateQueries({
      queryKey: ['communications', 'push-campaigns'],
    })
    queryClient.invalidateQueries({
      queryKey: ['communications', 'push-drafts'],
    })
  }

  // Once the correct composer is mounted (after a channel switch), load the
  // requested draft into it.
  useEffect(() => {
    if (!pendingEdit || pendingEdit.channel !== channel || tab !== 'compose') {
      return
    }
    const handle = pendingEdit.channel === 'email' ? emailRef : pushRef
    handle.current?.loadDraft(pendingEdit.id)
    setPendingEdit(null)
  }, [pendingEdit, channel, tab])

  // Some filters are newsletter-only (raw pasted emails, genres, email
  // promotion preference). Drop them when switching to push so they can't
  // silently narrow a push audience.
  const selectChannel = (next: Channel) => {
    if (next === 'push') {
      if (tf.targetMode === 'pasted-emails') tf.setTargetMode('all')
      tf.setSelectedGenres([])
      tf.setPromotionOptedIn('all')
    }
    setChannel(next)
  }

  const editDraft = (draftChannel: Channel, id: string) => {
    selectChannel(draftChannel)
    setTab('compose')
    setPendingEdit((prev) => ({
      channel: draftChannel,
      id,
      nonce: (prev?.nonce ?? 0) + 1,
    }))
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-gradient-to-r from-slate-50 via-white to-slate-100 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold">
              <Mail className="h-6 w-6" />
              Communications Center
            </h2>
            <p className="text-muted-foreground text-sm">
              Build an audience once, then send it as an email newsletter or a
              push notification.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border bg-white px-3 py-1">
            <Users className="h-4 w-4" />
            <span className="text-sm font-medium">
              Preview recipients:{' '}
              <span className="text-red-600">{rp.previewRecipientCount}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-1 border-b">
        {(
          [
            { v: 'compose', label: 'Compose' },
            { v: 'history', label: 'History' },
          ] as { v: 'compose' | 'history'; label: string }[]
        ).map((t) => (
          <button
            key={t.v}
            onClick={() => setTab(t.v)}
            className={`px-4 py-2 text-sm font-medium ${
              tab === t.v
                ? 'border-primary text-primary border-b-2'
                : 'text-muted-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'compose' && (
        <>
          {/* Channel selector */}
          <div className="inline-flex rounded-lg border p-1">
            {(
              [
                {
                  v: 'email',
                  label: 'Email Newsletter',
                  icon: <Mail className="h-4 w-4" />,
                },
                {
                  v: 'push',
                  label: 'Push Notification',
                  icon: <Bell className="h-4 w-4" />,
                },
              ] as { v: Channel; label: string; icon: JSX.Element }[]
            ).map((c) => (
              <button
                key={c.v}
                onClick={() => selectChannel(c.v)}
                className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  channel === c.v
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {c.icon}
                {c.label}
              </button>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-12">
            <div className="xl:col-span-4">
              <TargetingFiltersPanel tf={tf} channel={channel} />
            </div>
            <div className="xl:col-span-8">
              {channel === 'email' ? (
                <EmailComposer
                  ref={emailRef}
                  tf={tf}
                  rp={rp}
                  onSent={refreshHistory}
                />
              ) : (
                <PushComposer
                  ref={pushRef}
                  tf={tf}
                  rp={rp}
                  onSent={refreshHistory}
                />
              )}
            </div>
          </div>

          <RecipientPreviewDialog rp={rp} />
        </>
      )}

      {tab === 'history' && (
        <CommunicationsHistory
          defaultChannel={channel}
          onEditEmailDraft={(id) => editDraft('email', id)}
          onEditPushDraft={(id) => editDraft('push', id)}
        />
      )}
    </div>
  )
}

export default CommunicationsManagement

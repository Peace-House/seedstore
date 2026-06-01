import { forwardRef, useImperativeHandle, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Undo2,
  Redo2,
  Link2,
  Eye,
  Send,
  Save,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  getNewsletterCampaignDetails,
  sendNewsletter,
  saveNewsletterDraft,
  updateNewsletterDraft,
  type NewsletterPreviewFilters,
} from '@/services/user'
import type { TargetingFilters } from './useTargetingFilters'
import type { RecipientPreview } from './RecipientPreview'
import { getApiErrorMessage, type ComposerHandle } from './types'

const TOOLBAR_BUTTON_CLASS =
  'rounded-md border px-2 py-1 text-sm transition-colors hover:bg-muted'
const DEFAULT_NEWSLETTER_HTML =
  '<p>Dear Valued User,</p><p></p><p>We trust you are well.</p><p></p><p>Warm regards,<br/>The Livingseed Team</p>'

interface Props {
  tf: TargetingFilters
  rp: RecipientPreview
  onSent: () => void
}

const EmailComposer = forwardRef<ComposerHandle, Props>(
  ({ tf, rp, onSent }, ref) => {
    const [subject, setSubject] = useState('')
    const [emailsPerMinute, setEmailsPerMinute] = useState('20')
    const [editingDraftId, setEditingDraftId] = useState<string | null>(null)
    const [isSending, setIsSending] = useState(false)
    const [isSavingDraft, setIsSavingDraft] = useState(false)
    const [sendConfirmOpen, setSendConfirmOpen] = useState(false)

    const editor = useEditor({
      extensions: [
        StarterKit,
        Underline,
        Link.configure({
          openOnClick: false,
          HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
        }),
      ],
      content: DEFAULT_NEWSLETTER_HTML,
      editorProps: {
        attributes: {
          class:
            'prose prose-sm max-w-none min-h-[320px] rounded-b-md border border-t-0 px-4 py-3 focus:outline-none',
        },
      },
    })

    const reset = () => {
      setSubject('')
      setEmailsPerMinute('20')
      setEditingDraftId(null)
      tf.resetFilters()
      rp.resetPreview()
      editor?.commands.setContent(DEFAULT_NEWSLETTER_HTML)
    }

    const loadDraft = async (campaignId: string) => {
      const { campaign } = await getNewsletterCampaignDetails(campaignId)
      if (campaign.status !== 'DRAFT') {
        toast.error('Only drafts can be edited')
        return
      }
      const filters = (campaign.filters || {}) as NewsletterPreviewFilters
      tf.applyFilters(filters)
      setSubject(campaign.subject || '')
      setEmailsPerMinute(
        String(filters.emailsPerMinute ?? campaign.emailsPerMinute ?? 20),
      )
      setEditingDraftId(campaignId)
      editor?.commands.setContent(campaign.html || '<p></p>')
      toast.success('Draft loaded into editor')
    }

    useImperativeHandle(ref, () => ({ loadDraft, reset }))

    const validate = () => {
      if (!subject.trim()) {
        toast.error('Please enter an email subject')
        return false
      }
      if (!editor || editor.isEmpty) {
        toast.error('Please add email content before sending')
        return false
      }
      const rate = Number(emailsPerMinute)
      if (!Number.isInteger(rate) || rate < 1 || rate > 30) {
        toast.error('Emails per minute must be an integer between 1 and 30')
        return false
      }
      return true
    }

    const handleSend = async () => {
      if (!validate() || !editor) return
      try {
        setIsSending(true)
        const response = await sendNewsletter({
          ...tf.buildFilters(),
          emailsPerMinute: Number(emailsPerMinute),
          subject: subject.trim(),
          html: editor.getHTML(),
        })
        toast.success(
          `Newsletter queued for ${response.queuedCount} recipients`,
        )
        setSendConfirmOpen(false)
        onSent()
      } catch {
        toast.error('Failed to queue newsletter')
      } finally {
        setIsSending(false)
      }
    }

    const handleSaveDraft = async () => {
      if (!validate() || !editor) return
      try {
        setIsSavingDraft(true)
        const payload = {
          ...tf.buildFilters(),
          emailsPerMinute: Number(emailsPerMinute),
          subject: subject.trim(),
          html: editor.getHTML(),
        }
        if (editingDraftId) {
          await updateNewsletterDraft(editingDraftId, payload)
          toast.success('Draft updated')
        } else {
          const response = await saveNewsletterDraft(payload)
          setEditingDraftId(response.campaignId)
          toast.success('Draft saved')
        }
        onSent()
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Failed to save draft'))
      } finally {
        setIsSavingDraft(false)
      }
    }

    const applyLink = () => {
      if (!editor) return
      const previousUrl = editor.getAttributes('link').href
      const url = window.prompt('Enter URL', previousUrl || 'https://')
      if (url === null) return
      if (url.trim() === '') {
        editor.chain().focus().unsetLink().run()
        return
      }
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: url.trim() })
        .run()
    }

    const editorHtml = editor?.getHTML() || '<p></p>'

    return (
      <div className="grid gap-6 xl:grid-cols-8">
        <Card className="xl:col-span-5">
          <CardHeader>
            <CardTitle className="text-lg">Email Composer</CardTitle>
            {editingDraftId && (
              <p className="text-muted-foreground text-sm">
                Editing draft campaign:{' '}
                <span className="font-medium">{editingDraftId}</span>
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter newsletter subject"
              />
            </div>

            <div className="space-y-2">
              <Label>Emails per minute</Label>
              <Input
                type="number"
                min={1}
                max={30}
                step={1}
                value={emailsPerMinute}
                onChange={(e) => setEmailsPerMinute(e.target.value)}
                placeholder="20"
              />
              <p className="text-muted-foreground text-xs">
                Recommended: 20 to 30 emails per minute. Maximum allowed: 30.
              </p>
            </div>

            <div className="rounded-md border">
              <div className="bg-muted/40 flex flex-wrap gap-2 border-b p-2">
                <button
                  className={TOOLBAR_BUTTON_CLASS}
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  type="button"
                >
                  <Bold className="h-4 w-4" />
                </button>
                <button
                  className={TOOLBAR_BUTTON_CLASS}
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  type="button"
                >
                  <Italic className="h-4 w-4" />
                </button>
                <button
                  className={TOOLBAR_BUTTON_CLASS}
                  onClick={() => editor?.chain().focus().toggleUnderline().run()}
                  type="button"
                >
                  <UnderlineIcon className="h-4 w-4" />
                </button>
                <button
                  className={TOOLBAR_BUTTON_CLASS}
                  onClick={() => editor?.chain().focus().toggleStrike().run()}
                  type="button"
                >
                  <Strikethrough className="h-4 w-4" />
                </button>
                <button
                  className={TOOLBAR_BUTTON_CLASS}
                  onClick={() =>
                    editor?.chain().focus().toggleBulletList().run()
                  }
                  type="button"
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  className={TOOLBAR_BUTTON_CLASS}
                  onClick={() =>
                    editor?.chain().focus().toggleOrderedList().run()
                  }
                  type="button"
                >
                  <ListOrdered className="h-4 w-4" />
                </button>
                <button
                  className={TOOLBAR_BUTTON_CLASS}
                  onClick={() =>
                    editor?.chain().focus().toggleBlockquote().run()
                  }
                  type="button"
                >
                  <Quote className="h-4 w-4" />
                </button>
                <button
                  className={TOOLBAR_BUTTON_CLASS}
                  onClick={applyLink}
                  type="button"
                >
                  <Link2 className="h-4 w-4" />
                </button>
                <button
                  className={TOOLBAR_BUTTON_CLASS}
                  onClick={() => editor?.chain().focus().undo().run()}
                  type="button"
                >
                  <Undo2 className="h-4 w-4" />
                </button>
                <button
                  className={TOOLBAR_BUTTON_CLASS}
                  onClick={() => editor?.chain().focus().redo().run()}
                  type="button"
                >
                  <Redo2 className="h-4 w-4" />
                </button>
              </div>
              <EditorContent editor={editor} />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Button
                style={{ border: '1px solid green' }}
                onClick={rp.openPreview}
                disabled={rp.isPreviewing}
              >
                <Eye className="mr-2 h-4 w-4" />
                {rp.isPreviewing ? 'Preparing preview...' : 'Preview Recipients'}
              </Button>
              <Button
                variant="ghost"
                onClick={reset}
                className="!bg-slate-300 hover:!bg-slate-300/80 hover:!text-black"
              >
                {editingDraftId ? 'Cancel Editing' : 'Discard'}
              </Button>
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={isSavingDraft}
                className="!bg-black !text-white hover:!bg-black/90"
              >
                <Save className="mr-2 h-4 w-4" />
                {isSavingDraft
                  ? 'Saving...'
                  : editingDraftId
                  ? 'Update Draft'
                  : 'Save Draft'}
              </Button>
            </div>
            <div>
              <Button
                variant="default"
                className="w-full"
                onClick={() => setSendConfirmOpen(true)}
                disabled={isSending}
              >
                <Send className="mr-2 h-4 w-4" />
                Send Newsletter
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">Live Email Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/30 rounded-lg border p-3 text-sm">
              <p>
                <span className="font-semibold">To:</span>{' '}
                <span className="font-semibold text-red-600">
                  {rp.previewRecipientCount || 'Not previewed'}
                </span>
              </p>
              <p>
                <span className="font-semibold">Subject:</span>{' '}
                {subject || 'No subject yet'}
              </p>
            </div>
            <div className="max-h-[420px] overflow-y-auto rounded-lg border bg-white p-4">
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: editorHtml }}
              />
            </div>
          </CardContent>
        </Card>

        <Dialog open={sendConfirmOpen} onOpenChange={setSendConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Newsletter</DialogTitle>
              <DialogDescription>
                You are about to queue this email for{' '}
                <span className="font-semibold text-red-600">
                  {rp.previewRecipientCount || 'un-previewed recipients'}
                </span>
                .
              </DialogDescription>
            </DialogHeader>
            <div className="bg-muted/40 space-y-2 rounded-md border p-3 text-sm">
              <p>
                <span className="font-semibold">Subject:</span>{' '}
                {subject || 'No subject'}
              </p>
              <p>
                <span className="font-semibold">Target mode:</span>{' '}
                {tf.targetMode}
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSendConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleSend}
                disabled={isSending}
              >
                {isSending ? 'Queueing...' : 'Confirm Send'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  },
)

EmailComposer.displayName = 'EmailComposer'

export default EmailComposer

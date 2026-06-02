import { useRef, useState } from 'react'
import { Link2, Upload, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { uploadPushImage } from '@/services/push'
import { getApiErrorMessage } from './types'

/**
 * Image picker that supports either pasting an image URL or uploading a file
 * (the file is uploaded via `upload` — defaulting to the push endpoint — and
 * the returned Cloudinary URL becomes the value). Both modes resolve to the
 * same `imageUrl` string. Pass a different `upload` to target another folder
 * (e.g. uploadWhatsNewImage).
 */
const ImageInput = ({
  value,
  onChange,
  upload = uploadPushImage,
}: {
  value: string
  onChange: (url: string) => void
  upload?: (file: File) => Promise<{ imageUrl: string }>
}) => {
  const [mode, setMode] = useState<'link' | 'upload'>('link')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Use a JPEG, PNG, or WEBP image')
      return
    }
    try {
      setUploading(true)
      const { imageUrl } = await upload(file)
      onChange(imageUrl)
      toast.success('Image uploaded')
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Image upload failed'))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => setMode('link')}
          className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${
            mode === 'link'
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-input bg-background'
          }`}
        >
          <Link2 className="h-3 w-3" /> Link
        </button>
        <button
          type="button"
          onClick={() => setMode('upload')}
          className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${
            mode === 'upload'
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-input bg-background'
          }`}
        >
          <Upload className="h-3 w-3" /> Upload
        </button>
      </div>

      {mode === 'link' ? (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://res.cloudinary.com/…"
        />
      ) : (
        <div>
          <Input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploading}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          {uploading && (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Uploading…
            </p>
          )}
        </div>
      )}

      {value && (
        <div className="flex items-center gap-2 rounded-md border p-2">
          <img
            src={value}
            alt="preview"
            className="h-12 w-12 rounded object-cover"
            onError={(e) =>
              ((e.target as HTMLImageElement).style.display = 'none')
            }
          />
          <span className="flex-1 truncate text-xs text-muted-foreground">
            {value}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange('')}
            className="h-7 w-7 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

export default ImageInput

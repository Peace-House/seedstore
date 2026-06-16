import { useEffect, useState } from 'react'
import { Switch } from '@/components/ui/switch'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import {
  getAppFeatureSettings,
  updateAppFeatureSettings,
} from '@/services/admin'

/**
 * Refer & Share master switch, shown under the App Settings tab.
 *
 * Toggles `AppConfig.referralEnabled` on the backend (via the shared
 * /app-config feature-settings API). When off, the mobile app hides the
 * "Refer & Share" entry and the referral endpoints reject — a clean kill
 * switch for the first slice of the referral program.
 */
const ReferralSettings = () => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [initialEnabled, setInitialEnabled] = useState(false)

  const hasChanges = enabled !== initialEnabled

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const data = await getAppFeatureSettings()
        setEnabled(data.referral_enabled)
        setInitialEnabled(data.referral_enabled)
      } catch {
        toast({
          variant: 'destructive',
          title: 'Failed to load settings',
          description: 'Could not load Refer & Share settings.',
        })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [toast])

  const save = async () => {
    setSaving(true)
    try {
      const updated = await updateAppFeatureSettings({
        referral_enabled: enabled,
      })
      setEnabled(updated.referral_enabled)
      setInitialEnabled(updated.referral_enabled)
      toast({
        title: 'Settings updated',
        description: `Refer & Share is now ${updated.referral_enabled ? 'on' : 'off'}.`,
      })
    } catch {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: 'Could not update Refer & Share. Please try again.',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="rounded">
      <CardHeader>
        <CardTitle>Refer &amp; Share</CardTitle>
        <CardDescription>
          Control the referral sharing program for the mobile app.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="font-medium">Enable Refer &amp; Share</p>
            <p className="text-muted-foreground text-sm">
              Lets users share the app with a personal referral code and link.
              Turning this off hides the feature in the mobile app and blocks
              the referral endpoints.
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
            disabled={loading || saving}
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={save} disabled={loading || saving || !hasChanges}>
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default ReferralSettings

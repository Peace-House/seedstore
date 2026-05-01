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
  type AppFeatureSettings,
} from '@/services/admin'

const DEFAULT_SETTINGS: AppFeatureSettings = {
  peer_lending_enabled: true,
  seedstore_lending_enabled: true,
  group_buying_enabled: true,
}

const AdminSettings = () => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<AppFeatureSettings>(DEFAULT_SETTINGS)
  const [initialSettings, setInitialSettings] =
    useState<AppFeatureSettings>(DEFAULT_SETTINGS)

  const hasChanges =
    settings.group_buying_enabled !== initialSettings.group_buying_enabled

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true)
      try {
        const data = await getAppFeatureSettings()
        setSettings(data)
        setInitialSettings(data)
      } catch {
        toast({
          variant: 'destructive',
          title: 'Failed to load settings',
          description: 'Could not load admin feature settings.',
        })
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [toast])

  const toggle = (key: keyof AppFeatureSettings, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const save = async () => {
    setSaving(true)
    try {
      const updated = await updateAppFeatureSettings(settings)
      setSettings(updated)
      setInitialSettings(updated)
      toast({
        title: 'Settings updated',
        description: 'Feature toggles have been saved successfully.',
      })
    } catch {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: 'Could not update feature settings. Please try again.',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="rounded">
      <CardHeader>
        <CardTitle>Feature Controls</CardTitle>
        <CardDescription>
          Manage non-lending platform feature toggles.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="font-medium">Group buying</p>
            <p className="text-muted-foreground text-sm">
              Allow users to purchase books for multiple recipients in one
              checkout.
            </p>
          </div>
          <Switch
            checked={settings.group_buying_enabled}
            onCheckedChange={(v) => toggle('group_buying_enabled', v)}
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

export default AdminSettings

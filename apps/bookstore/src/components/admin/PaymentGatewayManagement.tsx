import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import {
  getAppFeatureSettings,
  updateAppFeatureSettings,
  type AppFeatureSettings,
} from '@/services/admin'

type PaymentToggles = Pick<
  AppFeatureSettings,
  | 'payment_paystack_enabled'
  | 'payment_applepay_enabled'
  | 'payment_flutterwave_enabled'
>

const defaultToggles: PaymentToggles = {
  payment_paystack_enabled: true,
  payment_applepay_enabled: true,
  payment_flutterwave_enabled: true,
}

const PaymentGatewayManagement = () => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toggles, setToggles] = useState<PaymentToggles>(defaultToggles)
  const [initialToggles, setInitialToggles] =
    useState<PaymentToggles>(defaultToggles)

  const hasChanges = useMemo(
    () =>
      toggles.payment_paystack_enabled !==
        initialToggles.payment_paystack_enabled ||
      toggles.payment_applepay_enabled !==
        initialToggles.payment_applepay_enabled ||
      toggles.payment_flutterwave_enabled !==
        initialToggles.payment_flutterwave_enabled,
    [toggles, initialToggles],
  )

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true)
      try {
        const settings = await getAppFeatureSettings()
        const data: PaymentToggles = {
          payment_paystack_enabled: settings.payment_paystack_enabled,
          payment_applepay_enabled: settings.payment_applepay_enabled,
          payment_flutterwave_enabled: settings.payment_flutterwave_enabled,
        }
        setToggles(data)
        setInitialToggles(data)
      } catch {
        toast({
          variant: 'destructive',
          title: 'Failed to load payment settings',
          description: 'Could not load payment gateway configuration.',
        })
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [toast])

  const save = async () => {
    setSaving(true)
    try {
      const updated = await updateAppFeatureSettings(toggles)
      const data: PaymentToggles = {
        payment_paystack_enabled: updated.payment_paystack_enabled,
        payment_applepay_enabled: updated.payment_applepay_enabled,
        payment_flutterwave_enabled: updated.payment_flutterwave_enabled,
      }
      setToggles(data)
      setInitialToggles(data)
      toast({
        title: 'Payment settings updated',
        description: 'Payment gateway availability has been saved.',
      })
    } catch {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: 'Could not update payment gateway settings.',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="rounded">
      <CardHeader>
        <CardTitle>Payment Gateways</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="font-medium">Paystack</p>
            <p className="text-muted-foreground text-sm">
              Card, bank transfer, USSD and related Paystack channels.
            </p>
          </div>
          <Switch
            checked={toggles.payment_paystack_enabled}
            onCheckedChange={(value) =>
              setToggles((prev) => ({
                ...prev,
                payment_paystack_enabled: value,
              }))
            }
            disabled={loading || saving}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="font-medium">Apple Pay</p>
            <p className="text-muted-foreground text-sm">
              Apple Pay checkout option (powered through Flutterwave).
            </p>
          </div>
          <Switch
            checked={toggles.payment_applepay_enabled}
            onCheckedChange={(value) =>
              setToggles((prev) => ({
                ...prev,
                payment_applepay_enabled: value,
              }))
            }
            disabled={loading || saving}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="font-medium">Flutterwave</p>
            <p className="text-muted-foreground text-sm">
              Standard Flutterwave hosted checkout option.
            </p>
          </div>
          <Switch
            checked={toggles.payment_flutterwave_enabled}
            onCheckedChange={(value) =>
              setToggles((prev) => ({
                ...prev,
                payment_flutterwave_enabled: value,
              }))
            }
            disabled={loading || saving}
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={save} disabled={loading || saving || !hasChanges}>
            {saving ? 'Saving...' : 'Save Payment Settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default PaymentGatewayManagement

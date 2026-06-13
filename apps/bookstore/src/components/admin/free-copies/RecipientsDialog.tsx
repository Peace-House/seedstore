import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAllocationRecipients } from '@/hooks/useFreeCopies';

/**
 * Read-only list of the recipients an allocation has been given to.
 * Opened by tapping the "given out" number in the giving-history modal,
 * or an author's "used" count.
 */
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allocationId: string | null;
  holderLabel?: string;
}

export default function RecipientsDialog({
  open,
  onOpenChange,
  allocationId,
  holderLabel,
}: Props) {
  const { data, isLoading } = useAllocationRecipients(open ? allocationId : null);
  const recipients = data?.recipients ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Recipients</DialogTitle>
          <DialogDescription>
            {holderLabel ? `Given out by ${holderLabel}` : 'Who received a copy'}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[420px] overflow-y-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/80 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left">PHCode</th>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Given</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-3 py-6 text-center text-muted-foreground" colSpan={3}>
                    Loading…
                  </td>
                </tr>
              ) : recipients.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-center text-muted-foreground" colSpan={3}>
                    No one yet.
                  </td>
                </tr>
              ) : (
                recipients.map((r, i) => (
                  <tr key={`${r.phcode}-${i}`} className="border-t">
                    <td className="px-3 py-2 font-mono">{r.phcode}</td>
                    <td className="px-3 py-2">{r.name || '-'}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {new Date(r.grantedAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

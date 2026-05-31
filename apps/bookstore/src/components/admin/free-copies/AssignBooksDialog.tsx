import { useState } from 'react';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import PhCodeChipInput from '../PhCodeChipInput';
import { useAssignFreeCopies } from '@/hooks/useFreeCopies';
import { FreeCopyBookRow } from '@/services/adminFreeCopies';

/**
 * Bulk-assign free copies of one or more books to one or more
 * PHCodes. Server validates phcodes against legacyApi and creates
 * FreeCopyGrant rows atomically. Books skip pairs they've already
 * granted and stop at remaining capacity.
 *
 * UX:
 *   - Left column: searchable list of books. Click to (de)select.
 *     Each shows remaining capacity so admin doesn't over-pick.
 *   - Right column: PHCode chip input (Enter / comma / paste).
 *   - Submit: shows summary toast with grantedTotal +
 *     invalidPhcodes count.
 */
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  books: FreeCopyBookRow[];
  preselectedBookId?: number;
}

export default function AssignBooksDialog({
  open,
  onOpenChange,
  books,
  preselectedBookId,
}: Props) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<number>>(
    new Set(preselectedBookId ? [preselectedBookId] : []),
  );
  const [phcodes, setPhcodes] = useState<string[]>([]);

  const assign = useAssignFreeCopies();

  const filtered = books.filter((b) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q)
    );
  });

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAssign = async () => {
    if (selected.size === 0) {
      toast({
        variant: 'destructive',
        title: 'Pick at least one book',
      });
      return;
    }
    if (phcodes.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Add at least one PHCode',
      });
      return;
    }
    try {
      const res = await assign.mutateAsync({
        bookIds: Array.from(selected),
        phcodes,
      });
      const invalid = res.invalidPhcodes?.length ?? 0;
      const skipped = res.summary.reduce(
        (acc, r) => acc + r.skippedDueToCapacity.length,
        0,
      );
      const already = res.summary.reduce(
        (acc, r) => acc + r.alreadyGranted.length,
        0,
      );
      toast({
        title: `Granted ${res.grantedTotal} copies`,
        description: [
          invalid && `${invalid} invalid phcode${invalid === 1 ? '' : 's'}`,
          already && `${already} already had a copy`,
          skipped && `${skipped} skipped (book at capacity)`,
        ]
          .filter(Boolean)
          .join(' · ') || 'All assignments succeeded.',
      });
      onOpenChange(false);
      setSelected(new Set());
      setPhcodes([]);
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Assignment failed',
        description: e?.response?.data?.error ?? e?.message ?? 'Unknown error',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Assign free copies</DialogTitle>
          <DialogDescription>
            Select books on the left, enter PHCodes on the right. Each
            recipient gets one copy of each selected book.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Books column */}
          <div className="space-y-2">
            <Label>Books</Label>
            <Input
              placeholder="Search by title or author"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {selected.size > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {Array.from(selected).map((id) => {
                  const b = books.find((x) => x.id === id);
                  if (!b) return null;
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs"
                    >
                      {b.title}
                      <button
                        type="button"
                        onClick={() => toggle(id)}
                        className="hover:bg-primary/20 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
            <div className="max-h-72 overflow-y-auto border rounded">
              {filtered.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground text-center">
                  No matching books.
                </div>
              ) : (
                filtered.map((b) => {
                  const isSelected = selected.has(b.id);
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => toggle(b.id)}
                      className={`flex items-center justify-between gap-2 w-full text-left px-3 py-2 border-b last:border-b-0 hover:bg-muted ${
                        isSelected ? 'bg-primary/5' : ''
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {b.title}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {b.author}
                        </div>
                      </div>
                      <div className="text-xs whitespace-nowrap">
                        <span
                          className={`font-medium ${
                            b.remaining > 0
                              ? 'text-primary'
                              : 'text-destructive'
                          }`}
                        >
                          {b.remaining}
                        </span>
                        <span className="text-muted-foreground">
                          {' '}
                          / {b.freeCopiesTotal}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* PHCodes column */}
          <div className="space-y-2">
            <Label>PHCodes</Label>
            <PhCodeChipInput
              value={phcodes}
              onChange={setPhcodes}
              placeholder="Paste or type PHCodes"
            />
            <p className="text-xs text-muted-foreground">
              {phcodes.length} recipient{phcodes.length === 1 ? '' : 's'}.
              {selected.size > 0 && phcodes.length > 0 && (
                <>
                  {' '}
                  This will grant up to{' '}
                  <span className="font-medium">
                    {selected.size * phcodes.length}
                  </span>{' '}
                  copies (one per book × per recipient).
                </>
              )}
            </p>
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={assign.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={assign.isPending}>
            {assign.isPending ? 'Assigning…' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

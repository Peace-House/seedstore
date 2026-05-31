import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AdminTable, { TableColumn } from './AdminTable';
import UpdateFreeCopiesDialog from './free-copies/UpdateFreeCopiesDialog';
import AssignBooksDialog from './free-copies/AssignBooksDialog';
import { useFreeCopiesList } from '@/hooks/useFreeCopies';
import { FreeCopyBookRow } from '@/services/adminFreeCopies';
import { Send, Settings } from 'lucide-react';

/**
 * Book Author Access — admin page that surfaces every book's
 * free-copy state and lets the admin both update the total
 * (2FA-gated) and bulk-assign copies by PHCode.
 *
 * Sits under the Administration nav group. Reads via
 * useFreeCopiesList (TanStack Query), so changes from either
 * dialog refresh the table automatically.
 */
export default function BookAuthorAccess() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [q, setQ] = useState('');
  const [updateTarget, setUpdateTarget] =
    useState<FreeCopyBookRow | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignPreselectId, setAssignPreselectId] = useState<
    number | undefined
  >(undefined);

  const { data, isLoading, isFetching } = useFreeCopiesList({
    page,
    pageSize,
    q: q.trim() || undefined,
  });

  const rows = data?.books ?? [];

  const columns: TableColumn<FreeCopyBookRow>[] = [
    {
      label: 'Title',
      sortKey: 'title',
      render: (r) => (
        <div className="min-w-0">
          <div className="font-medium truncate">{r.title}</div>
          <div className="text-xs text-muted-foreground truncate">
            {r.author}
          </div>
        </div>
      ),
    },
    {
      label: 'Author PHCodes',
      render: (r) =>
        r.authorPhcodes.length === 0 ? (
          <span className="text-xs text-muted-foreground italic">none</span>
        ) : (
          <div className="flex flex-wrap gap-1 max-w-[260px]">
            {r.authorPhcodes.slice(0, 4).map((p) => (
              <span
                key={p}
                className="bg-muted text-xs px-1.5 py-0.5 rounded font-mono"
              >
                {p}
              </span>
            ))}
            {r.authorPhcodes.length > 4 && (
              <span className="text-xs text-muted-foreground">
                +{r.authorPhcodes.length - 4}
              </span>
            )}
          </div>
        ),
    },
    {
      label: 'Total',
      sortKey: 'freeCopiesTotal',
      render: (r) => (
        <span className="font-mono text-sm">{r.freeCopiesTotal}</span>
      ),
    },
    {
      label: 'Used',
      sortKey: 'freeCopiesUsed',
      render: (r) => (
        <span className="font-mono text-sm">{r.freeCopiesUsed}</span>
      ),
    },
    {
      label: 'Remaining',
      sortKey: 'remaining',
      render: (r) => (
        <span
          className={`font-mono text-sm font-semibold ${
            r.remaining > 0 ? 'text-primary' : 'text-destructive'
          }`}
        >
          {r.remaining}
        </span>
      ),
    },
  ];

  return (
    <Card className="rounded">
      <CardHeader className="flex flex-row items-start justify-between gap-3 flex-wrap">
        <div>
          <CardTitle>Book Author Access</CardTitle>
          <CardDescription>
            Manage per-book free-copy pools. Update the total via 2FA, or
            distribute copies to readers by PHCode.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search title or author"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            className="w-60"
          />
          <Button
            onClick={() => {
              setAssignPreselectId(undefined);
              setAssignOpen(true);
            }}
          >
            <Send className="h-4 w-4 mr-2" />
            Assign Books to Users
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <AdminTable
          admins={rows}
          loading={isLoading || isFetching}
          page={page}
          pageSize={pageSize}
          total={data?.total ?? 0}
          onPageChange={setPage}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(1);
          }}
          columns={columns}
          renderActions={(r: FreeCopyBookRow) => (
            <div className="flex items-center gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUpdateTarget(r)}
              >
                <Settings className="h-4 w-4 mr-1" />
                Update total
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAssignPreselectId(r.id);
                  setAssignOpen(true);
                }}
                disabled={r.remaining === 0}
              >
                Assign
              </Button>
            </div>
          )}
        />
      </CardContent>

      <UpdateFreeCopiesDialog
        open={!!updateTarget}
        onOpenChange={(o) => !o && setUpdateTarget(null)}
        book={updateTarget}
      />

      <AssignBooksDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        books={rows}
        preselectedBookId={assignPreselectId}
      />
    </Card>
  );
}

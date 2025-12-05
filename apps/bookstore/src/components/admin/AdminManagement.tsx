import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAdmins, getRoles, inviteAdminWithRole, AdminPage, suspendAdmin, unsuspendAdmin } from '@/services/admin';
import { getUsers, UserPage } from '@/services/user';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import AdminTable from './AdminTable';

const AdminManagement = () => {
    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogAction, setDialogAction] = useState<'suspend' | 'unsuspend' | null>(null);
    const [selectedAdmin, setSelectedAdmin] = useState<{ id: string; email: string } | null>(null);

    const { toast } = useToast();
    const queryClient = useQueryClient();

    // (moved up)
    const suspendMutation = useMutation({
        mutationFn: async (adminId: number) => suspendAdmin(adminId),
        onSuccess: () => {
            toast({ title: 'Admin suspended', description: 'Admin has been suspended.' });
            setDialogOpen(false);
            setSelectedAdmin(null);
            setDialogAction(null);
            queryClient.invalidateQueries({ queryKey: ['admins'] });
        },
        onError: (error) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const errorMessage = (error as any)?.response?.data?.message || 'Failed to suspend admin.';
            toast({ variant: 'destructive', title: 'Error', description: errorMessage });
        },
    });
    const unsuspendMutation = useMutation({
        mutationFn: async (adminId: number) => unsuspendAdmin(adminId),
        onSuccess: () => {
            toast({ title: 'Admin unsuspended', description: 'Admin has been unsuspended.' });
            setDialogOpen(false);
            setSelectedAdmin(null);
            setDialogAction(null);
            queryClient.invalidateQueries({ queryKey: ['admins'] });
        },
        onError: (error) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const errorMessage = (error as any)?.response?.data?.message || 'Failed to unsuspend admin.';
            toast({ variant: 'destructive', title: 'Error', description: errorMessage || 'Failed to unsuspend admin.' });
        },
    });
    // (removed duplicate)
    const [inviteEmails, setInviteEmails] = useState('');
    const [inviteRole, setInviteRole] = useState('');

    // Tabs and pagination state
    const [tab, setTab] = useState<'admins' | 'users'>('admins');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Fetch admins (paginated)
    const { data: adminPage, isLoading: loadingAdmins } = useQuery<AdminPage>({
        queryKey: ['admins', page, pageSize],
        queryFn: () => getAdmins(page, pageSize),
        enabled: tab === 'admins',
    });
    // Fetch users (paginated)
    const { data: userPage, isLoading: loadingUsers } = useQuery<UserPage>({
        queryKey: ['users', page, pageSize],
        queryFn: () => getUsers(page, pageSize),
        enabled: tab === 'users',
    });

    // Fetch roles
    const { data: roles, isLoading: loadingRoles } = useQuery({
        queryKey: ['roles'],
        queryFn: getRoles,
    });

    // Invite admin mutation
    const inviteMutation = useMutation({
        mutationFn: ({ emails, role }: { emails: string[]; role: string }) => inviteAdminWithRole(emails, role),
        onSuccess: () => {
            toast({ title: 'Admin(s) invited', description: 'Invitation(s) sent successfully.' });
            setInviteEmails('');
            setInviteRole('');
            queryClient.invalidateQueries({ queryKey: ['admins'] });
        },
        onError: (err: unknown) => {
            let errorMsg = 'Failed to invite admin.';
            if (err && typeof err === 'object' && 'response' in err && err.response && typeof err.response === 'object' && 'data' in err.response && err.response.data && typeof err.response.data === 'object' && 'error' in err.response.data) {
                errorMsg = (err.response as { error?: string }).error || errorMsg;
            }
            toast({ variant: 'destructive', title: 'Error', description: errorMsg });
        },
    });

    return (
        <>
            <div className="flex gap-2 mt-4">
                <Button className='border-none rounded-none px-3 py-1 rounded-tl rounded-tr h-max' variant={tab === 'admins' ? 'default' : 'outline'} onClick={() => { setTab('admins'); setPage(1); }}>
                    Admins
                    {adminPage && (
                        <span className="ml-2 text-xs font-normal bg-primary-foreground text-primary px-1.5 py-0.5 rounded-full">
                            {adminPage.total}
                        </span>
                    )}
                </Button>
                <Button className='border-none rounded-none px-3 py-1 rounded-tl rounded-tr h-max' variant={tab === 'users' ? 'default' : 'outline'} onClick={() => { setTab('users'); setPage(1); }}>
                    Users
                    {userPage && (
                        <span className="ml-2 text-xs font-normal bg-primary-foreground text-primary px-1.5 py-0.5 rounded-full">
                            {userPage.total.toLocaleString()}
                        </span>
                    )}
                </Button>
            </div>
            <Card className='rounded'>
                <CardContent className='px-0'>
                    {tab === 'admins' && (
                        <>
                            <form
                                className="flex px-4 pt-4 flex-col md:flex-row justify-end gap-4 mb-8"
                                onSubmit={e => {
                                    e.preventDefault();
                                    if (!inviteEmails || !inviteRole) return toast({ variant: 'destructive', title: 'Missing fields', description: 'Email(s) and role are required.' });
                                    const emails = inviteEmails.split(',').map(e => e.trim()).filter(Boolean);
                                    if (emails.length === 0) return toast({ variant: 'destructive', title: 'Invalid input', description: 'Please enter at least one valid email.' });
                                    inviteMutation.mutate({ emails, role: inviteRole });
                                }}
                            >
                                <Input
                                    type="text"
                                    placeholder="Admin email(s), comma separated"
                                    value={inviteEmails}
                                    onChange={e => setInviteEmails(e.target.value)}
                                    className="md:max-w-lg placeholder:text-xs text-xs"
                                    required
                                />
                                <select
                                    value={inviteRole}
                                    onChange={e => setInviteRole(e.target.value)}
                                    className="border rounded px-3 py-2 bg-background text-xs"
                                    required
                                    disabled={loadingRoles}
                                >
                                    <option value="">Select role</option>
                                    {roles?.map((role: { id?: string; name: string }) => (
                                        <option key={role.id || role.name} value={role.name}>{role.name}</option>
                                    ))}
                                </select>
                                <Button
                                    type="submit"
                                    liquidGlass={false}
                                    className='text-xs'
                                    disabled={!inviteEmails || !inviteRole || inviteMutation.status === 'pending'}
                                >
                                    Invite Admin
                                </Button>
                            </form>
                            <AdminTable
                                admins={adminPage?.admins || []}
                                loading={loadingAdmins}
                                page={page}
                                pageSize={pageSize}
                                total={adminPage?.total || 0}
                                onPageChange={setPage}
                                onPageSizeChange={size => { setPageSize(size); setPage(1); }}
                                renderActions={admin => (
                                    <>
                                        {admin.role !== 'user' && (
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        className='text-xs px-2 py-1 h-max'
                                                        onClick={() => {
                                                            setDialogOpen(true);
                                                            setDialogAction('suspend');
                                                            setSelectedAdmin(admin);
                                                        }}
                                                    >
                                                        Suspend
                                                    </Button>
                                                </DialogTrigger>
                                            </Dialog>
                                        )}
                                        {admin.role === 'user' && (
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className='text-xs px-2 py-1 h-max'
                                                        onClick={() => {
                                                            setDialogOpen(true);
                                                            setDialogAction('unsuspend');
                                                            setSelectedAdmin(admin);
                                                        }}
                                                    >
                                                        Unsuspend
                                                    </Button>
                                                </DialogTrigger>
                                            </Dialog>
                                        )}
                                    </>
                                )}
                            />
                        </>
                    )}
                    {tab === 'users' && (
                        <AdminTable
                            admins={userPage?.users || []}
                            loading={loadingUsers}
                            page={page}
                            pageSize={pageSize}
                            total={userPage?.total || 0}
                            onPageChange={setPage}
                            onPageSizeChange={size => { setPageSize(size); setPage(1); }}
                        />
                    )}
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>
                                    {dialogAction === 'suspend' ? 'Suspend Admin' : 'Unsuspend Admin'}
                                </DialogTitle>
                                <DialogDescription>
                                    {dialogAction === 'suspend'
                                        ? `Are you sure you want to suspend ${selectedAdmin?.email}? This will demote them to a regular user.`
                                        : `Are you sure you want to unsuspend ${selectedAdmin?.email}? This will restore their admin privileges.`}
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    variant={dialogAction === 'suspend' ? 'destructive' : 'default'}
                                    onClick={() => {
                                        if (dialogAction === 'suspend' && selectedAdmin) {
                                            suspendMutation.mutate(Number(selectedAdmin.id));
                                        } else if (dialogAction === 'unsuspend' && selectedAdmin) {
                                            unsuspendMutation.mutate(Number(selectedAdmin.id));
                                        }
                                    }}
                                    disabled={suspendMutation.isPending || unsuspendMutation.isPending}
                                >
                                    {dialogAction === 'suspend' ? (suspendMutation.isPending ? 'Suspending...' : 'Suspend') : (unsuspendMutation.isPending ? 'Unsuspending...' : 'Unsuspend')}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </CardContent>
            </Card>
        </>
    );
};

export default AdminManagement;

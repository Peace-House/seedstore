import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { User, Bell, Lock, LogOut, Sidebar, ArrowLeft, Smartphone, Monitor, Laptop, Trash2, Menu, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useAuth } from '@/hooks/useAuth';
import { PageLoader } from '@/components/Loader';
import LiquidGlassWrapper from '@/components/LiquidGlassWrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import * as userApi from '@/services/user';

const Settings = () => {
  const { user, loading, signOut, refetchUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tab, setTab] = useState(localStorage.getItem('settings_tab') || 'profile');

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phoneNumber: user?.phoneNumber || '',
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Notification settings state
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    orderUpdates: true,
    promotions: false,
    newBooks: true,
  });

  const navItems = [
    { value: 'profile', label: 'Profile', icon: <User className="w-5 h-5" /> },
    { value: 'devices', label: 'Devices', icon: <Smartphone className="w-5 h-5" /> },
    { value: 'notifications', label: 'Notifications', icon: <Bell className="w-5 h-5" /> },
    { value: 'password', label: 'Change Password', icon: <Lock className="w-5 h-5" /> },
  ];

  // Fetch user sessions/devices
  const {
    data: sessionsData,
    isLoading: sessionsLoading,
    refetch: refetchSessions,
  } = useQuery({
    queryKey: ['userSessions'],
    queryFn: userApi.getUserSessions,
  });

  // Fetch notification preferences
  const {
    data: notificationData,
    isLoading: notificationsLoading,
  } = useQuery({
    queryKey: ['notificationPreferences'],
    queryFn: userApi.getNotificationPreferences,
  });

  // Update notifications state when data is fetched
  useEffect(() => {
    if (notificationData?.preferences) {
      setNotifications({
        emailNotifications: notificationData.preferences.emailNotifications,
        orderUpdates: notificationData.preferences.orderUpdates,
        promotions: notificationData.preferences.promotions,
        newBooks: notificationData.preferences.newBooks,
      });
    }
  }, [notificationData]);

  // Remove session mutation
  const removeSessionMutation = useMutation({
    mutationFn: (sessionId: string) => userApi.removeSession(sessionId),
    onSuccess: () => {
      toast.success('Device removed successfully');
      refetchSessions();
    },
    onError: (error: Error & { response?: { data?: { error?: string } } }) => {
      toast.error(error?.response?.data?.error || 'Failed to remove device');
    },
  });

  // Update notification preferences mutation
  const updateNotificationsMutation = useMutation({
    mutationFn: (prefs: userApi.NotificationPreferences) => userApi.updateNotificationPreferences(prefs),
    onSuccess: () => {
      toast.success('Notification preferences saved');
    },
    onError: (error: Error & { response?: { data?: { error?: string } } }) => {
      toast.error(error?.response?.data?.error || 'Failed to save notification preferences');
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: userApi.UpdateProfileData) => userApi.updateProfile(data),
    onSuccess: () => {
      toast.success('Profile updated successfully');
      refetchUser();
      queryClient.invalidateQueries({ queryKey: ['authUser'] });
    },
    onError: (error: Error & { response?: { data?: { error?: string } } }) => {
      toast.error(error?.response?.data?.error || 'Failed to update profile');
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      userApi.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      toast.success('Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (error: Error & { response?: { data?: { error?: string } } }) => {
      toast.error(error?.response?.data?.error || 'Failed to change password');
    },
  });

  // Update profile form when user data changes
  useEffect(() => {
    if (user) {
      setProfileForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phoneNumber: user.phoneNumber || '',
      });
    }
  }, [user]);

  // Check if profile form has changes
  const hasProfileChanges =
    user &&
    (profileForm.firstName !== (user.firstName || '') ||
      profileForm.lastName !== (user.lastName || '') ||
      profileForm.phoneNumber !== (user.phoneNumber || ''));

  // Check if password form is valid (all fields filled and passwords match)
  const isPasswordFormValid =
    passwordForm.currentPassword.length > 0 &&
    passwordForm.newPassword.length >= 6 &&
    passwordForm.confirmPassword.length > 0 &&
    passwordForm.newPassword === passwordForm.confirmPassword;

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileForm);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <PageLoader />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="flex max-h-screen overflow-hidden bg-transparent">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white/80 backdrop-blur-md border-b px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 rounded-lg hover:bg-muted"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="font-semibold">{navItems.find((item) => item.value === tab)?.label}</span>
        <div className="w-9" /> {/* Spacer for centering */}
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`md:hidden fixed top-0 left-0 bottom-0 w-64 bg-white z-50 transform transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <span className="font-bold text-base">Settings</span>
            <p className="font-bold text-xs text-gray-400 truncate max-w-[180px]">{user.email}</p>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 rounded-lg hover:bg-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 flex flex-col gap-1 py-4">
          {navItems.map((item) => (
            <button
              key={item.value}
              className={`flex items-center gap-3 px-4 py-3 transition-all hover:bg-primary/10 text-left ${
                tab === item.value ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground'
              }`}
              onClick={() => {
                setTab(item.value);
                localStorage.setItem('settings_tab', item.value);
                setMobileMenuOpen(false);
              }}
            >
              {item.icon}
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="border-t py-4">
          <button
            className="flex items-center gap-3 px-4 py-3 hover:bg-black/5 transition-all w-full text-left text-muted-foreground"
            onClick={() => {
              navigate('/');
              setMobileMenuOpen(false);
            }}
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Back</span>
          </button>
          <button
            className="flex items-center gap-3 px-4 py-3 hover:bg-black/5 transition-all w-full hover:text-red-600 text-left text-muted-foreground"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <LiquidGlassWrapper
        liquidGlass={true}
        className={`hidden md:flex transition-all !shadow-md duration-200 h-[98vh] sticky top-0 z-20 flex-col ${sidebarOpen ? 'w-56' : 'w-16'} m-2`}
      >
        <div className="flex items-center justify-between p-4 border-b relative">
          <div>
            <span className={`font-bold text-base transition-all capitalize ${sidebarOpen ? 'opacity-100' : 'opacity-0 w-0'}`}>
              Settings
            </span>
            <p className={`font-bold text-xs text-gray-400 transition-all ${sidebarOpen ? 'opacity-100' : 'opacity-0 w-0'}`}>
              {user.email}
            </p>
          </div>
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className={`p-1 rounded hover:bg-muted absolute z-30 shadow border transition-all duration-200`}
            style={{
              right: '18px',
              top: '50%',
              transform: 'translateY(-50%)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
            aria-label={sidebarOpen ? 'Minimize sidebar' : 'Expand sidebar'}
          >
            <Sidebar className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 flex flex-col gap-2 mt-4">
          {navItems.map((item) => (
            <button
              key={item.value}
              className={`flex items-center gap-3 px-4 py-2 transition-all hover:bg-primary/10 text-left ${
                tab === item.value ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground'
              }`}
              onClick={() => {
                setTab(item.value);
                localStorage.setItem('settings_tab', item.value);
              }}
              title={item.label}
            >
              {item.icon}
              <span className={`text-sm transition-all ${sidebarOpen ? 'opacity-100 ml-2' : 'opacity-0 w-0 ml-0'}`}>
                {item.label}
              </span>
            </button>
          ))}
        </nav>

        <div className="mt-auto border-t py-4">
          <button
            className={`flex items-center gap-3 px-4 py-2 hover:bg-black/5 transition-all w-full text-left text-muted-foreground`}
            onClick={() => navigate('/')}
            title="Back to Home"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className={`transition-all text-sm ${sidebarOpen ? 'opacity-100 ml-2' : 'opacity-0 w-0 ml-0'}`}>
              Back
            </span>
          </button>
          <button
            className={`flex items-center gap-3 px-4 py-2 hover:bg-black/5 transition-all w-full hover:text-red-600 text-left text-muted-foreground`}
            onClick={handleLogout}
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
            <span className={`transition-all text-sm ${sidebarOpen ? 'opacity-100 ml-2' : 'opacity-0 w-0 ml-0'}`}>
              Logout
            </span>
          </button>
        </div>
      </LiquidGlassWrapper>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 custom-scrollbar overflow-y-auto pt-20 md:pt-8">
        <h1 className="hidden md:block text-3xl font-bold mb-8">{navItems.find((item) => item.value === tab)?.label}</h1>

        {/* Profile Section */}
        {tab === 'profile' && (
          <LiquidGlassWrapper liquidGlass={true} className="max-w-2xl p-4 md:p-6">
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-10 h-10 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold capitalize">
                    {user.firstName} {user.lastName}
                  </h2>
                  <p className="text-muted-foreground">{user.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={profileForm.firstName}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Enter your first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profileForm.lastName}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Enter your last name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user.email} disabled className="bg-muted cursor-not-allowed" />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>

              {user.phcode && (
                <div className="space-y-2">
                  <Label htmlFor="phcode">PH Code</Label>
                  <Input id="phcode" value={user.phcode} disabled className="bg-muted cursor-not-allowed" />
                  <p className="text-xs text-muted-foreground">Your unique Peace House code</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  value={profileForm.phoneNumber}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                  placeholder="Enter your phone number"
                />
              </div>

              <Button liquidGlass={false} type="submit" disabled={updateProfileMutation.isPending || !hasProfileChanges}>
                {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </LiquidGlassWrapper>
        )}

        {/* Devices Section */}
        {tab === 'devices' && (
          <LiquidGlassWrapper liquidGlass={true} className="max-w-2xl p-4 md:p-6">
            <div className="space-y-6">
              <div className="mb-1">
                  <p className="text-muted-foreground">
                    Manage your logged-in devices. You can be logged in on up to 3 devices at a time.
                  </p>
              </div>

              <div>
                <div className="text-sm font-medium text-primary mb-2 flex items-center justify-end">
                  {sessionsData?.total || 0}/3 devices
                </div>

              {sessionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : sessionsData?.sessions && sessionsData.sessions.length > 0 ? (
                <div className="space-y-3">
                  {sessionsData.sessions.map((session) => {
                    const getPlatformIcon = (platform: string) => {
                      const p = platform.toLowerCase();
                      if (p.includes('mobile') || p.includes('android') || p.includes('ios')) {
                        return <Smartphone className="w-5 h-5" />;
                      }
                      if (p.includes('desktop') || p.includes('windows') || p.includes('mac')) {
                        return <Monitor className="w-5 h-5" />;
                      }
                      return <Laptop className="w-5 h-5" />;
                    };

                    const formatDate = (dateString: string) => {
                      const date = new Date(dateString);
                      return date.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                    };

                    return (
                      <div
                        key={session.id}
                        className={`flex items-center justify-between p-4 rounded-lg border ${
                          session.isCurrent ? 'border-primary bg-primary/5' : 'border-border'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`p-2 rounded-full shrink-0 ${session.isCurrent ? 'bg-primary/10 text-primary' : 'bg-muted'}`}>
                            {getPlatformIcon(session.platform)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-medium truncate">{session.deviceName || session.platform || 'Unknown Device'}</h3>
                              {session.isCurrent && (
                                <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full shrink-0">
                                  Current
                                </span>
                              )}
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">
                              {session.location && session.location !== 'Unknown Location' && (
                                <span>{session.location} • </span>
                              )}
                              Logged in {formatDate(session.createdAt)}
                            </p>
                          </div>
                        </div>
                        {!session.isCurrent && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
                            onClick={() => removeSessionMutation.mutate(session.id)}
                            disabled={removeSessionMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4 sm:mr-1" />
                            <span className="hidden sm:inline">Remove</span>
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No active sessions found.
                </div>
              )}
              </div>

              <p className="text-xs text-muted-foreground mt-4">
                Note: Removing a device will log it out immediately. That device will need to log in again to access your account.
              </p>
            </div>
          </LiquidGlassWrapper>
        )}

        {/* Notifications Section */}
        {tab === 'notifications' && (
          <LiquidGlassWrapper liquidGlass={true} className="max-w-2xl p-4 md:p-6">
            <div className="space-y-6">
              <p className="text-muted-foreground mb-6">Manage how you receive notifications and updates.</p>

              {notificationsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <h3 className="font-medium">Email Notifications</h3>
                    <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                  </div>
                  <Switch
                    checked={notifications.emailNotifications}
                    onCheckedChange={(checked) => {
                      const newNotifications = { ...notifications, emailNotifications: checked };
                      setNotifications(newNotifications);
                      updateNotificationsMutation.mutate(newNotifications);
                    }}
                    disabled={updateNotificationsMutation.isPending}
                  />
                </div>

                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <h3 className="font-medium">Order Updates</h3>
                    <p className="text-sm text-muted-foreground">Get notified about your order status</p>
                  </div>
                  <Switch
                    checked={notifications.orderUpdates}
                    onCheckedChange={(checked) => {
                      const newNotifications = { ...notifications, orderUpdates: checked };
                      setNotifications(newNotifications);
                      updateNotificationsMutation.mutate(newNotifications);
                    }}
                    disabled={updateNotificationsMutation.isPending}
                  />
                </div>

                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <h3 className="font-medium">Promotions & Offers</h3>
                    <p className="text-sm text-muted-foreground">Receive special offers and discounts</p>
                  </div>
                  <Switch
                    checked={notifications.promotions}
                    onCheckedChange={(checked) => {
                      const newNotifications = { ...notifications, promotions: checked };
                      setNotifications(newNotifications);
                      updateNotificationsMutation.mutate(newNotifications);
                    }}
                    disabled={updateNotificationsMutation.isPending}
                  />
                </div>

                <div className="flex items-center justify-between py-3">
                  <div>
                    <h3 className="font-medium">New Book Releases</h3>
                    <p className="text-sm text-muted-foreground">Be notified when new books are available</p>
                  </div>
                  <Switch
                    checked={notifications.newBooks}
                    onCheckedChange={(checked) => {
                      const newNotifications = { ...notifications, newBooks: checked };
                      setNotifications(newNotifications);
                      updateNotificationsMutation.mutate(newNotifications);
                    }}
                    disabled={updateNotificationsMutation.isPending}
                  />
                </div>
              </div>
              )}

              <p className="text-xs text-muted-foreground mt-4">
                Your notification preferences are saved automatically.
              </p>
            </div>
          </LiquidGlassWrapper>
        )}

        {/* Change Password Section */}
        {tab === 'password' && (
          <LiquidGlassWrapper liquidGlass={true} className="max-w-2xl p-4 md:p-6">
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <p className="text-muted-foreground mb-6">
                Update your password to keep your account secure. Make sure to use a strong password.
              </p>

              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                  placeholder="Enter your current password"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Enter your new password"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Confirm your new password"
                  required
                />
              </div>

              <Button liquidGlass={false} type="submit" disabled={changePasswordMutation.isPending || !isPasswordFormValid}>
                {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
              </Button>
            </form>
          </LiquidGlassWrapper>
        )}
      </main>
    </div>
  );
};

export default Settings;

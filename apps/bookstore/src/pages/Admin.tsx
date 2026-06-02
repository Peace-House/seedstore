import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  BookOpen,
  Upload,
  ClipboardList,
  List,
  LogOut,
  Sidebar,
  LayoutDashboard,
  User2,
  Users,
  CopyCheck,
  Rotate3D,
  RotateCcw,
  Menu,
  X,
  CreditCard,
  Mail,
  Wallet,
  Smartphone,
  Bell,
  MapPin,
  Sparkles,
  ChevronDown,
  ChevronRight,
  BookCheck,
} from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import AdminLogs from '@/components/admin/AdminLogs'
import BookUpload from '@/components/admin/BookUpload'
import BookManagement from '@/components/admin/BookManagement'
import OrderManagement from '@/components/admin/OrderManagement'
import AdminManagement from '@/components/admin/AdminManagement'
import AdminOverview from '@/components/admin/AdminOverview'
import TransactionManagement from '@/components/admin/TransactionManagement'
import { PageLoader } from '@/components/Loader'
import Logo from '@/components/Logo'
import EPUBConverter from '@/components/admin/Converter'
import LiquidGlassWrapper from '@/components/LiquidGlassWrapper'
import PricingManagement from '@/components/admin/PricingManagement'
import LendingManagement from '@/components/admin/LendingManagement'
import GroupBuyingManagement from '@/components/admin/GroupBuyingManagement'
import CommunicationsManagement from '@/components/admin/CommunicationsManagement'
import OutreachManagement from '@/components/admin/OutreachManagement'
import PaymentGatewayManagement from '@/components/admin/PaymentGatewayManagement'
import AppUpdateSettings from '@/components/admin/AppUpdateSettings'
import AppVersioningManagement from '@/components/admin/AppVersioningManagement'
import EmailSettings from '@/components/admin/EmailSettings'
import BookAuthorAccess from '@/components/admin/BookAuthorAccess'
import { Library } from 'lucide-react'

const Admin = () => {
  const { user, loading } = useAuth()

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [tab, setTab] = useState(() => {
    const stored = localStorage.getItem('admin_tab') || 'overview'
    // Newsletter + Push were merged into a single Communications tab.
    return stored === 'newsletter' || stored === 'push'
      ? 'communications'
      : stored
  })
  const navigate = useNavigate()
  const navGroups: Array<{
    id: string
    label: string | null
    items: Array<{ value: string; label: string; icon: JSX.Element }>
  }> = [
    {
      id: 'overview',
      label: null,
      items: [
        { value: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-5 w-5" /> },
      ],
    },
    {
      id: 'catalog',
      label: 'Catalog',
      items: [
        { value: 'upload', label: 'Upload Book', icon: <Upload className="h-5 w-5" /> },
        { value: 'manage', label: 'Books', icon: <BookOpen className="h-5 w-5" /> },
        { value: 'pricing', label: 'Pricing', icon: <CopyCheck className="h-5 w-5" /> },
        { value: 'lend', label: 'Lending', icon: <Library className="h-5 w-5" /> },
        { value: 'group-buy', label: 'Group Buying', icon: <Users className="h-5 w-5" /> },
        { value: 'converter', label: 'Converter', icon: <RotateCcw className="h-5 w-5" /> },
      ],
    },
    {
      id: 'commerce',
      label: 'Commerce',
      items: [
        { value: 'orders', label: 'Orders', icon: <ClipboardList className="h-5 w-5" /> },
        { value: 'transactions', label: 'Transactions', icon: <CreditCard className="h-5 w-5" /> },
        { value: 'payment-gateways', label: 'Payment Gateways', icon: <Wallet className="h-5 w-5" /> },
      ],
    },
    {
      id: 'platform',
      label: 'Platform',
      items: [
        { value: 'app-settings', label: 'App Settings', icon: <Smartphone className="h-5 w-5" /> },
        { value: 'app-versioning', label: 'Whats New & Badges', icon: <Sparkles className="h-5 w-5" /> },
        { value: 'email-settings', label: 'Email Settings', icon: <Mail className="h-5 w-5" /> },
      ],
    },
    {
      id: 'outreach',
      label: 'Outreach',
      items: [
        { value: 'communications', label: 'Communications', icon: <Bell className="h-5 w-5" /> },
        { value: 'locations', label: 'Locations', icon: <MapPin className="h-5 w-5" /> },
      ],
    },
    {
      id: 'administration',
      label: 'Administration',
      items: [
        { value: 'admins', label: 'Users', icon: <Users className="h-5 w-5" /> },
        { value: 'book-author-access', label: 'Book Author Access', icon: <BookCheck className="h-5 w-5" /> },
        { value: 'logs', label: 'Logs', icon: <List className="h-5 w-5" /> },
      ],
    },
  ]

  const allNavItems = navGroups.flatMap((g) => g.items)

  // Collapsed/expanded state per group. Persist user toggles in localStorage;
  // on first mount, expand only the group containing the active tab.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const stored = localStorage.getItem('admin_nav_open_groups')
    if (stored) {
      try {
        return JSON.parse(stored) as Record<string, boolean>
      } catch {
        // fall through to default
      }
    }
    const activeGroupId = navGroups.find((g) => g.items.some((i) => i.value === tab))?.id
    return navGroups.reduce<Record<string, boolean>>((acc, g) => {
      acc[g.id] = g.label === null || g.id === activeGroupId
      return acc
    }, {})
  })

  const persistOpenGroups = (next: Record<string, boolean>) => {
    setOpenGroups(next)
    localStorage.setItem('admin_nav_open_groups', JSON.stringify(next))
  }

  const toggleGroup = (id: string) => {
    persistOpenGroups({ ...openGroups, [id]: !openGroups[id] })
  }

  const selectTab = (value: string, closeMobile?: boolean) => {
    setTab(value)
    localStorage.setItem('admin_tab', value)
    // Ensure the group containing the new tab is expanded so the active
    // highlight is always visible after navigation.
    const group = navGroups.find((g) => g.items.some((i) => i.value === value))
    if (group && !openGroups[group.id]) {
      persistOpenGroups({ ...openGroups, [group.id]: true })
    }
    if (closeMobile) setMobileMenuOpen(false)
  }

  useEffect(() => {
    if (!allNavItems.some((item) => item.value === tab)) {
      setTab('overview')
      localStorage.setItem('admin_tab', 'overview')
    }
  }, [tab])

  if (loading) {
    return (
      <>
        {/* <Navbar /> */}
        <div className="flex min-h-screen items-center justify-center">
          <PageLoader />
        </div>
      </>
    )
  }

  if (
    !user ||
    !(
      ['admin', 'super_admin'].includes(user.role?.toLowerCase()) ||
      user.isAdmin
    )
  ) {
    return <Navigate to="/" replace />
  }

  return (
    <>
      <div className="flex max-h-screen overflow-hidden bg-transparent">
        {/* Mobile Header */}
        <div className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between border-b bg-white/80 px-4 py-3 backdrop-blur-md md:hidden">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="hover:bg-muted rounded-lg p-2"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold">
            {allNavItems.find((item) => item.value === tab)?.label}
          </span>
          <div className="w-9" /> {/* Spacer for centering */}
        </div>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Mobile Sidebar */}
        <div
          className={`fixed top-0 left-0 bottom-0 z-50 w-64 transform bg-white transition-transform duration-300 ease-in-out md:hidden ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between border-b p-4">
            <Logo withText={true} />
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="hover:bg-muted rounded-lg p-2"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="border-b px-4 py-3">
            <span className="text-base font-bold capitalize">
              {user.firstName}
            </span>
            <p className="text-xs font-bold text-gray-400">{user.role}</p>
          </div>

          <nav className="flex max-h-[calc(100vh-200px)] flex-1 flex-col gap-1 overflow-y-auto py-4">
            {navGroups.map((group) => {
              const isOpen = openGroups[group.id] ?? false
              return (
                <div key={group.id} className="flex flex-col">
                  {group.label && (
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.id)}
                      className="text-muted-foreground hover:bg-primary/5 flex items-center justify-between px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors"
                    >
                      <span>{group.label}</span>
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  )}
                  {(group.label === null || isOpen) &&
                    group.items.map((item) => (
                      <button
                        key={item.value}
                        className={`hover:bg-primary/10 flex items-center gap-3 px-4 py-3 text-left transition-all ${
                          tab === item.value
                            ? 'bg-primary/10 text-primary font-semibold'
                            : 'text-muted-foreground'
                        }`}
                        onClick={() => selectTab(item.value, true)}
                      >
                        {item.icon}
                        <span className="text-sm">{item.label}</span>
                      </button>
                    ))}
                </div>
              )
            })}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 border-t bg-white py-4">
            <button
              className="text-red-600 flex w-full items-center gap-3 px-4 py-3 text-left transition-all hover:bg-red-50 hover:text-red-700"
              onClick={() => {
                navigate('/')
                setMobileMenuOpen(false)
              }}
            >
              <LogOut className="h-5 w-5 rotate-180" />
              <span className="text-sm">Leave</span>
            </button>
          </div>
        </div>

        {/* Desktop Sidebar */}
        <LiquidGlassWrapper
          liquidGlass={false}
          className={`sticky top-0 z-20 hidden h-[98vh] flex-col !shadow-md transition-all duration-200 md:flex ${
            sidebarOpen ? 'w-56' : 'w-16'
          } !bg-primary/10 m-2`}
        >
          <Logo withText={sidebarOpen} />

          <div className="relative flex items-center justify-between border-b p-4">
            <div>
              <span
                className={`text-base font-bold capitalize transition-all ${
                  sidebarOpen ? 'opacity-100' : 'w-0 opacity-0'
                }`}
              >
                {user.firstName}
              </span>
              <p
                className={`text-xs font-bold text-gray-400 transition-all ${
                  sidebarOpen ? 'opacity-100' : 'w-0 opacity-0'
                }`}
              >
                {user.role}
              </p>
            </div>
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className={`hover:bg-muted absolute z-30 rounded border p-1 shadow transition-all duration-200`}
              style={{
                right: '18px',
                top: '50%',
                transform: 'translateY(-50%)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
              aria-label={sidebarOpen ? 'Minimize sidebar' : 'Expand sidebar'}
            >
              {<Sidebar className="h-5 w-5" />}
            </button>
          </div>
          <nav className="mt-4 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
            {sidebarOpen
              ? navGroups.map((group) => {
                  const isOpen = openGroups[group.id] ?? false
                  return (
                    <div key={group.id} className="flex flex-col">
                      {group.label && (
                        <button
                          type="button"
                          onClick={() => toggleGroup(group.id)}
                          className="text-muted-foreground hover:bg-primary/5 mt-2 flex items-center justify-between px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-colors"
                        >
                          <span>{group.label}</span>
                          {isOpen ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                      {(group.label === null || isOpen) &&
                        group.items.map((item) => (
                          <button
                            key={item.value}
                            className={`hover:bg-primary/10 flex items-center gap-3 px-4 py-2 text-left transition-all ${
                              tab === item.value
                                ? 'bg-primary/10 text-primary font-semibold'
                                : 'text-muted-foreground'
                            }`}
                            onClick={() => selectTab(item.value)}
                            title={item.label}
                          >
                            {item.icon}
                            <span className="ml-2 text-sm">{item.label}</span>
                          </button>
                        ))}
                    </div>
                  )
                })
              : allNavItems.map((item) => (
                  <button
                    key={item.value}
                    className={`hover:bg-primary/10 flex items-center gap-3 px-4 py-2 text-left transition-all ${
                      tab === item.value
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-muted-foreground'
                    }`}
                    onClick={() => selectTab(item.value)}
                    title={item.label}
                  >
                    {item.icon}
                  </button>
                ))}
          </nav>
          <div className="mt-auto border-t py-4">
            <button
              className={`text-red-600 flex w-full items-center gap-3  px-4 py-2 text-left transition-all hover:bg-red-50 hover:text-red-700`}
              onClick={() => {
                navigate('/')
              }}
              title={''}
            >
              <LogOut className="h-5 w-5 rotate-180" />
              <span
                className={`text-sm transition-all ${
                  sidebarOpen ? 'ml-2 opacity-100' : 'ml-0 w-0 opacity-0'
                }`}
              >
                {'Leave'}
              </span>
            </button>
          </div>
        </LiquidGlassWrapper>
        {/* Main Content */}
        <main className="custom-scrollbar flex-1 overflow-y-auto p-4 pt-20 md:p-8 md:pt-8">
          <h1 className="mb-8 hidden text-3xl font-bold md:block">
            {allNavItems.find((item) => item.value === tab)?.label}
          </h1>
          {tab === 'overview' && <AdminOverview />}
          {tab === 'upload' && <BookUpload />}
          {tab === 'manage' && <BookManagement />}
          {tab === 'pricing' && <PricingManagement />}
          {tab === 'orders' && <OrderManagement />}
          {tab === 'lend' && <LendingManagement />}
          {tab === 'group-buy' && <GroupBuyingManagement />}
          {tab === 'transactions' && <TransactionManagement />}
          {tab === 'payment-gateways' && <PaymentGatewayManagement />}
          {tab === 'app-settings' && <AppUpdateSettings />}
          {tab === 'app-versioning' && <AppVersioningManagement />}
          {tab === 'email-settings' && <EmailSettings />}
          {tab === 'converter' && <EPUBConverter />}
          {tab === 'admins' && <AdminManagement />}
          {tab === 'book-author-access' && <BookAuthorAccess />}
          {tab === 'logs' && <AdminLogs />}
          {tab === 'communications' && (
            <CommunicationsManagement defaultChannel="email" />
          )}
          {tab === 'locations' && <OutreachManagement />}
        </main>
      </div>
    </>
  )
}

export default Admin

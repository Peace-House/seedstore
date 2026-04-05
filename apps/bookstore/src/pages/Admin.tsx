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
import { Library } from 'lucide-react'

const Admin = () => {
  const { user, loading } = useAuth()

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [tab, setTab] = useState(
    localStorage.getItem('admin_tab') || 'overview',
  )
  const navigate = useNavigate()
  const navItems = [
    {
      value: 'overview',
      label: 'Overview',
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      value: 'upload',
      label: 'Upload Book',
      icon: <Upload className="h-5 w-5" />,
    },
    { value: 'manage', label: 'Books', icon: <BookOpen className="h-5 w-5" /> },
    {
      value: 'pricing',
      label: 'Pricing',
      icon: <CopyCheck className="h-5 w-5" />,
    },
    {
      value: 'orders',
      label: 'Orders',
      icon: <ClipboardList className="h-5 w-5" />,
    },
    { value: 'lend', label: 'Lending', icon: <Library className="h-5 w-5" /> },
    {
      value: 'group-buy',
      label: 'Group Buying',
      icon: <Users className="h-5 w-5" />,
    },
    {
      value: 'transactions',
      label: 'Transactions',
      icon: <CreditCard className="h-5 w-5" />,
    },
    {
      value: 'converter',
      label: 'Converter',
      icon: <RotateCcw className="h-5 w-5" />,
    },
    { value: 'admins', label: 'Users', icon: <Users className="h-5 w-5" /> },
    { value: 'logs', label: 'Logs', icon: <List className="h-5 w-5" /> },
  ]

  useEffect(() => {
    if (!navItems.some((item) => item.value === tab)) {
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
            {navItems.find((item) => item.value === tab)?.label}
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
            {navItems.map((item) => (
              <button
                key={item.value}
                className={`hover:bg-primary/10 flex items-center gap-3 px-4 py-3 text-left transition-all ${
                  tab === item.value
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-muted-foreground'
                }`}
                onClick={() => {
                  setTab(item.value)
                  localStorage.setItem('admin_tab', item.value)
                  setMobileMenuOpen(false)
                }}
              >
                {item.icon}
                <span className="text-sm">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 border-t bg-white py-4">
            <button
              className="text-muted-foreground flex w-full items-center gap-3 px-4 py-3 text-left transition-all hover:bg-black/5 hover:text-red-600"
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
          <nav className="mt-4 flex flex-1 flex-col gap-2">
            {navItems.map((item) => (
              <button
                key={item.value}
                className={`hover:bg-primary/10 flex items-center gap-3 px-4  py-2 text-left transition-all ${
                  tab === item.value
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-muted-foreground'
                }`}
                onClick={() => {
                  setTab(item.value)
                  localStorage.setItem('admin_tab', item.value)
                }}
                title={item.label}
              >
                {item.icon}
                <span
                  className={` text-sm transition-all ${
                    sidebarOpen ? 'ml-2 opacity-100' : 'ml-0 w-0 opacity-0'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            ))}
          </nav>
          <div className="mt-auto border-t py-4">
            <button
              className={`text-muted-foreground flex w-full items-center gap-3  px-4 py-2 text-left transition-all hover:bg-black/5 hover:text-red-600`}
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
            {navItems.find((item) => item.value === tab)?.label}
          </h1>
          {tab === 'overview' && <AdminOverview />}
          {tab === 'upload' && <BookUpload />}
          {tab === 'manage' && <BookManagement />}
          {tab === 'pricing' && <PricingManagement />}
          {tab === 'orders' && <OrderManagement />}
          {tab === 'lend' && <LendingManagement />}
          {tab === 'group-buy' && <GroupBuyingManagement />}
          {tab === 'transactions' && <TransactionManagement />}
          {tab === 'converter' && <EPUBConverter />}
          {tab === 'admins' && <AdminManagement />}
          {tab === 'logs' && <AdminLogs />}
        </main>
      </div>
    </>
  )
}

export default Admin

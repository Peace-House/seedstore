import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { BookOpen, Upload, ClipboardList, List, LogOut, Sidebar, LayoutDashboard, User2, Users, CopyCheck, Rotate3D, RotateCcw, Menu, X, CreditCard } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import AdminLogs from '@/components/admin/AdminLogs';
import BookUpload from '@/components/admin/BookUpload';
import BookManagement from '@/components/admin/BookManagement';
import OrderManagement from '@/components/admin/OrderManagement';
import AdminManagement from '@/components/admin/AdminManagement';
import AdminOverview from '@/components/admin/AdminOverview';
import TransactionManagement from '@/components/admin/TransactionManagement';
import { PageLoader } from '@/components/Loader';
import Logo from '@/components/Logo';
import EPUBConverter from '@/components/admin/Converter';
import LiquidGlassWrapper from '@/components/LiquidGlassWrapper';
import PricingManagement from '@/components/admin/PricingManagement';

const Admin = () => {
  const { user, loading } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tab, setTab] = useState(localStorage.getItem('admin_tab') || 'overview');
  const navigate = useNavigate()
  const navItems = [
    { value: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-5 h-5" /> },
    { value: 'upload', label: 'Upload Book', icon: <Upload className="w-5 h-5" /> },
    { value: 'manage', label: 'Books', icon: <BookOpen className="w-5 h-5" /> },
    { value: 'pricing', label: 'Pricing', icon: <CopyCheck className="w-5 h-5" /> },
    { value: 'orders', label: 'Orders', icon: <ClipboardList className="w-5 h-5" /> },
    { value: 'transactions', label: 'Transactions', icon: <CreditCard className="w-5 h-5" /> },
    { value: 'converter', label: 'Converter', icon: <RotateCcw className="w-5 h-5" /> },
    { value: 'admins', label: 'Users', icon: <Users className="w-5 h-5" /> },
    { value: 'logs', label: 'Logs', icon: <List className="w-5 h-5" /> },
  ];

  if (loading) {
    return (
      <>
        {/* <Navbar /> */}
        <div className="min-h-screen flex items-center justify-center">
          <PageLoader />
        </div>
      </>
    );
  }

  if (!user || !(['admin', 'super_admin'].includes(user.role?.toLowerCase()) || user.isAdmin)) {
    return <Navigate to="/" replace />;
  }

  return (
    <>

      <div className="flex max-h-screen overflow-hidden bg-transparent">
        {/* Mobile Header */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white/80 backdrop-blur-md border-b px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-lg hover:bg-muted"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-semibold">{navItems.find(item => item.value === tab)?.label}</span>
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
            <Logo withText={true} />
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg hover:bg-muted"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-4 py-3 border-b">
            <span className="font-bold text-base capitalize">{user.firstName}</span>
            <p className="font-bold text-xs text-gray-400">{user.role}</p>
          </div>

          <nav className="flex-1 flex flex-col gap-1 py-4 overflow-y-auto max-h-[calc(100vh-200px)]">
            {navItems.map(item => (
              <button
                key={item.value}
                className={`flex items-center gap-3 px-4 py-3 transition-all hover:bg-primary/10 text-left ${
                  tab === item.value ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground'
                }`}
                onClick={() => {
                  setTab(item.value);
                  localStorage.setItem('admin_tab', item.value);
                  setMobileMenuOpen(false);
                }}
              >
                {item.icon}
                <span className="text-sm">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="border-t py-4 absolute bottom-0 left-0 right-0 bg-white">
            <button
              className="flex items-center gap-3 px-4 py-3 hover:bg-black/5 transition-all w-full hover:text-red-600 text-left text-muted-foreground"
              onClick={() => {
                navigate('/');
                setMobileMenuOpen(false);
              }}
            >
              <LogOut className="w-5 h-5 rotate-180" />
              <span className="text-sm">Leave</span>
            </button>
          </div>
        </div>

        {/* Desktop Sidebar */}
        <LiquidGlassWrapper liquidGlass={true} className={`hidden md:flex transition-all !shadow-md duration-200 h-[98vh] sticky top-0 z-20 flex-col ${sidebarOpen ? 'w-56' : 'w-16'} m-2`}>
            <Logo withText={sidebarOpen} />

          <div className="flex items-center justify-between p-4 border-b relative">
            <div>
              <span className={`font-bold text-base transition-all capitalize ${sidebarOpen ? 'opacity-100' : 'opacity-0 w-0'}`}>{user.firstName}</span>
              <p className={`font-bold text-xs text-gray-400 transition-all ${sidebarOpen ? 'opacity-100' : 'opacity-0 w-0'}`}>{user.role}</p>
            </div>
            <button
              onClick={() => setSidebarOpen(v => !v)}
              className={`p-1 rounded hover:bg-muted absolute z-30 shadow border transition-all duration-200`}
              style={{
                right: '18px',
                top: '50%',
                transform: 'translateY(-50%)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
              aria-label={sidebarOpen ? 'Minimize sidebar' : 'Expand sidebar'}
            >

              {<Sidebar className="w-5 h-5" />}
            </button>
          </div>
          <nav className="flex-1 flex flex-col gap-2 mt-4">
            {navItems.map(item => (
              <button
                key={item.value}
                className={`flex items-center gap-3 px-4 py-2  transition-all hover:bg-primary/10 text-left ${tab === item.value ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground'}`}
                onClick={() => { setTab(item.value); localStorage.setItem('admin_tab', item.value) }}
                title={item.label}
              >
                {item.icon}
                <span className={` text-sm transition-all ${sidebarOpen ? 'opacity-100 ml-2' : 'opacity-0 w-0 ml-0'}`}>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className='mt-auto border-t py-4'>
            <button
              className={`flex items-center gap-3 px-4 py-2  hover:bg-black/5 transition-all w-full hover:text-red-600 text-left text-muted-foreground`}
              onClick={() => { navigate('/') }}
              title={''}
            >
              <LogOut className="w-5 h-5 rotate-180" />
              <span className={`transition-all text-sm ${sidebarOpen ? 'opacity-100 ml-2' : 'opacity-0 w-0 ml-0'}`}>{"Leave"}</span>
            </button>
          </div>
        </LiquidGlassWrapper>
        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 custom-scrollbar overflow-y-auto pt-20 md:pt-8">
          <h1 className="hidden md:block text-3xl font-bold mb-8">
            {navItems.find(item => item.value === tab)?.label}
          </h1>
          {tab === 'overview' && <AdminOverview />}
          {tab === 'upload' && <BookUpload />}
          {tab === 'manage' && <BookManagement />}
          {tab === 'pricing' && <PricingManagement />}
          {tab === 'orders' && <OrderManagement />}
          {tab === 'transactions' && <TransactionManagement />}
          {tab === 'converter' && <EPUBConverter />}
          {tab === 'admins' && <AdminManagement />}
          {tab === 'logs' && <AdminLogs />}
        </main>
      </div>
    </>
  );
};

export default Admin;

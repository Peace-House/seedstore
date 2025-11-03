import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { BookOpen, Upload, ClipboardList, List, LogOut, Sidebar, LayoutDashboard, User2, Users, CopyCheck, Rotate3D, RotateCcw } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import AdminLogs from '@/components/admin/AdminLogs';
import BookUpload from '@/components/admin/BookUpload';
import BookManagement from '@/components/admin/BookManagement';
import OrderManagement from '@/components/admin/OrderManagement';
import AdminManagement from '@/components/admin/AdminManagement';
import AdminOverview from '@/pages/admin/AdminOverview';
import { PageLoader } from '@/components/Loader';
import Logo from '@/components/Logo';
import EPUBConverter from '@/components/admin/Converter';

const Admin = () => {
  const { user, loading } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tab, setTab] = useState(localStorage.getItem('admin_tab') || 'overview');
  const navigate = useNavigate()
  const navItems = [
    { value: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-5 h-5" /> },
    { value: 'upload', label: 'Upload Book', icon: <Upload className="w-5 h-5" /> },
    { value: 'manage', label: 'Manage Books', icon: <BookOpen className="w-5 h-5" /> },
    { value: 'orders', label: 'Orders', icon: <ClipboardList className="w-5 h-5" /> },
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
      {/* <Navbar /> */}
      <div className="flex max-h-screen bg-muted/30">
        {/* Sidebar */}
        <aside className={`transition-all duration-200 bg-white shadow h-screen sticky top-0 z-20 flex flex-col ${sidebarOpen ? 'w-56' : 'w-16'} border-r`}>
            <Logo withText={sidebarOpen} />

          <div className="flex items-center justify-between p-4 border-b relative">
            <div>
              <span className={`font-bold text-base transition-all capitalize ${sidebarOpen ? 'opacity-100' : 'opacity-0 w-0'}`}>{user.firstName}</span>
              <p className={`font-bold text-xs text-gray-400 transition-all ${sidebarOpen ? 'opacity-100' : 'opacity-0 w-0'}`}>{user.role}</p>
            </div>
            <button
              onClick={() => setSidebarOpen(v => !v)}
              className={`p-1 rounded hover:bg-muted absolute z-30 bg-white shadow border transition-all duration-200`}
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
                <span className={`transition-all ${sidebarOpen ? 'opacity-100 ml-2' : 'opacity-0 w-0 ml-0'}`}>{item.label}</span>
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
        </aside>
        {/* Main Content */}
        <main className="flex-1 p-8  overflow-y-auto">
          <h1 className="text-3xl font-bold mb-8">
            {navItems.find(item => item.value === tab)?.label}
          </h1>
          {tab === 'overview' && <AdminOverview />}
          {tab === 'upload' && <BookUpload />}
          {tab === 'manage' && <BookManagement />}
          {tab === 'orders' && <OrderManagement />}
          {tab === 'converter' && <EPUBConverter />}
          {tab === 'admins' && <AdminManagement />}
          {tab === 'logs' && <AdminLogs />}
        </main>
      </div>
    </>
  );
};

export default Admin;

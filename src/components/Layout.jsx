import { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import {
  Home, Building2, FileText, ShieldCheck, AlertTriangle,
  Settings, LogOut, Menu, X, Users, BarChart3,
  ClipboardList, ScrollText, Bell, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const tenantNav = [
  { label: 'Dashboard', path: '/', icon: Home },
  { label: 'Find Properties', path: '/properties', icon: Building2 },
  { label: 'My Applications', path: '/applications', icon: ClipboardList },
  { label: 'My Leases', path: '/leases', icon: FileText },
  { label: 'My Profile', path: '/tenant-profile', icon: ShieldCheck },
  { label: 'Data Rights', path: '/data-rights', icon: ScrollText },
];

const landlordNav = [
  { label: 'Dashboard', path: '/', icon: Home },
  { label: 'My Properties', path: '/properties', icon: Building2 },
  { label: 'Applications', path: '/applications', icon: ClipboardList },
  { label: 'Leases', path: '/leases', icon: FileText },
  { label: 'Disputes', path: '/disputes', icon: AlertTriangle },
];

const adminNav = [
  { label: 'Dashboard', path: '/', icon: Home },
  { label: 'Properties', path: '/properties', icon: Building2 },
  { label: 'Leases', path: '/leases', icon: FileText },
  { label: 'Disputes', path: '/disputes', icon: AlertTriangle },
  { label: 'Audit Log', path: '/audit-log', icon: BarChart3 },
  { label: 'Incident Log', path: '/incident-log', icon: ShieldCheck },
  { label: 'Data Requests', path: '/data-requests', icon: ScrollText },
  { label: 'Users', path: '/users', icon: Users },
  { label: 'System Config', path: '/system-config', icon: Settings },
];

export default function Layout() {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { config } = useSystemConfig();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const role = user?.role || 'user';
  const isAdmin = role === 'admin';
  const isLandlord = user?.extra_data?.is_landlord && !isAdmin;
  
  const nav = isAdmin ? adminNav : isLandlord ? landlordNav : tenantNav;

  const handleLogout = () => base44.auth.logout('/login');

  const legalBannerVisible = isAdmin && !config.LEGAL_REVIEW_COMPLETE;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 z-50 flex flex-col
        bg-sidebar text-sidebar-foreground transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0 lg:flex
      `}>
        {/* Brand */}
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-heading font-bold text-lg text-white leading-tight">T.Bedrock & Co.</h1>
              <p className="text-xs text-sidebar-foreground/60 mt-0.5">Rental Escrow Platform</p>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-sidebar-foreground/60 hover:text-white">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Role badge */}
        {user && (
          <div className="px-4 py-3 border-b border-sidebar-border">
            <p className="text-xs text-sidebar-foreground/60 mb-1">Signed in as</p>
            <p className="text-sm font-medium text-white truncate">{user.full_name || user.email}</p>
            <Badge variant="outline" className="mt-1 text-xs border-sidebar-border text-sidebar-foreground/70">
              {isAdmin ? 'Admin' : isLandlord ? 'Landlord / Agent' : 'Tenant'}
            </Badge>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {nav.map(item => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-sidebar-primary text-white'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white'
                }`}
              >
                <Icon size={18} />
                {item.label}
                {active && <ChevronRight size={14} className="ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-sidebar-foreground/60 hover:text-white transition-colors w-full"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-card border-b border-border px-4 py-3 flex items-center gap-3 lg:px-6 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-muted-foreground hover:text-foreground">
            <Menu size={22} />
          </button>
          <div className="flex-1" />
          <button className="text-muted-foreground hover:text-foreground relative">
            <Bell size={20} />
          </button>
        </header>

        {/* Legal review banner — admin only, controlled by LEGAL_REVIEW_COMPLETE config */}
        {legalBannerVisible && (
          <div className="bg-amber-50 border-b-2 border-amber-400 px-4 py-3 flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-900 font-medium">
              <span className="font-bold">Legal review pending</span> — do not process live transactions until lease templates, forfeiture clauses, and data processing agreements have been reviewed and approved by Ethiopian legal counsel.{' '}
              <Link to="/system-config" className="underline hover:no-underline">Set LEGAL_REVIEW_COMPLETE in System Config to dismiss.</Link>
            </p>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>

        {/* Footer with ECA registration */}
        <footer className="border-t border-border px-4 py-3 text-center">
          <p className="text-xs text-muted-foreground">
            T.Bedrock & Co. · Addis Ababa, Ethiopia ·{' '}
            {config.DATA_CONTROLLER_ECA_REG_NUMBER
              ? `ECA Reg: ${config.DATA_CONTROLLER_ECA_REG_NUMBER}`
              : <span className="italic">ECA Data Controller registration pending</span>
            }
          </p>
        </footer>
      </div>
    </div>
  );
}
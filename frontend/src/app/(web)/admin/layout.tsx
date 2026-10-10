'use client';

import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LogOut,
  Loader2,
  Menu,
  X,
  CalendarDays,
  Users as UsersIcon,
  Ban,
  Trophy,
  Clock,
  UserCog,
  Shield,
  Navigation,
  FileText,
  Briefcase,
  BarChart3,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { apiClient } from '@/api';
import type { components } from '@/api';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

type AuthProfile = components['schemas']['AuthProfileResponseDto'];

interface AdminContextType {
  user: AuthProfile;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (...permissions: string[]) => boolean;
}

const AdminContext = createContext<AdminContextType | null>(null);
export const useAdmin = () => {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminLayout');
  return ctx;
};

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  permissions: string[];
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Beheer',
    items: [
      { id: 'reservations', label: 'Reservaties', href: '/admin/reservations', icon: CalendarDays, permissions: ['reservations.manage'] },
      { id: 'events', label: 'Events', href: '/admin/events', icon: Trophy, permissions: ['events.manage'] },
      { id: 'noshows', label: 'No-Shows', href: '/admin/noshows', icon: Ban, permissions: ['reservations.noshows.manage', 'reservations.manage'] },
    ],
  },
  {
    title: 'Content',
    items: [
      { id: 'roster', label: 'Teams', href: '/admin/roster', icon: UsersIcon, permissions: ['roster.manage'] },
      { id: 'navigation', label: 'Navigatie', href: '/admin/navigation', icon: Navigation, permissions: ['navigation.manage'] },
      { id: 'forms', label: 'Formulieren', href: '/admin/forms', icon: FileText, permissions: ['forms.manage'] },
      { id: 'jobs', label: 'Vacatures', href: '/admin/jobs', icon: Briefcase, permissions: ['jobs.manage'] },
    ],
  },
  {
    title: 'Systeem',
    items: [
      { id: 'users', label: 'Gebruikers', href: '/admin/users', icon: UserCog, permissions: ['users.manage'] },
      { id: 'roles', label: 'Rollen', href: '/admin/roles', icon: Shield, permissions: ['roles.manage'] },
      { id: 'timetable', label: 'Openingsuren', href: '/admin/timetable', icon: Clock, permissions: ['timetable.manage'] },
    ],
  },
  {
    title: 'Overig',
    items: [
      { id: 'statistics', label: 'Statistieken', href: '/admin/statistics', icon: BarChart3, permissions: ['statistics.view'] },
      { id: 'settings', label: 'Instellingen', href: '/admin/settings', icon: Settings, permissions: ['settings.manage'] },
    ],
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthProfile | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hide public navbar and footer inside admin
  useEffect(() => {
    const nav = document.getElementById('public-navbar');
    const footer = document.getElementById('public-footer');
    const main = nav?.parentElement?.querySelector('main');
    if (nav) nav.style.display = 'none';
    if (footer) footer.style.display = 'none';
    if (main) main.style.paddingTop = '0';
    return () => {
      if (nav) nav.style.display = '';
      if (footer) footer.style.display = '';
      if (main) main.style.paddingTop = '';
    };
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const checkAuth = async () => {
    try {
      const res = await apiClient.GET('/auth/profile', {});
      if (res.error || !res.data) {
        window.location.href = `/login?returnUrl=${encodeURIComponent(pathname)}`;
        return;
      }
      if (!res.data.isAdmin && (!res.data.permissions || res.data.permissions.length === 0)) {
        window.location.href = `/login?returnUrl=${encodeURIComponent(pathname)}`;
        return;
      }
      setUser(res.data);
    } catch {
      window.location.href = `/login?returnUrl=${encodeURIComponent(pathname)}`;
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiClient.POST('/auth/logout');
      router.push('/');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const hasPermission = useCallback(
    (p: string) => {
      if (!user) return false;
      if (user.isAdmin) return true;
      return (user.permissions ?? []).includes(p);
    },
    [user],
  );

  const hasAnyPermission = useCallback(
    (...ps: string[]) => ps.some((p) => hasPermission(p)),
    [hasPermission],
  );

  if (loading) {
    return (
      <div className='h-screen bg-slate-950 flex items-center justify-center text-white'>
        <Loader2 className='animate-spin' />
      </div>
    );
  }

  if (!user) return null;

  const userPermissions = new Set(user.permissions ?? []);

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => user.isAdmin || item.permissions.some((p) => userPermissions.has(p)),
    ),
  })).filter((group) => group.items.length > 0);

  const activeItemId = visibleGroups
    .flatMap((g) => g.items)
    .find((item) => pathname.startsWith(item.href))?.id;

  const initials = user.name
    ? user.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : user.email?.[0]?.toUpperCase() ?? '?';

  return (
    <AdminContext value={{
      user,
      hasPermission,
      hasAnyPermission,
    }}>
      {/* Mobile top bar */}
      <div className='fixed top-0 left-0 right-0 z-40 flex items-center justify-between bg-slate-950/95 backdrop-blur border-b border-slate-800 px-4 py-3 lg:hidden'>
        <button onClick={() => setMobileOpen(true)} className='p-2 rounded-lg hover:bg-slate-800 transition-colors'>
          <Menu size={20} />
        </button>
        <span className='text-sm font-bold tracking-wide'>
          AP Gaming Hub <span className='text-red-500'>Admin</span>
        </span>
        <div className='w-9' />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className='fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden' onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 ${collapsed ? 'w-16' : 'w-64'}`}
      >
        {/* Brand */}
        <div className='flex items-center gap-3 px-4 py-5 border-b border-slate-800'>
          <Link href='/' className='flex items-center gap-3 group' title='Terug naar homepage'>
            <div className='w-9 h-9 rounded-lg bg-red-600 group-hover:bg-red-500 transition-colors flex items-center justify-center font-black text-sm shrink-0'>
              AP
            </div>
            {!collapsed && (
              <div className='overflow-hidden'>
                <div className='text-sm font-bold whitespace-nowrap group-hover:text-red-400 transition-colors'>AP Gaming Hub</div>
                <div className='text-[11px] text-gray-500 whitespace-nowrap'>Adminpaneel</div>
              </div>
            )}
          </Link>
          {/* Mobile close button */}
          <button onClick={() => setMobileOpen(false)} className='ml-auto p-1 rounded-lg hover:bg-slate-800 transition-colors lg:hidden'>
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className='flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin'>
          {visibleGroups.map((group) => (
            <div key={group.title}>
              {!collapsed && (
                <div className='px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-500'>
                  {group.title}
                </div>
              )}
              <div className='space-y-0.5'>
                {group.items.map((item) => {
                  const isActive = activeItemId === item.id;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-red-500/10 text-red-400 border-l-2 border-red-500'
                          : 'text-gray-400 hover:bg-slate-800/60 hover:text-white'
                      } ${collapsed ? 'justify-center' : ''}`}
                    >
                      <Icon className='w-4.5 h-4.5 shrink-0' />
                      {!collapsed && <span className='whitespace-nowrap'>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom section */}
        <div className='border-t border-slate-800 p-3 space-y-2'>
          {/* Collapse toggle - desktop only */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className='hidden lg:flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-slate-800/60 hover:text-white transition-colors'
            title={collapsed ? 'Uitklappen' : 'Inklappen'}
          >
            {collapsed ? (
              <PanelLeftOpen className='w-4.5 h-4.5 shrink-0' />
            ) : (
              <>
                <PanelLeftClose className='w-4.5 h-4.5 shrink-0' />
                <span className='whitespace-nowrap'>Inklappen</span>
              </>
            )}
          </button>

          {/* User info */}
          <div className={`flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800/40 ${collapsed ? 'justify-center' : ''}`}>
            <div className='w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold shrink-0'>
              {initials}
            </div>
            {!collapsed && (
              <>
                <div className='overflow-hidden flex-1 min-w-0'>
                  <div className='text-sm font-medium truncate'>{user.name || user.email}</div>
                  <div className='text-[11px] text-gray-500 truncate'>{user.isAdmin ? 'Admin' : 'Beheerder'}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className='text-gray-500 hover:text-white transition-colors shrink-0'
                  title='Uitloggen'
                >
                  <LogOut size={16} />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className={`min-h-screen transition-all duration-200 pt-14 lg:pt-0 ${collapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
        <div className='p-4 md:p-6 lg:p-8'>
          {children}
        </div>
      </main>
    </AdminContext>
  );
}

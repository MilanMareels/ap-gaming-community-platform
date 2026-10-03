'use client';

import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/api';
import type { components } from '@/api';
import Link from 'next/link';

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

const TABS = [
  { id: 'reservations', label: 'Reservaties', href: '/admin/reservations', permissions: ['reservations.manage'] },
  { id: 'events', label: 'Events', href: '/admin/events', permissions: ['events.manage'] },
  { id: 'noshows', label: 'No-Shows', href: '/admin/noshows', permissions: ['reservations.noshows.manage', 'reservations.manage'] },
  { id: 'roster', label: 'Teams', href: '/admin/roster', permissions: ['roster.manage'] },
  { id: 'timetable', label: 'Openingsuren', href: '/admin/timetable', permissions: ['timetable.manage'] },
  { id: 'users', label: 'Gebruikers', href: '/admin/users', permissions: ['users.manage'] },
  { id: 'navigation', label: 'Navigatie', href: '/admin/navigation', permissions: ['navigation.manage'] },
  { id: 'roles', label: 'Rollen', href: '/admin/roles', permissions: ['roles.manage'] },
  { id: 'speedruns', label: 'Speedruns', href: '/admin/speedruns', permissions: ['speedruns.manage', 'speedruns.review'] },
  { id: 'statistics', label: 'Statistieken', href: '/admin/statistics', permissions: ['statistics.view'] },
  { id: 'settings', label: 'Instellingen', href: '/admin/settings', permissions: ['settings.manage'] },
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

  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuth = async () => {
    try {
      const res = await apiClient.GET('/auth/profile', {});
      if (res.error || !res.data) {
        window.location.href = `/login?returnUrl=${encodeURIComponent(pathname)}`;
        return;
      }
      // Allow access if user is admin OR has any permissions
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

  if (loading) {
    return (
      <div className='h-screen bg-slate-950 flex items-center justify-center text-white'>
        <Loader2 className='animate-spin' />
      </div>
    );
  }

  if (!user) return null;

  const userPermissions = new Set(user.permissions ?? []);

  const visibleTabs = TABS.filter(
    (tab) => tab.permissions.some((p) => userPermissions.has(p)),
  );

  const activeTab =
    visibleTabs.find((t) => pathname.startsWith(t.href))?.id ?? visibleTabs[0]?.id;

  return (
    <AdminContext value={{
      user,
      hasPermission: (p) => userPermissions.has(p),
      hasAnyPermission: (...ps) => ps.some((p) => userPermissions.has(p)),
    }}>
      <div className='min-h-screen bg-slate-950 text-white p-4 md:p-8 pt-24'>
        <div className='max-w-7xl mx-auto'>
          <div className='mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between'>
            <h1 className='text-2xl font-black sm:text-3xl'>
              ADMIN <span className='text-red-600'>PANEL</span>
            </h1>
            <Button
              variant='ghost'
              onClick={handleLogout}
              className='w-full sm:w-auto'
            >
              <LogOut size={20} /> Uitloggen
            </Button>
          </div>

          <div className='-mx-4 overflow-x-auto border-b border-slate-800 px-4 sm:mx-0 sm:px-0'>
            <div className='flex min-w-max gap-1'>
              {visibleTabs.map((tab) => (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className={`px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors sm:px-6 ${
                    activeTab === tab.id
                      ? 'text-white border-b-2 border-red-600'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {tab.label}
                </Link>
              ))}
            </div>
          </div>

          <div className='mt-6 sm:mt-8'>{children}</div>
        </div>
      </div>
    </AdminContext>
  );
}

'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/api';
import type { components } from '@/api';
import Link from 'next/link';

type AuthProfile = components['schemas']['AuthProfileResponseDto'];

interface AdminContextType {
  user: AuthProfile;
}

const AdminContext = createContext<AdminContextType | null>(null);
export const useAdmin = () => {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminLayout');
  return ctx;
};

const TABS = [
  { id: 'reservations', label: 'Reservaties', href: '/admin/reservations' },
  { id: 'noshows', label: 'No-Shows', href: '/admin/noshows' },
  { id: 'roster', label: 'Teams', href: '/admin/roster' },
  { id: 'timetable', label: 'Openingsuren', href: '/admin/timetable' },
  { id: 'settings', label: 'Instellingen', href: '/admin/settings' },
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
      if (res.error || !res.data || !res.data.isAdmin) {
        window.location.href = `/api/auth/google/login?returnUrl=${encodeURIComponent(pathname)}`;
        return;
      }
      setUser(res.data);
    } catch {
      window.location.href = `/api/auth/google/login?returnUrl=${encodeURIComponent(pathname)}`;
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

  const activeTab =
    TABS.find((t) => pathname.startsWith(t.href))?.id ?? 'reservations';

  return (
    <AdminContext value={{ user }}>
      <div className='min-h-screen bg-slate-950 text-white p-4 md:p-8 pt-24'>
        <div className='max-w-7xl mx-auto'>
          <div className='flex justify-between items-center mb-8'>
            <h1 className='text-3xl font-black'>
              ADMIN <span className='text-red-600'>PANEL</span>
            </h1>
            <Button variant='ghost' onClick={handleLogout}>
              <LogOut size={20} /> Uitloggen
            </Button>
          </div>

          <div className='flex gap-1 border-b border-slate-800'>
            {TABS.map((tab) => (
              <Link
                key={tab.id}
                href={tab.href}
                className={`px-6 py-3 text-sm font-semibold transition-colors ${
                  activeTab === tab.id
                    ? 'text-white border-b-2 border-red-600'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>

          <div className='mt-8'>{children}</div>
        </div>
      </div>
    </AdminContext>
  );
}

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from './layout';

const NAV_ITEMS_ORDERED = [
  { href: '/admin/reservations', permissions: ['reservations.manage'] },
  { href: '/admin/events', permissions: ['events.manage'] },
  { href: '/admin/noshows', permissions: ['reservations.noshows.manage', 'reservations.manage'] },
  { href: '/admin/roster', permissions: ['roster.manage'] },
  { href: '/admin/navigation', permissions: ['navigation.manage'] },
  { href: '/admin/forms', permissions: ['forms.manage'] },
  { href: '/admin/submissions', permissions: ['forms.manage', 'forms.submissions.view'] },
  { href: '/admin/jobs', permissions: ['jobs.manage'] },
  { href: '/admin/users', permissions: ['users.view', 'users.manage'] },
  { href: '/admin/roles', permissions: ['roles.manage'] },
  { href: '/admin/timetable', permissions: ['timetable.manage'] },
  { href: '/admin/statistics', permissions: ['statistics.view'] },
  { href: '/admin/settings', permissions: ['settings.manage'] },
];

export default function AdminPage() {
  const router = useRouter();
  const { hasAnyPermission } = useAdmin();

  useEffect(() => {
    const first = NAV_ITEMS_ORDERED.find((item) =>
      hasAnyPermission(...item.permissions),
    );
    router.replace(first?.href ?? '/admin/reservations');
  }, [hasAnyPermission, router]);

  return null;
}

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from './AdminShell';

const NAV_ITEMS_ORDERED = [
  { href: '/admin/reservations', permissions: ['reservations.manage'] },
  { href: '/admin/events', permissions: ['events.manage'] },
  { href: '/admin/noshows', permissions: ['reservations.noshows.manage', 'reservations.manage'] },
  { href: '/admin/roster', permissions: ['roster.manage'] },
  { href: '/admin/esports-results', permissions: ['esports.results.manage'] },
  { href: '/admin/team-planning', permissions: ['esports.schedule.manage'] },
  { href: '/admin/navigation', permissions: ['navigation.manage'] },
  { href: '/admin/forms', permissions: ['forms.manage'] },
  { href: '/admin/submissions', permissions: ['forms.manage', 'forms.submissions.view'] },
  { href: '/admin/jobs', permissions: ['jobs.manage'] },
  { href: '/admin/users', permissions: ['users.view', 'users.manage'] },
  { href: '/admin/roles', permissions: ['roles.manage'] },
  { href: '/admin/timetable', permissions: ['timetable.manage'] },
  { href: '/admin/audit', permissions: ['audit.view'] },
  { href: '/admin/statistics', permissions: ['statistics.view'] },
  { href: '/admin/settings', permissions: ['settings.manage'] },
];

export default function AdminPage() {
  const router = useRouter();
  const { user, hasAnyPermission } = useAdmin();

  useEffect(() => {
    const first = NAV_ITEMS_ORDERED.find((item) =>
      hasAnyPermission(...item.permissions),
    );
    // Team managers may have no permissions at all; their place is their team's planning
    const fallback = user.planning?.isManager ? '/admin/team-planning' : '/admin/reservations';
    router.replace(first?.href ?? fallback);
  }, [hasAnyPermission, router, user]);

  return null;
}

import { NavbarClient } from './NavbarClient';
import type { NavLinkWithChildren } from '@/api';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

const FALLBACK_NAV_ITEMS: NavLinkWithChildren[] = [
  { id: -1, label: 'Home', href: '/', position: 0, visibility: 'public', isCta: false, openInNewTab: false, isProtected: true, createdAt: '', updatedAt: '', children: [] },
  { id: -2, label: 'Events', href: '/events', position: 1, visibility: 'public', isCta: false, openInNewTab: false, isProtected: true, createdAt: '', updatedAt: '', children: [] },
  { id: -3, label: 'Roster', href: '/roster', position: 2, visibility: 'public', isCta: false, openInNewTab: false, isProtected: true, createdAt: '', updatedAt: '', children: [] },
  { id: -4, label: 'Schedule', href: '/schedule', position: 3, visibility: 'public', isCta: false, openInNewTab: false, isProtected: true, createdAt: '', updatedAt: '', children: [] },
  { id: -5, label: 'Info', href: '/info', position: 4, visibility: 'public', isCta: false, openInNewTab: false, isProtected: true, createdAt: '', updatedAt: '', children: [] },
  { id: -6, label: 'Reserveer', href: '/reservations', position: 5, visibility: 'public', isCta: true, openInNewTab: false, isProtected: true, createdAt: '', updatedAt: '', children: [] },
];

export async function Navbar() {
  let navItems: NavLinkWithChildren[];

  try {
    const res = await fetch(`${BACKEND_URL}/api/navigation`, {
      next: { revalidate: 60, tags: ['navigation'] },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    navItems = await res.json();
  } catch {
    navItems = FALLBACK_NAV_ITEMS;
  }

  return <NavbarClient navItems={navItems} />;
}

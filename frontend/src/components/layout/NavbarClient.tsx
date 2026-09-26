'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Gamepad2, Lock, Menu, X, ArrowRight, ChevronDown } from 'lucide-react';
import { DynamicIcon, iconNames } from 'lucide-react/dynamic';
import type { NavLinkWithChildren } from '@/api';

const validIconNames = new Set<string>(iconNames);

type UserRole = 'public' | 'authenticated' | 'admin';

interface NavbarClientProps {
  navItems: NavLinkWithChildren[];
}

export function NavbarClient({ navItems }: NavbarClientProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<UserRole>('public');
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [hasAnyPermission, setHasAnyPermission] = useState(false);
  const dropdownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();

  // Close mobile menu on route change
  useEffect(() => {
    setIsOpen(false);
    setMobileExpanded(null);
    setOpenDropdown(null);
  }, [pathname]);

  // Lightweight auth check for visibility filtering
  useEffect(() => {
    fetch('/api/auth/profile', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) return;
        return res.json();
      })
      .then((data) => {
        if (!data?.id) return;
        if (data.isAdmin) setUserRole('admin');
        else setUserRole('authenticated');
        if (data.roles) setUserRoles(data.roles);
        if (data.permissions?.length > 0) setHasAnyPermission(true);
      })
      .catch(() => {});
  }, []);

  const isVisible = useCallback(
    (visibility: string) => {
      if (visibility === 'public') return true;
      if (visibility === 'authenticated') return userRole !== 'public';
      if (visibility === 'admin') return userRole === 'admin';
      if (visibility.startsWith('role:')) {
        const roleName = visibility.slice(5);
        return userRoles.includes(roleName);
      }
      return true;
    },
    [userRole, userRoles],
  );

  const visibleItems = navItems.filter(
    (item) =>
      isVisible(item.visibility) &&
      // Filter children too
      (item.children
        ? { ...item, children: item.children.filter((c) => isVisible(c.visibility)) }
        : true),
  );

  // Separate regular items and CTA items
  const regularItems = visibleItems.filter((item) => !item.isCta);
  const ctaItems = visibleItems.filter((item) => item.isCta);

  const handleDropdownEnter = (id: number) => {
    if (dropdownTimeoutRef.current) clearTimeout(dropdownTimeoutRef.current);
    setOpenDropdown(id);
  };

  const handleDropdownLeave = () => {
    dropdownTimeoutRef.current = setTimeout(() => setOpenDropdown(null), 150);
  };

  const toggleMobileDropdown = (id: number) => {
    setMobileExpanded((prev) => (prev === id ? null : id));
  };

  return (
    <nav className="fixed w-full top-0 z-50 bg-[#020618]/80 backdrop-blur-md border-b border-white/10">
      <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        {/* Logo */}
        <div className="flex items-center">
          <Link
            href="/"
            className="text-2xl font-semibold tracking-tight text-[#ffffff] flex items-center gap-2 group"
            onClick={() => setIsOpen(false)}
          >
            <Gamepad2 className="h-8 w-8 text-[#d42422] group-hover:rotate-12 transition-transform duration-300" strokeWidth={1.5} />
            AP <span className="text-[#d42422]">Gaming</span>
          </Link>
        </div>

        {/* Desktop nav */}
        <div className="hidden md:flex gap-8 text-lg text-gray-300 font-medium items-center">
          {regularItems.map((item) =>
            item.children && item.children.length > 0 ? (
              <div
                key={item.id}
                className="relative"
                onMouseEnter={() => handleDropdownEnter(item.id)}
                onMouseLeave={handleDropdownLeave}
              >
                <button className="flex items-center gap-1 hover:text-[#ffffff] transition-colors relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-px after:bg-[#d42422] hover:after:w-full after:transition-all">
                  {item.icon && validIconNames.has(item.icon) && <DynamicIcon name={item.icon as never} size={18} strokeWidth={1.5} />}
                  {item.label}
                  <ChevronDown
                    size={16}
                    strokeWidth={1.5}
                    className={`transition-transform ${openDropdown === item.id ? 'rotate-180' : ''}`}
                  />
                </button>
                {openDropdown === item.id && (
                  <div className="absolute top-full left-0 mt-2 min-w-[200px] bg-[#020618]/95 backdrop-blur-md border border-white/10 rounded-lg shadow-2xl py-2">
                    {item.children
                      .filter((c) => isVisible(c.visibility))
                      .map((child) => (
                        <Link
                          key={child.id}
                          href={child.href || '#'}
                          target={child.openInNewTab ? '_blank' : undefined}
                          rel={child.openInNewTab ? 'noopener noreferrer' : undefined}
                          className="flex items-center gap-2 px-4 py-2.5 text-base text-gray-300 hover:text-white hover:bg-white/5 transition-all"
                        >
                          {child.icon && validIconNames.has(child.icon) && <DynamicIcon name={child.icon as never} size={16} strokeWidth={1.5} />}
                          {child.label}
                        </Link>
                      ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={item.id}
                href={item.href || '#'}
                target={item.openInNewTab ? '_blank' : undefined}
                rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
                className="flex items-center gap-1.5 hover:text-[#ffffff] transition-colors relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-px after:bg-[#d42422] hover:after:w-full after:transition-all"
              >
                {item.icon && validIconNames.has(item.icon) && <DynamicIcon name={item.icon as never} size={18} strokeWidth={1.5} />}
                {item.label}
              </Link>
            ),
          )}
          {hasAnyPermission && (
            <Link href="/admin" className="text-gray-500 hover:text-white p-2">
              <Lock size={20} strokeWidth={1.5} />
            </Link>
          )}
        </div>

        {/* Desktop CTA */}
        {ctaItems.length > 0 && (
          <div className="hidden md:flex flex-shrink-0 items-center pl-6 gap-3">
            {ctaItems.map((item) => (
              <Link
                key={item.id}
                href={item.href || '#'}
                target={item.openInNewTab ? '_blank' : undefined}
                rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
                className="bg-[#d42422] text-[#ffffff] px-6 py-2.5 rounded-full text-lg font-medium hover:bg-red-700 transition-all hover:scale-105 active:scale-95 inline-flex items-center gap-2 shadow-[0_0_15px_rgba(212,36,34,0.4)]"
              >
                {item.label} <ArrowRight className="w-5 h-5" strokeWidth={1.5} />
              </Link>
            ))}
          </div>
        )}

        {/* Mobile controls */}
        <div className="md:hidden flex items-center gap-4">
          {hasAnyPermission && (
            <Link href="/admin" className="text-gray-500 hover:text-white p-2">
              <Lock size={20} strokeWidth={1.5} />
            </Link>
          )}
          <button onClick={() => setIsOpen(!isOpen)} className="text-gray-300 hover:text-white focus:outline-none p-2">
            {isOpen ? <X size={28} strokeWidth={1.5} /> : <Menu size={28} strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden bg-[#020618] border-b border-white/10 absolute left-0 top-[72px] w-full max-h-[calc(100vh-4.5rem)] overflow-y-auto shadow-2xl">
          <div className="px-4 pt-2 pb-6 space-y-1">
            {regularItems.map((item) =>
              item.children && item.children.length > 0 ? (
                <div key={item.id}>
                  <button
                    onClick={() => toggleMobileDropdown(item.id)}
                    className="flex items-center justify-between w-full px-3 py-2 rounded-md text-lg font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-all"
                  >
                    <span className="flex items-center gap-2">
                      {item.icon && validIconNames.has(item.icon) && <DynamicIcon name={item.icon as never} size={18} strokeWidth={1.5} />}
                      {item.label}
                    </span>
                    <ChevronDown
                      size={18}
                      strokeWidth={1.5}
                      className={`transition-transform ${mobileExpanded === item.id ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {mobileExpanded === item.id && (
                    <div className="ml-4 border-l border-white/10 pl-3 space-y-1">
                      {item.children
                        .filter((c) => isVisible(c.visibility))
                        .map((child) => (
                          <Link
                            key={child.id}
                            href={child.href || '#'}
                            target={child.openInNewTab ? '_blank' : undefined}
                            rel={child.openInNewTab ? 'noopener noreferrer' : undefined}
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-md text-base text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                          >
                            {child.icon && validIconNames.has(child.icon) && <DynamicIcon name={child.icon as never} size={16} strokeWidth={1.5} />}
                            {child.label}
                          </Link>
                        ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={item.id}
                  href={item.href || '#'}
                  target={item.openInNewTab ? '_blank' : undefined}
                  rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-lg font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-all"
                >
                  {item.icon && validIconNames.has(item.icon) && <DynamicIcon name={item.icon as never} size={18} strokeWidth={1.5} />}
                  {item.label}
                </Link>
              ),
            )}
            {ctaItems.map((item) => (
              <Link
                key={item.id}
                href={item.href || '#'}
                target={item.openInNewTab ? '_blank' : undefined}
                rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
                onClick={() => setIsOpen(false)}
                className="block px-3 py-2 text-[#d42422] font-medium text-lg"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}

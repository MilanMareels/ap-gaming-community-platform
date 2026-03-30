'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Gamepad2, Lock, Menu, X, ArrowRight } from 'lucide-react';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Events', href: '/events' },
    { label: 'Roster', href: '/roster' },
    { label: 'Schedule', href: '/schedule' },
    { label: 'Info', href: '/info' },
  ];

  return (
    <nav className="fixed w-full top-0 z-50 bg-[#020618]/80 backdrop-blur-md border-b border-white/10">
      <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
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

        <div className="hidden md:flex gap-8 text-lg text-gray-300 font-medium items-center">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="hover:text-[#ffffff] transition-colors relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-px after:bg-[#d42422] hover:after:w-full after:transition-all"
            >
              {item.label}
            </Link>
          ))}
          <Link href="/admin" className="text-gray-500 hover:text-white p-2">
            <Lock size={20} strokeWidth={1.5} />
          </Link>
        </div>

        <div className="hidden md:flex flex-shrink-0 items-center pl-6">
          <Link
            href="/reservations"
            className="bg-[#d42422] text-[#ffffff] px-6 py-2.5 rounded-full text-lg font-medium hover:bg-red-700 transition-all hover:scale-105 active:scale-95 inline-flex items-center gap-2 shadow-[0_0_15px_rgba(212,36,34,0.4)]"
          >
            Reserveer <ArrowRight className="w-5 h-5" strokeWidth={1.5} />
          </Link>
        </div>

        <div className="md:hidden flex items-center gap-4">
          <Link href="/admin" className="text-gray-500 hover:text-white p-2">
            <Lock size={20} strokeWidth={1.5} />
          </Link>
          <button onClick={() => setIsOpen(!isOpen)} className="text-gray-300 hover:text-white focus:outline-none p-2">
            {isOpen ? <X size={28} strokeWidth={1.5} /> : <Menu size={28} strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden bg-[#020618] border-b border-white/10 absolute left-0 top-[72px] w-full max-h-[calc(100vh-4.5rem)] overflow-y-auto shadow-2xl">
          <div className="px-4 pt-2 pb-6 space-y-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="block px-3 py-2 rounded-md text-lg font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-all"
              >
                {item.label}
              </Link>
            ))}
            <Link href="/reservations" onClick={() => setIsOpen(false)} className="block px-3 py-2 text-[#d42422] font-medium text-lg">
              Reserveer
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

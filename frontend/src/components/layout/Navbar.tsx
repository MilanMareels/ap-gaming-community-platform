'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Gamepad2, Lock, Menu, X } from 'lucide-react';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Events', href: '/events' },
    { label: 'Reservations', href: '/reservations' },
    { label: 'Roster', href: '/roster' },
    { label: 'Schedule', href: '/schedule' },
    { label: 'Info', href: '/info' },
  ];

  return (
    <nav className='w-full bg-slate-950 border-b border-red-600/20 fixed top-0 left-0 right-0 z-50'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex items-center justify-between h-20'>
          <Link
            href='/'
            className='flex items-center group cursor-pointer'
            onClick={() => setIsOpen(false)}
          >
            <div className='relative'>
              <div className='absolute inset-0 bg-red-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity'></div>
              <Gamepad2 className='h-8 w-8 text-red-500 relative z-10' />
            </div>
            <span className='ml-3 text-2xl font-black italic tracking-tighter text-white'>
              AP<span className='text-red-500'>GAMING</span>
            </span>
          </Link>

          <div className='hidden md:flex ml-10 items-center space-x-1'>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className='relative px-4 py-2 rounded-lg text-sm font-bold text-gray-300 hover:text-white hover:bg-white/5 transition-all group'
              >
                {item.label}
                <span className='absolute bottom-0 left-0 w-0 h-0.5 bg-red-500 transition-all group-hover:w-full'></span>
              </Link>
            ))}
            <Link
              href='/admin'
              className='text-gray-500 hover:text-white p-2 ml-4'
            >
              <Lock size={20} />
            </Link>
          </div>

          <div className='md:hidden flex items-center'>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className='text-gray-300 hover:text-white focus:outline-none p-2'
            >
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className='md:hidden bg-slate-950 border-b border-red-600/20 absolute left-0 top-20 w-full max-h-[calc(100vh-5rem)] overflow-y-auto shadow-2xl'>
          <div className='px-4 pt-2 pb-6 space-y-2'>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className='block px-3 py-3 rounded-md text-base font-bold text-gray-300 hover:text-white hover:bg-red-600/10 hover:border-l-4 hover:border-red-500 transition-all'
              >
                {item.label}
              </Link>
            ))}
            <Link
              href='/admin'
              onClick={() => setIsOpen(false)}
              className='block px-3 py-3 rounded-md text-base font-bold text-gray-500 hover:text-white'
            >
              <div className='flex items-center gap-2'>
                <Lock size={16} /> Admin
              </div>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

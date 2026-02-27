import Link from 'next/link';
import { Gamepad2 } from 'lucide-react';

export function Footer() {
  return (
    <footer className='bg-slate-950 border-t border-slate-800 text-gray-400 py-8'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
          <div>
            <div className='flex items-center mb-4'>
              <Gamepad2 className='h-6 w-6 text-red-500' />
              <span className='ml-2 text-xl font-black italic tracking-tighter text-white'>
                AP<span className='text-red-500'>GAMING</span>
              </span>
            </div>
            <p className='text-sm'>
              De gaming hub van AP Hogeschool. Reserveer PC&apos;s en consoles
              voor jouw gaming sessies.
            </p>
          </div>

          <div>
            <h3 className='text-white font-bold mb-3'>Navigatie</h3>
            <ul className='space-y-2 text-sm'>
              <li>
                <Link
                  href='/reservations'
                  className='hover:text-white transition-colors'
                >
                  Reserveren
                </Link>
              </li>
              <li>
                <Link
                  href='/schedule'
                  className='hover:text-white transition-colors'
                >
                  Openingsuren
                </Link>
              </li>
              <li>
                <Link
                  href='/info'
                  className='hover:text-white transition-colors'
                >
                  Huisregels
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className='text-white font-bold mb-3'>Contact</h3>
            <p className='text-sm'>
              AP Hogeschool Antwerpen
              <br />
              Gaming Hub
              <br />
            </p>
          </div>
        </div>

        <div className='mt-8 pt-8 border-t border-slate-800 text-center text-sm'>
          <p>
            &copy; {new Date().getFullYear()} AP Gaming Hub. Alle rechten
            voorbehouden.
          </p>
          <p>
            Ontwikkeld door{' '}
            <a
              href='https://milanmareels.be/'
              className='text-red-500 hover:underline'
              target='_blank'
            >
              Milan Mareels
            </a>{' '}
            en{' '}
            <a
              href='https://www.linkedin.com/in/stijn-voeten-237941103/'
              className='text-red-500 hover:underline'
              target='_blank'
            >
              Stijn Voeten
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

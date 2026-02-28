import Link from 'next/link';
import { ShieldX } from 'lucide-react';

export default function UnknownUserPage() {
  return (
    <div className='min-h-screen bg-slate-950 flex items-center justify-center text-white px-4'>
      <div className='text-center max-w-md'>
        <div className='bg-red-600/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6'>
          <ShieldX className='text-red-500' size={40} />
        </div>
        <h1 className='text-3xl font-black mb-3'>
          GEEN <span className='text-red-600'>TOEGANG</span>
        </h1>
        <p className='text-gray-400 mb-8'>
          Je Google account is niet gekoppeld aan een gebruiker in dit systeem.
          Neem contact op met een beheerder als je denkt dat dit een fout is.
        </p>
        <Link
          href='/'
          className='bg-slate-800 border border-slate-700 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-700 transition-all inline-block'
        >
          Terug naar Home
        </Link>
      </div>
    </div>
  );
}

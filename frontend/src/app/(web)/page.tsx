import Link from 'next/link';

export default function HomePage() {
  return (
    <div className='min-h-screen flex items-center justify-center relative overflow-hidden'>
      <div className='absolute inset-0 z-0 bg-gradient-to-b from-gray-900 to-slate-950' />

      <div className='container mx-auto px-4 z-10 text-center'>
        <h1 className='text-6xl md:text-8xl font-black tracking-tighter mb-6'>
          <span className='text-red-600'>AP</span> GAMING HUB
        </h1>
        <div className='flex flex-col sm:flex-row justify-center gap-4'>
          <Link
            href='/reservations'
            className='bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg shadow-red-900/20'
          >
            Reserveer
          </Link>
          <Link
            href='/schedule'
            className='bg-slate-800 border border-slate-700 text-white px-8 py-4 rounded-xl font-bold hover:bg-slate-700 transition-all'
          >
            Openingsuren
          </Link>
        </div>
      </div>
    </div>
  );
}

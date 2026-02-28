'use client';

import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  useEffect(() => {
    // Automatically redirect to Google OAuth
    window.location.href =
      '/api/auth/google/login?returnUrl=/admin/reservations';
  }, []);

  return (
    <div className='min-h-screen bg-slate-950 flex items-center justify-center text-white'>
      <div className='text-center'>
        <Loader2 className='animate-spin mx-auto mb-4' size={32} />
        <p className='text-gray-400'>Doorverwijzen naar Google...</p>
      </div>
    </div>
  );
}

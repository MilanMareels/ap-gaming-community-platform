'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle } from 'lucide-react';

function buildLoginHref(provider: 'google' | 'microsoft', returnUrl: string) {
  const safe = returnUrl || '/admin/reservations';
  return `/api/auth/${provider}/login?returnUrl=${encodeURIComponent(safe)}`;
}

function LoginContent() {
  const searchParams = useSearchParams();
  const [returnUrl, setReturnUrl] = useState('/admin/reservations');
  const authFailed = searchParams.get('authfailed') === '1';

  useEffect(() => {
    const ru = searchParams.get('returnUrl');
    if (ru) setReturnUrl(ru);
  }, [searchParams]);

  const googleHref = useMemo(() => buildLoginHref('google', returnUrl), [returnUrl]);
  const microsoftHref = useMemo(() => buildLoginHref('microsoft', returnUrl), [returnUrl]);

  return (
    <div className='min-h-screen bg-slate-950 flex items-center justify-center text-white px-4'>
      <div className='w-full max-w-md bg-[#020618]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl'>
        <h1 className='text-3xl font-bold tracking-tight mb-2 text-center'>
          Login bij <span className='text-[#d42422]'>AP Gaming Hub</span>
        </h1>
        <p className='text-gray-400 text-sm text-center mb-8'>Kies een provider om in te loggen.</p>

        {authFailed && (
          <div className='mb-6 flex items-start gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-200'>
            <AlertCircle className='shrink-0 mt-0.5' size={18} />
            <span>Je sessie is verlopen. Log opnieuw in.</span>
          </div>
        )}

        <div className='space-y-3'>
          <a
            href={microsoftHref}
            className='flex items-center justify-center gap-3 w-full rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors py-3 font-medium'
          >
            <MicrosoftIcon />
            Login met Microsoft
          </a>
          <a
            href={googleHref}
            className='flex items-center justify-center gap-3 w-full rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors py-3 font-medium'
          >
            <GoogleIcon />
            Login met Google
          </a>
        </div>

        <p className='text-xs text-gray-500 text-center mt-6'>Studenten kunnen het beste Microsoft gebruiken met hun AP-account.</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}

function MicrosoftIcon() {
  return (
    <svg width='18' height='18' viewBox='0 0 23 23' xmlns='http://www.w3.org/2000/svg'>
      <rect width='10' height='10' fill='#f25022' />
      <rect x='12' width='10' height='10' fill='#7fba00' />
      <rect y='12' width='10' height='10' fill='#00a4ef' />
      <rect x='12' y='12' width='10' height='10' fill='#ffb900' />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width='18' height='18' viewBox='0 0 48 48' xmlns='http://www.w3.org/2000/svg'>
      <path fill='#FFC107' d='M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z' />
      <path fill='#FF3D00' d='M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z' />
      <path fill='#4CAF50' d='M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-1.9 1.4-4.4 2.4-7.2 2.4-5.2 0-9.6-3.4-11.3-8L6.2 33C9.5 39.6 16.2 44 24 44z' />
      <path fill='#1976D2' d='M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.2 5.2C40.8 35.5 44 30.2 44 24c0-1.3-.1-2.4-.4-3.5z' />
    </svg>
  );
}

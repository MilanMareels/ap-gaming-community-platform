import Link from 'next/link';
import { Ban } from 'lucide-react';
import type { Metadata } from 'next';
import { cardImage } from '@/og/cards';
import { pageMetadata } from '@/util/seo';
import DiscordIcon from '@/components/ui/DiscordIcon';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({ title: 'Account geblokkeerd', noindex: true, image: await cardImage('page', 'blocked') });
}

const untilFormat = new Intl.DateTimeFormat('nl-BE', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Brussels' });

/** Where the login sends someone whose account is blocked, with the end of the block when there is one. */
export default async function BlockedPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { until } = await searchParams;
  const end = typeof until === 'string' ? new Date(until) : null;
  const validEnd = end && !Number.isNaN(end.getTime()) ? end : null;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white px-4">
      <div className="text-center max-w-md">
        <div className="bg-red-600/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Ban className="text-red-500" size={40} />
        </div>
        <h1 className="text-3xl font-black mb-3">
          ACCOUNT <span className="text-red-600">GEBLOKKEERD</span>
        </h1>
        <p className="text-gray-400 mb-2">
          Je account is geblokkeerd door het team van de AP Gaming Hub. Je kan daardoor niet inloggen en geen reservaties maken.
        </p>
        <p className="text-white font-semibold mb-8">
          {validEnd ? `Je kan opnieuw inloggen vanaf ${untilFormat.format(validEnd)}.` : 'Deze blokkering heeft geen einddatum.'}
        </p>
        <p className="text-sm text-gray-500 mb-8">
          Denk je dat dit een vergissing is, of wil je er meer over weten? Spreek een medewerker aan in de Gaming Hub of contacteer ons via Discord.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href="https://discord.gg/FGCC9GTetC"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#d42422] hover:bg-[#ff3333] text-white px-6 py-3 rounded-xl font-bold transition-all"
          >
            <DiscordIcon size={18} /> Discord
          </a>
          <Link
            href="/info"
            className="bg-slate-800 border border-slate-700 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-700 transition-all inline-block"
          >
            Huisreglement
          </Link>
        </div>
      </div>
    </div>
  );
}

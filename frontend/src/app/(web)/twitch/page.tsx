import TwitchEmbed from '@/components/twitch/TwitchEmbed';

export default function TwitchPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-500">Live</p>
        <h1 className="mt-2 text-3xl font-black text-white">Twitch stream</h1>
      </div>
      <TwitchEmbed />
    </main>
  );
}

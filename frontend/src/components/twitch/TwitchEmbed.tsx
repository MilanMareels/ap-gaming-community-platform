'use client';

import { Maximize, Minimize } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { apiClient } from '@/api';

type TwitchEmbedProps = {
  signage?: boolean;
};

function normalizeChannel(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';

  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const channel = url.pathname.split('/').filter(Boolean).pop() ?? '';
    return channel.replace(/^@/, '').toLowerCase();
  } catch {
    return trimmed.replace(/^@/, '').replace(/^.*\//, '').toLowerCase();
  }
}

function isValidChannel(channel: string): boolean {
  return /^[a-z0-9_]+$/.test(channel);
}

export default function TwitchEmbed({ signage = false }: TwitchEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [channel, setChannel] = useState('');
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadChannel() {
      try {
        const response = await apiClient.GET('/settings/public', {});
        const configuredChannel = response.data?.find((setting) => setting.key === 'twitchChannel')?.value ?? '';
        if (active) setChannel(normalizeChannel(configuredChannel));
      } catch (error) {
        console.error('Failed to load Twitch channel:', error);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadChannel();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await containerRef.current.requestFullscreen();
    }
  };

  const validChannel = isValidChannel(channel);

  if (loading) {
    return <div className="flex min-h-64 items-center justify-center bg-slate-950 text-sm text-gray-400">Twitch stream laden...</div>;
  }

  if (!validChannel) {
    return (
      <div className="flex min-h-64 items-center justify-center bg-slate-950 p-6 text-center text-sm text-gray-400">
        Configureer eerst een geldig Twitch-kanaal via de admin instellingen.
      </div>
    );
  }

  const parent = typeof window === 'undefined' ? '' : window.location.hostname;
  const playerUrl = `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${encodeURIComponent(parent)}${signage ? '&autoplay=true&muted=true' : ''}`;

  return (
    <div
      ref={containerRef}
      className={signage ? 'relative h-screen w-screen bg-black' : 'relative aspect-video w-full overflow-hidden rounded-xl bg-black'}
    >
      <iframe
        src={playerUrl}
        title={`Twitch stream ${channel}`}
        width="854"
        height="480"
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
      {!signage && (
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'Volledig scherm verlaten' : 'Volledig scherm openen'}
          title={isFullscreen ? 'Volledig scherm verlaten' : 'Volledig scherm openen'}
          className="absolute right-3 top-3 z-10 rounded-lg bg-black/70 p-2 text-white opacity-70 transition-opacity hover:opacity-100"
        >
          {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
        </button>
      )}
    </div>
  );
}

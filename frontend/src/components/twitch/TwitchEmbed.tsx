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

declare global {
  interface Window {
    Twitch?: {
      Embed: new (
        elementId: string,
        options: {
          channel: string;
          width: string;
          height: string;
          parent: string[];
          autoplay: boolean;
          muted: boolean;
          layout?: string;
        },
      ) => unknown;
    };
  }
}

export default function TwitchEmbed({ signage = false }: TwitchEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const embedRef = useRef<HTMLDivElement>(null);
  const [channel, setChannel] = useState('');
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [embedReady, setEmbedReady] = useState(false);

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
    const script = document.createElement('script');
    script.src = 'https://embed.twitch.tv/embed/v1.js';
    script.async = true;
    script.onload = () => setEmbedReady(true);
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (!embedReady || !channel || !isValidChannel(channel) || !embedRef.current) return;
    if (!window.Twitch?.Embed) return;

    embedRef.current.innerHTML = '';
    const embedId = 'twitch-embed-target';
    embedRef.current.id = embedId;

    new window.Twitch.Embed(embedId, {
      channel,
      width: '100%',
      height: '100%',
      parent: [window.location.hostname],
      autoplay: true,
      muted: true,
      layout: 'video',
    });
  }, [embedReady, channel]);

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

  return (
    <div
      ref={containerRef}
      className={signage ? 'relative h-screen w-screen bg-black' : 'relative aspect-video w-full bg-black'}
    >
      <div ref={embedRef} className="h-full w-full" />
      {!signage && (
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'Volledig scherm verlaten' : 'Volledig scherm openen'}
          title={isFullscreen ? 'Volledig scherm verlaten' : 'Volledig scherm openen'}
          className="absolute right-3 top-3 z-10 rounded-lg bg-black/70 p-2 text-white transition-opacity hover:bg-black"
        >
          {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
        </button>
      )}
    </div>
  );
}

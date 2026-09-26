'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, FileText, Link as LinkIcon, Unlink } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/api';
import type { Setting } from '@/api';
import { getApiErrorMessage } from '@/util/api-error';

export interface Form {
  id: number;
  title: string;
  url: string;
}

type LinkedProviders = {
  google: { id: number; ssoId: string }[];
  microsoft: { id: number; ssoId: string }[];
};

export default function AdminSettingsPage() {
  const searchParams = useSearchParams();
  const linkedFlash = searchParams.get('linked');
  const linkErrorFlash = searchParams.get('linkError');

  const [settings, setSettings] = useState<Setting[]>([]);

  const [formTitle, setFormTitle] = useState('');
  const [formUrl, setFormUrl] = useState('');

  const [links, setLinks] = useState<LinkedProviders>({ google: [], microsoft: [] });
  const [linksError, setLinksError] = useState('');

  const fetchLinks = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/links', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load linked providers');
      const data = (await res.json()) as LinkedProviders;
      setLinks(data);
    } catch (err) {
      console.error('Failed to load linked providers:', err);
    }
  }, []);

  const unlinkProvider = async (provider: 'google' | 'microsoft') => {
    if (!confirm(`Koppeling met ${provider} verwijderen?`)) return;
    setLinksError('');
    try {
      const res = await fetch(`/api/auth/links/${provider}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(getApiErrorMessage(body, `${res.status} ${res.statusText}`));
      }
      await fetchLinks();
    } catch (err) {
      setLinksError(err instanceof Error ? err.message : 'Unlink failed');
    }
  };

  async function fetchData() {
    try {
      const [settingsRes, formRes] = await Promise.all([
        apiClient.GET('/settings', {}),
        apiClient.GET('/settings/form', {}),
      ]);

      if (settingsRes.data) setSettings(settingsRes.data as Setting[]);
      if (formRes.data) {
        const formData = formRes.data as unknown as Form;
        setFormTitle(formData.title || '');
        setFormUrl(formData.url || '');
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  }

  useEffect(() => {
    fetchData();
    fetchLinks();
  }, [fetchLinks]);

  const handleUpdateSetting = async (key: string, value: string) => {
    try {
      await apiClient.PATCH('/settings', { body: { key, value } });
      await fetchData();
    } catch (err) {
      console.error('Failed to update setting:', err);
    }
  };

  const handleSaveForm = async () => {
    try {
      await apiClient.PATCH('/settings/form', {
        body: { title: formTitle, url: formUrl },
      });
    } catch (err) {
      console.error('Failed to save form:', err);
    }
  };

  const microsoftLinked = links.microsoft.length > 0;
  const googleLinked = links.google.length > 0;
  const onlyOneLinkRemaining = links.microsoft.length + links.google.length <= 1;

  return (
    <div className="space-y-8">
      {/* Mijn account / SSO koppelingen */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
          <LinkIcon size={20} /> Mijn account
        </h2>
        <p className="text-gray-400 text-sm mb-4">Koppel meerdere SSO-providers aan je account zodat je met beide kan inloggen.</p>

        {linkedFlash && (
          <div className='mb-4 flex items-start gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-300'>
            <CheckCircle2 size={16} className='shrink-0 mt-0.5' />
            <span>{linkedFlash === 'microsoft' ? 'Microsoft' : 'Google'} succesvol gekoppeld.</span>
          </div>
        )}
        {linkErrorFlash && (
          <div className='mb-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300'>
            <AlertCircle size={16} className='shrink-0 mt-0.5' />
            <span>Koppelen mislukt: {decodeURIComponent(linkErrorFlash)}</span>
          </div>
        )}
        {linksError && (
          <div className='mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300'>{linksError}</div>
        )}

        <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
          <ProviderRow
            name='Microsoft'
            linked={microsoftLinked}
            disableUnlink={onlyOneLinkRemaining}
            onLink={() => {
              window.location.href = '/api/auth/microsoft/login?linkMode=true&returnUrl=/admin/settings';
            }}
            onUnlink={() => unlinkProvider('microsoft')}
          />
          <ProviderRow
            name='Google'
            linked={googleLinked}
            disableUnlink={onlyOneLinkRemaining}
            onLink={() => {
              window.location.href = '/api/auth/google/login?linkMode=true&returnUrl=/admin/settings';
            }}
            onUnlink={() => unlinkProvider('google')}
          />
        </div>
      </div>

      {/* Formulier Instellingen */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <FileText size={20} /> Formulier Instellingen
        </h2>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-1/3">
            <label className="text-xs font-bold text-gray-500 uppercase">Titel van het formulier</label>
            <input
              type="text"
              placeholder="Bijv. Inschrijfformulier"
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white mt-1"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              onBlur={handleSaveForm}
            />
          </div>
          <div className="w-full md:flex-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Google Form URL</label>
            <input
              type="url"
              placeholder="https://docs.google.com/forms/..."
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white mt-1"
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
              onBlur={handleSaveForm}
            />
          </div>
        </div>
      </div>

      {/* Inventory Settings */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <h2 className="text-xl font-bold mb-4">Inventory</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {['pc', 'ps5', 'switch', 'controller', 'Nintendo Controllers'].map((key) => {
            const setting = settings.find((s) => s.key === key);
            return (
              <div key={key} className="flex items-center gap-4">
                <label className="text-sm font-bold text-gray-400 flex-1 uppercase">{key}</label>
                <input
                  type="number"
                  min="0"
                  className="bg-slate-950 border border-slate-700 rounded p-2 text-white w-24"
                  value={setting?.value || '0'}
                  onChange={(e) => handleUpdateSetting(key, e.target.value)}
                />
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}

function ProviderRow({
  name,
  linked,
  disableUnlink,
  onLink,
  onUnlink,
}: {
  name: string;
  linked: boolean;
  disableUnlink: boolean;
  onLink: () => void;
  onUnlink: () => void;
}) {
  return (
    <div className='flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg p-4'>
      <div>
        <div className='font-bold text-white'>{name}</div>
        <div className={`text-xs ${linked ? 'text-green-400' : 'text-gray-500'}`}>{linked ? 'Gekoppeld' : 'Niet gekoppeld'}</div>
      </div>
      {linked ? (
        <Button size='sm' variant='secondary' onClick={onUnlink} disabled={disableUnlink} title={disableUnlink ? 'Je kan je enige login-methode niet ontkoppelen' : ''}>
          <Unlink size={14} /> Ontkoppel
        </Button>
      ) : (
        <Button size='sm' variant='primary' onClick={onLink}>
          <LinkIcon size={14} /> Koppel
        </Button>
      )}
    </div>
  );
}

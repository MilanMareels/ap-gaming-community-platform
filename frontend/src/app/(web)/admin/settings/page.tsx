'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, FileText, Link as LinkIcon, Unlink, Plus, Pencil, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/api';
import type { Setting, InventoryAdjustment } from '@/api';
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

interface AdjustmentFormState {
  inventory: string;
  quantity: number;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  reason: string;
}

const emptyAdjustmentForm: AdjustmentFormState = {
  inventory: 'pc',
  quantity: -1,
  startDate: '',
  startTime: '',
  endDate: '',
  endTime: '',
  reason: '',
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toDateInputValue(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toTimeInputValue(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function AdminSettingsPage() {
  const searchParams = useSearchParams();
  const linkedFlash = searchParams.get('linked');
  const linkErrorFlash = searchParams.get('linkError');

  const [settings, setSettings] = useState<Setting[]>([]);

  const [formTitle, setFormTitle] = useState('');
  const [formUrl, setFormUrl] = useState('');

  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>([]);
  const [adjustmentForm, setAdjustmentForm] = useState<AdjustmentFormState>(emptyAdjustmentForm);
  const [editingAdjustmentId, setEditingAdjustmentId] = useState<number | null>(null);
  const [showAdjustmentForm, setShowAdjustmentForm] = useState(false);
  const [adjustmentError, setAdjustmentError] = useState('');

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

  const fetchAdjustments = useCallback(async () => {
    try {
      const res = await apiClient.GET('/inventory-adjustments', {});
      if (res.data) setAdjustments(res.data as InventoryAdjustment[]);
    } catch (err) {
      console.error('Failed to fetch adjustments:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchLinks();
    fetchAdjustments();
  }, [fetchLinks, fetchAdjustments]);

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

  const handleOpenAdjustmentForm = (adjustment?: InventoryAdjustment) => {
    if (adjustment) {
      setEditingAdjustmentId(adjustment.id);
      setAdjustmentForm({
        inventory: adjustment.inventory,
        quantity: adjustment.quantity,
        startDate: toDateInputValue(adjustment.startTime),
        startTime: toTimeInputValue(adjustment.startTime),
        endDate: toDateInputValue(adjustment.endTime),
        endTime: toTimeInputValue(adjustment.endTime),
        reason: adjustment.reason || '',
      });
    } else {
      setEditingAdjustmentId(null);
      setAdjustmentForm(emptyAdjustmentForm);
    }
    setAdjustmentError('');
    setShowAdjustmentForm(true);
  };

  const handleCloseAdjustmentForm = () => {
    setShowAdjustmentForm(false);
    setEditingAdjustmentId(null);
    setAdjustmentForm(emptyAdjustmentForm);
    setAdjustmentError('');
  };

  const handleSaveAdjustment = async () => {
    setAdjustmentError('');

    if (!adjustmentForm.startDate || !adjustmentForm.startTime || !adjustmentForm.endDate || !adjustmentForm.endTime) {
      setAdjustmentError('Vul alle datum- en tijdvelden in');
      return;
    }

    if (adjustmentForm.quantity === 0) {
      setAdjustmentError('Aantal mag niet 0 zijn');
      return;
    }

    const startTime = `${adjustmentForm.startDate}T${adjustmentForm.startTime}:00.000Z`;
    const endTime = `${adjustmentForm.endDate}T${adjustmentForm.endTime}:00.000Z`;

    if (new Date(startTime) >= new Date(endTime)) {
      setAdjustmentError('Starttijd moet voor eindtijd liggen');
      return;
    }

    try {
      const body = {
        inventory: adjustmentForm.inventory as 'pc' | 'ps5' | 'switch',
        quantity: adjustmentForm.quantity,
        startTime,
        endTime,
        reason: adjustmentForm.reason || undefined,
      };

      if (editingAdjustmentId) {
        const res = await apiClient.PATCH('/inventory-adjustments/{id}', {
          params: { path: { id: editingAdjustmentId.toString() } },
          body,
        });
        if (res.error) throw new Error(getApiErrorMessage(res.error, 'Update mislukt'));
      } else {
        const res = await apiClient.POST('/inventory-adjustments', { body });
        if (res.error) throw new Error(getApiErrorMessage(res.error, 'Aanmaken mislukt'));
      }

      handleCloseAdjustmentForm();
      await fetchAdjustments();
    } catch (err) {
      setAdjustmentError(err instanceof Error ? err.message : 'Er ging iets mis');
    }
  };

  const handleDeleteAdjustment = async (id: number) => {
    if (!confirm('Weet je zeker dat je deze aanpassing wilt verwijderen?')) return;
    try {
      await apiClient.DELETE('/inventory-adjustments/{id}', {
        params: { path: { id: id.toString() } },
      });
      await fetchAdjustments();
    } catch (err) {
      console.error('Failed to delete adjustment:', err);
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

      {/* Inventory Adjustments */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold">Voorraad Aanpassingen</h2>
            <p className="text-gray-400 text-sm mt-1">Tijdelijke wijzigingen in beschikbare inventory (bv. voor events)</p>
          </div>
          <Button size="sm" onClick={() => handleOpenAdjustmentForm()}>
            <Plus size={16} /> Nieuw
          </Button>
        </div>

        {/* Create/Edit Form */}
        {showAdjustmentForm && (
          <div className="bg-slate-950 border border-slate-700 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white">
                {editingAdjustmentId ? 'Aanpassing bewerken' : 'Nieuwe aanpassing'}
              </h3>
              <button onClick={handleCloseAdjustmentForm} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {adjustmentError && (
              <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-300">
                {adjustmentError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Type</label>
                <select
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white mt-1"
                  value={adjustmentForm.inventory}
                  onChange={(e) => setAdjustmentForm((f) => ({ ...f, inventory: e.target.value }))}
                >
                  <option value="pc">PC</option>
                  <option value="ps5">PlayStation 5</option>
                  <option value="switch">Nintendo Switch</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Aantal (+ of -)</label>
                <input
                  type="number"
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white mt-1"
                  value={adjustmentForm.quantity}
                  onChange={(e) => setAdjustmentForm((f) => ({ ...f, quantity: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Startdatum</label>
                <input
                  type="date"
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white mt-1"
                  value={adjustmentForm.startDate}
                  onChange={(e) => setAdjustmentForm((f) => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Starttijd</label>
                <input
                  type="time"
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white mt-1"
                  value={adjustmentForm.startTime}
                  onChange={(e) => setAdjustmentForm((f) => ({ ...f, startTime: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Einddatum</label>
                <input
                  type="date"
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white mt-1"
                  value={adjustmentForm.endDate}
                  onChange={(e) => setAdjustmentForm((f) => ({ ...f, endDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Eindtijd</label>
                <input
                  type="time"
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white mt-1"
                  value={adjustmentForm.endTime}
                  onChange={(e) => setAdjustmentForm((f) => ({ ...f, endTime: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Reden (optioneel)</label>
                <input
                  type="text"
                  placeholder="Bv. Switch in gebruik voor toernooi"
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white mt-1"
                  value={adjustmentForm.reason}
                  onChange={(e) => setAdjustmentForm((f) => ({ ...f, reason: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-3">
              <Button size="sm" variant="secondary" onClick={handleCloseAdjustmentForm}>
                Annuleren
              </Button>
              <Button size="sm" onClick={handleSaveAdjustment}>
                {editingAdjustmentId ? 'Opslaan' : 'Aanmaken'}
              </Button>
            </div>
          </div>
        )}

        {/* Adjustments Table */}
        {adjustments.length === 0 ? (
          <p className="text-gray-500 text-sm">Geen aanpassingen gevonden.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-slate-800">
                  <th className="pb-2 font-semibold">Type</th>
                  <th className="pb-2 font-semibold">Aantal</th>
                  <th className="pb-2 font-semibold">Start</th>
                  <th className="pb-2 font-semibold">Einde</th>
                  <th className="pb-2 font-semibold">Reden</th>
                  <th className="pb-2 font-semibold text-right">Acties</th>
                </tr>
              </thead>
              <tbody>
                {adjustments.map((adj) => (
                  <tr key={adj.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="py-2 uppercase font-bold text-white">{adj.inventory}</td>
                    <td className={`py-2 font-bold ${adj.quantity > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {adj.quantity > 0 ? `+${adj.quantity}` : adj.quantity}
                    </td>
                    <td className="py-2 text-gray-300">{formatDateTime(adj.startTime)}</td>
                    <td className="py-2 text-gray-300">{formatDateTime(adj.endTime)}</td>
                    <td className="py-2 text-gray-400">{adj.reason || '—'}</td>
                    <td className="py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenAdjustmentForm(adj)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-slate-700 transition-colors"
                          title="Bewerken"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteAdjustment(adj.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                          title="Verwijderen"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

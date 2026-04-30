'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Lock, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/api';
import type { Setting, AdminUserWithUser } from '@/api';

export interface Form {
  id: number;
  title: string;
  url: string;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUserWithUser[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminSNumber, setNewAdminSNumber] = useState('');
  const [newAdminGmail, setNewAdminGmail] = useState('');

  const [formTitle, setFormTitle] = useState('');
  const [formUrl, setFormUrl] = useState('');

  async function fetchData() {
    try {
      const [settingsRes, adminsRes, formRes] = await Promise.all([
        apiClient.GET('/settings', {}),
        apiClient.GET('/settings/admins', {}),
        apiClient.GET('/settings/form', {}),
      ]);

      if (settingsRes.data) setSettings(settingsRes.data as Setting[]);
      if (adminsRes.data) setAdminUsers(adminsRes.data as AdminUserWithUser[]);
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
  }, []);

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

  const handleAddAdmin = async () => {
    if (!newAdminEmail.trim() || !newAdminSNumber.trim() || !newAdminGmail.trim()) return;
    try {
      await apiClient.POST('/settings/admins', {
        body: {
          email: newAdminEmail,
          sNumber: newAdminSNumber,
          gmailEmail: newAdminGmail,
        },
      });
      setNewAdminEmail('');
      setNewAdminSNumber('');
      setNewAdminGmail('');
      await fetchData();
    } catch (err: unknown) {
      alert((err as Error)?.message || 'Failed to add admin');
    }
  };

  const handleRemoveAdmin = async (id: number) => {
    if (!confirm('Are you sure you want to remove this admin?')) return;
    try {
      await apiClient.DELETE('/settings/admins/{id}', {
        params: { path: { id: id.toString() } },
      });
      await fetchData();
    } catch (err) {
      console.error('Failed to remove admin:', err);
    }
  };

  return (
    <div className="space-y-8">
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

      {/* Admin Whitelist */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Lock size={20} /> Admin Whitelist
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
          <input
            type="email"
            placeholder="Student e-mail (bijv. student@student.ap.be)"
            className="bg-slate-950 border border-slate-700 rounded p-2 text-white"
            value={newAdminEmail}
            onChange={(e) => setNewAdminEmail(e.target.value)}
          />
          <input
            type="text"
            placeholder="S-nummer (bijv. s123456)"
            className="bg-slate-950 border border-slate-700 rounded p-2 text-white"
            value={newAdminSNumber}
            onChange={(e) => setNewAdminSNumber(e.target.value)}
          />
          <input
            type="email"
            placeholder="Gmail (bijv. naam@gmail.com)"
            className="bg-slate-950 border border-slate-700 rounded p-2 text-white"
            value={newAdminGmail}
            onChange={(e) => setNewAdminGmail(e.target.value)}
          />
        </div>
        <div className="mb-4">
          <Button onClick={handleAddAdmin}>
            <Plus size={16} /> Add Admin
          </Button>
        </div>
        <div className="space-y-2">
          {adminUsers.map((admin) => (
            <div key={admin.id} className="flex justify-between items-center bg-slate-950 p-3 rounded">
              <div className="flex flex-col">
                <span className="font-medium">{admin.user.email}</span>
                <span className="text-xs text-gray-500">{admin.user.sNumber}</span>
              </div>
              <Button size="sm" variant="danger" onClick={() => handleRemoveAdmin(admin.id)}>
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

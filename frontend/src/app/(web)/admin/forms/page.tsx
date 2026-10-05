'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Pencil, Copy, Eye, EyeOff, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { apiClient } from '@/api';

interface DynamicForm {
  id: number;
  cuid: string;
  title: string;
  description: string | null;
  requiresAuth: boolean;
  confirmationEmail: boolean;
  discordWebhookUrl: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { submissions: number; fields: number };
}

export default function AdminFormsPage() {
  const [forms, setForms] = useState<DynamicForm[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    const res = await apiClient.GET('/forms/admin', {});
    if (res.data) setForms(res.data as unknown as DynamicForm[]);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    await apiClient.POST('/forms', { body: { title: newTitle.trim() } });
    setNewTitle('');
    setShowCreate(false);
    setCreating(false);
    refresh();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Weet je zeker dat je dit formulier wilt verwijderen? Alle inzendingen worden ook verwijderd.')) return;
    await apiClient.DELETE('/forms/{id}', { params: { path: { id: String(id) } } });
    refresh();
  };

  const handleToggleActive = async (form: DynamicForm) => {
    await apiClient.PATCH('/forms/{id}', {
      params: { path: { id: String(form.id) } },
      body: { isActive: !form.isActive },
    });
    refresh();
  };

  const handleCopyUrl = (form: DynamicForm) => {
    const url = `${window.location.origin}/forms/${form.cuid}`;
    navigator.clipboard.writeText(url);
    setCopied(form.id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Formulieren</h2>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> Nieuw formulier
        </Button>
      </div>

      {showCreate && (
        <div className="mb-6 p-4 bg-slate-900 border border-slate-800 rounded-lg">
          <h3 className="text-sm font-bold text-gray-400 uppercase mb-3">Nieuw formulier</h3>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Titel van het formulier"
              className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <Button size="sm" onClick={handleCreate} disabled={creating || !newTitle.trim()}>
              Aanmaken
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowCreate(false); setNewTitle(''); }}>
              Annuleren
            </Button>
          </div>
        </div>
      )}

      {forms.length === 0 ? (
        <p className="text-gray-500 text-center py-12">Nog geen formulieren aangemaakt.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-gray-500 uppercase text-xs">
                <th className="py-3 px-2">Titel</th>
                <th className="py-3 px-2">Status</th>
                <th className="py-3 px-2">Velden</th>
                <th className="py-3 px-2">Inzendingen</th>
                <th className="py-3 px-2">Aangemaakt</th>
                <th className="py-3 px-2 text-right">Acties</th>
              </tr>
            </thead>
            <tbody>
              {forms.map((form) => (
                <tr key={form.id} className="border-b border-slate-800/50 hover:bg-slate-900/50">
                  <td className="py-3 px-2 font-medium">{form.title}</td>
                  <td className="py-3 px-2">
                    <Badge variant={form.isActive ? 'success' : 'default'}>
                      {form.isActive ? 'Actief' : 'Inactief'}
                    </Badge>
                  </td>
                  <td className="py-3 px-2 text-gray-400">{form._count.fields}</td>
                  <td className="py-3 px-2 text-gray-400">{form._count.submissions}</td>
                  <td className="py-3 px-2 text-gray-400">
                    {new Date(form.createdAt).toLocaleDateString('nl-NL')}
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex gap-1 justify-end">
                      <Link href={`/admin/forms/${form.id}`}>
                        <Button size="sm" variant="ghost" title="Bewerken">
                          <Pencil size={14} />
                        </Button>
                      </Link>
                      <Link href={`/admin/forms/${form.id}/submissions`}>
                        <Button size="sm" variant="ghost" title="Inzendingen">
                          <ClipboardList size={14} />
                        </Button>
                      </Link>
                      <Button size="sm" variant="ghost" onClick={() => handleCopyUrl(form)} title="Kopieer URL">
                        <Copy size={14} />
                        {copied === form.id && <span className="text-xs text-green-400 ml-1">Gekopieerd!</span>}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleToggleActive(form)} title={form.isActive ? 'Deactiveren' : 'Activeren'}>
                        {form.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => handleDelete(form.id)} title="Verwijderen">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

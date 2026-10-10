'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Pencil, Copy, Eye, EyeOff, ClipboardList, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/admin/PageHeader';
import { EmptyState } from '@/components/admin/EmptyState';
import { apiClient } from '@/api';

const inputClass = 'w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 px-3 text-sm text-white placeholder:text-gray-500 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20 transition-colors';

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
    const res = await (apiClient.GET as any)('/forms/admin', {});
    if (res.data) setForms(res.data as unknown as DynamicForm[]);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    await (apiClient.POST as any)('/forms', { body: { title: newTitle.trim() } });
    setNewTitle('');
    setShowCreate(false);
    setCreating(false);
    refresh();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Weet je zeker dat je dit formulier wilt verwijderen? Alle inzendingen worden ook verwijderd.')) return;
    await (apiClient.DELETE as any)('/forms/{id}', { params: { path: { id: String(id) } } });
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
    <>
      <PageHeader
        title="Formulieren"
        description="Beheer dynamische formulieren en bekijk inzendingen."
        actions={
          <Button size="sm" variant="primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Nieuw formulier
          </Button>
        }
      />

      {showCreate && (
        <div className="mb-6 bg-linear-to-br from-slate-900 via-slate-900 to-slate-900/90 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800/60 bg-slate-900/50">
            <h3 className="text-sm font-bold text-white">Nieuw formulier</h3>
          </div>
          <div className="px-6 py-5">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Titel van het formulier"
                className={inputClass}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <Button size="sm" variant="primary" onClick={handleCreate} disabled={creating || !newTitle.trim()}>
                Aanmaken
              </Button>
              <Button size="sm" variant="secondary" onClick={() => { setShowCreate(false); setNewTitle(''); }}>
                Annuleren
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-linear-to-br from-slate-900 via-slate-900 to-slate-900/90 rounded-xl border border-slate-800 overflow-hidden">
        {forms.length === 0 ? (
          <EmptyState icon={FileText} title="Nog geen formulieren" description="Maak een nieuw formulier aan om te beginnen." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-950 text-gray-500">
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Titel</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Velden</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Inzendingen</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Aangemaakt</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-right">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {forms.map((form) => (
                  <tr key={form.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-white">{form.title}</td>
                    <td className="px-4 py-3.5">
                      <Badge variant={form.isActive ? 'success' : 'default'}>
                        {form.isActive ? 'Actief' : 'Inactief'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-gray-400">{form._count.fields}</td>
                    <td className="px-4 py-3.5 text-gray-400">{form._count.submissions}</td>
                    <td className="px-4 py-3.5 text-gray-400">
                      {new Date(form.createdAt).toLocaleDateString('nl-NL')}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex gap-1 justify-end">
                        <Link href={`/admin/forms/${form.id}`}>
                          <button className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-slate-700 transition-colors" title="Bewerken">
                            <Pencil size={14} />
                          </button>
                        </Link>
                        <Link href={`/admin/forms/${form.id}/submissions`}>
                          <button className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-slate-700 transition-colors" title="Inzendingen">
                            <ClipboardList size={14} />
                          </button>
                        </Link>
                        <button
                          onClick={() => handleCopyUrl(form)}
                          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-slate-700 transition-colors"
                          title="Kopieer URL"
                        >
                          <Copy size={14} />
                          {copied === form.id && <span className="text-xs text-green-400 ml-1">Gekopieerd!</span>}
                        </button>
                        <button
                          onClick={() => handleToggleActive(form)}
                          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-slate-700 transition-colors"
                          title={form.isActive ? 'Deactiveren' : 'Activeren'}
                        >
                          {form.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button
                          onClick={() => handleDelete(form.id)}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-900/20 transition-colors"
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
    </>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Pencil, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { apiClient } from '@/api';

interface FormSimple {
  id: number;
  cuid: string;
  title: string;
}

interface Job {
  id: number;
  title: string;
  shortDescription: string;
  description: string;
  isActive: boolean;
  formId: number | null;
  form: FormSimple | null;
  createdAt: string;
}

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [forms, setForms] = useState<FormSimple[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newFormId, setNewFormId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
    const [jobsRes, formsRes] = await Promise.all([
      apiClient.GET('/jobs/admin', {}),
      apiClient.GET('/forms/admin/simple', {}),
    ]);
    if (jobsRes.data) setJobs(jobsRes.data as unknown as Job[]);
    if (formsRes.data) setForms(formsRes.data as unknown as FormSimple[]);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    await apiClient.POST('/jobs', {
      body: {
        title: newTitle.trim(),
        description: '<p>Beschrijving...</p>',
        isActive: false,
        formId: newFormId ?? undefined,
      },
    });
    setNewTitle('');
    setNewFormId(null);
    setShowCreate(false);
    setCreating(false);
    refresh();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Weet je zeker dat je deze vacature wilt verwijderen?')) return;
    await apiClient.DELETE('/jobs/{id}', { params: { path: { id: String(id) } } });
    refresh();
  };

  const handleToggleActive = async (job: Job) => {
    await apiClient.PATCH('/jobs/{id}', {
      params: { path: { id: String(job.id) } },
      body: { isActive: !job.isActive },
    });
    refresh();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Vacatures</h2>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> Nieuwe vacature
        </Button>
      </div>

      {showCreate && (
        <div className="mb-6 p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-3">
          <h3 className="text-sm font-bold text-gray-400 uppercase">Nieuwe vacature</h3>
          <input
            type="text"
            placeholder="Titel van de vacature"
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Gekoppeld formulier (optioneel)</label>
            <select
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm mt-1"
              value={newFormId ?? ''}
              onChange={(e) => setNewFormId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Geen formulier</option>
              {forms.map((form) => (
                <option key={form.id} value={form.id}>{form.title}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <Button size="sm" onClick={handleCreate} disabled={creating || !newTitle.trim()}>
              Aanmaken
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowCreate(false); setNewTitle(''); setNewFormId(null); }}>
              Annuleren
            </Button>
          </div>
        </div>
      )}

      {jobs.length === 0 ? (
        <p className="text-gray-500 text-center py-12">Nog geen vacatures aangemaakt.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-gray-500 uppercase text-xs">
                <th className="py-3 px-2">Titel</th>
                <th className="py-3 px-2">Status</th>
                <th className="py-3 px-2">Formulier</th>
                <th className="py-3 px-2">Aangemaakt</th>
                <th className="py-3 px-2 text-right">Acties</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-b border-slate-800/50 hover:bg-slate-900/50">
                  <td className="py-3 px-2 font-medium">{job.title}</td>
                  <td className="py-3 px-2">
                    <Badge variant={job.isActive ? 'success' : 'default'}>
                      {job.isActive ? 'Actief' : 'Inactief'}
                    </Badge>
                  </td>
                  <td className="py-3 px-2 text-gray-400">
                    {job.form ? job.form.title : <span className="text-gray-600">-</span>}
                  </td>
                  <td className="py-3 px-2 text-gray-400">
                    {new Date(job.createdAt).toLocaleDateString('nl-NL')}
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex gap-1 justify-end">
                      <Link href={`/admin/jobs/${job.id}`}>
                        <Button size="sm" variant="ghost" title="Bewerken">
                          <Pencil size={14} />
                        </Button>
                      </Link>
                      <Button size="sm" variant="ghost" onClick={() => handleToggleActive(job)} title={job.isActive ? 'Deactiveren' : 'Activeren'}>
                        {job.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => handleDelete(job.id)} title="Verwijderen">
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

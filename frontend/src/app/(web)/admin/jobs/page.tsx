'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Pencil, Eye, EyeOff, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/admin/PageHeader';
import { EmptyState } from '@/components/admin/EmptyState';
import { apiClient } from '@/api';

const inputClass = 'w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 px-3 text-sm text-white placeholder:text-gray-500 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20 transition-colors';
const labelClass = 'block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5';

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
    <>
      <PageHeader
        title="Vacatures"
        description="Beheer vacatures en koppel formulieren."
        actions={
          <Button size="sm" variant="primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Nieuwe vacature
          </Button>
        }
      />

      {showCreate && (
        <div className="mb-6 bg-linear-to-br from-slate-900 via-slate-900 to-slate-900/90 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800/60 bg-slate-900/50">
            <h3 className="text-sm font-bold text-white">Nieuwe vacature</h3>
          </div>
          <div className="px-6 py-5 space-y-3">
            <div>
              <label className={labelClass}>Titel</label>
              <input
                type="text"
                placeholder="Titel van de vacature"
                className={inputClass}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Gekoppeld formulier (optioneel)</label>
              <select
                className={inputClass}
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
              <Button size="sm" variant="primary" onClick={handleCreate} disabled={creating || !newTitle.trim()}>
                Aanmaken
              </Button>
              <Button size="sm" variant="secondary" onClick={() => { setShowCreate(false); setNewTitle(''); setNewFormId(null); }}>
                Annuleren
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-linear-to-br from-slate-900 via-slate-900 to-slate-900/90 rounded-xl border border-slate-800 overflow-hidden">
        {jobs.length === 0 ? (
          <EmptyState icon={Briefcase} title="Nog geen vacatures" description="Maak een nieuwe vacature aan om te beginnen." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-950 text-gray-500">
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Titel</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Formulier</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Aangemaakt</th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-right">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-white">{job.title}</td>
                    <td className="px-4 py-3.5">
                      <Badge variant={job.isActive ? 'success' : 'default'}>
                        {job.isActive ? 'Actief' : 'Inactief'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-gray-400">
                      {job.form ? job.form.title : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-gray-400">
                      {new Date(job.createdAt).toLocaleDateString('nl-NL')}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex gap-1 justify-end">
                        <Link href={`/admin/jobs/${job.id}`}>
                          <button className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-slate-700 transition-colors" title="Bewerken">
                            <Pencil size={14} />
                          </button>
                        </Link>
                        <button
                          onClick={() => handleToggleActive(job)}
                          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-slate-700 transition-colors"
                          title={job.isActive ? 'Deactiveren' : 'Activeren'}
                        >
                          {job.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button
                          onClick={() => handleDelete(job.id)}
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

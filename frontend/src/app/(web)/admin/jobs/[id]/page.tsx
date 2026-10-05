'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
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
}

export default function AdminJobEditorPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = Number(params.id);

  const [job, setJob] = useState<Job | null>(null);
  const [forms, setForms] = useState<FormSimple[]>([]);
  const [title, setTitle] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [formId, setFormId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const refresh = useCallback(async () => {
    const [jobRes, formsRes] = await Promise.all([
      apiClient.GET('/jobs/admin/{id}', { params: { path: { id: String(jobId) } } }),
      apiClient.GET('/forms/admin/simple', {}),
    ]);
    if (jobRes.data) {
      const data = jobRes.data as unknown as Job;
      setJob(data);
      setTitle(data.title);
      setShortDescription(data.shortDescription ?? '');
      setDescription(data.description);
      setIsActive(data.isActive);
      setFormId(data.formId);
    }
    if (formsRes.data) setForms(formsRes.data as unknown as FormSimple[]);
  }, [jobId]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleSave = async () => {
    setSaving(true);
    await apiClient.PATCH('/jobs/{id}', {
      params: { path: { id: String(jobId) } },
      body: {
        title,
        shortDescription,
        description,
        isActive,
        formId: formId ?? null,
      },
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!job) return <div className="text-gray-500">Laden...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button size="sm" variant="ghost" onClick={() => router.push('/admin/jobs')}>
          <ArrowLeft size={16} />
        </Button>
        <h2 className="text-xl font-bold flex-1">Vacature bewerken</h2>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save size={14} /> {saving ? 'Opslaan...' : saved ? 'Opgeslagen!' : 'Opslaan'}
        </Button>
      </div>

      <div className="space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-4">
          <h3 className="text-sm font-bold text-gray-400 uppercase">Instellingen</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Titel</label>
              <input
                type="text"
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm mt-1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Korte beschrijving</label>
              <input
                type="text"
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm mt-1"
                placeholder="Korte beschrijving voor de vacaturelijst"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Sollicitatieformulier</label>
              <select
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm mt-1"
                value={formId ?? ''}
                onChange={(e) => setFormId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Geen formulier</option>
                {forms.map((form) => (
                  <option key={form.id} value={form.id}>{form.title}</option>
                ))}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded" />
            Actief (zichtbaar op de website)
          </label>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h3 className="text-sm font-bold text-gray-400 uppercase mb-3">Beschrijving</h3>
          <RichTextEditor content={description} onChange={setDescription} placeholder="Schrijf de vacature beschrijving..." />
        </div>
      </div>
    </div>
  );
}

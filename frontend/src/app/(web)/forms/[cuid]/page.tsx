'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, CheckCircle, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { apiClient } from '@/api';

type FieldType = 'SHORT_TEXT' | 'LONG_TEXT' | 'SELECT' | 'CHECKBOX' | 'FILE_UPLOAD' | 'TEXT_BLOCK';

interface FormField {
  id: number;
  type: FieldType;
  label: string;
  required: boolean;
  position: number;
  config: Record<string, unknown> | null;
}

interface DynamicForm {
  id: number;
  cuid: string;
  title: string;
  description: string | null;
  requiresAuth: boolean;
  isActive: boolean;
  fields: FormField[];
}

export default function PublicFormPage() {
  const params = useParams();
  const cuid = params.cuid as string;

  const [form, setForm] = useState<DynamicForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionCuid, setSubmissionCuid] = useState('');
  const [answers, setAnswers] = useState<Record<number, string | string[]>>({});
  const [files, setFiles] = useState<Record<number, File>>({});
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<number, string>>({});

  useEffect(() => {
    (async () => {
      // Check auth status
      try {
        const profileRes = await apiClient.GET('/auth/profile');
        if (profileRes.data) {
          setIsAuthenticated(true);
          const profile = profileRes.data as unknown as { email: string; name?: string };
          setEmail(profile.email || '');
          setName(profile.name || '');
        }
      } catch {}

      // Fetch form
      const res = await apiClient.GET('/forms/public/{cuid}', { params: { path: { cuid } } });
      if (res.error || !res.data) {
        setError('Formulier niet gevonden.');
        setLoading(false);
        return;
      }

      const formData = res.data as unknown as DynamicForm;
      if (!formData.isActive) {
        setError('Dit formulier is niet meer actief.');
        setLoading(false);
        return;
      }

      // Redirect to login if auth required and not logged in
      if (formData.requiresAuth && !isAuthenticated) {
        // Check once more after profile loaded
        const profileRes = await apiClient.GET('/auth/profile');
        if (!profileRes.data) {
          window.location.href = `/login?returnUrl=${encodeURIComponent(`/forms/${cuid}`)}`;
          return;
        }
      }

      setForm(formData);
      setLoading(false);
    })();
  }, [cuid, isAuthenticated]);

  const updateAnswer = (fieldId: number, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
    setValidationErrors((prev) => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  };

  const handleCheckboxChange = (fieldId: number, option: string, checked: boolean) => {
    const current = (answers[fieldId] as string[]) || [];
    const updated = checked ? [...current, option] : current.filter((v) => v !== option);
    updateAnswer(fieldId, updated);
  };

  const handleFileChange = (fieldId: number, file: File | null) => {
    if (file) {
      setFiles((prev) => ({ ...prev, [fieldId]: file }));
    } else {
      setFiles((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
    setValidationErrors((prev) => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  };

  const validate = (): boolean => {
    if (!form) return false;
    const errors: Record<number, string> = {};

    for (const field of form.fields) {
      if (field.type === 'TEXT_BLOCK') continue;
      if (!field.required) continue;

      if (field.type === 'FILE_UPLOAD') {
        if (!files[field.id]) errors[field.id] = 'Dit veld is verplicht.';
      } else if (field.type === 'CHECKBOX') {
        const vals = answers[field.id] as string[] | undefined;
        if (!vals || vals.length === 0) errors[field.id] = 'Selecteer minstens één optie.';
      } else {
        const val = answers[field.id] as string | undefined;
        if (!val || !val.trim()) errors[field.id] = 'Dit veld is verplicht.';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!form || !validate()) return;
    setSubmitting(true);
    setError('');

    try {
      const formData = new FormData();

      // Build answers array (excluding file uploads and text blocks)
      const answerPayload = form.fields
        .filter((f) => f.type !== 'FILE_UPLOAD' && f.type !== 'TEXT_BLOCK')
        .map((f) => {
          if (f.type === 'CHECKBOX') {
            return { fieldId: f.id, values: (answers[f.id] as string[]) || [] };
          }
          return { fieldId: f.id, value: (answers[f.id] as string) || '' };
        });

      formData.append('answers', JSON.stringify(answerPayload));
      if (email) formData.append('submitterEmail', email);
      if (name) formData.append('submitterName', name);

      // Add files and mapping
      const fileFieldMapping: Record<string, number> = {};
      let fileIndex = 0;
      for (const [fieldId, file] of Object.entries(files)) {
        formData.append('files', file);
        fileFieldMapping[String(fileIndex)] = Number(fieldId);
        fileIndex++;
      }
      formData.append('fileFieldMapping', JSON.stringify(fileFieldMapping));

      const response = await fetch(`/api/forms/public/${cuid}/submit`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Er is iets misgegaan.');
      }

      const result = await response.json();
      setSubmitted(true);
      setSubmissionCuid(result.submissionCuid || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er is iets misgegaan.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-24">
        <Loader2 className="animate-spin text-red-600" size={32} />
      </div>
    );
  }

  if (error && !form) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-24">
        <div className="text-center">
          <p className="text-gray-400 text-lg">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-24">
        <ScrollReveal>
          <div className="text-center max-w-md">
            <CheckCircle className="text-green-500 mx-auto mb-4" size={48} />
            <h1 className="text-2xl font-bold mb-2">Bedankt!</h1>
            <p className="text-gray-400 mb-6">Je inzending is succesvol ontvangen.</p>
            {submissionCuid && (
              <a
                href={`/forms/submission/${submissionCuid}`}
                className="text-red-400 hover:text-red-300 text-sm underline"
              >
                Bekijk je inzending
              </a>
            )}
          </div>
        </ScrollReveal>
      </div>
    );
  }

  if (!form) return null;

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-2xl mx-auto">
        <ScrollReveal>
          <h1 className="text-3xl font-bold mb-2">{form.title}</h1>
          {form.description && <p className="text-gray-400 mb-8">{form.description}</p>}
        </ScrollReveal>

        {!isAuthenticated && !form.requiresAuth && (
          <ScrollReveal>
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 mb-6 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Naam</label>
                  <input
                    type="text"
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm mt-1"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Je naam"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">E-mail</label>
                  <input
                    type="email"
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm mt-1"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="je@email.com"
                  />
                </div>
              </div>
            </div>
          </ScrollReveal>
        )}

        <div className="space-y-4">
          {form.fields.map((field) => (
            <ScrollReveal key={field.id}>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                {field.type === 'TEXT_BLOCK' ? (
                  <p className="text-gray-300 whitespace-pre-wrap">
                    {(field.config as { content?: string })?.content || ''}
                  </p>
                ) : (
                  <>
                    <label className="block text-sm font-medium mb-2">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>

                    {field.type === 'SHORT_TEXT' && (
                      <input
                        type="text"
                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm"
                        value={(answers[field.id] as string) || ''}
                        onChange={(e) => updateAnswer(field.id, e.target.value)}
                      />
                    )}

                    {field.type === 'LONG_TEXT' && (
                      <textarea
                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm min-h-[100px]"
                        value={(answers[field.id] as string) || ''}
                        onChange={(e) => updateAnswer(field.id, e.target.value)}
                      />
                    )}

                    {field.type === 'SELECT' && (
                      <select
                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm"
                        value={(answers[field.id] as string) || ''}
                        onChange={(e) => updateAnswer(field.id, e.target.value)}
                      >
                        <option value="">Selecteer...</option>
                        {((field.config as { options?: string[] })?.options || []).map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    )}

                    {field.type === 'CHECKBOX' && (
                      <div className="space-y-2">
                        {((field.config as { options?: string[] })?.options || []).map((opt) => (
                          <label key={opt} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              className="rounded"
                              checked={((answers[field.id] as string[]) || []).includes(opt)}
                              onChange={(e) => handleCheckboxChange(field.id, opt, e.target.checked)}
                            />
                            {opt}
                          </label>
                        ))}
                      </div>
                    )}

                    {field.type === 'FILE_UPLOAD' && (
                      <div>
                        {files[field.id] ? (
                          <div className="flex items-center gap-2 bg-slate-800 rounded p-2">
                            <Upload size={14} className="text-gray-400" />
                            <span className="text-sm flex-1">{files[field.id].name}</span>
                            <button onClick={() => handleFileChange(field.id, null)} className="text-red-400 hover:text-red-300">
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div>
                            <input
                              type="file"
                              className="text-sm text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-red-600 file:text-white file:text-sm file:cursor-pointer"
                              accept={((field.config as { allowedExtensions?: string[] })?.allowedExtensions || []).join(',')}
                              onChange={(e) => handleFileChange(field.id, e.target.files?.[0] || null)}
                            />
                            {((field.config as { allowedExtensions?: string[] })?.allowedExtensions || []).length > 0 && (
                              <p className="text-xs text-gray-500 mt-1">
                                Toegestaan: {((field.config as { allowedExtensions?: string[] })?.allowedExtensions || []).join(', ')}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {validationErrors[field.id] && (
                      <p className="text-red-400 text-xs mt-1">{validationErrors[field.id]}</p>
                    )}
                  </>
                )}
              </div>
            </ScrollReveal>
          ))}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="mt-6">
          <Button onClick={handleSubmit} disabled={submitting} className="w-full sm:w-auto">
            {submitting ? <Loader2 className="animate-spin" size={16} /> : null}
            {submitting ? 'Verzenden...' : 'Verzenden'}
          </Button>
        </div>
      </div>
    </div>
  );
}

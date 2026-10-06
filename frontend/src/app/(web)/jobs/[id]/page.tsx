'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ArrowLeft, Send, Eye } from 'lucide-react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
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
  form: FormSimple | null;
  createdAt: string;
}

export default function PublicJobDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const jobId = params.id as string;
  const isPreview = searchParams.get('preview') === 'true';

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const res = isPreview
        ? await apiClient.GET('/jobs/admin/{id}', { params: { path: { id: jobId } } })
        : await apiClient.GET('/jobs/{id}', { params: { path: { id: jobId } } });
      if (res.error || !res.data) {
        setError(isPreview ? 'Vacature niet gevonden of geen toegang.' : 'Vacature niet gevonden.');
      } else {
        setJob(res.data as unknown as Job);
      }
      setLoading(false);
    })();
  }, [jobId, isPreview]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-24">
        <Loader2 className="animate-spin text-red-600" size={32} />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-24">
        <div className="text-center">
          <p className="text-gray-400 text-lg mb-4">{error || 'Niet gevonden.'}</p>
          <Link href="/jobs">
            <Button variant="ghost"><ArrowLeft size={16} /> Terug naar vacatures</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        {isPreview && (
          <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg px-4 py-3 mb-6 flex items-center gap-3">
            <Eye size={18} className="text-yellow-500 shrink-0" />
            <span className="text-yellow-300 text-sm flex-1">
              Dit is een voorbeeld. Deze vacature is nog niet zichtbaar voor bezoekers.
            </span>
            <Link href={`/admin/jobs/${job.id}`}>
              <Button size="sm" variant="ghost">Terug naar editor</Button>
            </Link>
          </div>
        )}

        <ScrollReveal>
          <Link href="/jobs" className="inline-flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-6 transition-colors">
            <ArrowLeft size={14} /> Terug naar vacatures
          </Link>
        </ScrollReveal>

        <ScrollReveal>
          <div className="flex items-center gap-3 mb-6">
            <h1 className="text-3xl font-black uppercase tracking-wider">{job.title}</h1>
            {isPreview && !job.isActive && <Badge variant="warning">Inactief</Badge>}
          </div>
        </ScrollReveal>

        <ScrollReveal>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
            <div
              className="prose prose-invert prose-sm max-w-none [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_p]:text-gray-300 [&_p]:leading-relaxed [&_a]:text-red-400 [&_a:hover]:text-red-300 [&_ul]:text-gray-300 [&_ol]:text-gray-300 [&_blockquote]:border-red-600 [&_blockquote]:text-gray-400"
              dangerouslySetInnerHTML={{ __html: job.description }}
            />
          </div>
        </ScrollReveal>

        {job.form && (
          <ScrollReveal>
            <div className="bg-gradient-to-r from-red-950/50 to-slate-900 border border-red-900/30 rounded-xl p-6 text-center">
              <h2 className="text-xl font-bold mb-2">Interesse?</h2>
              <p className="text-gray-400 mb-4">Solliciteer nu via ons formulier!</p>
              <Link href={`/forms/${job.form.cuid}`}>
                <Button>
                  <Send size={16} /> Solliciteren
                </Button>
              </Link>
            </div>
          </ScrollReveal>
        )}
      </div>
    </div>
  );
}

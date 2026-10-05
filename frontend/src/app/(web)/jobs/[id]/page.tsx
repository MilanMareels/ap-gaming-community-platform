'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ArrowLeft, Send } from 'lucide-react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { Button } from '@/components/ui/Button';
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
  const jobId = params.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const res = await apiClient.GET('/jobs/{id}', { params: { path: { id: jobId } } });
      if (res.error || !res.data) {
        setError('Vacature niet gevonden.');
      } else {
        setJob(res.data as unknown as Job);
      }
      setLoading(false);
    })();
  }, [jobId]);

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
        <ScrollReveal>
          <Link href="/jobs" className="inline-flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-6 transition-colors">
            <ArrowLeft size={14} /> Terug naar vacatures
          </Link>
        </ScrollReveal>

        <ScrollReveal>
          <h1 className="text-3xl font-black uppercase tracking-wider mb-6">{job.title}</h1>
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

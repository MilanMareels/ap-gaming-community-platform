'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Briefcase, Loader2, ArrowRight } from 'lucide-react';
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

export default function PublicJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await apiClient.GET('/jobs', {});
      if (res.data) setJobs(res.data as unknown as Job[]);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-24">
        <Loader2 className="animate-spin text-red-600" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        <ScrollReveal>
          <div className="text-center mb-12">
            <h1 className="text-4xl font-black uppercase tracking-wider mb-3">
              <span className="text-red-600">Vacatures</span>
            </h1>
            <p className="text-gray-400 text-lg">
              Wil je meehelpen bij AP Gaming Hub? Bekijk onze openstaande vacatures!
            </p>
          </div>
        </ScrollReveal>

        {jobs.length === 0 ? (
          <ScrollReveal>
            <div className="text-center py-16">
              <Briefcase className="mx-auto text-gray-600 mb-4" size={48} />
              <p className="text-gray-500 text-lg">Er zijn momenteel geen openstaande vacatures.</p>
              <p className="text-gray-600 text-sm mt-2">Kom later nog eens terug!</p>
            </div>
          </ScrollReveal>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <ScrollReveal key={job.id}>
                <Link href={`/jobs/${job.id}`}>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-red-600/50 transition-colors group">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h2 className="text-xl font-bold mb-2 group-hover:text-red-400 transition-colors">
                          {job.title}
                        </h2>
                        {job.shortDescription && (
                          <p className="text-gray-400 text-sm line-clamp-2">
                            {job.shortDescription}
                          </p>
                        )}
                      </div>
                      <ArrowRight className="text-gray-600 group-hover:text-red-400 transition-colors mt-1 shrink-0" size={20} />
                    </div>
                  </div>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

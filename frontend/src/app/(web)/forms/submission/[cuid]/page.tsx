'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, Send, Download, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { apiClient } from '@/api';
import type { components } from '@/api';

type AuthProfile = components['schemas']['AuthProfileResponseDto'];

interface SubmissionAnswer {
  id: number;
  value: string | null;
  values: string[] | null;
  filePath: string | null;
  fileName: string | null;
  field: {
    id: number;
    label: string;
    type: string;
  };
}

interface SubmissionComment {
  id: number;
  content: string;
  authorName: string | null;
  isAdmin: boolean;
  createdAt: string;
  user: { id: number; name: string | null } | null;
}

interface Submission {
  id: number;
  cuid: string;
  submitterEmail: string | null;
  submitterName: string | null;
  createdAt: string;
  form: { id: number; title: string };
  answers: SubmissionAnswer[];
  comments: SubmissionComment[];
}

export default function PublicSubmissionPage() {
  const params = useParams();
  const cuid = params.cuid as string;

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);

  const refresh = useCallback(async () => {
    const res = await apiClient.GET('/forms/submission/{cuid}', { params: { path: { cuid } } }) as { data?: Submission; error?: any; response?: Response };
    if (res.error) {
      if (res.error?.statusCode === 401 || res.response?.status === 401) {
        setAccessDenied(true);
      } else {
        setError('Inzending niet gevonden.');
      }
    } else if (res.data) {
      setSubmission(res.data);
    } else {
      setError('Inzending niet gevonden.');
    }
    setLoading(false);
  }, [cuid]);

  useEffect(() => {
    (async () => {
      const profileRes = await apiClient.GET('/auth/profile', {}).catch(() => null);
      if (profileRes?.data) setProfile(profileRes.data);
      await refresh();
    })();
  }, [refresh]);

  const handleSendComment = async () => {
    if (!commentText.trim()) return;
    setSending(true);
    await apiClient.POST('/forms/submission/{cuid}/comments', {
      params: { path: { cuid } },
      body: { content: commentText.trim() },
    });
    setCommentText('');
    setSending(false);
    refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-24">
        <Loader2 className="animate-spin text-red-600" size={32} />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-24 gap-4">
        <ShieldAlert className="text-red-500" size={48} />
        <p className="text-gray-400 text-lg">Je hebt geen toegang tot deze inzending.</p>
        {!profile && (
          <a href={`/login?returnUrl=${encodeURIComponent(`/forms/submission/${cuid}`)}`}>
            <Button size="sm">Inloggen</Button>
          </a>
        )}
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-24">
        <p className="text-gray-400 text-lg">{error || 'Niet gevonden.'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-2xl mx-auto">
        <ScrollReveal>
          <h1 className="text-2xl font-bold mb-1">{submission.form.title}</h1>
          <p className="text-gray-500 text-sm mb-6">
            Ingediend op {new Date(submission.createdAt).toLocaleString('nl-NL')}
            {submission.submitterName && ` door ${submission.submitterName}`}
          </p>
        </ScrollReveal>

        {/* Answers */}
        <ScrollReveal>
          <div className="space-y-3 mb-8">
            {submission.answers
              .filter((a) => a.field.type !== 'TEXT_BLOCK')
              .map((answer) => (
                <div key={answer.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                  <div className="text-xs font-bold text-gray-500 uppercase mb-1">{answer.field.label}</div>
                  <div className="text-sm">
                    {answer.filePath ? (
                      <a
                        href={`/api/${answer.filePath}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-400 hover:text-red-300 flex items-center gap-1"
                      >
                        <Download size={12} /> {answer.fileName}
                      </a>
                    ) : answer.values ? (
                      (answer.values as string[]).join(', ')
                    ) : (
                      answer.value || '-'
                    )}
                  </div>
                </div>
              ))}
          </div>
        </ScrollReveal>

        {/* Comments */}
        <ScrollReveal>
          <h2 className="text-lg font-bold mb-4">Reacties ({submission.comments.length})</h2>

          {submission.comments.length > 0 && (
            <div className="space-y-3 mb-6">
              {submission.comments.map((comment) => (
                <div
                  key={comment.id}
                  className={`rounded-lg p-4 ${
                    comment.isAdmin
                      ? 'bg-red-950/20 border border-red-900/30'
                      : 'bg-slate-900 border border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold">
                      {comment.user?.name || comment.authorName || 'Anoniem'}
                    </span>
                    {comment.isAdmin && <Badge variant="danger">Admin</Badge>}
                    <span className="text-xs text-gray-500">
                      {new Date(comment.createdAt).toLocaleString('nl-NL')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300">{comment.content}</p>
                </div>
              ))}
            </div>
          )}

          {/* Add comment */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-bold text-gray-400">
              Reageren{profile?.name ? ` als ${profile.name}` : ' als Anoniem'}
            </h3>
            <textarea
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm min-h-[80px]"
              placeholder="Schrijf een reactie..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <Button size="sm" onClick={handleSendComment} disabled={sending || !commentText.trim()}>
              <Send size={14} /> {sending ? 'Verzenden...' : 'Verzenden'}
            </Button>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}

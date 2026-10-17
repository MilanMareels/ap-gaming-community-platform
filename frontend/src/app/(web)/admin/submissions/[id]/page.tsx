'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, Send, ExternalLink, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { apiClient } from '@/api';
import { useAdmin } from '../../AdminShell';

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
  user: { id: number; name: string | null; email: string } | null;
  form: { id: number; title: string };
  answers: SubmissionAnswer[];
  comments: SubmissionComment[];
}

export default function AdminSubmissionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { hasPermission } = useAdmin();
  const canManage = hasPermission('forms.manage');
  const submissionId = Number(params.id);

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await apiClient.GET('/forms/submissions/{submissionId}', {
      params: { path: { submissionId: String(submissionId) } },
    });
    if (res.data) setSubmission(res.data as unknown as Submission);
    setLoading(false);
  }, [submissionId]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleDelete = async () => {
    if (!confirm('Weet je zeker dat je deze inzending wilt verwijderen?')) return;
    await apiClient.DELETE('/forms/submissions/{submissionId}', {
      params: { path: { submissionId: String(submissionId) } },
    });
    router.back();
  };

  const handleSendComment = async () => {
    if (!commentText.trim()) return;
    setSending(true);
    await apiClient.POST('/forms/submissions/{submissionId}/comments', {
      params: { path: { submissionId: String(submissionId) } },
      body: { content: commentText.trim() },
    });
    setCommentText('');
    setSending(false);
    refresh();
  };

  const renderAnswerValue = (answer: SubmissionAnswer) => {
    if (answer.field.type === 'TEXT_BLOCK') return null;
    if (answer.filePath) {
      return (
        <a href={`/api/files/${answer.filePath}`} target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 flex items-center gap-1">
          <Download size={12} /> {answer.fileName}
        </a>
      );
    }
    if (answer.values) return (answer.values as string[]).join(', ');
    return answer.value || '-';
  };

  if (loading) return <div className="text-gray-500">Laden...</div>;
  if (!submission) return <div className="text-gray-500">Inzending niet gevonden.</div>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button size="sm" variant="ghost" onClick={() => router.back()}>
          <ArrowLeft size={16} />
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-bold">Inzending #{submission.id}</h2>
          <p className="text-sm text-gray-400">{submission.form.title}</p>
        </div>
        <a
          href={`/forms/submission/${submission.cuid}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button size="sm" variant="ghost"><ExternalLink size={14} /> Publieke link</Button>
        </a>
        {canManage && (
          <Button size="sm" variant="danger" onClick={handleDelete}>
            <Trash2 size={14} /> Verwijderen
          </Button>
        )}
      </div>

      {/* Submitter info */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 mb-4">
        <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Inzender</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <span className="text-gray-400">Naam: </span>
            {submission.submitterName || submission.user?.name || 'Onbekend'}
          </div>
          <div>
            <span className="text-gray-400">E-mail: </span>
            {submission.submitterEmail || submission.user?.email || '-'}
          </div>
          <div>
            <span className="text-gray-400">Datum: </span>
            {new Date(submission.createdAt).toLocaleString('nl-NL')}
          </div>
        </div>
      </div>

      {/* Answers */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 mb-4">
        <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Antwoorden</h3>
        <div className="space-y-2">
          {submission.answers.filter((a) => a.field.type !== 'TEXT_BLOCK').map((answer) => (
            <div key={answer.id} className="bg-slate-800 rounded p-3">
              <div className="text-xs text-gray-400 font-bold uppercase">{answer.field.label}</div>
              <div className="text-sm mt-1">{renderAnswerValue(answer)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Comments */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">
          Reacties ({submission.comments.length})
        </h3>

        {submission.comments.length > 0 && (
          <div className="space-y-2 mb-4">
            {submission.comments.map((comment) => (
              <div
                key={comment.id}
                className={`rounded p-3 ${comment.isAdmin ? 'bg-red-950/30 border border-red-900/30' : 'bg-slate-800'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold">
                    {comment.user?.name || comment.authorName || 'Onbekend'}
                  </span>
                  {comment.isAdmin && <Badge variant="danger">Admin</Badge>}
                  <span className="text-xs text-gray-500">
                    {new Date(comment.createdAt).toLocaleString('nl-NL')}
                  </span>
                </div>
                <p className="text-sm">{comment.content}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm"
            placeholder="Schrijf een reactie..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
          />
          <Button size="sm" onClick={handleSendComment} disabled={sending || !commentText.trim()}>
            <Send size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}

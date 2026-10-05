'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, ChevronDown, ChevronUp, Send, ExternalLink, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { apiClient } from '@/api';

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
  _count?: { comments: number };
  answers?: SubmissionAnswer[];
  comments?: SubmissionComment[];
  form?: { id: number; title: string };
}

export default function AdminFormSubmissionsPage() {
  const params = useParams();
  const router = useRouter();
  const formId = Number(params.id);

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [detail, setDetail] = useState<Submission | null>(null);
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);

  const refresh = useCallback(async () => {
    const res = await apiClient.GET('/forms/{id}/submissions', { params: { path: { id: String(formId) } } });
    if (res.data) setSubmissions(res.data as unknown as Submission[]);
  }, [formId]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleExpand = async (submission: Submission) => {
    if (expanded === submission.id) {
      setExpanded(null);
      setDetail(null);
      return;
    }

    const res = await apiClient.GET('/forms/submissions/{submissionId}', {
      params: { path: { submissionId: String(submission.id) } },
    });
    if (res.data) {
      setDetail(res.data as unknown as Submission);
      setExpanded(submission.id);
      setCommentText('');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Weet je zeker dat je deze inzending wilt verwijderen?')) return;
    await apiClient.DELETE('/forms/submissions/{submissionId}', {
      params: { path: { submissionId: String(id) } },
    });
    if (expanded === id) {
      setExpanded(null);
      setDetail(null);
    }
    refresh();
  };

  const handleSendComment = async () => {
    if (!commentText.trim() || !detail) return;
    setSending(true);
    await apiClient.POST('/forms/submissions/{submissionId}/comments', {
      params: { path: { submissionId: String(detail.id) } },
      body: { content: commentText.trim() },
    });
    setCommentText('');
    setSending(false);
    // Refresh detail
    const res = await apiClient.GET('/forms/submissions/{submissionId}', {
      params: { path: { submissionId: String(detail.id) } },
    });
    if (res.data) setDetail(res.data as unknown as Submission);
    refresh();
  };

  const renderAnswerValue = (answer: SubmissionAnswer) => {
    if (answer.field.type === 'TEXT_BLOCK') return null;
    if (answer.filePath) {
      return (
        <a href={`/api/${answer.filePath}`} target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 flex items-center gap-1">
          <Download size={12} /> {answer.fileName}
        </a>
      );
    }
    if (answer.values) return (answer.values as string[]).join(', ');
    return answer.value || '-';
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button size="sm" variant="ghost" onClick={() => router.push(`/admin/forms/${formId}`)}>
          <ArrowLeft size={16} />
        </Button>
        <h2 className="text-xl font-bold flex-1">Inzendingen</h2>
      </div>

      {submissions.length === 0 ? (
        <p className="text-gray-500 text-center py-12">Nog geen inzendingen ontvangen.</p>
      ) : (
        <div className="space-y-2">
          {submissions.map((sub) => (
            <div key={sub.id} className="bg-slate-900 border border-slate-800 rounded-lg">
              <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-800/50"
                onClick={() => handleExpand(sub)}
              >
                <div className="flex-1">
                  <span className="font-medium">
                    {sub.submitterName || sub.user?.name || sub.submitterEmail || sub.user?.email || 'Anoniem'}
                  </span>
                  {sub.submitterEmail && (
                    <span className="text-gray-400 text-sm ml-2">{sub.submitterEmail}</span>
                  )}
                </div>
                {sub._count && sub._count.comments > 0 && (
                  <Badge variant="info">{sub._count.comments} reactie(s)</Badge>
                )}
                <span className="text-gray-500 text-sm">
                  {new Date(sub.createdAt).toLocaleString('nl-NL')}
                </span>
                <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); handleDelete(sub.id); }}>
                  <Trash2 size={14} />
                </Button>
                {expanded === sub.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>

              {expanded === sub.id && detail && (
                <div className="border-t border-slate-800 p-4">
                  {/* Answers */}
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Antwoorden</h4>
                  <div className="space-y-2 mb-6">
                    {detail.answers?.filter((a) => a.field.type !== 'TEXT_BLOCK').map((answer) => (
                      <div key={answer.id} className="bg-slate-800 rounded p-3">
                        <div className="text-xs text-gray-400 font-bold uppercase">{answer.field.label}</div>
                        <div className="text-sm mt-1">{renderAnswerValue(answer)}</div>
                      </div>
                    ))}
                  </div>

                  {/* Public viewer link */}
                  <div className="mb-6">
                    <a
                      href={`/forms/submission/${sub.cuid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1"
                    >
                      <ExternalLink size={12} /> Publieke link voor inzender
                    </a>
                  </div>

                  {/* Comments */}
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">
                    Reacties ({detail.comments?.length || 0})
                  </h4>
                  <div className="space-y-2 mb-4">
                    {detail.comments?.map((comment) => (
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

                  {/* Add comment */}
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
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

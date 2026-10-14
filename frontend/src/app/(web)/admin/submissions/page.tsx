'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { apiClient } from '@/api';

interface Submission {
  id: number;
  cuid: string;
  submitterEmail: string | null;
  submitterName: string | null;
  createdAt: string;
  user: { id: number; name: string | null; email: string } | null;
  form: { id: number; title: string };
  _count?: { comments: number };
}

interface PaginatedResponse {
  items: Submission[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function AdminSubmissionsPage() {
  const router = useRouter();

  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [page, setPage] = useState(1);
  const [filterFormId, setFilterFormId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    const params: Record<string, string> = { page: String(page) };
    const res = await apiClient.GET('/forms/admin/submissions' as any, { params: { query: params } });
    if (res.data) setData(res.data as unknown as PaginatedResponse);
  }, [page]);

  useEffect(() => { refresh(); }, [refresh]);

  const submissions = data?.items ?? [];

  // Get unique forms for filter dropdown (from current page data)
  const uniqueForms = Array.from(
    new Map(submissions.map((s) => [s.form.id, s.form])).values(),
  ).sort((a, b) => a.title.localeCompare(b.title));

  const filtered = filterFormId
    ? submissions.filter((s) => s.form.id === filterFormId)
    : submissions;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-xl font-bold flex-1">Inzendingen</h2>
        {uniqueForms.length > 1 && (
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            <select
              className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-white text-sm"
              value={filterFormId ?? ''}
              onChange={(e) => setFilterFormId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Alle formulieren</option>
              {uniqueForms.map((f) => (
                <option key={f.id} value={f.id}>{f.title}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-500 text-center py-12">Geen inzendingen gevonden.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((sub) => (
            <div
              key={sub.id}
              className="bg-slate-900 border border-slate-800 rounded-lg flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-800/50 transition-colors"
              onClick={() => router.push(`/admin/submissions/${sub.id}`)}
            >
              <div className="flex-1 min-w-0">
                <span className="font-medium">
                  {sub.submitterName || sub.user?.name || sub.submitterEmail || sub.user?.email || 'Anoniem'}
                </span>
                {sub.submitterEmail && (
                  <span className="text-gray-400 text-sm ml-2">{sub.submitterEmail}</span>
                )}
              </div>
              <Badge variant="default">{sub.form.title}</Badge>
              {sub._count && sub._count.comments > 0 && (
                <Badge variant="info">{sub._count.comments} reactie(s)</Badge>
              )}
              <span className="text-gray-500 text-sm whitespace-nowrap">
                {new Date(sub.createdAt).toLocaleString('nl-NL')}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <span className="text-sm text-gray-500">
            {data.total} inzending{data.total !== 1 ? 'en' : ''} totaal
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={14} />
            </Button>
            <span className="text-sm text-gray-400">
              {page} / {data.totalPages}
            </span>
            <Button
              size="sm"
              variant="ghost"
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

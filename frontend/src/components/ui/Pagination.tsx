import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getVisiblePages(currentPage, totalPages);

  return (
    <div className='flex items-center justify-between px-4 py-3'>
      {totalItems != null && pageSize != null ? (
        <p className='text-xs text-gray-500'>
          {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalItems)} van {totalItems}
        </p>
      ) : (
        <div />
      )}
      <div className='flex items-center gap-1'>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className='w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors'
        >
          <ChevronLeft size={16} />
        </button>
        {pages.map((page, idx) =>
          page === '...' ? (
            <span key={`ellipsis-${idx}`} className='w-8 h-8 flex items-center justify-center text-xs text-gray-500'>
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page as number)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
                page === currentPage
                  ? 'bg-red-600 text-white'
                  : 'text-gray-400 hover:bg-slate-800'
              }`}
            >
              {page}
            </button>
          ),
        )}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className='w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors'
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

function getVisiblePages(current: number, total: number): (number | '...')[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 3) {
    return [1, 2, 3, 4, '...', total];
  }
  if (current >= total - 2) {
    return [1, '...', total - 3, total - 2, total - 1, total];
  }
  return [1, '...', current - 1, current, current + 1, '...', total];
}

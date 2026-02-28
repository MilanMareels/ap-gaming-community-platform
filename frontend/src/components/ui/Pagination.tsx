import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className='flex justify-center items-center gap-4 mt-4'>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className='p-2 bg-slate-900 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
      >
        <ChevronLeft size={20} />
      </button>
      <span className='text-sm text-gray-400'>
        Pagina <span className='text-white font-bold'>{currentPage}</span> van{' '}
        <span className='text-white font-bold'>{totalPages}</span>
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className='p-2 bg-slate-900 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}

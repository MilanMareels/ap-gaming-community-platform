import { ReactNode } from 'react';

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  children: ReactNode;
  className?: string;
}

export function Badge({
  variant = 'default',
  children,
  className = '',
}: BadgeProps) {
  const variants = {
    default: 'bg-slate-800 text-gray-300',
    success: 'bg-green-900/30 text-green-400 border border-green-900',
    warning: 'bg-yellow-900/30 text-yellow-400 border border-yellow-900',
    danger: 'bg-red-900/30 text-red-400 border border-red-900',
    info: 'bg-blue-900/30 text-blue-400 border border-blue-900',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold uppercase ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

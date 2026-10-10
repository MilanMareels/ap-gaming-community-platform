import { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface SectionCardProps {
  icon?: LucideIcon;
  iconColor?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SectionCard({
  icon: Icon,
  iconColor = 'text-gray-400',
  title,
  description,
  actions,
  children,
  className = '',
}: SectionCardProps) {
  const iconBgMap: Record<string, string> = {
    'text-red-400': 'bg-red-500/10',
    'text-blue-400': 'bg-blue-500/10',
    'text-green-400': 'bg-green-500/10',
    'text-purple-400': 'bg-purple-500/10',
    'text-amber-400': 'bg-amber-500/10',
    'text-cyan-400': 'bg-cyan-500/10',
    'text-gray-400': 'bg-slate-800',
  };

  const iconBg = iconBgMap[iconColor] || 'bg-slate-800';

  return (
    <div className={`bg-linear-to-br from-slate-900 via-slate-900 to-slate-900/90 rounded-xl border border-slate-800 overflow-hidden hover:border-slate-700/80 transition-colors ${className}`}>
      <div className="px-6 py-5 border-b border-slate-800/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
            </div>
          )}
          <div>
            <h3 className="text-sm font-bold text-white">{title}</h3>
            {description && (
              <p className="text-xs text-gray-500 mt-0.5">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

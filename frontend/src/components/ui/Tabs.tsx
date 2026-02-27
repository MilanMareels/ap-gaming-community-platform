import { ReactNode } from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
}

export function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div className='flex gap-2 overflow-x-auto pb-4 mb-8 border-b border-slate-800 scrollbar-hide'>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold whitespace-nowrap transition-colors ${
            activeTab === tab.id
              ? 'bg-red-600 text-white shadow-lg shadow-red-900/20'
              : 'bg-slate-900 text-gray-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Search, UserPlus, X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { apiClient } from '@/api';
import type { ReservationPerson } from '@/api';

/** Who a staff reservation is for: someone who already has an account, or a new person to add. */
export type PersonChoice =
  | { kind: 'existing'; person: Pick<ReservationPerson, 'id' | 'name' | 'email' | 'sNumber'> }
  | { kind: 'new'; name: string; email: string; sNumber: string };

const labelClass = 'block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5';

interface PersonPickerProps {
  value: PersonChoice | null;
  onChange: (value: PersonChoice | null) => void;
}

export function PersonPicker({ value, onChange }: PersonPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ReservationPerson[]>([]);
  const [searching, setSearching] = useState(false);

  const term = query.trim();

  useEffect(() => {
    if (value || term.length < 2) return;

    let cancelled = false;
    const handle = setTimeout(async () => {
      setSearching(true);
      const { data } = await apiClient.GET('/reservations/admin/people', { params: { query: { search: term } } });
      if (!cancelled) {
        setResults(data ?? []);
        setSearching(false);
      }
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [term, value]);

  const startNewPerson = () => {
    const looksLikeEmail = term.includes('@');
    onChange({ kind: 'new', name: looksLikeEmail ? '' : term, email: looksLikeEmail ? term : '', sNumber: '' });
  };

  const reset = () => {
    onChange(null);
    setResults([]);
  };

  if (value?.kind === 'existing') {
    const { person } = value;
    return (
      <div>
        <span className={labelClass}>Persoon *</span>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{person.name || person.email}</p>
            <p className="truncate text-xs text-gray-500">
              {person.name ? person.email : null}
              {person.sNumber && person.sNumber !== 'N/A' ? `${person.name ? ' · ' : ''}${person.sNumber}` : null}
            </p>
          </div>
          <button type="button" onClick={reset} className="shrink-0 text-xs font-semibold text-red-400 hover:text-red-300">
            Wijzigen
          </button>
        </div>
      </div>
    );
  }

  if (value?.kind === 'new') {
    const update = (changes: Partial<Omit<Extract<PersonChoice, { kind: 'new' }>, 'kind'>>) => onChange({ ...value, ...changes });
    return (
      <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wide text-gray-400">Nieuwe persoon</span>
          <button type="button" onClick={reset} className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-white">
            <X size={14} /> Terug naar zoeken
          </button>
        </div>
        <Input label="Naam *" placeholder="Voornaam Achternaam" value={value.name} onChange={(e) => update({ name: e.target.value })} />
        <Input
          label="E-mailadres *"
          type="email"
          placeholder="student@student.ap.be"
          value={value.email}
          onChange={(e) => update({ email: e.target.value })}
        />
        <Input label="S-nummer (optioneel)" placeholder="s123456" value={value.sNumber} onChange={(e) => update({ sNumber: e.target.value })} />
        <p className="text-xs text-gray-500">Bestaat er al iemand met dit e-mailadres of s-nummer, dan komt de reservatie op die persoon.</p>
      </div>
    );
  }

  return (
    <div>
      <label htmlFor="person-search" className={labelClass}>
        Persoon *
      </label>
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          id="person-search"
          autoComplete="off"
          placeholder="Zoek op naam, e-mail of s-nummer"
          className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-3 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {term.length >= 2 && (
        <ul className="mt-2 max-h-60 divide-y divide-slate-800 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950">
          {results.map((person) => (
            <li key={person.id}>
              <button
                type="button"
                onClick={() => onChange({ kind: 'existing', person })}
                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-slate-800/60"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-white">{person.name || person.email}</span>
                  <span className="block truncate text-xs text-gray-500">
                    {person.name ? person.email : null}
                    {person.sNumber && person.sNumber !== 'N/A' ? `${person.name ? ' · ' : ''}${person.sNumber}` : null}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-gray-500">
                  {person.reservationCount} {person.reservationCount === 1 ? 'reservatie' : 'reservaties'}
                </span>
              </button>
            </li>
          ))}
          {!searching && results.length === 0 && <li className="px-3 py-2.5 text-sm text-gray-500">Niemand gevonden.</li>}
          <li>
            <button
              type="button"
              onClick={startNewPerson}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-red-400 hover:bg-slate-800/60"
            >
              <UserPlus size={16} /> Nieuwe persoon toevoegen
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}

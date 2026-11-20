'use client';

import { useState } from 'react';
import { Pencil, Trash2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiClient } from '@/api';
import type { PlanningMember, PlanningTeamDetail } from '@/api';
import { getApiErrorMessage } from '@/util/api-error';
import { PersonPicker, type PersonChoice } from '@/components/admin/PersonPicker';
import { Dialog } from '@/components/planning/Dialog';

const errorText = (error: unknown) => getApiErrorMessage(error as { message?: string | string[] }, 'Opslaan is mislukt.');

const searchPeople = async (search: string) =>
  (await apiClient.GET('/team-planning/admin/people', { params: { query: { search } } })).data ?? [];

function Checkbox({ label, checked, onChange, disabled, hint }: { label: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean; hint?: string }) {
  return (
    <label className={`flex items-start gap-2 text-sm ${disabled ? 'text-gray-600' : 'text-gray-300'}`} title={hint}>
      <input type="checkbox" className="mt-0.5" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

/** Who plays on the team and who manages it. Only planning admins hand out the manager role. */
export function MembersTab({ detail, onChanged, onError }: { detail: PlanningTeamDetail; onChanged: () => void; onError: (message: string) => void }) {
  const [person, setPerson] = useState<PersonChoice | null>(null);
  const [handle, setHandle] = useState('');
  const [isPlayer, setIsPlayer] = useState(true);
  const [isManager, setIsManager] = useState(false);
  const [editing, setEditing] = useState<PlanningMember | null>(null);
  const [formError, setFormError] = useState('');

  const add = async () => {
    setFormError('');
    if (!person) return;
    if (person.kind === 'new' && (!person.name.trim() || !person.email.trim())) {
      setFormError('Vul de naam en het e-mailadres van de nieuwe persoon in.');
      return;
    }
    const who =
      person.kind === 'existing'
        ? { userId: person.person.id }
        : { name: person.name.trim(), email: person.email.trim(), sNumber: person.sNumber.trim() || undefined };
    const { error } = await apiClient.POST('/team-planning/admin/teams/{teamId}/members', {
      params: { path: { teamId: detail.team.id } },
      body: { ...who, handle: handle.trim() || null, isPlayer, isManager },
    });
    if (error) return setFormError(errorText(error));
    setPerson(null);
    setHandle('');
    setIsPlayer(true);
    setIsManager(false);
    onChanged();
  };

  const remove = async (member: PlanningMember) => {
    if (!confirm(`${member.name || member.email} uit het team verwijderen? Wat die persoon invulde, gaat verloren.`)) return;
    const { error } = await apiClient.DELETE('/team-planning/admin/members/{memberId}', { params: { path: { memberId: member.id } } });
    if (error) onError(errorText(error));
    onChanged();
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
      <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        <h3 className="border-b border-slate-800 px-5 py-3 text-sm font-bold text-white">Leden ({detail.members.length})</h3>
        {detail.members.length === 0 ? (
          <p className="p-5 text-sm text-gray-500">Nog niemand in dit team.</p>
        ) : (
          <ul className="divide-y divide-slate-800">
            {detail.members.map((member) => (
              <li key={member.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">
                    {member.handle ? `${member.handle} · ` : ''}
                    {member.name || member.email}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {member.email}
                    {member.sNumber && member.sNumber !== 'N/A' && ` · ${member.sNumber}`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {member.isPlayer && <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-400">Speler</span>}
                  {member.isManager && <span className="rounded-md bg-sky-500/15 px-2 py-0.5 text-xs font-semibold text-sky-300">Manager</span>}
                  {!member.canSignIn && (
                    <span
                      className="rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-300"
                      title="Deze persoon heeft nog niet ingelogd met Microsoft en kan dus nog niets invullen."
                    >
                      Nog niet ingelogd
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setEditing(member)} aria-label="Bewerken">
                    <Pencil size={14} />
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => remove(member)}
                    disabled={member.isManager && !detail.isPlanningAdmin}
                    aria-label="Verwijderen"
                    title={member.isManager && !detail.isPlanningAdmin ? 'Enkel een beheerder kan een manager verwijderen' : undefined}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h3 className="text-sm font-bold text-white">Iemand toevoegen</h3>
        <PersonPicker
          value={person}
          onChange={setPerson}
          search={searchPeople}
          newPersonHint="Bestaat er al iemand met dit e-mailadres of s-nummer, dan wordt die persoon toegevoegd. Om in te vullen moet de speler inloggen met Microsoft."
        />
        <Input label="Naam in de planning (optioneel)" placeholder="Bijv. gamertag" maxLength={30} value={handle} onChange={(e) => setHandle(e.target.value)} />
        <div className="space-y-2">
          <Checkbox label="Speler: vult beschikbaarheid in" checked={isPlayer} onChange={setIsPlayer} />
          <Checkbox
            label="Manager: beheert dit team"
            checked={isManager}
            onChange={setIsManager}
            disabled={!detail.isPlanningAdmin}
            hint={detail.isPlanningAdmin ? undefined : 'Enkel een beheerder kan managers aanduiden'}
          />
        </div>
        {formError && <p className="rounded-lg border border-red-900 bg-red-900/20 p-3 text-sm text-red-400">{formError}</p>}
        <Button onClick={add} disabled={!person || (!isPlayer && !isManager)} className="w-full">
          <UserPlus size={16} className="mr-1.5 inline" /> Toevoegen
        </Button>
      </section>

      {editing && (
        <EditMemberDialog
          member={editing}
          canChangeManager={detail.isPlanningAdmin}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            onChanged();
          }}
          onError={onError}
        />
      )}
    </div>
  );
}

function EditMemberDialog({
  member,
  canChangeManager,
  onClose,
  onSaved,
  onError,
}: {
  member: PlanningMember;
  canChangeManager: boolean;
  onClose: () => void;
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const [handle, setHandle] = useState(member.handle ?? '');
  const [isPlayer, setIsPlayer] = useState(member.isPlayer);
  const [isManager, setIsManager] = useState(member.isManager);

  const save = async () => {
    const { error } = await apiClient.PATCH('/team-planning/admin/members/{memberId}', {
      params: { path: { memberId: member.id } },
      body: { handle: handle.trim() || null, isPlayer, ...(canChangeManager ? { isManager } : {}) },
    });
    if (error) return onError(errorText(error));
    onSaved();
  };

  return (
    <Dialog title={member.name || member.email} onClose={onClose}>
      <Input label="Naam in de planning" placeholder="Bijv. gamertag" maxLength={30} value={handle} onChange={(e) => setHandle(e.target.value)} />
      <div className="space-y-2">
        <Checkbox label="Speler: vult beschikbaarheid in" checked={isPlayer} onChange={setIsPlayer} />
        <Checkbox
          label="Manager: beheert dit team"
          checked={isManager}
          onChange={setIsManager}
          disabled={!canChangeManager}
          hint={canChangeManager ? undefined : 'Enkel een beheerder kan managers aanduiden'}
        />
      </div>
      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onClose}>
          Annuleren
        </Button>
        <Button className="flex-1" disabled={!isPlayer && !isManager} onClick={save}>
          Opslaan
        </Button>
      </div>
    </Dialog>
  );
}

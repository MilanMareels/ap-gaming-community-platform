import type { AuditChange } from '@/api';

/** What someone did, as the rest of a sentence that starts with their name. */
export const ACTION_PHRASES: Record<string, string> = {
  'auth.googleCallback': 'logde in met Google',
  'auth.microsoftCallback': 'logde in met Microsoft',
  'auth.impersonateUser': 'begon een gebruiker te impersoneren',
  'auth.impersonateRole': 'begon een rol te impersoneren',
  'auth.stopImpersonation': 'stopte met impersoneren',
  'auth.logout': 'logde uit',
  'auth.mobileToken': 'logde in op de app',
  'auth.unlinkProvider': 'ontkoppelde een login-account',

  'reservations.create': 'maakte een reservatie',
  'reservations.adminCreate': 'boekte een reservatie in',
  'reservations.update': 'wijzigde een reservatie',
  'reservations.updateStatus': 'wijzigde de status van een reservatie',
  'reservations.remove': 'verwijderde een reservatie',
  'reservations.cancelMine': 'annuleerde een eigen reservatie',
  'reservations.cancelByCuid': 'annuleerde een reservatie via de link in de e-mail',
  'reservations.unBlockUser': 'deblokkeerde een gebruiker na no-shows',
  'reservations.resetAllNoShows': 'zette alle no-shows terug (semesterwissel)',
  'inventoryAdjustments.create': 'voegde een voorraadaanpassing toe',
  'inventoryAdjustments.update': 'wijzigde een voorraadaanpassing',
  'inventoryAdjustments.remove': 'verwijderde een voorraadaanpassing',
  'timetable.create': 'voegde een openingsuur toe',
  'timetable.update': 'wijzigde een openingsuur',
  'timetable.remove': 'verwijderde een openingsuur',

  'rbac.createRole': 'maakte een rol aan',
  'rbac.updateRole': 'wijzigde een rol',
  'rbac.deleteRole': 'verwijderde een rol',
  'rbac.assignRole': 'gaf een rol aan een gebruiker',
  'rbac.removeRole': 'nam een rol af van een gebruiker',

  'users.update': 'wijzigde een gebruiker',
  'users.delete': 'verwijderde een gebruiker',
  'users.createNote': 'schreef een notitie over een gebruiker',
  'users.updateNote': 'wijzigde of beëindigde een notitie',
  'users.deleteNote': 'verwijderde een notitie',
  'users.createWhitelist': 'gaf een extern e-mailadres toegang',
  'users.deleteWhitelist': 'trok de toegang van een extern e-mailadres in',
  'users.unlinkSso': 'ontkoppelde een login-account van een gebruiker',

  'settings.updateSetting': 'wijzigde een instelling',
  'settings.updateForm': 'wijzigde het formulier in de instellingen',
  'navigation.create': 'voegde een navigatielink toe',
  'navigation.update': 'wijzigde een navigatielink',
  'navigation.delete': 'verwijderde een navigatielink',
  'navigation.reorder': 'herschikte de navigatie',

  'events.create': 'maakte een event aan',
  'events.update': 'wijzigde een event',
  'events.delete': 'verwijderde een event',
  'events.register': 'schreef zich in voor een event',
  'events.unregister': 'schreef zich uit voor een event',
  'brackets.create': 'maakte een bracket aan',
  'brackets.update': 'wijzigde een bracket',
  'brackets.delete': 'verwijderde een bracket',
  'brackets.generate': 'genereerde een bracket',
  'brackets.addParticipant': 'voegde een deelnemer toe aan een bracket',
  'brackets.importParticipants': 'importeerde deelnemers in een bracket',
  'brackets.removeParticipant': 'verwijderde een deelnemer uit een bracket',
  'brackets.swapParticipants': 'wisselde twee deelnemers in een bracket',
  'brackets.submitResult': 'gaf een uitslag in voor een bracketmatch',
  'brackets.updateMatchStatus': 'wijzigde de status van een bracketmatch',
  'timeTrials.create': 'maakte een time trial aan',
  'timeTrials.updateStatus': 'wijzigde de status van een time trial',
  'timeTrials.delete': 'verwijderde een time trial',
  'timeTrials.addParticipant': 'voegde een deelnemer toe aan een time trial',
  'timeTrials.removeParticipant': 'verwijderde een deelnemer uit een time trial',
  'timeTrials.addRun': 'gaf een tijd in voor een time trial',
  'timeTrials.deleteRun': 'verwijderde een tijd uit een time trial',
  'pointTrials.create': 'maakte een point trial aan',
  'pointTrials.updateStatus': 'wijzigde de status van een point trial',
  'pointTrials.delete': 'verwijderde een point trial',
  'pointTrials.addParticipant': 'voegde een deelnemer toe aan een point trial',
  'pointTrials.removeParticipant': 'verwijderde een deelnemer uit een point trial',
  'pointTrials.addEntry': 'gaf punten in voor een point trial',
  'pointTrials.deleteEntry': 'verwijderde punten uit een point trial',

  'roster.createGame': 'maakte een team aan',
  'roster.deleteGame': 'verwijderde een team',
  'roster.createEntry': 'voegde een speler toe aan een team',
  'roster.updateEntry': 'wijzigde een speler in een team',
  'roster.deleteEntry': 'verwijderde een speler uit een team',
  'roster.reorderEntries': 'herschikte de spelers van een team',
  'esportsResults.create': 'voegde een wedstrijdresultaat toe',
  'esportsResults.update': 'wijzigde een wedstrijdresultaat',
  'esportsResults.remove': 'verwijderde een wedstrijdresultaat',
  'teamPlanning.createTeam': 'maakte een planningsteam aan',
  'teamPlanning.updateTeam': 'hernoemde een planningsteam',
  'teamPlanning.deleteTeam': 'verwijderde een planningsteam',
  'teamPlanning.addMember': 'voegde iemand toe aan een planningsteam',
  'teamPlanning.updateMember': 'wijzigde een lid van een planningsteam',
  'teamPlanning.removeMember': 'verwijderde iemand uit een planningsteam',
  'teamPlanning.addDays': 'plande dagen in voor een team',
  'teamPlanning.updateDay': 'wijzigde een geplande dag',
  'teamPlanning.removeDay': 'verwijderde een geplande dag',
  'teamPlanning.addBlock': 'plande een scrim, VOD-review of match',
  'teamPlanning.updateBlock': 'wijzigde een geplande scrim, VOD-review of match',
  'teamPlanning.removeBlock': 'verwijderde een geplande scrim, VOD-review of match',
  'teamPlanning.saveAvailability': 'vulde beschikbaarheid in',

  'forms.create': 'maakte een formulier aan',
  'forms.update': 'wijzigde een formulier',
  'forms.delete': 'verwijderde een formulier',
  'forms.createField': 'voegde een veld toe aan een formulier',
  'forms.updateField': 'wijzigde een formulierveld',
  'forms.deleteField': 'verwijderde een formulierveld',
  'forms.reorderFields': 'herschikte de velden van een formulier',
  'forms.setFormAccess': 'wijzigde wie de inzendingen van een formulier mag zien',
  'formSubmissions.submitForm': 'vulde een formulier in',
  'formSubmissions.deleteSubmission': 'verwijderde een inzending',
  'formSubmissions.addAdminComment': 'reageerde op een inzending',
  'formSubmissions.addPublicComment': 'reageerde op een eigen inzending',
  'jobs.create': 'plaatste een vacature',
  'jobs.update': 'wijzigde een vacature',
  'jobs.delete': 'verwijderde een vacature',
  'storage.getUploadUrl': 'laadde een bestand op',

  'scheduler.markOverdueNoShows': 'zette reservaties waar niemand voor kwam op no-show',
  'system.unattributed': 'wijzigde gegevens buiten een verzoek om',
};

export const MODEL_LABELS: Record<string, string> = {
  User: 'Gebruiker',
  UserNote: 'Notitie',
  UserRole: 'Rol van gebruiker',
  Role: 'Rol',
  RolePermission: 'Permissie van rol',
  Permission: 'Permissie',
  GoogleSSOUser: 'Google-koppeling',
  MicrosoftSSOUser: 'Microsoft-koppeling',
  Reservation: 'Reservatie',
  InventoryAdjustment: 'Voorraadaanpassing',
  TimeTableEntry: 'Openingsuur',
  Event: 'Event',
  EventRegistration: 'Inschrijving',
  Setting: 'Instelling',
  NavLink: 'Navigatielink',
  RosterGame: 'Team',
  RosterEntry: 'Speler',
  EsportsMatch: 'Wedstrijd',
  DynamicForm: 'Formulier',
  DynamicFormField: 'Formulierveld',
  DynamicFormSubmission: 'Inzending',
  DynamicFormSubmissionComment: 'Reactie',
  DynamicFormAccess: 'Formuliertoegang',
  Job: 'Vacature',
  PlanningTeam: 'Planningsteam',
  PlanningTeamMember: 'Teamlid',
  PlanningDay: 'Geplande dag',
  PlanningBlock: 'Gepland blok',
  PlanningAvailability: 'Beschikbaarheid',
};

export const FIELD_LABELS: Record<string, string> = {
  status: 'status',
  controllers: 'controllers',
  inventory: 'toestel',
  startTime: 'start',
  endTime: 'einde',
  playedAt: 'gespeeld op',
  email: 'e-mail',
  name: 'naam',
  sNumber: 's-nummer',
  title: 'titel',
  description: 'beschrijving',
  shortDescription: 'korte beschrijving',
  label: 'label',
  value: 'waarde',
  key: 'sleutel',
  userId: 'gebruiker',
  roleId: 'rol',
  isActive: 'actief',
  enabled: 'zichtbaar',
  registrationEnabled: 'inschrijvingen open',
  opponent: 'tegenstander',
  competition: 'competitie',
  result: 'resultaat',
  ourScore: 'onze score',
  opponentScore: 'score tegenstander',
  handle: 'gamertag',
  rank: 'rang',
  role: 'rol',
  content: 'inhoud',
  category: 'categorie',
  note: 'notitie',
  type: 'soort',
  expiresAt: 'geldig tot',
  emailedAt: 'gemaild op',
  createdByStaff: 'ingeboekt door staff',
};

const VALUE_LABELS: Record<string, string> = {
  RESERVED: 'Gereserveerd',
  CANCELLED: 'Geannuleerd',
  PRESENT: 'Aanwezig',
  NO_SHOW: 'No-show',
  WIN: 'Gewonnen',
  LOSS: 'Verloren',
  DRAW: 'Gelijkspel',
  UPCOMING: 'Gepland',
  OPEN: 'Open',
  CLOSED: 'Gesloten',
  pc: 'PC',
  ps5: 'PS5',
  switch: 'Switch',
  NOTE: 'Notitie',
  WARNING: 'Waarschuwing',
  BLOCK: 'Blokkade',
};

/** The field of a row that tells a person which record it is, e.g. a reservation's e-mail address. */
const DISPLAY_FIELDS: Record<string, string[]> = {
  User: ['name', 'email'],
  Reservation: ['email'],
  Role: ['name'],
  Permission: ['key'],
  Event: ['title'],
  Setting: ['key'],
  NavLink: ['label'],
  RosterGame: ['name'],
  RosterEntry: ['handle'],
  EsportsMatch: ['opponent'],
  DynamicForm: ['title'],
  DynamicFormField: ['label'],
  Job: ['title'],
  TimeTableEntry: ['label'],
  InventoryAdjustment: ['inventory'],
  PlanningTeam: ['name'],
  PlanningTeamMember: ['handle'],
  UserNote: ['content'],
  DynamicFormSubmissionComment: ['content'],
};

export const modelLabel = (model: string) => MODEL_LABELS[model] ?? model;
export const fieldLabel = (field: string) => FIELD_LABELS[field] ?? field;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

/** One stored value, readable. Dates are shown as stored: reservation times are hub wall-clock times. */
export function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'ja' : 'nee';
  if (typeof value === 'string') {
    if (ISO_DATE.test(value)) return `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)} ${value.slice(11, 16)}`;
    return VALUE_LABELS[value] ?? value;
  }
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value) && value.every((v) => typeof v !== 'object' || v === null)) return value.length ? value.map(formatValue).join(', ') : '—';
  return JSON.stringify(value);
}

/** "Reservatie · demo.vijf@example.com", or "Reservatie #41" when the row has nothing more telling. */
export function changeTitle(change: AuditChange): string {
  const row = change.after ?? change.before ?? {};
  const field = DISPLAY_FIELDS[change.model]?.find((f) => typeof row[f] === 'string' && row[f]);
  if (field) {
    const text = formatValue(row[field]);
    return `${modelLabel(change.model)} · ${text.length > 60 ? `${text.slice(0, 60)}…` : text}`;
  }
  return `${modelLabel(change.model)}${change.entityId ? ` #${change.entityId}` : ''}`;
}

/** The usual validation messages of the API, in Dutch. Anything else is shown as the API wrote it. */
const VALIDATION_MESSAGES: [RegExp, (field: string, n?: string) => string][] = [
  [/^(\w+) must not be greater than (\S+)$/, (f, n) => `${f} mag niet hoger zijn dan ${n}`],
  [/^(\w+) must not be less than (\S+)$/, (f, n) => `${f} mag niet lager zijn dan ${n}`],
  [/^(\w+) must be an integer number$/, (f) => `${f} moet een geheel getal zijn`],
  [/^(\w+) must be a number.*$/, (f) => `${f} moet een getal zijn`],
  [/^(\w+) should not be empty$/, (f) => `${f} is verplicht`],
  [/^(\w+) must be an email$/, (f) => `${f} moet een geldig e-mailadres zijn`],
  [/^(\w+) must be a valid ISO 8601 date string$/, (f) => `${f} moet een geldige datum zijn`],
  [/^(\w+) must be one of the following values: (.+)$/, (f, n) => `${f} moet een van deze waarden zijn: ${n}`],
  [/^property (\w+) should not exist$/, (f) => `${f} mag niet meegestuurd worden`],
];

function translateMessage(message: string) {
  for (const [pattern, render] of VALIDATION_MESSAGES) {
    const match = message.match(pattern);
    if (match) return render(fieldLabel(match[1]), match[2]);
  }
  return message;
}

/** Turns the API's error into something a person reads at a glance. */
export function friendlyError(error: string | null | undefined, statusCode: number | null | undefined) {
  if (!error) return statusCode === 401 || statusCode === 403 ? 'Geweigerd' : 'Mislukt';
  const permission = error.match(/Required permission: (.+)$/);
  if (permission) return `Geweigerd: mist permissie ${permission[1].replace(' or ', ' of ')}`;
  if (statusCode === 400) return `Ongeldige invoer: ${error.split('; ').map(translateMessage).join(', ')}`;
  return error;
}

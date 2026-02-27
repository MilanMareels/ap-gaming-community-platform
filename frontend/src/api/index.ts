export * from './http.service';
export type { components, paths } from './definitions';

import type { components } from './definitions';

/** Convenience type aliases for API schemas */
type ApiSchemas = components['schemas'];
export type TimeTableEntry = ApiSchemas['TimeTableEntry'];
export type TimeTableType = ApiSchemas['TimeTableType'];
export type Reservation = ApiSchemas['Reservation'];
export type ReservationStatus = ApiSchemas['ReservationStatus'];
export type Setting = ApiSchemas['Setting'];
export type RosterGame = ApiSchemas['RosterGame'];
export type RosterEntry = ApiSchemas['RosterEntry'];
export type User = ApiSchemas['User'];
export type AdminUser = ApiSchemas['AdminUser'];
export type CreateReservationDto = ApiSchemas['CreateReservationDto'];
export type CreateRosterGameDto = ApiSchemas['CreateRosterGameDto'];
export type CreateRosterEntryDto = ApiSchemas['CreateRosterEntryDto'];
export type CreateTimeTableEntryDto = ApiSchemas['CreateTimeTableEntryDto'];
export type UpdateTimeTableEntryDto = ApiSchemas['UpdateTimeTableEntryDto'];
export type UpdateSettingDto = ApiSchemas['UpdateSettingDto'];
export type CreateAdminDto = ApiSchemas['CreateAdminDto'];

/** Augmented types that include relation fields (matching Prisma include) */
export type ReservationWithUser = Reservation & { user: User };
export type AdminUserWithUser = AdminUser & { user: User };
export type RosterEntryWithRelations = RosterEntry & {
  user: User;
  game: RosterGame;
};
export type RosterGameWithEntries = RosterGame & {
  rosterEntries: (RosterEntry & { user: User })[];
};

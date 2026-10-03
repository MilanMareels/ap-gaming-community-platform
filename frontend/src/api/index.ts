export * from './http.service';
export type { components, paths } from './definitions';

import type { components } from './definitions';

/** Convenience type aliases for API schemas */
type ApiSchemas = components['schemas'];
export type TimeTableEntry = ApiSchemas['TimeTableEntry'];
export type TimeTableType = ApiSchemas['TimeTableType'];
export type Reservation = ApiSchemas['Reservation'];
export type ReservationSlot = ApiSchemas['ReservationSlotDto'];
export type ReservationStatus = ApiSchemas['ReservationStatus'];
export type Setting = ApiSchemas['Setting'];
export type RosterGame = ApiSchemas['RosterGame'];
export type RosterEntry = ApiSchemas['RosterEntry'];
export type User = ApiSchemas['User'];
export type AdminUser = ApiSchemas['AdminUser'];
export type CreateReservationDto = ApiSchemas['CreateReservationDto'];
export type AdminCreateReservationDto = ApiSchemas['AdminCreateReservationDto'];
export type UpdateReservationDto = ApiSchemas['UpdateReservationDto'];
export type ReservationVerificationDto =
  ApiSchemas['ReservationVerificationDto'];
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

export type Event = ApiSchemas['Event'];
export type EventCategory = ApiSchemas['EventCategory'];
export type EventRegistration = ApiSchemas['EventRegistration'];
export type CreateEventDto = ApiSchemas['CreateEventDto'];
export type UpdateEventDto = ApiSchemas['UpdateEventDto'];

export type Bracket = ApiSchemas['Bracket'];
export type BracketFormat = ApiSchemas['BracketFormat'];
export type BracketStatus = ApiSchemas['BracketStatus'];
export type BracketMatch = ApiSchemas['BracketMatch'];
export type BracketMatchParticipant = ApiSchemas['BracketMatchParticipant'];
export type BracketParticipant = ApiSchemas['BracketParticipant'];
export type MatchStatus = ApiSchemas['MatchStatus'];
export type CreateBracketDto = ApiSchemas['CreateBracketDto'];
export type UpdateBracketDto = ApiSchemas['UpdateBracketDto'];
export type AddParticipantDto = ApiSchemas['AddParticipantDto'];
export type UpdateMatchResultDto = ApiSchemas['UpdateMatchResultDto'];

export type NavLink = ApiSchemas['NavLink'];
export type NavLinkWithChildren = NavLink & { children: NavLink[] };
export type CreateNavLinkDto = ApiSchemas['CreateNavLinkDto'];
export type UpdateNavLinkDto = ApiSchemas['UpdateNavLinkDto'];
export type ReorderNavLinksDto = ApiSchemas['ReorderNavLinksDto'];

export type InventoryAdjustment = ApiSchemas['InventoryAdjustment'];
export type ReservationStatistics = ApiSchemas['ReservationStatisticsDto'];
export type UserStatistics = ApiSchemas['UserStatisticsDto'];
export type InventoryAdjustmentSlot = ApiSchemas['InventoryAdjustmentSlotDto'];
export type CreateInventoryAdjustmentDto = ApiSchemas['CreateInventoryAdjustmentDto'];
export type UpdateInventoryAdjustmentDto = ApiSchemas['UpdateInventoryAdjustmentDto'];

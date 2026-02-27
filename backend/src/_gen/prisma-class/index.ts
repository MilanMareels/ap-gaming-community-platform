import { UserRelations as _UserRelations } from './user_relations.js';
import { AdminUserRelations as _AdminUserRelations } from './admin_user_relations.js';
import { GoogleSSOUserRelations as _GoogleSSOUserRelations } from './google_s_s_o_user_relations.js';
import { SettingRelations as _SettingRelations } from './setting_relations.js';
import { RosterGameRelations as _RosterGameRelations } from './roster_game_relations.js';
import { RosterEntryRelations as _RosterEntryRelations } from './roster_entry_relations.js';
import { ReservationRelations as _ReservationRelations } from './reservation_relations.js';
import { TimeTableEntryRelations as _TimeTableEntryRelations } from './time_table_entry_relations.js';
import { User as _User } from './user.js';
import { AdminUser as _AdminUser } from './admin_user.js';
import { GoogleSSOUser as _GoogleSSOUser } from './google_s_s_o_user.js';
import { Setting as _Setting } from './setting.js';
import { RosterGame as _RosterGame } from './roster_game.js';
import { RosterEntry as _RosterEntry } from './roster_entry.js';
import { Reservation as _Reservation } from './reservation.js';
import { TimeTableEntry as _TimeTableEntry } from './time_table_entry.js';

export namespace PrismaModel {
  export class UserRelations extends _UserRelations {}
  export class AdminUserRelations extends _AdminUserRelations {}
  export class GoogleSSOUserRelations extends _GoogleSSOUserRelations {}
  export class SettingRelations extends _SettingRelations {}
  export class RosterGameRelations extends _RosterGameRelations {}
  export class RosterEntryRelations extends _RosterEntryRelations {}
  export class ReservationRelations extends _ReservationRelations {}
  export class TimeTableEntryRelations extends _TimeTableEntryRelations {}
  export class User extends _User {}
  export class AdminUser extends _AdminUser {}
  export class GoogleSSOUser extends _GoogleSSOUser {}
  export class Setting extends _Setting {}
  export class RosterGame extends _RosterGame {}
  export class RosterEntry extends _RosterEntry {}
  export class Reservation extends _Reservation {}
  export class TimeTableEntry extends _TimeTableEntry {}

  export const extraModels = [
    UserRelations,
    AdminUserRelations,
    GoogleSSOUserRelations,
    SettingRelations,
    RosterGameRelations,
    RosterEntryRelations,
    ReservationRelations,
    TimeTableEntryRelations,
    User,
    AdminUser,
    GoogleSSOUser,
    Setting,
    RosterGame,
    RosterEntry,
    Reservation,
    TimeTableEntry,
  ];
}

import { UserRelations as _UserRelations } from './user_relations.js';
import { AdminUserRelations as _AdminUserRelations } from './admin_user_relations.js';
import { GoogleSSOUserRelations as _GoogleSSOUserRelations } from './google_s_s_o_user_relations.js';
import { MicrosoftSSOUserRelations as _MicrosoftSSOUserRelations } from './microsoft_s_s_o_user_relations.js';
import { RoleRelations as _RoleRelations } from './role_relations.js';
import { PermissionRelations as _PermissionRelations } from './permission_relations.js';
import { RolePermissionRelations as _RolePermissionRelations } from './role_permission_relations.js';
import { UserRoleRelations as _UserRoleRelations } from './user_role_relations.js';
import { SettingRelations as _SettingRelations } from './setting_relations.js';
import { FormRelations as _FormRelations } from './form_relations.js';
import { NavLinkRelations as _NavLinkRelations } from './nav_link_relations.js';
import { RosterGameRelations as _RosterGameRelations } from './roster_game_relations.js';
import { RosterEntryRelations as _RosterEntryRelations } from './roster_entry_relations.js';
import { ReservationRelations as _ReservationRelations } from './reservation_relations.js';
import { TimeTableEntryRelations as _TimeTableEntryRelations } from './time_table_entry_relations.js';
import { EventRelations as _EventRelations } from './event_relations.js';
import { BracketRelations as _BracketRelations } from './bracket_relations.js';
import { BracketParticipantRelations as _BracketParticipantRelations } from './bracket_participant_relations.js';
import { BracketMatchRelations as _BracketMatchRelations } from './bracket_match_relations.js';
import { BracketMatchParticipantRelations as _BracketMatchParticipantRelations } from './bracket_match_participant_relations.js';
import { EventRegistrationRelations as _EventRegistrationRelations } from './event_registration_relations.js';
import { TimeTrialRelations as _TimeTrialRelations } from './time_trial_relations.js';
import { TimeTrialParticipantRelations as _TimeTrialParticipantRelations } from './time_trial_participant_relations.js';
import { TimeTrialRunRelations as _TimeTrialRunRelations } from './time_trial_run_relations.js';
import { PointTrialRelations as _PointTrialRelations } from './point_trial_relations.js';
import { PointTrialParticipantRelations as _PointTrialParticipantRelations } from './point_trial_participant_relations.js';
import { PointTrialEntryRelations as _PointTrialEntryRelations } from './point_trial_entry_relations.js';
import { InventoryAdjustmentRelations as _InventoryAdjustmentRelations } from './inventory_adjustment_relations.js';
import { SpeedrunGameRelations as _SpeedrunGameRelations } from './speedrun_game_relations.js';
import { SpeedrunLevelRelations as _SpeedrunLevelRelations } from './speedrun_level_relations.js';
import { SpeedrunCategoryRelations as _SpeedrunCategoryRelations } from './speedrun_category_relations.js';
import { SpeedrunVariableRelations as _SpeedrunVariableRelations } from './speedrun_variable_relations.js';
import { SpeedrunVariableValueRelations as _SpeedrunVariableValueRelations } from './speedrun_variable_value_relations.js';
import { SpeedrunRunRelations as _SpeedrunRunRelations } from './speedrun_run_relations.js';
import { SpeedrunRunPlayerRelations as _SpeedrunRunPlayerRelations } from './speedrun_run_player_relations.js';
import { SpeedrunRunVariableValueRelations as _SpeedrunRunVariableValueRelations } from './speedrun_run_variable_value_relations.js';
import { User as _User } from './user.js';
import { AdminUser as _AdminUser } from './admin_user.js';
import { GoogleSSOUser as _GoogleSSOUser } from './google_s_s_o_user.js';
import { MicrosoftSSOUser as _MicrosoftSSOUser } from './microsoft_s_s_o_user.js';
import { Role as _Role } from './role.js';
import { Permission as _Permission } from './permission.js';
import { RolePermission as _RolePermission } from './role_permission.js';
import { UserRole as _UserRole } from './user_role.js';
import { Setting as _Setting } from './setting.js';
import { Form as _Form } from './form.js';
import { NavLink as _NavLink } from './nav_link.js';
import { RosterGame as _RosterGame } from './roster_game.js';
import { RosterEntry as _RosterEntry } from './roster_entry.js';
import { Reservation as _Reservation } from './reservation.js';
import { TimeTableEntry as _TimeTableEntry } from './time_table_entry.js';
import { Event as _Event } from './event.js';
import { Bracket as _Bracket } from './bracket.js';
import { BracketParticipant as _BracketParticipant } from './bracket_participant.js';
import { BracketMatch as _BracketMatch } from './bracket_match.js';
import { BracketMatchParticipant as _BracketMatchParticipant } from './bracket_match_participant.js';
import { EventRegistration as _EventRegistration } from './event_registration.js';
import { TimeTrial as _TimeTrial } from './time_trial.js';
import { TimeTrialParticipant as _TimeTrialParticipant } from './time_trial_participant.js';
import { TimeTrialRun as _TimeTrialRun } from './time_trial_run.js';
import { PointTrial as _PointTrial } from './point_trial.js';
import { PointTrialParticipant as _PointTrialParticipant } from './point_trial_participant.js';
import { PointTrialEntry as _PointTrialEntry } from './point_trial_entry.js';
import { InventoryAdjustment as _InventoryAdjustment } from './inventory_adjustment.js';
import { SpeedrunGame as _SpeedrunGame } from './speedrun_game.js';
import { SpeedrunLevel as _SpeedrunLevel } from './speedrun_level.js';
import { SpeedrunCategory as _SpeedrunCategory } from './speedrun_category.js';
import { SpeedrunVariable as _SpeedrunVariable } from './speedrun_variable.js';
import { SpeedrunVariableValue as _SpeedrunVariableValue } from './speedrun_variable_value.js';
import { SpeedrunRun as _SpeedrunRun } from './speedrun_run.js';
import { SpeedrunRunPlayer as _SpeedrunRunPlayer } from './speedrun_run_player.js';
import { SpeedrunRunVariableValue as _SpeedrunRunVariableValue } from './speedrun_run_variable_value.js';

export namespace PrismaModel {
  export class UserRelations extends _UserRelations {}
  export class AdminUserRelations extends _AdminUserRelations {}
  export class GoogleSSOUserRelations extends _GoogleSSOUserRelations {}
  export class MicrosoftSSOUserRelations extends _MicrosoftSSOUserRelations {}
  export class RoleRelations extends _RoleRelations {}
  export class PermissionRelations extends _PermissionRelations {}
  export class RolePermissionRelations extends _RolePermissionRelations {}
  export class UserRoleRelations extends _UserRoleRelations {}
  export class SettingRelations extends _SettingRelations {}
  export class FormRelations extends _FormRelations {}
  export class NavLinkRelations extends _NavLinkRelations {}
  export class RosterGameRelations extends _RosterGameRelations {}
  export class RosterEntryRelations extends _RosterEntryRelations {}
  export class ReservationRelations extends _ReservationRelations {}
  export class TimeTableEntryRelations extends _TimeTableEntryRelations {}
  export class EventRelations extends _EventRelations {}
  export class BracketRelations extends _BracketRelations {}
  export class BracketParticipantRelations extends _BracketParticipantRelations {}
  export class BracketMatchRelations extends _BracketMatchRelations {}
  export class BracketMatchParticipantRelations extends _BracketMatchParticipantRelations {}
  export class EventRegistrationRelations extends _EventRegistrationRelations {}
  export class TimeTrialRelations extends _TimeTrialRelations {}
  export class TimeTrialParticipantRelations extends _TimeTrialParticipantRelations {}
  export class TimeTrialRunRelations extends _TimeTrialRunRelations {}
  export class PointTrialRelations extends _PointTrialRelations {}
  export class PointTrialParticipantRelations extends _PointTrialParticipantRelations {}
  export class PointTrialEntryRelations extends _PointTrialEntryRelations {}
  export class InventoryAdjustmentRelations extends _InventoryAdjustmentRelations {}
  export class SpeedrunGameRelations extends _SpeedrunGameRelations {}
  export class SpeedrunLevelRelations extends _SpeedrunLevelRelations {}
  export class SpeedrunCategoryRelations extends _SpeedrunCategoryRelations {}
  export class SpeedrunVariableRelations extends _SpeedrunVariableRelations {}
  export class SpeedrunVariableValueRelations extends _SpeedrunVariableValueRelations {}
  export class SpeedrunRunRelations extends _SpeedrunRunRelations {}
  export class SpeedrunRunPlayerRelations extends _SpeedrunRunPlayerRelations {}
  export class SpeedrunRunVariableValueRelations extends _SpeedrunRunVariableValueRelations {}
  export class User extends _User {}
  export class AdminUser extends _AdminUser {}
  export class GoogleSSOUser extends _GoogleSSOUser {}
  export class MicrosoftSSOUser extends _MicrosoftSSOUser {}
  export class Role extends _Role {}
  export class Permission extends _Permission {}
  export class RolePermission extends _RolePermission {}
  export class UserRole extends _UserRole {}
  export class Setting extends _Setting {}
  export class Form extends _Form {}
  export class NavLink extends _NavLink {}
  export class RosterGame extends _RosterGame {}
  export class RosterEntry extends _RosterEntry {}
  export class Reservation extends _Reservation {}
  export class TimeTableEntry extends _TimeTableEntry {}
  export class Event extends _Event {}
  export class Bracket extends _Bracket {}
  export class BracketParticipant extends _BracketParticipant {}
  export class BracketMatch extends _BracketMatch {}
  export class BracketMatchParticipant extends _BracketMatchParticipant {}
  export class EventRegistration extends _EventRegistration {}
  export class TimeTrial extends _TimeTrial {}
  export class TimeTrialParticipant extends _TimeTrialParticipant {}
  export class TimeTrialRun extends _TimeTrialRun {}
  export class PointTrial extends _PointTrial {}
  export class PointTrialParticipant extends _PointTrialParticipant {}
  export class PointTrialEntry extends _PointTrialEntry {}
  export class InventoryAdjustment extends _InventoryAdjustment {}
  export class SpeedrunGame extends _SpeedrunGame {}
  export class SpeedrunLevel extends _SpeedrunLevel {}
  export class SpeedrunCategory extends _SpeedrunCategory {}
  export class SpeedrunVariable extends _SpeedrunVariable {}
  export class SpeedrunVariableValue extends _SpeedrunVariableValue {}
  export class SpeedrunRun extends _SpeedrunRun {}
  export class SpeedrunRunPlayer extends _SpeedrunRunPlayer {}
  export class SpeedrunRunVariableValue extends _SpeedrunRunVariableValue {}

  export const extraModels = [
    UserRelations,
    AdminUserRelations,
    GoogleSSOUserRelations,
    MicrosoftSSOUserRelations,
    RoleRelations,
    PermissionRelations,
    RolePermissionRelations,
    UserRoleRelations,
    SettingRelations,
    FormRelations,
    NavLinkRelations,
    RosterGameRelations,
    RosterEntryRelations,
    ReservationRelations,
    TimeTableEntryRelations,
    EventRelations,
    BracketRelations,
    BracketParticipantRelations,
    BracketMatchRelations,
    BracketMatchParticipantRelations,
    EventRegistrationRelations,
    TimeTrialRelations,
    TimeTrialParticipantRelations,
    TimeTrialRunRelations,
    PointTrialRelations,
    PointTrialParticipantRelations,
    PointTrialEntryRelations,
    InventoryAdjustmentRelations,
    SpeedrunGameRelations,
    SpeedrunLevelRelations,
    SpeedrunCategoryRelations,
    SpeedrunVariableRelations,
    SpeedrunVariableValueRelations,
    SpeedrunRunRelations,
    SpeedrunRunPlayerRelations,
    SpeedrunRunVariableValueRelations,
    User,
    AdminUser,
    GoogleSSOUser,
    MicrosoftSSOUser,
    Role,
    Permission,
    RolePermission,
    UserRole,
    Setting,
    Form,
    NavLink,
    RosterGame,
    RosterEntry,
    Reservation,
    TimeTableEntry,
    Event,
    Bracket,
    BracketParticipant,
    BracketMatch,
    BracketMatchParticipant,
    EventRegistration,
    TimeTrial,
    TimeTrialParticipant,
    TimeTrialRun,
    PointTrial,
    PointTrialParticipant,
    PointTrialEntry,
    InventoryAdjustment,
    SpeedrunGame,
    SpeedrunLevel,
    SpeedrunCategory,
    SpeedrunVariable,
    SpeedrunVariableValue,
    SpeedrunRun,
    SpeedrunRunPlayer,
    SpeedrunRunVariableValue,
  ];
}

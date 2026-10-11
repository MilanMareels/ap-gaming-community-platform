export type JwtPayload = {
  sub: number;
  email: string;
  isAdmin: boolean;
  roles: string[];
  permissions: string[];

  /** Present when impersonating — the real admin's user ID */
  realUserId?: number;
  /** Present when impersonating a specific user */
  impersonatingUserId?: number;
  /** Present when impersonating a role */
  impersonatingRoleId?: number;
};

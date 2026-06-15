export interface AuthenticatedUser {
  sub: string;
  role: string;
  orgId?: string;
}


import type { User } from "@supabase/supabase-js";

export type OrganizacionId = string | number;

export type UserRole = "admin" | "tecnico" | "viewer" | string;

export interface AuthProfile {
  organizacionId: OrganizacionId | null;
  rol: UserRole | null;
}

export interface AuthenticatedUser extends AuthProfile {
  user: User | null;
}

export interface AuthUserState extends AuthenticatedUser {
  cargando: boolean;
}

export interface AuthSignInInput {
  email: string;
  password: string;
}

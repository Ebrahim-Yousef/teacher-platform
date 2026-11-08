import { getHomePath } from "@/constants/app";

export interface RoleUser {
  role?: string;
}

export function hasRole(user?: RoleUser | null, roles: string[] = []): boolean {
  if (!user?.role) return false;
  if (!roles.length) return true;
  return roles.includes(user.role);
}

export { getHomePath };

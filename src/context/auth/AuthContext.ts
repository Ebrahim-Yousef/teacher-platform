import { createContext } from "react";

export interface User {
  id: number | string;
  username?: string;
  name: string;
  email?: string;
  role: "super_admin" | "teacher" | "assistant" | "student" | string;
  [key: string]: unknown;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  role: string | undefined; // تم التعديل من string | null إلى string | undefined
  homePath: string;
  isBooting: boolean;
  isTeacher: boolean;
  isAssistant: boolean;
  hasRole: (...roles: string[]) => boolean;
  subscriptionLocked: boolean;
  lockSubscription: () => void;
  clearSubscriptionLocked: () => void;
  login: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  clearSession: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

import { api } from "./client";

export interface LoginCredentials {
  username?: string;
  email?: string;
  password?: string;
}

export interface UserAuthProfile {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  message: string;
  data: {
    accessToken: string;
    user: UserAuthProfile;
  };
}

export function loginRequest(credentials: LoginCredentials) {
  return api<AuthResponse>("/auth/login", {
    method: "POST",
    body: credentials,
    skipAuth: true,
  });
}

export function getMe() {
  return api<{ user: UserAuthProfile }>("/auth/me");
}

export function logoutRequest() {
  return api<{ message: string }>("/auth/logout", {
    method: "POST",
  });
}

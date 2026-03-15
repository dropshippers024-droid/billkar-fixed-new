import { api } from "@/lib/api";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
}

const KEY = "billkar_user";

// ── Sync cache ───────────────────────────────────────────

export function getUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return api.isLoggedIn();
}

function cacheUser(user: AuthUser) {
  localStorage.setItem(KEY, JSON.stringify(user));
}

function clearCache() {
  localStorage.removeItem(KEY);
}

// ── Auth methods ─────────────────────────────────────────

export async function signUp(email: string, password: string, name: string) {
  const data = await api.signup(email, password, name);
  cacheUser({
    id: data.user.id,
    name: data.user.full_name || name,
    full_name: data.user.full_name || name,
    email: data.user.email,
    avatar_url: data.user.avatar_url || "",
  });
  return data;
}

export async function signIn(email: string, password: string) {
  const data = await api.login(email, password);
  const name = data.user.full_name || data.user.email?.split("@")[0] || "";
  cacheUser({
    id: data.user.id,
    name,
    full_name: data.user.full_name || name,
    email: data.user.email,
    avatar_url: data.user.avatar_url || "",
  });
  return data;
}

export async function signOut() {
  api.logout();
  clearCache();
}

export async function resetPassword(_email: string) {
  await api.forgotPassword(_email);
}

// Legacy shims — kept so existing call sites don't break

export function login(user: { name: string; email: string }): void {
  cacheUser({ id: "", ...user });
}

export function logout(): void {
  signOut();
}

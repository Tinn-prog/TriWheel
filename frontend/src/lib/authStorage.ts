const USER_KEY = "triwheel_user";
const TOKEN_KEY = "triwheel_token";
const REMEMBER_EMAIL_KEY = "triwheel_remember_email";
const REMEMBER_ME_KEY = "triwheel_remember_me";

function activeAuthStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (sessionStorage.getItem(TOKEN_KEY)) {
    return sessionStorage;
  }

  if (localStorage.getItem(TOKEN_KEY)) {
    return localStorage;
  }

  return null;
}

export function readRememberedEmail(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return localStorage.getItem(REMEMBER_EMAIL_KEY) ?? "";
}

export function readRememberMePreference(): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  return localStorage.getItem(REMEMBER_ME_KEY) !== "0";
}

export function saveRememberMePreference(remember: boolean, email: string) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(REMEMBER_ME_KEY, remember ? "1" : "0");

  if (remember) {
    localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
  } else {
    localStorage.removeItem(REMEMBER_EMAIL_KEY);
  }
}

export function readStoredUserRaw(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return sessionStorage.getItem(USER_KEY) ?? localStorage.getItem(USER_KEY) ?? "";
}

export function readStoredToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return sessionStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(TOKEN_KEY);
}

export function persistAuthSession(
  user: Record<string, unknown>,
  token: string,
  remember: boolean,
) {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);

  const storage = remember ? localStorage : sessionStorage;
  storage.setItem(USER_KEY, JSON.stringify(user));
  storage.setItem(TOKEN_KEY, token);
}

export function updateStoredUser(user: Record<string, unknown>) {
  if (typeof window === "undefined") {
    return;
  }

  const storage = activeAuthStorage() ?? localStorage;
  storage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

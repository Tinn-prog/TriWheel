import { apiFetch, apiRoutes, toApiUrl } from "./api";
import { readStoredToken, readStoredUserRaw, updateStoredUser } from "./authStorage";

type StoredAdminUser = {
  id: number;
  role: string;
  admin_role?: string | null;
};

function getStoredUser(): StoredAdminUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = readStoredUserRaw();
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as StoredAdminUser;
  } catch {
    return null;
  }
}

export function getAdminUserId(): number | null {
  const user = getStoredUser();
  return user?.role === "admin" ? user.id : null;
}

export function getAdminRole(): string | null {
  const user = getStoredUser();
  return user?.role === "admin" ? (user.admin_role ?? "operator") : null;
}

export function isSuperAdmin(): boolean {
  return getAdminRole() === "super_admin";
}

export function isOperator(): boolean {
  return getAdminRole() === "operator";
}

function getAuthHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  const token = readStoredToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

function withAdminFallback(params?: Record<string, string | boolean | undefined>) {
  const merged = { ...params };
  const userId = getAdminUserId();

  if (userId) {
    merged.user_id = String(userId);
  }

  return merged;
}

export function buildAdminUrl(path: string, params?: Record<string, string | boolean | undefined>) {
  return toApiUrl(path, withAdminFallback(params));
}

export async function adminGet(path: string, params?: Record<string, string | boolean | undefined>) {
  const userId = getAdminUserId();

  if (!userId && !readStoredToken()) {
    throw new Error("Admin session required.");
  }

  return apiFetch(buildAdminUrl(path, params), {
    cache: "no-store",
    headers: getAuthHeaders(),
  });
}

export async function adminPatch(path: string, body: Record<string, unknown>) {
  const userId = getAdminUserId();

  if (!userId && !readStoredToken()) {
    throw new Error("Admin session required.");
  }

  return apiFetch(buildAdminUrl(path), {
    method: "PATCH",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...(userId ? { user_id: userId } : {}),
      ...body,
    }),
  });
}

export async function adminPost(path: string, body: Record<string, unknown> = {}) {
  const userId = getAdminUserId();

  if (!userId && !readStoredToken()) {
    throw new Error("Admin session required.");
  }

  return apiFetch(buildAdminUrl(path), {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...(userId ? { user_id: userId } : {}),
      ...body,
    }),
  });
}

export async function adminDelete(path: string, body: Record<string, unknown> = {}) {
  const userId = getAdminUserId();

  if (!userId && !readStoredToken()) {
    throw new Error("Admin session required.");
  }

  return apiFetch(buildAdminUrl(path), {
    method: "DELETE",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...(userId ? { user_id: userId } : {}),
      ...body,
    }),
  });
}

export async function adminUpload(path: string, formData: FormData) {
  const userId = getAdminUserId();

  if (!userId && !readStoredToken()) {
    throw new Error("Admin session required.");
  }

  if (userId) {
    formData.append("user_id", String(userId));
  }

  return apiFetch(buildAdminUrl(path), {
    method: "POST",
    headers: getAuthHeaders(),
    body: formData,
  });
}

export async function adminDownload(
  path: string,
  filename: string,
  params?: Record<string, string | boolean | undefined>,
) {
  const response = await adminGet(path, params);

  if (!response.ok) {
    const data = (await response.json()) as { message?: string };
    throw new Error(data.message ?? "Download failed.");
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(objectUrl);
}

export { apiRoutes };

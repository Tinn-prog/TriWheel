import { loginPathForAdminRole } from "@/lib/adminRoles";
import { apiFetch, apiRoutes } from "./api";
import {
  clearAuthSession,
  readStoredToken,
  readStoredUserRaw,
} from "./authStorage";

type StoredUser = {
  id: number;
  role: string;
  admin_role?: string | null;
};

export function loginRedirectForRole(role?: string, adminRole?: string | null) {
  if (role === "driver") {
    return "/login?role=driver";
  }

  if (role === "admin") {
    return loginPathForAdminRole(adminRole);
  }

  return "/login?role=passenger";
}

export async function logoutTriWheel(redirectTo?: string) {
  const raw = readStoredUserRaw();
  const token = readStoredToken();
  let user: StoredUser | null = null;

  try {
    user = raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    user = null;
  }

  if (user?.id) {
    try {
      await apiFetch(apiRoutes.logout, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ user_id: user.id }),
      });
    } catch {
      // Clear the local session even if the server request fails.
    }
  }

  clearAuthSession();
  window.dispatchEvent(new Event("triwheel_user_change"));

  window.location.assign(
    redirectTo ?? loginRedirectForRole(user?.role, user?.admin_role),
  );
}

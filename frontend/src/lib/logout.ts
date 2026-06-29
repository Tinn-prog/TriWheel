import { apiFetch, apiRoutes } from "./api";

type StoredUser = {
  id: number;
  role: string;
};

export function loginRedirectForRole(role?: string) {
  if (role === "driver") {
    return "/login?role=driver";
  }

  if (role === "admin") {
    return "/login?role=admin";
  }

  return "/login?role=passenger";
}

export async function logoutTriWheel(redirectTo?: string) {
  const raw = localStorage.getItem("triwheel_user");
  const token = localStorage.getItem("triwheel_token");
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

  localStorage.removeItem("triwheel_user");
  localStorage.removeItem("triwheel_token");
  window.dispatchEvent(new Event("triwheel_user_change"));

  window.location.assign(redirectTo ?? loginRedirectForRole(user?.role));
}

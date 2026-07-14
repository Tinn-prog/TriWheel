"use client";

import { apiFetch, apiRoutes, toApiUrl } from "@/lib/api";
import { formatDateTime } from "@/lib/formatDateTime";
import { resolveNotificationHref } from "@/lib/notificationNavigation";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type AppNotification = {
  id: number;
  type: string;
  title: string;
  body: string;
  action_url: string | null;
  read_at: string | null;
  created_at: string;
};

export function NotificationsPanel({
  backHref,
  dashboardHref,
  userId,
}: {
  backHref: string;
  dashboardHref: string;
  userId: number;
}) {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = useCallback(async () => {
    const response = await apiFetch(
      toApiUrl(apiRoutes.notifications, { user_id: String(userId) }),
      { cache: "no-store" },
    );
    const data = (await response.json()) as {
      message?: string;
      notifications?: AppNotification[];
      unread_count?: number;
    };

    if (!response.ok) {
      throw new Error(data.message ?? "Unable to load notifications.");
    }

    setNotifications(data.notifications ?? []);
    setUnreadCount(data.unread_count ?? 0);
    window.dispatchEvent(new Event("triwheel_notifications_change"));
  }, [userId]);

  useEffect(() => {
    void loadNotifications().catch((caughtError) => {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load notifications.",
      );
    });
  }, [loadNotifications]);

  async function markRead(notification: AppNotification) {
    setBusyId(notification.id);
    setError("");

    try {
      const response = await fetch(apiRoutes.notificationMarkRead(notification.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        throw new Error(data.message ?? "Unable to update notification.");
      }

      await loadNotifications();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update notification.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function markAllRead() {
    setError("");
    setNotice("");

    try {
      const response = await fetch(apiRoutes.notificationsMarkAllRead, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to mark notifications as read.");
      }

      setNotice(data.message ?? "All notifications marked as read.");
      await loadNotifications();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to mark notifications as read.",
      );
    }
  }

  return (
    <section className="mx-auto w-full max-w-3xl min-w-0">
      <header className="rounded-[1.75rem] bg-gradient-to-br from-orange-500 via-orange-600 to-orange-800 p-5 text-white shadow-xl shadow-orange-200 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-100">
              Notifications
            </p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">Notifications</h1>
            <p className="mt-2 text-sm leading-6 text-orange-50">
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}.`
                : "You are all caught up."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex min-h-9 items-center justify-center rounded-lg bg-white px-4 py-2 text-xs font-black text-orange-700"
              href={backHref}
            >
              Back
            </Link>
            {unreadCount > 0 ? (
              <button
                className="inline-flex min-h-9 items-center justify-center rounded-lg border border-white/30 px-4 py-2 text-xs font-black text-white"
                onClick={() => void markAllRead()}
                type="button"
              >
                Mark all read
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {error ? <div className="tw-alert-error mt-6">{error}</div> : null}
      {notice ? <div className="tw-alert-success mt-6">{notice}</div> : null}

      <div className="mt-6 grid gap-3">
        {notifications.map((notification) => {
          const content = (
            <article
              className={`rounded-[1.5rem] p-4 shadow-sm ring-1 ${
                notification.read_at
                  ? "bg-white ring-slate-200"
                  : "bg-orange-50 ring-orange-200"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                    {notification.type.replaceAll(".", " ")}
                  </p>
                  <h2 className="mt-1 text-lg font-black text-slate-900">
                    {notification.title}
                  </h2>
                </div>
                {!notification.read_at ? (
                  <span className="rounded-full bg-orange-500 px-2.5 py-1 text-[10px] font-black uppercase text-white">
                    New
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{notification.body}</p>
              <p className="mt-3 text-xs font-semibold text-slate-400">
                {formatDateTime(notification.created_at)}
              </p>
            </article>
          );

          if (notification.action_url) {
            const destination = resolveNotificationHref(
              notification.action_url,
              dashboardHref,
            );

            return (
              <Link
                className="block transition hover:opacity-95"
                href={destination ?? dashboardHref}
                key={notification.id}
                onClick={() => {
                  if (!notification.read_at) {
                    void markRead(notification);
                  }
                }}
              >
                {content}
              </Link>
            );
          }

          return (
            <button
              className="block w-full text-left transition hover:opacity-95 disabled:opacity-60"
              disabled={busyId === notification.id}
              key={notification.id}
              onClick={() => {
                if (!notification.read_at) {
                  void markRead(notification);
                }
              }}
              type="button"
            >
              {content}
            </button>
          );
        })}

        {!notifications.length ? (
          <div className="rounded-[1.5rem] bg-white p-8 text-center font-black text-slate-500 shadow-sm ring-1 ring-slate-200">
            No notifications yet.
          </div>
        ) : null}
      </div>
    </section>
  );
}

"use client";

import { apiFetch, apiRoutes, toApiUrl } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type AppNotification = {
  id: number;
  type: string;
  title: string;
  body: string;
  action_url: string | null;
  read_at: string | null;
  created_at: string;
};

function BellIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path
        d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9 17a3 3 0 0 0 6 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function NotificationBell({
  href,
  userId,
}: {
  href: string;
  userId: number;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await apiFetch(
        toApiUrl(apiRoutes.notificationsUnreadCount, { user_id: String(userId) }),
        { cache: "no-store" },
      );
      const data = (await response.json()) as { unread_count?: number };

      if (response.ok) {
        setUnreadCount(data.unread_count ?? 0);
      }
    } catch {
      // Ignore polling errors quietly.
    }
  }, [userId]);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await apiFetch(
        toApiUrl(apiRoutes.notifications, { user_id: String(userId) }),
        { cache: "no-store" },
      );
      const data = (await response.json()) as {
        notifications?: AppNotification[];
        unread_count?: number;
      };

      if (response.ok) {
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.unread_count ?? 0);
      }
    } catch {
      // Ignore fetch errors quietly.
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadUnreadCount();

    const interval = window.setInterval(() => {
      void loadUnreadCount();
    }, 15000);

    const handleRefresh = () => {
      void loadUnreadCount();
      if (isOpen) {
        void loadNotifications();
      }
    };

    window.addEventListener("focus", handleRefresh);
    window.addEventListener("triwheel_notifications_change", handleRefresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleRefresh);
      window.removeEventListener("triwheel_notifications_change", handleRefresh);
    };
  }, [isOpen, loadNotifications, loadUnreadCount]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    void loadNotifications();
  }, [isOpen, loadNotifications]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  async function handleNotificationClick(notification: AppNotification) {
    if (!notification.read_at) {
      try {
        await fetch(apiRoutes.notificationMarkRead(notification.id), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId }),
        });
        window.dispatchEvent(new Event("triwheel_notifications_change"));
      } catch {
        // Continue navigation even if mark-read fails.
      }
    }

    setIsOpen(false);

    if (notification.action_url?.startsWith("/")) {
      router.push(notification.action_url);
    }
  }

  const preview = notifications.slice(0, 5);

  return (
    <div className="relative shrink-0" ref={containerRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        className="relative inline-flex size-11 items-center justify-center rounded-full bg-white text-orange-700 shadow-lg shadow-orange-950/10 transition hover:bg-orange-50"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <BellIcon />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-black leading-none text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-[1200] w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl ring-1 ring-slate-200">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-black text-slate-900">Notifications</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {unreadCount > 0
                ? `${unreadCount} unread`
                : "You're all caught up"}
            </p>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <p className="px-4 py-6 text-center text-sm font-semibold text-slate-500">
                Loading...
              </p>
            ) : preview.length ? (
              preview.map((notification) => (
                <button
                  className={`block w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 ${
                    notification.read_at ? "bg-white" : "bg-orange-50/70"
                  }`}
                  key={notification.id}
                  onClick={() => void handleNotificationClick(notification)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-black text-slate-900">
                      {notification.title}
                    </p>
                    {!notification.read_at ? (
                      <span className="mt-0.5 size-2 shrink-0 rounded-full bg-orange-500" />
                    ) : null}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">
                    {notification.body}
                  </p>
                  <p className="mt-2 text-[10px] font-semibold text-slate-400">
                    {new Date(notification.created_at).toLocaleString()}
                  </p>
                </button>
              ))
            ) : (
              <p className="px-4 py-6 text-center text-sm font-semibold text-slate-500">
                No notifications yet.
              </p>
            )}
          </div>

          <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
            <Link
              className="block text-center text-xs font-black text-orange-700 hover:text-orange-800"
              href={href}
              onClick={() => setIsOpen(false)}
            >
              View all notifications
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

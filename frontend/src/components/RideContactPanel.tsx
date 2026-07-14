"use client";

import { apiFetch, apiRoutes } from "@/lib/api";
import { formatDateTime } from "@/lib/formatDateTime";
import { buildPhoneCallHref } from "@/lib/phoneCall";
import {
  formatChatExpiry,
  type RideChatMessage,
  type RideChatMeta,
} from "@/lib/rideChat";
import { useLiveDashboardRefresh } from "@/hooks/useLiveDashboardRefresh";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

type RideContactPanelProps = {
  rideId: number;
  userId: number;
  contactName: string;
  contactPhone: string | null;
  viewerRole: "passenger" | "driver";
  enabled?: boolean;
  messagesHref?: string;
};

export function RideContactPanel({
  contactName,
  contactPhone,
  enabled = true,
  messagesHref,
  rideId,
  userId,
  viewerRole,
}: RideContactPanelProps) {
  const [messages, setMessages] = useState<RideChatMessage[]>([]);
  const [chatMeta, setChatMeta] = useState<RideChatMeta | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef<RideChatMessage[]>([]);
  const callHref = buildPhoneCallHref(contactPhone);

  messagesRef.current = messages;

  const loadMessages = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!enabled) {
        return;
      }

      const lastMessageId = options?.silent
        ? messagesRef.current.at(-1)?.id
        : undefined;
      const url = new URL(apiRoutes.rideMessages(rideId));
      url.searchParams.set("user_id", String(userId));

      if (options?.silent && lastMessageId) {
        url.searchParams.set("after_id", String(lastMessageId));
      }

      try {
        const response = await apiFetch(url.toString());

        if (!response.ok) {
          const data = (await response.json()) as {
            message?: string;
            chat?: RideChatMeta;
          };

          if (data.chat) {
            setChatMeta(data.chat);
          }

          if (!options?.silent) {
            setError(data.message ?? "Unable to load chat messages.");
          }

          return;
        }

        const data = (await response.json()) as {
          messages?: RideChatMessage[];
          chat?: RideChatMeta;
        };
        const incoming = data.messages ?? [];

        if (data.chat) {
          setChatMeta(data.chat);
        }

        if (options?.silent && lastMessageId) {
          if (incoming.length > 0) {
            setMessages((current) => [...current, ...incoming]);
          }
        } else {
          setMessages(incoming);
        }

        setError(null);
      } catch {
        if (!options?.silent) {
          setError("Unable to load chat messages.");
        }
      } finally {
        if (!options?.silent) {
          setIsLoading(false);
        }
      }
    },
    [enabled, rideId, userId],
  );

  useEffect(() => {
    setMessages([]);
    setChatMeta(null);
    setDraft("");
    setError(null);
    setIsLoading(true);
  }, [rideId, userId]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useLiveDashboardRefresh(
    () => loadMessages({ silent: true }),
    enabled && Boolean(chatMeta?.can_read),
    4000,
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const body = draft.trim();

    if (!body || isSending || !chatMeta?.can_send) {
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const response = await apiFetch(apiRoutes.rideMessages(rideId), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          body,
        }),
      });

      const data = (await response.json()) as {
        message?: string;
        chat_message?: RideChatMessage;
        chat?: RideChatMeta;
      };

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to send message.");
      }

      if (data.chat) {
        setChatMeta(data.chat);
      }

      if (data.chat_message) {
        setMessages((current) => [...current, data.chat_message as RideChatMessage]);
      } else {
        await loadMessages({ silent: true });
      }

      setDraft("");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to send message.",
      );
    } finally {
      setIsSending(false);
    }
  }

  const otherRoleLabel = viewerRole === "passenger" ? "driver" : "passenger";
  const chatClosed = chatMeta ? !chatMeta.can_send : false;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            Contact {otherRoleLabel}
          </p>
          <p className="mt-1 text-sm font-black text-slate-900">{contactName}</p>
          {contactPhone ? (
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {contactPhone}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {messagesHref ? (
            <Link
              className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 sm:text-sm"
              href={messagesHref}
            >
              All messages
            </Link>
          ) : null}
          {callHref ? (
            <a
              className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-emerald-500 px-4 py-2 text-xs font-black text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600 sm:text-sm"
              href={callHref}
            >
              Call {otherRoleLabel}
            </a>
          ) : (
            <span className="rounded-2xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-500">
              Phone unavailable
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            Private trip chat
          </p>
          {chatMeta ? (
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                chatMeta.can_send
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {chatMeta.can_send ? "Open" : "Closed"}
            </span>
          ) : null}
        </div>

        {chatMeta?.expires_at ? (
          <p className="mt-2 text-xs font-semibold text-slate-500">
            {chatMeta.can_send
              ? `This chat closes ${formatChatExpiry(chatMeta.expires_at)}. Only you and your ${otherRoleLabel} can see these messages.`
              : "This 24-hour trip chat has ended."}
          </p>
        ) : (
          <p className="mt-2 text-xs font-semibold text-slate-500">
            Only the passenger and assigned driver can message each other here.
          </p>
        )}

        <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
          {isLoading ? (
            <p className="py-6 text-center text-sm font-semibold text-slate-500">
              Loading messages...
            </p>
          ) : messages.length === 0 ? (
            <p className="py-6 text-center text-sm font-semibold text-slate-500">
              No messages yet. Say hello to coordinate pickup.
            </p>
          ) : (
            messages.map((message) => {
              const isMine = message.sender_id === userId;

              return (
                <div
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                  key={message.id}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      isMine
                        ? "bg-orange-500 text-white"
                        : "bg-white text-slate-900 ring-1 ring-slate-200"
                    }`}
                  >
                    {!isMine ? (
                      <p className="mb-1 text-[10px] font-black uppercase tracking-wide opacity-70">
                        {message.sender_name}
                      </p>
                    ) : null}
                    <p className="whitespace-pre-wrap break-words font-semibold leading-5">
                      {message.body}
                    </p>
                    {message.created_at ? (
                      <p
                        className={`mt-1 text-[10px] font-bold ${
                          isMine ? "text-orange-100" : "text-slate-400"
                        }`}
                      >
                        {formatDateTime(message.created_at)}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {chatClosed ? (
          <p className="mt-3 rounded-2xl bg-slate-200/70 px-4 py-3 text-sm font-semibold text-slate-700">
            Messaging is closed for this trip.
          </p>
        ) : (
          <form className="mt-3 flex gap-2" onSubmit={handleSubmit}>
            <input
              className="min-h-11 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none ring-orange-500 transition focus:ring-2"
              disabled={isSending || !chatMeta?.can_send}
              maxLength={1000}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Type a message..."
              value={draft}
            />
            <button
              className="min-h-11 rounded-2xl bg-orange-500 px-4 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300 sm:text-sm"
              disabled={isSending || draft.trim() === "" || !chatMeta?.can_send}
              type="submit"
            >
              {isSending ? "Sending..." : "Send"}
            </button>
          </form>
        )}

        {error ? (
          <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>
        ) : null}
      </div>
    </section>
  );
}

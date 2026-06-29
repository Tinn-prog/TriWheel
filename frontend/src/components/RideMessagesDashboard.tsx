"use client";

import { RideContactPanel } from "@/components/RideContactPanel";
import { apiFetch, apiRoutes } from "@/lib/api";
import {
  formatChatExpiry,
  formatConversationTime,
  type RideConversation,
} from "@/lib/rideChat";
import { useLiveDashboardRefresh } from "@/hooks/useLiveDashboardRefresh";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type RideMessagesDashboardProps = {
  backHref: string;
  initialRideId?: number | null;
  userId: number;
  viewerRole: "passenger" | "driver";
};

export function RideMessagesDashboard({
  backHref,
  initialRideId = null,
  userId,
  viewerRole,
}: RideMessagesDashboardProps) {
  const [conversations, setConversations] = useState<RideConversation[]>([]);
  const [selectedRideId, setSelectedRideId] = useState<number | null>(initialRideId);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadConversations = useCallback(async () => {
    try {
      const url = new URL(apiRoutes.rideChats);
      url.searchParams.set("user_id", String(userId));
      const response = await apiFetch(url.toString());

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        throw new Error(data.message ?? "Unable to load messages.");
      }

      const data = (await response.json()) as {
        conversations?: RideConversation[];
      };

      setConversations(data.conversations ?? []);
      setError("");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load messages.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (initialRideId) {
      setSelectedRideId(initialRideId);
    }
  }, [initialRideId]);

  useLiveDashboardRefresh(() => loadConversations(), true, 10000);

  const selectedConversation = conversations.find(
    (conversation) => conversation.ride_id === selectedRideId,
  );
  const activeConversations = conversations.filter(
    (conversation) => conversation.chat.status === "active",
  );
  const endedConversations = conversations.filter(
    (conversation) => conversation.chat.status === "ended",
  );

  return (
    <section className="mx-auto w-full max-w-3xl min-w-0">
      <header className="rounded-[1.75rem] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-5 text-white shadow-xl sm:p-8">
        <Link
          className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300 transition hover:text-white"
          href={backHref}
        >
          Back to dashboard
        </Link>
        <p className="mt-4 text-xs font-black uppercase tracking-[0.24em] text-orange-300">
          Trip messages
        </p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Messages</h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Private chats between you and your {viewerRole === "passenger" ? "driver" : "passenger"}.
          Each chat stays open for 24 hours after the ride is accepted.
        </p>
      </header>

      {error ? <div className="tw-alert-error mt-6">{error}</div> : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-black text-slate-900">Conversations</h2>
            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-700">
              {activeConversations.length} active
            </span>
          </div>

          {isLoading ? (
            <p className="mt-6 py-8 text-center text-sm font-semibold text-slate-500">
              Loading conversations...
            </p>
          ) : conversations.length === 0 ? (
            <div className="mt-6 rounded-3xl bg-slate-50 p-8 text-center">
              <p className="font-black text-slate-900">No trip chats yet</p>
              <p className="mt-2 text-sm text-slate-500">
                {viewerRole === "passenger"
                  ? "Once a driver accepts your ride, a private 24-hour chat opens here."
                  : "When a passenger chooses you for a ride, a private 24-hour chat opens here."}
              </p>
            </div>
          ) : (
            <div className="mt-4 grid gap-4">
              {activeConversations.length > 0 ? (
                <ConversationGroup
                  conversations={activeConversations}
                  label="Active chats"
                  onSelect={setSelectedRideId}
                  selectedRideId={selectedRideId}
                />
              ) : null}
              {endedConversations.length > 0 ? (
                <ConversationGroup
                  conversations={endedConversations}
                  label="Ended chats"
                  onSelect={setSelectedRideId}
                  selectedRideId={selectedRideId}
                />
              ) : null}
            </div>
          )}
        </div>

        <div className="min-w-0">
          {selectedConversation ? (
            selectedConversation.chat.can_read ? (
              <RideContactPanel
                contactName={selectedConversation.other_party_name ?? "Trip contact"}
                contactPhone={null}
                enabled
                rideId={selectedConversation.ride_id}
                userId={userId}
                viewerRole={viewerRole}
              />
            ) : (
              <EndedChatPanel conversation={selectedConversation} />
            )
          ) : (
            <div className="rounded-[1.75rem] bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
              <p className="font-black text-slate-900">Select a conversation</p>
              <p className="mt-2 text-sm text-slate-500">
                Choose an active or recent chat to view trip messages.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ConversationGroup({
  conversations,
  label,
  onSelect,
  selectedRideId,
}: {
  conversations: RideConversation[];
  label: string;
  onSelect: (rideId: number) => void;
  selectedRideId: number | null;
}) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <div className="mt-2 grid gap-2">
        {conversations.map((conversation) => {
          const isActive = conversation.chat.status === "active";
          const isSelected = selectedRideId === conversation.ride_id;

          return (
            <button
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                isSelected
                  ? "border-orange-300 bg-orange-50"
                  : "border-slate-200 bg-white hover:border-orange-200 hover:bg-orange-50/60"
              }`}
              key={conversation.ride_id}
              onClick={() => onSelect(conversation.ride_id)}
              type="button"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-black text-slate-900">
                    {conversation.other_party_name ?? "Trip contact"}
                  </p>
                  <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                    Ride #{conversation.ride_id} · {conversation.ride_status}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                    isActive
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {isActive ? "Open" : "Ended"}
                </span>
              </div>
              {conversation.last_message ? (
                <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                  <span className="font-bold">{conversation.last_message.sender_name}:</span>{" "}
                  {conversation.last_message.body}
                </p>
              ) : (
                <p className="mt-2 text-sm text-slate-400">No messages yet.</p>
              )}
              <p className="mt-2 text-[11px] font-semibold text-slate-400">
                {isActive && conversation.chat.expires_at
                  ? `Closes ${formatChatExpiry(conversation.chat.expires_at)}`
                  : conversation.last_message?.created_at
                    ? `Last message ${formatConversationTime(conversation.last_message.created_at)}`
                    : null}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EndedChatPanel({ conversation }: { conversation: RideConversation }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
        {conversation.other_party_name ?? "Trip contact"}
      </p>
      <h2 className="mt-2 text-2xl font-black text-slate-900">Chat ended</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        This private chat closed after 24 hours. Trip chats are only available between
        the assigned passenger and driver.
      </p>
      {conversation.last_message ? (
        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            Last message
          </p>
          <p className="mt-2 text-sm font-bold text-slate-900">
            {conversation.last_message.sender_name}
          </p>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-700">
            {conversation.last_message.body}
          </p>
          <p className="mt-2 text-xs font-semibold text-slate-400">
            {formatConversationTime(conversation.last_message.created_at)}
          </p>
        </div>
      ) : null}
      <div className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
        Ride #{conversation.ride_id} · {conversation.pickup_address} →{" "}
        {conversation.dropoff_address}
      </div>
    </section>
  );
}

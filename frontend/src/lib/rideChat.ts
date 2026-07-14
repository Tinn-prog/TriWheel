import { formatDateTime } from "@/lib/formatDateTime";

export type RideChatMeta = {
  open: boolean;
  opens_at: string | null;
  expires_at: string | null;
  can_read: boolean;
  can_send: boolean;
  status: "active" | "ended" | "unavailable";
};

export type RideChatMessage = {
  id: number;
  ride_id: number;
  sender_id: number;
  sender_name: string;
  sender_role: string | null;
  body: string;
  created_at: string | null;
};

export type RideConversation = {
  ride_id: number;
  ride_status: string;
  pickup_address: string;
  dropoff_address: string;
  other_party_name: string | null;
  other_party_role: string | null;
  chat: RideChatMeta;
  last_message: RideChatMessage | null;
};

export function formatChatExpiry(expiresAt: string | null) {
  if (!expiresAt) {
    return null;
  }

  return formatDateTime(expiresAt);
}

export function formatConversationTime(value: string | null) {
  return formatDateTime(value);
}

export function normalizePhoneForCall(phone: string | null | undefined): string | null {
  if (!phone) {
    return null;
  }

  const trimmed = phone.trim();

  if (!trimmed) {
    return null;
  }

  const digits = trimmed.replace(/[^\d+]/g, "");

  return digits || null;
}

export function buildPhoneCallHref(
  phone: string | null | undefined,
): string | null {
  const normalized = normalizePhoneForCall(phone);

  if (!normalized) {
    return null;
  }

  return `tel:${normalized}`;
}

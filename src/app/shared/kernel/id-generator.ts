/** Port for client-side unique ids (offline-safe, sync-ready). */
export interface IdGenerator {
  next(): string;
}

/**
 * `crypto.randomUUID` only exists in secure contexts (https or localhost). Opening the dev server by
 * its LAN address from a phone is neither, so fall back to `getRandomValues`, which is always there.
 */
function randomUuid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export const uuidGenerator: IdGenerator = { next: randomUuid };

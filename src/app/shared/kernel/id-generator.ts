/** Port for client-side unique ids (offline-safe, sync-ready). */
export interface IdGenerator {
  next(): string;
}

export const uuidGenerator: IdGenerator = { next: () => crypto.randomUUID() };

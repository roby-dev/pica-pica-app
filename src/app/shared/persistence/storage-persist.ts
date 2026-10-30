/**
 * Asks the browser not to evict our data under storage pressure. iOS Safari may ignore or refuse;
 * the backup feature is the real safety net. Never throws.
 */
export async function requestPersistentStorage(
  storage: StorageManager | undefined = typeof navigator === 'undefined'
    ? undefined
    : navigator.storage,
): Promise<boolean> {
  try {
    if (!storage?.persist) return false;
    if (storage.persisted && (await storage.persisted())) return true;
    return await storage.persist();
  } catch {
    return false;
  }
}

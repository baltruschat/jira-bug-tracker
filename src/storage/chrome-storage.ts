import type { LocalStorageSchema, SessionStorageSchema } from '../models/types';

type StorageArea = 'local' | 'session';

async function get<T>(area: StorageArea, key: string): Promise<T | undefined> {
  const storage = area === 'local' ? chrome.storage.local : chrome.storage.session;
  const result = await storage.get(key);
  return result[key] as T | undefined;
}

async function set<T>(area: StorageArea, key: string, value: T): Promise<void> {
  const storage = area === 'local' ? chrome.storage.local : chrome.storage.session;
  await storage.set({ [key]: value });
}

async function remove(area: StorageArea, key: string): Promise<void> {
  const storage = area === 'local' ? chrome.storage.local : chrome.storage.session;
  await storage.remove(key);
}

// Typed local storage accessors

export async function getLocal<K extends keyof LocalStorageSchema>(
  key: K,
): Promise<LocalStorageSchema[K] | undefined> {
  return get<LocalStorageSchema[K]>('local', key);
}

export async function setLocal<K extends keyof LocalStorageSchema>(
  key: K,
  value: LocalStorageSchema[K],
): Promise<void> {
  return set('local', key, value);
}

export async function removeLocal<K extends keyof LocalStorageSchema>(
  key: K,
): Promise<void> {
  return remove('local', key);
}

// Typed session storage accessors

export async function getSession<K extends string>(
  key: K,
): Promise<SessionStorageSchema[K & keyof SessionStorageSchema] | undefined> {
  return get('session', key);
}

export async function setSession<K extends string>(
  key: K,
  value: unknown,
): Promise<void> {
  return set('session', key, value);
}

export async function removeSession(key: string): Promise<void> {
  return remove('session', key);
}

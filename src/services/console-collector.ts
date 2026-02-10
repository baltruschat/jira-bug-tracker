import type { ConsoleEntry } from '../models/types';
import { getSession, setSession } from '../storage/chrome-storage';
import { MAX_CONSOLE_ENTRIES } from '../utils/constants';

export async function addEntries(
  tabId: number,
  entries: ConsoleEntry[],
  maxEntries: number = MAX_CONSOLE_ENTRIES,
): Promise<void> {
  const key = `consoleBuffer:${tabId}` as const;
  const existing = ((await getSession(key)) as ConsoleEntry[] | undefined) ?? [];
  const combined = [...existing, ...entries];

  // FIFO: keep only the most recent maxEntries
  const trimmed = combined.length > maxEntries
    ? combined.slice(combined.length - maxEntries)
    : combined;

  await setSession(key, trimmed);
}

export async function getEntries(tabId: number): Promise<ConsoleEntry[]> {
  const key = `consoleBuffer:${tabId}` as const;
  return ((await getSession(key)) as ConsoleEntry[] | undefined) ?? [];
}

export async function clearBuffer(tabId: number): Promise<void> {
  const key = `consoleBuffer:${tabId}` as const;
  await setSession(key, []);
}

export async function getBufferSize(tabId: number): Promise<number> {
  const entries = await getEntries(tabId);
  return entries.length;
}

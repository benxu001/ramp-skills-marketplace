import type { FeedbackEntry } from './types';

const STORAGE_KEY = 'skill-router:feedback';

export type FeedbackMap = Record<string, FeedbackEntry>;

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage;
}

export function loadFeedback(): FeedbackMap {
  if (!canUseStorage()) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return {};
    const map: FeedbackMap = {};
    for (const entry of parsed) {
      if (
        entry &&
        typeof entry === 'object' &&
        typeof (entry as FeedbackEntry).messageId === 'string' &&
        ((entry as FeedbackEntry).rating === 'up' ||
          (entry as FeedbackEntry).rating === 'down')
      ) {
        map[(entry as FeedbackEntry).messageId] = entry as FeedbackEntry;
      }
    }
    return map;
  } catch {
    return {};
  }
}

function persist(map: FeedbackMap) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(Object.values(map)),
    );
  } catch {
    // quota / serialization errors are non-fatal for a stats pill
  }
}

export function recordFeedback(
  map: FeedbackMap,
  entry: FeedbackEntry,
): FeedbackMap {
  const next: FeedbackMap = { ...map, [entry.messageId]: entry };
  persist(next);
  return next;
}

export function removeFeedback(
  map: FeedbackMap,
  messageId: string,
): FeedbackMap {
  if (!(messageId in map)) return map;
  const next: FeedbackMap = { ...map };
  delete next[messageId];
  persist(next);
  return next;
}

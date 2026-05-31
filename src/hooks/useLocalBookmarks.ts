import { useState, useEffect } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

export const LOCAL_BOOKMARK_KEY = 'pika_bookmark_queue';

export function getLocalBookmarkIds(): string[] {
  try {
    const stored = localStorage.getItem(LOCAL_BOOKMARK_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalBookmarkIds(ids: string[]) {
  try {
    localStorage.setItem(LOCAL_BOOKMARK_KEY, JSON.stringify(ids));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}

export function useLocalBookmarks() {
  const [localBookmarkIds, setLocalBookmarkIds] = useState<string[]>(() => getLocalBookmarkIds());

  useEffect(() => {
    const handleStorage = () => {
      setLocalBookmarkIds(getLocalBookmarkIds());
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const addLocalBookmark = (id: string) => {
    setLocalBookmarkIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      saveLocalBookmarkIds(next);
      return next;
    });
  };

  const removeLocalBookmark = (id: string) => {
    setLocalBookmarkIds((prev) => {
      const next = prev.filter((item) => item !== id);
      saveLocalBookmarkIds(next);
      return next;
    });
  };

  const hasLocalBookmark = (id: string) => localBookmarkIds.includes(id);

  const clearLocalBookmarks = () => {
    setLocalBookmarkIds([]);
    try {
      localStorage.removeItem(LOCAL_BOOKMARK_KEY);
    } catch (err) {
      console.error('Failed to clear localStorage:', err);
    }
  };

  return {
    localBookmarkIds,
    addLocalBookmark,
    removeLocalBookmark,
    hasLocalBookmark,
    clearLocalBookmarks,
  };
}

export async function flushLocalBookmarksToDb(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const queue = getLocalBookmarkIds();
  if (queue.length === 0) return;

  try {
    const records = queue.map((bookmarked_user_id) => ({
      user_id: userId,
      bookmarked_user_id,
    }));

    const { error } = await (supabase as any)
      .from('bookmarks')
      .upsert(records, { onConflict: 'user_id,bookmarked_user_id' });

    if (error) {
      console.error('Failed to flush bookmarks to DB:', error);
      return;
    }

    localStorage.removeItem(LOCAL_BOOKMARK_KEY);
  } catch (err) {
    console.error('flushLocalBookmarksToDb error:', err);
  }
}

import { supabase } from '@/integrations/supabase/client';

export interface LocationPreference {
  province: string;
  country: string;
}

export const EMPTY_LOCATION_PREFERENCE: LocationPreference = {
  province: '',
  country: '',
};

function getLocationPreferenceKey(userId: string): string {
  return `locationPreference_${userId}`;
}

function normalizeLocationPreference(value: unknown): LocationPreference | null {
  if (!value || typeof value !== 'object') return null;

  const candidate = value as Record<string, unknown>;
  const country = typeof candidate.country === 'string' ? candidate.country.trim() : '';
  const provinceCandidate =
    typeof candidate.province === 'string'
      ? candidate.province
      : typeof candidate.city === 'string'
        ? candidate.city
        : '';
  const province = provinceCandidate.trim();

  if (!province || !country) return null;

  return { province, country };
}

export function readLocationPreference(userId: string | null | undefined): LocationPreference | null {
  if (!userId || typeof window === 'undefined') return null;

  const savedValue = localStorage.getItem(getLocationPreferenceKey(userId));
  if (!savedValue) return null;

  try {
    return normalizeLocationPreference(JSON.parse(savedValue));
  } catch {
    return null;
  }
}

export function saveLocationPreference(userId: string, preference: LocationPreference): LocationPreference {
  const normalized = normalizeLocationPreference(preference);
  if (!normalized) {
    throw new Error('Province/state and country are required');
  }

  localStorage.setItem(getLocationPreferenceKey(userId), JSON.stringify(normalized));
  return normalized;
}

export function clearLocationPreference(userId: string): void {
  localStorage.removeItem(getLocationPreferenceKey(userId));
}

function cacheLocationPreference(userId: string, preference: LocationPreference): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(getLocationPreferenceKey(userId), JSON.stringify(preference));
}

/**
 * Fetch the location preference from the user's profile in the database.
 * Falls back to the localStorage cache on any failure so the app keeps working offline.
 * On a successful DB hit the value is written back to the localStorage cache.
 */
export async function fetchLocationPreference(
  userId: string | null | undefined,
): Promise<LocationPreference | null> {
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('province, country')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      return readLocationPreference(userId);
    }

    const normalized = normalizeLocationPreference(data);
    if (normalized) {
      cacheLocationPreference(userId, normalized);
      return normalized;
    }

    // Profile has no location yet — fall back to any locally cached value
    // and, if present, backfill it to the profile so it persists going forward.
    const cached = readLocationPreference(userId);
    if (cached) {
      void persistLocationPreference(userId, cached);
    }
    return cached;
  } catch {
    return readLocationPreference(userId);
  }
}

/**
 * Persist the location preference to BOTH the database profile and the
 * localStorage cache. Throws if the preference is incomplete.
 */
export async function persistLocationPreference(
  userId: string,
  preference: LocationPreference,
): Promise<LocationPreference> {
  const normalized = saveLocationPreference(userId, preference);

  const { error } = await supabase
    .from('profiles')
    .update({ province: normalized.province, country: normalized.country })
    .eq('id', userId);

  if (error) {
    throw new Error(error.message);
  }

  return normalized;
}

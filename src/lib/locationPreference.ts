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

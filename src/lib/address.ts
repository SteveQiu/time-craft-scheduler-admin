export interface LocationFields {
  address_line_1: string;
  address_line_2: string;
  city: string;
  province: string;
  country: string;
  zip: string;
}

export const COUNTRIES = ['Canada', 'United States'] as const;
export type Country = typeof COUNTRIES[number];

export const PROVINCES_BY_COUNTRY: Record<string, string[]> = {
  'Canada': [
    'Alberta',
    'British Columbia',
    'Manitoba',
    'New Brunswick',
    'Newfoundland and Labrador',
    'Northwest Territories',
    'Nova Scotia',
    'Nunavut',
    'Ontario',
    'Prince Edward Island',
    'Quebec',
    'Saskatchewan',
    'Yukon',
  ],
  'United States': [
    'Alabama',
    'Alaska',
    'Arizona',
    'Arkansas',
    'California',
    'Colorado',
    'Connecticut',
    'Delaware',
    'District of Columbia',
    'Florida',
    'Georgia',
    'Hawaii',
    'Idaho',
    'Illinois',
    'Indiana',
    'Iowa',
    'Kansas',
    'Kentucky',
    'Louisiana',
    'Maine',
    'Maryland',
    'Massachusetts',
    'Michigan',
    'Minnesota',
    'Mississippi',
    'Missouri',
    'Montana',
    'Nebraska',
    'Nevada',
    'New Hampshire',
    'New Jersey',
    'New Mexico',
    'New York',
    'North Carolina',
    'North Dakota',
    'Ohio',
    'Oklahoma',
    'Oregon',
    'Pennsylvania',
    'Rhode Island',
    'South Carolina',
    'South Dakota',
    'Tennessee',
    'Texas',
    'Utah',
    'Vermont',
    'Virginia',
    'Washington',
    'West Virginia',
    'Wisconsin',
    'Wyoming',
  ],
};

export function parseLocation(raw: string | null | undefined): LocationFields {
  if (!raw) return { address_line_1: '', address_line_2: '', city: '', province: '', country: '', zip: '' };
  try {
    const p = JSON.parse(raw);
    if (p && typeof p === 'object' && ('city' in p || 'province' in p)) return {
      address_line_1: p.address_line_1 || '',
      address_line_2: p.address_line_2 || '',
      city: p.city || '',
      province: p.province || '',
      country: p.country || '',
      zip: p.zip || '',
    };
  } catch {
    // intentionally ignored: fall through to legacy freetext handling
  }
  // Legacy freetext — put it in city
  return { address_line_1: '', address_line_2: '', city: raw, province: '', country: '', zip: '' };
}

export function formatLocation(f: LocationFields): string {
  return [f.address_line_1, f.address_line_2, f.city, f.province, f.country, f.zip].filter(Boolean).join(', ');
}

export function serializeLocation(f: LocationFields): string {
  return JSON.stringify(f);
}

import { AddressFields, EMPTY_ADDRESS_FIELDS } from './types';

export function parseAddress(raw: string): AddressFields {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return {
        // support legacy "street" key
        address_line_1: parsed.address_line_1 || parsed.street || '',
        address_line_2: parsed.address_line_2 || '',
        city: parsed.city || '',
        province: parsed.province || '',
        country: parsed.country || '',
        zip: parsed.zip || '',
      };
    }
  } catch {}
  return { ...EMPTY_ADDRESS_FIELDS, address_line_1: raw };
}

export function formatAddressDisplay(raw: string): string {
  const f = parseAddress(raw);
  return [f.address_line_1, f.address_line_2, f.city, f.province, f.country, f.zip].filter(Boolean).join(', ');
}

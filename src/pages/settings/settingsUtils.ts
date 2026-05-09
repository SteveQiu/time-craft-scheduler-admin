import { AddressFields, EMPTY_ADDRESS_FIELDS } from './types';

export function parseAddress(raw: string): AddressFields {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'street' in parsed) return parsed as AddressFields;
  } catch {}
  return { ...EMPTY_ADDRESS_FIELDS, street: raw };
}

export function formatAddressDisplay(raw: string): string {
  const f = parseAddress(raw);
  return [f.street, f.city, f.province, f.country, f.zip].filter(Boolean).join(', ');
}

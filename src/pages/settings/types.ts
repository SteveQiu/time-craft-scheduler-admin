export interface WorkplaceAddress {
  id: string;
  user_id: string;
  label: string;
  address: string; // stored as JSON: {street,city,province,country,zip}
  is_default: boolean;
  created_at: string;
}

export interface AddressFields {
  street: string;
  city: string;
  province: string;
  country: string;
  zip: string;
}

export const EMPTY_ADDRESS_FIELDS: AddressFields = { street: '', city: '', province: '', country: '', zip: '' };

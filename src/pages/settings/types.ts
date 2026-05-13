export interface WorkplaceAddress {
  id: string;
  user_id: string;
  label: string;
  address: string; // stored as JSON: {address_line_1,address_line_2,city,province,country,zip}
  is_default: boolean;
  created_at: string;
}

export interface AddressFields {
  address_line_1: string;
  address_line_2: string;
  city: string;
  province: string;
  country: string;
  zip: string;
}

export const EMPTY_ADDRESS_FIELDS: AddressFields = { address_line_1: '', address_line_2: '', city: '', province: '', country: '', zip: '' };

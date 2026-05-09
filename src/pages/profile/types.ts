export interface ProfileData {
  id: string;
  full_name: string | null;
  email: string | null;
  introduction: string | null;
  phone: string | null;
  address: string | null;
  slug: string | null;
  avatar_url: string | null;
  skills: string[];
  hourly_rate: number;
  address_public?: boolean;
  phone_public?: boolean;
  email_public?: boolean;
  hourly_rate_public?: boolean;
  skills_public?: boolean;
}

export interface AddressData {
  address_line_1: string;
  address_line_2: string;
  city: string;
  province_state: string;
  country: string;
  postal_code: string;
}

export interface AddressVisibility {
  address_line_1: boolean;
  address_line_2: boolean;
  city: boolean;
  province_state: boolean;
  country: boolean;
  postal_code: boolean;
}

export interface FormState {
  full_name: string;
  email: string;
  introduction: string;
  phone: string;
  slug: string;
  skills: string[];
  hourly_rate: number;
}

export interface PrivacySettings {
  address_public: boolean;
  phone_public: boolean;
  email_public: boolean;
  hourly_rate_public: boolean;
  skills_public: boolean;
}

export interface SaveProfileVariables {
  form: FormState;
  address: AddressData;
  privacySettings: PrivacySettings;
}

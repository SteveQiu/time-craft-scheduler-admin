export interface SocialLinks {
  twitter?: string;
  instagram?: string;
  linkedin?: string;
  facebook?: string;
  tiktok?: string;
  youtube?: string;
}

export interface ProfileData {
  id: string;
  full_name: string | null;
  email: string | null;
  introduction: string | null;
  phone: string | null;
  address?: string | null;
  public_address_id?: string | null;
  slug: string | null;
  avatar_url: string | null;
  skills: string[];
  hourly_rate: number;
  address_public?: boolean;
  phone_public?: boolean;
  email_public?: boolean;
  hourly_rate_public?: boolean;
  skills_public?: boolean;
  profile_url?: string | null;
  social_links?: SocialLinks | null;
}

export interface FormState {
  full_name: string;
  email: string;
  introduction: string;
  phone: string;
  slug: string;
  skills: string[];
  hourly_rate: number;
  profile_url: string;
  social_links: SocialLinks;
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
  public_address_id: string | null;
  privacySettings: PrivacySettings;
}

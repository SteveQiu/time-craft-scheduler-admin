export interface OpeningWithProfile {
  id: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  duration: number;
  service: string;
  worker: string;
  is_available: boolean;
  location: string | null;
  hourly_rate: number;
  total: number;
  accepted_payment_method_ids?: string[] | null;
  provider_name: string | null;
  provider_email: string | null;
  provider_slug: string | null;
  avatar_url?: string | null;
}

export interface ProviderAccount {
  user_id: string;
  provider_name: string;
  provider_slug: string | null;
  avatar_url?: string | null;
  opening_count: number;
  services: string[];
  workers: string[];
}

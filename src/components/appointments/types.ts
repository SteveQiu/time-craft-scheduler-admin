export interface Appointment {
  id: string;
  opening_id: string;
  user_id: string;
  provider_id: string;
  worker: string;
  service: string;
  location: string | null;
  date: string;
  start_time: string;
  end_time: string;
  duration: number;
  status: string;
  notes: string | null;
  created_at: string;
  hourly_rate?: number | null;
  approved_by?: string | null;
  booker_name?: string | null;
  booker_email?: string | null;
  booker_phone?: string | null;
  booker_slug?: string | null;
  provider_name?: string | null;
  provider_slug?: string | null;
  approved_by_name?: string | null;
}

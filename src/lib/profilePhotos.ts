import { supabase } from '@/integrations/supabase/client';

/** Builds the public URL for a `profile_photos` row's storage_path (bucket: profile-photos). */
export function getProfilePhotoPublicUrl(storagePath: string): string {
  const { data } = supabase.storage.from('profile-photos').getPublicUrl(storagePath);
  return data.publicUrl;
}

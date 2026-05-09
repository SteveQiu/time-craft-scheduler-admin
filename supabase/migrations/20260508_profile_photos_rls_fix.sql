-- Fix profile_photos RLS: FOR ALL...USING does not cover INSERT (needs WITH CHECK)
-- Fix storage bucket policies for profile-photos

-- Table: replace broken FOR ALL policy with explicit per-operation policies
DROP POLICY IF EXISTS "Users manage own photos" ON profile_photos;

CREATE POLICY "Users insert own photos" ON profile_photos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own photos" ON profile_photos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users delete own photos" ON profile_photos
  FOR DELETE USING (auth.uid() = user_id);

-- Storage: allow authenticated users to upload/delete their own folder
CREATE POLICY "Users upload own photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users delete own photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

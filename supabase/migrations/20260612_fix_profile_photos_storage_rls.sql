-- Fix: add UPDATE policy for storage.objects on profile-photos bucket.
-- Without this, uploads with upsert:true fail when file already exists.
-- Also ensure SELECT policy exists so public can read profile photos.

-- Drop and recreate all profile-photos storage policies atomically
DROP POLICY IF EXISTS "Users upload own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users update own photos" ON storage.objects;

-- Public read (bucket is public)
CREATE POLICY "Public read profile photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-photos');

-- INSERT: authenticated user may only write into their own folder
CREATE POLICY "Users upload own photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- UPDATE: authenticated user may only overwrite their own files
CREATE POLICY "Users update own photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- DELETE: authenticated user may only remove their own files
CREATE POLICY "Users delete own photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

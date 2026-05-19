-- Drop overly permissive read policies
DROP POLICY IF EXISTS "Authenticated read" ON storage.objects;
DROP POLICY IF EXISTS "auth_read_payment_proof" ON storage.objects;

-- Drop overly permissive upload policies (also flagged)
DROP POLICY IF EXISTS "Authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "auth_upload_payment_proof" ON storage.objects;

-- New SELECT policy: only the file owner OR the provider of the related appointment can read.
-- Files are stored at `${user_id}/${appointment_id}-...` so folder[1] = uploader's user id.
CREATE POLICY "Payment proofs readable by owner or provider"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (
    -- Owner (uploader) matches the folder prefix
    (auth.uid())::text = (storage.foldername(name))[1]
    OR
    -- Provider of the related appointment (via payment_proofs.photo_url storing the storage path)
    EXISTS (
      SELECT 1
      FROM public.payment_proofs pp
      JOIN public.appointments a ON a.id = pp.appointment_id
      WHERE pp.photo_url = storage.objects.name
        AND a.provider_id = auth.uid()
    )
  )
);

-- New INSERT policy: users can only upload into their own folder
CREATE POLICY "Payment proofs uploadable to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

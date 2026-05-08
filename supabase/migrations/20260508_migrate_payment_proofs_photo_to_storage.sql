-- Rename photo column (base64) to photo_url (storage URL)
ALTER TABLE public.payment_proofs
  RENAME COLUMN photo TO photo_url;

-- Update comment
COMMENT ON COLUMN public.payment_proofs.photo_url IS 'Supabase Storage URL to payment proof image (was base64 in photo column)';

-- Create storage bucket for payment proofs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs',
  'payment-proofs',
  false,
  2097152,  -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: authenticated users can upload to their own folder
CREATE POLICY "auth_upload_payment_proof" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-proofs');

-- RLS: authenticated users can read (providers need to view customer proofs)
CREATE POLICY "auth_read_payment_proof" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'payment-proofs');

-- RLS: users can delete their own uploads
CREATE POLICY "auth_delete_own_payment_proof" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Profile photos table
-- Free users: up to 3 photos. Premium users: up to 10.
-- Storage bucket: profile-photos (public)

CREATE TABLE IF NOT EXISTS profile_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profile_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own photos" ON profile_photos
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public read photos" ON profile_photos
  FOR SELECT USING (true);

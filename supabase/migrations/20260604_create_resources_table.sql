-- Create resources table (replaces org_workers for resource management)
CREATE TABLE public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  name text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own resources"
  ON public.resources FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own resources"
  ON public.resources FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own resources"
  ON public.resources FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own resources"
  ON public.resources FOR DELETE
  USING (auth.uid() = user_id);

-- Index
CREATE INDEX idx_resources_user_id ON public.resources(user_id);

-- Updated at trigger
CREATE TRIGGER update_resources_updated_at
  BEFORE UPDATE ON public.resources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Migrate existing org_workers data into resources
INSERT INTO public.resources (user_id, name, metadata, created_at, updated_at)
SELECT
  org_id,
  worker_name,
  jsonb_build_object(
    'migrated_from', 'org_workers',
    'original_id', id::text
  ),
  created_at,
  updated_at
FROM public.org_workers
WHERE status = 'accepted'
ON CONFLICT DO NOTHING;

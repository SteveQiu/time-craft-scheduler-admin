-- Create openings table with proper security
CREATE TABLE public.openings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration INTEGER NOT NULL CHECK (duration > 0),
  worker TEXT NOT NULL,
  service TEXT NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.openings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user data protection
CREATE POLICY "Users can view their own openings" 
ON public.openings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own openings" 
ON public.openings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own openings" 
ON public.openings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own openings" 
ON public.openings 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_openings_updated_at
BEFORE UPDATE ON public.openings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX idx_openings_user_id ON public.openings(user_id);
CREATE INDEX idx_openings_date ON public.openings(date);
CREATE INDEX idx_openings_user_date ON public.openings(user_id, date);
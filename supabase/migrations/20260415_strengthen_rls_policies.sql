-- Fix RLS policies for openings table
-- Remove overly permissive policy that allows anyone to browse any available openings
-- This was a security issue - users should only see their own openings

DROP POLICY IF EXISTS "Anyone can browse available openings" ON public.openings;

#!/usr/bin/env node
/**
 * Setup migration tracking table in Supabase
 * 
 * This must be run once before any migrations
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const supabaseUrl = "https://dbabjfydcllqbjpolhym.supabase.co";
const secretContent = fs.readFileSync(".secret", "utf-8");
const supabaseKey = secretContent.match(/SUPABASE_KEY=(.+)/)[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

const setupSQL = `
-- Create migrations_applied table for tracking
CREATE TABLE IF NOT EXISTS public.migrations_applied (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  migration_name TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending',
  applied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.migrations_applied ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role to see all records
CREATE POLICY "Enable read access for service role" 
ON public.migrations_applied 
FOR SELECT 
USING (TRUE);

-- Create policy to allow service role to insert
CREATE POLICY "Enable insert for service role" 
ON public.migrations_applied 
FOR INSERT 
WITH CHECK (TRUE);

-- Create policy to allow service role to update
CREATE POLICY "Enable update for service role" 
ON public.migrations_applied 
FOR UPDATE 
USING (TRUE);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_migrations_applied_name ON public.migrations_applied(migration_name);
`;

console.log("╔════════════════════════════════════════════════════════════════════╗");
console.log("║ SETUP: Migration Tracking Table                                   ║");
console.log("╚════════════════════════════════════════════════════════════════════╝\n");

console.log("Instructions to setup migration tracking in Supabase:\n");
console.log("1. Go to: https://supabase.com/dashboard");
console.log("2. Select your project");
console.log("3. Go to SQL Editor");
console.log("4. Click 'New Query'");
console.log("5. Copy and paste the SQL below:");
console.log("6. Click 'Run'\n");
console.log("╔════════════════════════════════════════════════════════════════════╗\n");
console.log(setupSQL);
console.log("\n╔════════════════════════════════════════════════════════════════════╗\n");
console.log("After executing the SQL above, run:");
console.log("  node scripts/migration-manager.mjs\n");

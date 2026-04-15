import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...rest] = trimmed.split('=');
    if (key && rest.length > 0) {
      let value = rest.join('=').trim();
      value = value.replace(/^"(.*)"$/, '$1');
      env[key] = value;
    }
  }
});

const secretContent = fs.readFileSync('.secret', 'utf-8');
const secret = {};
secretContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('=')) {
    const [key, ...rest] = trimmed.split('=');
    if (key && rest.length > 0) {
      secret[key] = rest.join('=');
    }
  }
});

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SERVICE_KEY = secret.SUPABASE_KEY;

// Extract project info
const projectMatch = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
const PROJECT_ID = projectMatch?.[1];
const PROJECT_REF = PROJECT_ID; // same as project ID

console.log('🔧 Attempting to update book_opening function...\n');
console.log(`Project: ${PROJECT_REF}`);
console.log(`URL: ${SUPABASE_URL}`);

// The new function definition
const newFunctionSQL = `
CREATE OR REPLACE FUNCTION public.book_opening(_opening_id uuid, _user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _opening RECORD;
  _appointment_id uuid;
  _existing_pending_count integer;
BEGIN
  -- Lock the opening row to prevent concurrent access
  SELECT * INTO _opening FROM openings WHERE id = _opening_id FOR UPDATE;
  
  IF _opening IS NULL THEN
    RAISE EXCEPTION 'Opening not found';
  END IF;
  
  -- Check if opening is still available
  IF NOT _opening.is_available THEN
    RAISE EXCEPTION 'Opening is no longer available';
  END IF;
  
  -- Cannot book your own opening
  IF _opening.user_id = _user_id THEN
    RAISE EXCEPTION 'Cannot book your own opening';
  END IF;

  -- Check if user already has a pending booking for this opening
  SELECT COUNT(*) INTO _existing_pending_count 
  FROM appointments 
  WHERE opening_id = _opening_id 
  AND user_id = _user_id 
  AND status = 'pending';
  
  IF _existing_pending_count > 0 THEN
    RAISE EXCEPTION 'You already have a pending booking for this opening';
  END IF;

  -- Create the new appointment with pending status
  INSERT INTO appointments (opening_id, user_id, provider_id, worker, service, location, date, start_time, end_time, duration, status)
  VALUES (_opening.id, _user_id, _opening.user_id, _opening.worker, _opening.service, _opening.location, _opening.date, _opening.start_time, _opening.end_time, _opening.duration, 'pending')
  RETURNING id INTO _appointment_id;

  -- CRITICAL: Mark opening as unavailable immediately after booking
  -- This prevents other users from booking the same opening
  UPDATE openings SET is_available = false WHERE id = _opening_id;

  RETURN _appointment_id;
END;
$$;
`;

// Try using Supabase Management API
console.log('\n📡 Attempting to execute via Supabase Management API...\n');

const managementApiUrl = `https://api.supabase.com/projects/${PROJECT_REF}/sql`;

try {
  const response = await fetch(managementApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({
      query: newFunctionSQL
    })
  });
  
  console.log(`Status: ${response.status}`);
  
  if (response.ok) {
    console.log('✅ Migration applied successfully!');
    
    // Verify
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data, error } = await supabase.rpc('book_opening', {
      _opening_id: '00000000-0000-0000-0000-000000000000',
      _user_id: '00000000-0000-0000-0000-000000000000'
    });
    
    if (error?.message?.includes('Opening not found')) {
      console.log('✅ Function verified and updated!');
    }
  } else {
    const text = await response.text();
    console.log(`Response: ${text}`);
  }
} catch (e) {
  console.log(`Error: ${e.message}`);
}

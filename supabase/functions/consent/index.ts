import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Create Supabase client with auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body = await req.json()
    const {
      privacy_policy_accepted,
      terms_accepted,
      marketing_email = false,
      analytics = true,
    } = body

    // Validate required fields
    if (privacy_policy_accepted === undefined || terms_accepted === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: privacy_policy_accepted, terms_accepted' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get client IP and user agent
    const ip_address = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const user_agent = req.headers.get('user-agent') || 'unknown'

    // Insert consent record
    const { data: consentRecord, error: insertError } = await supabaseClient
      .from('consent_records')
      .insert({
        user_id: user.id,
        privacy_policy_accepted,
        terms_accepted,
        marketing_email,
        analytics,
        ip_address,
        user_agent,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting consent record:', insertError)
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log to audit trail
    await supabaseClient.rpc('log_audit_event', {
      _action: 'consent_recorded',
      _resource: 'consent_record',
      _resource_id: consentRecord.id,
      _metadata: { privacy_policy_accepted, terms_accepted, marketing_email, analytics },
      _ip_address: ip_address,
      _user_agent: user_agent,
    })

    return new Response(
      JSON.stringify({
        success: true,
        consent_id: consentRecord.id,
        recorded_at: consentRecord.created_at,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

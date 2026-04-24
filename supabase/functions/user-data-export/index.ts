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
    // Auth check
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

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request
    const body = await req.json()
    const { format = 'json', scope = 'all' } = body

    // Validate
    if (!['json', 'csv'].includes(format)) {
      return new Response(
        JSON.stringify({ error: 'Invalid format. Must be json or csv' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!['all', 'appointments', 'profile'].includes(scope)) {
      return new Response(
        JSON.stringify({ error: 'Invalid scope. Must be all, appointments, or profile' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create export job via RPC
    const { data: exportId, error: rpcError } = await supabaseClient.rpc('create_data_export', {
      _format: format,
      _scope: scope,
    })

    if (rpcError) {
      console.error('Error creating export:', rpcError)
      
      // Check for rate limit error
      if (rpcError.message.includes('Rate limit exceeded')) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded: Maximum 5 data exports per 24 hours' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      return new Response(
        JSON.stringify({ error: rpcError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get export record for estimated time
    const { data: exportRecord } = await supabaseClient
      .from('data_exports')
      .select('*')
      .eq('id', exportId)
      .single()

    return new Response(
      JSON.stringify({
        success: true,
        export_id: exportId,
        status: 'pending',
        estimated_ready_at: exportRecord?.estimated_ready_at || new Date(Date.now() + 5 * 60 * 1000).toISOString(),
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

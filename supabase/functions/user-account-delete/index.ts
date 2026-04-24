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
    const url = new URL(req.url)
    const action = url.pathname.includes('cancel') ? 'cancel' : 'request'

    if (action === 'cancel') {
      // Cancel deletion request
      const body = await req.json()
      const { deletion_id } = body

      if (!deletion_id) {
        return new Response(
          JSON.stringify({ error: 'Missing deletion_id' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Call cancel function
      const { data: success, error: cancelError } = await supabaseClient.rpc('cancel_account_deletion', {
        _deletion_id: deletion_id,
      })

      if (cancelError) {
        console.error('Error cancelling deletion:', cancelError)
        
        if (cancelError.message.includes('Grace period expired')) {
          return new Response(
            JSON.stringify({ error: 'Grace period expired, cannot cancel deletion' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ error: cancelError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: 'cancelled',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      // Request deletion
      const body = await req.json()
      const { reason, grace_period_days = 30 } = body

      // Validate grace period
      if (![0, 7, 14, 30].includes(grace_period_days)) {
        return new Response(
          JSON.stringify({ error: 'Invalid grace_period_days. Must be 0, 7, 14, or 30' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Create deletion request via RPC
      const { data: deletionId, error: rpcError } = await supabaseClient.rpc('request_account_deletion', {
        _reason: reason || null,
        _grace_period_days: grace_period_days,
      })

      if (rpcError) {
        console.error('Error requesting deletion:', rpcError)

        if (rpcError.message.includes('Deletion request already pending')) {
          return new Response(
            JSON.stringify({ error: 'Deletion request already pending' }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ error: rpcError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get deletion record for details
      const { data: deletionRecord } = await supabaseClient
        .from('deletion_requests')
        .select('*')
        .eq('id', deletionId)
        .single()

      // Send confirmation email (optional)
      // TODO: Trigger email notification via reminder-smtp function

      return new Response(
        JSON.stringify({
          success: true,
          deletion_id: deletionId,
          status: 'pending',
          scheduled_for: deletionRecord?.scheduled_for,
          can_cancel_until: deletionRecord?.can_cancel_until,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

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

    // Handle GET - fetch preferences
    if (req.method === 'GET') {
      const { data: preferences, error: fetchError } = await supabaseClient
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (fetchError) {
        // If not found, create default preferences
        if (fetchError.code === 'PGRST116') {
          const { data: newPrefs, error: insertError } = await supabaseClient
            .from('user_preferences')
            .insert({ user_id: user.id })
            .select()
            .single()

          if (insertError) {
            return new Response(
              JSON.stringify({ error: insertError.message }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          return new Response(
            JSON.stringify(newPrefs),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ error: fetchError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify(preferences),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle PUT - update preferences
    if (req.method === 'PUT') {
      const body = await req.json()
      const {
        email_frequency,
        analytics_enabled,
        marketing_enabled,
        data_retention_years,
      } = body

      // Validate
      if (email_frequency && !['daily', 'weekly', 'never'].includes(email_frequency)) {
        return new Response(
          JSON.stringify({ error: 'Invalid email_frequency. Must be daily, weekly, or never' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (data_retention_years && ![1, 7].includes(data_retention_years)) {
        return new Response(
          JSON.stringify({ error: 'Invalid data_retention_years. Must be 1 or 7' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update preferences
      const updateData: any = {}
      if (email_frequency !== undefined) updateData.email_frequency = email_frequency
      if (analytics_enabled !== undefined) updateData.analytics_enabled = analytics_enabled
      if (marketing_enabled !== undefined) updateData.marketing_enabled = marketing_enabled
      if (data_retention_years !== undefined) updateData.data_retention_years = data_retention_years

      const { data: updatedPrefs, error: updateError } = await supabaseClient
        .from('user_preferences')
        .update(updateData)
        .eq('user_id', user.id)
        .select()
        .single()

      if (updateError) {
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Log to audit trail
      await supabaseClient.rpc('log_audit_event', {
        _action: 'preferences_updated',
        _resource: 'user_preferences',
        _resource_id: user.id,
        _metadata: updateData,
      })

      return new Response(
        JSON.stringify(updatedPrefs),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
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

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

  if (req.method !== 'GET') {
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

    // Get export_id from query params
    const url = new URL(req.url)
    const exportId = url.searchParams.get('export_id')

    if (!exportId) {
      return new Response(
        JSON.stringify({ error: 'Missing export_id query parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get export record and verify ownership
    const { data: exportRecord, error: fetchError } = await supabaseClient
      .from('data_exports')
      .select('*')
      .eq('id', exportId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !exportRecord) {
      return new Response(
        JSON.stringify({ error: 'Export not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check status
    if (exportRecord.status === 'pending' || exportRecord.status === 'processing') {
      return new Response(
        JSON.stringify({ 
          error: 'Export not ready yet', 
          status: exportRecord.status,
          estimated_ready_at: exportRecord.estimated_ready_at 
        }),
        { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (exportRecord.status === 'failed') {
      return new Response(
        JSON.stringify({ error: 'Export failed', message: exportRecord.error_message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (exportRecord.status === 'expired') {
      return new Response(
        JSON.stringify({ error: 'Export has expired. Please request a new export.' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // For now, generate export on-the-fly (in production, this should be pre-generated)
    // Get user data via RPC
    const { data: userData, error: dataError } = await supabaseClient.rpc('get_user_personal_data')

    if (dataError) {
      console.error('Error fetching user data:', dataError)
      return new Response(
        JSON.stringify({ error: dataError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log download
    await supabaseClient.rpc('log_audit_event', {
      _action: 'data_export_downloaded',
      _resource: 'data_export',
      _resource_id: exportId,
    })

    // Determine content type and format
    const contentType = exportRecord.format === 'json' 
      ? 'application/json' 
      : 'text/csv'
    
    const filename = `user_data_export_${exportId}.${exportRecord.format}`

    // Return data
    if (exportRecord.format === 'json') {
      return new Response(JSON.stringify(userData, null, 2), {
        headers: {
          ...corsHeaders,
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    } else {
      // Convert to CSV (simplified - in production, use proper CSV library)
      const csvData = convertToCSV(userData)
      return new Response(csvData, {
        headers: {
          ...corsHeaders,
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
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

// Simple CSV converter (for production, use proper library)
function convertToCSV(data: any): string {
  const lines: string[] = []
  
  // Personal info
  lines.push('Section,Field,Value')
  if (data.personal_info) {
    Object.entries(data.personal_info).forEach(([key, value]) => {
      lines.push(`Personal Info,${key},"${String(value).replace(/"/g, '""')}"`)
    })
  }
  
  // Appointments
  if (data.appointments && Array.isArray(data.appointments)) {
    data.appointments.forEach((apt: any, idx: number) => {
      Object.entries(apt).forEach(([key, value]) => {
        lines.push(`Appointment ${idx + 1},${key},"${String(value).replace(/"/g, '""')}"`)
      })
    })
  }
  
  return lines.join('\n')
}

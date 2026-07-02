import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0'

// ─── MCP protocol constants ───────────────────────────────────────────────────

const PROTOCOL_VERSION = '2024-11-05'
const SERVER_INFO = { name: 'pikappoint-scheduler', version: '1.0.0' }

// ─── CORS ─────────────────────────────────────────────────────────────────────

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, mcp-session-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ─── JSON-RPC helpers ─────────────────────────────────────────────────────────

function rpcResult(id: unknown, result: unknown) {
  return { jsonrpc: '2.0', id, result }
}

function rpcError(id: unknown, code: number, message: string) {
  return { jsonrpc: '2.0', id, error: { code, message } }
}

function jsonResp(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// ─── tool definitions ─────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'list_openings',
    description: 'Search available appointment openings. Returns slots that can be booked.',
    inputSchema: {
      type: 'object',
      properties: {
        date_from: { type: 'string', description: 'Start date (YYYY-MM-DD). Defaults to today.' },
        date_to: { type: 'string', description: 'End date (YYYY-MM-DD).' },
        service: { type: 'string', description: 'Filter by service name (partial match).' },
        worker: { type: 'string', description: 'Filter by worker name (partial match).' },
        province: { type: 'string', description: 'Filter by province/state (partial match).' },
        country: { type: 'string', description: 'Filter by country (partial match).' },
        limit: { type: 'number', description: 'Max results to return (default 20, max 50).' },
      },
    },
  },
  {
    name: 'book_opening',
    description: 'Book an available opening for the authenticated user. Returns the new appointment.',
    inputSchema: {
      type: 'object',
      required: ['opening_id'],
      properties: {
        opening_id: { type: 'string', description: 'The UUID of the opening to book.' },
        notes: { type: 'string', description: 'Optional notes to attach to the appointment.' },
      },
    },
  },
  {
    name: 'list_appointments',
    description: 'List appointments for the authenticated user, either as a booker or provider.',
    inputSchema: {
      type: 'object',
      properties: {
        role: { type: 'string', enum: ['booker', 'provider', 'all'], description: 'Filter by role. Default: all.' },
        status: { type: 'string', enum: ['pending', 'confirmed', 'cancelled', 'completed'], description: 'Filter by status.' },
        date_from: { type: 'string', description: 'Start date filter (YYYY-MM-DD).' },
        date_to: { type: 'string', description: 'End date filter (YYYY-MM-DD).' },
        limit: { type: 'number', description: 'Max results (default 20, max 50).' },
      },
    },
  },
  {
    name: 'get_appointment',
    description: 'Get full details of a specific appointment by ID.',
    inputSchema: {
      type: 'object',
      required: ['appointment_id'],
      properties: {
        appointment_id: { type: 'string', description: 'The UUID of the appointment.' },
      },
    },
  },
  {
    name: 'cancel_appointment',
    description: 'Cancel an appointment. Both the booker and provider may cancel.',
    inputSchema: {
      type: 'object',
      required: ['appointment_id'],
      properties: {
        appointment_id: { type: 'string', description: 'The UUID of the appointment to cancel.' },
      },
    },
  },
  {
    name: 'confirm_appointment',
    description: 'Confirm a pending appointment. Only the provider can confirm.',
    inputSchema: {
      type: 'object',
      required: ['appointment_id'],
      properties: {
        appointment_id: { type: 'string', description: 'The UUID of the appointment to confirm.' },
      },
    },
  },
]

// ─── format helpers ───────────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
}

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

function textContent(text: string) {
  return { content: [{ type: 'text', text }] }
}

function errorContent(message: string) {
  return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true }
}

// ─── tool handlers ────────────────────────────────────────────────────────────

async function toolListOpenings(args: Record<string, unknown>, supabase: SupabaseClient) {
  const today = new Date().toISOString().split('T')[0]
  const limit = Math.min(Number(args.limit ?? 20), 50)

  let query = supabase
    .from('openings')
    .select('*')
    .eq('is_available', true)
    .gte('date', (args.date_from as string) ?? today)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(limit)

  if (args.date_to) query = query.lte('date', args.date_to as string)
  if (args.service) query = query.ilike('service', `%${args.service}%`)
  if (args.worker) query = query.ilike('worker', `%${args.worker}%`)
  if (args.province) query = query.ilike('location', `%${args.province}%`)
  if (args.country) query = query.ilike('location', `%${args.country}%`)

  const { data, error } = await query
  if (error) return errorContent(error.message)
  if (!data?.length) return textContent('No available openings found matching your criteria.')

  const lines = data.map((o, i) => {
    let loc = ''
    try { const l = JSON.parse(o.location); loc = [l.city, l.province, l.country].filter(Boolean).join(', ') } catch { loc = o.location ?? '' }
    return [
      `${i + 1}. **${o.service}** with ${o.worker}`,
      `   Date: ${formatDate(o.date)} | Time: ${formatTime(o.start_time)} – ${formatTime(o.end_time)}`,
      `   Duration: ${o.duration}h | Price: $${o.total ?? o.hourly_rate ?? 0}`,
      loc ? `   Location: ${loc}` : null,
      `   Opening ID: ${o.id}`,
    ].filter(Boolean).join('\n')
  }).join('\n\n')

  return textContent(`Found ${data.length} available opening${data.length !== 1 ? 's' : ''}:\n\n${lines}`)
}

async function toolBookOpening(args: Record<string, unknown>, supabase: SupabaseClient, userId: string) {
  if (!args.opening_id) return errorContent('opening_id is required')

  const { data, error } = await supabase.rpc('book_opening', {
    _opening_id: args.opening_id,
    _user_id: userId,
  })

  if (error) {
    if (error.message.includes('not available')) return errorContent('This opening is no longer available.')
    if (error.message.includes('self-booking')) return errorContent('You cannot book your own opening.')
    if (error.message.includes('duplicate') || error.message.includes('already')) return errorContent('You already have a pending booking for this opening.')
    return errorContent(error.message)
  }

  if (args.notes && data) {
    await supabase.from('appointments').update({ notes: args.notes }).eq('opening_id', args.opening_id).eq('user_id', userId).eq('status', 'pending')
  }

  const appt = data as Record<string, unknown> | null
  if (!appt) return textContent('Booking created successfully.')

  return textContent(
    `✅ Booking confirmed!\n\n` +
    `Service: ${appt.service}\n` +
    `Worker: ${appt.worker}\n` +
    `Date: ${formatDate(appt.date as string)} at ${formatTime(appt.start_time as string)}\n` +
    `Status: ${appt.status}\n` +
    `Appointment ID: ${appt.id}`
  )
}

async function toolListAppointments(args: Record<string, unknown>, supabase: SupabaseClient, userId: string) {
  const limit = Math.min(Number(args.limit ?? 20), 50)
  const role = (args.role as string) ?? 'all'

  let query = supabase
    .from('appointments')
    .select('*')
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(limit)

  if (role === 'booker') query = query.eq('user_id', userId)
  else if (role === 'provider') query = query.eq('provider_id', userId)
  else query = query.or(`user_id.eq.${userId},provider_id.eq.${userId}`)

  if (args.status) query = query.eq('status', args.status as string)
  if (args.date_from) query = query.gte('date', args.date_from as string)
  if (args.date_to) query = query.lte('date', args.date_to as string)

  const { data, error } = await query
  if (error) return errorContent(error.message)
  if (!data?.length) return textContent('No appointments found.')

  const statusEmoji: Record<string, string> = { pending: '🕐', confirmed: '✅', cancelled: '❌', completed: '🏁' }
  const lines = data.map((a, i) => {
    const myRole = a.user_id === userId ? 'booker' : 'provider'
    return [
      `${i + 1}. ${statusEmoji[a.status] ?? '•'} **${a.service}** — ${a.status.toUpperCase()} (you are ${myRole})`,
      `   Date: ${formatDate(a.date)} at ${formatTime(a.start_time)}`,
      `   Worker: ${a.worker} | Total: $${a.total ?? 0}`,
      `   Appointment ID: ${a.id}`,
    ].join('\n')
  }).join('\n\n')

  return textContent(`Found ${data.length} appointment${data.length !== 1 ? 's' : ''}:\n\n${lines}`)
}

async function toolGetAppointment(args: Record<string, unknown>, supabase: SupabaseClient, userId: string) {
  if (!args.appointment_id) return errorContent('appointment_id is required')

  const { data, error } = await supabase.from('appointments').select('*').eq('id', args.appointment_id).single()
  if (error || !data) return errorContent('Appointment not found.')
  if (data.user_id !== userId && data.provider_id !== userId) return errorContent('You do not have access to this appointment.')

  const myRole = data.user_id === userId ? 'booker' : 'provider'
  let loc = ''
  try { const l = JSON.parse(data.location); loc = [l.city, l.province, l.country].filter(Boolean).join(', ') } catch { loc = data.location ?? '' }

  return textContent([
    `**Appointment Details**`,
    `ID: ${data.id}`,
    `Your role: ${myRole}`,
    `Service: ${data.service}`,
    `Worker: ${data.worker}`,
    `Date: ${formatDate(data.date)} | Time: ${formatTime(data.start_time)} – ${formatTime(data.end_time)}`,
    `Duration: ${data.duration}h | Total: $${data.total ?? 0}`,
    loc ? `Location: ${loc}` : null,
    `Status: ${data.status}`,
    data.notes ? `Notes: ${data.notes}` : null,
    data.approved_by ? `Confirmed by provider: yes` : null,
  ].filter(Boolean).join('\n'))
}

async function toolCancelAppointment(args: Record<string, unknown>, supabase: SupabaseClient, userId: string) {
  if (!args.appointment_id) return errorContent('appointment_id is required')

  const { data: appt } = await supabase.from('appointments').select('user_id, provider_id, status').eq('id', args.appointment_id).single()
  if (!appt) return errorContent('Appointment not found.')
  if (appt.user_id !== userId && appt.provider_id !== userId) return errorContent('You do not have access to this appointment.')
  if (appt.status === 'cancelled') return errorContent('Appointment is already cancelled.')
  if (appt.status === 'completed') return errorContent('Cannot cancel a completed appointment.')

  const { error } = await supabase.rpc('cancel_appointment', { _appointment_id: args.appointment_id, _caller_id: userId })
  if (error) return errorContent(error.message)

  return textContent(`✅ Appointment ${args.appointment_id} has been cancelled.`)
}

async function toolConfirmAppointment(args: Record<string, unknown>, supabase: SupabaseClient, userId: string) {
  if (!args.appointment_id) return errorContent('appointment_id is required')

  const { data: appt } = await supabase.from('appointments').select('provider_id, status').eq('id', args.appointment_id).single()
  if (!appt) return errorContent('Appointment not found.')
  if (appt.provider_id !== userId) return errorContent('Only the provider can confirm an appointment.')
  if (appt.status !== 'pending') return errorContent(`Cannot confirm — appointment is already ${appt.status}.`)

  const { error } = await supabase.from('appointments').update({ status: 'confirmed', approved_by: userId }).eq('id', args.appointment_id)
  if (error) return errorContent(error.message)

  return textContent(`✅ Appointment ${args.appointment_id} confirmed.`)
}

// ─── tool dispatcher ──────────────────────────────────────────────────────────

async function callTool(name: string, args: Record<string, unknown>, supabase: SupabaseClient, userId: string) {
  switch (name) {
    case 'list_openings':       return toolListOpenings(args, supabase)
    case 'book_opening':        return toolBookOpening(args, supabase, userId)
    case 'list_appointments':   return toolListAppointments(args, supabase, userId)
    case 'get_appointment':     return toolGetAppointment(args, supabase, userId)
    case 'cancel_appointment':  return toolCancelAppointment(args, supabase, userId)
    case 'confirm_appointment': return toolConfirmAppointment(args, supabase, userId)
    default: return errorContent(`Unknown tool: ${name}`)
  }
}

// ─── main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Use POST with JSON-RPC 2.0 messages' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return jsonResp(rpcError(null, -32700, 'Parse error: invalid JSON'), 400)
  }

  const { id = null, method, params = {} } = body as { id?: unknown; method?: string; params?: Record<string, unknown> }

  if (!method) return jsonResp(rpcError(id, -32600, 'Invalid Request: missing method'), 400)

  // Notifications (no id) — acknowledge and exit
  if (method === 'notifications/initialized' || method.startsWith('notifications/')) {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  // initialize — no auth required (client hasn't set up yet)
  if (method === 'initialize') {
    return jsonResp(rpcResult(id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: {} },
      serverInfo: SERVER_INFO,
    }))
  }

  if (method === 'ping') return jsonResp(rpcResult(id, {}))

  // All other methods require auth
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResp(rpcError(id, -32001, 'Unauthorized: missing Bearer token'), 401)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return jsonResp(rpcError(id, -32001, 'Unauthorized: invalid token'), 401)
  }

  try {
    switch (method) {
      case 'tools/list':
        return jsonResp(rpcResult(id, { tools: TOOLS }))

      case 'tools/call': {
        const toolName = (params as Record<string, unknown>).name as string
        const toolArgs = ((params as Record<string, unknown>).arguments ?? {}) as Record<string, unknown>
        if (!toolName) return jsonResp(rpcError(id, -32602, 'Invalid params: missing tool name'))
        const result = await callTool(toolName, toolArgs, supabase, user.id)
        return jsonResp(rpcResult(id, result))
      }

      default:
        return jsonResp(rpcError(id, -32601, `Method not found: ${method}`))
    }
  } catch (e) {
    console.error('[scheduler-mcp]', e)
    return jsonResp(rpcError(id, -32603, e instanceof Error ? e.message : 'Internal error'))
  }
})

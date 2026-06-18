import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── rate limit config ───────────────────────────────────────────────────────

const RATE_LIMITS = {
  free:    100,   // requests per day for free users
  premium: 2000,  // requests per day for premium users
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function rateLimitHeaders(limit: number, remaining: number) {
  const tomorrow = new Date()
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  tomorrow.setUTCHours(0, 0, 0, 0)
  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(Math.max(0, remaining)),
    'X-RateLimit-Reset': tomorrow.toISOString(),
  }
}

function json(data: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extra },
  })
}

function err(message: string, status: number, extra: Record<string, string> = {}) {
  return json({ error: message }, status, extra)
}

// ─── route handlers ──────────────────────────────────────────────────────────

/**
 * GET /openings
 * Query params:
 *   date_from   (YYYY-MM-DD, default: today)
 *   date_to     (YYYY-MM-DD)
 *   service     (partial match)
 *   worker      (partial match)
 *   province    (partial match on location JSON)
 *   country     (partial match on location JSON)
 *   limit       (default 50, max 200)
 *   offset      (default 0)
 */
async function handleListOpenings(supabase: SupabaseClient, params: URLSearchParams) {
  const today = new Date().toISOString().split('T')[0]
  const dateFrom = params.get('date_from') ?? today
  const dateTo = params.get('date_to')
  const service = params.get('service')
  const worker = params.get('worker')
  const province = params.get('province')
  const country = params.get('country')
  const limit = Math.min(parseInt(params.get('limit') ?? '50', 10), 200)
  const offset = parseInt(params.get('offset') ?? '0', 10)

  let query = supabase
    .from('openings')
    .select('*')
    .eq('is_available', true)
    .gte('date', dateFrom)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })
    .range(offset, offset + limit - 1)

  if (dateTo) query = query.lte('date', dateTo)
  if (service) query = query.ilike('service', `%${service}%`)
  if (worker) query = query.ilike('worker', `%${worker}%`)
  if (province) query = query.ilike('location', `%${province}%`)
  if (country) query = query.ilike('location', `%${country}%`)

  const { data, error, count } = await query
  if (error) return err(error.message, 500)

  return json({ data, count, limit, offset })
}

/**
 * POST /openings/:id/book
 * Body (optional): { notes?: string }
 */
async function handleBookOpening(supabase: SupabaseClient, userId: string, openingId: string, req: Request) {
  let notes: string | null = null
  try {
    const body = await req.json().catch(() => ({}))
    notes = typeof body.notes === 'string' ? body.notes.trim() || null : null
  } catch { /* no body is fine */ }

  const { data, error } = await supabase.rpc('book_opening', {
    _opening_id: openingId,
    _user_id: userId,
  })

  if (error) {
    if (error.message.includes('not available')) return err('This opening is no longer available.', 409)
    if (error.message.includes('self-booking')) return err('You cannot book your own opening.', 422)
    if (error.message.includes('duplicate') || error.message.includes('already')) return err('You already have a pending booking for this opening.', 409)
    return err(error.message, 500)
  }

  if (notes && data) {
    await supabase
      .from('appointments')
      .update({ notes })
      .eq('opening_id', openingId)
      .eq('user_id', userId)
      .eq('status', 'pending')
  }

  return json({ message: 'Booking created', appointment: data }, 201)
}

/**
 * GET /appointments
 * Query params: role, status, date_from, date_to, limit, offset
 */
async function handleListAppointments(supabase: SupabaseClient, userId: string, params: URLSearchParams) {
  const role = params.get('role') ?? 'all'
  const status = params.get('status')
  const dateFrom = params.get('date_from')
  const dateTo = params.get('date_to')
  const limit = Math.min(parseInt(params.get('limit') ?? '50', 10), 200)
  const offset = parseInt(params.get('offset') ?? '0', 10)

  let query = supabase
    .from('appointments')
    .select('*')
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })
    .range(offset, offset + limit - 1)

  if (role === 'booker') {
    query = query.eq('user_id', userId)
  } else if (role === 'provider') {
    query = query.eq('provider_id', userId)
  } else {
    query = query.or(`user_id.eq.${userId},provider_id.eq.${userId}`)
  }

  if (status) query = query.eq('status', status)
  if (dateFrom) query = query.gte('date', dateFrom)
  if (dateTo) query = query.lte('date', dateTo)

  const { data, error } = await query
  if (error) return err(error.message, 500)

  return json({ data, limit, offset })
}

/**
 * GET /appointments/:id
 */
async function handleGetAppointment(supabase: SupabaseClient, userId: string, appointmentId: string) {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', appointmentId)
    .single()

  if (error || !data) return err('Appointment not found', 404)
  if (data.user_id !== userId && data.provider_id !== userId) return err('Forbidden', 403)

  return json(data)
}

/**
 * PATCH /appointments/:id
 * Body: { status?: string, notes?: string }
 */
async function handleUpdateAppointment(supabase: SupabaseClient, userId: string, appointmentId: string, req: Request) {
  const body = await req.json().catch(() => ({}))
  const { status, notes } = body as { status?: string; notes?: string }

  if (!status && notes === undefined) return err('Nothing to update', 400)

  const { data: appt, error: fetchErr } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', appointmentId)
    .single()

  if (fetchErr || !appt) return err('Appointment not found', 404)

  const isBooker = appt.user_id === userId
  const isProvider = appt.provider_id === userId
  if (!isBooker && !isProvider) return err('Forbidden', 403)

  if (status) {
    const validStatuses = ['confirmed', 'cancelled', 'completed']
    if (!validStatuses.includes(status)) return err(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400)
    if (status === 'confirmed' && !isProvider) return err('Only the provider can confirm an appointment', 403)
    if (status === 'completed' && !isProvider) return err('Only the provider can mark an appointment as completed', 403)
    if (appt.status === 'cancelled') return err('Cannot update a cancelled appointment', 422)
    if (appt.status === 'completed') return err('Cannot update a completed appointment', 422)

    if (status === 'cancelled') {
      const { error: cancelErr } = await supabase.rpc('cancel_appointment', {
        _appointment_id: appointmentId,
        _caller_id: userId,
      })
      if (cancelErr) return err(cancelErr.message, 500)
      return json({ message: 'Appointment cancelled' })
    }

    const updates: Record<string, unknown> = { status }
    if (status === 'confirmed') updates.approved_by = userId
    const { data: updated, error: updateErr } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', appointmentId)
      .select()
      .single()
    if (updateErr) return err(updateErr.message, 500)
    return json(updated)
  }

  if (notes !== undefined) {
    if (!isBooker) return err('Only the booker can update notes', 403)
    const { data: updated, error: updateErr } = await supabase
      .from('appointments')
      .update({ notes: notes.trim() || null })
      .eq('id', appointmentId)
      .select()
      .single()
    if (updateErr) return err(updateErr.message, 500)
    return json(updated)
  }

  return err('Nothing to update', 400)
}

/**
 * DELETE /appointments/:id
 */
async function handleCancelAppointment(supabase: SupabaseClient, userId: string, appointmentId: string) {
  const { data: appt, error: fetchErr } = await supabase
    .from('appointments')
    .select('user_id, provider_id, status')
    .eq('id', appointmentId)
    .single()

  if (fetchErr || !appt) return err('Appointment not found', 404)
  if (appt.user_id !== userId && appt.provider_id !== userId) return err('Forbidden', 403)
  if (appt.status === 'cancelled') return err('Appointment is already cancelled', 422)
  if (appt.status === 'completed') return err('Cannot cancel a completed appointment', 422)

  const { error: cancelErr } = await supabase.rpc('cancel_appointment', {
    _appointment_id: appointmentId,
    _caller_id: userId,
  })
  if (cancelErr) return err(cancelErr.message, 500)

  return json({ message: 'Appointment cancelled' })
}

// ─── main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return err('Missing or invalid authorization header', 401)

  // User client — scoped to caller's JWT
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  // Admin client — service role, used only for rate limit operations
  const adminSupabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return err('Unauthorized', 401)

  // Premium check
  const { data: isPremium } = await supabase.rpc('is_user_premium', { p_user_id: user.id })
  const tier = isPremium ? 'premium' : 'free'
  const dailyLimit = RATE_LIMITS[tier]

  // Rate limit — atomic increment, returns new count for today
  const { data: requestCount, error: rlErr } = await adminSupabase
    .rpc('increment_api_rate_limit', { p_user_id: user.id })

  if (rlErr) {
    console.error('[scheduler-api] rate limit error:', rlErr)
    // Fail open — don't block on rate limit infrastructure issues
  }

  const count = (requestCount as number) ?? 0
  const remaining = dailyLimit - count
  const rlHeaders = rateLimitHeaders(dailyLimit, remaining)

  if (count > dailyLimit) {
    const upgradeMsg = tier === 'free'
      ? `Daily limit of ${dailyLimit} requests reached. Upgrade to premium for ${RATE_LIMITS.premium} requests/day at pikappoint.com/settings.`
      : `Daily limit of ${dailyLimit} requests reached. Resets at midnight UTC.`
    return err(upgradeMsg, 429, rlHeaders)
  }

  // Route
  const url = new URL(req.url)
  const stripped = url.pathname.replace(/^.*\/scheduler-api\/?/, '')
  const segments = stripped.split('/').filter(Boolean)
  const method = req.method

  try {
    let response: Response

    if (segments[0] === 'openings') {
      if (method === 'GET' && segments.length === 1) {
        response = await handleListOpenings(supabase, url.searchParams)
      } else if (method === 'POST' && segments.length === 3 && segments[2] === 'book') {
        response = await handleBookOpening(supabase, user.id, segments[1], req)
      } else {
        response = err('Not found', 404)
      }
    } else if (segments[0] === 'appointments') {
      if (method === 'GET' && segments.length === 1) {
        response = await handleListAppointments(supabase, user.id, url.searchParams)
      } else if (method === 'GET' && segments.length === 2) {
        response = await handleGetAppointment(supabase, user.id, segments[1])
      } else if (method === 'PATCH' && segments.length === 2) {
        response = await handleUpdateAppointment(supabase, user.id, segments[1], req)
      } else if (method === 'DELETE' && segments.length === 2) {
        response = await handleCancelAppointment(supabase, user.id, segments[1])
      } else {
        response = err('Not found', 404)
      }
    } else {
      response = err('Not found', 404)
    }

    // Inject rate limit headers into every response
    const headers = new Headers(response.headers)
    for (const [k, v] of Object.entries(rlHeaders)) headers.set(k, v)
    return new Response(response.body, { status: response.status, headers })

  } catch (e) {
    console.error('[scheduler-api]', e)
    return err(e instanceof Error ? e.message : 'Internal server error', 500, rlHeaders)
  }
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── helpers ────────────────────────────────────────────────────────────────

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function err(message: string, status: number) {
  return json({ error: message }, status)
}

// ─── route handlers ──────────────────────────────────────────────────────────

/**
 * GET /openings
 * Query params:
 *   date_from   (YYYY-MM-DD, default: today)
 *   date_to     (YYYY-MM-DD)
 *   service     (partial match)
 *   worker      (partial match)
 *   province    (partial match on location JSON)
 *   country     (partial match on location JSON)
 *   limit       (default 50, max 200)
 *   offset      (default 0)
 */
async function handleListOpenings(supabase: SupabaseClient, params: URLSearchParams) {
  const today = new Date().toISOString().split('T')[0]
  const dateFrom = params.get('date_from') ?? today
  const dateTo = params.get('date_to')
  const service = params.get('service')
  const worker = params.get('worker')
  const province = params.get('province')
  const country = params.get('country')
  const limit = Math.min(parseInt(params.get('limit') ?? '50', 10), 200)
  const offset = parseInt(params.get('offset') ?? '0', 10)

  let query = supabase
    .from('openings')
    .select('*')
    .eq('is_available', true)
    .gte('date', dateFrom)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })
    .range(offset, offset + limit - 1)

  if (dateTo) query = query.lte('date', dateTo)
  if (service) query = query.ilike('service', `%${service}%`)
  if (worker) query = query.ilike('worker', `%${worker}%`)
  if (province) query = query.ilike('location', `%${province}%`)
  if (country) query = query.ilike('location', `%${country}%`)

  const { data, error, count } = await query
  if (error) return err(error.message, 500)

  return json({ data, count, limit, offset })
}

/**
 * POST /openings/:id/book
 * Body (optional): { notes?: string }
 * Books the opening for the calling user via the book_opening RPC.
 */
async function handleBookOpening(supabase: SupabaseClient, userId: string, openingId: string, req: Request) {
  let notes: string | null = null
  try {
    const body = await req.json().catch(() => ({}))
    notes = typeof body.notes === 'string' ? body.notes.trim() || null : null
  } catch { /* no body is fine */ }

  const { data, error } = await supabase.rpc('book_opening', {
    _opening_id: openingId,
    _user_id: userId,
  })

  if (error) {
    // Surface friendly messages for known constraint errors
    if (error.message.includes('not available')) return err('This opening is no longer available.', 409)
    if (error.message.includes('self-booking')) return err('You cannot book your own opening.', 422)
    if (error.message.includes('duplicate') || error.message.includes('already')) return err('You already have a pending booking for this opening.', 409)
    return err(error.message, 500)
  }

  // Optionally attach notes to the new appointment
  if (notes && data) {
    await supabase
      .from('appointments')
      .update({ notes })
      .eq('opening_id', openingId)
      .eq('user_id', userId)
      .eq('status', 'pending')
  }

  return json({ message: 'Booking created', appointment: data }, 201)
}

/**
 * GET /appointments
 * Query params:
 *   role        (booker | provider | all, default: all)
 *   status      (pending | confirmed | cancelled | completed)
 *   date_from   (YYYY-MM-DD)
 *   date_to     (YYYY-MM-DD)
 *   limit       (default 50, max 200)
 *   offset      (default 0)
 */
async function handleListAppointments(supabase: SupabaseClient, userId: string, params: URLSearchParams) {
  const role = params.get('role') ?? 'all'
  const status = params.get('status')
  const dateFrom = params.get('date_from')
  const dateTo = params.get('date_to')
  const limit = Math.min(parseInt(params.get('limit') ?? '50', 10), 200)
  const offset = parseInt(params.get('offset') ?? '0', 10)

  let query = supabase
    .from('appointments')
    .select('*')
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })
    .range(offset, offset + limit - 1)

  if (role === 'booker') {
    query = query.eq('user_id', userId)
  } else if (role === 'provider') {
    query = query.eq('provider_id', userId)
  } else {
    query = query.or(`user_id.eq.${userId},provider_id.eq.${userId}`)
  }

  if (status) query = query.eq('status', status)
  if (dateFrom) query = query.gte('date', dateFrom)
  if (dateTo) query = query.lte('date', dateTo)

  const { data, error } = await query
  if (error) return err(error.message, 500)

  return json({ data, limit, offset })
}

/**
 * GET /appointments/:id
 * Returns the appointment only if the caller is the booker or the provider.
 */
async function handleGetAppointment(supabase: SupabaseClient, userId: string, appointmentId: string) {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', appointmentId)
    .single()

  if (error || !data) return err('Appointment not found', 404)
  if (data.user_id !== userId && data.provider_id !== userId) return err('Forbidden', 403)

  return json(data)
}

/**
 * PATCH /appointments/:id
 * Body: { status?: 'confirmed' | 'cancelled' | 'completed', notes?: string }
 *
 * Role rules:
 *   confirmed  — provider only
 *   completed  — provider only
 *   cancelled  — booker or provider
 *   notes      — booker only
 */
async function handleUpdateAppointment(supabase: SupabaseClient, userId: string, appointmentId: string, req: Request) {
  const body = await req.json().catch(() => ({}))
  const { status, notes } = body as { status?: string; notes?: string }

  if (!status && notes === undefined) return err('Nothing to update', 400)

  const { data: appt, error: fetchErr } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', appointmentId)
    .single()

  if (fetchErr || !appt) return err('Appointment not found', 404)

  const isBooker = appt.user_id === userId
  const isProvider = appt.provider_id === userId
  if (!isBooker && !isProvider) return err('Forbidden', 403)

  if (status) {
    const validStatuses = ['confirmed', 'cancelled', 'completed']
    if (!validStatuses.includes(status)) return err(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400)

    if (status === 'confirmed' && !isProvider) return err('Only the provider can confirm an appointment', 403)
    if (status === 'completed' && !isProvider) return err('Only the provider can mark an appointment as completed', 403)
    if (appt.status === 'cancelled') return err('Cannot update a cancelled appointment', 422)
    if (appt.status === 'completed') return err('Cannot update a completed appointment', 422)

    if (status === 'cancelled') {
      const { error: cancelErr } = await supabase.rpc('cancel_appointment', {
        _appointment_id: appointmentId,
        _caller_id: userId,
      })
      if (cancelErr) return err(cancelErr.message, 500)
      return json({ message: 'Appointment cancelled' })
    }

    const updates: Record<string, unknown> = { status }
    if (status === 'confirmed') updates.approved_by = userId
    const { data: updated, error: updateErr } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', appointmentId)
      .select()
      .single()
    if (updateErr) return err(updateErr.message, 500)
    return json(updated)
  }

  // notes update
  if (notes !== undefined) {
    if (!isBooker) return err('Only the booker can update notes', 403)
    const { data: updated, error: updateErr } = await supabase
      .from('appointments')
      .update({ notes: notes.trim() || null })
      .eq('id', appointmentId)
      .select()
      .single()
    if (updateErr) return err(updateErr.message, 500)
    return json(updated)
  }

  return err('Nothing to update', 400)
}

/**
 * DELETE /appointments/:id
 * Cancels the appointment. Booker or provider may cancel.
 */
async function handleCancelAppointment(supabase: SupabaseClient, userId: string, appointmentId: string) {
  const { data: appt, error: fetchErr } = await supabase
    .from('appointments')
    .select('user_id, provider_id, status')
    .eq('id', appointmentId)
    .single()

  if (fetchErr || !appt) return err('Appointment not found', 404)
  if (appt.user_id !== userId && appt.provider_id !== userId) return err('Forbidden', 403)
  if (appt.status === 'cancelled') return err('Appointment is already cancelled', 422)
  if (appt.status === 'completed') return err('Cannot cancel a completed appointment', 422)

  const { error: cancelErr } = await supabase.rpc('cancel_appointment', {
    _appointment_id: appointmentId,
    _caller_id: userId,
  })
  if (cancelErr) return err(cancelErr.message, 500)

  return json({ message: 'Appointment cancelled' })
}

// ─── main handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return err('Missing or invalid authorization header', 401)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return err('Unauthorized', 401)

  // Premium gate — API access requires an active premium subscription
  const { data: isPremium } = await supabase.rpc('is_user_premium', { p_user_id: user.id })
  if (!isPremium) {
    return err('API access requires a premium subscription. Upgrade at pikappoint.com/settings.', 403)
  }

  // Parse route: strip leading path to get segments after /scheduler-api/
  const url = new URL(req.url)
  const stripped = url.pathname.replace(/^.*\/scheduler-api\/?/, '')
  const segments = stripped.split('/').filter(Boolean)
  const method = req.method

  try {
    if (segments[0] === 'openings') {
      if (method === 'GET' && segments.length === 1) {
        return handleListOpenings(supabase, url.searchParams)
      }
      if (method === 'POST' && segments.length === 3 && segments[2] === 'book') {
        return handleBookOpening(supabase, user.id, segments[1], req)
      }
    }

    if (segments[0] === 'appointments') {
      if (method === 'GET' && segments.length === 1) {
        return handleListAppointments(supabase, user.id, url.searchParams)
      }
      if (method === 'GET' && segments.length === 2) {
        return handleGetAppointment(supabase, user.id, segments[1])
      }
      if (method === 'PATCH' && segments.length === 2) {
        return handleUpdateAppointment(supabase, user.id, segments[1], req)
      }
      if (method === 'DELETE' && segments.length === 2) {
        return handleCancelAppointment(supabase, user.id, segments[1])
      }
    }

    return err('Not found', 404)
  } catch (e) {
    console.error('[scheduler-api]', e)
    return err(e instanceof Error ? e.message : 'Internal server error', 500)
  }
})

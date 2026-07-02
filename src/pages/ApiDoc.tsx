import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, Copy, Check, Lock, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ROUTES } from '@/config/routes';

const BASE_URL = 'https://dbabjfydcllqbjpolhym.supabase.co/functions/v1/scheduler-api';

// ─── types ───────────────────────────────────────────────────────────────────

interface Param {
  name: string;
  type: string;
  required?: boolean;
  description: string;
}

interface Endpoint {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  summary: string;
  description: string;
  queryParams?: Param[];
  bodyParams?: Param[];
  example: { request?: string; response: string };
}

// ─── data ────────────────────────────────────────────────────────────────────

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  POST: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  PATCH: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  DELETE: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

const ENDPOINTS: Endpoint[] = [
  {
    method: 'GET',
    path: '/openings',
    summary: 'List available openings',
    description: 'Returns available openings ordered by date and start time. Supports filtering by date range, service, worker, and location.',
    queryParams: [
      { name: 'date_from', type: 'string', description: 'Start date filter (YYYY-MM-DD). Defaults to today.' },
      { name: 'date_to', type: 'string', description: 'End date filter (YYYY-MM-DD).' },
      { name: 'service', type: 'string', description: 'Partial match on service name.' },
      { name: 'worker', type: 'string', description: 'Partial match on worker name.' },
      { name: 'province', type: 'string', description: 'Partial match on province/state in location.' },
      { name: 'country', type: 'string', description: 'Partial match on country in location.' },
      { name: 'limit', type: 'number', description: 'Max results to return (default 50, max 200).' },
      { name: 'offset', type: 'number', description: 'Pagination offset (default 0).' },
    ],
    example: {
      response: `{
  "data": [
    {
      "id": "uuid",
      "user_id": "provider-uuid",
      "date": "2026-07-01",
      "start_time": "09:00:00",
      "end_time": "10:00:00",
      "duration": 1,
      "worker": "Jane Smith",
      "service": "Haircut",
      "location": "{\\"city\\":\\"Vancouver\\",\\"province\\":\\"British Columbia\\",\\"country\\":\\"Canada\\"}",
      "hourly_rate": 80,
      "total": 80,
      "is_available": true
    }
  ],
  "count": 1,
  "limit": 50,
  "offset": 0
}`,
    },
  },
  {
    method: 'POST',
    path: '/openings/:id/book',
    summary: 'Book an opening',
    description: 'Books the specified opening for the authenticated user. Returns 409 if unavailable or already booked. You cannot book your own opening.',
    bodyParams: [
      { name: 'notes', type: 'string', description: 'Optional notes to attach to the appointment.' },
    ],
    example: {
      request: `{
  "notes": "Please confirm 24h before."
}`,
      response: `{
  "message": "Booking created",
  "appointment": {
    "id": "uuid",
    "opening_id": "opening-uuid",
    "user_id": "booker-uuid",
    "provider_id": "provider-uuid",
    "worker": "Jane Smith",
    "service": "Haircut",
    "date": "2026-07-01",
    "start_time": "09:00:00",
    "end_time": "10:00:00",
    "status": "pending",
    "total": 80
  }
}`,
    },
  },
  {
    method: 'GET',
    path: '/appointments',
    summary: 'List your appointments',
    description: 'Returns appointments where you are the booker, provider, or both. Filter by role, status, and date range.',
    queryParams: [
      { name: 'role', type: 'string', description: 'booker | provider | all (default: all).' },
      { name: 'status', type: 'string', description: 'Filter by status: pending | confirmed | cancelled | completed.' },
      { name: 'date_from', type: 'string', description: 'Start date filter (YYYY-MM-DD).' },
      { name: 'date_to', type: 'string', description: 'End date filter (YYYY-MM-DD).' },
      { name: 'limit', type: 'number', description: 'Max results (default 50, max 200).' },
      { name: 'offset', type: 'number', description: 'Pagination offset (default 0).' },
    ],
    example: {
      response: `{
  "data": [
    {
      "id": "uuid",
      "opening_id": "opening-uuid",
      "user_id": "booker-uuid",
      "provider_id": "provider-uuid",
      "worker": "Jane Smith",
      "service": "Haircut",
      "date": "2026-07-01",
      "start_time": "09:00:00",
      "end_time": "10:00:00",
      "status": "confirmed",
      "notes": null,
      "total": 80
    }
  ],
  "limit": 50,
  "offset": 0
}`,
    },
  },
  {
    method: 'GET',
    path: '/appointments/:id',
    summary: 'Get an appointment',
    description: 'Returns a single appointment by ID. Only accessible if you are the booker or provider.',
    example: {
      response: `{
  "id": "uuid",
  "opening_id": "opening-uuid",
  "user_id": "booker-uuid",
  "provider_id": "provider-uuid",
  "worker": "Jane Smith",
  "service": "Haircut",
  "date": "2026-07-01",
  "start_time": "09:00:00",
  "end_time": "10:00:00",
  "duration": 1,
  "status": "pending",
  "notes": null,
  "hourly_rate": 80,
  "total": 80,
  "approved_by": null
}`,
    },
  },
  {
    method: 'PATCH',
    path: '/appointments/:id',
    summary: 'Update an appointment',
    description: 'Update the status or notes of an appointment. Role rules apply: only the provider can confirm or complete; either party can cancel; only the booker can update notes.',
    bodyParams: [
      { name: 'status', type: 'string', description: 'confirmed (provider only) | cancelled (either) | completed (provider only).' },
      { name: 'notes', type: 'string', description: 'Booker only. Updates appointment notes.' },
    ],
    example: {
      request: `{
  "status": "confirmed"
}`,
      response: `{
  "id": "uuid",
  "status": "confirmed",
  "approved_by": "provider-uuid",
  ...
}`,
    },
  },
  {
    method: 'DELETE',
    path: '/appointments/:id',
    summary: 'Cancel an appointment',
    description: 'Cancels the appointment. Both the booker and the provider may cancel. Cannot cancel a completed appointment.',
    example: {
      response: `{
  "message": "Appointment cancelled"
}`,
    },
  },
];

// ─── components ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="p-1 rounded hover:bg-white/10 transition-colors text-gray-400 hover:text-white">
      {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

function CodeBlock({ code, language = 'json' }: { code: string; language?: string }) {
  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <span className="text-xs text-gray-400 font-mono">{language}</span>
        <CopyButton text={code} />
      </div>
      <pre className="p-4 text-sm text-gray-100 font-mono overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function ParamTable({ params, title }: { params: Param[]; title: string }) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</h4>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="text-left px-4 py-2 font-medium">Name</th>
              <th className="text-left px-4 py-2 font-medium">Type</th>
              <th className="text-left px-4 py-2 font-medium">Description</th>
            </tr>
          </thead>
          <tbody>
            {params.map((p) => (
              <tr key={p.name} className="border-b last:border-0">
                <td className="px-4 py-2 font-mono text-xs">
                  {p.name}
                  {p.required && <span className="ml-1 text-red-500">*</span>}
                </td>
                <td className="px-4 py-2 text-muted-foreground font-mono text-xs">{p.type}</td>
                <td className="px-4 py-2 text-muted-foreground">{p.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
      >
        <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded font-mono w-16 text-center ${METHOD_COLORS[endpoint.method]}`}>
          {endpoint.method}
        </span>
        <span className="font-mono text-sm font-medium flex-1">{endpoint.path}</span>
        <span className="text-sm text-muted-foreground hidden sm:block">{endpoint.summary}</span>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>

      {open && (
        <div className="border-t px-5 py-5 space-y-6 bg-muted/10">
          <p className="text-sm text-muted-foreground">{endpoint.description}</p>

          {endpoint.queryParams && <ParamTable params={endpoint.queryParams} title="Query Parameters" />}
          {endpoint.bodyParams && <ParamTable params={endpoint.bodyParams} title="Request Body" />}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {endpoint.example.request && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Request Body</h4>
                <CodeBlock code={endpoint.example.request} />
              </div>
            )}
            <div className={`space-y-2 ${!endpoint.example.request ? 'lg:col-span-2' : ''}`}>
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Response</h4>
              <CodeBlock code={endpoint.example.response} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── page ────────────────────────────────────────────────────────────────────

export default function ApiDoc() {
  const authHeader = `Authorization: Bearer <your-supabase-jwt>`;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold">Scheduler API</h1>
          <Badge variant="secondary" className="text-xs">v1</Badge>
        </div>
        <p className="text-muted-foreground">
          REST API for booking and managing appointments programmatically. Available to premium subscribers.
        </p>
      </div>

      {/* Base URL */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Base URL</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock code={BASE_URL} language="url" />
        </CardContent>
      </Card>

      {/* Auth */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            All endpoints require a valid Supabase JWT in the <code className="bg-muted px-1 py-0.5 rounded text-xs">Authorization</code> header.
            Get your JWT by signing in via the{' '}
            <a href="https://supabase.com/docs/reference/javascript/auth-signinwithpassword" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Supabase auth API
            </a>.
          </p>
          <CodeBlock code={authHeader} language="http" />
        </CardContent>
      </Card>

      {/* Premium gate */}
      <Card className="border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-950/20">
        <CardContent className="flex items-start gap-3 pt-5">
          <Zap className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200">Premium unlocks full access</p>
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              Free accounts get <strong>100 requests/day</strong> for evaluation. Premium accounts get <strong>2,000 requests/day</strong> for production use.{' '}
              <Link to={ROUTES.settings} className="underline hover:no-underline">Upgrade in Settings →</Link>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Rate limits */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Rate Limits
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Limits reset at <strong>midnight UTC</strong> daily. Every response includes rate limit headers.
          </p>
          <div className="border rounded-lg overflow-hidden text-sm">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="text-left px-4 py-2 font-medium">Plan</th>
                  <th className="text-left px-4 py-2 font-medium">Requests / day</th>
                  <th className="text-left px-4 py-2 font-medium">Use case</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="px-4 py-2">Free</td>
                  <td className="px-4 py-2 font-mono">100</td>
                  <td className="px-4 py-2 text-muted-foreground">Evaluation &amp; testing</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium text-primary">Premium</td>
                  <td className="px-4 py-2 font-mono font-medium text-primary">2,000</td>
                  <td className="px-4 py-2 text-muted-foreground">Production integrations</td>
                </tr>
              </tbody>
            </table>
          </div>
          <CodeBlock code={`X-RateLimit-Limit: 2000\nX-RateLimit-Remaining: 1843\nX-RateLimit-Reset: 2026-06-18T00:00:00.000Z`} language="http" />
          <p className="text-sm text-muted-foreground">
            Exceeding the limit returns <code className="bg-muted px-1 py-0.5 rounded text-xs">429 Too Many Requests</code> with an upgrade prompt.{' '}
            <Link to={ROUTES.settings} className="text-primary hover:underline">Upgrade to premium →</Link>
          </p>
        </CardContent>
      </Card>

      {/* Error format */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Error Format</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">All errors return JSON with an <code className="bg-muted px-1 py-0.5 rounded text-xs">error</code> field.</p>
          <CodeBlock code={`{\n  "error": "This opening is no longer available."\n}`} />
          <div className="border rounded-lg overflow-hidden text-sm">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                  <th className="text-left px-4 py-2 font-medium">Meaning</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['401', 'Missing or invalid JWT'],
                  ['403', 'Forbidden — not premium, or wrong role for action'],
                  ['404', 'Resource not found'],
                  ['409', 'Conflict — opening unavailable or duplicate booking'],
                  ['422', 'Unprocessable — e.g. cancelling a completed appointment'],
                  ['429', 'Rate limit exceeded — upgrade or wait for reset at midnight UTC'],
                  ['500', 'Internal server error'],
                ].map(([code, meaning]) => (
                  <tr key={code} className="border-b last:border-0">
                    <td className="px-4 py-2 font-mono text-xs">{code}</td>
                    <td className="px-4 py-2 text-muted-foreground">{meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Endpoints */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Endpoints</h2>
        <p className="text-sm text-muted-foreground">Click an endpoint to expand request/response details.</p>
        <div className="space-y-2">
          {ENDPOINTS.map((ep) => (
            <EndpointCard key={`${ep.method}-${ep.path}`} endpoint={ep} />
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="pt-4 border-t flex gap-4 text-sm text-muted-foreground">
        <Link to={ROUTES.dashboard} className="hover:underline">Dashboard</Link>
        <Link to={ROUTES.settings} className="hover:underline">Settings</Link>
        <Link to={ROUTES.help} className="hover:underline">Help</Link>
      </footer>
    </div>
  );
}

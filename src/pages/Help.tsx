import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Code2 } from 'lucide-react';
import { ROUTES } from '@/config/routes';

const DEMO_VIDEO_URL = 'https://github.com/SteveQiu/time-craft-scheduler-admin/raw/refs/heads/main/media/videos/pikappoint-demo.mp4';

export default function Help() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Help & Tutorial</h1>
        <p className="text-muted-foreground mt-2">
          Learn how to use PikAppoint. Support local providers, celebrate every person's skills and profession, and help our community thrive together.
        </p>
      </div>

      {/* Video Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📺 Video Tutorial
          </CardTitle>
        </CardHeader>
        <CardContent>
          <video
            src={DEMO_VIDEO_URL}
            controls
            className="w-full rounded-md"
            preload="metadata"
          >
            Your browser does not support video playback.
          </video>
        </CardContent>
      </Card>

      {/* App Flow */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">👤 As a Client</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-none pl-2">
              <li>→ <strong>Browse</strong> — find service providers near you</li>
              <li>→ <strong>Sign in</strong> — create or log into your account</li>
              <li>→ <strong>Pick a slot</strong> — select an available opening</li>
              <li>→ <strong>Confirm</strong> — reservation is saved instantly</li>
              <li>→ <strong>Reservations</strong> — view, track, or cancel bookings</li>
              <li>→ <strong>Notifications</strong> — get updates on confirmations &amp; changes</li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">🏢 As a Provider / Organization</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-none pl-2">
              <li>→ <strong>Sign in</strong> — access your organization dashboard</li>
              <li>→ <strong>Openings</strong> — create available time slots</li>
              <li>→ <strong>Reservations</strong> — review incoming bookings</li>
              <li>→ <strong>Approve / Deny</strong> — manage requests individually or in bulk</li>
              <li>→ <strong>Profile</strong> — share your QR link so clients can find you</li>
              <li>→ <strong>Settings</strong> — configure location, payment, and preferences</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Developer API */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            Developer API
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Build your own integrations using the PikAppoint Scheduler API. Book and manage appointments programmatically from any app or website.
          </p>
          <ul className="text-sm text-muted-foreground space-y-1 list-none pl-2">
            <li>→ <strong>Free plan</strong> — 100 requests/day for evaluation</li>
            <li>→ <strong>Premium plan</strong> — 2,000 requests/day for production</li>
          </ul>
          <Link
            to={ROUTES.apiDoc}
            className="inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline mt-1"
          >
            <Code2 className="h-4 w-4" />
            View API Documentation →
          </Link>
        </CardContent>
      </Card>

    </div>
  );
}

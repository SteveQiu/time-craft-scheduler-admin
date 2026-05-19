import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Calendar, Clock, User, Bell, MapPin } from 'lucide-react';

const DEMO_VIDEO_URL = 'https://github.com/SteveQiu/time-craft-scheduler-admin/raw/refs/heads/main/media/videos/pikappoint-demo.mp4';

export default function Help() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Help & Tutorial</h1>
        <p className="text-muted-foreground mt-2">Learn how to use PikAppoint</p>
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

      {/* Feature Guide Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Browse Providers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Search and discover service providers in your area
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Book an Appointment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Select a time slot and confirm your reservation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Manage Openings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Create and manage your available time slots (organization)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              View Reservations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Track upcoming and past appointments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Your Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Manage your profile, QR share link, and settings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Stay updated on booking confirmations and changes
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

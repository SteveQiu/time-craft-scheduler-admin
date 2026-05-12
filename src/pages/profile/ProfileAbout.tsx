import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Mail, Phone, MapPin, Eye, EyeOff, Link } from 'lucide-react';
import type { ProfileData, FormState, PrivacySettings } from './types';

interface ProfileAboutProps {
  profile: ProfileData;
  editing: boolean;
  isOwnProfile: boolean;
  form: FormState;
  onFormChange: (form: FormState) => void;
  privacySettings: PrivacySettings;
  onPrivacyChange: (settings: PrivacySettings) => void;
}

export function ProfileAbout({
  profile,
  editing,
  isOwnProfile,
  form,
  onFormChange,
  privacySettings,
  onPrivacyChange,
}: ProfileAboutProps) {
  if (editing) {
    return (
      <>
        <div className="space-y-2">
          <Label>Introduction</Label>
          <Textarea
            value={form.introduction}
            onChange={(e) => onFormChange({ ...form, introduction: e.target.value })}
            placeholder="Tell people about yourself..."
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Email</Label>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11"
              onClick={() =>
                onPrivacyChange({ ...privacySettings, email_public: !privacySettings.email_public })
              }
              aria-label={
                privacySettings.email_public
                  ? 'Hide email from public profile'
                  : 'Show email on public profile'
              }
            >
              {privacySettings.email_public ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </Button>
          </div>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => onFormChange({ ...form, email: e.target.value })}
            placeholder="your@email.com"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Phone</Label>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11"
              onClick={() =>
                onPrivacyChange({ ...privacySettings, phone_public: !privacySettings.phone_public })
              }
              aria-label={
                privacySettings.phone_public
                  ? 'Hide phone from public profile'
                  : 'Show phone on public profile'
              }
            >
              {privacySettings.phone_public ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </Button>
          </div>
          <Input
            value={form.phone}
            onChange={(e) => onFormChange({ ...form, phone: e.target.value })}
            placeholder="+1 (555) 000-0000"
          />
        </div>
        <div className="space-y-2">
          <Label>Profile Alias</Label>
          <div className="flex items-center space-x-0">
            <span className="text-sm text-muted-foreground px-3 py-2 bg-muted rounded-l-md border border-r-0 border-input min-w-24 flex items-center justify-center">
              /profile/
            </span>
            <Input
              value={form.slug}
              onChange={(e) =>
                onFormChange({
                  ...form,
                  slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                })
              }
              placeholder="my-profile"
              className="rounded-l-none"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Website / Profile Link</Label>
          <Input
            type="url"
            value={form.profile_url}
            onChange={(e) => onFormChange({ ...form, profile_url: e.target.value })}
            placeholder="https://linkedin.com/in/yourname"
          />
        </div>
      </>
    );
  }

  return (
    <>
      {profile.introduction && <p className="text-foreground">{profile.introduction}</p>}
      <div className="space-y-2">
        {profile.email && (isOwnProfile || profile.email_public) && (
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            <span>{profile.email}</span>
          </div>
        )}
        {profile.phone && (isOwnProfile || profile.phone_public) && (
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4" />
            <span>{profile.phone}</span>
          </div>
        )}
        {profile.address && (isOwnProfile || profile.address_public) && (
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{profile.address}</span>
          </div>
        )}
        {profile.profile_url && (
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Link className="h-4 w-4" />
            <a
              href={profile.profile_url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline text-primary"
            >
              {profile.profile_url}
            </a>
          </div>
        )}
      </div>
      {!profile.introduction && !profile.phone && !profile.address && isOwnProfile && (
        <p className="text-sm text-muted-foreground">
          Click &quot;Edit&quot; to add your introduction, contact info, and address.
        </p>
      )}
    </>
  );
}

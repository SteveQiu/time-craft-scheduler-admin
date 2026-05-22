import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Star, Share2, Calendar, Bookmark, Flag, Edit, Save, X, Eye, EyeOff } from 'lucide-react';
import type { ProfileData, FormState, PrivacySettings } from './types';
import type { User } from '@supabase/supabase-js';
import { ProfileQRDialog } from './ProfileQRDialog';

interface ProfileHeaderProps {
  profile: ProfileData;
  editing: boolean;
  isOwnProfile: boolean;
  isBookmarked: boolean;
  user: User | null;
  isSavePending: boolean;
  avgRating: { avg: number; count: number } | null | undefined;
  shareUrl: string | null;
  form: FormState;
  onFormChange: (form: FormState) => void;
  privacySettings: PrivacySettings;
  onPrivacyChange: (settings: PrivacySettings) => void;
  onEdit: () => void;
  onSave: () => void;
  onCancelEdit: () => void;
  onCopyShare: () => void;
  onToggleBookmark: () => void;
  onReport: () => void;
  onBrowse: () => void;
  onNavigateAuth: () => void;
}

export function ProfileHeader({
  profile,
  editing,
  isOwnProfile,
  isBookmarked,
  user,
  isSavePending,
  avgRating,
  shareUrl,
  form,
  onFormChange,
  privacySettings,
  onPrivacyChange,
  onEdit,
  onSave,
  onCancelEdit,
  onCopyShare,
  onToggleBookmark,
  onReport,
  onBrowse,
  onNavigateAuth,
}: ProfileHeaderProps) {
  const [qrOpen, setQrOpen] = useState(false);

  const initials = (profile.full_name || profile.email || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex flex-wrap gap-4 items-start sm:items-center justify-between">
      <div className="flex items-center space-x-4">
        <Avatar className="h-20 w-20">
          <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          {editing ? (
            <Input
              value={form.full_name}
              onChange={(e) => onFormChange({ ...form, full_name: e.target.value })}
              placeholder="Full name"
              className="text-xl font-bold mb-1"
            />
          ) : (
            <h2 className="text-2xl font-bold text-foreground">
              {profile.full_name || 'No name set'}
            </h2>
          )}
          <p className="text-muted-foreground flex items-center gap-1">
            {isOwnProfile ? (user?.email ?? profile.email) : profile.email}
            {isOwnProfile && editing && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
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
                  <Eye className="h-3.5 w-3.5" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5" />
                )}
              </Button>
            )}
          </p>
          {avgRating && (
            <div className="flex items-center space-x-1 mt-1">
              <Star className="h-4 w-4 text-warning fill-current" />
              <span className="text-sm font-medium">{avgRating.avg}</span>
              <span className="text-sm text-muted-foreground">({avgRating.count} reviews)</span>
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {shareUrl && (
          <>
            <Button variant="outline" size="sm" onClick={() => setQrOpen(true)}>
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
            <ProfileQRDialog open={qrOpen} onOpenChange={setQrOpen} shareUrl={shareUrl} />
          </>
        )}
        {!isOwnProfile && (
          <>
            <Button variant="outline" size="sm" onClick={onBrowse}>
              <Calendar className="h-4 w-4 mr-1" />
              Browse
            </Button>
            <Button
              variant={isBookmarked ? 'default' : 'outline'}
              size="sm"
              onClick={user ? onToggleBookmark : onNavigateAuth}
              aria-label={
                isBookmarked ? 'Remove bookmark from this profile' : 'Bookmark this profile'
              }
            >
              <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
            </Button>
            {user && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onReport}
                aria-label="Report this profile"
              >
                <Flag className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
        {isOwnProfile && !editing && (
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
        )}
        {isOwnProfile && editing && (
          <>
            <Button size="sm" onClick={onSave} disabled={isSavePending}>
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
            <Button variant="ghost" size="sm" onClick={onCancelEdit}>
              <X className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

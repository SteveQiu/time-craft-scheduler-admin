import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Star, Share2, Calendar, Bookmark, Flag, Edit, Save, X, Camera } from 'lucide-react';
import type { ProfileData, FormState, PrivacySettings } from './types';
import type { User } from '@supabase/supabase-js';
import { ShareDialog } from '@/components/ShareDialog';

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
  onAvatarUpload?: (file: File) => void;
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
  onAvatarUpload,
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
      {isOwnProfile ? (
        <div className="flex items-center space-x-4">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            id="avatar-upload"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && onAvatarUpload) onAvatarUpload(file);
              e.target.value = '';
            }}
          />
          <div className="relative">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.full_name ?? 'Avatar'} />
              <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            {editing && onAvatarUpload && (
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1 cursor-pointer hover:bg-primary/90 transition-colors"
                aria-label="Upload profile picture"
              >
                <Camera className="h-3.5 w-3.5" />
              </label>
            )}
          </div>
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
            {avgRating && (
              <div className="flex items-center space-x-1 mt-1">
                <Star className="h-4 w-4 text-warning fill-current" />
                <span className="text-sm font-medium">{avgRating.avg}</span>
                <span className="text-sm text-muted-foreground">({avgRating.count} reviews)</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center space-x-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.full_name ?? 'Avatar'} />
            <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {profile.full_name || 'No name set'}
            </h2>
            {avgRating && (
              <div className="flex items-center space-x-1 mt-1">
                <Star className="h-4 w-4 text-warning fill-current" />
                <span className="text-sm font-medium">{avgRating.avg}</span>
                <span className="text-sm text-muted-foreground">({avgRating.count} reviews)</span>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 w-full justify-between">
        {!isOwnProfile && (
          <Button variant="outline" size="sm" onClick={onBrowse}>
            <Calendar className="h-4 w-4 mr-1" />
            Book Appointments
          </Button>
        )}
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          {shareUrl && (
            <>
              <Button variant="outline" size="sm" onClick={() => setQrOpen(true)}>
                <Share2 className="h-4 w-4 mr-1" />
                Share
              </Button>
              <ShareDialog
                open={qrOpen}
                onOpenChange={setQrOpen}
                shareUrl={shareUrl}
                title="Share Profile"
                displayName={profile.slug || profile.full_name || undefined}
              />
            </>
          )}
          {!isOwnProfile && (
            <>
              <Button
                variant={isBookmarked ? 'default' : 'outline'}
                size="sm"
                onClick={onToggleBookmark}
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
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
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
    </div>
  );
}

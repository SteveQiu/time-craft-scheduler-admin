import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ReviewSection } from '@/components/ReviewSection';
import { ReportDialog } from '@/components/ReportDialog';
import { PhotoLightbox } from '@/components/PhotoLightbox';
import { ArrowLeft, Camera } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useProfile } from '@/hooks/useProfile';
import { ProfileHeader } from './profile/ProfileHeader';
import { ProfileAbout } from './profile/ProfileAbout';
import { ProfileSkillsRate } from './profile/ProfileSkillsRate';
import { ProfileAddress, ProfileAddressHeaderActions } from './profile/ProfileAddress';
import { ProfilePhotos } from './profile/ProfilePhotos';
import type { AddressData, AddressVisibility, FormState, PrivacySettings } from './profile/types';

export default function Profile() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPremium } = useSubscription();

  const [editing, setEditing] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const [address, setAddress] = useState<AddressData>({
    address_line_1: '',
    address_line_2: '',
    city: '',
    province_state: '',
    country: '',
    postal_code: '',
  });
  const [addressVisibility, setAddressVisibility] = useState<AddressVisibility>({
    address_line_1: true,
    address_line_2: true,
    city: true,
    province_state: true,
    country: true,
    postal_code: true,
  });
  const [form, setForm] = useState<FormState>({
    full_name: '',
    email: '',
    introduction: '',
    phone: '',
    slug: '',
    skills: [],
    hourly_rate: 0,
    profile_url: '',
  });
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    address_public: false,
    phone_public: false,
    email_public: false,
    hourly_rate_public: true,
    skills_public: true,
  });

  const {
    profile,
    isLoading,
    avgRating,
    profilePhotos,
    getPhotoUrl,
    isBookmarked,
    isOwnProfile,
    handlePhotoUpload,
    handlePhotoDelete,
    saveMutation,
    handleToggleBookmark,
    shareUrl,
    copyShareLink,
  } = useProfile({ slug, user, onSaveSuccess: () => setEditing(false) });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        email: profile.email || '',
        introduction: profile.introduction || '',
        phone: profile.phone || '',
        slug: profile.slug || '',
        skills: profile.skills || [],
        hourly_rate: profile.hourly_rate || 0,
        profile_url: profile.profile_url || '',
      });
      setPrivacySettings({
        address_public: profile.address_public ?? false,
        phone_public: profile.phone_public ?? false,
        email_public: profile.email_public ?? false,
        hourly_rate_public: profile.hourly_rate_public ?? true,
        skills_public: profile.skills_public ?? true,
      });
      setSkillInput('');

      const savedAddress = localStorage.getItem(`address_${profile.id}`);
      if (savedAddress) setAddress(JSON.parse(savedAddress));

      const savedVisibility = localStorage.getItem(`addressVisibility_${profile.id}`);
      if (savedVisibility) setAddressVisibility(JSON.parse(savedVisibility));
    }
  }, [profile]);

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center py-12">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">
              {isOwnProfile ? 'Please sign in to view your profile.' : 'Profile not found.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      {window.history.length > 1 && (
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      )}

      <Card className="shadow-soft border-card-border">
        <CardContent className="pt-6">
          <ProfileHeader
            profile={profile}
            editing={editing}
            isOwnProfile={isOwnProfile}
            isBookmarked={isBookmarked}
            user={user}
            isSavePending={saveMutation.isPending}
            avgRating={avgRating}
            shareUrl={shareUrl}
            form={form}
            onFormChange={setForm}
            onEdit={() => setEditing(true)}
            onSave={() => saveMutation.mutate({ form, address, privacySettings })}
            onCancelEdit={() => setEditing(false)}
            onCopyShare={copyShareLink}
            onToggleBookmark={handleToggleBookmark}
            onReport={() => setReportOpen(true)}
            onBrowse={() => navigate(`/browse/${profile.id}`)}
            onNavigateAuth={() =>
              navigate(`/auth?returnTo=${encodeURIComponent(window.location.pathname)}`)
            }
          />
        </CardContent>
      </Card>

      {(profilePhotos.length > 0 || (isOwnProfile && editing)) && (
        <Card className="shadow-soft border-card-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Photos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ProfilePhotos
              profilePhotos={profilePhotos}
              isOwnProfile={isOwnProfile}
              editing={editing}
              isPremium={isPremium}
              getPhotoUrl={getPhotoUrl}
              onPhotoUpload={handlePhotoUpload}
              onPhotoDelete={handlePhotoDelete}
              onOpenLightbox={(idx) => { setLightboxIndex(idx); setLightboxOpen(true); }}
            />
          </CardContent>
        </Card>
      )}

      <Card className="shadow-soft border-card-border">
        <CardHeader>
          <CardTitle className="text-lg">About</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProfileAbout
            profile={profile}
            editing={editing}
            isOwnProfile={isOwnProfile}
            form={form}
            onFormChange={setForm}
            privacySettings={privacySettings}
            onPrivacyChange={setPrivacySettings}
          />
        </CardContent>
      </Card>

      <Card className="shadow-soft border-card-border">
        <CardHeader>
          <CardTitle className="text-lg">Skills &amp; Rate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProfileSkillsRate
            profile={profile}
            editing={editing}
            isOwnProfile={isOwnProfile}
            form={form}
            onFormChange={setForm}
            skillInput={skillInput}
            onSkillInputChange={setSkillInput}
          />
        </CardContent>
      </Card>

      {isOwnProfile && (
        <Card className="shadow-soft border-card-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Address</CardTitle>
            <ProfileAddressHeaderActions
              editing={editing}
              privacySettings={privacySettings}
              onPrivacyChange={setPrivacySettings}
            />
          </CardHeader>
          <CardContent className="space-y-4">
            <ProfileAddress
              editing={editing}
              address={address}
              onAddressChange={setAddress}
              privacySettings={privacySettings}
              onPrivacyChange={setPrivacySettings}
            />
          </CardContent>
        </Card>
      )}

      <ReviewSection profileId={profile.id} profileName={profile.full_name || 'User'} />

      {!isOwnProfile && (
        <ReportDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          reportedUserId={profile.id}
        />
      )}

      <PhotoLightbox
        photos={profilePhotos.filter((p) => p.storage_path).map((p) => getPhotoUrl(p.storage_path))}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
}


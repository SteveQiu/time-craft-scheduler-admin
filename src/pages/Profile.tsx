import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ReviewSection } from '@/components/ReviewSection';
import { ReportDialog } from '@/components/ReportDialog';
import { PhotoLightbox } from '@/components/PhotoLightbox';
import { ArrowLeft, Camera, Calendar } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useIsPremium } from '@/hooks/useIsPremium';
import { usePageTitle } from '@/context/PageTitleContext';
import { useProfileBranding } from '@/context/ProfileBrandingContext';
import { useProfile } from '@/hooks/useProfile';
import { useWorkplaceAddresses } from '@/hooks/useWorkplaceAddresses';
import { ProfileHeader } from './profile/ProfileHeader';
import { ProfileAbout } from './profile/ProfileAbout';
import { ProfileSocialLinks } from './profile/ProfileSocialLinks';
import { ProfileSkillsRate } from './profile/ProfileSkillsRate';
import { ProfileAddress, ProfileAddressHeaderActions } from './profile/ProfileAddress';
import { ProfilePhotos } from './profile/ProfilePhotos';
import { formatAddressDisplay } from '@/pages/settings/settingsUtils';
import type { FormState, PrivacySettings, SocialLinks } from './profile/types';

export default function Profile() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const { setTitle, resetTitle } = usePageTitle();
  const { setBranding, clearBranding } = useProfileBranding();
  const isOwnProfile = !slug;

  const [editing, setEditing] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    full_name: '',
    email: '',
    introduction: '',
    phone: '',
    slug: '',
    skills: [],
    hourly_rate: 0,
    profile_url: '',
    social_links: {},
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
    handlePhotoUpload,
    handlePhotoDelete,
    handleAvatarUpload,
    saveMutation,
    handleToggleBookmark,
    shareUrl,
    copyShareLink,
  } = useProfile({ slug, user, onSaveSuccess: () => setEditing(false) });

  const { addresses: savedAddresses } = useWorkplaceAddresses(user?.id);
  const { isPremium: viewedProfilePremium } = useIsPremium({ userId: profile?.id });

  useEffect(() => {
    if (!isOwnProfile && profile) {
      setBranding(profile.avatar_url ?? null, profile.full_name ?? null, viewedProfilePremium);
    }
    return () => {
      clearBranding();
    };
  }, [isOwnProfile, profile?.avatar_url, profile?.full_name, viewedProfilePremium, setBranding, clearBranding]);

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
        social_links: profile.social_links || {},
      });
      setPrivacySettings({
        address_public: profile.address_public ?? false,
        phone_public: profile.phone_public ?? false,
        email_public: profile.email_public ?? false,
        hourly_rate_public: profile.hourly_rate_public ?? true,
        skills_public: profile.skills_public ?? true,
      });
      setSkillInput('');
      setSelectedAddressId(profile.public_address_id ?? null);
    }
  }, [profile]);

  useEffect(() => {
    if (profile?.full_name) {
      setTitle(profile.full_name);
    } else {
      resetTitle();
    }

    return () => resetTitle();
  }, [profile?.full_name, resetTitle, setTitle]);

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

  const hasSocialLinks = Object.values((profile.social_links || {}) as SocialLinks).some(Boolean);
  const selectedWorkplace = savedAddresses.find((a) => a.id === selectedAddressId);
  const aboutAddressDisplay = isOwnProfile
    ? selectedWorkplace
      ? formatAddressDisplay(selectedWorkplace.address)
      : null
    : (profile.address ?? null);

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto min-h-full">
      {isOwnProfile && window.history.length > 1 && (
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      )}

      <Card className="shadow-md border-card-border">
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
            privacySettings={privacySettings}
            onPrivacyChange={setPrivacySettings}
            onEdit={() => setEditing(true)}
            onSave={() =>
              saveMutation.mutate({ form, public_address_id: selectedAddressId, privacySettings })
            }
            onCancelEdit={() => setEditing(false)}
            onCopyShare={copyShareLink}
            onToggleBookmark={handleToggleBookmark}
            onReport={() => setReportOpen(true)}
            onBrowse={() => navigate(`/browse/${profile.id}`)}
            onNavigateAuth={() =>
              navigate(`/auth?returnTo=${encodeURIComponent(window.location.pathname)}`)
            }
            onAvatarUpload={handleAvatarUpload}
          />
        </CardContent>
      </Card>

      {(profilePhotos.length > 0 || (isOwnProfile && editing)) && (
        <Card className="shadow-md border-card-border">
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

      <Card className="shadow-md border-card-border">
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
            addressDisplay={aboutAddressDisplay}
          />
        </CardContent>
      </Card>

      {(editing || hasSocialLinks) && (
        <Card className="shadow-md border-card-border">
          <CardHeader>
            <CardTitle className="text-lg">Social Media</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProfileSocialLinks
              profile={profile}
              editing={editing}
              form={form}
              onFormChange={setForm}
            />
          </CardContent>
        </Card>
      )}

      <Card className="shadow-md border-card-border">
        <CardHeader>
          <CardTitle className="text-lg">Services &amp; Rate</CardTitle>
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

      {isOwnProfile && editing && (
        <Card className="shadow-md border-card-border">
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
              selectedAddressId={selectedAddressId}
              onSelectedAddressChange={setSelectedAddressId}
              privacySettings={privacySettings}
              onPrivacyChange={setPrivacySettings}
              savedAddresses={savedAddresses}
            />
          </CardContent>
        </Card>
      )}

      <ReviewSection profileId={profile.id} profileName={profile.full_name || 'User'} />

      {!isOwnProfile && (
        <div className="flex justify-center py-6">
          <Button size="lg" onClick={() => navigate(`/browse/${profile.id}`)}>
            <Calendar className="h-5 w-5 mr-2" />
            Book Appointments
          </Button>
        </div>
      )}

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

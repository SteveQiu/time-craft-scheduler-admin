import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { ReviewSection } from '@/components/ReviewSection';
import { ReportDialog } from '@/components/ReportDialog';
import { Edit, Save, X, Mail, Phone, MapPin, Star, Flag, Share2, DollarSign, Wrench, Plus, Trash2, Calendar, Bookmark, ArrowLeft, Eye, EyeOff } from 'lucide-react';

interface ProfileData {
  id: string;
  full_name: string | null;
  email: string | null;
  introduction: string | null;
  phone: string | null;
  address: string | null;
  slug: string | null;
  avatar_url: string | null;
  skills: string[];
  hourly_rate: number;
  address_public?: boolean;
  phone_public?: boolean;
  email_public?: boolean;
  hourly_rate_public?: boolean;
  skills_public?: boolean;
}

interface AddressData {
  address_line_1: string;
  address_line_2: string;
  city: string;
  province_state: string;
  country: string;
  postal_code: string;
}

interface AddressVisibility {
  address_line_1: boolean;
  address_line_2: boolean;
  city: boolean;
  province_state: boolean;
  country: boolean;
  postal_code: boolean;
}

export default function Profile() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const [isBookmarked, setIsBookmarked] = useState(false);
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
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    introduction: '',
    phone: '',
    slug: '',
    skills: [] as string[],
    hourly_rate: 0,
  });
  const [privacySettings, setPrivacySettings] = useState({
    address_public: false,
    phone_public: false,
    email_public: false,
    hourly_rate_public: true,
    skills_public: true,
  });

  // Determine if viewing own profile or someone else's
  const isOwnProfile = !slug;
  const isUuid = slug ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug) : false;

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', slug, user?.id],
    queryFn: async () => {
      if (isOwnProfile) {
        if (!user) return null;
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        if (error) throw error;
        return data as unknown as ProfileData;
      } else if (isUuid) {
        const { data, error } = await supabase
          .rpc('get_public_profile_by_id', { profile_id: slug });
        if (error) throw error;
        if (!data || data.length === 0) return null;
        return data[0] as unknown as ProfileData;
      } else {
        const { data, error } = await supabase
          .rpc('get_public_profile', { profile_slug: slug });
        if (error) throw error;
        if (!data || data.length === 0) return null;
        return data[0] as unknown as ProfileData;
      }
    },
    enabled: isOwnProfile ? !!user : !!slug,
  });

  // Check if current profile is bookmarked
  useQuery({
    queryKey: ['bookmark-status', profile?.id, user?.id],
    queryFn: async () => {
      if (!user || !profile || isOwnProfile) return null;
      const { data, error } = await (supabase as any)
        .from('bookmarks')
        .select('id')
        .eq('user_id', user.id)
        .eq('bookmarked_user_id', profile.id)
        .single();
      if (!error && data) {
        setIsBookmarked(true);
      } else {
        setIsBookmarked(false);
      }
      return data;
    },
    enabled: !!user && !!profile && !isOwnProfile,
  });

  // Average rating for this profile
  const { data: avgRating } = useQuery({
    queryKey: ['avg-rating', profile?.id],
    queryFn: async () => {
      if (!profile) return null;
      const { data, error } = await supabase
        .from('reviews')
        .select('rating')
        .eq('reviewed_id', profile.id);
      if (error) return null;
      if (!data || data.length === 0) return null;
      const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
      return { avg: Math.round(avg * 10) / 10, count: data.length };
    },
    enabled: !!profile?.id,
  });

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
      });
      setPrivacySettings({
        address_public: profile.address_public ?? false,
        phone_public: profile.phone_public ?? false,
        email_public: profile.email_public ?? false,
        hourly_rate_public: profile.hourly_rate_public ?? true,
        skills_public: profile.skills_public ?? true,
      });
      setSkillInput('');
      
      // Load address from localStorage
      const savedAddress = localStorage.getItem(`address_${profile.id}`);
      if (savedAddress) {
        setAddress(JSON.parse(savedAddress));
      }
      
      // Load visibility preferences from localStorage
      const savedVisibility = localStorage.getItem(`addressVisibility_${profile.id}`);
      if (savedVisibility) {
        setAddressVisibility(JSON.parse(savedVisibility));
      }
    }
  }, [profile]);

  const saveAddressAndVisibility = () => {
    if (profile?.id) {
      localStorage.setItem(`address_${profile.id}`, JSON.stringify(address));
      localStorage.setItem(`addressVisibility_${profile.id}`, JSON.stringify(addressVisibility));
      toast({ title: 'Address visibility preferences saved' });
    }
  };

  const toggleFieldVisibility = (field: keyof AddressVisibility) => {
    const newVisibility = {
      ...addressVisibility,
      [field]: !addressVisibility[field],
    };
    setAddressVisibility(newVisibility);
    if (profile?.id) {
      localStorage.setItem(`addressVisibility_${profile.id}`, JSON.stringify(newVisibility));
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      // Format address from individual fields
      const formattedAddress = [
        address.address_line_1,
        address.address_line_2,
        address.city,
        address.province_state,
        address.country,
        address.postal_code,
      ]
        .filter(Boolean)
        .join(', ');

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: form.full_name || null,
          email: form.email || null,
          introduction: form.introduction || null,
          phone: form.phone || null,
          address: formattedAddress || null,
          slug: form.slug || null,
          skills: form.skills,
          hourly_rate: form.hourly_rate,
          address_public: privacySettings.address_public,
          phone_public: privacySettings.phone_public,
          email_public: privacySettings.email_public,
          hourly_rate_public: privacySettings.hourly_rate_public,
          skills_public: privacySettings.skills_public,
        } as any)
        .eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', slug, user?.id] });
      setEditing(false);
      toast({ title: 'Profile updated' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const handleToggleBookmark = async () => {
    if (!user || !profile || isOwnProfile) return;
    try {
      if (isBookmarked) {
        const { error } = await (supabase as any)
          .from('bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('bookmarked_user_id', profile.id);
        if (error) throw error;
        setIsBookmarked(false);
        toast({ title: 'Removed from bookmarks' });
      } else {
        const { error } = await (supabase as any)
          .from('bookmarks')
          .insert({
            user_id: user.id,
            bookmarked_user_id: profile.id,
          });
        if (error) throw error;
        setIsBookmarked(true);
        toast({ title: 'Added to bookmarks' });
      }
      queryClient.invalidateQueries({ queryKey: ['bookmarks', user.id] });
    } catch (error) {
      toast({ title: 'Error', description: (error as any).message, variant: 'destructive' });
    }
  };

  const shareUrl = profile?.slug
    ? `${window.location.origin}/profile/${profile.slug}`
    : null;

  const copyShareLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      toast({ title: 'Link copied!' });
    }
  };

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

  const initials = (profile.full_name || profile.email || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      {/* Back Button */}
      {window.history.length > 1 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      )}

      {/* Profile Header */}
      <Card className="shadow-soft border-card-border">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
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
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    placeholder="Full name"
                    className="text-xl font-bold mb-1"
                  />
                ) : (
                  <h2 className="text-2xl font-bold text-foreground">
                    {profile.full_name || 'No name set'}
                  </h2>
                )}
                <p className="text-muted-foreground">{profile.email}</p>
                {avgRating && (
                  <div className="flex items-center space-x-1 mt-1">
                    <Star className="h-4 w-4 text-warning fill-current" />
                    <span className="text-sm font-medium">{avgRating.avg}</span>
                    <span className="text-sm text-muted-foreground">({avgRating.count} reviews)</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {shareUrl && (
                <Button variant="outline" size="sm" onClick={copyShareLink}>
                  <Share2 className="h-4 w-4 mr-1" />
                  Share
                </Button>
              )}
              {!isOwnProfile && user && (
                <>
                  <Button variant="outline" size="sm" onClick={() => navigate(`/browse/${profile.id}`)}>
                    <Calendar className="h-4 w-4 mr-1" />
                    Browse
                  </Button>
                  <Button 
                    variant={isBookmarked ? "default" : "outline"} 
                    size="sm" 
                    onClick={handleToggleBookmark}
                  >
                    <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setReportOpen(true)}>
                    <Flag className="h-4 w-4" />
                  </Button>
                </>
              )}
              {isOwnProfile && !editing && (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
              {isOwnProfile && editing && (
                <>
                  <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Details */}
      <Card className="shadow-soft border-card-border">
        <CardHeader>
          <CardTitle className="text-lg">About</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <>
              <div className="space-y-2">
                <Label>Introduction</Label>
                <Textarea
                  value={form.introduction}
                  onChange={(e) => setForm({ ...form, introduction: e.target.value })}
                  placeholder="Tell people about yourself..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Email</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPrivacySettings({ ...privacySettings, email_public: !privacySettings.email_public })}
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
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="your@email.com"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Phone</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPrivacySettings({ ...privacySettings, phone_public: !privacySettings.phone_public })}
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
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div className="space-y-2">
                <Label>Profile Alias</Label>
                <div className="flex items-center space-x-0">
                  <span className="text-sm text-muted-foreground px-3 py-2 bg-muted rounded-l-md border border-r-0 border-input min-w-24 flex items-center justify-center">/profile/</span>
                  <Input
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    placeholder="my-profile"
                    className="rounded-l-none"
                  />
                </div>
              </div>

            </>
          ) : (
            <>
              {profile.introduction && (
                <p className="text-foreground">{profile.introduction}</p>
              )}
              <div className="space-y-2">
                {profile.email && (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{profile.email}</span>
                  </div>
                )}
                {profile.phone && (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{profile.phone}</span>
                  </div>
                )}
                {profile.address && (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{profile.address}</span>
                  </div>
                )}
              </div>
              {!profile.introduction && !profile.phone && !profile.address && isOwnProfile && (
                <p className="text-sm text-muted-foreground">
                  Click "Edit" to add your introduction, contact info, and address.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Skills & Rate Section */}
      <Card className="shadow-soft border-card-border">
        <CardHeader>
          <CardTitle className="text-lg">Skills & Rate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <>
              <div className="space-y-3">
                <Label>Skills</Label>
                <div className="space-y-3">
                  {/* Input + Add Button */}
                  <div className="flex gap-2">
                    <Input
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (skillInput.trim() && !form.skills.includes(skillInput.trim())) {
                            setForm({
                              ...form,
                              skills: [...form.skills, skillInput.trim()]
                            });
                            setSkillInput('');
                          }
                        }
                      }}
                      placeholder="Add a skill (press Enter or click +)"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        if (skillInput.trim() && !form.skills.includes(skillInput.trim())) {
                          setForm({
                            ...form,
                            skills: [...form.skills, skillInput.trim()]
                          });
                          setSkillInput('');
                        }
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Skills List */}
                  <div className="space-y-2">
                    {form.skills.map((skill) => (
                      <div
                        key={skill}
                        className="flex items-center justify-between bg-secondary p-3 rounded-md"
                      >
                        <span className="text-sm font-medium">{skill}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setForm({
                              ...form,
                              skills: form.skills.filter(s => s !== skill)
                            });
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {form.skills.length === 0 && (
                    <p className="text-sm text-muted-foreground">No skills added yet</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Hourly Rate ($)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.hourly_rate}
                  onChange={(e) => setForm({ ...form, hourly_rate: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </>
          ) : (
            <>
              {profile.skills && profile.skills.length > 0 ? (
                <div className="flex items-start space-x-2">
                  <Wrench className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill) => (
                      <Badge key={skill} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                </div>
              ) : isOwnProfile ? (
                <p className="text-sm text-muted-foreground">No skills set. Click "Edit" to add your skills.</p>
              ) : null}
              {profile.hourly_rate > 0 && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>${profile.hourly_rate}/hour</span>
                </div>
              )}
              {(!profile.hourly_rate || profile.hourly_rate === 0) && isOwnProfile && (
                <p className="text-sm text-muted-foreground">No hourly rate set. Click "Edit" to set your rate.</p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Address Section */}
      {isOwnProfile && (
        <Card className="shadow-soft border-card-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Address</CardTitle>
            {editing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const allVisible = Object.values(addressVisibility).every(v => v);
                  setAddressVisibility({
                    address_line_1: !allVisible,
                    address_line_2: !allVisible,
                    city: !allVisible,
                    province_state: !allVisible,
                    country: !allVisible,
                    postal_code: !allVisible,
                  });
                }}
              >
                {Object.values(addressVisibility).every(v => v) ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {editing ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Address Line 1</Label>
                    <Input
                      value={address.address_line_1}
                      onChange={(e) => setAddress({ ...address, address_line_1: e.target.value })}
                      placeholder="123 Main Street"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Address Line 2</Label>
                    <Input
                      value={address.address_line_2}
                      onChange={(e) => setAddress({ ...address, address_line_2: e.target.value })}
                      placeholder="Suite 100 (optional)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input
                      value={address.city}
                      onChange={(e) => setAddress({ ...address, city: e.target.value })}
                      placeholder="Toronto"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Province/State</Label>
                    <Input
                      value={address.province_state}
                      onChange={(e) => setAddress({ ...address, province_state: e.target.value })}
                      placeholder="Ontario"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Input
                      value={address.country}
                      onChange={(e) => setAddress({ ...address, country: e.target.value })}
                      placeholder="Canada"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Postal Code</Label>
                    <Input
                      value={address.postal_code}
                      onChange={(e) => setAddress({ ...address, postal_code: e.target.value })}
                      placeholder="M5V 3A8"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full mt-4"
                  onClick={saveAddressAndVisibility}
                >
                  Save Address
                </Button>
              </>
            ) : (
              <>
                {address.address_line_1 || address.city || address.country ? (
                  <div className="space-y-3">
                    {address.address_line_1 && addressVisibility.address_line_1 && (
                      <div className="flex items-start space-x-2">
                        <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm text-foreground">{address.address_line_1}</span>
                      </div>
                    )}
                    {address.address_line_2 && addressVisibility.address_line_2 && (
                      <div className="flex items-start space-x-2">
                        <div className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-foreground">{address.address_line_2}</span>
                      </div>
                    )}
                    {(address.city || address.province_state || address.country) && (
                      <div className="flex items-start space-x-2">
                        <div className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-foreground">
                          {[
                            addressVisibility.city ? address.city : null,
                            addressVisibility.province_state ? address.province_state : null,
                            addressVisibility.country ? address.country : null,
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      </div>
                    )}
                    {address.postal_code && addressVisibility.postal_code && (
                      <div className="flex items-start space-x-2">
                        <div className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-foreground">{address.postal_code}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Click "Edit" to add your address information.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reviews Section */}
      <ReviewSection profileId={profile.id} profileName={profile.full_name || 'User'} />

      {/* Report Dialog */}
      {!isOwnProfile && (
        <ReportDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          reportedUserId={profile.id}
        />
      )}
    </div>
  );
}

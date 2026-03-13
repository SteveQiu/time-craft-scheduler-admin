import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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
import { Edit, Save, X, Mail, Phone, MapPin, Star, Flag, Share2, DollarSign, Wrench } from 'lucide-react';

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
}

export default function Profile() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    introduction: '',
    phone: '',
    address: '',
    slug: '',
    skills: '' as string,
    hourly_rate: 0,
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
        address: profile.address || '',
        slug: profile.slug || '',
        skills: (profile.skills || []).join(', '),
        hourly_rate: profile.hourly_rate || 0,
      });
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const skillsArray = form.skills
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: form.full_name || null,
          email: form.email || null,
          introduction: form.introduction || null,
          phone: form.phone || null,
          address: form.address || null,
          slug: form.slug || null,
          skills: skillsArray,
          hourly_rate: form.hourly_rate,
        } as any)
        .eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setEditing(false);
      toast({ title: 'Profile updated' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

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
      {/* Profile Header */}
      <Card className="shadow-soft border-card-border">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
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
                <Button variant="ghost" size="sm" onClick={() => setReportOpen(true)}>
                  <Flag className="h-4 w-4" />
                </Button>
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
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="your@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="123 Main St, City"
                />
              </div>
              <div className="space-y-2">
                <Label>Profile URL Slug</Label>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">/profile/</span>
                  <Input
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    placeholder="my-profile"
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
              <div className="space-y-2">
                <Label>Skills (comma-separated)</Label>
                <Input
                  value={form.skills}
                  onChange={(e) => setForm({ ...form, skills: e.target.value })}
                  placeholder="e.g. Hair Cut, Massage, Consultation"
                />
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

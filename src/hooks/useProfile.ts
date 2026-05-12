import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@supabase/supabase-js';
import type { ProfileData, SaveProfileVariables } from '@/pages/profile/types';

interface UseProfileOptions {
  slug: string | undefined;
  user: User | null;
  onSaveSuccess?: () => void;
}

export function useProfile({ slug, user, onSaveSuccess }: UseProfileOptions) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isBookmarked, setIsBookmarked] = useState(false);

  const isOwnProfile = !slug;
  const isUuid = slug
    ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)
    : false;

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

  const { data: profilePhotos = [], refetch: refetchPhotos } = useQuery({
    queryKey: ['profile-photos', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await (supabase as any)
        .from('profile_photos')
        .select('id, storage_path, display_order')
        .eq('user_id', profile.id)
        .order('display_order', { ascending: true });
      if (error) return [];
      return data as { id: string; storage_path: string; display_order: number }[];
    },
    enabled: !!profile?.id,
  });

  const getPhotoUrl = (storagePath: string) =>
    supabase.storage.from('profile-photos').getPublicUrl(storagePath).data.publicUrl;

  const handlePhotoUpload = async (file: File) => {
    if (!user || !profile) return;
    const ext = file.name.split('.').pop();
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('profile-photos')
      .upload(path, file);
    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      toast({ title: 'Upload failed', description: uploadError.message, variant: 'destructive' });
      return;
    }
    const nextOrder =
      profilePhotos.length > 0
        ? Math.max(...profilePhotos.map((p) => p.display_order)) + 1
        : 0;
    const { error: dbError } = await (supabase as any)
      .from('profile_photos')
      .insert({ user_id: user.id, storage_path: path, display_order: nextOrder });
    if (dbError) {
      console.error('DB insert error:', dbError);
      toast({ title: 'Save failed', description: dbError.message, variant: 'destructive' });
      return;
    }
    refetchPhotos();
  };

  const handlePhotoDelete = async (photoId: string, storagePath: string) => {
    await supabase.storage.from('profile-photos').remove([storagePath]);
    await (supabase as any).from('profile_photos').delete().eq('id', photoId);
    refetchPhotos();
  };

  const saveMutation = useMutation({
    mutationFn: async ({ form, address, privacySettings }: SaveProfileVariables) => {
      if (!user) throw new Error('Not authenticated');
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
          profile_url: form.profile_url || null,
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
      toast({ title: 'Profile updated' });
      onSaveSuccess?.();
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
          .insert({ user_id: user.id, bookmarked_user_id: profile.id });
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

  return {
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
  };
}

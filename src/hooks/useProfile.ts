import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@supabase/supabase-js';
import type { ProfileData, SaveProfileVariables } from '@/pages/profile/types';
import { useLocalBookmarks } from '@/hooks/useLocalBookmarks';

interface UseProfileOptions {
  slug: string | undefined;
  user: User | null;
  onSaveSuccess?: () => void;
}

export function useProfile({ slug, user, onSaveSuccess }: UseProfileOptions) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const localBookmarks = useLocalBookmarks();

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
    queryKey: ['bookmark-status', profile?.id, user?.id, localBookmarks.localBookmarkIds],
    queryFn: async () => {
      if (isOwnProfile) return null;
      if (!user) {
        if (profile?.id) {
          setIsBookmarked(localBookmarks.hasLocalBookmark(profile.id));
        }
        return null;
      }
      if (!profile) return null;
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
    enabled: !!profile && !isOwnProfile,
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

  const compressImage = (file: File): Promise<File> =>
    new Promise((resolve, reject) => {
      const MAX_DIM = 1048;
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width >= height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context unavailable'));
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('toBlob returned null'));
            const baseName = file.name.replace(/\.[^.]+$/, '');
            resolve(new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' }));
          },
          'image/jpeg',
          0.85,
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Image failed to load'));
      };
      img.src = url;
    });

  const handlePhotoUpload = async (file: File) => {
    if (!user || !profile) return;
    const compressed = await compressImage(file);
    const path = `${user.id}/${crypto.randomUUID()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from('profile-photos')
      .upload(path, compressed);
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

  const handleAvatarUpload = async (file: File) => {
    if (!user || !profile) return;

    try {
      const compressed = await compressImage(file);
      const path = `${user.id}/avatar-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(path, compressed);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('profile-photos').getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      if (profile.avatar_url) {
        const oldPath = profile.avatar_url.split('/profile-photos/')[1];
        if (oldPath) {
          supabase.storage.from('profile-photos').remove([oldPath]).catch(() => {});
        }
      }

      const { error: dbError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl } as any)
        .eq('id', user.id);

      if (dbError) {
        await supabase.storage.from('profile-photos').remove([path]);
        throw dbError;
      }

      queryClient.invalidateQueries({ queryKey: ['profile', slug, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['browse-openings'] });
      queryClient.invalidateQueries({ queryKey: ['bookmarks-with-details'] });
      toast({ title: 'Profile picture updated' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    }
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
          introduction: form.introduction || null,
          phone: form.phone || null,
          address: formattedAddress || null,
          slug: form.slug || null,
          skills: form.skills,
          hourly_rate: form.hourly_rate,
          profile_url: form.profile_url || null,
          social_links: form.social_links || {},
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
      queryClient.invalidateQueries({ queryKey: ['own-profile-for-openings', user?.id] });
      toast({ title: 'Profile updated' });
      onSaveSuccess?.();
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const handleToggleBookmark = async () => {
    if (!profile || isOwnProfile) return;
    
    if (!user) {
      if (localBookmarks.hasLocalBookmark(profile.id)) {
        localBookmarks.removeLocalBookmark(profile.id);
        setIsBookmarked(false);
        toast({ title: 'Removed from local bookmarks' });
      } else {
        localBookmarks.addLocalBookmark(profile.id);
        setIsBookmarked(true);
        toast({
          title: 'Saved to your bookmark list',
          description: 'Sign in to save to your account.',
        });
      }
      return;
    }

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
    : profile?.id
      ? `${window.location.origin}/profile/${profile.id}`
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
    handleAvatarUpload,
    saveMutation,
    handleToggleBookmark,
    shareUrl,
    copyShareLink,
  };
}

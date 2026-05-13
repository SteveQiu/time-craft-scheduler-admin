import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PhotoLightbox } from './PhotoLightbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Props {
  userId: string;
  /** Thumbnail size class, defaults to 'w-16 h-16' */
  thumbClass?: string;
}

const PREVIEW_COUNT = 3;

export function ProviderPhotoStrip({ userId, thumbClass = 'w-16 h-16' }: Props) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [photoGridOpen, setPhotoGridOpen] = useState(false);

  const { data: photoUrls = [] } = useQuery({
    queryKey: ['provider-photos', userId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('profile_photos')
        .select('storage_path, display_order')
        .eq('user_id', userId)
        .order('display_order', { ascending: true });
      return (data || []).map((p: { storage_path: string }) => {
        const { data: urlData } = supabase.storage
          .from('profile-photos')
          .getPublicUrl(p.storage_path);
        return urlData.publicUrl;
      });
    },
    enabled: !!userId,
  });

  const { data: isPremium = false } = useQuery({
    queryKey: ['provider-premium', userId],
    queryFn: async () => {
      const { data } = await (supabase as any).rpc('is_user_premium', { p_user_id: userId });
      return Boolean(data);
    },
    enabled: !!userId,
  });

  if (photoUrls.length === 0) return null;

  const showMoreButton = photoUrls.length > PREVIEW_COUNT;
  const visiblePhotos = showMoreButton ? photoUrls.slice(0, PREVIEW_COUNT) : photoUrls;
  const hiddenCount = photoUrls.length - PREVIEW_COUNT;

  const open = (idx: number) => { setLightboxIndex(idx); setLightboxOpen(true); };

  return (
    <>
      <div className="flex gap-2 flex-wrap items-center">
        {visiblePhotos.map((url, idx) => (
          <img
            key={idx}
            src={url}
            alt={`Provider photo ${idx + 1}`}
            className={`${thumbClass} object-cover rounded-lg cursor-pointer hover:opacity-80 hover:ring-2 hover:ring-primary transition-all`}
            onClick={() => open(idx)}
          />
        ))}
        {showMoreButton && (
          <button
            className={`${thumbClass} rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/20 flex flex-col items-center justify-center text-primary font-semibold transition-colors cursor-pointer`}
            onClick={() => setPhotoGridOpen(true)}
            aria-label={`View ${hiddenCount} more photos`}
          >
            <span className="text-lg leading-none">+{hiddenCount}</span>
            <span className="text-[10px] mt-0.5 leading-none">more</span>
          </button>
        )}
      </div>
      <Dialog open={photoGridOpen} onOpenChange={setPhotoGridOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Photos ({photoUrls.length})</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {photoUrls.map((url, idx) => (
              <img
                key={idx}
                src={url}
                alt={`Provider photo ${idx + 1}`}
                className="w-full aspect-square object-cover rounded-lg cursor-pointer hover:opacity-80 hover:ring-2 hover:ring-primary transition-all"
                onClick={() => { setPhotoGridOpen(false); open(idx); }}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
      <PhotoLightbox
        photos={photoUrls}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}

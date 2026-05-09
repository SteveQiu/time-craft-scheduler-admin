import React, { useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface PhotoLightboxProps {
  photos: string[];        // array of image URLs
  initialIndex: number;
  open: boolean;
  onClose: () => void;
}

export function PhotoLightbox({ photos, initialIndex, open, onClose }: PhotoLightboxProps) {
  const [current, setCurrent] = React.useState(initialIndex);

  // Sync when reopened on a different photo
  useEffect(() => {
    if (open) setCurrent(initialIndex);
  }, [open, initialIndex]);

  const prev = useCallback(() => setCurrent(i => (i - 1 + photos.length) % photos.length), [photos.length]);
  const next = useCallback(() => setCurrent(i => (i + 1) % photos.length), [photos.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, prev, next]);

  if (!open || photos.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      {/* Close */}
      <button
        className="absolute top-4 right-4 text-white/80 hover:text-white p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors"
        onClick={onClose}
        aria-label="Close"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Prev */}
      {photos.length > 1 && (
        <button
          className="absolute left-4 text-white/80 hover:text-white p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors"
          onClick={e => { e.stopPropagation(); prev(); }}
          aria-label="Previous"
        >
          <ChevronLeft className="h-8 w-8" />
        </button>
      )}

      {/* Image */}
      <img
        src={photos[current]}
        alt={`Photo ${current + 1}`}
        className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
        onClick={e => e.stopPropagation()}
      />

      {/* Next */}
      {photos.length > 1 && (
        <button
          className="absolute right-4 text-white/80 hover:text-white p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors"
          onClick={e => { e.stopPropagation(); next(); }}
          aria-label="Next"
        >
          <ChevronRight className="h-8 w-8" />
        </button>
      )}

      {/* Dot indicators */}
      {photos.length > 1 && (
        <div className="absolute bottom-6 flex gap-2">
          {photos.map((_, i) => (
            <button
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${i === current ? 'bg-white' : 'bg-white/40'}`}
              onClick={e => { e.stopPropagation(); setCurrent(i); }}
              aria-label={`Go to photo ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, X, Plus } from 'lucide-react';

interface Photo {
  id: string;
  storage_path: string;
  display_order: number;
}

interface ProfilePhotosProps {
  profilePhotos: Photo[];
  isOwnProfile: boolean;
  editing: boolean;
  isPremium: boolean;
  getPhotoUrl: (storagePath: string) => string;
  onPhotoUpload: (file: File) => Promise<void>;
  onPhotoDelete: (photoId: string, storagePath: string) => Promise<void>;
  onOpenLightbox: (index: number) => void;
}

export function ProfilePhotos({
  profilePhotos,
  isOwnProfile,
  editing,
  isPremium,
  getPhotoUrl,
  onPhotoUpload,
  onPhotoDelete,
  onOpenLightbox,
}: ProfilePhotosProps) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingSlot, setUploadingSlot] = useState(false);

  const maxSlots = isPremium ? 10 : 3;
  const canAddMore = profilePhotos.length < maxSlots;

  return (
    <div className="flex flex-wrap gap-3">
      {profilePhotos.map((photo, idx) => (
        <div key={photo.id} className="relative w-24 h-24 rounded-lg overflow-hidden bg-muted">
          {photo.storage_path ? (
            <img
              src={getPhotoUrl(photo.storage_path)}
              alt="Profile photo"
              className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => onOpenLightbox(idx)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Camera className="h-6 w-6 text-muted-foreground opacity-40" />
            </div>
          )}
          {isOwnProfile && editing && (
            <button
              className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white hover:bg-black/80"
              onClick={() => onPhotoDelete(photo.id, photo.storage_path)}
              aria-label="Remove photo"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}

      {isOwnProfile && editing && (
        <>
          {canAddMore && (
            <button
              className="w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary/50 hover:bg-muted/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingSlot}
              aria-label="Upload photo"
            >
              <Camera className="h-6 w-6 text-muted-foreground opacity-40" />
            </button>
          )}
          {!isPremium && !canAddMore && (
            <button
              className="w-24 h-24 rounded-lg border-2 border-dashed border-amber-400/60 flex flex-col items-center justify-center gap-1 hover:bg-amber-50 transition-colors"
              onClick={() => navigate('/settings?tab=subscription')}
              title="Upgrade to Premium to add more photos"
              aria-label="Upgrade to add more photos"
            >
              <Plus className="h-6 w-6 text-amber-500" />
              <span className="text-xs text-amber-600 font-medium text-center leading-tight px-1">
                Upgrade
              </span>
            </button>
          )}
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setUploadingSlot(true);
          await onPhotoUpload(file);
          setUploadingSlot(false);
          e.target.value = '';
        }}
      />
    </div>
  );
}

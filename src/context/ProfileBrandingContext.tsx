import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

interface ProfileBranding {
  avatarUrl: string | null;
  providerName: string | null;
}

interface ProfileBrandingContextValue extends ProfileBranding {
  setBranding: (avatarUrl: string | null, providerName: string | null) => void;
  clearBranding: () => void;
}

const ProfileBrandingContext = createContext<ProfileBrandingContextValue>({
  avatarUrl: null,
  providerName: null,
  setBranding: () => {},
  clearBranding: () => {},
});

export function ProfileBrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBrandingState] = useState<ProfileBranding>({ avatarUrl: null, providerName: null });

  const setBranding = useCallback((avatarUrl: string | null, providerName: string | null) => {
    setBrandingState({ avatarUrl, providerName });
  }, []);

  const clearBranding = useCallback(() => {
    setBrandingState({ avatarUrl: null, providerName: null });
  }, []);

  return (
    <ProfileBrandingContext.Provider value={{ ...branding, setBranding, clearBranding }}>
      {children}
    </ProfileBrandingContext.Provider>
  );
}

export function useProfileBranding() {
  return useContext(ProfileBrandingContext);
}

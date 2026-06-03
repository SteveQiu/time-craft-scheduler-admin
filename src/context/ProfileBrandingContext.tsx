import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

interface ProfileBranding {
  avatarUrl: string | null;
  providerName: string | null;
  isPremium: boolean;
}

interface ProfileBrandingContextValue extends ProfileBranding {
  setBranding: (avatarUrl: string | null, providerName: string | null, isPremium?: boolean) => void;
  clearBranding: () => void;
}

const ProfileBrandingContext = createContext<ProfileBrandingContextValue>({
  avatarUrl: null,
  providerName: null,
  isPremium: false,
  setBranding: () => {},
  clearBranding: () => {},
});

export function ProfileBrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBrandingState] = useState<ProfileBranding>({ avatarUrl: null, providerName: null, isPremium: false });

  const setBranding = useCallback((avatarUrl: string | null, providerName: string | null, isPremium = false) => {
    setBrandingState({ avatarUrl, providerName, isPremium });
  }, []);

  const clearBranding = useCallback(() => {
    setBrandingState({ avatarUrl: null, providerName: null, isPremium: false });
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

import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ROUTES } from '@/config/routes';
import { MapPin, Eye, EyeOff } from 'lucide-react';
import type { WorkplaceAddress } from '@/pages/settings/types';
import { formatAddressDisplay } from '@/pages/settings/settingsUtils';
import type { PrivacySettings } from './types';

interface ProfileAddressProps {
  editing: boolean;
  selectedAddressId: string | null;
  onSelectedAddressChange: (id: string | null) => void;
  privacySettings: PrivacySettings;
  onPrivacyChange: (settings: PrivacySettings) => void;
  savedAddresses?: WorkplaceAddress[];
}

export function ProfileAddress({
  editing,
  selectedAddressId,
  onSelectedAddressChange,
  privacySettings,
  onPrivacyChange: _onPrivacyChange,
  savedAddresses = [],
}: ProfileAddressProps) {
  const selectedSavedAddress = savedAddresses.find((a) => a.id === selectedAddressId);

  if (editing) {
    if (savedAddresses.length === 0) {
      return (
        <div className="space-y-2 rounded-md border border-dashed p-4">
          <p className="text-sm text-muted-foreground">No saved addresses. Add one in Settings.</p>
          <Button asChild variant="link" className="h-auto justify-start p-0">
            <Link to={`${ROUTES.settings}?tab=addresses`}>Go to Settings</Link>
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <Select
          value={selectedAddressId ?? undefined}
          onValueChange={(value) => onSelectedAddressChange(value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Use saved address" />
          </SelectTrigger>
          <SelectContent>
            {savedAddresses.map((addr) => (
              <SelectItem key={addr.id} value={addr.id}>
                {addr.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (privacySettings.address_public && selectedSavedAddress) {
    return (
      <div className="space-y-3">
        <div className="flex items-start space-x-2">
          <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
          <span className="text-sm text-foreground">
            {formatAddressDisplay(selectedSavedAddress.address)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <p className="text-sm text-muted-foreground">
      Click &quot;Edit&quot; to add your address information.
    </p>
  );
}

interface ProfileAddressHeaderActionsProps {
  editing: boolean;
  privacySettings: PrivacySettings;
  onPrivacyChange: (settings: PrivacySettings) => void;
}

export function ProfileAddressHeaderActions({
  editing,
  privacySettings,
  onPrivacyChange,
}: ProfileAddressHeaderActionsProps) {
  if (!editing) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-11 w-11"
      onClick={() =>
        onPrivacyChange({ ...privacySettings, address_public: !privacySettings.address_public })
      }
      aria-label={
        privacySettings.address_public
          ? 'Hide address from public profile'
          : 'Show address on public profile'
      }
    >
      {privacySettings.address_public ? (
        <Eye className="h-4 w-4" />
      ) : (
        <EyeOff className="h-4 w-4" />
      )}
    </Button>
  );
}

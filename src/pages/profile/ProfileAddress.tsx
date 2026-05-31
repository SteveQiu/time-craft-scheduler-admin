import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ROUTES } from '@/config/routes';
import { MapPin, Eye, EyeOff } from 'lucide-react';
import type { WorkplaceAddress } from '@/pages/settings/types';
import { parseAddress } from '@/pages/settings/settingsUtils';
import type { AddressData, PrivacySettings } from './types';

interface ProfileAddressProps {
  editing: boolean;
  address: AddressData;
  onAddressChange: (address: AddressData) => void;
  privacySettings: PrivacySettings;
  onPrivacyChange: (settings: PrivacySettings) => void;
  savedAddresses?: WorkplaceAddress[];
}

export function ProfileAddress({
  editing,
  address,
  onAddressChange,
  privacySettings,
  onPrivacyChange,
  savedAddresses = [],
}: ProfileAddressProps) {
  const selectedSavedAddress = savedAddresses.find((savedAddress) => {
    const parsed = parseAddress(savedAddress.address);
    return (
      parsed.address_line_1 === address.address_line_1 &&
      parsed.address_line_2 === address.address_line_2 &&
      parsed.city === address.city &&
      parsed.province === address.province_state &&
      parsed.country === address.country &&
      parsed.zip === address.postal_code
    );
  });

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
          value={selectedSavedAddress?.address}
          onValueChange={(value) => {
            try {
              const parsed = parseAddress(value);
              onAddressChange({
                address_line_1: parsed.address_line_1,
                address_line_2: parsed.address_line_2,
                city: parsed.city,
                province_state: parsed.province,
                country: parsed.country,
                postal_code: parsed.zip,
              });
            } catch {}
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Use saved address" />
          </SelectTrigger>
          <SelectContent>
            {savedAddresses.map((addr) => (
              <SelectItem key={addr.id} value={addr.address}>
                {addr.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  const hasAddress = address.address_line_1 || address.city || address.country;

  if (privacySettings.address_public && hasAddress) {
    return (
      <div className="space-y-3">
        {address.address_line_1 && (
          <div className="flex items-start space-x-2">
            <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-foreground">{address.address_line_1}</span>
          </div>
        )}
        {address.address_line_2 && (
          <div className="flex items-start space-x-2">
            <div className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span className="text-sm text-foreground">{address.address_line_2}</span>
          </div>
        )}
        {(address.city || address.province_state || address.country) && (
          <div className="flex items-start space-x-2">
            <div className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span className="text-sm text-foreground">
              {[address.city, address.province_state, address.country].filter(Boolean).join(', ')}
            </span>
          </div>
        )}
        {address.postal_code && (
          <div className="flex items-start space-x-2">
            <div className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span className="text-sm text-foreground">{address.postal_code}</span>
          </div>
        )}
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

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Eye, EyeOff } from 'lucide-react';
import type { AddressData, PrivacySettings } from './types';

interface ProfileAddressProps {
  editing: boolean;
  address: AddressData;
  onAddressChange: (address: AddressData) => void;
  privacySettings: PrivacySettings;
  onPrivacyChange: (settings: PrivacySettings) => void;
}

export function ProfileAddress({
  editing,
  address,
  onAddressChange,
  privacySettings,
  onPrivacyChange,
}: ProfileAddressProps) {
  if (editing) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2 md:col-span-2">
          <Label>Address Line 1</Label>
          <Input
            value={address.address_line_1}
            onChange={(e) => onAddressChange({ ...address, address_line_1: e.target.value })}
            placeholder="123 Main Street"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Address Line 2</Label>
          <Input
            value={address.address_line_2}
            onChange={(e) => onAddressChange({ ...address, address_line_2: e.target.value })}
            placeholder="Suite 100 (optional)"
          />
        </div>
        <div className="space-y-2">
          <Label>City</Label>
          <Input
            value={address.city}
            onChange={(e) => onAddressChange({ ...address, city: e.target.value })}
            placeholder="Toronto"
          />
        </div>
        <div className="space-y-2">
          <Label>Province/State</Label>
          <Input
            value={address.province_state}
            onChange={(e) => onAddressChange({ ...address, province_state: e.target.value })}
            placeholder="Ontario"
          />
        </div>
        <div className="space-y-2">
          <Label>Country</Label>
          <Input
            value={address.country}
            onChange={(e) => onAddressChange({ ...address, country: e.target.value })}
            placeholder="Canada"
          />
        </div>
        <div className="space-y-2">
          <Label>Postal Code</Label>
          <Input
            value={address.postal_code}
            onChange={(e) => onAddressChange({ ...address, postal_code: e.target.value })}
            placeholder="M5V 3A8"
          />
        </div>
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

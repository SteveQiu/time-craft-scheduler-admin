import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { COUNTRIES, PROVINCES_BY_COUNTRY } from '@/lib/address';
import {
  EMPTY_LOCATION_PREFERENCE,
  persistLocationPreference,
  type LocationPreference,
} from '@/lib/locationPreference';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface LocationSetupScreenProps {
  userId: string;
  onComplete: () => void;
}

export function LocationSetupScreen({ userId, onComplete }: LocationSetupScreenProps) {
  const { toast } = useToast();
  const [locationPref, setLocationPref] = useState<LocationPreference>(EMPTY_LOCATION_PREFERENCE);
  const [isSaving, setIsSaving] = useState(false);

  const handleContinue = async () => {
    setIsSaving(true);
    try {
      await persistLocationPreference(userId, locationPref);
      onComplete();
    } catch (error) {
      toast({
        title: 'Location is required',
        description: error instanceof Error ? error.message : 'Please select a province/state and country.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center p-6 z-50">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-3xl shadow-2xl p-8 md:p-12 space-y-8">
        <div className="space-y-4 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
            <MapPin className="h-7 w-7 text-black" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Set your location</h1>
          <p className="text-base md:text-lg text-gray-700">
            We use this to show appointments near you and keep Browse results focused.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-black">Country</Label>
            <Select
              value={locationPref.country}
              onValueChange={(country) =>
                setLocationPref((prev) => ({ ...prev, country, province: '' }))
              }
            >
              <SelectTrigger className="bg-white border-gray-300 text-black">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((country) => (
                  <SelectItem key={country} value={country}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-black">Province / State</Label>
            <Select
              value={locationPref.province}
              onValueChange={(province) =>
                setLocationPref((prev) => ({ ...prev, province }))
              }
              disabled={!locationPref.country}
            >
              <SelectTrigger className="bg-white border-gray-300 text-black">
                <SelectValue placeholder={locationPref.country ? 'Select province / state' : 'Select country first'} />
              </SelectTrigger>
              <SelectContent>
                {(PROVINCES_BY_COUNTRY[locationPref.country] ?? []).map((province) => (
                  <SelectItem key={province} value={province}>
                    {province}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          type="button"
          onClick={handleContinue}
          disabled={isSaving || !locationPref.province.trim() || !locationPref.country}
          className="w-full h-12 text-base"
        >
          {isSaving ? 'Saving...' : 'Continue'}
        </Button>
      </div>
    </div>
  );
}

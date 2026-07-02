import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin } from 'lucide-react';
import { COUNTRIES, PROVINCES_BY_COUNTRY } from '@/lib/address';
import {
  EMPTY_LOCATION_PREFERENCE,
  readLocationPreference,
  fetchLocationPreference,
  persistLocationPreference,
  type LocationPreference,
} from '@/lib/locationPreference';

export function LocationTab() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [locationPref, setLocationPref] = useState<LocationPreference>(() =>
    readLocationPreference(user?.id) ?? EMPTY_LOCATION_PREFERENCE
  );
  const [locationPrefSaving, setLocationPrefSaving] = useState(false);

  // Keep in sync with user id on mount; pull the authoritative value from the DB.
  React.useEffect(() => {
    if (!user?.id) return;
    setLocationPref(readLocationPreference(user.id) ?? EMPTY_LOCATION_PREFERENCE);
    let cancelled = false;
    fetchLocationPreference(user.id).then((pref) => {
      if (!cancelled && pref) setLocationPref(pref);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;
    setLocationPrefSaving(true);
    try {
      const normalizedLocation = await persistLocationPreference(user.id, locationPref);
      setLocationPref(normalizedLocation);
      toast({ title: 'Location preference saved' });
    } catch {
      toast({ title: 'Failed to save preference', variant: 'destructive' });
    } finally {
      setLocationPrefSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Your Location Preference
          </CardTitle>
          <CardDescription>
            Set your province/state and country to keep Browse focused on nearby openings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Country</Label>
              <Select
                value={locationPref.country}
                onValueChange={(country) =>
                  setLocationPref((prev) => ({ ...prev, country, province: '' }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country} value={country}>{country}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Province / State</Label>
              <Select
                value={locationPref.province}
                onValueChange={(province) =>
                  setLocationPref((prev) => ({ ...prev, province }))
                }
                disabled={!locationPref.country}
              >
                <SelectTrigger>
                  <SelectValue placeholder={locationPref.country ? 'Select province / state' : 'Select country first'} />
                </SelectTrigger>
                <SelectContent>
                  {(PROVINCES_BY_COUNTRY[locationPref.country] ?? []).map((province) => (
                    <SelectItem key={province} value={province}>{province}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={locationPrefSaving || !locationPref.province.trim() || !locationPref.country}
            >
              {locationPrefSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

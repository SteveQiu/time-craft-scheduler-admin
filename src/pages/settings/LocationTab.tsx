import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin } from 'lucide-react';
import { COUNTRIES, PROVINCES_BY_COUNTRY } from '@/lib/address';

export function LocationTab() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [locationPref, setLocationPref] = useState(() => {
    if (typeof window !== 'undefined' && user?.id) {
      const saved = localStorage.getItem(`locationPreference_${user.id}`);
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return { province: '', country: '' };
  });
  const [locationPrefSaving, setLocationPrefSaving] = useState(false);

  // Keep in sync with user id on mount
  React.useEffect(() => {
    if (user?.id) {
      const saved = localStorage.getItem(`locationPreference_${user.id}`);
      if (saved) {
        try { setLocationPref(JSON.parse(saved)); } catch {}
      }
    }
  }, [user?.id]);

  const handleSave = () => {
    if (!user?.id) return;
    setLocationPrefSaving(true);
    try {
      localStorage.setItem(`locationPreference_${user.id}`, JSON.stringify(locationPref));
      toast({ title: 'Location preference saved' });
    } catch {
      toast({ title: 'Failed to save preference', variant: 'destructive' });
    } finally {
      setLocationPrefSaving(false);
    }
  };

  const handleClear = () => {
    if (!user?.id) return;
    setLocationPref({ province: '', country: '' });
    try {
      localStorage.removeItem(`locationPreference_${user.id}`);
      toast({ title: 'Location preference cleared' });
    } catch {}
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Your Location Preference
          </CardTitle>
          <CardDescription>Set your preferred location to pre-filter openings in Browse</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Country</Label>
              <Select
                value={locationPref.country}
                onValueChange={(country) => {
                  const provinces = PROVINCES_BY_COUNTRY[country] || [];
                  const newProvince = provinces.includes(locationPref.province) ? locationPref.province : '';
                  setLocationPref({ country, province: newProvince });
                }}
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
                onValueChange={(province) => setLocationPref({ ...locationPref, province })}
                disabled={!locationPref.country || (PROVINCES_BY_COUNTRY[locationPref.country]?.length ?? 0) === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!locationPref.country ? 'Select country first' : 'Select province/state'} />
                </SelectTrigger>
                <SelectContent>
                  {(PROVINCES_BY_COUNTRY[locationPref.country] || []).map((province) => (
                    <SelectItem key={province} value={province}>{province}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={locationPrefSaving || !locationPref.province || !locationPref.country}
            >
              {locationPrefSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button variant="outline" onClick={handleClear}>Clear</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

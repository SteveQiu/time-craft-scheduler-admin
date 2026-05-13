import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LocationFields, COUNTRIES, PROVINCES_BY_COUNTRY } from '@/lib/address';

interface AddressInputProps {
  value: LocationFields;
  onChange: (fields: LocationFields) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  layout?: '2x2' | 'stacked';
}

export function AddressInput({ 
  value, 
  onChange, 
  disabled, 
  required, 
  className = '', 
  layout = '2x2' 
}: AddressInputProps) {
  const handleChange = (key: keyof LocationFields, val: string) => {
    onChange({ ...value, [key]: val });
  };

  const handleCountryChange = (country: string) => {
    const provinces = PROVINCES_BY_COUNTRY[country] || [];
    const newProvince = provinces.includes(value.province) ? value.province : '';
    onChange({ ...value, country, province: newProvince });
  };

  const availableProvinces = PROVINCES_BY_COUNTRY[value.country] || [];
  const provinceDisabled = disabled || !value.country || availableProvinces.length === 0;

  const gridClass = layout === '2x2' ? 'grid grid-cols-2 gap-3' : 'space-y-3';

  return (
    <div className={className}>
      <div className="space-y-3">
        <div>
          <Label htmlFor="address-line1">Address</Label>
          <Input
            id="address-line1"
            value={value.address_line_1}
            onChange={(e) => handleChange('address_line_1', e.target.value)}
            disabled={disabled}
            placeholder="123 Main Street"
          />
        </div>
        <div>
          <Label htmlFor="address-line2">Address 2</Label>
          <Input
            id="address-line2"
            value={value.address_line_2}
            onChange={(e) => handleChange('address_line_2', e.target.value)}
            disabled={disabled}
            placeholder="Suite 100 (optional)"
          />
        </div>
      </div>
      <div className={`${gridClass} mt-3`}>
        <div className={layout === '2x2' ? '' : ''}>
          <Label htmlFor="address-city">
            City {required && <span className="text-destructive">*</span>}
          </Label>
          <Input
            id="address-city"
            value={value.city}
            onChange={(e) => handleChange('city', e.target.value)}
            disabled={disabled}
            placeholder="City"
          />
        </div>
        <div className={layout === '2x2' ? '' : ''}>
          <Label htmlFor="address-province">Province / State</Label>
          <Select
            value={value.province}
            onValueChange={(val) => handleChange('province', val)}
            disabled={provinceDisabled}
          >
            <SelectTrigger id="address-province">
              <SelectValue placeholder={provinceDisabled ? "Select country first" : "Select province/state"} />
            </SelectTrigger>
            <SelectContent>
              {availableProvinces.map((province) => (
                <SelectItem key={province} value={province}>
                  {province}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className={layout === '2x2' ? '' : ''}>
          <Label htmlFor="address-country">Country</Label>
          <Select
            value={value.country}
            onValueChange={handleCountryChange}
            disabled={disabled}
          >
            <SelectTrigger id="address-country">
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
        <div className={layout === '2x2' ? '' : ''}>
          <Label htmlFor="address-zip">ZIP / Postal Code</Label>
          <Input
            id="address-zip"
            value={value.zip}
            onChange={(e) => handleChange('zip', e.target.value)}
            disabled={disabled}
            placeholder="ZIP or Postal Code"
          />
        </div>
      </div>
    </div>
  );
}

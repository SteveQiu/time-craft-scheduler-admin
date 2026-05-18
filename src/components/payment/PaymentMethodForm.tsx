import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PaymentMethodConfig, PaymentDetails } from '@/lib/payment/types';
import { PaymentMethodType } from '@/lib/payment/types';
import { compressImageFile } from '@/lib/payment/serialization';
import { useToast } from '@/hooks/use-toast';

interface PaymentMethodFormProps {
  config: PaymentMethodConfig;
  value: PaymentDetails;
  onChange: (details: PaymentDetails) => void;
}

/**
 * Renders the config fields for a payment method type.
 * Controlled component: caller owns state, this calls onChange with updated details.
 * When tabGroups is defined, renders an either/or tab selector (only one group active at a time).
 */
export function PaymentMethodForm({ config, value, onChange }: PaymentMethodFormProps) {
  const { toast } = useToast();

  // Determine initial active tab index based on which group has a value set
  const [activeTab, setActiveTab] = useState<number>(() => {
    if (!config.tabGroups) return 0;
    const idx = config.tabGroups.findIndex((g) => g.keys.some((k) => value[k]));
    return idx >= 0 ? idx : 0;
  });

  if (config.fields.length === 0) {
    if (config.id === PaymentMethodType.Cash) {
      return (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            No additional details needed for cash payments.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md p-3 text-sm">
            ⚠️ If you enable cash payments, appointments will be marked as paid automatically,
            but you will not receive the funds until the face-to-face appointment takes place.
          </div>
        </div>
      );
    }
    return null;
  }

  const handleImageUpload = async (
    key: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImageFile(file);
    if (compressed === null) {
      toast({
        title: 'Image too large',
        description: 'Please upload an image under 1 MB.',
        variant: 'destructive',
      });
      e.target.value = '';
      return;
    }
    onChange({ ...value, [key]: compressed });
  };

  const handleTabChange = (idx: number) => {
    if (!config.tabGroups) return;
    // Clear fields belonging to all other tabs (either/or semantics)
    const next = { ...value };
    config.tabGroups.forEach((group, i) => {
      if (i !== idx) group.keys.forEach((k) => delete next[k]);
    });
    onChange(next);
    setActiveTab(idx);
  };

  // Determine which field keys are visible
  const visibleKeys = config.tabGroups
    ? new Set(config.tabGroups[activeTab]?.keys ?? [])
    : null; // null = show all

  const visibleFields = visibleKeys
    ? config.fields.filter((f) => visibleKeys.has(f.key))
    : config.fields;

  return (
    <div className="space-y-3">
      {config.tabGroups && (
        <div className="flex rounded-md border border-input overflow-hidden w-fit">
          {config.tabGroups.map((group, idx) => (
            <button
              key={group.label}
              type="button"
              onClick={() => handleTabChange(idx)}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                idx === activeTab
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-muted'
              } ${idx > 0 ? 'border-l border-input' : ''}`}
            >
              {group.label}
            </button>
          ))}
        </div>
      )}

      {visibleFields.map((field) => (
        <div key={field.key} className="space-y-2">
          <Label>{field.label}</Label>

          {field.type === 'text' && (
            <Input
              placeholder={field.placeholder}
              value={value[field.key] ?? ''}
              onChange={(e) => onChange({ ...value, [field.key]: e.target.value })}
            />
          )}

          {field.type === 'image' && (
            <div className="space-y-2">
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(field.key, e)}
              />
              {value[field.key] && (
                <div className="flex items-center gap-2">
                  <img
                    src={value[field.key]}
                    alt={`${field.label} preview`}
                    className="max-w-[120px] rounded mt-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const next = { ...value };
                      delete next[field.key];
                      onChange(next);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              )}
            </div>
          )}

          {field.helperText && value[field.key] && (
            <p className="text-xs text-muted-foreground">{field.helperText}</p>
          )}
        </div>
      ))}
    </div>
  );
}

import React, { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ConsentModal } from './ConsentModal';

export interface ConsentData {
  privacyPolicy: boolean;
  termsOfService: boolean;
  productUpdates: boolean;
  analytics: boolean;
}

interface ConsentBannerProps {
  onConsentChange: (consent: ConsentData) => void;
  isSubmitDisabled: boolean;
  onSubmit: () => void;
  submitLabel?: string;
}

export function ConsentBanner({
  onConsentChange,
  isSubmitDisabled,
  onSubmit,
  submitLabel = 'Create Account',
}: ConsentBannerProps) {
  const [consent, setConsent] = useState<ConsentData>({
    privacyPolicy: false,
    termsOfService: false,
    productUpdates: false,
    analytics: false,
  });
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState<'privacy' | 'terms'>('privacy');

  const updateConsent = (key: keyof ConsentData, value: boolean) => {
    const updated = { ...consent, [key]: value };
    setConsent(updated);
    onConsentChange(updated);
  };

  const openPolicy = (type: 'privacy' | 'terms') => {
    setModalContent(type);
    setShowModal(true);
  };

  const canSubmit = consent.privacyPolicy && consent.termsOfService && !isSubmitDisabled;

  return (
    <>
      <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="privacy-policy"
              checked={consent.privacyPolicy}
              onCheckedChange={(checked) => updateConsent('privacyPolicy', checked as boolean)}
              aria-required="true"
            />
            <div className="flex-1 min-w-0">
              <Label
                htmlFor="privacy-policy"
                className="text-sm font-medium cursor-pointer"
              >
                I agree to the{' '}
                <button
                  type="button"
                  onClick={() => openPolicy('privacy')}
                  className="text-primary underline hover:no-underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
                  aria-label="View Privacy Policy"
                >
                  Privacy Policy
                </button>
                <span className="text-destructive" aria-label="required"> *</span>
              </Label>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="terms-of-service"
              checked={consent.termsOfService}
              onCheckedChange={(checked) => updateConsent('termsOfService', checked as boolean)}
              aria-required="true"
            />
            <div className="flex-1 min-w-0">
              <Label
                htmlFor="terms-of-service"
                className="text-sm font-medium cursor-pointer"
              >
                I agree to the{' '}
                <button
                  type="button"
                  onClick={() => openPolicy('terms')}
                  className="text-primary underline hover:no-underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
                  aria-label="View Terms of Service"
                >
                  Terms of Service
                </button>
                <span className="text-destructive" aria-label="required"> *</span>
              </Label>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="product-updates"
              checked={consent.productUpdates}
              onCheckedChange={(checked) => updateConsent('productUpdates', checked as boolean)}
            />
            <div className="flex-1 min-w-0">
              <Label
                htmlFor="product-updates"
                className="text-sm font-medium cursor-pointer"
              >
                I'd like to receive product updates via email
              </Label>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="analytics"
              checked={consent.analytics}
              onCheckedChange={(checked) => updateConsent('analytics', checked as boolean)}
            />
            <div className="flex-1 min-w-0">
              <Label
                htmlFor="analytics"
                className="text-sm font-medium cursor-pointer"
              >
                Allow analytics to improve our service
              </Label>
            </div>
          </div>
        </div>

        <Button
          onClick={onSubmit}
          disabled={!canSubmit}
          className="w-full"
          aria-disabled={!canSubmit}
        >
          {submitLabel}
        </Button>
      </div>

      <ConsentModal
        open={showModal}
        onOpenChange={setShowModal}
        contentType={modalContent}
      />
    </>
  );
}

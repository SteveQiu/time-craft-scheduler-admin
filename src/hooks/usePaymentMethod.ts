import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { PaymentDetails } from '@/lib/payment/types';
import { compressImageFile, serializeDetails } from '@/lib/payment/serialization';

/**
 * Manages form state for a single payment method's details.
 * Handles base64 image compression automatically in setImageField.
 */
export function usePaymentMethod(initial: PaymentDetails = {}) {
  const [details, setDetails] = useState<PaymentDetails>(initial);
  const { toast } = useToast();

  const setField = useCallback((key: string, value: string) => {
    setDetails((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearField = useCallback((key: string) => {
    setDetails((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const setImageField = useCallback(
    async (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
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
      setDetails((prev) => ({ ...prev, [key]: compressed }));
    },
    [toast],
  );

  const reset = useCallback((newDetails: PaymentDetails = {}) => {
    setDetails(newDetails);
  }, []);

  /** Returns null if details is empty, otherwise JSON string. */
  const serialize = useCallback((): string | null => {
    const nonEmpty = Object.fromEntries(
      Object.entries(details).filter(([, v]) => v !== undefined && v !== ''),
    );
    if (Object.keys(nonEmpty).length === 0) return null;
    return serializeDetails(nonEmpty);
  }, [details]);

  return { details, setField, clearField, setImageField, reset, serialize };
}

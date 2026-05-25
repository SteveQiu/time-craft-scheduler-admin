import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { extractProofStoragePath } from '@/components/appointments/calendarExport';
import { PaymentMethodRecord } from '@/lib/payment/types';

interface UsePaymentProofParams {
  paymentProofAppointmentId: string | null;
  providerViewProofAppointmentId: string | null;
  activePaymentMethod: PaymentMethodRecord | null;
}

export function usePaymentProof({
  paymentProofAppointmentId,
  providerViewProofAppointmentId,
  activePaymentMethod,
}: UsePaymentProofParams) {
  const queryClient = useQueryClient();
  const backfilledPaymentMethodRef = useRef<string | null>(null);

  const [paymentProofNote, setPaymentProofNote] = useState('');
  const [paymentProofPhoto, setPaymentProofPhoto] = useState<string | null>(null);
  const [paymentProofPhotoName, setPaymentProofPhotoName] = useState('');
  const [paymentProofPhotoFile, setPaymentProofPhotoFile] = useState<File | null>(null);
  const [proofSubmitted, setProofSubmitted] = useState(false);
  const [proofImageError, setProofImageError] = useState(false);
  const [providerViewSignedUrl, setProviderViewSignedUrl] = useState<string | null>(null);
  const [providerViewSignedUrlLoading, setProviderViewSignedUrlLoading] = useState(false);
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);

  const { data: existingPaymentProof, isFetching: loadingExistingProof } = useQuery({
    queryKey: ['payment-proof', paymentProofAppointmentId],
    enabled: !!paymentProofAppointmentId,
    queryFn: async () => {
      if (!paymentProofAppointmentId) return null;
      const { data } = await supabase
        .from('payment_proofs')
        .select('*')
        .eq('appointment_id', paymentProofAppointmentId)
        .maybeSingle();
      return data ?? null;
    },
  });

  const { data: providerViewProof, isFetching: loadingProviderProof } = useQuery({
    queryKey: ['payment-proof', providerViewProofAppointmentId],
    enabled: !!providerViewProofAppointmentId,
    queryFn: async () => {
      if (!providerViewProofAppointmentId) return null;
      const { data } = await supabase
        .from('payment_proofs')
        .select('*')
        .eq('appointment_id', providerViewProofAppointmentId)
        .maybeSingle();
      return data ?? null;
    },
  });

  // Pre-fill form when existing proof loaded (and user hasn't just submitted)
  useEffect(() => {
    if (existingPaymentProof && paymentProofAppointmentId) {
      setPaymentProofNote(existingPaymentProof.note ?? '');
      setProofSubmitted(true);
      if (existingPaymentProof.photo_url) {
        const path = extractProofStoragePath(existingPaymentProof.photo_url);
        supabase.storage.from('payment-proofs').createSignedUrl(path, 3600).then(({ data }) => {
          setPaymentProofPhoto(data?.signedUrl ?? null);
        });
        setPaymentProofPhotoName('Uploaded photo');
      } else {
        setPaymentProofPhoto(null);
      }
    }
  }, [existingPaymentProof, paymentProofAppointmentId]);

  // Silently backfill payment_method_type for existing proofs that have null
  useEffect(() => {
    if (
      existingPaymentProof &&
      existingPaymentProof.payment_method_type === null &&
      activePaymentMethod &&
      paymentProofAppointmentId &&
      backfilledPaymentMethodRef.current !== paymentProofAppointmentId
    ) {
      backfilledPaymentMethodRef.current = paymentProofAppointmentId;
      supabase
        .from('payment_proofs')
        .update({ payment_method_type: activePaymentMethod.type })
        .eq('appointment_id', paymentProofAppointmentId)
        .then(({ error }) => {
          if (error) {
            console.error('[payment-method-type] backfill error:', error);
          } else {
            queryClient.invalidateQueries({ queryKey: ['payment-methods-bulk'] });
          }
        });
    }
  }, [existingPaymentProof, activePaymentMethod, paymentProofAppointmentId, queryClient]);

  // Clear form when dialog closes
  useEffect(() => {
    if (!paymentProofAppointmentId) {
      setPaymentProofNote('');
      setPaymentProofPhoto(null);
      setPaymentProofPhotoName('');
      setPaymentProofPhotoFile(null);
      setProofSubmitted(false);
    }
  }, [paymentProofAppointmentId]);

  // Generate signed URL for provider view dialog
  useEffect(() => {
    const photoUrl = providerViewProof?.photo_url;
    if (!photoUrl) {
      setProviderViewSignedUrl(null);
      setProviderViewSignedUrlLoading(false);
      return;
    }
    setProviderViewSignedUrlLoading(true);
    const path = extractProofStoragePath(photoUrl);
    supabase.storage.from('payment-proofs').createSignedUrl(path, 3600).then(({ data, error }) => {
      if (error) console.error('[payment-proofs] signed URL error:', error);
      setProviderViewSignedUrl(data?.signedUrl ?? null);
      setProviderViewSignedUrlLoading(false);
    });
  }, [providerViewProof?.photo_url]);

  const handlePaymentPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Photo must be under 20MB');
      return;
    }
    setPaymentProofPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 800;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
          else { width = Math.round((width * MAX) / height); height = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        // Start at quality 0.85, reduce until under 1MB
        let quality = 0.85;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        while (dataUrl.length > 1 * 1024 * 1024 && quality > 0.1) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        setPaymentProofPhoto(dataUrl);
        setPaymentProofPhotoName(file.name);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitPaymentProof = async () => {
    if (!paymentProofAppointmentId) return;
    setIsSubmittingProof(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let photoUrl: string | null = null;

      if (paymentProofPhotoFile) {
        const ext = paymentProofPhotoFile.name.split('.').pop() ?? 'jpg';
        const filePath = `${user.id}/${paymentProofAppointmentId}-${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(filePath, paymentProofPhotoFile, {
            upsert: true,
            contentType: paymentProofPhotoFile.type,
          });

        if (uploadError) throw uploadError;

        photoUrl = filePath; // Store storage path; signed URL generated on display
      } else if (existingPaymentProof?.photo_url) {
        // Keep existing URL if no new file selected
        photoUrl = existingPaymentProof.photo_url;
      }

      const { error } = await supabase
        .from('payment_proofs')
        .upsert({
          appointment_id: paymentProofAppointmentId,
          customer_id: user.id,
          note: paymentProofNote || null,
          photo_url: photoUrl,
          payment_method_type: activePaymentMethod?.type ?? null,
        }, { onConflict: 'appointment_id' });

      if (error) throw error;

      // Also notify provider via audit event (for their notification feed)
      const { data: apt } = await supabase
        .from('appointments')
        .select('provider_id')
        .eq('id', paymentProofAppointmentId)
        .maybeSingle();
      const recipients = [user.id, apt?.provider_id].filter(Boolean) as string[];
      const { error: auditErr } = await supabase.rpc('log_audit_event', {
        _event_type: 'payment.proof_submitted',
        _entity_type: 'appointment',
        _entity_id: paymentProofAppointmentId,
        _actor_id: user.id,
        _recipient_ids: recipients,
        _metadata: { note: paymentProofNote, customer_name: user.email },
      });
      if (auditErr) console.error('[audit] log_audit_event failed:', auditErr);

      queryClient.invalidateQueries({ queryKey: ['payment-proof', paymentProofAppointmentId] });
      queryClient.invalidateQueries({ queryKey: ['payment-proofs-bulk'] });
      queryClient.invalidateQueries({ queryKey: ['payment-methods-bulk'] });
      setProofSubmitted(true);
      toast.success('Payment proof submitted!');
    } catch (err: any) {
      console.error('Failed to submit payment proof:', err);
      toast.error('Failed to submit payment proof. Please try again.');
    } finally {
      setIsSubmittingProof(false);
    }
  };

  return {
    existingPaymentProof,
    providerViewProof,
    loadingExistingProof,
    loadingProviderProof,
    paymentProofNote,
    setPaymentProofNote,
    paymentProofPhoto,
    setPaymentProofPhoto,
    paymentProofPhotoName,
    setPaymentProofPhotoName,
    paymentProofPhotoFile,
    setPaymentProofPhotoFile,
    proofSubmitted,
    setProofSubmitted,
    proofImageError,
    setProofImageError,
    providerViewSignedUrl,
    providerViewSignedUrlLoading,
    isSubmittingProof,
    handlePaymentPhotoUpload,
    handleSubmitPaymentProof,
  };
}

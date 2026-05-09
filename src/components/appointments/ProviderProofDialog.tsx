import React from 'react';
import { Loader2, CreditCard, FileImage, ImageIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Appointment } from './types';

interface ProviderProofDialogProps {
  providerViewProofAppointmentId: string | null;
  appointments: Appointment[];
  onClose: () => void;
  providerViewProof: any;
  loadingProviderProof: boolean;
  proofImageError: boolean;
  setProofImageError: (v: boolean) => void;
  providerViewSignedUrl: string | null;
  providerViewSignedUrlLoading: boolean;
}

export function ProviderProofDialog({
  providerViewProofAppointmentId,
  appointments,
  onClose,
  providerViewProof,
  loadingProviderProof,
  proofImageError,
  setProofImageError,
  providerViewSignedUrl,
  providerViewSignedUrlLoading,
}: ProviderProofDialogProps) {
  const providerViewAppt = providerViewProofAppointmentId
    ? appointments.find(a => a.id === providerViewProofAppointmentId)
    : null;

  return (
    <Dialog open={!!providerViewProofAppointmentId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" aria-hidden="true" />
            Payment Proof{providerViewAppt?.booker_name ? ` — ${providerViewAppt.booker_name}` : ''}
          </DialogTitle>
          <DialogDescription>
            Review the payment confirmation submitted by the customer.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {loadingProviderProof ? (
            <div className="flex items-center justify-center py-8" role="status" aria-label="Loading payment proof">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !providerViewProof ? (
            <div className="text-center py-6 bg-muted/30 rounded-lg">
              <FileImage className="h-10 w-10 mx-auto mb-2 text-muted-foreground/50" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                No payment proof submitted yet.
              </p>
            </div>
          ) : !providerViewProof.photo_url && !providerViewProof.note ? (
            <div className="text-center py-6 bg-muted/30 rounded-lg">
              <FileImage className="h-10 w-10 mx-auto mb-2 text-muted-foreground/50" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                Payment proof record exists but contains no image or note.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {providerViewProof.note && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Customer Note</p>
                  <div className="bg-muted/50 rounded-md p-3 text-sm text-foreground leading-relaxed">
                    {providerViewProof.note}
                  </div>
                </div>
              )}
              {providerViewProof.photo_url && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Payment Screenshot</p>
                  {proofImageError ? (
                    <div className="bg-muted/30 rounded-md p-6 text-center border border-dashed border-muted-foreground/30">
                      <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" aria-hidden="true" />
                      <p className="text-sm text-muted-foreground">Could not load image</p>
                    </div>
                  ) : providerViewSignedUrlLoading || !providerViewSignedUrl ? (
                    <div className="flex items-center justify-center py-6" role="status" aria-label="Loading image">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <img 
                      src={providerViewSignedUrl} 
                      alt="Payment proof submitted by customer" 
                      className="max-w-full rounded-md border shadow-sm" 
                      onError={() => setProofImageError(true)}
                    />
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground pt-2 border-t">
                Submitted {new Date(providerViewProof.created_at).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

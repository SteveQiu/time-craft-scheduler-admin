import React from 'react';
import { Loader2, CheckCircle, Send, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { PaymentMethodRecord } from '@/lib/payment/types';

interface PaymentProofSectionProps {
  proofSubmitted: boolean;
  setProofSubmitted: (v: boolean) => void;
  loadingExistingProof: boolean;
  existingPaymentProof: any;
  paymentProofNote: string;
  setPaymentProofNote: (v: string) => void;
  paymentProofPhoto: string | null;
  setPaymentProofPhoto: (v: string | null) => void;
  paymentProofPhotoName: string;
  setPaymentProofPhotoName: (v: string) => void;
  setPaymentProofPhotoFile: (v: File | null) => void;
  isSubmittingProof: boolean;
  noteRequired: boolean;
  activePaymentMethod: PaymentMethodRecord | null;
  allAvailableMethods: PaymentMethodRecord[];
  handlePaymentPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmitPaymentProof: () => void;
}

export function PaymentProofSection({
  proofSubmitted,
  setProofSubmitted,
  loadingExistingProof,
  existingPaymentProof,
  paymentProofNote,
  setPaymentProofNote,
  paymentProofPhoto,
  setPaymentProofPhoto,
  paymentProofPhotoName,
  setPaymentProofPhotoName,
  setPaymentProofPhotoFile,
  isSubmittingProof,
  noteRequired,
  activePaymentMethod,
  allAvailableMethods,
  handlePaymentPhotoUpload,
  handleSubmitPaymentProof,
}: PaymentProofSectionProps) {
  return (
    <div className="border-t border-border pt-4">
      <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <Send className="h-4 w-4" />
        Confirm Payment to Provider
      </h4>
      {proofSubmitted ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1">Provider notified!</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40"
              onClick={() => setProofSubmitted(false)}
            >
              Edit
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {loadingExistingProof ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading previous submission…
            </div>
          ) : existingPaymentProof && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              Previously submitted — editing will resend to provider
            </div>
          )}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Payment note{noteRequired ? <span className="text-destructive ml-0.5">*</span> : <span className="text-muted-foreground"> (optional)</span>}
            </label>
            <Textarea
              placeholder="e.g. Sent $50 via PayPal on May 5. Transaction ID: ..."
              value={paymentProofNote}
              onChange={(e) => setPaymentProofNote(e.target.value)}
              rows={3}
              className="resize-none text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Attach payment screenshot (optional — auto-compressed to 800×800, &lt;1MB)
            </label>
            {paymentProofPhoto ? (
              <div className="flex items-center gap-2">
                <img src={paymentProofPhoto} alt="Payment proof" className="w-16 h-16 object-cover rounded border" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground truncate">{paymentProofPhotoName}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive h-6 px-0 text-xs"
                    onClick={() => { setPaymentProofPhoto(null); setPaymentProofPhotoName(''); setPaymentProofPhotoFile(null); }}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <label className="flex items-center gap-2 cursor-pointer border border-dashed border-border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Click to attach screenshot</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePaymentPhotoUpload}
                />
              </label>
            )}
          </div>
          <Button
            onClick={handleSubmitPaymentProof}
            disabled={isSubmittingProof || (noteRequired && !paymentProofNote.trim()) || (allAvailableMethods.length > 0 && !activePaymentMethod)}
            className="w-full"
            size="sm"
          >
            {isSubmittingProof ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending…</>
            ) : existingPaymentProof ? (
              <><Send className="h-4 w-4 mr-2" />Update & Resend to Provider</>
            ) : (
              <><Send className="h-4 w-4 mr-2" />Submit Payment Update</>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

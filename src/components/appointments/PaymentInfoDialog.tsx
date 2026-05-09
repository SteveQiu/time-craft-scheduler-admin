import React from 'react';
import { Loader2, CreditCard } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PaymentDisplay } from '@/components/payment/PaymentDisplay';
import { PaymentMethodRecord } from '@/lib/payment/types';
import { deserializeDetailsByType } from '@/lib/payment/serialization';
import { getMethodLabel } from '@/lib/payment/methods';
import { PaymentProofSection } from './PaymentProofDialog';

interface PaymentInfoDialogProps {
  paymentInfoProviderId: string | null;
  paymentInfoProviderName: string;
  onClose: () => void;
  loadingProviderPayments: boolean;
  loadingOrgPayments: boolean;
  loadingPaymentInfoOpening: boolean;
  allAvailableMethods: PaymentMethodRecord[];
  selectedPaymentTabId: string | null;
  setSelectedPaymentTabId: (v: string | null) => void;
  activePaymentMethod: PaymentMethodRecord | null;
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
  handlePaymentPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmitPaymentProof: () => void;
}

export function PaymentInfoDialog({
  paymentInfoProviderId,
  paymentInfoProviderName,
  onClose,
  loadingProviderPayments,
  loadingOrgPayments,
  loadingPaymentInfoOpening,
  allAvailableMethods,
  selectedPaymentTabId,
  setSelectedPaymentTabId,
  activePaymentMethod,
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
  handlePaymentPhotoUpload,
  handleSubmitPaymentProof,
}: PaymentInfoDialogProps) {
  const isActiveMethodCash = activePaymentMethod?.type === 'cash';
  const noteRequired = !isActiveMethodCash;

  return (
    <Dialog open={!!paymentInfoProviderId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            How to Pay — {paymentInfoProviderName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {(loadingProviderPayments || loadingOrgPayments || loadingPaymentInfoOpening) ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : allAvailableMethods.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              This provider hasn't configured payment methods yet.
            </p>
          ) : (
            <Tabs
              defaultValue={
                (allAvailableMethods.find(m => m.is_default) ?? allAvailableMethods[0])?.id
              }
              onValueChange={(val) => setSelectedPaymentTabId(val)}
            >
              <TabsList className="flex flex-wrap h-auto gap-1 mb-3">
                {allAvailableMethods.map((pm) => (
                  <TabsTrigger key={pm.id} value={pm.id} className="text-xs">
                    {pm.label || getMethodLabel(pm.type)}
                    {pm.is_default && <span className="ml-1 opacity-60">★</span>}
                  </TabsTrigger>
                ))}
              </TabsList>
              {allAvailableMethods.map((pm) => (
                <TabsContent key={pm.id} value={pm.id} className="mt-0">
                  <div className="border border-border rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{pm.label}</span>
                      <Badge variant="outline">{getMethodLabel(pm.type)}</Badge>
                      {pm.is_default && <Badge variant="secondary">Default</Badge>}
                    </div>
                    <PaymentDisplay
                      type={pm.type}
                      details={deserializeDetailsByType(pm.type, pm.details)}
                    />
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          )}

          {/* Payment Proof Section */}
          {!loadingProviderPayments && !loadingOrgPayments && (
            <PaymentProofSection
              proofSubmitted={proofSubmitted}
              setProofSubmitted={setProofSubmitted}
              loadingExistingProof={loadingExistingProof}
              existingPaymentProof={existingPaymentProof}
              paymentProofNote={paymentProofNote}
              setPaymentProofNote={setPaymentProofNote}
              paymentProofPhoto={paymentProofPhoto}
              setPaymentProofPhoto={setPaymentProofPhoto}
              paymentProofPhotoName={paymentProofPhotoName}
              setPaymentProofPhotoName={setPaymentProofPhotoName}
              setPaymentProofPhotoFile={setPaymentProofPhotoFile}
              isSubmittingProof={isSubmittingProof}
              noteRequired={noteRequired}
              activePaymentMethod={activePaymentMethod}
              allAvailableMethods={allAvailableMethods}
              handlePaymentPhotoUpload={handlePaymentPhotoUpload}
              handleSubmitPaymentProof={handleSubmitPaymentProof}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Trash2, CheckCircle2, Info } from 'lucide-react';

interface DeleteAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteAccountModal({ open, onOpenChange }: DeleteAccountModalProps) {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<'warning' | 'password' | 'confirm' | 'success'>('warning');
  const [password, setPassword] = useState('');
  const [confirmations, setConfirmations] = useState({
    understand: false,
    noUndo: false,
    dataLoss: false,
  });
  const [deletionScheduled, setDeletionScheduled] = useState(false);

  const resetModal = () => {
    setStep('warning');
    setPassword('');
    setConfirmations({ understand: false, noUndo: false, dataLoss: false });
    setDeletionScheduled(false);
  };

  const verifyPassword = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: password,
      });
      if (error) throw new Error('Incorrect password');
    },
    onSuccess: () => {
      setStep('confirm');
    },
    onError: () => {
      toast({
        title: 'Verification Failed',
        description: 'The password you entered is incorrect.',
        variant: 'destructive',
      });
    },
  });

  const deleteAccount = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('delete-user-account', {
        body: { user_id: user?.id },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setDeletionScheduled(true);
      setStep('success');
    },
    onError: (error: Error) => {
      toast({
        title: 'Deletion Failed',
        description: error.message || 'Failed to schedule account deletion',
        variant: 'destructive',
      });
    },
  });

  const handleClose = () => {
    if (step === 'success') {
      signOut();
    }
    onOpenChange(false);
    resetModal();
  };

  const allConfirmationsChecked = Object.values(confirmations).every(Boolean);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete Account
          </DialogTitle>
          <DialogDescription>
            This action will permanently delete your account
          </DialogDescription>
        </DialogHeader>

        {step === 'warning' && (
          <div className="space-y-6">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Warning: Permanent Action</AlertTitle>
              <AlertDescription>
                Account deletion is irreversible. All your data will be permanently deleted.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="text-sm font-medium">What will be deleted:</div>
              <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                <li>Your profile and personal information</li>
                <li>All appointment history and schedules</li>
                <li>Payment methods and addresses</li>
                <li>Preferences and settings</li>
                <li>Any uploaded files or documents</li>
              </ul>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>30-Day Waiting Period</AlertTitle>
              <AlertDescription>
                Your account will be scheduled for deletion in 30 days. You can cancel this request anytime within this period by logging back in.
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => setStep('password')}
                className="flex-1"
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 'password' && (
          <div className="space-y-6">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Security Verification</AlertTitle>
              <AlertDescription>
                Please enter your password to verify your identity
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('warning')} className="flex-1">
                Back
              </Button>
              <Button
                onClick={() => verifyPassword.mutate()}
                disabled={!password || verifyPassword.isPending}
                className="flex-1"
              >
                {verifyPassword.isPending ? 'Verifying…' : 'Verify'}
              </Button>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-6">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Final Confirmation</AlertTitle>
              <AlertDescription>
                Please confirm you understand the consequences
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="understand"
                  checked={confirmations.understand}
                  onCheckedChange={(checked) =>
                    setConfirmations((prev) => ({ ...prev, understand: checked as boolean }))
                  }
                />
                <Label htmlFor="understand" className="cursor-pointer text-sm">
                  I understand this action is permanent and cannot be undone
                </Label>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="no-undo"
                  checked={confirmations.noUndo}
                  onCheckedChange={(checked) =>
                    setConfirmations((prev) => ({ ...prev, noUndo: checked as boolean }))
                  }
                />
                <Label htmlFor="no-undo" className="cursor-pointer text-sm">
                  I acknowledge there is a 30-day waiting period before final deletion
                </Label>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="data-loss"
                  checked={confirmations.dataLoss}
                  onCheckedChange={(checked) =>
                    setConfirmations((prev) => ({ ...prev, dataLoss: checked as boolean }))
                  }
                />
                <Label htmlFor="data-loss" className="cursor-pointer text-sm">
                  I understand all my data will be permanently deleted
                </Label>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('password')} className="flex-1">
                Back
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteAccount.mutate()}
                disabled={!allConfirmationsChecked || deleteAccount.isPending}
                className="flex-1"
              >
                {deleteAccount.isPending ? 'Deleting…' : 'Delete My Account'}
              </Button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-orange-500 mx-auto" />
              <div>
                <div className="font-medium">Deletion Scheduled</div>
                <div className="text-sm text-muted-foreground mt-2">
                  Your account has been scheduled for deletion in 30 days.
                </div>
              </div>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                You'll receive a confirmation email. Log in anytime within 30 days to cancel the deletion request.
              </AlertDescription>
            </Alert>

            <Button onClick={handleClose} className="w-full">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

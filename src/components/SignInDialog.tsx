import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Chrome } from 'lucide-react';

interface SignInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SignInDialog({ open, onOpenChange }: SignInDialogProps) {
  const { signInWithGoogle } = useAuth();

  const handleGoogleSignIn = async () => {
    await signInWithGoogle();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sign In to AppointmentPro</DialogTitle>
          <DialogDescription>
            Sign in to access all features and manage your appointments.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col space-y-4 py-4">
          <Button 
            onClick={handleGoogleSignIn} 
            variant="outline" 
            className="w-full flex items-center justify-center space-x-2 py-6"
          >
            <Chrome className="h-5 w-5" />
            <span>Continue with Google</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
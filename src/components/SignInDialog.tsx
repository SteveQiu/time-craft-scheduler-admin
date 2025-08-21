
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Chrome } from 'lucide-react';

interface SignInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SignInDialog({ open, onOpenChange }: SignInDialogProps) {
  const { signInWithGoogle } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
      toast({
        title: "Redirecting to Google",
        description: "You will be redirected to Google to complete sign-in.",
      });
      // Don't close the dialog immediately - let the redirect happen
    } catch (error: any) {
      console.error('Sign-in error:', error);
      
      let errorMessage = "An unexpected error occurred. Please try again.";
      
      if (error?.message?.includes('Invalid login credentials')) {
        errorMessage = "Invalid credentials. Please check your email and password.";
      } else if (error?.message?.includes('Email not confirmed')) {
        errorMessage = "Please check your email and click the confirmation link.";
      } else if (error?.message?.includes('OAuth')) {
        errorMessage = "Google authentication failed. Please ensure Google OAuth is properly configured.";
      }
      
      toast({
        title: "Sign-in Failed",
        description: errorMessage,
        variant: "destructive",
      });
      setLoading(false);
    }
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
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 py-6"
          >
            <Chrome className="h-5 w-5" />
            <span>{loading ? 'Connecting...' : 'Continue with Google'}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Chrome } from 'lucide-react';

type AppRole = 'USER' | 'ORGANIZATION';

interface SignInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SignInDialog({ open, onOpenChange }: SignInDialogProps) {
  const { signInWithGoogle } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Sign in state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  // Sign up state
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpFullName, setSignUpFullName] = useState('');
  const [signUpRole, setSignUpRole] = useState<AppRole>('USER');

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
    } catch (error: any) {
      console.error('Sign-in error:', error);
      toast({
        title: "Sign-in Failed",
        description: error?.message || "An unexpected error occurred.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: signInEmail,
        password: signInPassword,
      });
      if (error) throw error;
      toast({ title: 'Success!', description: 'You have been signed in.' });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to sign in',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: signUpEmail,
        password: signUpPassword,
        options: {
          emailRedirectTo: window.location.href,
          data: { full_name: signUpFullName },
        },
      });
      if (error) throw error;

      if (data.user) {
        await supabase.from('user_roles').insert({
          user_id: data.user.id,
          role: signUpRole,
        });
      }

      toast({
        title: 'Account created!',
        description: 'Please check your email to confirm, then sign in.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to sign up',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sign In to AppointmentPro</DialogTitle>
          <DialogDescription>
            Sign in or create an account to book this appointment.
          </DialogDescription>
        </DialogHeader>

        <Button
          onClick={handleGoogleSignIn}
          variant="outline"
          disabled={loading}
          className="w-full flex items-center justify-center space-x-2 py-6"
        >
          <Chrome className="h-5 w-5" />
          <span>{loading ? 'Connecting...' : 'Continue with Google'}</span>
        </Button>

        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">OR</span>
          <Separator className="flex-1" />
        </div>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={handleEmailSignIn} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="dialog-signin-email">Email</Label>
                <Input
                  id="dialog-signin-email"
                  type="email"
                  placeholder="you@example.com"
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="dialog-signin-password">Password</Label>
                <Input
                  id="dialog-signin-password"
                  type="password"
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleEmailSignUp} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="dialog-signup-name">Full Name</Label>
                <Input
                  id="dialog-signup-name"
                  type="text"
                  placeholder="John Doe"
                  value={signUpFullName}
                  onChange={(e) => setSignUpFullName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="dialog-signup-email">Email</Label>
                <Input
                  id="dialog-signup-email"
                  type="email"
                  placeholder="you@example.com"
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="dialog-signup-password">Password</Label>
                <Input
                  id="dialog-signup-password"
                  type="password"
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={loading}
                />
              </div>
              <div className="space-y-1">
                <Label>I am a</Label>
                <RadioGroup value={signUpRole} onValueChange={(v) => setSignUpRole(v as AppRole)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="USER" id="dialog-role-user" />
                    <Label htmlFor="dialog-role-user" className="font-normal">User</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ORGANIZATION" id="dialog-role-org" />
                    <Label htmlFor="dialog-role-org" className="font-normal">Organization</Label>
                  </div>
                </RadioGroup>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating account...' : 'Sign Up'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

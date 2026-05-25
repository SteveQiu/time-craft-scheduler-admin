import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from 'lucide-react';
import { ResetPasswordFlow } from '@/components/ResetPasswordFlow';
import { APP_NAME } from '@/config/app';
import HCaptcha from '@hcaptcha/react-hcaptcha';

type AppRole = 'USER' | 'ORGANIZATION';

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const isRecoveryLink = window.location.hash.includes('type=recovery');
  const isResetMode = searchParams.get('mode') === 'reset' || isRecoveryLink;
  const returnTo = searchParams.get('returnTo') || '/';

  // Sign in state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signInCaptchaToken, setSignInCaptchaToken] = useState<string | null>(null);

  // Sign up state
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpFullName, setSignUpFullName] = useState('');
  const [signUpRole, setSignUpRole] = useState<AppRole>('USER');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [signUpCaptchaToken, setSignUpCaptchaToken] = useState<string | null>(null);

  // Password reset state
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [activeTab, setActiveTab] = useState<'signin' | 'signup' | 'reset'>(isResetMode ? 'reset' : 'signin');

  useEffect(() => {
    if (!loading && user && !isResetMode) {
      navigate(returnTo);
    }
  }, [user, loading, isResetMode, navigate, returnTo]);

  const handleSignIn = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    if (isLoading) return;
    if (!signInEmail || !signInPassword) {
      toast({ title: 'Missing info', description: 'Enter email and password.', variant: 'destructive' });
      return;
    }
    if (!signInCaptchaToken) {
      toast({ title: 'Verification required', description: 'Please complete the captcha.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: signInEmail,
        password: signInPassword,
      });

      if (error) throw error;

      toast({
        title: 'Success!',
        description: 'You have been signed in.',
      });
      navigate(returnTo);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to sign in',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    if (isLoading) return;

    if (!signUpFullName || !signUpEmail || !signUpPassword) {
      toast({ title: 'Missing info', description: 'Please fill all fields.', variant: 'destructive' });
      return;
    }
    if (signUpPassword.length < 6) {
      toast({ title: 'Password too short', description: 'Use at least 6 characters.', variant: 'destructive' });
      return;
    }
    if (!agreeToTerms) {
      toast({
        title: 'Terms Required',
        description: 'Please agree to the Terms of Service to continue.',
        variant: 'destructive',
      });
      return;
    }
    if (!signUpCaptchaToken) {
      toast({ title: 'Verification required', description: 'Please complete the captcha.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/`;

      const { data, error } = await supabase.auth.signUp({
        email: signUpEmail,
        password: signUpPassword,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: signUpFullName,
          }
        }
      });

      if (error) throw error;

      // After successful signup, assign the selected role
      if (data.user) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: data.user.id,
            role: signUpRole
          });

        if (roleError) {
          console.error('Error assigning role:', roleError);
        }
      }

      toast({
        title: 'Success!',
        description: 'Account created successfully. Please check your email to confirm.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to sign up',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    if (isLoading) return;
    if (!resetEmail) {
      toast({ title: 'Missing email', description: 'Enter your email address.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);

    try {
      const isLocalDevelopment = ['localhost', '127.0.0.1'].includes(window.location.hostname);
      const appOrigin = isLocalDevelopment && import.meta.env.VITE_APP_URL
        ? import.meta.env.VITE_APP_URL
        : window.location.origin;
      const redirectUrl = `${appOrigin}/auth?mode=reset`;

      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      setResetSent(true);
      toast({
        title: 'Success!',
        description: 'Password reset email sent. Please check your inbox.',
      });

      // Reset form after 3 seconds
      setTimeout(() => {
        setResetEmail('');
        setResetSent(false);
      }, 3000);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send reset email',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (loading && !isResetMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (isResetMode) {
    return <ResetPasswordFlow />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Calendar className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">{APP_NAME}</h1>
          <p className="text-muted-foreground mt-2">Manage your appointments with ease</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>Sign in to your account or create a new one</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'signin' | 'signup' | 'reset')} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
                <TabsTrigger value="reset">Reset Password</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form
                  onSubmit={handleSignIn}
                  className="space-y-4"
                  noValidate
                >
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      placeholder="you@example.com"
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <HCaptcha
                      sitekey={import.meta.env.VITE_HCAPTCHA_SITE_KEY}
                      onVerify={(token) => setSignInCaptchaToken(token)}
                      onError={() => setSignInCaptchaToken(null)}
                      onExpire={() => setSignInCaptchaToken(null)}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading || !signInCaptchaToken}
                    onClick={handleSignIn}
                  >
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form
                  onSubmit={handleSignUp}
                  className="space-y-4"
                  noValidate
                >
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      placeholder="John Doe"
                      value={signUpFullName}
                      onChange={(e) => setSignUpFullName(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      placeholder="you@example.com"
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      name="new-password"
                      type="password"
                      autoComplete="new-password"
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      required
                      minLength={6}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>I am a</Label>
                    <RadioGroup value={signUpRole} onValueChange={(value) => setSignUpRole(value as AppRole)}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="USER" id="role-user" />
                        <Label htmlFor="role-user" className="font-normal">User - Book appointments</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="ORGANIZATION" id="role-org" />
                        <Label htmlFor="role-org" className="font-normal">Organization - Manage appointments</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="terms"
                      checked={agreeToTerms}
                      onCheckedChange={(checked) => setAgreeToTerms(checked as boolean)}
                      className="mt-1"
                      disabled={isLoading}
                      aria-label="Agree to Terms of Service, Privacy Policy, and Refund Policy"
                    />
                    <Label htmlFor="terms" className="font-normal text-sm leading-relaxed cursor-pointer">
                      I agree to the{' '}
                      <Link to="/terms" className="text-primary hover:underline" target="_blank">
                        Terms of Service
                      </Link>
                      ,{' '}
                      <Link to="/privacy" className="text-primary hover:underline" target="_blank">
                        Privacy Policy
                      </Link>
                      , and{' '}
                      <Link to="/refund" className="text-primary hover:underline" target="_blank">
                        Refund Policy
                      </Link>
                    </Label>
                  </div>
                  <div className="space-y-2">
                    <HCaptcha
                      sitekey={import.meta.env.VITE_HCAPTCHA_SITE_KEY}
                      onVerify={(token) => setSignUpCaptchaToken(token)}
                      onError={() => setSignUpCaptchaToken(null)}
                      onExpire={() => setSignUpCaptchaToken(null)}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading || !agreeToTerms || !signUpCaptchaToken}
                    onClick={handleSignUp}
                  >
                    {isLoading ? 'Creating account...' : 'Sign Up'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="reset">
                <form
                  onSubmit={handlePasswordReset}
                  className="space-y-4"
                  noValidate
                >
                  {resetSent ? (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <p className="text-sm text-green-800 dark:text-green-200">
                        ✓ Password reset email sent! Check your inbox and follow the link to set a new password.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="reset-email">Email Address</Label>
                        <Input
                          id="reset-email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          inputMode="email"
                          placeholder="you@example.com"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          required
                          disabled={isLoading}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Enter the email address associated with your account. You'll receive a link to reset your password.
                      </p>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={isLoading}
                        onClick={handlePasswordReset}
                      >
                        {isLoading ? 'Sending...' : 'Send Reset Link'}
                      </Button>
                    </>
                  )}
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
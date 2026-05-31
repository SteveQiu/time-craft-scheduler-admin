import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { APP_NAME } from '@/config/app';
import { ROUTES } from '@/config/routes';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function SignUpConfirmation() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const email = params.get('email') ?? '';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Mail className="h-12 w-12 text-primary mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-foreground">{APP_NAME}</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Confirm your email</CardTitle>
            <CardDescription>
              {email
                ? `We sent a confirmation link to ${email}.`
                : 'We sent a confirmation link to your email.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Check your inbox (and spam folder) and click link to activate your account. Once
              confirmed, you can sign in.
            </p>
            <Button variant="outline" className="w-full" onClick={() => navigate(ROUTES.auth)}>
              Back to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

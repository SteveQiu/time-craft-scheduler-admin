import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Download, Trash2, Shield, CheckCircle2 } from 'lucide-react';
import { DataExportModal } from './DataExportModal';
import { DeleteAccountModal } from './DeleteAccountModal';
import { PreferencesCenter } from './PreferencesCenter';

interface ConsentRecord {
  id: string;
  user_id: string;
  consent_type: string;
  granted: boolean;
  granted_at: string;
}

export function PrivacySettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { data: consents = [], isLoading } = useQuery({
    queryKey: ['user-consents', user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('user_consents')
        .select('*')
        .eq('user_id', user?.id)
        .order('granted_at', { ascending: false });
      
      if (error) throw error;
      return data as ConsentRecord[];
    },
    enabled: !!user,
  });

  const updateConsent = useMutation({
    mutationFn: async ({ type, granted }: { type: string; granted: boolean }) => {
      const { error } = await (supabase as any).from('user_consents').upsert({
        user_id: user?.id,
        consent_type: type,
        granted,
        granted_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-consents'] });
      toast({
        title: 'Consent Updated',
        description: 'Your consent preferences have been saved.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update consent',
        variant: 'destructive',
      });
    },
  });

  const getConsentStatus = (type: string) => {
    const consent = consents.find((c) => c.consent_type === type);
    return consent?.granted || false;
  };

  const getConsentDate = (type: string) => {
    const consent = consents.find((c) => c.consent_type === type);
    return consent?.granted_at ? format(new Date(consent.granted_at), 'PPP') : 'Not set';
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading privacy settings…</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Consent Status
          </CardTitle>
          <CardDescription>
            Review and manage your consent preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="font-medium">Privacy Policy</div>
                <div className="text-sm text-muted-foreground">
                  Agreed on {getConsentDate('privacy_policy')}
                </div>
              </div>
              {getConsentStatus('privacy_policy') && (
                <Badge variant="outline" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Accepted
                </Badge>
              )}
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="font-medium">Terms of Service</div>
                <div className="text-sm text-muted-foreground">
                  Agreed on {getConsentDate('terms_of_service')}
                </div>
              </div>
              {getConsentStatus('terms_of_service') && (
                <Badge variant="outline" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Accepted
                </Badge>
              )}
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="font-medium">Product Updates</div>
                <div className="text-sm text-muted-foreground">
                  Optional email communications
                </div>
              </div>
              <Button
                variant={getConsentStatus('product_updates') ? 'outline' : 'default'}
                size="sm"
                onClick={() =>
                  updateConsent.mutate({
                    type: 'product_updates',
                    granted: !getConsentStatus('product_updates'),
                  })
                }
              >
                {getConsentStatus('product_updates') ? 'Disable' : 'Enable'}
              </Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="font-medium">Analytics</div>
                <div className="text-sm text-muted-foreground">
                  Help us improve with usage data
                </div>
              </div>
              <Button
                variant={getConsentStatus('analytics') ? 'outline' : 'default'}
                size="sm"
                onClick={() =>
                  updateConsent.mutate({
                    type: 'analytics',
                    granted: !getConsentStatus('analytics'),
                  })
                }
              >
                {getConsentStatus('analytics') ? 'Disable' : 'Enable'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <PreferencesCenter />

      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>
            Export or delete your account data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between p-4 border rounded-lg">
            <div className="flex-1 min-w-0">
              <div className="font-medium flex items-center gap-2">
                <Download className="h-4 w-4" />
                Download My Data
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Export all your personal data in JSON or CSV format
              </div>
            </div>
            <Button onClick={() => setShowExportModal(true)}>Export Data</Button>
          </div>

          <Separator />

          <div className="flex items-start justify-between p-4 border border-destructive/50 rounded-lg bg-destructive/5">
            <div className="flex-1 min-w-0">
              <div className="font-medium flex items-center gap-2 text-destructive">
                <Trash2 className="h-4 w-4" />
                Delete My Account
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Permanently delete your account and all associated data
              </div>
            </div>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteModal(true)}
            >
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      <DataExportModal open={showExportModal} onOpenChange={setShowExportModal} />
      <DeleteAccountModal open={showDeleteModal} onOpenChange={setShowDeleteModal} />
    </div>
  );
}

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Settings2 } from 'lucide-react';

interface UserPreferences {
  user_id: string;
  email_frequency: string;
  analytics_enabled: boolean;
  marketing_enabled: boolean;
  data_retention_days: number;
}

const EMAIL_FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'never', label: 'Never' },
];

const DATA_RETENTION_OPTIONS = [
  { value: '30', label: '30 Days' },
  { value: '365', label: '1 Year' },
  { value: '2555', label: '7 Years' },
];

export function PreferencesCenter() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [hasChanges, setHasChanges] = useState(false);

  const [preferences, setPreferences] = useState<UserPreferences>({
    user_id: user?.id || '',
    email_frequency: 'weekly',
    analytics_enabled: true,
    marketing_enabled: false,
    data_retention_days: 2555,
  });

  const { isLoading } = useQuery({
    queryKey: ['user-preferences', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user?.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setPreferences(data as UserPreferences);
      }
      return data as UserPreferences | null;
    },
    enabled: !!user,
  });

  const savePreferences = useMutation({
    mutationFn: async (prefs: UserPreferences) => {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({ ...prefs, user_id: user?.id }, { onConflict: 'user_id' });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-preferences'] });
      toast({
        title: 'Preferences Updated',
        description: 'Your privacy preferences have been saved.',
      });
      setHasChanges(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save preferences',
        variant: 'destructive',
      });
    },
  });

  const updatePreference = <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    savePreferences.mutate(preferences);
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading preferences…</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          Privacy Preferences
        </CardTitle>
        <CardDescription>
          Control how we use and communicate with your data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-frequency">Email Frequency</Label>
            <Select
              value={preferences.email_frequency}
              onValueChange={(value) => updatePreference('email_frequency', value)}
            >
              <SelectTrigger id="email-frequency">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                {EMAIL_FREQUENCIES.map((freq) => (
                  <SelectItem key={freq.value} value={freq.value}>
                    {freq.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              How often you'd like to receive updates
            </p>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex-1 min-w-0">
              <Label htmlFor="analytics-switch">Analytics</Label>
              <p className="text-sm text-muted-foreground">
                Allow usage tracking to improve service quality
              </p>
            </div>
            <Switch
              id="analytics-switch"
              checked={preferences.analytics_enabled}
              onCheckedChange={(checked) => updatePreference('analytics_enabled', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex-1 min-w-0">
              <Label htmlFor="marketing-switch">Marketing Communications</Label>
              <p className="text-sm text-muted-foreground">
                Receive promotional offers and product news
              </p>
            </div>
            <Switch
              id="marketing-switch"
              checked={preferences.marketing_enabled}
              onCheckedChange={(checked) => updatePreference('marketing_enabled', checked)}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="data-retention">Data Retention Period</Label>
            <Select
              value={preferences.data_retention_days.toString()}
              onValueChange={(value) => updatePreference('data_retention_days', parseInt(value))}
            >
              <SelectTrigger id="data-retention">
                <SelectValue placeholder="Select retention period" />
              </SelectTrigger>
              <SelectContent>
                {DATA_RETENTION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              How long we keep your inactive data
            </p>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={!hasChanges || savePreferences.isPending}
          className="w-full"
        >
          {savePreferences.isPending ? 'Saving…' : 'Save Preferences'}
        </Button>
      </CardContent>
    </Card>
  );
}

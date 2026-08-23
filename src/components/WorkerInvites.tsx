import { useMyInvites } from '@/hooks/useOrgWorkers';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Building2, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export function WorkerInvites() {
  const { invites, isLoading, acceptInvite } = useMyInvites();
  const queryClient = useQueryClient();

  if (isLoading) return null;
  if (invites.length === 0) return null;

  const handleAccept = async (inviteId: string) => {
    try {
      await acceptInvite.mutateAsync(inviteId);
      toast.success('Invite accepted! You now have access to the organization.');
      queryClient.invalidateQueries({ queryKey: ['my-invites'] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to accept invite');
    }
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Organization Invites
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {invites.map((invite: any) => (
          <div key={invite.id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
            <div>
              <p className="font-medium text-foreground">{invite.org_name || 'Organization'}</p>
              <p className="text-sm text-muted-foreground">Invited as: {invite.worker_name}</p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleAccept(invite.id)}
                disabled={acceptInvite.isPending}
              >
                {acceptInvite.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                Accept
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

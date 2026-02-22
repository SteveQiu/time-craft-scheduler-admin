import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Shield, CheckCircle, XCircle, Eye, MessageSquare } from 'lucide-react';

interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  reported_review_id: string | null;
  category: string;
  description: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  reporter_name?: string;
  reported_name?: string;
}

export default function AdminReports() {
  const { user } = useAuth();
  const { isInternalDev } = useUserRoles();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['admin-reports', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as 'pending' | 'reviewing' | 'resolved' | 'dismissed');
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch names
      const userIds = new Set<string>();
      (data || []).forEach((r: any) => {
        if (r.reporter_id) userIds.add(r.reporter_id);
        if (r.reported_user_id) userIds.add(r.reported_user_id);
      });

      const { data: profiles } = await supabase
        .rpc('get_public_profile_names', { profile_ids: [...userIds] });

      const nameMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name || 'Unknown']));

      return (data || []).map((r: any) => ({
        ...r,
        reporter_name: nameMap.get(r.reporter_id) || 'Unknown',
        reported_name: r.reported_user_id ? nameMap.get(r.reported_user_id) || 'Unknown' : null,
      })) as Report[];
    },
    enabled: !!user && isInternalDev,
  });

  const updateReport = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const update: any = { status };
      if (notes !== undefined) update.admin_notes = notes;
      const { error } = await supabase.from('reports').update(update).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      toast({ title: 'Report updated' });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'reviewing': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'resolved': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'dismissed': return 'bg-secondary text-secondary-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  if (!isInternalDev) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="text-center py-12">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Access restricted to administrators.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Report Queue</h2>
        <p className="text-muted-foreground">Review and manage user reports</p>
      </div>

      <Card className="shadow-soft border-card-border">
        <CardContent className="pt-6">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="reviewing">Reviewing</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-8">Loading reports...</p>
      ) : reports.length === 0 ? (
        <Card className="shadow-soft border-card-border">
          <CardContent className="text-center py-12">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg text-muted-foreground">No reports found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id} className="shadow-soft border-card-border">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge className={getStatusColor(report.status)}>
                        {report.status}
                      </Badge>
                      <Badge variant="outline">{report.category.replace('_', ' ')}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Reporter:</span> {report.reporter_name}
                      {report.reported_name && (
                        <> · <span className="font-medium">Reported:</span> {report.reported_name}</>
                      )}
                      {report.reported_review_id && (
                        <> · <span className="font-medium">Review ID:</span> {report.reported_review_id.slice(0, 8)}...</>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(report.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                <p className="text-sm text-foreground bg-muted p-3 rounded-md">{report.description}</p>

                {report.admin_notes && (
                  <div className="flex items-start space-x-2 text-sm">
                    <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <p className="text-muted-foreground">{report.admin_notes}</p>
                  </div>
                )}

                <div className="flex items-center space-x-2 pt-2">
                  <Textarea
                    placeholder="Admin notes..."
                    value={adminNotes[report.id] || ''}
                    onChange={(e) => setAdminNotes({ ...adminNotes, [report.id]: e.target.value })}
                    rows={1}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateReport.mutate({
                      id: report.id,
                      status: 'reviewing',
                      notes: adminNotes[report.id],
                    })}
                  >
                    <Eye className="h-4 w-4 mr-1" /> Review
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => updateReport.mutate({
                      id: report.id,
                      status: 'resolved',
                      notes: adminNotes[report.id],
                    })}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" /> Resolve
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => updateReport.mutate({
                      id: report.id,
                      status: 'dismissed',
                      notes: adminNotes[report.id],
                    })}
                  >
                    <XCircle className="h-4 w-4 mr-1" /> Dismiss
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

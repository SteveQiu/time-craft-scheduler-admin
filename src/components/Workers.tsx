import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Plus, Search, Edit, Trash2, Clock, Star, Calendar, Send, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useOrgWorkers, OrgWorker } from '@/hooks/useOrgWorkers';
import { toast } from 'sonner';

export function Workers() {
  const { user } = useAuth();
  const { workers, isLoading: workersLoading, inviteWorker, updateWorker, deleteWorker } = useOrgWorkers();
  const [searchTerm, setSearchTerm] = useState('');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [editingWorker, setEditingWorker] = useState<OrgWorker | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  const [inviteForm, setInviteForm] = useState({
    worker_name: '',
    worker_email: '',
    phone: '',
    skills: '',
    hourly_rate: 0,
  });

  const [editForm, setEditForm] = useState({
    worker_name: '',
    skills: '',
    hourly_rate: 0,
  });

  // Fetch real opening counts per worker
  const today = new Date().toISOString().split('T')[0];
  const { data: openingCounts = {} } = useQuery({
    queryKey: ['worker-opening-counts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('openings')
        .select('worker, id')
        .eq('is_available', true)
        .gte('date', today);
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((o: any) => {
        counts[o.worker] = (counts[o.worker] || 0) + 1;
      });
      return counts;
    },
    enabled: !!user,
  });

  const filteredWorkers = workers.filter(worker =>
    worker.worker_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    worker.skills.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleInvite = async () => {
    try {
      await inviteWorker.mutateAsync({
        worker_name: inviteForm.worker_name,
        worker_email: inviteForm.worker_email,
        phone: inviteForm.phone || undefined,
        skills: inviteForm.skills.split(',').map(s => s.trim()).filter(Boolean),
        hourly_rate: inviteForm.hourly_rate,
      });
      toast.success('Worker invited successfully!');
      setShowInviteDialog(false);
      setInviteForm({ worker_name: '', worker_email: '', phone: '', skills: '', hourly_rate: 0 });
    } catch (error: any) {
      toast.error(error.message || 'Failed to invite worker');
    }
  };

  const openEditDialog = (worker: OrgWorker) => {
    setEditingWorker(worker);
    setEditForm({
      worker_name: worker.worker_name,
      skills: worker.skills.join(', '),
      hourly_rate: worker.hourly_rate,
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editingWorker) return;
    try {
      await updateWorker.mutateAsync({
        id: editingWorker.id,
        worker_name: editForm.worker_name,
        skills: editForm.skills.split(',').map(s => s.trim()).filter(Boolean),
        hourly_rate: editForm.hourly_rate,
      });
      toast.success('Worker updated!');
      setShowEditDialog(false);
      setEditingWorker(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update worker');
    }
  };

  const handleDelete = async (worker: OrgWorker) => {
    try {
      await deleteWorker.mutateAsync(worker.id);
      toast.success('Worker removed!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove worker');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted': return <Badge variant="default" className="text-xs">Active</Badge>;
      case 'invited': return <Badge variant="secondary" className="text-xs">Invited</Badge>;
      case 'declined': return <Badge variant="destructive" className="text-xs">Declined</Badge>;
      default: return null;
    }
  };

  if (workersLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Workers</h2>
          <p className="text-muted-foreground">Manage your team of service providers</p>
        </div>
        <Button className="flex items-center space-x-2" onClick={() => setShowInviteDialog(true)}>
          <Plus className="h-4 w-4" />
          <span>Invite Worker</span>
        </Button>
      </div>

      {/* Search Bar */}
      <Card className="shadow-soft border-card-border">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search workers by name or skills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Workers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredWorkers.map((worker) => (
          <Card key={worker.id} className="shadow-soft border-card-border hover:shadow-medium transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-primary-foreground font-semibold text-lg">
                      {worker.worker_name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <CardTitle className="text-lg">{worker.worker_name}</CardTitle>
                    {getStatusBadge(worker.status)}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => openEditDialog(worker)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(worker)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Service to provide */}
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Service to provide</p>
                <div className="flex flex-wrap gap-1">
                  {worker.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Openings */}
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Openings</p>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {openingCounts[worker.worker_name] || 0} available opening{(openingCounts[worker.worker_name] || 0) !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Rate */}
              <div className="flex items-center justify-between pt-2 border-t border-card-border">
                <span className="text-sm text-muted-foreground">Hourly Rate</span>
                <span className="text-lg font-semibold text-primary">
                  ${worker.hourly_rate}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredWorkers.length === 0 && (
        <Card className="shadow-soft border-card-border">
          <CardContent className="text-center py-12">
            <div className="text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No workers found</p>
              <p className="text-sm">Invite workers to get started</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite Worker Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Worker</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="invite-name">Name</Label>
              <Input
                id="invite-name"
                value={inviteForm.worker_name}
                onChange={(e) => setInviteForm({...inviteForm, worker_name: e.target.value})}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteForm.worker_email}
                onChange={(e) => setInviteForm({...inviteForm, worker_email: e.target.value})}
                placeholder="worker@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-phone">Phone</Label>
              <Input
                id="invite-phone"
                value={inviteForm.phone}
                onChange={(e) => setInviteForm({...inviteForm, phone: e.target.value})}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-skills">Services (comma separated)</Label>
              <Textarea
                id="invite-skills"
                value={inviteForm.skills}
                onChange={(e) => setInviteForm({...inviteForm, skills: e.target.value})}
                placeholder="Hair Cut, Hair Color, Styling"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-rate">Hourly Rate ($)</Label>
              <Input
                id="invite-rate"
                type="number"
                value={inviteForm.hourly_rate}
                onChange={(e) => setInviteForm({...inviteForm, hourly_rate: parseInt(e.target.value) || 0})}
              />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleInvite} disabled={inviteWorker.isPending}>
                <Send className="h-4 w-4 mr-2" />
                {inviteWorker.isPending ? 'Inviting...' : 'Send Invite'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Worker Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Worker</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={editForm.worker_name}
                onChange={(e) => setEditForm({...editForm, worker_name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skills">Services (comma separated)</Label>
              <Textarea
                id="skills"
                value={editForm.skills}
                onChange={(e) => setEditForm({...editForm, skills: e.target.value})}
                placeholder="Hair Cut, Hair Color, Styling"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
              <Input
                id="hourlyRate"
                type="number"
                value={editForm.hourly_rate}
                onChange={(e) => setEditForm({...editForm, hourly_rate: parseInt(e.target.value) || 0})}
              />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={updateWorker.isPending}>
                {updateWorker.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

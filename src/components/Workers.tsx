import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Plus, Search, Edit, Trash2, Clock, Star, Mail, Phone, Calendar } from 'lucide-react';

interface Worker {
  id: string;
  name: string;
  email: string;
  phone: string;
  skills: string[];
  rating: number;
  availability: string[];
  hourlyRate: number;
  image?: string;
}

export function Workers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    skills: '',
    hourlyRate: 0
  });
  
  const workers: Worker[] = [
    {
      id: '1',
      name: 'Sarah Johnson',
      email: 'sarah@appointmentpro.com',
      phone: '+1 (555) 123-4567',
      skills: ['Hair Cut', 'Hair Color', 'Styling'],
      rating: 4.9,
      availability: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      hourlyRate: 65,
    },
    {
      id: '2',
      name: 'Mike Wilson',
      email: 'mike@appointmentpro.com',
      phone: '+1 (555) 234-5678',
      skills: ['Deep Tissue Massage', 'Swedish Massage', 'Sports Massage'],
      rating: 4.8,
      availability: ['Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      hourlyRate: 80,
    },
    {
      id: '3',
      name: 'Lisa Chen',
      email: 'lisa@appointmentpro.com',
      phone: '+1 (555) 345-6789',
      skills: ['Business Consultation', 'Strategy Planning', 'Market Analysis'],
      rating: 4.9,
      availability: ['Mon', 'Wed', 'Fri'],
      hourlyRate: 120,
    },
    {
      id: '4',
      name: 'David Rodriguez',
      email: 'david@appointmentpro.com',
      phone: '+1 (555) 456-7890',
      skills: ['Personal Training', 'Nutrition Coaching', 'Weight Loss'],
      rating: 4.7,
      availability: ['Mon', 'Tue', 'Thu', 'Fri', 'Sat', 'Sun'],
      hourlyRate: 55,
    },
  ];

  const filteredWorkers = workers.filter(worker =>
    worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    worker.skills.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const openEditDialog = (worker: Worker) => {
    setEditingWorker(worker);
    setEditForm({
      name: worker.name,
      email: worker.email,
      phone: worker.phone,
      skills: worker.skills.join(', '),
      hourlyRate: worker.hourlyRate
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = () => {
    // In a real app, this would update the worker in the database
    console.log('Saving worker:', editForm);
    setShowEditDialog(false);
    setEditingWorker(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Workers</h2>
          <p className="text-muted-foreground">Manage your team of service providers</p>
        </div>
        <Button className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Add Worker</span>
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
                      {worker.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <CardTitle className="text-lg">{worker.name}</CardTitle>
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-warning fill-current" />
                      <span className="text-sm text-muted-foreground">{worker.rating}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => openEditDialog(worker)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Contact Info */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{worker.email}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{worker.phone}</span>
                </div>
              </div>

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
                    3 openings this week
                  </span>
                </div>
              </div>

              {/* Rate */}
              <div className="flex items-center justify-between pt-2 border-t border-card-border">
                <span className="text-sm text-muted-foreground">Hourly Rate</span>
                <span className="text-lg font-semibold text-primary">
                  ${worker.hourlyRate}
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
              <p className="text-sm">Try adjusting your search terms</p>
            </div>
          </CardContent>
        </Card>
      )}

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
                value={editForm.name}
                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({...editForm, email: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="skills">Service to provide (comma separated)</Label>
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
                value={editForm.hourlyRate}
                onChange={(e) => setEditForm({...editForm, hourlyRate: parseInt(e.target.value) || 0})}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Plus, Pencil, Trash2, Check, X, Loader2 } from 'lucide-react';
import { useResources, Resource } from '@/hooks/useResources';
import { toast } from 'sonner';

export function Resources() {
  const { resources, isLoading, addResource, updateResource, deleteResource } = useResources();
  const [newName, setNewName] = useState('');
  const [newRate, setNewRate] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRate, setEditRate] = useState('');

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      await addResource.mutateAsync({
        name: newName.trim(),
        hourly_rate: newRate ? parseFloat(newRate) : null,
      });
      setNewName('');
      setNewRate('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add resource');
    }
  };

  const startEdit = (resource: Resource) => {
    setEditingId(resource.id);
    setEditName(resource.name);
    setEditRate(resource.hourly_rate != null ? String(resource.hourly_rate) : '');
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    try {
      await updateResource.mutateAsync({
        id: editingId,
        name: editName.trim(),
        hourly_rate: editRate ? parseFloat(editRate) : null,
      } as any);
      setEditingId(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update resource');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteResource.mutateAsync(id);
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove resource');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-xl">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Resources</h2>
        <p className="text-sm text-muted-foreground mt-1">People, rooms, equipment — anything you assign to openings</p>
      </div>

      {/* Add */}
      <div className="flex gap-2 bg-background rounded-lg border p-3 shadow-sm">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Resource name"
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          className="flex-1"
        />
        <Input
          value={newRate}
          onChange={(e) => setNewRate(e.target.value)}
          placeholder="$/hr (optional)"
          type="number"
          className="w-32"
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
        />
        <Button onClick={handleAdd} disabled={addResource.isPending || !newName.trim()}>
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {/* List */}
      {resources.length > 0 ? (
        <div className="bg-background rounded-lg border shadow-md overflow-hidden">
          {resources.map((r, i) => (
            <div
              key={r.id}
              className={`flex items-center gap-3 px-4 py-4 hover:bg-accent/40 transition-colors ${i < resources.length - 1 ? 'border-b' : ''}`}
            >
              {editingId === r.id ? (
                <>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit();
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="h-9 flex-1"
                    autoFocus
                  />
                  <Input
                    value={editRate}
                    onChange={(e) => setEditRate(e.target.value)}
                    placeholder="$/hr"
                    type="number"
                    className="h-9 w-24"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit();
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                  />
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-primary" onClick={handleSaveEdit}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setEditingId(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium">{r.name}</span>
                  {r.hourly_rate != null && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">${r.hourly_rate}/hr</span>
                  )}
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:text-foreground" aria-label="Edit resource" onClick={() => startEdit(r)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:text-destructive" aria-label="Delete resource" onClick={() => handleDelete(r.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-background rounded-lg border shadow-sm text-center py-10">
          <p className="text-muted-foreground">No resources yet</p>
          <p className="text-xs text-muted-foreground mt-1">Add one above to get started</p>
        </div>
      )}
    </div>
  );
}

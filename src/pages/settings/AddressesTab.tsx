import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useWorkplaceAddresses } from '@/hooks/useWorkplaceAddresses';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, MapPin, Star, Edit, Trash2 } from 'lucide-react';
import { AddressInput } from '@/components/ui/AddressInput';
import { WorkplaceAddress, AddressFields, EMPTY_ADDRESS_FIELDS } from './types';
import { parseAddress, formatAddressDisplay } from './settingsUtils';

export function AddressesTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { addresses, isLoading, saveAddress, deleteAddress, setDefaultAddress } = useWorkplaceAddresses(user?.id);

  const [showDialog, setShowDialog] = useState(false);
  const [editingAddress, setEditingAddress] = useState<WorkplaceAddress | null>(null);
  const [addressForm, setAddressForm] = useState<{ label: string } & AddressFields>({ label: '', ...EMPTY_ADDRESS_FIELDS });

  const openAdd = () => {
    setEditingAddress(null);
    setAddressForm({ label: '', ...EMPTY_ADDRESS_FIELDS });
    setShowDialog(true);
  };

  const openEdit = (addr: WorkplaceAddress) => {
    setEditingAddress(addr);
    const parsed = parseAddress(addr.address);
    setAddressForm({ label: addr.label, ...parsed });
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!user) return;
    const addressJson = JSON.stringify({
      street: addressForm.street,
      city: addressForm.city,
      province: addressForm.province,
      country: addressForm.country,
      zip: addressForm.zip,
    });
    saveAddress.mutate(
      { label: addressForm.label, addressJson, editingId: editingAddress?.id, userId: user.id },
      {
        onSuccess: () => {
          setShowDialog(false);
          setEditingAddress(null);
          setAddressForm({ label: '', ...EMPTY_ADDRESS_FIELDS });
          toast({ title: editingAddress ? 'Address updated' : 'Address added' });
        },
        onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
      }
    );
  };

  const handleDelete = (id: string) => {
    deleteAddress.mutate(id, {
      onSuccess: () => toast({ title: 'Address removed' }),
    });
  };

  const handleSetDefault = (id: string) => {
    if (!user) return;
    setDefaultAddress.mutate({ id, userId: user.id });
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Address
          </Button>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-center py-8">Loading...</p>
        ) : addresses.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-lg text-muted-foreground">No addresses saved</p>
              <p className="text-sm text-muted-foreground">Add addresses to quickly select them when creating openings</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map((addr) => (
              <Card key={addr.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground">{addr.label}</h3>
                        {addr.is_default && <Badge variant="secondary">Default</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{formatAddressDisplay(addr.address)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {!addr.is_default && (
                        <Button variant="ghost" size="sm" onClick={() => handleSetDefault(addr.id)} title="Set as default">
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => openEdit(addr)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(addr.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingAddress ? 'Edit Address' : 'Add Address'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Label</Label>
              <Input
                placeholder="e.g. Main Office, Studio A"
                value={addressForm.label}
                onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Street Address</Label>
              <Input
                placeholder="123 Main St"
                value={addressForm.street}
                onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
              />
            </div>
            <AddressInput
              value={{ city: addressForm.city, province: addressForm.province, country: addressForm.country, zip: addressForm.zip }}
              onChange={(fields) => setAddressForm({ ...addressForm, ...fields })}
            />
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button
                onClick={handleSave}
                disabled={!addressForm.label || !addressForm.street || !addressForm.city || saveAddress.isPending}
              >
                {saveAddress.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

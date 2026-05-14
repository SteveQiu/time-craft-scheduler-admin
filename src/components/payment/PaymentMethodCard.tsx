import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Edit, Trash2 } from 'lucide-react';
import { PaymentMethodRecord } from '@/lib/payment/types';
import { getMethodLabel } from '@/lib/payment/methods';
import { deserializeDetailsByType } from '@/lib/payment/serialization';

interface PaymentMethodCardProps {
  method: PaymentMethodRecord;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault?: () => void;
}

/**
 * Settings list item for a saved payment method.
 * Shows label, type badge, a brief details summary, and action buttons.
 */
export function PaymentMethodCard({
  method,
  onEdit,
  onDelete,
  onSetDefault,
}: PaymentMethodCardProps) {
  const details = deserializeDetailsByType(method.type, method.details);

  const summary = getSummary(method.type, details, method.details);

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground">{method.label}</h3>
              <Badge variant="outline">{getMethodLabel(method.type)}</Badge>
              {method.is_default && <Badge variant="secondary">Default</Badge>}
            </div>
            {summary}
          </div>
          <div className="flex items-center gap-1">
            {onSetDefault && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSetDefault}
                title="Set as default"
              >
                <Star className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getSummary(
  type: string,
  details: Record<string, string>,
  rawDetails: string | null,
): React.ReactNode {
  switch (type) {
    case 'cash':
      return <p className="text-sm text-muted-foreground">Cash accepted</p>;

    case 'onsite_credit_card':
      return <p className="text-sm text-muted-foreground">Card accepted</p>;

    case 'venmo': {
      const username = details.username;
      const phone = details.phone || (details.url && /^[+\d\s\-().]+$/.test(details.url) ? details.url : undefined);
      const qr = details.qr || (details.url?.startsWith('data:image') ? details.url : undefined);
      if (qr) return <img src={qr} alt="QR Code" className="w-20 h-20 object-contain mt-1 rounded" />;
      if (username) return <p className="text-sm text-muted-foreground">@{username.replace(/^@/, '')}</p>;
      if (phone) return <p className="text-sm text-muted-foreground">{phone}</p>;
      return null;
    }

    case 'paypal': {
      const username = details.username;
      const qr = details.qr;
      const legacyUrl = details.url;
      if (qr) return <img src={qr} alt="QR Code" className="w-20 h-20 object-contain mt-1 rounded" />;
      if (username) return <p className="text-sm text-muted-foreground">paypal.me/{username}</p>;
      if (legacyUrl) return <p className="text-sm text-muted-foreground">{legacyUrl}</p>;
      return null;
    }

    case 'wechat': {
      const qr = details.qr || (details.url?.startsWith('data:image') ? details.url : undefined);
      if (qr) return <img src={qr} alt="QR Code" className="w-20 h-20 object-contain mt-1 rounded" />;
      return null;
    }

    case 'email_transfer': {
      const email = details.email || (details.url?.includes('@') ? details.url : undefined);
      if (email) return <p className="text-sm text-muted-foreground">{email}</p>;
      return null;
    }

    default:
      if (rawDetails) return <p className="text-sm text-muted-foreground">{rawDetails}</p>;
      return null;
  }
}

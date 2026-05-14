import React from 'react';
import { ExternalLink } from 'lucide-react';
import { PaymentMethodType, PaymentDetails } from '@/lib/payment/types';

interface PaymentDisplayProps {
  type: PaymentMethodType;
  details: PaymentDetails;
}

/**
 * Customer-facing display of a payment method.
 * Handles all known types and legacy plain-string formats (via deserializeDetailsByType).
 */
export function PaymentDisplay({ type, details }: PaymentDisplayProps) {
  switch (type) {
    case 'cash':
      return <p className="text-sm text-muted-foreground">Cash accepted</p>;

    case 'onsite_credit_card':
      return <span className="inline-block px-3 py-1 bg-orange-100 text-orange-700 rounded text-sm">Card</span>;

    case 'venmo': {
      const username = details.username;
      // legacy phone: stored in details.phone (new) or details.url (old phone-format)
      const phone =
        details.phone ||
        (details.url && /^[+\d\s\-().]+$/.test(details.url) ? details.url : undefined);
      const qr =
        details.qr ||
        (details.url?.startsWith('data:image') ? details.url : undefined);
      if (!username && !phone && !qr) {
        return <p className="text-sm text-muted-foreground">Venmo details not configured</p>;
      }
      return (
        <div className="space-y-2">
          {username && (
            <a
              href={`https://venmo.com/${username.replace(/^@/, '')}?txn=pay`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-md bg-black text-white hover:bg-neutral-800 break-all"
            >
              @{username.replace(/^@/, '')}
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          {!username && phone && (
            <p className="text-sm text-muted-foreground">{phone}</p>
          )}
          {qr && (
            <img src={qr} alt="Venmo QR Code" className="w-40 h-40 object-contain rounded border" />
          )}
        </div>
      );
    }

    case 'paypal': {
      const username = details.username;
      const qr = details.qr;
      const legacyUrl = details.url;
      if (!username && !qr && !legacyUrl) {
        return (
          <p className="text-sm text-muted-foreground">PayPal username or QR not configured</p>
        );
      }
      return (
        <div className="space-y-3">
          {username && (
            <a
              href={`https://paypal.me/${username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-md bg-black text-white hover:bg-neutral-800 break-all"
            >
              paypal.me/{username}
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          {qr && (
            <img src={qr} alt="PayPal QR Code" className="w-40 h-40 object-contain rounded border" />
          )}
          {!username && !qr && legacyUrl && (
            legacyUrl.startsWith('http') ? (
              <a
                href={legacyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary underline break-all"
              >
                {legacyUrl}
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">{legacyUrl}</p>
            )
          )}
        </div>
      );
    }

    case 'wechat': {
      const qr =
        details.qr ||
        (details.url?.startsWith('data:image') ? details.url : undefined);
      return qr ? (
        <img src={qr} alt="WeChat QR Code" className="w-40 h-40 object-contain rounded border" />
      ) : (
        <p className="text-sm text-muted-foreground">WeChat QR not configured</p>
      );
    }

    case 'email_transfer': {
      const email =
        details.email ||
        (details.url?.includes('@') ? details.url : undefined);
      const phone = details.phone;
      const message = details.message;
      if (!email && !phone) {
        return (
          <p className="text-sm text-muted-foreground">Email transfer details not configured</p>
        );
      }
      return (
        <div className="space-y-1">
          {email && (
            <p className="text-sm font-medium break-all">{email}</p>
          )}
          {phone && <p className="text-sm text-muted-foreground">{phone}</p>}
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </div>
      );
    }

    default: {
      // Unknown type: render key-value pairs
      const entries = Object.entries(details).filter(([, v]) => v);
      if (entries.length === 0) return null;
      return (
        <div className="space-y-1">
          {entries.map(([k, v]) =>
            v.startsWith('data:image') ? (
              <img key={k} src={v} alt={k} className="w-40 h-40 object-contain rounded border" />
            ) : (
              <p key={k} className="text-sm text-muted-foreground">
                {k}: {v}
              </p>
            ),
          )}
        </div>
      );
    }
  }
}

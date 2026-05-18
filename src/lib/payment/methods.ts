import { PaymentMethodConfig, PaymentMethodType } from './types';

export const PAYMENT_METHOD_CONFIGS: PaymentMethodConfig[] = [
  {
    id: PaymentMethodType.Cash,
    label: 'Cash',
    fields: [],
  },
  {
    id: PaymentMethodType.OnsiteDebitCard,
    label: 'Onsite Debit Card',
    fields: [
      { key: 'instructions', label: 'Instructions (optional)', type: 'text', placeholder: 'e.g. We accept Interac debit via Square', optional: true },
    ],
  },
  {
    id: PaymentMethodType.OnsiteCreditCard,
    label: 'Onsite Credit Card',
    fields: [
      { key: 'instructions', label: 'Instructions (optional)', type: 'text', placeholder: 'e.g. We accept Visa, Mastercard via Square', optional: true },
    ],
  },
  {
    id: PaymentMethodType.PayPal,
    label: 'PayPal',
    fields: [
      { key: 'username', label: 'PayPal Username', type: 'text', placeholder: 'username', optional: true },
      { key: 'qr', label: 'QR Code', type: 'image', optional: true },
    ],
    tabGroups: [
      { label: 'Username', keys: ['username'] },
      { label: 'QR Code', keys: ['qr'] },
    ],
  },
  {
    id: PaymentMethodType.Venmo,
    label: 'Venmo',
    fields: [
      { key: 'username', label: 'Venmo Username', type: 'text', placeholder: '@username', optional: true },
      { key: 'qr', label: 'QR Code', type: 'image', optional: true },
    ],
    tabGroups: [
      { label: 'Username', keys: ['username'] },
      { label: 'QR Code', keys: ['qr'] },
    ],
  },
  {
    id: PaymentMethodType.EmailTransfer,
    label: 'Email Transfer',
    fields: [
      { key: 'email', label: 'Email', type: 'text', placeholder: 'email@example.com' },
      { key: 'phone', label: 'Phone (optional)', type: 'text', optional: true },
      { key: 'message', label: 'Security Question / Message (optional)', type: 'text', optional: true },
    ],
  },
  {
    id: PaymentMethodType.WeChat,
    label: 'WeChat',
    fields: [
      { key: 'qr', label: 'QR Code', type: 'image' },
    ],
  },
];

/** Lookup a method config by type id. Returns undefined for unknown types. */
export function getMethodConfig(type: string): PaymentMethodConfig | undefined {
  return PAYMENT_METHOD_CONFIGS.find((c) => c.id === type);
}

/** Human-readable label for a type id. Falls back to the raw type string. */
export function getMethodLabel(type: string): string {
  return getMethodConfig(type)?.label ?? type;
}

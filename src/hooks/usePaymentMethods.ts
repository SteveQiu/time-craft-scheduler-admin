import { PaymentMethodType } from '@/lib/payment/types';
import { PAYMENT_METHOD_CONFIGS } from '@/lib/payment/methods';

export { PaymentMethodType };

export const CARD_PAYMENT_TYPES = new Set([
  PaymentMethodType.OnsiteDebitCard,
  PaymentMethodType.OnsiteCreditCard,
]);

export const NOTE_REQUIRED_TYPES = new Set([
  PaymentMethodType.PayPal,
  PaymentMethodType.Venmo,
  PaymentMethodType.EmailTransfer,
  PaymentMethodType.WeChat,
]);

export const ONSITE_PAYMENT_TYPES = new Set([
  PaymentMethodType.Cash,
  PaymentMethodType.OnsiteDebitCard,
  PaymentMethodType.OnsiteCreditCard,
]);

export function isCardPayment(type: PaymentMethodType | string): boolean {
  return CARD_PAYMENT_TYPES.has(type as PaymentMethodType);
}

export function requiresPaymentNote(type: PaymentMethodType | string): boolean {
  return NOTE_REQUIRED_TYPES.has(type as PaymentMethodType);
}

export function isOnsitePayment(type: PaymentMethodType | string): boolean {
  return ONSITE_PAYMENT_TYPES.has(type as PaymentMethodType);
}

export function getPaymentMethodLabel(type: PaymentMethodType | string): string {
  const config = PAYMENT_METHOD_CONFIGS.find(c => (c.id as string) === (type as string));
  return config?.label ?? (type as string);
}

export function getAvailablePaymentMethods() {
  return PAYMENT_METHOD_CONFIGS;
}

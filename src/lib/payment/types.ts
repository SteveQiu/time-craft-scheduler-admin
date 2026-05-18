export type PaymentMethodType =
  | 'venmo'
  | 'paypal'
  | 'wechat'
  | 'email_transfer'
  | 'cash'
  | 'onsite_debit_card'
  | 'onsite_credit_card'
  | string;

export interface PaymentFieldConfig {
  key: string;
  label: string;
  type: 'text' | 'image' | 'readonly';
  placeholder?: string;
  helperText?: string;
  optional?: boolean;
}

export interface PaymentTabGroup {
  label: string;
  /** Field keys shown when this tab is active */
  keys: string[];
}

export interface PaymentMethodConfig {
  id: PaymentMethodType;
  label: string;
  fields: PaymentFieldConfig[];
  /** If set, fields are rendered as mutually exclusive tabs (either/or). */
  tabGroups?: PaymentTabGroup[];
}

/** Key→value map of a payment method's config values. */
export interface PaymentDetails {
  [key: string]: string;
}

/** Raw DB row shape — details is still a serialized string. */
export interface PaymentMethodRecord {
  id: string;
  user_id: string;
  label: string;
  type: PaymentMethodType;
  details: string | null;
  is_default: boolean;
  created_at: string;
}

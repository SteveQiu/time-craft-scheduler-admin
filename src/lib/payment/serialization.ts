import { PaymentDetails } from './types';

const MAX_DIM = 800;
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1 MB

/** Compress an image file to ≤800×800 JPEG base64. Returns null if file is too large. */
export async function compressImageFile(file: File): Promise<string | null> {
  if (file.size > MAX_FILE_SIZE) return null;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function serializeDetails(details: PaymentDetails): string {
  return JSON.stringify(details);
}

/** Generic deserialization: JSON object or falls back to { url: raw }. */
export function deserializeDetails(raw: string | null | undefined): PaymentDetails {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) return parsed as PaymentDetails;
    return { url: raw };
  } catch {
    return { url: raw };
  }
}

/**
 * Type-aware deserialization — handles legacy plain-string formats for each type.
 *
 * - venmo:          base64→{qr}, phone-like→{phone}, else→{username}
 * - wechat:         base64→{qr}
 * - email_transfer: plain email→{email}
 * - paypal:         JSON already; legacy URL→{url}
 * - other:          generic fallback
 */
export function deserializeDetailsByType(
  type: string,
  raw: string | null | undefined,
): PaymentDetails {
  if (!raw) return {};

  // Try JSON first (works for paypal new format, any future JSON formats)
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) return parsed as PaymentDetails;
  } catch {
    // fall through to legacy handling
  }

  switch (type) {
    case 'venmo':
      if (raw.startsWith('data:image')) return { qr: raw };
      if (/^[+\d\s\-().]+$/.test(raw) && raw.length > 0) return { phone: raw };
      return { username: raw };
    case 'wechat':
      return { qr: raw };
    case 'email_transfer':
      return { email: raw };
    case 'paypal':
      return raw.startsWith('http') ? { url: raw } : { username: raw };
    default:
      return { url: raw };
  }
}

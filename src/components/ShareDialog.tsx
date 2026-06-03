import { QRCodeSVG } from 'qrcode.react';
import { Check, Copy } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareUrl: string;
  title?: string;
  displayName?: string;
}

type CopiedState = 'copy' | 'instagram' | 'tiktok' | null;

type ShareButtonProps = {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  active?: boolean;
  status?: string;
};

function ShareButton({ label, icon, onClick, active = false, status }: ShareButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      className={cn(
        'h-auto min-h-20 flex-col items-center justify-center gap-2 px-3 py-3 text-center',
        active && 'border-primary/40 bg-primary/5 text-primary hover:bg-primary/10'
      )}
      onClick={onClick}
    >
      {icon}
      <span className="text-sm font-medium leading-none">{label}</span>
      {status ? <span className="text-[11px] leading-tight text-muted-foreground">{status}</span> : null}
    </Button>
  );
}

function PlatformIcon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
      {children}
    </svg>
  );
}

function getXShareText(title: string, displayName?: string) {
  const shareTarget = title.replace(/^share\s*/i, '').trim().toLowerCase();

  if (displayName && shareTarget === 'profile') {
    return `Check out ${displayName}'s profile on PikAppoint`;
  }

  if (displayName) {
    return `Check out ${displayName} on PikAppoint`;
  }

  if (shareTarget) {
    return `Check out this ${shareTarget} on PikAppoint`;
  }

  return 'Check this out on PikAppoint';
}

export function ShareDialog({
  open,
  onOpenChange,
  shareUrl,
  title = 'Share',
  displayName,
}: ShareDialogProps) {
  const [copied, setCopied] = useState<CopiedState>(null);
  const timeoutRef = useRef<number | null>(null);
  const qrRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const resetCopied = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => setCopied(null), 2000);
  };

  const handleCopy = async (type: CopiedState = 'copy') => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(type);
    resetCopied();
  };

  const handleOpenShare = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleWeChat = () => {
    qrRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-lg sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{displayName ? `${title} — ${displayName}` : title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div ref={qrRef} className="flex flex-col items-center gap-3 rounded-xl border bg-muted/10 px-4 py-4">
            <div className="rounded-lg border bg-white p-3">
              <QRCodeSVG value={shareUrl} size={180} />
            </div>
            <p className="text-xs text-center text-muted-foreground break-all">{shareUrl}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <ShareButton
              label={copied === 'copy' ? 'Copied!' : 'Copy Link'}
              status={copied === 'copy' ? 'Paste from clipboard' : undefined}
              active={copied === 'copy'}
              onClick={() => void handleCopy('copy')}
              icon={
                copied === 'copy' ? (
                  <Check className="h-5 w-5 text-green-600" />
                ) : (
                  <Copy className="h-5 w-5" />
                )
              }
            />
            <ShareButton
              label="WeChat"
              status="Scan QR above"
              onClick={handleWeChat}
              icon={
                <PlatformIcon>
                  <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 01.598.082l1.584.926a.272.272 0 00.14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 01-.023-.156.49.49 0 01.201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-7.062-6.122zm-3.318 2.187c.537 0 .972.441.972.985a.979.979 0 01-.972.986.979.979 0 01-.972-.986c0-.544.435-.985.972-.985zm6.568 0c.537 0 .972.441.972.985a.979.979 0 01-.972.986.979.979 0 01-.972-.986c0-.544.435-.985.972-.985z" />
                </PlatformIcon>
              }
            />
            <ShareButton
              label="Facebook"
              onClick={() => handleOpenShare(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`)}
              icon={
                <PlatformIcon>
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </PlatformIcon>
              }
            />
            <ShareButton
              label="Post on X"
              onClick={() =>
                handleOpenShare(
                  `https://x.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(getXShareText(title, displayName))}`
                )
              }
              icon={
                <PlatformIcon>
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </PlatformIcon>
              }
            />
            <ShareButton
              label={copied === 'instagram' ? 'Link copied!' : 'Instagram'}
              status={copied === 'instagram' ? 'Paste into Instagram bio or DM' : undefined}
              onClick={() => void handleCopy('instagram')}
              icon={
                <PlatformIcon>
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </PlatformIcon>
              }
            />
            <ShareButton
              label={copied === 'tiktok' ? 'Link copied!' : 'TikTok'}
              status={copied === 'tiktok' ? 'Paste into TikTok bio' : undefined}
              onClick={() => void handleCopy('tiktok')}
              icon={
                <PlatformIcon>
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.22 8.22 0 004.83 1.55V6.79a4.85 4.85 0 01-1.06-.1z" />
                </PlatformIcon>
              }
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

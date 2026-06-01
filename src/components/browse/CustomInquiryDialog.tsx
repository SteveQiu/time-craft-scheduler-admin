import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, Mail, Phone, Twitter, Instagram, Linkedin, Facebook, Globe } from 'lucide-react';
import type { CustomInquiryInfo } from '@/types/browse';

interface CustomInquiryDialogProps {
  open: boolean;
  onClose: () => void;
  providerName: string;
  providerId: string;
  info: CustomInquiryInfo;
}

const SOCIAL_ICONS: Record<string, React.ReactNode> = {
  twitter: <Twitter className="h-4 w-4" />,
  instagram: <Instagram className="h-4 w-4" />,
  linkedin: <Linkedin className="h-4 w-4" />,
  facebook: <Facebook className="h-4 w-4" />,
};

export function CustomInquiryDialog({ open, onClose, providerName, providerId, info }: CustomInquiryDialogProps) {
  const socialLinks = info.social_links
    ? Object.entries(info.social_links).filter(([, url]) => url)
    : [];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Custom Time Inquiry</DialogTitle>
          <DialogDescription>
            Contact {providerName} directly to request a custom appointment time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {info.email && (
            <a
              href={`mailto:${info.email}`}
              className="flex items-center gap-3 text-sm text-foreground hover:text-primary transition-colors"
            >
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{info.email}</span>
            </a>
          )}

          {info.phone && (
            <a
              href={`tel:${info.phone}`}
              className="flex items-center gap-3 text-sm text-foreground hover:text-primary transition-colors"
            >
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{info.phone}</span>
            </a>
          )}

          {socialLinks.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Social Links</p>
              {socialLinks.map(([platform, url]) => (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm text-foreground hover:text-primary transition-colors capitalize"
                >
                  {SOCIAL_ICONS[platform] ?? <Globe className="h-4 w-4 text-muted-foreground" />}
                  <span>{platform}</span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto" />
                </a>
              ))}
            </div>
          )}

          {info.profile_url && (
            <a
              href={info.profile_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              View provider profile
            </a>
          )}

          <p className="text-xs text-muted-foreground pt-2 border-t">
            For more information, visit{' '}
            <a href={`/profile/${providerId}`} className="underline hover:text-primary">
              {providerName}&apos;s profile page
            </a>
            .
          </p>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

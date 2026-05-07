import React, { useEffect, useState } from 'react';
import { APP_CONFIG } from '@/config/app';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

interface ConsentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType: 'privacy' | 'terms';
}

export function ConsentModal({ open, onOpenChange, contentType }: ConsentModalProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadContent();
    }
  }, [open, contentType]);

  const loadContent = async () => {
    setLoading(true);
    try {
      const path = contentType === 'privacy'
        ? '/legal/privacy-policy.md'
        : '/legal/terms-of-service.md';
      
      const response = await fetch(path);
      if (response.ok) {
        const text = await response.text();
        setContent(text);
      } else {
        setContent(getFallbackContent());
      }
    } catch (error) {
      console.error('Failed to load policy:', error);
      setContent(getFallbackContent());
    } finally {
      setLoading(false);
    }
  };

  const getFallbackContent = () => {
    if (contentType === 'privacy') {
      return `# Privacy Policy

Last updated: ${new Date().toLocaleDateString()}

## Introduction
We value your privacy and are committed to protecting your personal data.

## Data Collection
We collect information you provide directly, including name, email, and usage data.

## Data Usage
Your data is used to provide and improve our services.

## Data Sharing
We do not sell your personal data to third parties.

## Your Rights
You have the right to access, correct, or delete your personal data.

## Contact
For privacy concerns, contact us at ${APP_CONFIG.privacyEmail}`;
    } else {
      return `# Terms of Service

Last updated: ${new Date().toLocaleDateString()}

## Acceptance
By using our service, you agree to these terms.

## Service Description
${APP_CONFIG.name} provides scheduling and time management services.

## User Obligations
You must provide accurate information and use the service lawfully.

## Account Termination
We reserve the right to terminate accounts that violate these terms.

## Limitation of Liability
We are not liable for indirect or consequential damages.

## Changes to Terms
We may update these terms. Continued use implies acceptance.

## Contact
For questions, contact us at ${APP_CONFIG.legalEmail}`;
    }
  };

  const title = contentType === 'privacy' ? 'Privacy Policy' : 'Terms of Service';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Please review our {contentType === 'privacy' ? 'privacy policy' : 'terms of service'}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                {content}
              </pre>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

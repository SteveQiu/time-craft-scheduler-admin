import type { LucideIcon } from 'lucide-react';
import { ExternalLink, Facebook, Instagram, Linkedin, Twitter, Youtube } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { FormState, ProfileData, SocialLinks } from './types';

interface ProfileSocialLinksProps {
  profile: ProfileData;
  editing: boolean;
  form: FormState;
  onFormChange: (form: FormState) => void;
}

interface SocialPlatformConfig {
  key: keyof SocialLinks;
  label: string;
  placeholder: string;
  baseUrl: string;
  icon?: LucideIcon;
}

const socialPlatforms: SocialPlatformConfig[] = [
  {
    key: 'twitter',
    label: 'X (Twitter)',
    placeholder: 'https://x.com/username',
    baseUrl: 'https://x.com/',
    icon: Twitter,
  },
  {
    key: 'instagram',
    label: 'Instagram',
    placeholder: 'https://instagram.com/username',
    baseUrl: 'https://instagram.com/',
    icon: Instagram,
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    placeholder: 'https://linkedin.com/in/username',
    baseUrl: 'https://linkedin.com/in/',
    icon: Linkedin,
  },
  {
    key: 'facebook',
    label: 'Facebook',
    placeholder: 'https://facebook.com/username',
    baseUrl: 'https://facebook.com/',
    icon: Facebook,
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    placeholder: 'https://tiktok.com/@username',
    baseUrl: 'https://tiktok.com/@',
  },
  {
    key: 'youtube',
    label: 'YouTube',
    placeholder: 'https://youtube.com/@username',
    baseUrl: 'https://youtube.com/@',
    icon: Youtube,
  },
];

function resolveUrl(value: string, baseUrl: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed) || /^www\./i.test(trimmed)) {
    return trimmed.startsWith('www.') ? `https://${trimmed}` : trimmed;
  }
  return `${baseUrl}${trimmed.replace(/^@/, '')}`;
}

export function ProfileSocialLinks({
  profile,
  editing,
  form,
  onFormChange,
}: ProfileSocialLinksProps) {
  const formSocialLinks = form.social_links || {};

  if (editing) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {socialPlatforms.map(({ key, label, placeholder, baseUrl }) => (
          <div key={key} className="space-y-2">
            <Label htmlFor={`social-${key}`}>{label}</Label>
            <Input
              id={`social-${key}`}
              value={formSocialLinks[key] || ''}
              onChange={(e) =>
                onFormChange({
                  ...form,
                  social_links: {
                    ...formSocialLinks,
                    [key]: e.target.value,
                  },
                })
              }
              onBlur={(e) => {
                const resolved = resolveUrl(e.target.value, baseUrl);
                if (resolved !== e.target.value) {
                  onFormChange({
                    ...form,
                    social_links: {
                      ...formSocialLinks,
                      [key]: resolved,
                    },
                  });
                }
              }}
              placeholder={placeholder}
            />
          </div>
        ))}
      </div>
    );
  }

  const links = socialPlatforms.filter(({ key }) => profile.social_links?.[key]?.trim());

  if (links.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {links.map(({ key, label, baseUrl, icon: Icon }) => {
        const raw = profile.social_links?.[key]?.trim();
        if (!raw) return null;
        const href = resolveUrl(raw, baseUrl);

        return (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            title={label}
            className="inline-flex items-center gap-2 rounded-md text-muted-foreground transition-colors hover:text-primary"
          >
            {Icon ? <Icon className="h-5 w-5" /> : <ExternalLink className="h-4 w-4" />}
            {!Icon && <span className="text-sm">{label}</span>}
          </a>
        );
      })}
    </div>
  );
}

import { describe, it, expect } from 'vitest';
import type { OpeningWithProfile, ProviderAccount, CustomInquiryInfo } from '@/types/browse';

// Mirror the production buildProviderAccount + getUniqueValues from BookingBrowse.tsx
// These are extracted here for testability — keep in sync with the source.

function getUniqueValues(values: string[]) {
  return [...new Set(values)];
}

function buildProviderAccount({
  userId,
  providerName,
  providerSlug,
  avatarUrl,
  openings,
  isCustomInquiry = false,
  customInquiryInfo = null,
  skills = [],
}: {
  userId: string;
  providerName: string;
  providerSlug?: string | null;
  avatarUrl?: string | null;
  openings: OpeningWithProfile[];
  isCustomInquiry?: boolean;
  customInquiryInfo?: CustomInquiryInfo | null;
  skills?: string[];
}): ProviderAccount {
  const openingServices = getUniqueValues(openings.map(opening => opening.service));
  return {
    user_id: userId,
    provider_name: providerName,
    provider_slug: providerSlug || null,
    avatar_url: avatarUrl ?? openings[0]?.avatar_url ?? null,
    opening_count: openings.length,
    services: openingServices.length > 0 ? openingServices : skills,
    workers: getUniqueValues(openings.map(opening => opening.worker)),
    is_custom_inquiry: isCustomInquiry,
    custom_inquiry_info: customInquiryInfo,
  };
}

function makeOpening(overrides: Partial<OpeningWithProfile> = {}): OpeningWithProfile {
  return {
    id: 'opening-1',
    user_id: 'user-1',
    date: '2026-06-04',
    start_time: '10:00',
    end_time: '11:00',
    duration: 1,
    service: 'Haircut',
    worker: 'Alice',
    is_available: true,
    location: null,
    hourly_rate: 50,
    total: 50,
    provider_name: 'Test Provider',
    provider_email: 'test@example.com',
    provider_slug: 'test-provider',
    avatar_url: null,
    ...overrides,
  };
}

// --- Tests ---

describe('buildProviderAccount', () => {
  describe('services from openings vs skills', () => {
    it('uses opening services when openings exist', () => {
      const openings = [
        makeOpening({ service: 'Haircut' }),
        makeOpening({ service: 'Coloring' }),
      ];
      const result = buildProviderAccount({
        userId: 'u1',
        providerName: 'Provider',
        openings,
        skills: ['Massage', 'Facial'],
      });
      expect(result.services).toEqual(['Haircut', 'Coloring']);
    });

    it('falls back to skills when no openings exist', () => {
      const result = buildProviderAccount({
        userId: 'u1',
        providerName: 'Provider',
        openings: [],
        skills: ['Massage', 'Facial'],
      });
      expect(result.services).toEqual(['Massage', 'Facial']);
    });

    it('returns empty services when no openings and no skills', () => {
      const result = buildProviderAccount({
        userId: 'u1',
        providerName: 'Provider',
        openings: [],
        skills: [],
      });
      expect(result.services).toEqual([]);
    });

    it('deduplicates opening services', () => {
      const openings = [
        makeOpening({ service: 'Haircut' }),
        makeOpening({ service: 'Haircut' }),
        makeOpening({ service: 'Coloring' }),
      ];
      const result = buildProviderAccount({
        userId: 'u1',
        providerName: 'Provider',
        openings,
      });
      expect(result.services).toEqual(['Haircut', 'Coloring']);
    });
  });

  describe('custom inquiry provider', () => {
    it('sets is_custom_inquiry and custom_inquiry_info', () => {
      const info: CustomInquiryInfo = {
        email: 'provider@example.com',
        phone: '555-1234',
        social_links: { instagram: 'https://instagram.com/test' },
        profile_url: '/profile/test',
      };
      const result = buildProviderAccount({
        userId: 'u2',
        providerName: 'Inquiry Provider',
        openings: [],
        isCustomInquiry: true,
        customInquiryInfo: info,
        skills: ['Consulting'],
      });
      expect(result.is_custom_inquiry).toBe(true);
      expect(result.custom_inquiry_info).toEqual(info);
      expect(result.services).toEqual(['Consulting']);
    });

    it('handles null email/phone when privacy toggles hide them', () => {
      const info: CustomInquiryInfo = {
        email: null,
        phone: null,
        social_links: { twitter: 'https://twitter.com/test' },
        profile_url: '/profile/test',
      };
      const result = buildProviderAccount({
        userId: 'u3',
        providerName: 'Private Provider',
        openings: [],
        isCustomInquiry: true,
        customInquiryInfo: info,
        skills: ['Design'],
      });
      expect(result.custom_inquiry_info?.email).toBeNull();
      expect(result.custom_inquiry_info?.phone).toBeNull();
      expect(result.services).toEqual(['Design']);
    });
  });

  describe('provider merging (tagged providers)', () => {
    it('keeps opening services when provider also has inquiry skills', () => {
      const openings = [makeOpening({ service: 'Haircut' })];
      const result = buildProviderAccount({
        userId: 'u4',
        providerName: 'Both Provider',
        openings,
        isCustomInquiry: true,
        skills: ['Massage'],
      });
      expect(result.services).toEqual(['Haircut']);
      expect(result.is_custom_inquiry).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('uses avatarUrl param over opening avatar', () => {
      const openings = [makeOpening({ avatar_url: 'opening-avatar.jpg' })];
      const result = buildProviderAccount({
        userId: 'u5',
        providerName: 'Provider',
        avatarUrl: 'param-avatar.jpg',
        openings,
      });
      expect(result.avatar_url).toBe('param-avatar.jpg');
    });

    it('falls back to opening avatar when avatarUrl is null', () => {
      const openings = [makeOpening({ avatar_url: 'opening-avatar.jpg' })];
      const result = buildProviderAccount({
        userId: 'u5',
        providerName: 'Provider',
        avatarUrl: null,
        openings,
      });
      expect(result.avatar_url).toBe('opening-avatar.jpg');
    });

    it('handles null providerSlug', () => {
      const result = buildProviderAccount({
        userId: 'u6',
        providerName: 'Provider',
        providerSlug: null,
        openings: [],
      });
      expect(result.provider_slug).toBeNull();
    });

    it('defaults skills to empty array', () => {
      const result = buildProviderAccount({
        userId: 'u7',
        providerName: 'Provider',
        openings: [],
      });
      expect(result.services).toEqual([]);
    });
  });
});

describe('inquiry provider merge logic', () => {
  type InquiryProvider = {
    id: string;
    full_name: string;
    slug: string;
    avatar_url: string | null;
    email: string | null;
    phone: string | null;
    social_links: Record<string, string>;
    profile_url: string;
    skills: string[];
  };

  function mergeProviders(
    providers: ProviderAccount[],
    inquiryProviders: InquiryProvider[],
  ): ProviderAccount[] {
    const existingIds = new Set(providers.map(p => p.user_id));
    const taggedProviders = providers.map(p => {
      const inquiryInfo = inquiryProviders.find(ip => ip.id === p.user_id);
      if (!inquiryInfo) return p;
      return {
        ...p,
        services: p.services.length > 0 ? p.services : (inquiryInfo.skills || []),
        is_custom_inquiry: true,
        custom_inquiry_info: {
          email: inquiryInfo.email,
          phone: inquiryInfo.phone,
          social_links: inquiryInfo.social_links,
          profile_url: inquiryInfo.profile_url,
        },
      };
    });
    const inquiryOnly = inquiryProviders
      .filter(ip => !existingIds.has(ip.id))
      .map(ip => buildProviderAccount({
        userId: ip.id,
        providerName: ip.full_name || 'Unknown',
        providerSlug: ip.slug || null,
        avatarUrl: ip.avatar_url || null,
        openings: [],
        isCustomInquiry: true,
        skills: ip.skills || [],
        customInquiryInfo: {
          email: ip.email,
          phone: ip.phone,
          social_links: ip.social_links,
          profile_url: ip.profile_url,
        },
      }));
    return [...taggedProviders, ...inquiryOnly];
  }

  it('inquiry-only provider gets skills as services', () => {
    const inquiryProviders: InquiryProvider[] = [{
      id: 'inquiry-1',
      full_name: 'Inquiry Pro',
      slug: 'inquiry-pro',
      avatar_url: null,
      email: 'pro@example.com',
      phone: null,
      social_links: {},
      profile_url: '/profile/inquiry-pro',
      skills: ['Yoga', 'Pilates'],
    }];
    const result = mergeProviders([], inquiryProviders);
    expect(result).toHaveLength(1);
    expect(result[0].services).toEqual(['Yoga', 'Pilates']);
    expect(result[0].is_custom_inquiry).toBe(true);
  });

  it('inquiry-only provider with empty skills shows empty services', () => {
    const inquiryProviders: InquiryProvider[] = [{
      id: 'inquiry-2',
      full_name: 'No Skills',
      slug: 'no-skills',
      avatar_url: null,
      email: null,
      phone: null,
      social_links: {},
      profile_url: '/profile/no-skills',
      skills: [],
    }];
    const result = mergeProviders([], inquiryProviders);
    expect(result[0].services).toEqual([]);
  });

  it('existing provider with openings keeps opening services over inquiry skills', () => {
    const existing: ProviderAccount[] = [{
      user_id: 'dual-1',
      provider_name: 'Dual Provider',
      provider_slug: 'dual',
      opening_count: 2,
      services: ['Haircut', 'Shave'],
      workers: ['Alice'],
    }];
    const inquiryProviders: InquiryProvider[] = [{
      id: 'dual-1',
      full_name: 'Dual Provider',
      slug: 'dual',
      avatar_url: null,
      email: 'dual@example.com',
      phone: '555-0000',
      social_links: {},
      profile_url: '/profile/dual',
      skills: ['Massage'],
    }];
    const result = mergeProviders(existing, inquiryProviders);
    expect(result).toHaveLength(1);
    expect(result[0].services).toEqual(['Haircut', 'Shave']);
    expect(result[0].is_custom_inquiry).toBe(true);
  });

  it('existing provider with no services gets inquiry skills', () => {
    const existing: ProviderAccount[] = [{
      user_id: 'empty-1',
      provider_name: 'Empty Provider',
      provider_slug: 'empty',
      opening_count: 0,
      services: [],
      workers: [],
    }];
    const inquiryProviders: InquiryProvider[] = [{
      id: 'empty-1',
      full_name: 'Empty Provider',
      slug: 'empty',
      avatar_url: null,
      email: null,
      phone: null,
      social_links: {},
      profile_url: '/profile/empty',
      skills: ['Consulting', 'Coaching'],
    }];
    const result = mergeProviders(existing, inquiryProviders);
    expect(result[0].services).toEqual(['Consulting', 'Coaching']);
  });

  it('privacy-gated fields are null when toggles are off', () => {
    const inquiryProviders: InquiryProvider[] = [{
      id: 'private-1',
      full_name: 'Private Provider',
      slug: 'private',
      avatar_url: null,
      email: null,
      phone: null,
      social_links: { instagram: 'https://instagram.com/private' },
      profile_url: '/profile/private',
      skills: ['Photography'],
    }];
    const result = mergeProviders([], inquiryProviders);
    expect(result[0].custom_inquiry_info?.email).toBeNull();
    expect(result[0].custom_inquiry_info?.phone).toBeNull();
    expect(result[0].services).toEqual(['Photography']);
  });

  it('does not duplicate providers that exist in both lists', () => {
    const existing: ProviderAccount[] = [{
      user_id: 'both-1',
      provider_name: 'Both',
      provider_slug: 'both',
      opening_count: 1,
      services: ['Service A'],
      workers: ['Worker A'],
    }];
    const inquiryProviders: InquiryProvider[] = [{
      id: 'both-1',
      full_name: 'Both',
      slug: 'both',
      avatar_url: null,
      email: 'both@example.com',
      phone: null,
      social_links: {},
      profile_url: '/profile/both',
      skills: ['Service B'],
    }];
    const result = mergeProviders(existing, inquiryProviders);
    expect(result).toHaveLength(1);
  });
});

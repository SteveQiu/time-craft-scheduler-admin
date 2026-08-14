import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Calendar as CalendarIcon, MapPin, Search, Loader2, Bookmark, Star, ArrowRight, CheckCircle } from 'lucide-react';
import { BrowseDetail } from './BrowseDetail';
import { searchProviders } from '@/lib/search';
import type { OpeningWithProfile, ProviderAccount, CustomInquiryInfo } from '@/types/browse';
import { useLocalBookmarks } from '@/hooks/useLocalBookmarks';
import { readLocationPreference, type LocationPreference } from '@/lib/locationPreference';

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
  isActiveListing = false,
  customInquiryInfo = null,
  skills = [],
}: {
  userId: string;
  providerName: string;
  providerSlug?: string | null;
  avatarUrl?: string | null;
  openings: OpeningWithProfile[];
  isCustomInquiry?: boolean;
  isActiveListing?: boolean;
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
    is_active_listing: isActiveListing,
    custom_inquiry_info: customInquiryInfo,
  };
}

function ProviderBrowseCard({
  provider,
  onOpen,
  rating,
}: {
  provider: ProviderAccount;
  onOpen: (providerId: string) => void;
  rating?: { avg: number; count: number };
}) {
  const showFeaturedListing = provider.is_active_listing && provider.opening_count === 0;
  const [showAllServices, setShowAllServices] = useState(false);

  // Deterministic gradient from user ID
  const gradients = [
    'from-rose-400 to-rose-600',
    'from-sky-400 to-sky-600',
    'from-amber-400 to-amber-600',
    'from-emerald-400 to-emerald-600',
    'from-violet-400 to-violet-600',
    'from-pink-400 to-pink-600',
    'from-teal-400 to-teal-600',
    'from-orange-400 to-orange-600',
    'from-indigo-400 to-indigo-600',
    'from-cyan-400 to-cyan-600',
  ];
  const gradientIdx = React.useMemo(() => {
    let hash = 0;
    for (const ch of provider.user_id) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
    return Math.abs(hash) % gradients.length;
  }, [provider.user_id, gradients.length]);

  const availabilityLabel =
    showFeaturedListing || provider.is_custom_inquiry
      ? 'Custom inquiry'
      : provider.opening_count > 0
        ? `${provider.opening_count} slot${provider.opening_count !== 1 ? 's' : ''} available`
        : 'No openings';
  const dotColor =
    provider.is_custom_inquiry || showFeaturedListing
      ? 'bg-sky-500'
      : provider.opening_count > 0
        ? 'bg-emerald-500'
        : 'bg-gray-400';

  const primaryService = provider.services[0] || 'Provider';
  const isCustom = showFeaturedListing || provider.is_custom_inquiry;

  return (
    <button
      type="button"
      className="group block rounded-2xl border border-border bg-card text-left w-full p-0 overflow-hidden hover:shadow-md transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a7fba] focus-visible:ring-offset-2"
      onClick={() => onOpen(provider.user_id)}
    >
      {/* Photo area — fixed height so all cards are identical across all breakpoints */}
      <div className={`relative h-44 overflow-hidden bg-gradient-to-br ${gradients[gradientIdx]}`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white text-4xl font-bold opacity-40 select-none">
            {provider.provider_name.substring(0, 2).toUpperCase()}
          </span>
        </div>
        {provider.avatar_url && (
          <img
            src={provider.avatar_url}
            alt={provider.provider_name}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
        {/* Bottom fade for badge legibility */}
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
        <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium shadow-sm">
          <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} aria-hidden="true" />
          {availabilityLabel}
        </span>
      </div>

      {/* Info */}
      <div className="p-4">
        {/* 1. Service pills */}
        {provider.services.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {provider.services.slice(0, 2).map(s => (
              <span key={s} className="rounded border border-foreground/20 px-1.5 py-0.5 text-[11px] font-medium text-foreground">
                {s}
              </span>
            ))}
            {provider.services.length > 2 && (
              <span
                className="relative rounded border border-foreground/20 px-1.5 py-0.5 text-[11px] font-medium text-foreground cursor-pointer select-none"
                onMouseEnter={() => setShowAllServices(true)}
                onMouseLeave={() => setShowAllServices(false)}
                onClick={(e) => { e.stopPropagation(); setShowAllServices(v => !v); }}
              >
                +{provider.services.length - 2} more
                {showAllServices && (
                  <div className="absolute left-0 top-full mt-1 z-10 bg-popover border border-border rounded-md shadow-md p-2 flex flex-col gap-1 min-w-max">
                    {provider.services.slice(2).map(s => (
                      <span key={s} className="text-[11px] text-foreground whitespace-nowrap">{s}</span>
                    ))}
                  </div>
                )}
              </span>
            )}
          </div>
        )}

        {/* 2. Provider name */}
        <p className="text-xs text-muted-foreground mb-2">{provider.provider_name}</p>

        {/* 3. Status badge + location */}
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            isCustom
              ? 'bg-sky-50 text-[#1a7fba] dark:bg-sky-950 dark:text-sky-300'
              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
          }`}
        >
          <CheckCircle className="h-3 w-3" aria-hidden="true" />
          {showFeaturedListing ? 'Active listing' : provider.is_custom_inquiry ? 'Custom inquiry' : 'Available for booking'}
        </span>
        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground/50">
          <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
          N/A
        </div>

        {/* 4. Stars + review count */}
        {rating && (
          <div className="mt-2 flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
            <span className="text-sm text-muted-foreground">
              {rating.avg.toFixed(1)} · {rating.count} review{rating.count !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* 5. View link */}
        <div className="mt-3 flex justify-end">
          <span className="text-xs font-medium text-[#1a7fba] group-hover:underline inline-flex items-center gap-0.5">
            View <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </span>
        </div>
      </div>
    </button>
  );
}

export function BookingBrowse() {
  const navigate = useNavigate();
  const { providerId } = useParams<{ providerId?: string }>();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [viewMode, setViewMode] = useState<'all' | 'bookmarks'>('all');
  const [locationFilter, setLocationFilter] = useState<LocationPreference | null>(null);
  const localBookmarks = useLocalBookmarks();

  const today = new Date().toISOString().split('T')[0];

  // Load location preference on mount
  React.useEffect(() => {
    if (user?.id) {
      setLocationFilter(readLocationPreference(user.id));
      return;
    }
    setLocationFilter(null);
  }, [user?.id]);

  const activeLocationFilter = React.useMemo(() => {
    if (!locationFilter?.province || !locationFilter.country) return null;
    return {
      province: locationFilter.province.trim(),
      country: locationFilter.country,
    };
  }, [locationFilter]);

  const escapeIlikePattern = (value: string) => value.replace(/[\\%_]/g, '\\$&');

  // Debounce search input by 200ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 200);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch all openings (works for both authenticated and anonymous users)
  const { 
    data: allOpenings = [], 
    isLoading: openingsLoading,
    isError: openingsError,
    error: queryError 
  } = useQuery({
    queryKey: ['browse-openings', today, activeLocationFilter?.province ?? null, activeLocationFilter?.country ?? null],
    queryFn: async () => {
      let openingsQuery = supabase
        .from('openings')
        .select('*')
        .eq('is_available', true)
        .gte('date', today);

      if (activeLocationFilter) {
        const provincePattern = `%${escapeIlikePattern(activeLocationFilter.province)}%`;
        const countryPattern = `%${escapeIlikePattern(activeLocationFilter.country)}%`;
        openingsQuery = openingsQuery
          .ilike('location', provincePattern)
          .ilike('location', countryPattern);
      }

      const { data, error } = await openingsQuery
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;

      // Filter out openings that have confirmed appointments (not pending)
      const openingIds = (data || []).map((o: any) => o.id);
      let confirmedSet = new Set<string>();
      if (openingIds.length > 0) {
        const { data: confirmedAppts } = await supabase
          .from('appointments')
          .select('opening_id')
          .in('opening_id', openingIds)
          .eq('status', 'confirmed');  // ← Only filter confirmed, not pending
        confirmedSet = new Set((confirmedAppts || []).map((a: any) => a.opening_id));
      }

      const availableData = (data || []).filter((o: any) => !confirmedSet.has(o.id));  // ← Use confirmed, not pending

      // Fetch provider names via RPC (safe, only returns public fields)
      const providerIds = [...new Set(availableData.map((o: any) => o.user_id))];
      let nameMap = new Map<string, string>();
      let slugMap = new Map<string, string>();
      let avatarMap = new Map<string, string>();
      if (providerIds.length > 0) {
        const { data: profiles, error: rpcError } = await supabase
          .rpc('get_public_profile_names', { profile_ids: providerIds });
        
        if (rpcError) {
          console.error('RPC error fetching profiles:', rpcError);
        } else if (profiles) {
          nameMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name]));
          slugMap = new Map((profiles || []).filter((p: any) => p.slug).map((p: any) => [p.id, p.slug]));
          avatarMap = new Map((profiles || []).filter((p: any) => p.avatar_url).map((p: any) => [p.id, p.avatar_url]));
        }
      }

      return availableData.map((opening: any) => ({
        id: opening.id,
        user_id: opening.user_id,
        date: opening.date,
        start_time: opening.start_time,
        end_time: opening.end_time,
        duration: opening.duration,
        service: opening.service,
        worker: opening.worker,
        is_available: opening.is_available,
        location: opening.location || null,
        hourly_rate: opening.hourly_rate || 0,
        total: opening.total || 0,
        provider_name: nameMap.get(opening.user_id) || 'Organization',
        provider_email: null,
        provider_slug: slugMap.get(opening.user_id) || null,
        avatar_url: avatarMap.get(opening.user_id) || null,
      }));
    },
  });

  const providerOpeningsMap = React.useMemo(() => {
    const map = new Map<string, OpeningWithProfile[]>();

    allOpenings.forEach(opening => {
      if (!map.has(opening.user_id)) {
        map.set(opening.user_id, []);
      }

      map.get(opening.user_id)!.push(opening);
    });

    return map;
  }, [allOpenings]);

  const { data: inquiryProviders = [] } = useQuery({
    queryKey: ['premium-inquiry-providers'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_premium_inquiry_providers');
      if (error) {
        console.error('inquiry providers fetch error:', error);
        return [];
      }
      return (data ?? []) as Array<{
        id: string;
        full_name: string;
        slug: string;
        avatar_url: string;
        email: string;
        phone: string;
        social_links: Record<string, string>;
        profile_url: string;
        skills: string[];
      }>;
    },
  });

  // Group openings by provider
  const providers: ProviderAccount[] = React.useMemo(() => {
    return Array.from(providerOpeningsMap.entries())
      .map(([userId, openings]) => buildProviderAccount({
        userId,
        providerName: openings[0]?.provider_name || 'Organization',
        providerSlug: openings[0]?.provider_slug,
        avatarUrl: openings[0]?.avatar_url || null,
        openings,
      }))
      .sort((a, b) => b.opening_count - a.opening_count);
  }, [providerOpeningsMap]);

  // Merge inquiry providers with regular providers — inquiry providers float to top
  const allProviders: ProviderAccount[] = React.useMemo(() => {
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
    // Custom-inquiry providers (premium + "Active Listing & Custom Time" toggle ON)
    // with zero openings. Advertised so bookers can reach out. Uses the deployed
    // get_premium_inquiry_providers RPC (gates the toggle, returns contact info).
    const inquiryOnly = inquiryProviders
      .filter(ip => !existingIds.has(ip.id))
      .map(ip => buildProviderAccount({
        userId: ip.id,
        providerName: ip.full_name || 'Unknown',
        providerSlug: ip.slug || null,
        avatarUrl: ip.avatar_url || null,
        openings: [],
        isCustomInquiry: true,
        isActiveListing: true,
        skills: ip.skills || [],
        customInquiryInfo: {
          email: ip.email,
          phone: ip.phone,
          social_links: ip.social_links,
          profile_url: ip.profile_url,
        },
      }));
    return [...taggedProviders, ...inquiryOnly]
      .sort((a, b) => {
        if (a.is_custom_inquiry && !b.is_custom_inquiry) return -1;
        if (!a.is_custom_inquiry && b.is_custom_inquiry) return 1;
        return b.opening_count - a.opening_count;
      });
  }, [providers, inquiryProviders]);

  // Batch fetch ratings for all visible providers
  const allProviderIds = React.useMemo(() => allProviders.map(p => p.user_id), [allProviders]);

  const { data: ratingsMap = new Map<string, { avg: number; count: number }>() } = useQuery({
    queryKey: ['browse-ratings', allProviderIds],
    queryFn: async () => {
      const map = new Map<string, { avg: number; count: number }>();
      if (!allProviderIds.length) return map;
      const { data } = await supabase
        .from('reviews')
        .select('reviewed_id, rating')
        .in('reviewed_id', allProviderIds);
      if (!data) return map;
      const grouped = new Map<string, number[]>();
      for (const r of data as { reviewed_id: string; rating: number }[]) {
        if (!grouped.has(r.reviewed_id)) grouped.set(r.reviewed_id, []);
        grouped.get(r.reviewed_id)!.push(r.rating);
      }
      for (const [id, ratings] of grouped) {
        const avg = ratings.reduce((s, r) => s + r, 0) / ratings.length;
        map.set(id, { avg: Math.round(avg * 10) / 10, count: ratings.length });
      }
      return map;
    },
    enabled: allProviderIds.length > 0,
  });

  // Fetch bookmarks with provider details
  const { data: bookmarkedProviders = [] } = useQuery({
    queryKey: ['bookmarks-with-details', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      try {
        const { data: bookmarks, error: bookmarksError } = await supabase
          .from('bookmarks')
          .select('bookmarked_user_id')
          .eq('user_id', user!.id);
        
        if (bookmarksError) {
          console.error('Bookmarks fetch error:', bookmarksError);
          throw bookmarksError;
        }
        
        if (!bookmarks || bookmarks.length === 0) {
          return [];
        }

        const bookmarkedIds = bookmarks.map((b: any) => b.bookmarked_user_id);

        // Get provider details for bookmarked users via PII-safe RPC
        const { data: profiles, error: profilesError } = await supabase
          .rpc('get_public_profile_names', { profile_ids: bookmarkedIds });

        if (profilesError) {
          console.error('Profiles fetch error:', profilesError);
          throw profilesError;
        }

        if (!profiles) return [];

        return profiles.map((profile: any) => buildProviderAccount({
          userId: profile.id,
          providerName: profile.full_name || 'Unknown',
          providerSlug: profile.slug || null,
          avatarUrl: profile.avatar_url || null,
          openings: providerOpeningsMap.get(profile.id) || [],
        }));
      } catch (err) {
        console.error('Bookmarks query error:', err);
        return [];
      }
    },
  });

  // Fetch localStorage bookmarked provider details
  const { data: localBookmarkedProviders = [] } = useQuery({
    queryKey: ['local-bookmarks-details', localBookmarks.localBookmarkIds],
    enabled: localBookmarks.localBookmarkIds.length > 0,
    queryFn: async () => {
      try {
        const { data: profiles, error } = await supabase
          .rpc('get_public_profile_names', { profile_ids: localBookmarks.localBookmarkIds });
        if (error) {
          console.error('Local bookmarks profiles fetch error:', error);
          return [];
        }
        if (!profiles) return [];
        return profiles.map((profile: any) => buildProviderAccount({
          userId: profile.id,
          providerName: profile.full_name || 'Unknown',
          providerSlug: profile.slug || null,
          avatarUrl: profile.avatar_url || null,
          openings: providerOpeningsMap.get(profile.id) || [],
        }));
      } catch (err) {
        console.error('Local bookmarks query error:', err);
        return [];
      }
    },
  });

  // Merge DB and localStorage bookmarks (dedup by user_id)
  const mergedBookmarks = React.useMemo(() => {
    const dbIds = new Set(bookmarkedProviders.map(p => p.user_id));
    const extra = localBookmarkedProviders.filter(p => !dbIds.has(p.user_id));
    return [...bookmarkedProviders, ...extra];
  }, [bookmarkedProviders, localBookmarkedProviders]);

  // Filter providers by search term and apply location filter
  const filteredProviders = React.useMemo(
    () => searchProviders(allProviders, { query: debouncedSearch, locationFilter: activeLocationFilter, providerOpeningsMap }),
    [allProviders, debouncedSearch, activeLocationFilter, providerOpeningsMap]
  );

  const visibleProviders = viewMode === 'bookmarks' ? mergedBookmarks : filteredProviders;

  if (openingsLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (openingsError) {
    return (
      <div className="p-6">
        <Card className="shadow-soft border-card-border">
          <CardContent className="text-center py-12">
            <CalendarIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Error loading providers</h3>
            <p className="text-muted-foreground mb-4">
              {queryError instanceof Error ? queryError.message : 'Something went wrong'}
            </p>
            <Button onClick={() => window.location.reload()}>Reload</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If provider detail view, render BrowseDetail component
  if (providerId) {
    return <BrowseDetail allOpenings={allOpenings} providers={allProviders} isLoading={openingsLoading} />;
  }

  // Provider List View
  return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-foreground">Browse & Book</h2>
          <div className="text-sm text-muted-foreground">
            {allProviders.length} provider{allProviders.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Sign-in CTA for anonymous users */}
        {!user && (
          <Card className="shadow-soft border-card-border bg-primary/5">
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-4">
              <p className="text-sm text-foreground">
                Sign in to sync your bookmarks across devices.
              </p>
              <Button onClick={() => navigate(`/auth?returnTo=${encodeURIComponent('/browse')}`)}>
                Sign in
              </Button>
            </CardContent>
          </Card>
        )}


        {/* Tab buttons (bookmarks available to all users) */}
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'all' ? 'default' : 'outline'}
            onClick={() => setViewMode('all')}
            className="flex items-center gap-2"
          >
            All
          </Button>
          <Button
            variant={viewMode === 'bookmarks' ? 'default' : 'outline'}
            onClick={() => setViewMode('bookmarks')}
            className="flex items-center gap-2"
          >
            <Bookmark className="h-4 w-4 text-muted-foreground" />
            Bookmarks ({mergedBookmarks.length})
          </Button>
        </div>

        {/* Search */}
        <Card className="shadow-soft border-card-border">
          <CardContent className="pt-6 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search providers, services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {['Insurance', 'Repair', 'Tutor', 'Beauty', 'Fitness', 'Legal', 'Photography'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSearchTerm(searchTerm === cat ? '' : cat)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    searchTerm === cat
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {viewMode === 'bookmarks' && mergedBookmarks.length === 0 && (
          <Card className="shadow-soft border-card-border">
            <CardContent className="text-center py-12">
              <Bookmark className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No bookmarks yet</h3>
              <p className="text-muted-foreground mb-4">Click the bookmark icon on any provider to save them.</p>
              <Button variant="outline" onClick={() => setViewMode('all')}>Browse All</Button>
            </CardContent>
          </Card>
        )}

        {viewMode === 'all' && filteredProviders.length === 0 && (
          <Card className="shadow-soft border-card-border">
            <CardContent className="text-center py-12">
              <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No providers found</h3>
              <p className="text-muted-foreground">Try adjusting your search or check back later.</p>
            </CardContent>
          </Card>
        )}

        {visibleProviders.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {visibleProviders.map((provider) => (
              <ProviderBrowseCard
                key={provider.user_id}
                provider={provider}
                onOpen={(selectedProviderId) => navigate(`/browse/${selectedProviderId}`)}
                rating={ratingsMap.get(provider.user_id)}
              />
            ))}
          </div>
        )}
      </div>
    );
}

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Calendar as CalendarIcon, MapPin, Search, Loader2, ChevronRight, Bookmark } from 'lucide-react';
import { BrowseDetail } from './BrowseDetail';
import { ProfilePhotoStrip } from './ProfilePhotoStrip';
import { searchProviders } from '@/lib/search';
import type { OpeningWithProfile, ProviderAccount, CustomInquiryInfo } from '@/types/browse';
import { useLocalBookmarks } from '@/hooks/useLocalBookmarks';

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
}: {
  userId: string;
  providerName: string;
  providerSlug?: string | null;
  avatarUrl?: string | null;
  openings: OpeningWithProfile[];
  isCustomInquiry?: boolean;
  customInquiryInfo?: CustomInquiryInfo | null;
}): ProviderAccount {
  return {
    user_id: userId,
    provider_name: providerName,
    provider_slug: providerSlug || null,
    avatar_url: avatarUrl ?? openings[0]?.avatar_url ?? null,
    opening_count: openings.length,
    services: getUniqueValues(openings.map(opening => opening.service)),
    workers: getUniqueValues(openings.map(opening => opening.worker)),
    is_custom_inquiry: isCustomInquiry,
    custom_inquiry_info: customInquiryInfo,
  };
}

function ProviderBrowseCard({
  provider,
  onOpen,
}: {
  provider: ProviderAccount;
  onOpen: (providerId: string) => void;
}) {
  return (
    <Card
      className="shadow-soft border-card-border hover:shadow-lg transition-all cursor-pointer"
      onClick={() => onOpen(provider.user_id)}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <Avatar className="h-12 w-12 shrink-0">
              <AvatarImage src={provider.avatar_url ?? undefined} alt={provider.provider_name} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                {provider.provider_name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate hover:underline">
                {provider.provider_name}
              </h3>
              <p className="text-sm text-muted-foreground">
                {provider.opening_count} available slots
              </p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Services</p>
          <div className="flex flex-wrap gap-1">
            {provider.services.slice(0, 3).map(service => (
              <Badge key={service} variant="secondary" className="text-xs">
                {service}
              </Badge>
            ))}
            {provider.services.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{provider.services.length - 3}
              </Badge>
            )}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Service Providers</p>
          <p className="text-sm text-foreground truncate">{provider.workers.join(', ')}</p>
        </div>
        <div onClick={e => e.stopPropagation()}>
          <ProfilePhotoStrip userId={provider.user_id} thumbClass="w-14 h-14" />
        </div>
      </CardContent>
    </Card>
  );
}

export function BookingBrowse() {
  const navigate = useNavigate();
  const { providerId } = useParams<{ providerId?: string }>();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [viewMode, setViewMode] = useState<'all' | 'bookmarks'>('all');
  const [locationFilter, setLocationFilter] = useState<{ province: string; country: string } | null>(null);
  const localBookmarks = useLocalBookmarks();

  const today = new Date().toISOString().split('T')[0];

  // Load location preference on mount
  React.useEffect(() => {
    if (user?.id) {
      const savedPref = localStorage.getItem(`locationPreference_${user.id}`);
      if (savedPref) {
        try {
          setLocationFilter(JSON.parse(savedPref));
        } catch {}
      }
    }
  }, [user?.id]);

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
    queryKey: ['browse-openings', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('openings')
        .select('*')
        .eq('is_available', true)
        .gte('date', today)
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
    () => searchProviders(allProviders, { query: debouncedSearch, locationFilter, providerOpeningsMap }),
    [allProviders, debouncedSearch, locationFilter, providerOpeningsMap]
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
              <Button onClick={() => navigate('/auth?redirect=/browse')}>
                Sign in
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Location filter badge */}
        {locationFilter && locationFilter.province && locationFilter.country && (
          <Card className="shadow-soft border-card-border bg-blue-50 dark:bg-blue-950/30">
            <CardContent className="flex items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="font-medium">Showing results near:</span>
                <span>{locationFilter.province}, {locationFilter.country}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocationFilter(null)}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                ✕ Clear filter
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
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search providers, services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleProviders.map((provider) => (
              <ProviderBrowseCard
                key={provider.user_id}
                provider={provider}
                onOpen={(selectedProviderId) => navigate(`/browse/${selectedProviderId}`)}
              />
            ))}
          </div>
        )}
      </div>
    );
}

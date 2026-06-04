import { parseLocation } from '@/lib/address';
import type { ProviderAccount, OpeningWithProfile } from '@/types/browse';

export interface LocationFilter {
  province: string;
  country: string;
}

export interface SearchOptions {
  query: string;
  locationFilter?: LocationFilter | null;
  providerOpeningsMap?: Map<string, OpeningWithProfile[]>;
}

/**
 * Tokenize a search query into lowercase terms.
 * Future: support quoted phrases, field prefixes (service:yoga), negation (-term).
 */
export function tokenize(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

/**
 * Score a provider against search terms.
 * Returns 0 if no match, higher number = better match.
 *
 * Current: binary AND (all terms must match somewhere).
 * Future: weighted scoring, fuzzy match, AI embeddings.
 */
export function scoreProvider(
  provider: ProviderAccount,
  terms: string[]
): number {
  if (terms.length === 0) return 1;

  const name = provider.provider_name.toLowerCase();
  const services = provider.services.map(s => s.toLowerCase());
  const workers = provider.workers.map(w => w.toLowerCase());

  let score = 0;
  for (const term of terms) {
    const nameMatch = name.includes(term);
    const serviceMatch = services.some(s => s.includes(term));
    const workerMatch = workers.some(w => w.includes(term));

    if (!nameMatch && !serviceMatch && !workerMatch) return 0;

    // Weight: name matches are most relevant, then services, then workers
    if (nameMatch) score += 3;
    if (serviceMatch) score += 2;
    if (workerMatch) score += 1;
  }

  return score;
}

/**
 * Check if a provider has openings matching the location filter.
 */
export function matchesLocation(
  provider: ProviderAccount,
  locationFilter: LocationFilter | null | undefined,
  providerOpeningsMap: Map<string, OpeningWithProfile[]>
): boolean {
  if (!locationFilter?.province || !locationFilter?.country) return true;

  const openings = providerOpeningsMap.get(provider.user_id) || [];
  return openings.some(opening => {
    const loc = parseLocation(opening.location);
    return (
      loc.province.toLowerCase() === locationFilter.province.toLowerCase() &&
      loc.country.toLowerCase() === locationFilter.country.toLowerCase()
    );
  });
}

/**
 * Search and filter providers.
 * Returns providers sorted by relevance (best match first).
 *
 * This is the main entry point — swap internals for AI-powered
 * search without changing the call site.
 */
export function searchProviders(
  providers: ProviderAccount[],
  options: SearchOptions
): ProviderAccount[] {
  const terms = tokenize(options.query);
  const { locationFilter, providerOpeningsMap = new Map() } = options;

  const scored = providers
    .map(provider => ({
      provider,
      score: scoreProvider(provider, terms),
    }))
    .filter(({ score, provider }) =>
      score > 0 && matchesLocation(provider, locationFilter, providerOpeningsMap)
    );

  // Sort by score descending, then by opening count descending
  scored.sort((a, b) =>
    b.score - a.score || b.provider.opening_count - a.provider.opening_count
  );

  return scored.map(({ provider }) => provider);
}

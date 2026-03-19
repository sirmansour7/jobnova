/**
 * Centralised cache key definitions.
 * Using functions for parameterised keys avoids typos and makes
 * invalidation calls easy to grep.
 */
export const CacheKeys = {
  // Governorates — static reference data, TTL 6 h
  GOVERNORATES_ALL: 'gov:all' as const,
  governorate: (id: string) => `gov:${id}`,
  cities: (governorateId: string) => `gov:${governorateId}:cities`,

  // Jobs — public first page, TTL 60 s
  JOBS_PUBLIC_P1: 'jobs:public:p1' as const,

  // Org dashboard — per-org aggregate stats, TTL 30 s
  orgDashboard: (orgId: string) => `org:${orgId}:dashboard`,
} as const;

// TTLs in milliseconds (cache-manager v6+ uses ms)
export const CacheTTL = {
  SIX_HOURS: 6 * 60 * 60 * 1000,
  SIXTY_SECONDS: 60 * 1000,
  THIRTY_SECONDS: 30 * 1000,
} as const;

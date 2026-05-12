export const ROUTES = {
  dashboard: '/dashboard',
  calendar: '/calendar',
  browse: '/browse',
  browseProvider: '/browse/:providerId',
  workers: '/workers',
  appointments: '/appointments',
  appointmentDetail: '/appointments/:id',
  openingDetail: '/openings/:id',
  auth: '/auth',
  settings: '/settings',
  profile: '/profile',
  profileSlug: '/profile/:slug',
  reports: '/reports',
  notifications: '/notifications',
  terms: '/terms',
  privacy: '/privacy',
  refund: '/refund',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];

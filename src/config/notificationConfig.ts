export const NOTIFICATION_CONFIG = {
  // How often to poll (ms). 60000 = every 60 seconds.
  pollIntervalMs: 60_000,

  // How many appointments to check per poll. Keep small to minimize DB reads.
  maxAppointmentsToCheck: 50,

  // How far back to look for recent appointments (days).
  lookbackDays: 30,

  // Whether notifications are enabled at all. Set false to disable without code changes.
  enabled: true,

  // Notification display settings
  notification: {
    title: 'Appointment Confirmed! 🎉',
    body: (service: string, date: string, time: string) =>
      `Your ${service} on ${date} at ${time} has been confirmed.`,
    icon: '/favicon.ico',  // can swap to app logo path
    // How long to auto-close notification (ms). 0 = never auto-close.
    autoCloseMs: 8_000,
  },
} as const;

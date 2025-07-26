// Query key definitions for TanStack Query
export const queryKeys = {
  auth: {
    all: ['auth'] as const,
    user: (userId?: string) => ['auth', 'user', userId] as const,
    session: () => ['auth', 'session'] as const,
  },
  account: {
    all: ['account'] as const,
    profile: (userId: string) => ['account', 'profile', userId] as const,
    exists: (userId: string) => ['account', 'exists', userId] as const,
  },
  layer: {
    all: ['layer'] as const,
    list: () => ['layer', 'list'] as const,
    detail: (layerId: string) => ['layer', 'detail', layerId] as const,
  },
  audioPin: {
    all: ['audioPin'] as const,
    list: (filters?: any) => ['audioPin', 'list', filters] as const,
    detail: (pinId: string) => ['audioPin', 'detail', pinId] as const,
    nearby: (lat: number, lng: number, radius: number) => 
      ['audioPin', 'nearby', { lat, lng, radius }] as const,
  },
  recording: {
    all: ['recording'] as const,
    current: () => ['recording', 'current'] as const,
  },
} as const;
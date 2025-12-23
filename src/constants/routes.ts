/**
 * Route paths and view identifiers
 */

export const ROUTES = {
  HOME: '/',
  PODCAST: '/podcast',
  ARCHIVE: '/archive',
  NEW: '/new',
} as const;

export const VIEWS = {
  HOME: 'home',
  PODCAST: 'podcast',
  ARCHIVE: 'archive',
  NEW: 'new',
} as const;

export type View = typeof VIEWS[keyof typeof VIEWS];

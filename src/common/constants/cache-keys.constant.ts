export const CACHE_KEYS = {
  STUDENT_FULL: (documento: string, isPublic: boolean, isPrivate: boolean) =>
    `student:full:${documento}:${isPublic}:${isPrivate}`,
  SEARCH: (sistema: string, documento: string) =>
    `search:${sistema}:${documento}`,
} as const;

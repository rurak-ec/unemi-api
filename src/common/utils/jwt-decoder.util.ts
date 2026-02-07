export interface JwtProfile {
  id: string | number | null;
  type: string | null;
  display_clasificacion?: string | null;
}

export interface DecodedJwt {
  perfiles: JwtProfile[];
  [key: string]: unknown;
}

export function decodeJwtPayload(token: string): Record<string, any> {
  const parts = String(token ?? '').split('.');
  const payload = parts[1] ?? null;
  if (!payload) {
    throw new Error('Invalid JWT: missing payload');
  }

  // Handle URL-safe base64
  let base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';

  const decoded = Buffer.from(base64, 'base64').toString('utf-8');
  return JSON.parse(decoded);
}

export function extractProfiles(decoded: Record<string, any>): JwtProfile[] {
  let perfiles: any[] =
    decoded?.perfiles ??
    decoded?.persona?.perfiles ??
    decoded?.personalData?.[0]?.perfiles ??
    [];

  if (!Array.isArray(perfiles) || perfiles.length === 0) {
    return [];
  }

  // Sort: "Grado" first
  perfiles.sort((a, b) => {
    const valA = a?.display_clasificacion === 'Grado' ? 0 : 1;
    const valB = b?.display_clasificacion === 'Grado' ? 0 : 1;
    return valA - valB;
  });

  return perfiles.map((p) => ({
    id: p?.id ?? null,
    type: p?.display_clasificacion ?? null,
  }));
}

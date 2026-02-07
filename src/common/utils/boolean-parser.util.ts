export function parseBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  const s = String(value ?? '').toLowerCase().trim();
  return s === 'true' || s === '1';
}

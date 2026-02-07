export interface ParsedName {
  nombre: string;
  apellido: string;
}

const JOINERS = new Set([
  'de', 'del', 'la', 'las', 'los', 'y', 'e',
  'da', 'do', 'dos', 'das',
  'van', 'von', 'der', 'den', 'di', 'du',
  'st', 'san', 'santa', 'mc', 'mac',
]);

function isJoiner(token: string): boolean {
  return JOINERS.has(String(token ?? '').toLowerCase());
}

/** Slice-based join (1-indexed a..b) matching the n8n logic */
function join(parts: string[], a: number, b: number): string {
  return parts.slice(a - 1, b).join(' ').trim();
}

function cleanText(value: string): string {
  return String(value ?? '')
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function toNameCase(s: string): string {
  return String(s ?? '')
    .toLowerCase()
    .replace(/\b\p{L}+/gu, (w) => w[0].toUpperCase() + w.slice(1));
}

function splitByRules(parts: string[]): ParsedName {
  const n = parts.length;

  if (n === 0) return { nombre: '', apellido: '' };
  if (n === 1) return { nombre: parts[0], apellido: '' };
  if (n === 2) return { nombre: parts[0], apellido: parts[1] };
  if (n === 3) return { nombre: parts[0], apellido: join(parts, 2, 3) };

  if (n === 4) {
    if (isJoiner(parts[2]))
      return { nombre: join(parts, 1, 1), apellido: join(parts, 2, 4) };
    return { nombre: join(parts, 1, 2), apellido: join(parts, 3, 4) };
  }

  if (n === 5) {
    if (isJoiner(parts[1]))
      return { nombre: join(parts, 1, 3), apellido: join(parts, 4, 5) };
    if (isJoiner(parts[3]))
      return { nombre: join(parts, 1, 2), apellido: join(parts, 3, 5) };
    return { nombre: join(parts, 1, 1), apellido: join(parts, 5, 5) };
  }

  if (n === 6) {
    if (isJoiner(parts[1]) && isJoiner(parts[3]))
      return { nombre: join(parts, 1, 3), apellido: join(parts, 4, 6) };
    if (isJoiner(parts[1]) && isJoiner(parts[2]))
      return { nombre: join(parts, 1, 4), apellido: join(parts, 5, 6) };
    if (isJoiner(parts[3]) && isJoiner(parts[4]))
      return { nombre: join(parts, 1, 2), apellido: join(parts, 3, 6) };
    return { nombre: join(parts, 1, 2), apellido: join(parts, 5, 6) };
  }

  if (n === 7) {
    const countJoiners = (arr: string[]) =>
      arr.reduce((acc, t) => acc + (isJoiner(t) ? 1 : 0), 0);
    const last4 = parts.slice(3, 7);
    const first4 = parts.slice(0, 4);

    if (countJoiners(last4) >= 3)
      return { nombre: join(parts, 1, 2), apellido: join(parts, 3, 7) };
    if (countJoiners(first4) >= 3)
      return { nombre: join(parts, 1, 5), apellido: join(parts, 6, 7) };
    if (isJoiner(parts[2]))
      return { nombre: join(parts, 1, 4), apellido: join(parts, 5, 7) };
    if (isJoiner(parts[4]))
      return { nombre: join(parts, 1, 3), apellido: join(parts, 4, 7) };
    return { nombre: join(parts, 1, 2), apellido: join(parts, 6, 7) };
  }

  return {
    nombre: parts.slice(0, Math.max(1, n - 2)).join(' ').trim(),
    apellido: parts.slice(-2).join(' ').trim(),
  };
}

export function splitNombreCompleto(rawNombreCompleto: string): ParsedName {
  const cleaned = cleanText(rawNombreCompleto);
  if (!cleaned) return { nombre: '', apellido: '' };

  if (cleaned.includes(',')) {
    const [left, right] = cleaned.split(',').map((s) => s.trim());
    return {
      nombre: toNameCase(right || ''),
      apellido: toNameCase(left || ''),
    };
  }

  const norm = toNameCase(cleaned);
  const parts = norm.split(' ').filter(Boolean);
  return splitByRules(parts);
}

export function formatNombreCompleto(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ''))
    .join(' ');
}

export { toNameCase };

interface PublicDataItem {
  es_admision: boolean | null;
  es_pregrado: boolean | null;
  [key: string]: unknown;
}

function normBool(v: unknown): boolean | null {
  if (v === true) return true;
  if (v === false) return false;
  return null;
}

function getPriority(item: PublicDataItem): number {
  const a = normBool(item.es_admision);
  const p = normBool(item.es_pregrado);

  if (a === false && p === true) return 1;
  if (a === true && p === false) return 2;
  if ((a === null && p !== null) || (a !== null && p === null)) return 3;
  if (a === null && p === null) return 4;

  return 99;
}

export function chooseBestPublicData<T extends PublicDataItem>(
  items: T[],
): T | null {
  if (!items.length) return null;

  let bestItem: T | null = null;
  let bestScore = Infinity;

  for (const item of items) {
    const score = getPriority(item);
    if (score < bestScore) {
      bestScore = score;
      bestItem = item;
    }
  }

  return bestItem ?? items[0] ?? null;
}

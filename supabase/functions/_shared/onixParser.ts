export type OnixPrice = {
  isbn13: string;
  priceType?: string;
  priceAmount: number;
  currencyCode: string;
  territory?: string;
  effectiveFrom?: string;
  effectiveUntil?: string;
};

export function parseOnix(xml: string): OnixPrice[] {
  const get = (s: string, tag: string) => {
    const m = s.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
    return m?.[1]?.trim();
  };

  const products = xml.split("<Product>").slice(1).map(p => "<Product>" + p);
  const prices: OnixPrice[] = [];

  for (const prod of products) {
    const idType = get(prod, "ProductIDType");
    const idVal = get(prod, "IDValue");
    const isbn13 = idType === "15" ? (idVal ?? "") : "";

    const parts = prod.split("<Price>").slice(1).map(x => "<Price>" + x);
    for (const frag of parts) {
      const priceType = get(frag, "PriceType") ?? undefined;
      const priceAmount = Number(get(frag, "PriceAmount") ?? "0");
      const currencyCode = get(frag, "CurrencyCode") ?? "GBP";
      const territory =
        get(frag, "RegionsIncluded") ?? get(frag, "CountryCode") ?? undefined;
      const effectiveFrom = get(frag, "PriceEffectiveFrom") ?? undefined;
      const effectiveUntil = get(frag, "PriceEffectiveUntil") ?? undefined;

      if (!isbn13 || !priceAmount) continue;

      prices.push({
        isbn13,
        priceType,
        priceAmount,
        currencyCode,
        territory,
        effectiveFrom,
        effectiveUntil,
      });
    }
  }
  return prices;
}

export function pickBestRRP(
  list: OnixPrice[],
  opts: { territory?: "GB" | "US" } = {}
): OnixPrice | undefined {
  const { territory } = opts;
  let candidates = list.filter(p => p.priceAmount > 0);
  if (territory) candidates = candidates.filter(p => p.territory?.includes(territory));
  const rank = (p?: OnixPrice) => (p?.priceType === "02" ? 2 : p?.priceType === "01" ? 1 : 0);
  candidates.sort((a, b) => rank(b) - rank(a));
  return candidates[0];
}

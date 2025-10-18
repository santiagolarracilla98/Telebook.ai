/**
 * Market-aware price selector for Amazon pricing
 * Returns {value, currency, source, updatedAt} for the selected market
 */

export type Market = 'usa' | 'uk';
export type PriceSource = 'buyBox' | 'reference' | 'none';

export interface PriceSignal {
  value: number;
  currency: 'USD' | 'GBP';
  source: PriceSource;
  updatedAt: string | null;
}

export interface Book {
  us_asin?: string | null;
  uk_asin?: string | null;
  amazon_price_usd?: number | null;
  amazon_price_gbp?: number | null;
  rrp?: number;
  last_price_check?: string | null;
}

/**
 * Select the Amazon price for the specified market
 * Never falls back to publisher RRP - returns 0 if no Amazon price available
 */
export function selectAmazonPrice(book: Book, market: Market): PriceSignal {
  const now = new Date().toISOString();
  
  if (market === 'usa') {
    // Check for live US price first
    if (book.amazon_price_usd && book.amazon_price_usd > 0) {
      return {
        value: book.amazon_price_usd,
        currency: 'USD',
        source: 'reference',
        updatedAt: book.last_price_check || now
      };
    }
    
    // No Amazon US price available
    return {
      value: 0,
      currency: 'USD',
      source: 'none',
      updatedAt: null
    };
  } else {
    // UK market
    if (book.amazon_price_gbp && book.amazon_price_gbp > 0) {
      return {
        value: book.amazon_price_gbp,
        currency: 'GBP',
        source: 'reference',
        updatedAt: book.last_price_check || now
      };
    }
    
    // No Amazon UK price available
    return {
      value: 0,
      currency: 'GBP',
      source: 'none',
      updatedAt: null
    };
  }
}

/**
 * Get human-readable label for price source
 */
export function getPriceSourceLabel(source: PriceSource): string {
  switch (source) {
    case 'buyBox':
      return 'Amazon Price (Live Buy Box)';
    case 'reference':
      return 'Amazon Reference (non-live)';
    case 'none':
      return 'No Amazon Price Available';
  }
}

/**
 * Format time difference for "Updated X ago" display
 */
export function formatTimeSince(isoString: string | null): string {
  if (!isoString) return 'Never updated';
  
  const now = new Date();
  const then = new Date(isoString);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) return `Updated ${diffDays}d ago`;
  if (diffHours > 0) return `Updated ${diffHours}h ago`;
  if (diffMins > 0) return `Updated ${diffMins}m ago`;
  return 'Just updated';
}

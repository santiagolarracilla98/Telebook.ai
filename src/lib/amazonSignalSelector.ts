/**
 * Amazon Signal Selector Utility
 * Unifies Amazon pricing signals across different tabs
 */

export type Market = "US" | "UK";
export type SignalType = "buyBox" | "lowestNew" | "reference";

export interface AmazonSignal {
  value: number;
  signalType: SignalType;
  updatedAt?: string;
  source: string;
}

interface SelectAmazonSignalParams {
  market: Market;
  asin?: string;
  keepaData?: {
    current: {
      buyBox: number | null;
      lowestNew: number | null;
      lowestUsed: number | null;
    };
  };
  amazonReferenceUS?: number;
  amazonReferenceUK?: number;
  prefer?: "buyBox" | "lowestNew";
}

/**
 * Select the best Amazon price signal available
 * Prefers Keepa live data (≤12h cached), falls back to reference RRP
 */
export function selectAmazonSignal({
  market,
  asin,
  keepaData,
  amazonReferenceUS,
  amazonReferenceUK,
  prefer = "buyBox",
}: SelectAmazonSignalParams): AmazonSignal {
  // Log signal selection for dev telemetry
  if (import.meta.env.DEV) {
    console.log('[AmazonSignal]', {
      market,
      asin,
      prefer,
      hasKeepaData: !!keepaData,
      amazonRefUS: amazonReferenceUS,
      amazonRefUK: amazonReferenceUK,
    });
  }

  // Try Keepa live data first (if available and ASIN is present)
  if (keepaData && asin) {
    const preferredPrice = keepaData.current[prefer];
    
    if (preferredPrice !== null && preferredPrice > 0) {
      const value = preferredPrice / 100; // Convert from cents
      
      if (import.meta.env.DEV) {
        console.log('[AmazonSignal] Using Keepa live', {
          signalType: prefer,
          value,
          market,
          asin,
        });
      }

      return {
        value,
        signalType: prefer,
        updatedAt: new Date().toISOString(),
        source: "Keepa Live",
      };
    }

    // Fallback to lowestNew if buyBox unavailable
    if (prefer === "buyBox" && keepaData.current.lowestNew !== null && keepaData.current.lowestNew > 0) {
      const value = keepaData.current.lowestNew / 100;
      
      if (import.meta.env.DEV) {
        console.log('[AmazonSignal] Fallback to lowestNew', {
          value,
          market,
          asin,
        });
      }

      return {
        value,
        signalType: "lowestNew",
        updatedAt: new Date().toISOString(),
        source: "Keepa Live (Lowest New)",
      };
    }
  }

  // Fallback to reference RRP
  const referencePrice = market === "US" ? amazonReferenceUS : amazonReferenceUK;
  
  if (referencePrice && referencePrice > 0) {
    if (import.meta.env.DEV) {
      console.log('[AmazonSignal] Using reference RRP', {
        value: referencePrice,
        market,
      });
    }

    return {
      value: referencePrice,
      signalType: "reference",
      source: `Amazon Reference (${market})`,
    };
  }

  // No data available
  if (import.meta.env.DEV) {
    console.log('[AmazonSignal] No signal available', { market, asin });
  }

  return {
    value: 0,
    signalType: "reference",
    source: "Not Available",
  };
}

/**
 * Get display label for signal type
 */
export function getSignalLabel(signalType: SignalType): string {
  switch (signalType) {
    case "buyBox":
      return "Amazon Price (Live)";
    case "lowestNew":
      return "Amazon Price (Live)";
    case "reference":
      return "Amazon Reference (RRP)";
    default:
      return "Amazon Price";
  }
}

/**
 * Get tooltip text explaining the signal source
 */
export function getSignalTooltip(signal: AmazonSignal): string {
  if (signal.signalType === "reference") {
    return "Reference price from Amazon catalog. May not reflect current live pricing.";
  }
  
  return `Live price from Keepa API. Updated: ${signal.updatedAt ? new Date(signal.updatedAt).toLocaleString() : 'recently'}`;
}

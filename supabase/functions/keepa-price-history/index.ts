import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory cache (6 hour TTL)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { asin, isbn, market = 'US' } = await req.json();
    
    if (!asin && !isbn) {
      return new Response(
        JSON.stringify({ error: 'Either ASIN or ISBN is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const domain = market === 'UK' ? 2 : 1;
    const identifier = asin || isbn?.replace(/-/g, '');
    const cacheKey = `${identifier}_${market}`;

    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      console.log('Returning cached price history');
      return new Response(
        JSON.stringify(cached.data),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const KEEPA_API_KEY = Deno.env.get('KEEPA_API_KEY');
    
    if (!KEEPA_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const isAsin = identifier?.startsWith('B') || identifier?.length === 10;
    const searchParam = isAsin ? 'asin' : 'code';
    
    // Request with history=1 to get price history (last 180 days)
    const keepaUrl = `https://api.keepa.com/product?key=${KEEPA_API_KEY}&domain=${domain}&${searchParam}=${identifier}&history=1`;
    
    const response = await fetch(keepaUrl);
    
    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch price history from Keepa' }),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    const data = await response.json();
    
    if (!data.products || data.products.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No product found', asin: identifier }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const product = data.products[0];
    
    // Parse Keepa time series data
    // csv indices: [0] = Amazon, [1] = New, [2] = Used, [3] = Sales Rank, etc.
    // Time is in minutes since Keepa epoch (21 July 2011)
    const keepaEpoch = new Date('2011-07-21T00:00:00Z').getTime();
    
    const parseSeries = (csvData: number[] | undefined, index: number) => {
      if (!csvData || csvData.length === 0) return [];
      
      const series = [];
      // Data comes in pairs: [time, price, time, price, ...]
      for (let i = 0; i < csvData.length; i += 2) {
        const timeMinutes = csvData[i];
        const price = csvData[i + 1];
        
        if (price !== null && price !== -1) {
          const timestamp = new Date(keepaEpoch + timeMinutes * 60000);
          series.push({
            t: timestamp.toISOString(),
            price: price // in cents
          });
        }
      }
      
      // Downsample to max 200 points for last 180 days
      const cutoffDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
      const filtered = series.filter(s => new Date(s.t) >= cutoffDate);
      
      if (filtered.length > 200) {
        const step = Math.ceil(filtered.length / 200);
        return filtered.filter((_, i) => i % step === 0);
      }
      
      return filtered;
    };

    // Extract current prices
    const getCurrentPrice = (csvData: number[] | undefined) => {
      if (!csvData || csvData.length < 2) return null;
      const lastPrice = csvData[csvData.length - 1];
      return lastPrice !== -1 ? lastPrice : null;
    };

    const normalized = {
      asin: product.asin || identifier,
      currency: market === 'UK' ? 'GBP' : 'USD',
      series: {
        buyBox: parseSeries(product.csv?.[0], 0),
        lowestNew: parseSeries(product.csv?.[1], 1),
        lowestUsed: parseSeries(product.csv?.[2], 2),
      },
      current: {
        buyBox: getCurrentPrice(product.csv?.[0]),
        lowestNew: getCurrentPrice(product.csv?.[1]),
        lowestUsed: getCurrentPrice(product.csv?.[2]),
      }
    };

    // Cache the response
    cache.set(cacheKey, {
      data: normalized,
      timestamp: Date.now()
    });

    // Clean old cache entries (optional)
    if (cache.size > 1000) {
      const now = Date.now();
      for (const [key, value] of cache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
          cache.delete(key);
        }
      }
    }

    return new Response(
      JSON.stringify(normalized),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    console.error('Error in keepa-price-history function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});


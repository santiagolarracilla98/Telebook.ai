import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AmazonPriceData {
  price: number | null;
  currency: string;
  asin: string | null;
  isLoading: boolean;
  error: string | null;
  isFresh: boolean;
  fetchedAt: Date | null;
  source: 'live' | 'cached' | 'fallback';
}

const priceCache = new Map<string, { data: AmazonPriceData; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export const useAmazonPrice = () => {
  const [data, setData] = useState<AmazonPriceData>({
    price: null,
    currency: 'USD',
    asin: null,
    isLoading: false,
    error: null,
    isFresh: false,
    fetchedAt: null,
    source: 'fallback'
  });

  const fetchLivePrice = useCallback(async (
    title: string,
    author?: string,
    marketplace: 'usa' | 'uk' = 'usa',
    timeout: number = 3000
  ): Promise<AmazonPriceData> => {
    const cacheKey = `${title}-${author || ''}-${marketplace}`;
    
    // Check cache first
    const cached = priceCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      const cacheAge = Date.now() - cached.timestamp;
      const result = {
        ...cached.data,
        isFresh: cacheAge < 5 * 60 * 1000, // Fresh if < 5 minutes
        source: 'cached' as const
      };
      setData(result);
      return result;
    }

    setData(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeout)
      );

      // Fetch from Keepa via search-amazon-product
      const fetchPromise = supabase.functions.invoke('search-amazon-product', {
        body: { title, author, marketplace }
      });

      const { data: searchData, error: searchError } = await Promise.race([
        fetchPromise,
        timeoutPromise
      ]) as any;

      if (searchError) throw searchError;

      if (searchData?.found && searchData?.productDetails) {
        const result: AmazonPriceData = {
          price: searchData.productDetails.currentPrice || null,
          currency: marketplace === 'uk' ? 'GBP' : 'USD',
          asin: searchData.asin,
          isLoading: false,
          error: null,
          isFresh: true,
          fetchedAt: new Date(),
          source: 'live'
        };

        // Cache the result
        priceCache.set(cacheKey, { data: result, timestamp: Date.now() });
        setData(result);
        return result;
      } else {
        throw new Error('No Amazon data found');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch Amazon price';
      const result: AmazonPriceData = {
        price: null,
        currency: marketplace === 'uk' ? 'GBP' : 'USD',
        asin: null,
        isLoading: false,
        error: errorMessage,
        isFresh: false,
        fetchedAt: null,
        source: 'fallback'
      };
      setData(result);
      return result;
    }
  }, []);

  const clearCache = useCallback((title?: string, author?: string, marketplace?: 'usa' | 'uk') => {
    if (title) {
      const cacheKey = `${title}-${author || ''}-${marketplace || 'usa'}`;
      priceCache.delete(cacheKey);
    } else {
      priceCache.clear();
    }
  }, []);

  return { ...data, fetchLivePrice, clearCache };
};

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const keepaApiKey = Deno.env.get('KEEPA_API_KEY');

    console.log('🔍 Fetching Amazon prices...');

    // Get all books without amazon_price OR with stale prices (>7 days old)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: books, error: booksError } = await supabase
      .from('books')
      .select('id, us_asin, uk_asin, title, author, publisher_rrp, google_books_id, currency, amazon_price, last_price_check')
      .or(`amazon_price.is.null,last_price_check.is.null,last_price_check.lt.${sevenDaysAgo.toISOString()}`)
      .limit(50); // Process in batches to avoid timeout

    if (booksError) throw booksError;

    console.log(`📚 Found ${books?.length || 0} books needing Amazon prices`);

    const results = [];
    let processed = 0;
    let skipped = 0;
    let searched = 0;

    for (const book of books || []) {
      let asin = book.us_asin || book.uk_asin;
      let marketplace = book.us_asin ? 'us' : (book.uk_asin ? 'uk' : (book.currency === 'GBP' ? 'uk' : 'us'));
      let amazonPrice = null;
      let foundNewAsin = false;
      let priceSource = null;

      // LAYER 1: Always try search-amazon-product with title/author (proven to work in UI)
      if (keepaApiKey) {
        try {
          console.log(`🎯 Layer 1: Searching Amazon for "${book.title}" by ${book.author || 'Unknown'}`);
          
          const { data: searchData, error: searchError } = await supabase.functions.invoke('search-amazon-product', {
            body: { 
              title: book.title,
              author: book.author || 'Unknown Author',
              marketplace 
            }
          });

          if (!searchError && searchData?.found) {
            // Update ASIN with the real one found by search
            if (searchData.asin && !asin) {
              asin = searchData.asin;
              foundNewAsin = true;
              searched++;
              console.log(`📍 Found ASIN via search: ${asin}`);
              
              // Update the book record with the found ASIN
              const asinField = marketplace === 'us' ? 'us_asin' : 'uk_asin';
              await supabase
                .from('books')
                .update({ [asinField]: asin })
                .eq('id', book.id);
            }
            
            // Get price if available
            if (searchData.productDetails?.currentPrice) {
              amazonPrice = searchData.productDetails.currentPrice;
              priceSource = 'search-amazon-product';
              console.log(`✅ Layer 1 SUCCESS: Got price $${amazonPrice.toFixed(2)} from search-amazon-product`);
            } else {
              console.log(`⚠️ Layer 1: Found product but no price available`);
            }
          } else {
            console.log(`⚠️ Layer 1 failed: Could not find "${book.title}" on Amazon`);
          }
        } catch (error) {
          console.log(`⚠️ Layer 1 error for "${book.title}":`, error);
        }
      }

      // LAYER 2: If no price yet and we have ASIN, try keepa-product with improved parsing
      if (!amazonPrice && asin && keepaApiKey) {
        try {
          console.log(`🔎 Layer 2: Trying keepa-product for "${book.title}" (ASIN: ${asin})`);
          
          const { data: keepaData, error: keepaError } = await supabase.functions.invoke('keepa-product', {
            body: { isbn: asin, marketplace }
          });

          if (!keepaError && keepaData?.products?.[0]) {
            const product = keepaData.products[0];
            console.log(`📊 Keepa product data structure:`, JSON.stringify({
              hasCsv: !!product.csv,
              csvLength: product.csv?.length,
              hasStats: !!product.stats,
              hasData: !!product.data
            }));

            // Try multiple parsing strategies
            // Strategy 1: CSV array (current Amazon price) - csv[0] is Amazon price history
            if (product.csv && product.csv[0] && Array.isArray(product.csv[0])) {
              const prices = product.csv[0];
              // Keepa stores prices as: [timestamp1, price1, timestamp2, price2, ...]
              // Get the last price value (skip timestamp, get actual price)
              // Keepa uses -1 for "no data available"
              if (prices.length >= 2) {
                const latestPrice = prices[prices.length - 1];
                if (latestPrice > 0 && latestPrice !== -1) {
                  amazonPrice = latestPrice / 100; // Keepa stores prices in cents
                  priceSource = 'keepa-csv';
                  console.log(`✅ Layer 2 SUCCESS (CSV): Found price £${amazonPrice.toFixed(2)}`);
                }
              }
            }

            // Strategy 2: Try csv[1] (New Amazon price)
            if (!amazonPrice && product.csv && product.csv[1] && Array.isArray(product.csv[1])) {
              const prices = product.csv[1];
              if (prices.length >= 2) {
                const latestPrice = prices[prices.length - 1];
                if (latestPrice > 0 && latestPrice !== -1) {
                  amazonPrice = latestPrice / 100;
                  priceSource = 'keepa-csv-new';
                  console.log(`✅ Layer 2 SUCCESS (CSV New): Found price £${amazonPrice.toFixed(2)}`);
                }
              }
            }

            // Strategy 3: Stats current price
            if (!amazonPrice && product.stats?.current?.[0]) {
              const currentPrice = product.stats.current[0];
              if (currentPrice > 0 && currentPrice !== -1) {
                amazonPrice = currentPrice / 100;
                priceSource = 'keepa-stats';
                console.log(`✅ Layer 2 SUCCESS (Stats): Found price £${amazonPrice.toFixed(2)}`);
              }
            }

            if (!amazonPrice) {
              console.log(`⚠️ Layer 2 failed: All Keepa price fields were empty or -1 (no data)`);
              console.log(`📉 CSV arrays available: ${product.csv?.length || 0}, Last values:`, 
                product.csv?.slice(0, 5).map((arr: number[]) => arr?.[arr.length - 1] || 'empty'));
            }
          } else {
            console.log(`⚠️ Layer 2 failed: Keepa returned no products or error:`, keepaError);
          }
        } catch (error) {
          console.log(`⚠️ Layer 2 error for ${asin}:`, error);
        }
      }

      // Layer 3 removed - Layer 1 now handles all title/author searches

      // Skip if still no price after all attempts
      if (!amazonPrice) {
        skipped++;
        console.log(`⏭️ Skipping "${book.title}" - no price found after all attempts`);
        continue;
      }

      // Only store verified Amazon prices (no fallbacks)
      if (amazonPrice) {
        // Update books table with price and timestamp
        const { error: updateError } = await supabase
          .from('books')
          .update({ 
            amazon_price: amazonPrice,
            last_price_check: new Date().toISOString()
          })
          .eq('id', book.id);

        if (updateError) {
          console.error('❌ Error updating book Amazon price:', updateError);
        } else {
          processed++;
          results.push({
            asin,
            title: book.title,
            amazon_price: amazonPrice,
            marketplace,
            foundViaSearch: foundNewAsin,
            priceSource: priceSource // Track which method succeeded
          });
        }
      } else {
        skipped++;
        console.log(`⏭️ No price available for "${book.title}"`);
      }
    }

    console.log(`✅ Successfully processed ${processed} Amazon prices (${searched} found via search, ${skipped} skipped)`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed,
        searched,
        skipped,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in fetch-amazon-prices:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});


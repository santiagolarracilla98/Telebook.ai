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

    // Get all books without amazon_price (including books from Google)
    const { data: books, error: booksError } = await supabase
      .from('books')
      .select('id, us_asin, uk_asin, title, author, publisher_rrp, google_books_id, currency')
      .is('amazon_price', null)
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

      // If no ASIN, try to search Amazon by title and author
      if (!asin && keepaApiKey) {
        console.log(`🔍 No ASIN found for "${book.title}" - searching Amazon...`);
        try {
          const { data: searchData, error: searchError } = await supabase.functions.invoke('search-amazon-product', {
            body: { 
              title: book.title, 
              author: book.author,
              marketplace 
            }
          });

          if (!searchError && searchData?.found && searchData?.asin) {
            asin = searchData.asin;
            foundNewAsin = true;
            searched++;
            console.log(`✅ Found ASIN via search: ${asin}`);

            // Update the book record with the found ASIN
            const asinField = marketplace === 'us' ? 'us_asin' : 'uk_asin';
            await supabase
              .from('books')
              .update({ [asinField]: asin })
              .eq('id', book.id);

            // If search returned price, use it
            if (searchData.productDetails?.currentPrice) {
              amazonPrice = searchData.productDetails.currentPrice;
              console.log(`💰 Got price from search: $${amazonPrice.toFixed(2)}`);
            }
          } else {
            console.log(`⚠️ Could not find "${book.title}" on Amazon`);
          }
        } catch (error) {
          console.log(`⚠️ Amazon search error for "${book.title}":`, error);
        }
      }

      // Skip if still no ASIN after search attempt
      if (!asin) {
        skipped++;
        console.log(`⏭️ Skipping "${book.title}" - no ASIN found`);
        continue;
      }

      // If we don't have price yet, try to fetch it via Keepa
      if (!amazonPrice && keepaApiKey) {
        try {
          console.log(`🔎 Fetching price for "${book.title}" (ASIN: ${asin})`);
          
          const { data: keepaData, error: keepaError } = await supabase.functions.invoke('keepa-product', {
            body: { isbn: asin, marketplace }
          });

          if (!keepaError && keepaData?.products?.[0]) {
            const product = keepaData.products[0];
            // Get current Amazon price from Keepa data (index 0 is Amazon price)
            if (product.csv && product.csv[0]) {
              const prices = product.csv[0];
              const latestPrice = prices[prices.length - 1];
              if (latestPrice > 0) {
                amazonPrice = latestPrice / 100; // Keepa stores prices in cents
                console.log(`✅ Found Amazon price: $${amazonPrice.toFixed(2)}`);
              }
            }
          }
        } catch (error) {
          console.log(`⚠️ Keepa API error for ${asin}:`, error);
        }
      }

      // Fallback to calculated price (1.3x publisher RRP)
      if (!amazonPrice && book.publisher_rrp && book.publisher_rrp > 0) {
        amazonPrice = book.publisher_rrp * 1.3;
        console.log(`📊 Using calculated price: $${amazonPrice.toFixed(2)} (1.3x RRP)`);
      }

      if (amazonPrice) {
        // Update books table
        const { error: updateError } = await supabase
          .from('books')
          .update({ amazon_price: amazonPrice })
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
            foundViaSearch: foundNewAsin
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


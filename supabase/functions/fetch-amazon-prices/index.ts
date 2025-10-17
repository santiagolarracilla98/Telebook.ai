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
      .select('id, us_asin, uk_asin, title, publisher_rrp, google_books_id')
      .is('amazon_price', null)
      .limit(50); // Process in batches to avoid timeout

    if (booksError) throw booksError;

    console.log(`📚 Found ${books?.length || 0} books needing Amazon prices`);

    const results = [];
    let processed = 0;
    let skipped = 0;

    for (const book of books || []) {
      const asin = book.us_asin || book.uk_asin;
      
      // Skip books without ASIN or publisher price
      if (!asin) {
        skipped++;
        console.log(`⏭️ Skipping "${book.title}" - no ASIN available`);
        continue;
      }

      if (!book.publisher_rrp || book.publisher_rrp === 0) {
        skipped++;
        console.log(`⏭️ Skipping "${book.title}" - no publisher RRP`);
        continue;
      }

      const marketplace = book.us_asin ? 'US' : 'UK';
      let amazonPrice = null;

      // Try Keepa API if available
      if (keepaApiKey) {
        try {
          console.log(`🔎 Fetching price for "${book.title}" (ASIN: ${asin})`);
          
          const { data: keepaData, error: keepaError } = await supabase.functions.invoke('keepa-product', {
            body: { isbn: asin, marketplace: marketplace.toLowerCase() }
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
      if (!amazonPrice && book.publisher_rrp) {
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
            marketplace
          });
        }
      }
    }

    console.log(`✅ Successfully processed ${processed} Amazon prices (${skipped} skipped)`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed,
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


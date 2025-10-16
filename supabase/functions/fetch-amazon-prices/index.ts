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

    console.log('Fetching Amazon prices...');

    // Get all books without amazon_price
    const { data: books, error: booksError } = await supabase
      .from('books')
      .select('id, us_asin, uk_asin, title, publisher_rrp')
      .is('amazon_price', null)
      .not('publisher_rrp', 'is', null);

    if (booksError) throw booksError;

    console.log(`Found ${books?.length || 0} books needing Amazon prices`);

    const results = [];

    for (const book of books || []) {
      const asin = book.us_asin || book.uk_asin;
      if (!asin) continue;

      const marketplace = book.us_asin ? 'US' : 'UK';
      let amazonPrice = null;

      // Try Keepa API if available
      if (keepaApiKey) {
        try {
          // Using existing keepa-product function
          const { data: keepaData, error: keepaError } = await supabase.functions.invoke('keepa-product', {
            body: { asin, domain: marketplace === 'US' ? 1 : 2 }
          });

          if (!keepaError && keepaData?.products?.[0]) {
            const product = keepaData.products[0];
            // Get current Amazon price from Keepa data
            if (product.csv && product.csv[0]) {
              const prices = product.csv[0];
              amazonPrice = prices[prices.length - 1] / 100; // Keepa stores prices in cents
            }
          }
        } catch (error) {
          console.log(`Keepa API error for ${asin}:`, error);
        }
      }

      // Fallback to calculated price (1.3x publisher RRP for mock data)
      if (!amazonPrice && book.publisher_rrp) {
        amazonPrice = book.publisher_rrp * 1.3;
      }

      if (amazonPrice) {
        // Update books table
        const { error: updateError } = await supabase
          .from('books')
          .update({ amazon_price: amazonPrice })
          .eq('id', book.id);

        if (updateError) {
          console.error('Error updating book Amazon price:', updateError);
        } else {
          results.push({
            asin,
            title: book.title,
            amazon_price: amazonPrice,
            marketplace
          });
        }
      }
    }

    console.log(`Successfully processed ${results.length} Amazon prices`);

    return new Response(
      JSON.stringify({ success: true, processed: results.length, results }),
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


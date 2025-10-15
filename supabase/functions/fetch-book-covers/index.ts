import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const KEEPA_API_KEY = Deno.env.get('KEEPA_API_KEY');
    
    if (!KEEPA_API_KEY) {
      throw new Error('KEEPA_API_KEY not configured');
    }

    console.log('Fetching books without images...');
    
    // Get books that don't have images yet
    const { data: books, error: fetchError } = await supabaseClient
      .from('books')
      .select('id, uk_asin, us_asin, image_url, title')
      .is('image_url', null);

    if (fetchError) {
      console.error('Error fetching books:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${books?.length || 0} books without images`);

    let updated = 0;
    let failed = 0;

    // Process each book
    for (const book of books || []) {
      // Prefer US ASIN, fallback to UK ASIN
      const asin = book.us_asin || book.uk_asin;
      if (!asin || asin === 'N/A') {
        console.log(`Skipping book ${book.title} - no valid ASIN`);
        failed++;
        continue;
      }

      const cleanAsin = asin.replace(/-/g, '');
      const domain = book.us_asin && book.us_asin !== 'N/A' ? 1 : 2; // 1 = USA, 2 = UK
      
      console.log(`Fetching image for ${book.title} (ASIN: ${cleanAsin})`);

      try {
        // Fetch product data from Keepa
        const keepaUrl = `https://api.keepa.com/product?key=${KEEPA_API_KEY}&domain=${domain}&asin=${cleanAsin}`;
        const response = await fetch(keepaUrl);
        
        if (!response.ok) {
          console.error(`Keepa API error for ${cleanAsin}: ${response.status}`);
          failed++;
          continue;
        }
        
        const data = await response.json();
        
        if (!data.products || data.products.length === 0) {
          console.log(`No product found for ${cleanAsin}`);
          failed++;
          continue;
        }

        const product = data.products[0];
        let imageUrl = null;

        // Try to get image from Keepa's imagesCSV field
        if (product.imagesCSV) {
          const images = product.imagesCSV.split(',');
          if (images.length > 0) {
            // Keepa provides image IDs, construct the full URL
            imageUrl = `https://images-na.ssl-images-amazon.com/images/I/${images[0]}`;
          }
        }
        
        // Fallback to standard Amazon image URL format
        if (!imageUrl) {
          imageUrl = `https://images-na.ssl-images-amazon.com/images/P/${cleanAsin}.jpg`;
        }

        console.log(`Updating ${book.title} with image: ${imageUrl}`);

        // Update the book with the image URL
        const { error: updateError } = await supabaseClient
          .from('books')
          .update({ image_url: imageUrl })
          .eq('id', book.id);

        if (updateError) {
          console.error(`Error updating book ${book.id}:`, updateError);
          failed++;
        } else {
          updated++;
        }

        // Add delay to respect Keepa API rate limits (max 1 request per 0.5 seconds)
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`Error processing book ${book.title}:`, error);
        failed++;
      }
    }

    console.log(`Updated ${updated} books, failed ${failed}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        updated,
        failed,
        total: books?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});


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

    console.log('Fetching all books...');
    
    // Get all books
    const { data: books, error: fetchError } = await supabaseClient
      .from('books')
      .select('id, uk_asin, us_asin, image_url');

    if (fetchError) {
      console.error('Error fetching books:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${books?.length || 0} books`);

    let updated = 0;
    let skipped = 0;

    // Update each book that doesn't have an image
    for (const book of books || []) {
      if (book.image_url) {
        skipped++;
        continue;
      }

      const asin = book.uk_asin || book.us_asin;
      if (!asin || asin === 'N/A') {
        skipped++;
        continue;
      }

      const cleanAsin = asin.replace(/-/g, '');
      const imageUrl = `https://covers.openlibrary.org/b/isbn/${cleanAsin}-L.jpg`;
      
      console.log(`Updating book ${book.id} with image: ${imageUrl}`);

      // Update the book with the image URL
      const { error: updateError } = await supabaseClient
        .from('books')
        .update({ image_url: imageUrl })
        .eq('id', book.id);

      if (updateError) {
        console.error(`Error updating book ${book.id}:`, updateError);
      } else {
        updated++;
      }
    }

    console.log(`Updated ${updated} books, skipped ${skipped}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        updated,
        skipped,
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

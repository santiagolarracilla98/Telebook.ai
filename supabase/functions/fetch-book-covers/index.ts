import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { isbn, asin } = await req.json();
    
    console.log(`Fetching book cover for ISBN: ${isbn}, ASIN: ${asin}`);
    
    // Try Open Library first with ISBN
    if (isbn && isbn !== 'N/A') {
      const cleanIsbn = isbn.replace(/-/g, '');
      const openLibraryUrl = `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg`;
      
      // Check if image exists
      const response = await fetch(openLibraryUrl, { method: 'HEAD' });
      if (response.ok) {
        console.log('Found cover on Open Library');
        return new Response(
          JSON.stringify({ imageUrl: openLibraryUrl }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Try with ASIN if ISBN didn't work
    if (asin && asin !== 'N/A') {
      const cleanAsin = asin.replace(/-/g, '');
      const openLibraryUrl = `https://covers.openlibrary.org/b/isbn/${cleanAsin}-L.jpg`;
      
      const response = await fetch(openLibraryUrl, { method: 'HEAD' });
      if (response.ok) {
        console.log('Found cover on Open Library with ASIN');
        return new Response(
          JSON.stringify({ imageUrl: openLibraryUrl }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // If no cover found, return null
    console.log('No cover found');
    return new Response(
      JSON.stringify({ imageUrl: null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error fetching book cover:', error);
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

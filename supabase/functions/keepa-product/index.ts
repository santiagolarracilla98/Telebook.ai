import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { isbn, marketplace = 'usa' } = await req.json();
    
    if (!isbn) {
      return new Response(
        JSON.stringify({ error: 'ISBN is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Map marketplace to Keepa domain: USA = 1, UK = 2
    const domain = marketplace === 'uk' ? 2 : 1;

    const KEEPA_API_KEY = Deno.env.get('KEEPA_API_KEY');
    
    if (!KEEPA_API_KEY) {
      console.error('KEEPA_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Remove hyphens from identifier for Keepa API
    const cleanIdentifier = isbn.replace(/-/g, '');
    
    console.log(`Fetching Keepa data for identifier: ${cleanIdentifier} (${marketplace.toUpperCase()} marketplace, domain: ${domain})`);
    
    // Determine if this is an ASIN (starts with B) or ISBN
    const isAsin = cleanIdentifier.startsWith('B') || cleanIdentifier.length === 10;
    const searchParam = isAsin ? 'asin' : 'code';
    
    console.log(`Using search parameter: ${searchParam}`);
    
    const keepaUrl = `https://api.keepa.com/product?key=${KEEPA_API_KEY}&domain=${domain}&${searchParam}=${cleanIdentifier}&stats=180&rating=1`;
    
    const response = await fetch(keepaUrl);
    
    if (!response.ok) {
      console.error(`Keepa API error: ${response.status}`);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch Amazon data from Keepa' }),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    const data = await response.json();
    
    // If no products found and we used 'code', try with 'asin' as fallback
    if ((!data.products || data.products.length === 0) && !isAsin) {
      console.log(`No results with code parameter, trying asin parameter`);
      const asinUrl = `https://api.keepa.com/product?key=${KEEPA_API_KEY}&domain=${domain}&asin=${cleanIdentifier}&stats=180&rating=1`;
      const asinResponse = await fetch(asinUrl);
      
      if (asinResponse.ok) {
        const asinData = await asinResponse.json();
        if (asinData.products && asinData.products.length > 0) {
          console.log('Found data using asin parameter');
          return new Response(
            JSON.stringify(asinData),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
      }
    }
    
    console.log(`Keepa data fetched - found ${data.products?.length || 0} products`);
    
    return new Response(
      JSON.stringify(data),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    console.error('Error in keepa-product function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});


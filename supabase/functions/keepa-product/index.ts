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

    // Remove hyphens from ISBN for Keepa API
    const cleanIsbn = isbn.replace(/-/g, '');
    
    console.log(`Fetching Keepa data for ISBN: ${cleanIsbn} (${marketplace.toUpperCase()} marketplace, domain: ${domain})`);
    
    // Try multiple search strategies: first by ASIN, then by code (for ISBN-13)
    const keepaUrl = `https://api.keepa.com/product?key=${KEEPA_API_KEY}&domain=${domain}&code=${cleanIsbn}&stats=180&rating=1`;
    
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
    console.log('Keepa data fetched successfully');
    
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


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
    const { title, author, marketplace = 'usa' } = await req.json();
    
    if (!title) {
      return new Response(
        JSON.stringify({ error: 'Title is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

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

    // Map marketplace to Keepa domain: USA = 1, UK = 2
    const domain = marketplace === 'uk' ? 2 : 1;

    // Build search query - combine title and author for better results
    const searchQuery = author ? `${title} ${author}` : title;
    console.log(`🔎 Searching Amazon for: \"${searchQuery}\" in ${marketplace.toUpperCase()} marketplace`);

    // Use Keepa's product finder endpoint
    const keepaUrl = `https://api.keepa.com/search?key=${KEEPA_API_KEY}&domain=${domain}&type=product&term=${encodeURIComponent(searchQuery)}`;
    
    const response = await fetch(keepaUrl);
    
    if (!response.ok) {
      console.error(`Keepa search error: ${response.status}`);
      return new Response(
        JSON.stringify({ error: 'Failed to search Amazon products' }),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    const data = await response.json();
    
    // Extract ASINs from search results
    const asins = data.asinList || [];
    
    if (asins.length === 0) {
      console.log(`⚠️ No products found for: \"${searchQuery}\"`);
      return new Response(
        JSON.stringify({ 
          found: false,
          message: 'No products found',
          searchQuery 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get the first (most relevant) ASIN
    const bestMatchAsin = asins[0];
    console.log(`✅ Found ASIN: ${bestMatchAsin} for \"${title}\"`);

    // Fetch detailed product info for the best match
    const productUrl = `https://api.keepa.com/product?key=${KEEPA_API_KEY}&domain=${domain}&asin=${bestMatchAsin}&stats=180`;
    const productResponse = await fetch(productUrl);
    
    let productDetails = null;
    if (productResponse.ok) {
      const productData = await productResponse.json();
      if (productData.products?.[0]) {
        const product = productData.products[0];
        productDetails = {
          asin: bestMatchAsin,
          title: product.title,
          image: product.imagesCSV?.split(',')[0],
          // Get current Amazon price (csv[0] is Amazon price history)
          currentPrice: product.csv?.[0] ? product.csv[0][product.csv[0].length - 1] / 100 : null,
        };
      }
    }

    return new Response(
      JSON.stringify({
        found: true,
        asin: bestMatchAsin,
        allAsins: asins,
        productDetails,
        searchQuery
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    console.error('Error in search-amazon-product function:', error);
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


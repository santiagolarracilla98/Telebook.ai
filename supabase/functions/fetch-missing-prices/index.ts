import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🔍 Fetching missing publisher prices from alternative sources");

    const { bookIds, estimateMissing = false } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const googleBooksApiKey = Deno.env.get("GOOGLE_BOOKS_API_KEY");
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Fetch books without publisher pricing
    let query = supabase
      .from("books")
      .select("*")
      .is("publisher_rrp", null);

    // If specific book IDs provided, filter by those
    if (bookIds && bookIds.length > 0) {
      query = query.in("id", bookIds);
    }

    const { data: booksWithoutPrices, error: fetchError } = await query.limit(50);

    if (fetchError) throw fetchError;

    if (!booksWithoutPrices || booksWithoutPrices.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No books found without publisher pricing",
          updated: 0
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${booksWithoutPrices.length} books without publisher pricing`);

    let updatedCount = 0;
    let estimatedCount = 0;
    const results = [];

    for (const book of booksWithoutPrices) {
      try {
        let foundPrice = null;
        let priceSource = null;

        // Try Google Books API if available
        if (googleBooksApiKey && (book.uk_asin || book.us_asin)) {
          const isbn = book.uk_asin || book.us_asin;
          const gbUrl = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${googleBooksApiKey}`;
          
          const gbResponse = await fetch(gbUrl);
          if (gbResponse.ok) {
            const gbData = await gbResponse.json();
            if (gbData.items && gbData.items.length > 0) {
              const volumeInfo = gbData.items[0].volumeInfo;
              const saleInfo = gbData.items[0].saleInfo;
              
              if (saleInfo?.listPrice?.amount) {
                foundPrice = saleInfo.listPrice.amount;
                priceSource = 'google_books';
                console.log(`✅ Found price from Google Books: ${foundPrice} for "${book.title}"`);
              }
            }
          }
        }

        // If no price found and estimation is enabled
        if (!foundPrice && estimateMissing) {
          // Simple estimation based on page count and category
          let estimatedPrice = 12.99; // Default base price
          
          if (book.page_count) {
            if (book.page_count > 500) estimatedPrice = 24.99;
            else if (book.page_count > 300) estimatedPrice = 18.99;
            else if (book.page_count > 150) estimatedPrice = 14.99;
          }
          
          // Adjust by category
          if (book.category) {
            const category = book.category.toLowerCase();
            if (category.includes('textbook') || category.includes('academic')) {
              estimatedPrice *= 2.5;
            } else if (category.includes('technical') || category.includes('professional')) {
              estimatedPrice *= 1.8;
            }
          }
          
          foundPrice = estimatedPrice;
          priceSource = 'estimated';
          estimatedCount++;
          console.log(`📊 Estimated price: ${foundPrice} for "${book.title}"`);
        }

        // Update the book if we found or estimated a price
        if (foundPrice && priceSource) {
          const { error: updateError } = await supabase
            .from("books")
            .update({
              publisher_rrp: foundPrice,
              price_source: priceSource,
              rrp: foundPrice,
              wholesale_price: foundPrice * 0.6 // Estimate wholesale at 60%
            })
            .eq("id", book.id);

          if (!updateError) {
            updatedCount++;
            results.push({
              id: book.id,
              title: book.title,
              price: foundPrice,
              source: priceSource
            });
          }
        }

      } catch (error) {
        console.error(`Error processing book ${book.title}:`, error);
      }
    }

    console.log(`✅ Updated ${updatedCount} books (${estimatedCount} estimated)`);

    return new Response(
      JSON.stringify({
        success: true,
        updated: updatedCount,
        estimated: estimatedCount,
        total_processed: booksWithoutPrices.length,
        results: results
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error) {
    console.error("Error fetching missing prices:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      }
    );
  }
});
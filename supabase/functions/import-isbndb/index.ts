import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to normalize date formats from ISBNdb
function normalizePublishedDate(dateStr: string | undefined): string | null {
  if (!dateStr) return null;

  // If already in YYYY-MM-DD format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // If only year (YYYY), append -01-01
  if (/^\d{4}$/.test(dateStr)) {
    return `${dateStr}-01-01`;
  }

  // If year-month (YYYY-MM), append -01
  if (/^\d{4}-\d{2}$/.test(dateStr)) {
    return `${dateStr}-01`;
  }

  // If any other format, try to extract year and default to Jan 1
  const yearMatch = dateStr.match(/\d{4}/);
  if (yearMatch) {
    return `${yearMatch[0]}-01-01`;
  }

  return null;
}

const FUNCTION_VERSION = "v1.0-isbndb-integration";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`🚀 import-isbndb ${FUNCTION_VERSION} - Request received`);
    
    const { query, page = 1, pageSize = 20, territory = "GB", datasetName } = await req.json();

    if (!query) {
      throw new Error("Search query is required");
    }

    console.log(`📚 Importing books from ISBNdb API: ${query}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const isbndbApiKey = Deno.env.get("ISBNDB_API_KEY");

    if (!isbndbApiKey) {
      throw new Error("ISBNdb API key not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Create a new dataset for this import
    const finalDatasetName = datasetName || `ISBNdb - ${query}`;
    const { data: dataset, error: datasetError } = await supabase
      .from("datasets")
      .insert({
        name: finalDatasetName,
        source: "isbndb",
        is_active: true,
        created_by: user.id,
        metadata: {
          query,
          page,
          pageSize,
          territory,
          importedAt: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (datasetError) {
      console.error("Dataset creation error:", datasetError);
      throw datasetError;
    }

    console.log(`Created dataset: ${dataset.id}`);

    // Fetch books from ISBNdb API
    const isbndbUrl = `https://api2.isbndb.com/books/${encodeURIComponent(query)}?page=${page}&pageSize=${pageSize}`;
    
    console.log(`Fetching from ISBNdb: ${isbndbUrl}`);
    
    const response = await fetch(isbndbUrl, {
      headers: {
        'Authorization': isbndbApiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`ISBNdb API error: ${response.status} - ${errorText}`);
      throw new Error(`ISBNdb API request failed: ${response.status}`);
    }

    const data = await response.json();
    console.log(`ISBNdb API returned ${data.books?.length || 0} books`);

    if (!data.books || data.books.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No books found for this query",
          dataset_id: dataset.id,
          books_imported: 0
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const booksToInsert = [];
    const errors = [];

    for (const book of data.books) {
      try {
        // Extract ISBN13 (prefer isbn13, fallback to isbn)
        const isbn13 = book.isbn13 || book.isbn;
        
        if (!isbn13) {
          console.log(`Skipping book without ISBN: ${book.title}`);
          continue;
        }

        // Check if book already exists by ISBN13 or title+author combo
        const author = book.authors?.join(', ') || book.publisher || 'Unknown Author';
        
        const { data: existingBooks } = await supabase
          .from('books')
          .select('id')
          .or(`uk_asin.eq.${isbn13},us_asin.eq.${isbn13}`)
          .limit(1);

        // Also check for title+author duplicate
        const { data: existingByTitleAuthor } = await supabase
          .from('books')
          .select('id')
          .eq('title', book.title)
          .eq('author', author)
          .limit(1);

        if ((existingBooks && existingBooks.length > 0) || (existingByTitleAuthor && existingByTitleAuthor.length > 0)) {
          console.log(`Book already exists: ${book.title}`);
          continue;
        }

        // Extract ISBNdb pricing data
        let isbndbMsrp = null;
        let isbndbCurrency = territory === 'GB' ? 'GBP' : 'USD';
        
        // Try msrp first
        if (book.msrp) {
          isbndbMsrp = parseFloat(book.msrp);
        }
        // Try price_amount as backup
        else if (book.price_amount) {
          isbndbMsrp = parseFloat(book.price_amount);
        }
        // Try other price fields
        else if (book.price) {
          isbndbMsrp = parseFloat(book.price);
        }
        
        // For NEW books from ISBNdb, use ISBNdb pricing as publisher pricing
        // This ONLY affects newly imported books, not existing data
        let publisherRrp = null;
        let estimatedWholesale = null;
        
        // Calculate prices if we have ISBNdb pricing
        if (isbndbMsrp && isbndbMsrp > 0) {
          publisherRrp = isbndbMsrp;
          estimatedWholesale = isbndbMsrp * 0.6; // Estimate wholesale at 60% of MSRP
        }
        
        const bookData = {
          dataset_id: dataset.id,
          title: book.title || 'Untitled',
          author: book.authors?.join(', ') || book.publisher || 'Unknown Author',
          uk_asin: territory === 'GB' ? isbn13 : null,
          us_asin: territory === 'US' ? isbn13 : null,
          publisher: book.publisher || null,
          published_date: normalizePublishedDate(book.date_published),
          page_count: book.pages || null,
          description: book.synopsis || book.overview || null,
          image_url: book.image || null,
          category: book.subjects?.join(', ') || 'General',
          currency: territory === 'GB' ? 'GBP' : 'USD',
          available_stock: 0,
          rrp: publisherRrp || null,
          wholesale_price: estimatedWholesale || null,
          publisher_rrp: publisherRrp || null,
          price_source: isbndbMsrp ? 'isbndb' : null, // Track price source
          // ISBNdb-specific tracking fields (for data source tracking)
          isbndb_msrp: isbndbMsrp,
          isbndb_price_currency: isbndbCurrency,
          isbndb_binding: book.binding || null,
          isbndb_price_date: new Date().toISOString(),
        };

        booksToInsert.push(bookData);
        
      } catch (error) {
        console.error(`Error processing book ${book.title}:`, error);
        errors.push({
          title: book.title,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Insert books individually to handle duplicates gracefully
    let insertedCount = 0;
    let skippedCount = 0;
    if (booksToInsert.length > 0) {
      console.log(`Inserting ${booksToInsert.length} books...`);
      
      for (const book of booksToInsert) {
        const { error: insertError } = await supabase
          .from('books')
          .insert(book);

        if (insertError) {
          // If it's a duplicate, log and skip
          if (insertError.code === '23505') {
            console.log(`Skipping duplicate: ${book.title}`);
            skippedCount++;
          } else {
            console.error(`Error inserting ${book.title}:`, insertError);
            errors.push({
              title: book.title,
              error: insertError.message
            });
          }
        } else {
          insertedCount++;
        }
      }
      
      console.log(`✅ Successfully inserted ${insertedCount} books`);
      if (skippedCount > 0) {
        console.log(`⏭️ Skipped ${skippedCount} duplicate books`);
      }
    }

    // Update dataset with correct book count and metadata
    await supabase
      .from('datasets')
      .update({
        book_count: insertedCount,
        metadata: {
          ...dataset.metadata,
          totalResults: data.total || 0,
          booksImported: insertedCount,
          skippedDuplicates: skippedCount,
          errors: errors.length > 0 ? errors : undefined,
          completedAt: new Date().toISOString()
        }
      })
      .eq('id', dataset.id);

    return new Response(
      JSON.stringify({
        success: true,
        dataset_id: dataset.id,
        dataset_name: dataset.name,
        books_imported: insertedCount,
        skipped_duplicates: skippedCount,
        total_found: data.total || 0,
        errors: errors.length > 0 ? errors : undefined
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error) {
    console.error("Import error:", error);
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

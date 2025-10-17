import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
// Helper function to normalize date formats from Google Books
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

  // If no valid date found, return null
  return null;
}

const FUNCTION_VERSION = "v2.0-date-fix-deployed";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`🚀 import-google-books ${FUNCTION_VERSION} - Request received`);
    
    const { query, maxResults = 40, territory = "GB", datasetName } = await req.json();

    if (!query) {
      throw new Error("Search query is required");
    }

    console.log(`📚 Importing books from Google Books API: ${query}`);

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
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Create a new dataset for this import
    const finalDatasetName = datasetName || `Google Books - ${query}`;
    const { data: dataset, error: datasetError } = await supabase
      .from("datasets")
      .insert({
        name: finalDatasetName,
        source: "google_books",
        is_active: true,
        created_by: user.id,
        metadata: {
          query,
          maxResults,
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

    // Fetch books from Google Books API
    const apiUrl = googleBooksApiKey
      ? `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=${maxResults}&key=${googleBooksApiKey}`
      : `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=${maxResults}`;

    console.log("Fetching from Google Books API...");
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`Google Books API error: ${response.statusText}`);
    }

    const data = await response.json();
    const volumes = data.items || [];

    console.log(`Found ${volumes.length} volumes`);

    const booksToInsert = [];
    const skippedBooks = [];

    for (const vol of volumes) {
      const volumeInfo = vol.volumeInfo || {};

      // Get ISBN (prefer ISBN-13, fallback to ISBN-10)
      const identifiers = volumeInfo.industryIdentifiers || [];
      const isbn13 = identifiers.find((id: any) => id.type === "ISBN_13")?.identifier;
      const isbn10 = identifiers.find((id: any) => id.type === "ISBN_10")?.identifier;
      const isbn = isbn13 || isbn10;

      if (!isbn) {
        skippedBooks.push({ title: volumeInfo.title, reason: "No ISBN" });
        continue;
      }

      // Check if book already exists with this ISBN or Google Books ID
      const { data: existing } = await supabase.from("books").select("id").eq("google_books_id", vol.id);

      if (existing) {
        skippedBooks.push({ title: volumeInfo.title, reason: "Already exists" });
        continue;
      }

      const normalizedDate = normalizePublishedDate(volumeInfo.publishedDate);
      console.log(`📅 Book: "${volumeInfo.title}" | Original: "${volumeInfo.publishedDate}" → Normalized: "${normalizedDate}"`);
      
      booksToInsert.push({
        title: volumeInfo.title || "Unknown Title",
        author: volumeInfo.authors?.[0] || "Unknown Author",
        dataset_id: dataset.id,
        description: volumeInfo.description,
        publisher: volumeInfo.publisher,
        published_date: normalizedDate,
        page_count: volumeInfo.pageCount,
        category: volumeInfo.categories?.[0] || "General",
        image_url: volumeInfo.imageLinks?.thumbnail?.replace("http://", "https://"),
        preview_link: volumeInfo.previewLink,
        info_link: volumeInfo.infoLink,
        google_books_id: vol.id,
        // Default values for required fields
        wholesale_price: 0,
        rrp: 0,
        available_stock: 0,
        currency: territory === "GB" ? "GBP" : "USD",
      });
    }

    console.log(`Inserting ${booksToInsert.length} books...`);

    // Insert books in batches of 100
    const batchSize = 100;
    let totalInserted = 0;
    const errors = [];

    for (let i = 0; i < booksToInsert.length; i += batchSize) {
      const batch = booksToInsert.slice(i, i + batchSize);
      const { data: inserted, error: insertError } = await supabase.from("books").insert(batch).select();

      if (insertError) {
        console.error("Insert error:", insertError);
        errors.push(insertError);
      } else {
        totalInserted += inserted?.length || 0;
      }
    }

    // Update dataset metadata with final count
    await supabase
      .from("datasets")
      .update({
        last_synced_at: new Date().toISOString(),
        metadata: {
          query,
          maxResults,
          territory,
          importedAt: new Date().toISOString(),
          totalResults: volumes.length,
          imported: totalInserted,
          skipped: skippedBooks.length,
        },
      })
      .eq("id", dataset.id);

    console.log(`✅ Import complete: ${totalInserted} books imported (${FUNCTION_VERSION})`);

    return new Response(
      JSON.stringify({
        success: true,
        version: FUNCTION_VERSION,
        dataset_id: dataset.id,
        dataset_name: finalDatasetName,
        books_imported: totalInserted,
        books_skipped: skippedBooks.length,
        skipped_details: skippedBooks.slice(0, 10), // Return first 10 for review
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Import error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorDetails = error instanceof Error ? error.toString() : String(error);

    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: errorDetails,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});

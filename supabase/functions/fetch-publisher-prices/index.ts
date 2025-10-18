// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parseOnix, pickBestRRP } from "../_shared/onixParser.ts";

type Input = { isbns?: string[]; territory?: "GB" | "US" };

const BOWKER_API_KEY = Deno.env.get("BOWKER_API_KEY");
const GOOGLE_BOOKS_API_KEY = Deno.env.get("GOOGLE_BOOKS_API_KEY");
const ISBNDB_API_KEY = Deno.env.get("ISBNDB_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BOWKER_ENDPOINT = "https://api.bowker.com/book/v1/metadata?isbn=";

// Validate ISBN format
function isValidISBN(isbn: string): boolean {
  if (!isbn || typeof isbn !== 'string') return false;
  
  const cleaned = isbn.replace(/[-\s]/g, '');
  
  // Check if it's a valid ISBN-10 or ISBN-13
  if (cleaned.length === 10) {
    return /^[0-9]{9}[0-9X]$/i.test(cleaned);
  } else if (cleaned.length === 13) {
    return /^[0-9]{13}$/.test(cleaned);
  }
  
  return false;
}

// Helper function to convert ISBN-13 to ISBN-10
function isbn13ToIsbn10(isbn13: string): string | null {
  if (isbn13.length !== 13 || !isbn13.startsWith('978')) {
    return null;
  }
  
  const base = isbn13.substring(3, 12);
  let checksum = 0;
  for (let i = 0; i < 9; i++) {
    checksum += parseInt(base[i]) * (10 - i);
  }
  const check = (11 - (checksum % 11)) % 11;
  const checkDigit = check === 10 ? 'X' : check.toString();
  
  return base + checkDigit;
}

// Helper function to convert ISBN-10 to ISBN-13
function isbn10ToIsbn13(isbn10: string): string | null {
  if (isbn10.length !== 10) return null;
  
  const base = '978' + isbn10.substring(0, 9);
  let checksum = 0;
  for (let i = 0; i < 12; i++) {
    checksum += parseInt(base[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (checksum % 10)) % 10;
  
  return base + check.toString();
}

async function fetchGoogleBooksPrice(isbn13: string) {
  if (!GOOGLE_BOOKS_API_KEY) return null;
  try {
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn13}&key=${GOOGLE_BOOKS_API_KEY}`);
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.items || json.items.length === 0) return null;
    
    const item = json.items[0];
    const saleInfo = item.saleInfo;
    
    // Try retailPrice first, then listPrice
    const priceInfo = saleInfo?.retailPrice || saleInfo?.listPrice;
    if (!priceInfo) return null;
    
    return {
      isbn13,
      territory: priceInfo.currencyCode === "USD" ? "US" : "GB",
      price_amount: Number(priceInfo.amount),
      currency: priceInfo.currencyCode,
      price_type: "01", // RRP
      raw: item,
      source: "google_books",
    };
  } catch { return null; }
}

async function fetchGoogleBooksPriceByTitleAuthor(title: string, author: string) {
  if (!GOOGLE_BOOKS_API_KEY) return null;
  try {
    const query = `intitle:${encodeURIComponent(title)}+inauthor:${encodeURIComponent(author)}`;
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&key=${GOOGLE_BOOKS_API_KEY}`);
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.items || json.items.length === 0) return null;
    
    const item = json.items[0];
    const saleInfo = item.saleInfo;
    const priceInfo = saleInfo?.retailPrice || saleInfo?.listPrice;
    if (!priceInfo) return null;
    
    return {
      isbn13: item.volumeInfo?.industryIdentifiers?.find((id: any) => id.type === 'ISBN_13')?.identifier || '',
      territory: priceInfo.currencyCode === "USD" ? "US" : "GB",
      price_amount: Number(priceInfo.amount),
      currency: priceInfo.currencyCode,
      price_type: "01",
      raw: item,
      source: "google_books_title",
    };
  } catch { return null; }
}

async function fetchIsbndbPrice(isbn13: string) {
  if (!ISBNDB_API_KEY) return null;
  try {
    const res = await fetch(`https://api2.isbndb.com/book/${isbn13}`, {
      headers: { Authorization: ISBNDB_API_KEY },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const book = json.book;
    if (!book) return null;
    
    // ISBNdb provides msrp field
    const msrp = book.msrp ? parseFloat(book.msrp) : null;
    if (!msrp) return null;
    
    return {
      isbn13,
      territory: "US", // ISBNdb primarily US market
      price_amount: msrp,
      currency: "USD",
      price_type: "01", // RRP
      raw: book,
      source: "isbndb",
    };
  } catch { return null; }
}

async function fetchIsbndbPriceByTitleAuthor(title: string, author: string) {
  if (!ISBNDB_API_KEY) return null;
  try {
    const query = `${title} ${author}`.substring(0, 100);
    const res = await fetch(`https://api2.isbndb.com/books/${encodeURIComponent(query)}`, {
      headers: { Authorization: ISBNDB_API_KEY },
    });
    if (!res.ok) return null;
    const json = await res.json();
    
    if (json.books && json.books.length > 0) {
      const book = json.books[0];
      const msrp = book.msrp ? parseFloat(book.msrp) : null;
      if (!msrp) return null;
      
      return {
        isbn13: book.isbn13 || book.isbn || '',
        territory: "US",
        price_amount: msrp,
        currency: "USD",
        price_type: "01",
        raw: book,
        source: "isbndb_title",
      };
    }
  } catch { return null; }
  return null;
}

async function fetchBowkerPrice(isbn13: string) {
  if (!BOWKER_API_KEY) return null;
  try {
    const res = await fetch(`${BOWKER_ENDPOINT}${isbn13}`, {
      headers: { Authorization: `Bearer ${BOWKER_API_KEY}` },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const prices = (json?.prices ?? []) as any[];
    if (!prices.length) return null;
    const gb = prices.find(p => p.territory === "GB" && (p.priceType === "02" || p.priceType === "01"));
    const us = prices.find(p => p.territory === "US" && (p.priceType === "02" || p.priceType === "01"));
    const pick = gb ?? us ?? prices[0];
    return {
      isbn13,
      territory: pick.territory ?? "GB",
      price_amount: Number(pick.amount),
      currency: pick.currency ?? "GBP",
      price_type: pick.priceType ?? null,
      raw: json,
      source: "bowker",
    };
  } catch { return null; }
}

async function fetchOnixFallback() {
  try {
    const xml = await Deno.readTextFile("./supabase/functions/onix/sample.xml");
    return parseOnix(xml);
  } catch { return []; }
}

serve(async (req) => {
  // Use service role for system operations (inserting price logs, updating books)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    console.log('🚀 Starting fetch-publisher-prices function');
    const { isbns, territory }: Input = await req.json().catch(() => ({}));
    
    const invalidIsbns: Array<{ isbn: string; title: string }> = [];

    // collect target isbns: books missing publisher_rrp
    let targetBooks = [];
    if (isbns && isbns.length > 0) {
      console.log(`📚 Processing ${isbns.length} specific ISBNs`);
      const { data } = await supabase
        .from("books")
        .select("id, title, author, us_asin, uk_asin, publisher_rrp")
        .in(territory === 'US' ? 'us_asin' : 'uk_asin', isbns)
        .limit(50);
      targetBooks = data || [];
    } else {
      console.log('📚 Fetching books missing publisher_rrp...');
      const { data } = await supabase
        .from("books")
        .select("id, title, author, us_asin, uk_asin, publisher_rrp")
        .is("publisher_rrp", null)
        .limit(50);
      targetBooks = data || [];
    }
    
    console.log(`📖 Found ${targetBooks.length} books to process`);

    // Validate ISBNs
    for (const book of targetBooks) {
      const isbn = territory === 'US' ? book.us_asin : book.uk_asin;
      if (!isValidISBN(isbn)) {
        console.log(`⚠️ Invalid ISBN for "${book.title}": ${isbn}`);
        invalidIsbns.push({ isbn: isbn || 'missing', title: book.title });
      }
    }

    const logs: any[] = [];
    const updates: any[] = [];
    let processed = 0;
    let found = 0;

    for (const book of targetBooks) {
      const isbn13 = territory === 'US' ? book.us_asin : book.uk_asin;
      
      // Skip invalid ISBNs
      if (!isValidISBN(isbn13)) {
        console.log(`⏭️ Skipping "${book.title}" - invalid ISBN: ${isbn13}`);
        continue;
      }

      processed++;
      console.log(`\n🔍 [${processed}/${targetBooks.length}] Processing: "${book.title}" (ISBN: ${isbn13})`);

      let picked: any = null;

      // Try with ISBN variants
      const isbnVariants = [isbn13];
      if (isbn13.length === 13) {
        const isbn10 = isbn13ToIsbn10(isbn13);
        if (isbn10) isbnVariants.push(isbn10);
      } else if (isbn13.length === 10) {
        const isbn13Alt = isbn10ToIsbn13(isbn13);
        if (isbn13Alt) isbnVariants.push(isbn13Alt);
      }

      // Try each ISBN variant
      for (const isbn of isbnVariants) {
        if (picked) break;

        try {
          console.log(`  📗 Trying Google Books with ISBN: ${isbn}...`);
          picked = await fetchGoogleBooksPrice(isbn);
          if (picked) {
            console.log(`  ✅ Found via Google Books: ${picked.price_amount} ${picked.currency}`);
            break;
          }
        } catch (e) {
          console.error(`  ❌ Google Books error:`, e);
        }

        if (!picked) {
          try {
            console.log(`  📘 Trying ISBNdb with ISBN: ${isbn}...`);
            picked = await fetchIsbndbPrice(isbn);
            if (picked) {
              console.log(`  ✅ Found via ISBNdb: ${picked.price_amount} ${picked.currency}`);
              break;
            }
          } catch (e) {
            console.error(`  ❌ ISBNdb error:`, e);
          }
        }

        if (!picked) {
          try {
            console.log(`  📙 Trying Bowker with ISBN: ${isbn}...`);
            picked = await fetchBowkerPrice(isbn);
            if (picked) {
              console.log(`  ✅ Found via Bowker: ${picked.price_amount} ${picked.currency}`);
              break;
            }
          } catch (e) {
            console.error(`  ❌ Bowker error:`, e);
          }
        }

        if (!picked) {
          try {
            console.log(`  📕 Trying ONIX fallback with ISBN: ${isbn}...`);
            const onix = await fetchOnixFallback();
            const relevant = onix.filter(p => p.isbn13 === isbn);
            const best = pickBestRRP(relevant, { territory });
            if (best) {
              picked = {
                isbn13: isbn,
                territory: best.territory ?? (territory ?? "GB"),
                price_amount: best.priceAmount,
                currency: best.currencyCode ?? "GBP",
                price_type: best.priceType ?? null,
                raw: best,
                source: "onix",
              };
              console.log(`  ✅ Found via ONIX: ${picked.price_amount} ${picked.currency}`);
              break;
            }
          } catch (e) {
            console.error(`  ❌ ONIX error:`, e);
          }
        }
      }

      // Fallback: Try title + author search
      if (!picked && book.title && book.author) {
        console.log(`  🔎 Trying title + author search...`);
        
        try {
          picked = await fetchGoogleBooksPriceByTitleAuthor(book.title, book.author);
          if (picked) {
            console.log(`  ✅ Found via Google Books title search: ${picked.price_amount} ${picked.currency}`);
          }
        } catch (e) {
          console.error(`  ❌ Google Books title search error:`, e);
        }

        if (!picked) {
          try {
            picked = await fetchIsbndbPriceByTitleAuthor(book.title, book.author);
            if (picked) {
              console.log(`  ✅ Found via ISBNdb title search: ${picked.price_amount} ${picked.currency}`);
            }
          } catch (e) {
            console.error(`  ❌ ISBNdb title search error:`, e);
          }
        }
      }

      if (!picked) {
        console.log(`  ⚠️ No price found for "${book.title}" after all attempts`);
        continue;
      }
      
      found++;

      logs.push({
        isbn: isbn13,
        territory: picked.territory,
        price_amount: picked.price_amount,
        currency: picked.currency,
        price_type: picked.price_type,
        source: picked.source,
        raw: picked.raw,
      });

      updates.push({ isbn13, currency: picked.currency, publisher_rrp: picked.price_amount });
    }

    console.log(`💾 Saving ${logs.length} price logs and ${updates.length} book updates...`);
    
    if (logs.length) {
      try {
        await supabase.from("publisher_prices").insert(logs);
      } catch (e) {
        console.error('❌ Error inserting publisher_prices:', e);
      }
    }

    for (const u of updates) {
      try {
        await supabase
          .from("books")
          .update({ publisher_rrp: u.publisher_rrp, currency: u.currency })
          .or(`us_asin.eq.${u.isbn13},uk_asin.eq.${u.isbn13}`);
      } catch (e) {
        console.error(`❌ Error updating book ${u.isbn13}:`, e);
      }
    }

    const result = { 
      success: true,
      updated: updates.length, 
      attempted: targetBooks.length,
      found,
      processed,
      invalidIsbns: invalidIsbns.length > 0 ? invalidIsbns : undefined,
      message: `Successfully updated ${updates.length} of ${targetBooks.length} books with publisher pricing`
    };
    
    console.log('✨ Sync complete:', result);
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error('💥 Fatal error:', e);
    return new Response(JSON.stringify({ 
      success: false,
      error: String(e),
      message: 'Failed to sync publisher prices' 
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});

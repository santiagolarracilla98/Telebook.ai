import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to determine category based on title and author
function categorizeBook(title: string, author: string): string {
  const titleLower = title.toLowerCase();
  const authorLower = author.toLowerCase();
  
  // Children's Books
  if (titleLower.includes('children') || 
      titleLower.includes('kids') ||
      titleLower.includes('caterpillar') ||
      authorLower.includes('eric carle')) {
    return 'Children\'s Books';
  }
  
  // Manga/Comics
  if (titleLower.includes('manga') || 
      titleLower.includes('dragon ball') ||
      titleLower.includes('demon slayer') ||
      titleLower.includes('jujutsu kaisen') ||
      titleLower.includes('naruto') ||
      titleLower.includes('one piece') ||
      authorLower.includes('akira toriyama') ||
      authorLower.includes('gege akutami') ||
      authorLower.includes('koyoharu gotouge')) {
    return 'Manga & Comics';
  }
  
  // Self-Help & Psychology
  if (titleLower.includes('habits') ||
      titleLower.includes('psychology') ||
      titleLower.includes('attached') ||
      titleLower.includes('glucose') ||
      titleLower.includes('mindset') ||
      titleLower.includes('self-help') ||
      authorLower.includes('james clear') ||
      authorLower.includes('amir levine')) {
    return 'Self-Help';
  }
  
  // Business & Finance
  if (titleLower.includes('business') ||
      titleLower.includes('startup') ||
      titleLower.includes('money') ||
      titleLower.includes('finance') ||
      authorLower.includes('morgan housel')) {
    return 'Business';
  }
  
  // Romance
  if (titleLower.includes('romance') ||
      titleLower.includes('love') ||
      titleLower.includes('ranch') ||
      titleLower.includes('gold rush') ||
      authorLower.includes('colleen hoover') ||
      authorLower.includes('elsie silver')) {
    return 'Romance';
  }
  
  // Young Adult Fiction
  if (titleLower.includes('hunger games') ||
      titleLower.includes('city of ghosts') ||
      titleLower.includes('dragon force') ||
      authorLower.includes('suzanne collins') ||
      authorLower.includes('victoria schwab') ||
      authorLower.includes('katie tsang')) {
    return 'Young Adult';
  }
  
  // Science Fiction
  if (titleLower.includes('sci-fi') ||
      titleLower.includes('science fiction') ||
      titleLower.includes('hail mary') ||
      authorLower.includes('andy weir')) {
    return 'Science Fiction';
  }
  
  // Technology
  if (titleLower.includes('code') ||
      titleLower.includes('programming') ||
      titleLower.includes('software') ||
      authorLower.includes('robert c. martin')) {
    return 'Technology';
  }
  
  // Default to Fiction
  return 'Fiction';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Fetching all books to categorize...');
    
    // Get all books
    const { data: books, error: fetchError } = await supabaseClient
      .from('books')
      .select('id, title, author');

    if (fetchError) {
      console.error('Error fetching books:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${books?.length || 0} books`);

    let updated = 0;

    // Update each book with the correct category
    for (const book of books || []) {
      const category = categorizeBook(book.title, book.author);
      
      console.log(`Updating book "${book.title}" to category: ${category}`);

      // Add category column if it doesn't exist and update the book
      const { error: updateError } = await supabaseClient
        .from('books')
        .update({ category })
        .eq('id', book.id);

      if (updateError) {
        console.error(`Error updating book ${book.id}:`, updateError);
      } else {
        updated++;
      }
    }

    console.log(`Updated ${updated} books with categories`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        updated,
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

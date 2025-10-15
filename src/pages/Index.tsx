import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import FilterBar from "@/components/FilterBar";
import BookCard from "@/components/BookCard";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  uk_asin: string | null;
  us_asin: string | null;
  available_stock: number;
  rrp: number;
  wholesale_price: number;
  publisher: string;
  category: string;
  wholesalePrice: number;
  suggestedPrice: number;
  amazonPrice: number;
  roi: number;
  verified: boolean;
  imageUrl?: string;
}

const Index = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [marketplace, setMarketplace] = useState<'usa' | 'uk' | 'both'>('usa');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchBooks();
  }, []);

  useEffect(() => {
    filterBooks();
  }, [books, searchQuery]);

  const fetchBooks = async () => {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('title');

      if (error) throw error;

      // Transform database books and fetch cover images
      const transformedBooks = await Promise.all(
        data.map(async (book) => {
          let imageUrl = book.image_url;
          
          // If no image URL, try to fetch one
          if (!imageUrl) {
            try {
              const { data: coverData } = await supabase.functions.invoke('fetch-book-covers', {
                body: { 
                  isbn: book.uk_asin || book.us_asin,
                  asin: book.us_asin || book.uk_asin
                }
              });
              
              if (coverData?.imageUrl) {
                imageUrl = coverData.imageUrl;
                
                // Update the database with the found image URL
                await supabase
                  .from('books')
                  .update({ image_url: imageUrl })
                  .eq('id', book.id);
              }
            } catch (err) {
              console.error('Error fetching cover for book:', book.title, err);
            }
          }
          
          return {
            id: book.id,
            title: book.title,
            author: book.author,
            isbn: book.us_asin || book.uk_asin || '',
            uk_asin: book.uk_asin,
            us_asin: book.us_asin,
            available_stock: book.available_stock,
            rrp: book.rrp,
            wholesale_price: book.wholesale_price,
            publisher: 'Various',
            category: 'Books',
            wholesalePrice: book.wholesale_price,
            suggestedPrice: book.rrp * 0.85,
            amazonPrice: book.rrp,
            roi: Math.round(((book.rrp * 0.85 - book.wholesale_price) / book.wholesale_price) * 100),
            verified: true,
            imageUrl,
          };
        })
      );

      setBooks(transformedBooks);
      setFilteredBooks(transformedBooks);
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterBooks = () => {
    let filtered = [...books];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        book =>
          book.title.toLowerCase().includes(query) ||
          book.author.toLowerCase().includes(query) ||
          book.isbn.toLowerCase().includes(query)
      );
    }

    setFilteredBooks(filtered);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Hero />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" id="inventory">
        <FilterBar 
          onMarketplaceChange={(value) => setMarketplace(value as 'usa' | 'uk' | 'both')}
          onSearch={setSearchQuery}
        />
        
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Available Inventory</h2>
              <p className="text-muted-foreground mt-1">{filteredBooks.length} books available</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredBooks.map((book) => (
              <BookCard key={book.id} {...book} marketplace={marketplace} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;

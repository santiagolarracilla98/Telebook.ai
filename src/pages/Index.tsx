import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import FilterBar from "@/components/FilterBar";
import BookCard from "@/components/BookCard";
import { PricingEngineCalculator } from "@/components/PricingEngineCalculator";
import Suppliers from "@/components/Suppliers";
import GenreAnalytics from "@/components/GenreAnalytics";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { mockBooks } from "@/data/mockBooks";
import type { User } from "@supabase/supabase-js";

interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  uk_asin?: string | null;
  us_asin?: string | null;
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
  publisher_rrp?: number;
  amazon_price?: number;
  roi_target_price?: number;
  market_flag?: string;
  currency?: string;
}

const Index = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [marketplace, setMarketplace] = useState<'usa' | 'uk' | 'both'>('usa');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPublisher, setSelectedPublisher] = useState<string>('all');
  const [user, setUser] = useState<User | null>(null);
  
  // Temporary filter values (not yet applied)
  const [tempSearchQuery, setTempSearchQuery] = useState('');
  const [tempCategory, setTempCategory] = useState<string>('all');
  const [tempPublisher, setTempPublisher] = useState<string>('all');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    fetchBooks();
  }, []);

  useEffect(() => {
    filterBooks();
  }, [books, searchQuery, selectedCategory, selectedPublisher]);

  const applyFilters = () => {
    setSearchQuery(tempSearchQuery);
    setSelectedCategory(tempCategory);
    setSelectedPublisher(tempPublisher);
  };

  const fetchBooks = async () => {
    try {
      // Trigger book categorization
      await supabase.functions.invoke('categorize-books');
      
      // Fetch book covers from Amazon via Keepa API
      await supabase.functions.invoke('fetch-book-covers');
      
      // Fetch publisher prices (from APIs or mock)
      console.log('Fetching publisher prices...');
      await supabase.functions.invoke('fetch-publisher-prices');
      
      // Fetch Amazon prices (from Keepa or calculated)
      console.log('Fetching Amazon prices...');
      await supabase.functions.invoke('fetch-amazon-prices');
      
      // Calculate unit economics
      console.log('Calculating unit economics...');
      await supabase.functions.invoke('calc-unit-econ', {
        body: { roiTarget: 0.20 }
      });

      // Fetch books from active datasets only
      const { data: booksData, error: booksError } = await supabase
        .from('books')
        .select(`
          *,
          dataset:datasets!inner(
            id,
            name,
            is_active
          )
        `)
        .eq('dataset.is_active', true)
        .order('title');

      if (booksError) throw booksError;

      // Transform database books to match BookCard interface
      const transformedBooks: Book[] = (booksData || []).map(book => {
        const publisherPrice = book.publisher_rrp || book.wholesale_price;
        const amazonPrice = book.amazon_price || book.rrp;
        const targetPrice = book.roi_target_price || (publisherPrice * 1.2);
        const margin = amazonPrice - (amazonPrice * 0.15) - publisherPrice;
        const calculatedRoi = publisherPrice > 0 ? Math.round((margin / publisherPrice) * 100) : 0;
        
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
          category: book.category || 'Fiction',
          wholesalePrice: book.wholesale_price,
          suggestedPrice: targetPrice,
          amazonPrice: amazonPrice,
          roi: calculatedRoi,
          verified: true,
          imageUrl: book.image_url || undefined,
          publisher_rrp: book.publisher_rrp,
          amazon_price: book.amazon_price,
          roi_target_price: book.roi_target_price,
          market_flag: book.market_flag,
          currency: book.currency,
        };
      });

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

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        book =>
          book.title.toLowerCase().includes(query) ||
          book.author.toLowerCase().includes(query) ||
          book.isbn.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (selectedCategory && selectedCategory !== 'all') {
      filtered = filtered.filter(
        book => book.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Filter by publisher
    if (selectedPublisher && selectedPublisher !== 'all') {
      filtered = filtered.filter(
        book => book.publisher.toLowerCase().includes(selectedPublisher.toLowerCase())
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
      <PricingEngineCalculator />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" id="inventory">
        <FilterBar 
          onMarketplaceChange={(value) => setMarketplace(value as 'usa' | 'uk' | 'both')}
          onSearch={setTempSearchQuery}
          onCategoryChange={setTempCategory}
          onPublisherChange={setTempPublisher}
          onApplyFilters={applyFilters}
          filteredBooks={filteredBooks.length}
        />

        {user && <GenreAnalytics />}
        
        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                Available Inventory
              </h2>
              <p className="text-muted-foreground mt-1">
                {filteredBooks.length} books available
                {!user && (
                  <>
                    {' • '}
                    <a href="/auth" className="text-primary hover:underline">
                      Sign in for advanced analytics
                    </a>
                  </>
                )}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredBooks.map((book) => (
              <BookCard key={book.id} {...book} marketplace={marketplace} />
            ))}
          </div>
        </div>
        
        <Suppliers />
      </main>
    </div>
  );
};

export default Index;

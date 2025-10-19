import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import FilterBar from "@/components/FilterBar";
import BookCard from "@/components/BookCard";
import { ROICalculator } from "@/components/ROICalculator";
import Suppliers from "@/components/Suppliers";
import { ChatWidget } from "@/components/ChatWidget";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  dataset_id?: string;
  exclude_books_without_price?: boolean;
}

const Index = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [marketplace, setMarketplace] = useState<'usa' | 'uk' | 'both'>('both');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPublisher, setSelectedPublisher] = useState<string>('all');
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const booksPerPage = 15;
  
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
    
    // Listen for chat search events
    const handleChatSearch = (event: CustomEvent) => {
      const { title } = event.detail;
      setTempSearchQuery(title);
      setSearchQuery(title);
    };
    
    window.addEventListener('chatSearchBook', handleChatSearch as EventListener);
    
    return () => {
      window.removeEventListener('chatSearchBook', handleChatSearch as EventListener);
    };
  }, []);

  useEffect(() => {
    filterBooks();
    setCurrentPage(1); // Reset to page 1 when filters change
  }, [books, searchQuery, selectedCategory, selectedPublisher, marketplace]);

  const applyFilters = () => {
    setSearchQuery(tempSearchQuery);
    setSelectedCategory(tempCategory);
    setSelectedPublisher(tempPublisher);
  };

  const fetchBooks = async () => {
    try {
      // Fetch books from active datasets only
      const { data: booksData, error: booksError } = await supabase
        .from('books')
        .select(`
          *,
          dataset:datasets!inner(
            id,
            name,
            is_active,
            exclude_books_without_price
          )
        `)
        .eq('dataset.is_active', true)
        .order('title');

      if (booksError) throw booksError;

      // Transform database books to match BookCard interface
      const transformedBooks: Book[] = (booksData || []).map(book => {
        const publisherPrice = book.wholesale_price || book.publisher_rrp;
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
          last_price_check: book.last_price_check,
          dataset_id: book.dataset_id,
          exclude_books_without_price: book.dataset?.exclude_books_without_price,
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

    // Filter out books without price information ONLY if their dataset has the exclude flag enabled
    filtered = filtered.filter(book => {
      // If the dataset has exclude_books_without_price enabled, check for prices
      if (book.exclude_books_without_price) {
        const hasWholesalePrice = book.wholesale_price && book.wholesale_price > 0;
        const hasPublisherPrice = book.publisher_rrp && book.publisher_rrp > 0;
        const hasAmazonPrice = book.amazon_price && book.amazon_price > 0;
        const hasRRP = book.rrp && book.rrp > 0;
        
        // Book must have at least wholesale/publisher price AND (amazon price OR rrp)
        return (hasWholesalePrice || hasPublisherPrice) && (hasAmazonPrice || hasRRP);
      }
      // If the dataset doesn't have the exclude flag, show all books
      return true;
    });

    // Filter by marketplace (only when not showing "both")
    if (marketplace !== 'both') {
      filtered = filtered.filter(book => {
        if (marketplace === 'usa') {
          // Show if has US ASIN, or if no market flag specified (will try to fetch)
          return book.us_asin || book.market_flag === 'US' || !book.market_flag;
        } else if (marketplace === 'uk') {
          // Show if has UK ASIN, or if no market flag specified (will try to fetch)
          return book.uk_asin || book.market_flag === 'UK' || !book.market_flag;
        }
        return true;
      });
    }
    // When marketplace is 'both', show all books

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

    // Note: No longer filtering by cost data - we'll fetch Amazon prices live when needed
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
      <div id="pricing-engine">
        <ROICalculator />
      </div>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" id="inventory">
        <FilterBar 
          marketplace={marketplace}
          onMarketplaceChange={(value) => setMarketplace(value as 'usa' | 'uk' | 'both')}
          onSearch={setTempSearchQuery}
          onCategoryChange={setTempCategory}
          onPublisherChange={setTempPublisher}
          onApplyFilters={applyFilters}
          filteredBooks={filteredBooks.length}
        />
        
        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                Available Inventory
              </h2>
              <p className="text-muted-foreground mt-1">
                {filteredBooks.length > 0 && (
                  <>
                    Showing {((currentPage - 1) * booksPerPage) + 1}-{Math.min(currentPage * booksPerPage, filteredBooks.length)} of {filteredBooks.length} books
                  </>
                )}
                {filteredBooks.length === 0 && "No books available"}
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
            {filteredBooks
              .slice((currentPage - 1) * booksPerPage, currentPage * booksPerPage)
              .map((book) => (
                <BookCard key={book.id} {...book} marketplace={marketplace} />
              ))}
          </div>

          {filteredBooks.length > booksPerPage && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              
              {(() => {
                const totalPages = Math.ceil(filteredBooks.length / booksPerPage);
                const maxVisiblePages = 5;
                let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                
                if (endPage - startPage + 1 < maxVisiblePages) {
                  startPage = Math.max(1, endPage - maxVisiblePages + 1);
                }
                
                const pages = [];
                
                for (let i = startPage; i <= endPage; i++) {
                  pages.push(
                    <Button
                      key={i}
                      variant={currentPage === i ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(i)}
                    >
                      {i}
                    </Button>
                  );
                }
                
                if (endPage < totalPages) {
                  pages.push(
                    <Button
                      key="more"
                      variant="outline"
                      size="sm"
                      disabled
                    >
                      ...
                    </Button>
                  );
                }
                
                return pages;
              })()}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredBooks.length / booksPerPage), prev + 1))}
                disabled={currentPage === Math.ceil(filteredBooks.length / booksPerPage)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
        
        <Suppliers />
      </main>
      
      <ChatWidget mode="public" />
    </div>
  );
};

export default Index;

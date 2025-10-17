import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BookOpen, LogOut } from "lucide-react";
import { toast } from "sonner";
import Hero from "@/components/Hero";
import FilterBar from "@/components/FilterBar";
import BookCard from "@/components/BookCard";
import { CartButton } from "@/components/Cart";

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

const ClientDashboard = () => {
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedPublisher, setSelectedPublisher] = useState<string>("");
  const [marketplace, setMarketplace] = useState<'usa' | 'uk' | 'both'>('usa');
  const [currentPage, setCurrentPage] = useState(1);
  const booksPerPage = 15;

  useEffect(() => {
    checkAuth();
    fetchBooks();
    calculatePricing();
  }, []);

  const calculatePricing = async () => {
    try {
      await supabase.functions.invoke('calc-unit-econ', {
        body: { roiTarget: 0.25 }
      });
      // Refetch books after calculation to show updated smart prices
      await fetchBooks();
    } catch (error) {
      console.error('Failed to calculate pricing:', error);
    }
  };

  useEffect(() => {
    filterBooks();
    setCurrentPage(1); // Reset to page 1 when filters change
  }, [books, searchQuery, selectedCategory, selectedPublisher, marketplace]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
    }
  };

  const fetchBooks = async () => {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('title');

      if (error) throw error;
      
      // Transform database books to match BookCard interface
      const transformedBooks = (data || []).map(book => {
        const cost = book.publisher_rrp || book.wholesale_price || 0;
        const amazonPrice = book.amazon_price || book.rrp || 0;
        const targetPrice = book.roi_target_price || (cost > 0 ? cost * 1.25 : 0);
        const amazonFee = book.amazon_fee || (amazonPrice * 0.15);
        
        // Calculate net ROI after Amazon fees
        const netProfit = amazonPrice - amazonFee - cost;
        const netRoi = cost > 0 ? Math.round((netProfit / cost) * 100) : 0;
        
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
          publisher: book.publisher || 'Various',
          category: book.category || 'Fiction',
          wholesalePrice: cost,
          suggestedPrice: targetPrice,
          amazonPrice: amazonPrice,
          roi: netRoi,
          verified: true,
          imageUrl: book.image_url || undefined,
          publisher_rrp: book.publisher_rrp,
          amazon_price: book.amazon_price,
          amazon_fee: book.amazon_fee,
          roi_target_price: book.roi_target_price,
          market_flag: book.market_flag,
          currency: book.currency,
          last_price_check: book.last_price_check,
        };
      });
      
      setBooks(transformedBooks);
    } catch (error: any) {
      toast.error("Failed to fetch books");
    } finally {
      setLoading(false);
    }
  };

  const filterBooks = () => {
    let filtered = [...books];

    if (searchQuery) {
      filtered = filtered.filter(book =>
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory && selectedCategory !== 'all') {
      filtered = filtered.filter(book => 
        book.category?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    if (selectedPublisher && selectedPublisher !== 'all') {
      filtered = filtered.filter(book =>
        book.publisher?.toLowerCase().includes(selectedPublisher.toLowerCase())
      );
    }

    // Filter by marketplace
    if (marketplace === 'usa') {
      filtered = filtered.filter(book => book.us_asin || book.currency === 'USD');
    } else if (marketplace === 'uk') {
      filtered = filtered.filter(book => book.uk_asin || book.currency === 'GBP');
    }

    setFilteredBooks(filtered);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate('/');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="bg-card border-b border-border sticky top-0 z-50 backdrop-blur-sm bg-card/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">Telebook</span>
            </div>
            <div className="flex items-center gap-2">
              <CartButton />
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <Hero />
      
      <div id="inventory" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <FilterBar
        onMarketplaceChange={(value) => setMarketplace(value as 'usa' | 'uk' | 'both')}
        onSearch={setSearchQuery}
        onCategoryChange={setSelectedCategory}
        onPublisherChange={setSelectedPublisher}
        filteredBooks={filteredBooks.length}
      />

        {filteredBooks.length > 0 && (
          <div className="mt-6 text-sm text-muted-foreground">
            Showing {((currentPage - 1) * booksPerPage) + 1}-{Math.min(currentPage * booksPerPage, filteredBooks.length)} of {filteredBooks.length} books
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
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
            
            {Array.from({ length: Math.ceil(filteredBooks.length / booksPerPage) }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            ))}
            
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
    </div>
  );
};

export default ClientDashboard;

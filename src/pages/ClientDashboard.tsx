import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BookOpen, LogOut } from "lucide-react";
import { toast } from "sonner";
import Hero from "@/components/Hero";
import FilterBar from "@/components/FilterBar";
import BookCard from "@/components/BookCard";

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

  useEffect(() => {
    checkAuth();
    fetchBooks();
  }, []);

  useEffect(() => {
    filterBooks();
  }, [books, searchQuery, selectedCategory, selectedPublisher]);

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

    if (selectedCategory) {
      filtered = filtered.filter(book => book.category === selectedCategory);
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
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
          {filteredBooks.map((book) => (
            <BookCard key={book.id} {...book} marketplace={marketplace} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;

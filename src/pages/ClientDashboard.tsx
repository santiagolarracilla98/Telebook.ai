import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { BookOpen, LogOut } from "lucide-react";
import { toast } from "sonner";
import Hero from "@/components/Hero";
import FilterBar from "@/components/FilterBar";

interface Book {
  id: string;
  title: string;
  author: string;
  rrp: number;
  wholesale_price: number;
  available_stock: number;
  category: string;
  image_url: string | null;
  uk_asin: string | null;
  us_asin: string | null;
}

const ClientDashboard = () => {
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedPublisher, setSelectedPublisher] = useState<string>("");
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

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
      navigate('/client-auth');
    }
  };

  const fetchBooks = async () => {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('title');

      if (error) throw error;
      setBooks(data || []);
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

  const handleBookClick = (book: Book) => {
    setSelectedBook(book);
    setShowDetailsDialog(true);
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
        onSearch={setSearchQuery}
        onCategoryChange={setSelectedCategory}
        onPublisherChange={setSelectedPublisher}
        filteredBooks={filteredBooks.length}
      />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
          {filteredBooks.map((book) => (
            <div 
              key={book.id} 
              className="group hover:shadow-xl transition-all duration-300 border border-border rounded-lg overflow-hidden cursor-pointer"
              onClick={() => handleBookClick(book)}
            >
              <div className="relative h-48 bg-muted overflow-hidden">
                {book.image_url ? (
                  <img src={book.image_url} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="flex items-center justify-center h-full bg-gradient-to-br from-primary/10 to-secondary/10">
                    <span className="text-4xl font-bold text-muted-foreground/30">📚</span>
                  </div>
                )}
              </div>
              
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-foreground line-clamp-2 mb-1">{book.title}</h3>
                  <p className="text-sm text-muted-foreground">{book.author}</p>
                </div>
                
                <div className="flex gap-2 flex-wrap">
                  <span className="text-xs px-2 py-1 bg-secondary/20 rounded-full">{book.category}</span>
                </div>
                
                <div className="pt-2 border-t border-border space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">RRP</span>
                    <span className="font-semibold text-foreground">£{book.rrp.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Stock</span>
                    <span className="font-medium text-foreground">{book.available_stock}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedBook && (
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
            <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card p-6 rounded-lg shadow-lg border">
              <h2 className="text-2xl font-bold mb-4">{selectedBook.title}</h2>
              <p className="text-muted-foreground mb-4">by {selectedBook.author}</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Category</h4>
                  <p className="text-base">{selectedBook.category}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">RRP</h4>
                  <p className="text-base font-bold">£{selectedBook.rrp.toFixed(2)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Wholesale Price</h4>
                  <p className="text-base">£{selectedBook.wholesale_price.toFixed(2)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Available Stock</h4>
                  <p className="text-base">{selectedBook.available_stock}</p>
                </div>
              </div>
              
              <div className="mt-6">
                <Button onClick={() => setShowDetailsDialog(false)}>Close</Button>
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};

export default ClientDashboard;

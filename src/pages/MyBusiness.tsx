import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ArrowLeft, Heart, Trash2, Eye, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/contexts/CartContext";
import BookDetailsDialog from "@/components/BookDetailsDialog";
import type { Book } from "@/data/mockBooks";

interface WishlistItem {
  id: string;
  book_id: string;
  created_at: string;
  books: {
    id: string;
    title: string;
    author: string;
    image_url: string | null;
    rrp: number | null;
    wholesale_price: number | null;
    category: string | null;
    publisher: string | null;
    amazon_price: number | null;
    roi_target_price: number | null;
    market_flag: string | null;
    available_stock: number | null;
    published_date: string | null;
    page_count: number | null;
    description: string | null;
    publisher_rrp: number | null;
    amazon_fee: number | null;
    uk_asin: string | null;
    us_asin: string | null;
  };
}

const MyBusiness = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addItem } = useCart();
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fetchingPrices, setFetchingPrices] = useState(false);

  useEffect(() => {
    const initializeData = async () => {
      await checkAuth();
      await fetchWishlist();
      await fetchAmazonPrices();
    };
    initializeData();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
    }
  };

  const fetchWishlist = async () => {
    try {
      const { data, error } = await supabase
        .from('wishlist')
        .select(`
          id,
          book_id,
          created_at,
          books (
            id,
            title,
            author,
            image_url,
            rrp,
            wholesale_price,
            category,
            publisher,
            amazon_price,
            roi_target_price,
            market_flag,
            available_stock,
            published_date,
            page_count,
            description,
            publisher_rrp,
            amazon_fee,
            uk_asin,
            us_asin
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWishlist(data || []);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      toast({
        title: "Error",
        description: "Failed to load wishlist",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAmazonPrices = async () => {
    try {
      setFetchingPrices(true);
      
      const { data, error } = await supabase.functions.invoke('fetch-amazon-prices');
      
      if (error) throw error;

      // Reload wishlist to get updated prices
      const { data: updatedWishlist, error: refetchError } = await supabase
        .from('wishlist')
        .select(`
          id,
          book_id,
          created_at,
          books (
            id,
            title,
            author,
            image_url,
            rrp,
            wholesale_price,
            category,
            publisher,
            amazon_price,
            roi_target_price,
            market_flag,
            available_stock,
            published_date,
            page_count,
            description,
            publisher_rrp,
            amazon_fee,
            uk_asin,
            us_asin
          )
        `)
        .order('created_at', { ascending: false });

      if (!refetchError) {
        setWishlist(updatedWishlist || []);
      }

      if (data?.processed > 0) {
        toast({
          title: "Prices Updated",
          description: `Updated Amazon prices for ${data.processed} books`,
        });
      }
    } catch (error) {
      console.error('Error fetching Amazon prices:', error);
      // Silent fail - don't interrupt user experience with price fetch errors
    } finally {
      setFetchingPrices(false);
    }
  };

  const removeFromWishlist = async (wishlistId: string) => {
    try {
      const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('id', wishlistId);

      if (error) throw error;

      setWishlist(wishlist.filter(item => item.id !== wishlistId));
      toast({
        title: "Success",
        description: "Removed from wishlist",
      });
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      toast({
        title: "Error",
        description: "Failed to remove from wishlist",
        variant: "destructive",
      });
    }
  };

  const handleViewDetails = (item: WishlistItem) => {
    // Use RRP as fallback for Amazon price if not available
    const amazonPrice = item.books.amazon_price || item.books.rrp || 0;
    
    const bookData: Book = {
      id: item.books.id,
      title: item.books.title,
      author: item.books.author,
      isbn: item.books.us_asin || item.books.uk_asin || item.book_id,
      uk_asin: item.books.uk_asin,
      us_asin: item.books.us_asin,
      publisher: item.books.publisher || 'Unknown',
      category: item.books.category || 'Uncategorized',
      wholesalePrice: item.books.wholesale_price || 0,
      suggestedPrice: item.books.rrp || 0,
      amazonPrice: amazonPrice,
      roi: 0,
      verified: false,
      imageUrl: item.books.image_url || undefined,
      publisher_rrp: item.books.publisher_rrp || undefined,
      roi_target_price: item.books.roi_target_price || undefined,
      market_flag: item.books.market_flag || undefined,
      available_stock: item.books.available_stock || 0,
      description: item.books.description || undefined,
      amazon_fee: item.books.amazon_fee || undefined,
      rrp: item.books.rrp || 0,
      wholesale_price: item.books.wholesale_price || 0,
      amazon_price: amazonPrice,
    };
    setSelectedBook(bookData);
    setDialogOpen(true);
  };

  const handleAddToCart = (item: WishlistItem) => {
    addItem({
      id: item.books.id,
      title: item.books.title,
      author: item.books.author,
      imageUrl: item.books.image_url || undefined,
      price: item.books.roi_target_price || item.books.amazon_price || item.books.rrp || 0,
      isbn: item.book_id,
    });
    toast({
      title: "Added to cart",
      description: `${item.books.title} has been added to your cart`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-card border-b border-border sticky top-0 z-50 backdrop-blur-sm bg-card/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Button variant="ghost" onClick={() => navigate('/')} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Main
            </Button>
            <h1 className="text-xl font-bold">My Business</h1>
            <div className="w-24" /> {/* Spacer for centering */}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5" />
              My Wishlist
            </CardTitle>
            <CardDescription>
              Books you're interested in for your business
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading wishlist...</p>
            ) : fetchingPrices ? (
              <p className="text-muted-foreground">Updating prices...</p>
            ) : wishlist.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Your wishlist is empty</p>
                <Button onClick={() => navigate('/')} className="mt-4">
                  Browse Books
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {wishlist.map((item) => (
                  <Card key={item.id} className="overflow-hidden flex flex-col">
                    <CardHeader className="p-0">
                      <div className="aspect-[2/3] relative bg-muted">
                        {item.books.image_url ? (
                          <img
                            src={item.books.image_url}
                            alt={item.books.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                            <span className="text-2xl text-muted-foreground/30">📚</span>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    
                    <CardContent className="p-3 flex-grow">
                      <h3 className="font-semibold text-sm line-clamp-2 mb-1">{item.books.title}</h3>
                      <p className="text-xs text-muted-foreground mb-2">{item.books.author}</p>
                      
                      <div className="space-y-1 text-xs">
                        {item.books.wholesale_price && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Cost:</span>
                            <span className="font-medium">${item.books.wholesale_price.toFixed(2)}</span>
                          </div>
                        )}
                        {item.books.roi_target_price && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Smart Price:</span>
                            <span className="font-semibold text-primary">${item.books.roi_target_price.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    
                    <CardFooter className="p-3 pt-0 flex flex-col gap-2">
                      <div className="flex gap-2 w-full">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(item)}
                          className="flex-1"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Details
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAddToCart(item)}
                          className="flex-1"
                        >
                          <ShoppingCart className="w-3 h-3 mr-1" />
                          Add
                        </Button>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeFromWishlist(item.id)}
                        className="w-full gap-2"
                      >
                        <Trash2 className="w-3 h-3" />
                        Remove
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {selectedBook && (
        <BookDetailsDialog
          book={selectedBook}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          marketplace="usa"
        />
      )}
    </div>
  );
};

export default MyBusiness;

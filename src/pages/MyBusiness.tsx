import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Heart, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WishlistItem {
  id: string;
  book_id: string;
  created_at: string;
  books: {
    title: string;
    author: string;
    image_url: string | null;
    rrp: number | null;
    wholesale_price: number | null;
    category: string | null;
  };
}

const MyBusiness = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    fetchWishlist();
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
            title,
            author,
            image_url,
            rrp,
            wholesale_price,
            category
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
            ) : wishlist.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Your wishlist is empty</p>
                <Button onClick={() => navigate('/')} className="mt-4">
                  Browse Books
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {wishlist.map((item) => (
                  <Card key={item.id} className="overflow-hidden">
                    <div className="aspect-[3/4] relative">
                      {item.books.image_url ? (
                        <img
                          src={item.books.image_url}
                          alt={item.books.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <span className="text-muted-foreground">No image</span>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold line-clamp-2 mb-1">{item.books.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{item.books.author}</p>
                      {item.books.category && (
                        <p className="text-xs text-muted-foreground mb-2">{item.books.category}</p>
                      )}
                      <div className="flex justify-between items-center mb-3">
                        {item.books.rrp && (
                          <span className="text-sm font-medium">RRP: ${item.books.rrp.toFixed(2)}</span>
                        )}
                        {item.books.wholesale_price && (
                          <span className="text-sm text-muted-foreground">
                            Wholesale: ${item.books.wholesale_price.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeFromWishlist(item.id)}
                        className="w-full gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default MyBusiness;

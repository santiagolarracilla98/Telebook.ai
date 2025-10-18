import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Eye, ShoppingCart, Heart } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import BookDetailsDialog from "./BookDetailsDialog";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import type { Book } from "@/data/mockBooks";

interface BookCardProps extends Book {
  marketplace?: 'usa' | 'uk' | 'both';
}

const BookCard = ({ marketplace = 'usa', ...book }: BookCardProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loginAlertOpen, setLoginAlertOpen] = useState(false);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [wishlistId, setWishlistId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { addItem } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkWishlistStatus();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkWishlistStatus();
    });

    return () => subscription.unsubscribe();
  }, [book.id]);

  const checkWishlistStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsLoggedIn(!!session);
    
    if (session) {
      const { data } = await supabase
        .from('wishlist')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('book_id', book.id)
        .maybeSingle();
      
      if (data) {
        setIsInWishlist(true);
        setWishlistId(data.id);
      } else {
        setIsInWishlist(false);
        setWishlistId(null);
      }
    }
  };

  const handleWishlistClick = async () => {
    if (!isLoggedIn) {
      setLoginAlertOpen(true);
      return;
    }

    try {
      if (isInWishlist && wishlistId) {
        // Remove from wishlist
        const { error } = await supabase
          .from('wishlist')
          .delete()
          .eq('id', wishlistId);

        if (error) throw error;

        setIsInWishlist(false);
        setWishlistId(null);
        toast({
          title: "Removed from wishlist",
          description: `${book.title} has been removed from your wishlist`,
        });
      } else {
        // Add to wishlist
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data, error } = await supabase
          .from('wishlist')
          .insert({
            user_id: session.user.id,
            book_id: book.id,
          })
          .select('id')
          .single();

        if (error) throw error;

        setIsInWishlist(true);
        setWishlistId(data.id);
        toast({
          title: "Added to wishlist",
          description: `${book.title} has been added to your wishlist`,
        });
      }
    } catch (error) {
      console.error('Error updating wishlist:', error);
      toast({
        title: "Error",
        description: "Failed to update wishlist",
        variant: "destructive",
      });
    }
  };

  const {
    title,
    author,
    isbn,
    publisher,
    category,
    wholesalePrice,
    suggestedPrice,
    amazonPrice,
    roi,
    verified,
    imageUrl,
    publisher_rrp,
    roi_target_price,
    market_flag,
  } = book;

  const getMarketBadge = () => {
    if (!market_flag) return null;
    
    const badges = {
      below_market: { label: 'Below Market', variant: 'destructive' as const },
      at_market: { label: 'At Market', variant: 'secondary' as const },
      above_market: { label: 'Above Market', variant: 'default' as const },
    };
    
    const badge = badges[market_flag as keyof typeof badges];
    return badge ? (
      <Badge variant={badge.variant} className="text-xs">
        {badge.label}
      </Badge>
    ) : null;
  };
  return (
    <>
      <Card className="group hover:shadow-xl transition-all duration-300 border-border overflow-hidden">
        <CardHeader className="p-0">
          <div className="relative h-48 bg-muted overflow-hidden">
            {imageUrl ? (
              <img src={imageUrl} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            ) : (
              <div className="flex items-center justify-center h-full bg-gradient-to-br from-primary/10 to-secondary/10">
                <span className="text-4xl font-bold text-muted-foreground/30">📚</span>
              </div>
            )}
            
            {/* Wishlist Heart Icon */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 left-3 h-8 w-8 bg-background/80 hover:bg-background/90 backdrop-blur-sm"
              onClick={handleWishlistClick}
            >
              <Heart
                className={`h-4 w-4 transition-colors ${
                  isInWishlist
                    ? "fill-red-500 text-red-500"
                    : "text-muted-foreground hover:text-red-500"
                }`}
              />
            </Button>
            
            {verified && (
              <Badge className="absolute top-3 right-3 bg-success text-success-foreground gap-1">
                <ShieldCheck className="w-3 h-3" />
                Verified
              </Badge>
            )}
          </div>
        </CardHeader>
      
      <CardContent className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-foreground line-clamp-2 mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground">{author}</p>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">{category}</Badge>
          <Badge variant="outline" className="text-xs">{publisher}</Badge>
          {getMarketBadge()}
        </div>
        
        <div className="pt-2 border-t border-border space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Cost</span>
            <span className="font-semibold text-foreground">
              {wholesalePrice > 0 ? `$${wholesalePrice.toFixed(2)}` : 'NA'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Amazon Price (Ref)</span>
            <span className="font-medium text-foreground">
              {amazonPrice > 0 ? `$${amazonPrice.toFixed(2)}` : 'NA'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Smart Price (25% ROI)</span>
            <span className="font-semibold text-primary">
              {roi_target_price && roi_target_price > 0 ? `$${roi_target_price.toFixed(2)}` : 'Calculating...'}
            </span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0 flex gap-2">
        <Button 
          variant="outline" 
          className="flex-1 group/btn"
          onClick={() => setDialogOpen(true)}
        >
          <Eye className="w-4 h-4 mr-2" />
          Details
        </Button>
        <Button 
          className="flex-1"
          onClick={() => addItem({
            id: book.id,
            title: book.title,
            author: book.author,
            imageUrl: book.imageUrl,
            price: book.roi_target_price || book.amazonPrice || 0,
            isbn: book.isbn,
          })}
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          Add to Cart
        </Button>
      </CardFooter>
      
      <BookDetailsDialog 
        book={book}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        marketplace={marketplace}
      />
    </Card>

    <AlertDialog open={loginAlertOpen} onOpenChange={setLoginAlertOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Login Required</AlertDialogTitle>
          <AlertDialogDescription>
            Please log in or sign up to add books to your wishlist.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => navigate('/auth')}>
            Go to Login
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
};

export default BookCard;

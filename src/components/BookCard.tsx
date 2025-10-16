import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, TrendingUp, Eye } from "lucide-react";
import BookDetailsDialog from "./BookDetailsDialog";
import type { Book } from "@/data/mockBooks";

interface BookCardProps extends Book {
  marketplace?: 'usa' | 'uk' | 'both';
}

const BookCard = ({ marketplace = 'usa', ...book }: BookCardProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);

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
          {publisher_rrp && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Publisher RRP</span>
              <span className="font-medium text-foreground">${publisher_rrp.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Wholesale</span>
            <span className="font-semibold text-foreground">${wholesalePrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Amazon Price</span>
            <span className="font-medium text-foreground">${amazonPrice.toFixed(2)}</span>
          </div>
          {roi_target_price && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Target (20% ROI)</span>
              <span className="font-semibold text-primary">${roi_target_price.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-2 border-t border-border">
            <span className="text-sm font-medium flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-success" />
              ROI
            </span>
            <span className={`font-bold ${roi > 30 ? 'text-success' : roi > 15 ? 'text-warning' : 'text-muted-foreground'}`}>
              {roi}%
            </span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0">
        <Button 
          variant="outline" 
          className="w-full group/btn"
          onClick={() => setDialogOpen(true)}
        >
          <Eye className="w-4 h-4 mr-2" />
          View Details
        </Button>
      </CardFooter>
      
      <BookDetailsDialog 
        book={book}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        marketplace={marketplace}
      />
    </Card>
  );
};

export default BookCard;

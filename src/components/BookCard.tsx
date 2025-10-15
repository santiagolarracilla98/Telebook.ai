import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, TrendingUp, Eye } from "lucide-react";

interface BookCardProps {
  title: string;
  author: string;
  isbn: string;
  publisher: string;
  category: string;
  wholesalePrice: number;
  suggestedPrice: number;
  amazonPrice: number;
  roi: number;
  verified: boolean;
  imageUrl?: string;
}

const BookCard = ({
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
}: BookCardProps) => {
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
        </div>
        
        <div className="pt-2 border-t border-border space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Wholesale</span>
            <span className="font-semibold text-foreground">${wholesalePrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Amazon Price</span>
            <span className="font-medium text-foreground">${amazonPrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Smart Price</span>
            <span className="font-semibold text-primary">${suggestedPrice.toFixed(2)}</span>
          </div>
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
        <Button variant="outline" className="w-full group/btn">
          <Eye className="w-4 h-4 mr-2" />
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
};

export default BookCard;

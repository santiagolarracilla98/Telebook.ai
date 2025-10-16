import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";

interface SimilarBookCardProps {
  title: string;
  author: string;
  roi: number;
  suggestedPrice: number;
  imageUrl?: string;
  market_flag?: string;
  onClick: () => void;
}

const SimilarBookCard = ({
  title,
  author,
  roi,
  suggestedPrice,
  imageUrl,
  market_flag,
  onClick,
}: SimilarBookCardProps) => {
  const getMarketBadgeColor = (flag?: string) => {
    switch (flag) {
      case 'hot': return 'bg-success text-success-foreground';
      case 'warm': return 'bg-warning text-warning-foreground';
      case 'cold': return 'bg-muted text-muted-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex gap-3">
          {imageUrl && (
            <img
              src={imageUrl}
              alt={title}
              className="w-16 h-20 object-cover rounded"
            />
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm line-clamp-2 mb-1">
              {title}
            </h4>
            <p className="text-xs text-muted-foreground mb-2 truncate">
              by {author}
            </p>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-success" />
                <span className="text-sm font-semibold text-success">
                  {roi}%
                </span>
              </div>
              <span className="text-sm font-semibold">
                ${suggestedPrice.toFixed(2)}
              </span>
            </div>
            {market_flag && (
              <Badge 
                className={`mt-2 text-xs ${getMarketBadgeColor(market_flag)}`}
                variant="secondary"
              >
                {market_flag}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SimilarBookCard;

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, DollarSign, Tag, Award, Clock } from "lucide-react";
import { SensitivityAnalysis } from "./SensitivityAnalysis";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface ROIResultsProps {
  result: {
    bookTitle: string;
    bookAuthor: string;
    bookId?: string;
    bookIsbn?: string;
    bookImageUrl?: string;
    ourAcquisitionCost: string;
    potentialROI: string;
    smartPrice: string;
    amazonReferencePrice: string;
    priceRange: string;
    pricingEdge: string;
    volumeDiscount: string;
    estimatedNetProfit: string;
    amazonFee: string;
    fulfillmentMethod: string;
    quantity: number;
    priceSource?: string;
    livePriceFetchedAt?: Date;
    marketplace?: 'usa' | 'uk';
    currency?: string;
    marketCompetitiveness?: string;
  };
}

export const ROIResults = ({ result }: ROIResultsProps) => {
  const roiValue = parseFloat(result.potentialROI);
  const roiColor = roiValue > 40 ? "text-green-600" : roiValue > 25 ? "text-blue-600" : "text-yellow-600";
  const { addItem } = useCart();
  const currency = result.currency || '$';
  const marketLabel = result.marketplace === 'uk' ? '🇬🇧 UK' : '🇺🇸 US';

  // Format price source badge
  const getPriceSourceBadge = () => {
    if (!result.priceSource) return null;
    
    if (result.priceSource === 'live') {
      return (
        <Badge variant="default" className="bg-success/20 text-success border-success/30">
          <Clock className="w-3 h-3 mr-1" />
          Live - just now
        </Badge>
      );
    } else if (result.priceSource === 'cached' && result.livePriceFetchedAt) {
      const age = formatDistanceToNow(new Date(result.livePriceFetchedAt), { addSuffix: true });
      return (
        <Badge variant="outline" className="border-warning/50 text-warning">
          <Clock className="w-3 h-3 mr-1" />
          Cached - {age}
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary">
          Reference - from database
        </Badge>
      );
    }
  };

  const handleAddToCart = () => {
    if (!result.bookId) {
      toast.error("Unable to add book to cart. Missing book information.");
      return;
    }

    addItem({
      id: result.bookId,
      title: result.bookTitle,
      author: result.bookAuthor,
      isbn: result.bookIsbn || result.bookId, // Use book ID as fallback if ISBN is missing
      price: parseFloat(result.smartPrice),
      imageUrl: result.bookImageUrl,
    });
  };

  return (
    <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-2 border-primary/30 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{result.bookTitle}</CardTitle>
              <p className="text-muted-foreground mt-1">by {result.bookAuthor}</p>
            </div>
            <Badge variant="outline" className="text-sm">
              {result.fulfillmentMethod}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left Column - Financial Metrics */}
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">Your Final Acquisition Cost (Per Unit)</span>
                </div>
                <p className="text-3xl font-bold">{currency}{result.ourAcquisitionCost}</p>
                <p className="text-xs text-muted-foreground mt-1">Market: {marketLabel}</p>
              </div>

              <div className={`p-4 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200`}>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                  <span className="text-sm font-medium text-green-900">Maximum Potential ROI</span>
                </div>
                <p className={`text-5xl font-bold ${roiColor}`}>{result.potentialROI}%</p>
                <p className="text-sm text-green-700 mt-2">
                  Net Profit: {currency}{result.estimatedNetProfit} per unit
                </p>
              </div>

              <div className="p-4 rounded-lg bg-muted">
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">Smart Selling Price ({marketLabel})</span>
                </div>
                <p className="text-2xl font-bold">{currency}{result.smartPrice}</p>
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-sm text-muted-foreground">
                    Amazon Reference RRP: {currency}{result.amazonReferencePrice}
                  </p>
                  {getPriceSourceBadge()}
                </div>
              </div>
            </div>

            {/* Right Column - Competitive Analysis */}
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">Pricing Edge Analysis</span>
                </div>
                <Badge 
                  className="text-lg px-4 py-1" 
                  variant={result.pricingEdge === "Major Edge" ? "default" : "secondary"}
                >
                  {result.pricingEdge}
                </Badge>
              </div>

              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-muted-foreground">Volume Discount Unlocked</span>
                </div>
                <p className="text-3xl font-bold text-primary">{result.volumeDiscount}%</p>
                <p className="text-sm text-muted-foreground mt-1">
                  On {result.quantity} units
                </p>
              </div>

              <div className="p-4 rounded-lg bg-muted space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amazon Fee ({result.fulfillmentMethod})</span>
                  <span className="font-medium">{currency}{result.amazonFee}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Acquisition Cost</span>
                  <span className="font-medium">{currency}{result.ourAcquisitionCost}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Smart Selling Price</span>
                  <span className="font-medium">{currency}{result.smartPrice}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span>Net Profit per Unit</span>
                  <span className="text-green-600">{currency}{result.estimatedNetProfit}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t">
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 rounded-lg text-center space-y-4">
              <p className="text-lg font-semibold">
                Your {result.potentialROI}% ROI is Ready! This title has the margin you've been looking for.
              </p>
              <Button size="lg" className="text-lg px-8 h-12" onClick={handleAddToCart}>
                Secure Your Price & Place Your Order Now
              </Button>
              <p className="text-sm text-muted-foreground">
                Our pricing is highly competitive and updated daily—lock in your margin before the market shifts.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <SensitivityAnalysis result={result} />
    </div>
  );
};

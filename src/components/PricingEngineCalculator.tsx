import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Calculator, TrendingUp, Info } from "lucide-react";
import { toast } from "sonner";
import { ROIResults } from "./ROIResults";
import { ROIExplanationDialog } from "./ROIExplanationDialog";
import { useAmazonPrice } from "@/hooks/useAmazonPrice";

interface PrefilledBook {
  title: string;
  author: string;
  isbn: string;
  cost: number;
  smartPrice: number;
  amazonPrice: number;
  id?: string;
  imageUrl?: string;
}

interface PricingEngineCalculatorProps {
  prefilledBook?: PrefilledBook;
  marketplace?: 'usa' | 'uk';
  currency?: string;
}

export const PricingEngineCalculator = ({ 
  prefilledBook, 
  marketplace = 'usa',
  currency = '$'
}: PricingEngineCalculatorProps) => {
  const [bookInput, setBookInput] = useState(prefilledBook?.title || "");
  const [fulfillmentMethod, setFulfillmentMethod] = useState<"FBA" | "FBM">("FBA");
  const [quantity, setQuantity] = useState(100);
  const [currentCost, setCurrentCost] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);
  const { fetchLivePrice } = useAmazonPrice();
  
  // Helper function to calculate smart price with minimum ROI guarantee
  const calculateSmartPrice = (acquisitionCost: number, fulfillment: "FBA" | "FBM", market: 'usa' | 'uk' = 'usa') => {
    const minROITarget = 0.20; // 20% minimum ROI
    const feePercentage = fulfillment === "FBA" ? 0.15 : 0.08;
    const fixedFee = fulfillment === "FBA" ? (market === 'uk' ? 2 : 3) : 0;
    
    // Formula: Price = (Cost × (1 + Target ROI) + Fixed Fee) / (1 - Fee %)
    return (acquisitionCost * (1 + minROITarget) + fixedFee) / (1 - feePercentage);
  };
  
  const [calculationResult, setCalculationResult] = useState<any>(
    prefilledBook ? (() => {
      // Always calculate fresh - ignore outdated database roi_target_price
      const smartPrice = calculateSmartPrice(prefilledBook.cost, "FBA", marketplace);
      const fixedFee = marketplace === 'uk' ? 2 : 3;
      const amazonFee = smartPrice * 0.15 + fixedFee;
      const netProfit = smartPrice - amazonFee - prefilledBook.cost;
      const roi = (netProfit / prefilledBook.cost) * 100;
      
      // Determine competitiveness based on comparison to Amazon
      let marketCompetitiveness: string;
      if (smartPrice <= prefilledBook.amazonPrice * 0.95) {
        marketCompetitiveness = "Highly Competitive - Below Amazon";
      } else if (smartPrice <= prefilledBook.amazonPrice) {
        marketCompetitiveness = "Competitive - At Amazon Price";
      } else if (smartPrice <= prefilledBook.amazonPrice * 1.10) {
        marketCompetitiveness = "Competitive - Slightly Above Amazon";
      } else {
        marketCompetitiveness = "Above Market";
      }
      
      return {
        bookTitle: prefilledBook.title,
        bookAuthor: prefilledBook.author,
        bookId: prefilledBook.id,
        bookIsbn: prefilledBook.isbn,
        bookImageUrl: prefilledBook.imageUrl,
        ourAcquisitionCost: prefilledBook.cost.toFixed(2),
        potentialROI: roi.toFixed(1),
        smartPrice: smartPrice.toFixed(2),
        amazonReferencePrice: prefilledBook.amazonPrice.toFixed(2),
        priceRange: `${currency}${(smartPrice * 0.95).toFixed(2)} - ${currency}${(smartPrice * 1.05).toFixed(2)}`,
        pricingEdge: "Competitive",
        volumeDiscount: "15",
        estimatedNetProfit: netProfit.toFixed(2),
        amazonFee: amazonFee.toFixed(2),
        fulfillmentMethod: "FBA",
        quantity: 100,
        marketCompetitiveness,
        marketplace,
        currency
      };
    })() : null
  );
  const [showExplanation, setShowExplanation] = useState(false);

  const getVolumeDiscount = (qty: number): number => {
    if (qty >= 500) return 0.25;
    if (qty >= 250) return 0.20;
    if (qty >= 100) return 0.15;
    if (qty >= 50) return 0.10;
    return 0.05;
  };

  const calculateROI = async () => {
    if (!bookInput.trim()) {
      toast.error("Please enter a book title or ASIN");
      return;
    }

    setIsCalculating(true);

    try {
      const { data: books, error } = await supabase
        .from("books")
        .select("*")
        .or(`title.ilike.%${bookInput}%,uk_asin.eq.${bookInput},us_asin.eq.${bookInput}`)
        .limit(1);

      if (error) throw error;

      if (!books || books.length === 0) {
        toast.error("Book not found in our catalog. Try a different title or ASIN.");
        setIsCalculating(false);
        return;
      }

      const book = books[0];

      // Fetch live Amazon price for selected marketplace
      let livePriceData = null;
      let priceSource = 'database';
      try {
        livePriceData = await fetchLivePrice(book.title, book.author, marketplace);
        if (livePriceData.price && livePriceData.price > 0) {
          priceSource = livePriceData.source;
          
          // Save the fetched price to database for future use
          const { error: updateError } = await supabase
            .from('books')
            .update({ 
              amazon_price: livePriceData.price,
              last_price_check: new Date().toISOString()
            })
            .eq('id', book.id);
          
          if (updateError) {
            console.error('Failed to save Amazon price:', updateError);
          } else {
            console.log(`✅ Saved Amazon price $${livePriceData.price} for "${book.title}"`);
          }
        }
      } catch (err) {
        console.log('Live price fetch failed, using database price');
      }

      const volumeDiscount = getVolumeDiscount(quantity);
      const ourAcquisitionCost = book.wholesale_price || book.publisher_rrp || 0;
      
      // Calculate smart price that ensures minimum 20% ROI (market-aware)
      const calculatedSmartPrice = calculateSmartPrice(ourAcquisitionCost, fulfillmentMethod, marketplace);
      
      // Market-aware pricing: Use live Amazon price if available, otherwise fallback
      const amazonPrice = (livePriceData?.price && livePriceData.price > 0) 
        ? livePriceData.price 
        : (book.amazon_price || book.rrp || calculatedSmartPrice);
      
      // Always use calculatedSmartPrice to ensure 20% ROI minimum
      // Determine competitiveness based on comparison to Amazon
      const smartPrice = calculatedSmartPrice;
      let marketCompetitiveness: string;
      
      if (calculatedSmartPrice <= amazonPrice * 0.95) {
        marketCompetitiveness = "Highly Competitive - Below Amazon";
      } else if (calculatedSmartPrice <= amazonPrice) {
        marketCompetitiveness = "Competitive - At Amazon Price";
      } else if (calculatedSmartPrice <= amazonPrice * 1.10) {
        marketCompetitiveness = "Competitive - Slightly Above Amazon";
      } else {
        marketCompetitiveness = "Above Market";
      }
      
      const amazonReferencePrice = book.amazon_price || book.rrp || smartPrice;
      const fixedFee = marketplace === 'uk' ? 2 : 3;
      const amazonFee = fulfillmentMethod === "FBA" 
        ? smartPrice * 0.15 + fixedFee
        : smartPrice * 0.08;
      const estimatedNetProfit = smartPrice - amazonFee - ourAcquisitionCost;
      const potentialROI = (estimatedNetProfit / ourAcquisitionCost) * 100;
      const userCost = parseFloat(currentCost) || ourAcquisitionCost * 1.3;
      const pricingEdge = userCost > ourAcquisitionCost * 1.2 
        ? "Major Edge" 
        : userCost > ourAcquisitionCost * 1.1 
        ? "Competitive" 
        : "Market Rate";

      const result = {
        bookTitle: book.title,
        bookAuthor: book.author,
        bookId: book.id,
        bookIsbn: book.us_asin || book.uk_asin || '',
        bookImageUrl: book.image_url,
        ourAcquisitionCost: ourAcquisitionCost.toFixed(2),
        potentialROI: potentialROI.toFixed(1),
        smartPrice: smartPrice.toFixed(2),
        amazonReferencePrice: amazonReferencePrice.toFixed(2),
        priceRange: `${currency}${(smartPrice * 0.95).toFixed(2)} - ${currency}${(smartPrice * 1.05).toFixed(2)}`,
        pricingEdge,
        volumeDiscount: (volumeDiscount * 100).toFixed(0),
        estimatedNetProfit: estimatedNetProfit.toFixed(2),
        amazonFee: amazonFee.toFixed(2),
        fulfillmentMethod,
        quantity,
        marketCompetitiveness,
        priceSource,
        livePriceFetchedAt: livePriceData?.fetchedAt,
        marketplace,
        currency
      };
      
      setCalculationResult(result);
      toast.success("ROI Calculated Successfully", {
        description: `Your potential ROI is ${potentialROI.toFixed(1)}%`,
      });

    } catch (error) {
      console.error("Calculation error:", error);
      toast.error("Error calculating ROI. Please try again.");
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <Card className="shadow-lg border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-6 w-6 text-primary" />
                Calculate Your Profit Potential
              </CardTitle>
              <CardDescription className="mt-2">
                {prefilledBook ? "Book data pre-filled - adjust settings and calculate" : "Enter book details to calculate profit"}
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setShowExplanation(true)}>
              <Info className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="bookInput">Book Title or ASIN *</Label>
              <Input
                id="bookInput"
                placeholder="Enter title or ASIN"
                value={bookInput}
                onChange={(e) => setBookInput(e.target.value)}
                className="text-base"
                disabled={!!prefilledBook}
              />
            </div>

            <div className="space-y-2">
              <Label>Fulfillment Method *</Label>
              <div className="flex gap-4 p-3 bg-muted rounded-md">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="fulfillment"
                    checked={fulfillmentMethod === "FBA"}
                    onChange={() => setFulfillmentMethod("FBA")}
                    className="w-4 h-4"
                  />
                  <span className="font-medium">FBA (Amazon)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="fulfillment"
                    checked={fulfillmentMethod === "FBM"}
                    onChange={() => setFulfillmentMethod("FBM")}
                    className="w-4 h-4"
                  />
                  <span className="font-medium">FBM (Merchant)</span>
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">
              Target Purchase Quantity: {quantity} units
            </Label>
            <div className="relative">
              <Slider
                id="quantity"
                min={10}
                max={1000}
                step={10}
                value={[quantity]}
                onValueChange={(value) => setQuantity(value[0])}
                className="py-4"
              />
              <div className="absolute top-[calc(50%+2px)] left-0 right-0 flex justify-between px-0.5 pointer-events-none">
                <div className="w-0.5 h-2 bg-muted-foreground/40" />
                <div className="w-0.5 h-2 bg-muted-foreground/40" />
                <div className="w-0.5 h-2 bg-muted-foreground/40" />
              </div>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>10 units</span>
              <span>500 units</span>
              <span>1000 units</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentCost">Current Supplier Acquisition Cost (Optional)</Label>
            <Input
              id="currentCost"
              type="number"
              placeholder="What is your current cost price?"
              value={currentCost}
              onChange={(e) => setCurrentCost(e.target.value)}
              className="text-base"
            />
            <p className="text-sm text-muted-foreground">
              Enter your current cost to see how much you could save
            </p>
          </div>

          <Button 
            onClick={calculateROI} 
            disabled={isCalculating}
            className="w-full text-lg h-12"
            size="lg"
          >
            {isCalculating ? (
              "Calculating..."
            ) : (
              <>
                <TrendingUp className="mr-2 h-5 w-5" />
                Calculate Maximum ROI
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {calculationResult && <ROIResults result={calculationResult} />}
      
      <ROIExplanationDialog 
        open={showExplanation} 
        onOpenChange={setShowExplanation}
      />
    </div>
  );
};
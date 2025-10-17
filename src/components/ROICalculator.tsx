import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Calculator, TrendingUp, Info } from "lucide-react";
import { toast } from "sonner";
import { ROIResults } from "./ROIResults";
import { ROIExplanationDialog } from "./ROIExplanationDialog";
import { ROIPaywall } from "./ROIPaywall";

export const ROICalculator = () => {
  const [bookInput, setBookInput] = useState("");
  const [fulfillmentMethod, setFulfillmentMethod] = useState<"FBA" | "FBM">("FBA");
  const [quantity, setQuantity] = useState(100);
  const [currentCost, setCurrentCost] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationResult, setCalculationResult] = useState<any>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [calculationCount, setCalculationCount] = useState<number>(() => {
    const stored = localStorage.getItem('roi_calculation_count');
    return stored ? parseInt(stored, 10) : 0;
  });
  const [showPaywall, setShowPaywall] = useState(false);

  const getVolumeDiscount = (qty: number): number => {
    if (qty >= 500) return 0.25; // 25% discount
    if (qty >= 250) return 0.20; // 20% discount
    if (qty >= 100) return 0.15; // 15% discount
    if (qty >= 50) return 0.10; // 10% discount
    return 0.05; // 5% base discount
  };

  const calculateROI = async () => {
    if (!bookInput.trim()) {
      toast.error("Please enter a book title or ASIN");
      return;
    }

    setIsCalculating(true);

    try {
      // Search for the book in database
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

      // Calculate costs and ROI using actual database pricing
      const volumeDiscount = getVolumeDiscount(quantity);
      // Use wholesale_price directly as final acquisition cost (already includes discounts)
      const ourAcquisitionCost = book.wholesale_price || book.publisher_rrp || 0;
      
      // Use roi_target_price as the smart/optimal selling price
      const smartPrice = book.roi_target_price || book.amazon_price || book.rrp || 0;
      const amazonReferencePrice = book.rrp || smartPrice;
      
      // FBA fees are typically 15% + $3, FBM fees are ~8%
      const amazonFee = fulfillmentMethod === "FBA" 
        ? smartPrice * 0.15 + 3
        : smartPrice * 0.08;
      
      const estimatedNetProfit = smartPrice - amazonFee - ourAcquisitionCost;
      const potentialROI = (estimatedNetProfit / ourAcquisitionCost) * 100;

      // Competitive analysis
      const userCost = parseFloat(currentCost) || ourAcquisitionCost * 1.3;
      const pricingEdge = userCost > ourAcquisitionCost * 1.2 
        ? "Major Edge" 
        : userCost > ourAcquisitionCost * 1.1 
        ? "Competitive" 
        : "Market Rate";

      const result = {
        bookTitle: book.title,
        bookAuthor: book.author,
        ourAcquisitionCost: ourAcquisitionCost.toFixed(2),
        potentialROI: potentialROI.toFixed(1),
        smartPrice: smartPrice.toFixed(2),
        amazonReferencePrice: amazonReferencePrice.toFixed(2),
        priceRange: `$${(smartPrice * 0.95).toFixed(2)} - $${(smartPrice * 1.05).toFixed(2)}`,
        pricingEdge,
        volumeDiscount: (volumeDiscount * 100).toFixed(0),
        estimatedNetProfit: estimatedNetProfit.toFixed(2),
        amazonFee: amazonFee.toFixed(2),
        fulfillmentMethod,
        quantity
      };
      
      setCalculationResult(result);
      
      // Increment calculation count
      const newCount = calculationCount + 1;
      setCalculationCount(newCount);
      localStorage.setItem('roi_calculation_count', newCount.toString());
      
      // Show paywall if limit exceeded
      if (newCount > 4) {
        setShowPaywall(true);
      }
      
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
    <div className="w-full max-w-6xl mx-auto py-12 px-4">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold mb-3 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          The ROI Calculator: Find Your Next Star Book
        </h2>
        <p className="text-lg text-muted-foreground">
          Leverage our proprietary pricing to instantly discover your maximum profit potential
        </p>
      </div>

      <Card className="shadow-lg border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-6 w-6 text-primary" />
                Calculate Your Profit Potential
              </CardTitle>
              <CardDescription className="mt-2">
                Enter book details to calculate your profit potential
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
            <Slider
              id="quantity"
              min={10}
              max={1000}
              step={10}
              value={[quantity]}
              onValueChange={(value) => setQuantity(value[0])}
              className="py-4"
            />
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

      {showPaywall && calculationResult ? (
        <ROIPaywall lastROI={calculationResult.potentialROI} />
      ) : (
        calculationResult && <ROIResults result={calculationResult} />
      )}
      
      <ROIExplanationDialog 
        open={showExplanation} 
        onOpenChange={setShowExplanation}
      />
    </div>
  );
};

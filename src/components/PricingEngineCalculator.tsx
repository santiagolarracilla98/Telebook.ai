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

interface PrefilledBook {
  title: string;
  author: string;
  isbn: string;
  cost: number;
  smartPrice: number;
  amazonPrice: number;
}

interface PricingEngineCalculatorProps {
  prefilledBook?: PrefilledBook;
}

export const PricingEngineCalculator = ({ prefilledBook }: PricingEngineCalculatorProps) => {
  const [bookInput, setBookInput] = useState(prefilledBook?.title || "");
  const [fulfillmentMethod, setFulfillmentMethod] = useState<"FBA" | "FBM">("FBA");
  const [quantity, setQuantity] = useState(100);
  const [currentCost, setCurrentCost] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);
  
  // Helper function to calculate smart price with minimum ROI guarantee
  const calculateSmartPrice = (acquisitionCost: number, fulfillment: "FBA" | "FBM") => {
    const minROITarget = 0.20; // 20% minimum ROI
    const feePercentage = fulfillment === "FBA" ? 0.15 : 0.08;
    const fixedFee = fulfillment === "FBA" ? 3 : 0;
    
    // Formula: Price = (Cost × (1 + Target ROI) + Fixed Fee) / (1 - Fee %)
    return (acquisitionCost * (1 + minROITarget) + fixedFee) / (1 - feePercentage);
  };
  
  const [calculationResult, setCalculationResult] = useState<any>(
    prefilledBook ? (() => {
      const smartPrice = Math.max(
        calculateSmartPrice(prefilledBook.cost, "FBA"),
        prefilledBook.smartPrice
      );
      const amazonFee = smartPrice * 0.15 + 3;
      const netProfit = smartPrice - amazonFee - prefilledBook.cost;
      const roi = (netProfit / prefilledBook.cost) * 100;
      
      return {
        bookTitle: prefilledBook.title,
        bookAuthor: prefilledBook.author,
        ourAcquisitionCost: prefilledBook.cost.toFixed(2),
        potentialROI: roi.toFixed(1),
        smartPrice: smartPrice.toFixed(2),
        amazonReferencePrice: prefilledBook.amazonPrice.toFixed(2),
        priceRange: `$${(smartPrice * 0.95).toFixed(2)} - $${(smartPrice * 1.05).toFixed(2)}`,
        pricingEdge: "Competitive",
        volumeDiscount: "15",
        estimatedNetProfit: netProfit.toFixed(2),
        amazonFee: amazonFee.toFixed(2),
        fulfillmentMethod: "FBA",
        quantity: 100
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
      const volumeDiscount = getVolumeDiscount(quantity);
      const ourAcquisitionCost = book.wholesale_price || book.publisher_rrp || 0;
      
      // Calculate smart price that ensures minimum 20% ROI
      const minROITarget = 0.20; // 20% minimum ROI
      const feePercentage = fulfillmentMethod === "FBA" ? 0.15 : 0.08;
      const fixedFee = fulfillmentMethod === "FBA" ? 3 : 0;
      
      // Formula: Price = (Cost × (1 + Target ROI) + Fixed Fee) / (1 - Fee %)
      const calculatedSmartPrice = (ourAcquisitionCost * (1 + minROITarget) + fixedFee) / (1 - feePercentage);
      
      // Market-aware pricing: Balance profitability with competitiveness
      const amazonPrice = book.amazon_price || calculatedSmartPrice;
      let smartPrice: number;
      let marketCompetitiveness: string;
      
      if (calculatedSmartPrice <= amazonPrice * 0.95) {
        // We can price at 95% of Amazon and still hit target ROI - highly competitive
        smartPrice = amazonPrice * 0.95;
        marketCompetitiveness = "Highly Competitive";
      } else if (calculatedSmartPrice <= amazonPrice * 1.05) {
        // Close to Amazon price - still competitive
        smartPrice = Math.min(calculatedSmartPrice, amazonPrice);
        marketCompetitiveness = "Competitive";
      } else {
        // Our minimum viable price is above Amazon's - flag as above market
        smartPrice = calculatedSmartPrice;
        marketCompetitiveness = "Above Market";
      }
      
      const amazonReferencePrice = book.rrp || book.amazon_price || smartPrice;
      const amazonFee = fulfillmentMethod === "FBA" 
        ? smartPrice * 0.15 + 3
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
        quantity,
        marketCompetitiveness
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

      {calculationResult && <ROIResults result={calculationResult} />}
      
      <ROIExplanationDialog 
        open={showExplanation} 
        onOpenChange={setShowExplanation}
      />
    </div>
  );
};
import { useState, useEffect } from "react";
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
import { ROIPaywall } from "./ROIPaywall";
import { useAmazonPrice } from "@/hooks/useAmazonPrice";
import type { User } from "@supabase/supabase-js";

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
  const [user, setUser] = useState<User | null>(null);
  const { fetchLivePrice } = useAmazonPrice();

  // Check authentication status
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

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

      // Fetch live Amazon price
      let livePriceData = null;
      let priceSource = 'database';
      try {
        livePriceData = await fetchLivePrice(book.title, book.author, 'usa');
        if (livePriceData.price && livePriceData.price > 0) {
          priceSource = livePriceData.source;
        }
      } catch (err) {
        console.log('Live price fetch failed, using database price');
      }

      // Calculate costs and ROI using actual database pricing
      const volumeDiscount = getVolumeDiscount(quantity);
      // Use wholesale_price directly as final acquisition cost (already includes discounts)
      const ourAcquisitionCost = book.wholesale_price || book.publisher_rrp || 0;
      
      // Calculate smart price that ensures minimum 20% ROI
      const minROITarget = 0.20; // 20% minimum ROI
      const feePercentage = fulfillmentMethod === "FBA" ? 0.15 : 0.08;
      const fixedFee = fulfillmentMethod === "FBA" ? 3 : 0;
      
      // Formula: Price = (Cost × (1 + Target ROI) + Fixed Fee) / (1 - Fee %)
      const calculatedSmartPrice = (ourAcquisitionCost * (1 + minROITarget) + fixedFee) / (1 - feePercentage);
      
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
      
      const amazonReferencePrice = book.rrp || book.amazon_price || smartPrice;
      
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
        bookId: book.id,
        bookIsbn: book.us_asin || book.uk_asin || '',
        bookImageUrl: book.image_url,
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
        marketCompetitiveness,
        priceSource,
        livePriceFetchedAt: livePriceData?.fetchedAt
      };
      
      setCalculationResult(result);
      
      // Only apply calculation limits to non-authenticated users
      if (!user) {
        // Increment calculation count for non-logged-in users
        const newCount = calculationCount + 1;
        setCalculationCount(newCount);
        localStorage.setItem('roi_calculation_count', newCount.toString());
        
        // Show paywall if limit exceeded (only for non-authenticated users)
        if (newCount > 4) {
          setShowPaywall(true);
        }
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
    <div className="w-full max-w-6xl mx-auto py-24 px-4">
      <div className="text-center mb-12 animate-fade-in-up">
        <h2 className="font-headline text-4xl md:text-5xl font-bold mb-4 tracking-tight">
          <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Unlock Your True Profit Potential: The Telebook ROI Calculator
          </span>
        </h2>
        <p className="font-body text-sm text-muted-foreground/70 mb-4">
          (Your First Analysis is Free)
        </p>
        <p className="font-body text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
          Stop guessing. Start earning. Get an instant, precise net profit breakdown for any book ASIN and uncover high-margin inventory others miss. Your first analysis is always free!
        </p>
      </div>

      <Card className="shadow-2xl border-2 border-border/30 bg-gradient-to-br from-card to-card/50 rounded-2xl overflow-hidden">
        <CardHeader className="pb-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-headline text-2xl font-bold flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-primary to-primary-glow rounded-xl shadow-lg shadow-primary/20">
                  <Calculator className="h-7 w-7 text-white" />
                </div>
                Calculate Your Profit Potential
              </CardTitle>
              <CardDescription className="mt-3 font-body text-base">
                Enter book details to calculate your profit potential
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setShowExplanation(true)} className="hover:bg-primary/10 hover:text-primary">
              <Info className="h-6 w-6" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-8 p-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <Label htmlFor="bookInput" className="font-body text-base font-semibold">Book Title or ASIN *</Label>
              <Input
                id="bookInput"
                placeholder="Enter title or ASIN"
                value={bookInput}
                onChange={(e) => setBookInput(e.target.value)}
                className="text-base h-12 border-2 border-border/30 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all rounded-xl"
              />
            </div>

            <div className="space-y-3">
              <Label className="font-body text-base font-semibold">Fulfillment Method *</Label>
              <div className="flex gap-4 p-4 bg-muted/50 rounded-xl border-2 border-border/20">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="fulfillment"
                    checked={fulfillmentMethod === "FBA"}
                    onChange={() => setFulfillmentMethod("FBA")}
                    className="w-5 h-5 accent-primary"
                  />
                  <span className="font-body font-semibold group-hover:text-primary transition-colors">FBA (Amazon)</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="fulfillment"
                    checked={fulfillmentMethod === "FBM"}
                    onChange={() => setFulfillmentMethod("FBM")}
                    className="w-5 h-5 accent-primary"
                  />
                  <span className="font-body font-semibold group-hover:text-primary transition-colors">FBM (Merchant)</span>
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

          <div className="space-y-3">
            <Label htmlFor="currentCost" className="font-body text-base font-semibold">Current Supplier Acquisition Cost (Optional)</Label>
            <Input
              id="currentCost"
              type="number"
              placeholder="What is your current cost price?"
              value={currentCost}
              onChange={(e) => setCurrentCost(e.target.value)}
              className="text-base h-12 border-2 border-border/30 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all rounded-xl"
            />
            <p className="font-body text-sm text-muted-foreground">
              Enter your current cost to see how much you could save
            </p>
          </div>

          <Button 
            onClick={calculateROI} 
            disabled={isCalculating}
            className="w-full text-lg h-14 font-bold text-base shadow-2xl hover:shadow-primary/40 disabled:opacity-50"
            size="lg"
          >
            {isCalculating ? (
              "Calculating..."
            ) : (
              <>
                <TrendingUp className="mr-2 h-6 w-6" />
                Calculate Maximum ROI
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {showPaywall && calculationResult && !user ? (
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

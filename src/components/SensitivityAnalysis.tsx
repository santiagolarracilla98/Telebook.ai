import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SensitivityAnalysisProps {
  result: {
    ourAcquisitionCost: string;
    smartPrice: string;
    amazonReferencePrice: string;
    amazonFee: string;
    fulfillmentMethod: string;
  };
}

export const SensitivityAnalysis = ({ result }: SensitivityAnalysisProps) => {
  const acquisitionCost = parseFloat(result.ourAcquisitionCost);
  const initialPrice = parseFloat(result.smartPrice);
  const amazonPrice = parseFloat(result.amazonReferencePrice);
  
  // Handle missing Amazon price data
  const hasAmazonPrice = amazonPrice > 0;
  const maxAllowedPrice = hasAmazonPrice 
    ? amazonPrice * 1.3  // 30% above Amazon price
    : initialPrice * 1.5; // 50% above smart price if no Amazon data
  
  // Calculate break-even price (where net profit = 0)
  const breakEvenPrice = result.fulfillmentMethod === "FBA"
    ? (acquisitionCost + 3) / 0.85  // (cost + fixed fee) / (1 - 15%)
    : acquisitionCost / 0.92;        // cost / (1 - 8%)
  
  const [simulatedPrice, setSimulatedPrice] = useState(initialPrice);
  const [lastPrice, setLastPrice] = useState(initialPrice);
  const isAboveAmazon = hasAmazonPrice && simulatedPrice > amazonPrice;
  const isBelowBreakEven = simulatedPrice < breakEvenPrice;
  
  // Sticky behavior at Amazon price point and break-even point
  const handlePriceChange = (value: number[]) => {
    const newPrice = value[0];
    const threshold = 0.5; // Sticky zone threshold
    
    // Sticky at Amazon price point (only if we have Amazon price data)
    if (hasAmazonPrice) {
      if ((lastPrice <= amazonPrice && newPrice > amazonPrice) || 
          (lastPrice >= amazonPrice && newPrice < amazonPrice)) {
        if (Math.abs(newPrice - amazonPrice) < threshold) {
          setSimulatedPrice(amazonPrice);
          setLastPrice(amazonPrice);
          return;
        }
      }
    }
    
    // Sticky at break-even point
    if ((lastPrice <= breakEvenPrice && newPrice > breakEvenPrice) || 
        (lastPrice >= breakEvenPrice && newPrice < breakEvenPrice)) {
      if (Math.abs(newPrice - breakEvenPrice) < threshold) {
        setSimulatedPrice(breakEvenPrice);
        setLastPrice(breakEvenPrice);
        return;
      }
    }
    
    setSimulatedPrice(newPrice);
    setLastPrice(newPrice);
  };

  // Calculate dynamic metrics based on simulated price
  const calculateMetrics = (price: number) => {
    const amazonFee = result.fulfillmentMethod === "FBA" 
      ? price * 0.15 + 3
      : price * 0.08;
    
    const netProfit = price - amazonFee - acquisitionCost;
    const roi = (netProfit / acquisitionCost) * 100;
    
    return {
      amazonFee: amazonFee.toFixed(2),
      netProfit: netProfit.toFixed(2),
      roi: roi.toFixed(1)
    };
  };

  const metrics = calculateMetrics(simulatedPrice);
  const roiValue = parseFloat(metrics.roi);
  const roiColor = roiValue > 40 ? "text-green-600" : roiValue > 25 ? "text-blue-600" : roiValue > 0 ? "text-yellow-600" : "text-red-600";

  return (
    <Card className="mt-6 border-2 border-primary/20">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          Price Sensitivity Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="priceSlider" className="text-base font-semibold">
              Simulate Your Selling Price: ${simulatedPrice.toFixed(2)}
            </Label>
            <span className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-semibold whitespace-nowrap shadow-md">
              Smart Price: ${initialPrice.toFixed(2)}
            </span>
          </div>
          
          {!hasAmazonPrice && (
            <div className="flex items-center gap-2 text-amber-600 text-sm font-medium">
              <AlertTriangle className="h-4 w-4" />
              <span>No Amazon price data available - using estimated range</span>
            </div>
          )}
          
          {isAboveAmazon && (
            <div className="flex items-center gap-2 text-red-600 text-sm font-medium animate-pulse">
              <AlertTriangle className="h-4 w-4" />
              <span>Overpriced Risk</span>
            </div>
          )}
          
          <div className="relative">
            <div className={cn(
              "slider-wrapper",
              isAboveAmazon && "slider-danger",
              isBelowBreakEven && "slider-warning"
            )}>
              <Slider
                id="priceSlider"
                min={acquisitionCost * 1.1}
                max={maxAllowedPrice}
                step={0.01}
                value={[simulatedPrice]}
                onValueChange={handlePriceChange}
                className="py-4"
              />
              
              {/* Tick marks positioned below the track like quantity slider */}
              <div className="absolute top-[calc(50%+2px)] left-0 right-0 flex pointer-events-none">
                {/* Break-even tick mark */}
                <div 
                  className="absolute w-0.5 h-2 bg-orange-500/60"
                  style={{
                    left: `${((breakEvenPrice - acquisitionCost * 1.1) / (maxAllowedPrice - acquisitionCost * 1.1)) * 100}%`
                  }}
                />
                
                {/* Amazon price tick mark - only show if we have Amazon price data */}
                {hasAmazonPrice && (
                  <div 
                    className="absolute w-0.5 h-2 bg-blue-500/60"
                    style={{
                      left: `${((amazonPrice - acquisitionCost * 1.1) / (maxAllowedPrice - acquisitionCost * 1.1)) * 100}%`
                    }}
                  />
                )}
              </div>
            </div>
            
            {isAboveAmazon && (
              <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 shadow-lg z-10 whitespace-nowrap">
                <p className="text-xs text-red-700 font-medium flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Not recommended: Risk of being overpriced vs. Amazon
                </p>
              </div>
            )}
            
            {isBelowBreakEven && (
              <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 shadow-lg z-10 whitespace-nowrap">
                <p className="text-xs text-orange-700 font-medium flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Below break-even: You're losing money at this price
                </p>
              </div>
            )}
            
            <style>{`
              .slider-danger [data-radix-slider-range] {
                background-color: #dc2626 !important;
              }
              .slider-danger [data-radix-slider-thumb] {
                border-color: #dc2626 !important;
              }
              .slider-warning [data-radix-slider-range] {
                background-color: #f97316 !important;
              }
              .slider-warning [data-radix-slider-thumb] {
                border-color: #f97316 !important;
              }
            `}</style>
          </div>
          
          <div className="relative pt-2 pb-16">
            {/* Min label positioned at the very bottom left */}
            <div className="absolute bottom-0 left-0 text-sm text-muted-foreground">
              <span>Min: ${(acquisitionCost * 1.1).toFixed(2)} (Acquisition cost)</span>
            </div>
            
            {/* Break-even label positioned below its tick mark */}
            <div 
              className="absolute top-0 transform -translate-x-1/2 flex flex-col items-center"
              style={{
                left: `${((breakEvenPrice - acquisitionCost * 1.1) / (maxAllowedPrice - acquisitionCost * 1.1)) * 100}%`
              }}
            >
              <span className="font-semibold whitespace-nowrap text-xs text-orange-600">
                Break-Even
              </span>
              <span className="font-bold text-orange-600">
                ${breakEvenPrice.toFixed(2)}
              </span>
            </div>
            
            {/* Amazon Current Price label - only show if we have Amazon price data */}
            {hasAmazonPrice && (
              <div 
                className="absolute top-0 transform -translate-x-1/2 flex flex-col items-center"
                style={{
                  left: `${((amazonPrice - acquisitionCost * 1.1) / (maxAllowedPrice - acquisitionCost * 1.1)) * 100}%`
                }}
              >
                <span className={cn(
                  "font-semibold whitespace-nowrap text-xs",
                  isAboveAmazon ? "text-red-600" : "text-blue-600"
                )}>
                  Amazon Current Price
                </span>
                <span className={cn(
                  "font-bold",
                  isAboveAmazon ? "text-red-600" : "text-blue-600"
                )}>
                  ${amazonPrice.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Metric</TableHead>
                <TableHead className="font-semibold text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Simulated Selling Price</TableCell>
                <TableCell className="text-right font-bold text-lg">${simulatedPrice.toFixed(2)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Acquisition Cost</TableCell>
                <TableCell className="text-right">${result.ourAcquisitionCost}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Amazon Fee ({result.fulfillmentMethod})</TableCell>
                <TableCell className="text-right">${metrics.amazonFee}</TableCell>
              </TableRow>
              <TableRow className="bg-primary/5">
                <TableCell className="font-medium">Net Profit per Unit</TableCell>
                <TableCell className={`text-right font-bold ${parseFloat(metrics.netProfit) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${metrics.netProfit}
                </TableCell>
              </TableRow>
              <TableRow className="bg-gradient-to-r from-green-50 to-emerald-50 border-t-2">
                <TableCell className="font-bold text-lg">Maximum Potential ROI</TableCell>
                <TableCell className={`text-right font-bold text-2xl ${roiColor}`}>
                  {metrics.roi}%
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <div className={cn(
          "p-4 rounded-lg text-sm",
          isAboveAmazon 
            ? "bg-red-50 border border-red-200 text-red-700" 
            : "bg-muted text-muted-foreground"
        )}>
          <p>
            <strong>Note:</strong> {
              !hasAmazonPrice
                ? "Amazon price data is not available for this book. The pricing range is estimated based on your smart price."
                : isAboveAmazon 
                  ? `You are pricing ${((simulatedPrice / amazonPrice - 1) * 100).toFixed(1)}% above Amazon's current price. This may reduce your competitiveness and sales velocity.`
                  : `This analysis shows how your ROI changes with different selling prices. Amazon's current price is $${amazonPrice.toFixed(2)}.`
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

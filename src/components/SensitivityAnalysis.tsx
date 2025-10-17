import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp } from "lucide-react";

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
  const maxPrice = parseFloat(result.amazonReferencePrice);
  
  const [simulatedPrice, setSimulatedPrice] = useState(initialPrice);

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
          <Label htmlFor="priceSlider" className="text-base font-semibold">
            Simulate Your Selling Price: ${simulatedPrice.toFixed(2)}
          </Label>
          <Slider
            id="priceSlider"
            min={acquisitionCost * 1.1}
            max={maxPrice}
            step={0.01}
            value={[simulatedPrice]}
            onValueChange={(value) => setSimulatedPrice(value[0])}
            className="py-4"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Min: ${(acquisitionCost * 1.1).toFixed(2)}</span>
            <span className="text-primary font-medium">Average: ${initialPrice.toFixed(2)}</span>
            <span>Max: ${maxPrice.toFixed(2)}</span>
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

        <div className="p-4 rounded-lg bg-muted text-sm text-muted-foreground">
          <p>
            <strong>Note:</strong> This analysis shows how your ROI changes with different selling prices. 
            The maximum price is capped at Amazon's reference price (${maxPrice.toFixed(2)}) to ensure competitive positioning.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

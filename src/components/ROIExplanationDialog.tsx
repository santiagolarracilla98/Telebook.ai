import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calculator, TrendingDown, DollarSign, Percent } from "lucide-react";

interface ROIExplanationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ROIExplanationDialog = ({ open, onOpenChange }: ROIExplanationDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Calculator className="h-6 w-6 text-primary" />
            How We Calculate Your ROI
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            Complete transparency in our calculation methodology
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          <div className="space-y-3">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              1. Acquisition Cost Calculation
            </h3>
            <div className="pl-7 space-y-2 text-sm">
              <p className="text-muted-foreground">
                We start with our base wholesale price, then apply volume discounts based on your order quantity:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><strong>10-49 units:</strong> 5% volume discount</li>
                <li><strong>50-99 units:</strong> 10% volume discount</li>
                <li><strong>100-249 units:</strong> 15% volume discount</li>
                <li><strong>250-499 units:</strong> 20% volume discount</li>
                <li><strong>500+ units:</strong> 25% volume discount</li>
              </ul>
              <div className="bg-muted p-3 rounded-md mt-2">
                <code className="text-sm">
                  Your Acquisition Cost = Base Price × (1 - Volume Discount)
                </code>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-primary" />
              2. Amazon Fee Calculation
            </h3>
            <div className="pl-7 space-y-2 text-sm">
              <p className="text-muted-foreground">
                Amazon charges different fees based on your fulfillment method:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><strong>FBA (Fulfillment by Amazon):</strong> 15% referral fee + $3.00 fulfillment fee</li>
                <li><strong>FBM (Fulfillment by Merchant):</strong> 8% referral fee (you handle shipping)</li>
              </ul>
              <div className="bg-muted p-3 rounded-md mt-2">
                <code className="text-sm">
                  FBA Fee = (Selling Price × 0.15) + $3.00<br/>
                  FBM Fee = Selling Price × 0.08
                </code>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Percent className="h-5 w-5 text-primary" />
              3. Net Profit & ROI
            </h3>
            <div className="pl-7 space-y-2 text-sm">
              <p className="text-muted-foreground">
                We calculate your net profit per unit and return on investment:
              </p>
              <div className="bg-muted p-4 rounded-md space-y-2">
                <code className="text-sm block">
                  Net Profit = Selling Price - Amazon Fee - Your Acquisition Cost
                </code>
                <code className="text-sm block">
                  ROI % = (Net Profit ÷ Your Acquisition Cost) × 100
                </code>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-lg">4. Competitive Analysis</h3>
            <div className="pl-7 space-y-2 text-sm text-muted-foreground">
              <p>
                If you provide your current supplier cost, we compare it to our pricing:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Major Edge:</strong> Our price is 20%+ lower than your current cost</li>
                <li><strong>Competitive:</strong> Our price is 10-20% lower</li>
                <li><strong>Market Rate:</strong> Prices are within 10% of each other</li>
              </ul>
            </div>
          </div>

          <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
            <h4 className="font-semibold mb-2">Example Calculation</h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>Book selling at <strong>$25.00</strong> on Amazon</p>
              <p>Base wholesale price: <strong>$12.00</strong></p>
              <p>Order quantity: <strong>100 units</strong> (15% discount)</p>
              <p>Your acquisition cost: <strong>$10.20</strong> ($12.00 × 0.85)</p>
              <p>Amazon FBA fee: <strong>$6.75</strong> ($25.00 × 0.15 + $3.00)</p>
              <p>Net profit per unit: <strong>$8.05</strong> ($25.00 - $6.75 - $10.20)</p>
              <p className="text-primary font-bold">ROI: 78.9% ($8.05 ÷ $10.20 × 100)</p>
            </div>
          </div>

          <div className="bg-muted p-4 rounded-lg text-sm text-muted-foreground">
            <p className="font-semibold mb-2">Data Sources:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Selling prices sourced from real-time Amazon marketplace data</li>
              <li>Our acquisition costs reflect current wholesale agreements</li>
              <li>Amazon fees based on official FBA and FBM fee schedules</li>
              <li>Prices updated daily to ensure accuracy</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

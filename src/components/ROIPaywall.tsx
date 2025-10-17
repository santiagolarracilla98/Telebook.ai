import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, TrendingUp, Zap, Database } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ROIPaywallProps {
  lastROI: string;
}

export const ROIPaywall = ({ lastROI }: ROIPaywallProps) => {
  const navigate = useNavigate();
  
  return (
    <div className="w-full max-w-4xl mx-auto py-12 px-4">
      <Card className="border-2 border-primary shadow-2xl">
        <CardHeader className="text-center bg-gradient-to-r from-primary/10 to-primary/5 pb-8">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full bg-primary/20">
              <Lock className="h-12 w-12 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold mb-3">
            LIMIT REACHED: Unlock Unlimited Profit Potential
          </CardTitle>
          <p className="text-lg text-muted-foreground">
            You've used your free daily analysis. Your last search revealed a <span className="font-bold text-primary">{lastROI}% ROI</span>.
          </p>
          <p className="text-xl font-semibold mt-2">
            Don't let high-margin inventory slip away.
          </p>
        </CardHeader>
        <CardContent className="pt-8 space-y-8">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center space-y-3 p-4">
              <div className="flex justify-center">
                <div className="p-3 rounded-full bg-primary/10">
                  <Zap className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h3 className="font-bold text-lg">Unlimited Searches</h3>
              <p className="text-sm text-muted-foreground">
                Run 1,000+ calculations per month without restrictions
              </p>
            </div>
            <div className="text-center space-y-3 p-4">
              <div className="flex justify-center">
                <div className="p-3 rounded-full bg-primary/10">
                  <Database className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h3 className="font-bold text-lg">Full Catalog Access</h3>
              <p className="text-sm text-muted-foreground">
                Access our entire inventory with proprietary pricing data
              </p>
            </div>
            <div className="text-center space-y-3 p-4">
              <div className="flex justify-center">
                <div className="p-3 rounded-full bg-primary/10">
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h3 className="font-bold text-lg">Real-Time Updates</h3>
              <p className="text-sm text-muted-foreground">
                Daily pricing updates to maximize your competitive edge
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-primary/5 to-primary/10 p-6 rounded-lg">
            <p className="text-center text-lg font-semibold mb-4">
              Book Maven AI Subscribers run over 1,000 deep-dive calculations every month
            </p>
            <div className="flex justify-center">
              <Button 
                size="lg" 
                className="text-lg px-12 h-14 shadow-lg"
                onClick={() => navigate('/auth')}
              >
                Get Unlimited Searches & Full Catalog Access
              </Button>
            </div>
          </div>

          <div className="text-center text-sm text-muted-foreground space-y-2">
            <p>Join successful Amazon sellers maximizing their margins</p>
            <p className="font-medium">New free search available tomorrow</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

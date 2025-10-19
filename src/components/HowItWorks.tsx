import { Button } from "@/components/ui/button";
import { TrendingUp, Truck, CheckCircle2 } from "lucide-react";

export const HowItWorks = () => {
  const scrollToInventory = () => {
    const element = document.getElementById('inventory');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const features = [
    {
      icon: TrendingUp,
      title: "Data-Driven Sourcing: Buy Low, Guaranteed.",
      description: "Our AI-powered system identifies the lowest acquisition costs in real-time."
    },
    {
      icon: Truck,
      title: "Scalable Logistics: Ship Fast, Sell Faster.",
      description: "Streamlined fulfillment processes ensure your inventory moves quickly."
    },
    {
      icon: CheckCircle2,
      title: "Guaranteed Profitability: Know Your Earnings.",
      description: "Transparent pricing models give you certainty on every transaction."
    }
  ];

  return (
    <section className="py-16 px-4 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            How It Works: Your Path to Higher Net Profit
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            We eliminate the "too good to be true" factor with transparency and efficiency. 
            Telebook uses a data-driven model that guarantees an acquisition cost that is 
            structurally lower than any traditional distributor.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="bg-card p-6 rounded-lg border border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg"
            >
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 p-3 bg-primary/10 rounded-full">
                  <feature.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Button 
            size="lg" 
            onClick={scrollToInventory}
            className="font-semibold"
          >
            See Available High-Margin Inventory
          </Button>
        </div>
      </div>
    </section>
  );
};

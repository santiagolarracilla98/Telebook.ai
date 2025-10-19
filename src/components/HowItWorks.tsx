import { Button } from "@/components/ui/button";
import { TrendingUp, Truck, CheckCircle2, DollarSign } from "lucide-react";

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
      icon: DollarSign,
      title: "Guaranteed Profitability: Know Your Earnings.",
      description: "Transparent pricing models give you certainty on every transaction."
    }
  ];

  return (
    <section className="py-24 px-4 bg-gradient-to-b from-background via-muted/20 to-background">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="font-headline text-4xl md:text-5xl font-bold mb-6 text-foreground tracking-tight">
            How It Works: Your Path to Higher Net Profit
          </h2>
          <p className="font-body text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            We eliminate the "too good to be true" factor with transparency and efficiency. 
            Telebook uses a data-driven model that guarantees an acquisition cost that is 
            structurally lower than any traditional distributor.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-10 mb-16">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="group relative bg-gradient-to-br from-card to-card/50 p-10 rounded-2xl border-2 border-border/30 hover:border-primary/40 transition-all duration-500 hover:shadow-2xl hover:-translate-y-3"
            >
              <div className="absolute -top-6 -left-6 text-8xl font-headline font-bold text-primary/10 group-hover:text-primary/20 transition-all">0{index + 1}</div>
              <div className="relative flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-primary-glow rounded-2xl mb-6 shadow-lg shadow-primary/30 group-hover:shadow-xl group-hover:shadow-primary/40 group-hover:scale-110 transition-all duration-300">
                <feature.icon className="h-8 w-8 text-white" strokeWidth={2.5} />
              </div>
              <h3 className="font-headline text-2xl font-bold mb-4 text-foreground group-hover:text-primary transition-colors">
                {feature.title}
              </h3>
              <p className="font-body text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Button 
            size="lg" 
            onClick={scrollToInventory}
            className="text-lg px-10 py-7 shadow-2xl hover:shadow-primary/40 font-bold"
          >
            See Available High-Margin Inventory
          </Button>
        </div>
      </div>
    </section>
  );
};

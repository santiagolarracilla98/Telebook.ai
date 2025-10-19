import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, ShieldCheck, Zap } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary-glow to-secondary py-20 px-4 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
      <div className="relative max-w-7xl mx-auto">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-background/10 backdrop-blur-sm border border-primary-foreground/20 rounded-full px-4 py-2 mb-8">
            <Zap className="w-4 h-4 text-primary-foreground" />
            <span className="text-sm font-medium text-primary-foreground">Telebook's Proprietary Sourcing</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-primary-foreground mb-6 leading-tight">
            Stop Competing on Price.
            <br />
            <span className="bg-gradient-to-r from-success to-warning bg-clip-text text-transparent">
              Start Dominating on Margin.
            </span>
          </h1>
          
          <p className="text-2xl font-semibold text-primary-foreground mb-4 max-w-3xl mx-auto leading-relaxed">
            Unleash 20%+ Net ROI on Amazon Book Resale with Telebook's Proprietary Sourcing.
          </p>
          
          <p className="text-lg text-primary-foreground/90 mb-8 max-w-3xl mx-auto leading-relaxed">
            We cut out wholesalers and use AI to guarantee the lowest acquisition costs on profitable ASINs. Higher margins, lower risk, scalable inventory.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              variant="secondary" 
              className="group"
              onClick={() => {
                document.getElementById('pricing-engine')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Calculate My Profit Now
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="bg-background/10 backdrop-blur-sm border-primary-foreground/30 text-primary-foreground hover:bg-background/20"
              onClick={() => {
                document.getElementById('inventory')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              See Available High-Margin Inventory
            </Button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-16 max-w-4xl mx-auto">
            <div className="bg-background/10 backdrop-blur-sm rounded-2xl p-6 border border-primary-foreground/20">
              <TrendingUp className="w-8 h-8 text-success mb-3 mx-auto" />
              <h3 className="text-lg font-semibold text-primary-foreground mb-2">Smart Pricing</h3>
              <p className="text-sm text-primary-foreground/80">AI-powered price optimization for maximum ROI</p>
            </div>
            
            <div className="bg-background/10 backdrop-blur-sm rounded-2xl p-6 border border-primary-foreground/20">
              <ShieldCheck className="w-8 h-8 text-success mb-3 mx-auto" />
              <h3 className="text-lg font-semibold text-primary-foreground mb-2">Verified Suppliers</h3>
              <p className="text-sm text-primary-foreground/80">Authentic sources with full documentation</p>
            </div>
            
            <div className="bg-background/10 backdrop-blur-sm rounded-2xl p-6 border border-primary-foreground/20">
              <Zap className="w-8 h-8 text-warning mb-3 mx-auto" />
              <h3 className="text-lg font-semibold text-primary-foreground mb-2">Real-Time Data</h3>
              <p className="text-sm text-primary-foreground/80">Live pricing from Amazon and publishers</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;

import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, ShieldCheck, Zap, Calculator, BookOpen } from "lucide-react";
import { useEffect, useState } from "react";

const Hero = () => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section className="relative min-h-[700px] flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent"></div>
      
      {/* Animated floating books background */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          transform: `translateY(${scrollY * 0.3}px)`,
        }}
      >
        <svg className="absolute top-20 left-[10%] w-32 h-32 text-secondary animate-pulse-soft" viewBox="0 0 100 100" style={{ transform: `rotate(${scrollY * 0.05}deg)` }}>
          <rect x="20" y="15" width="60" height="70" rx="3" fill="currentColor" opacity="0.6"/>
          <rect x="25" y="20" width="50" height="3" fill="white" opacity="0.8"/>
          <rect x="25" y="28" width="50" height="2" fill="white" opacity="0.6"/>
          <rect x="25" y="34" width="40" height="2" fill="white" opacity="0.6"/>
        </svg>
        
        <svg className="absolute top-40 right-[15%] w-40 h-40 text-accent animate-pulse-soft" viewBox="0 0 100 100" style={{ transform: `rotate(${-scrollY * 0.04}deg)`, animationDelay: '0.5s' }}>
          <rect x="15" y="20" width="70" height="60" rx="3" fill="currentColor" opacity="0.5"/>
          <rect x="20" y="25" width="60" height="3" fill="white" opacity="0.7"/>
          <rect x="20" y="32" width="55" height="2" fill="white" opacity="0.5"/>
          <rect x="20" y="38" width="50" height="2" fill="white" opacity="0.5"/>
        </svg>

        <svg className="absolute bottom-32 left-[20%] w-36 h-36 text-primary animate-pulse-soft" viewBox="0 0 100 100" style={{ transform: `rotate(${scrollY * 0.06}deg)`, animationDelay: '1s' }}>
          <rect x="18" y="18" width="64" height="64" rx="3" fill="currentColor" opacity="0.55"/>
          <rect x="23" y="23" width="54" height="3" fill="white" opacity="0.75"/>
          <rect x="23" y="30" width="50" height="2" fill="white" opacity="0.55"/>
          <rect x="23" y="36" width="45" height="2" fill="white" opacity="0.55"/>
        </svg>

        <svg className="absolute top-60 right-[25%] w-28 h-28 text-secondary animate-pulse-soft" viewBox="0 0 100 100" style={{ transform: `rotate(${-scrollY * 0.07}deg)`, animationDelay: '1.5s' }}>
          <rect x="22" y="25" width="56" height="50" rx="3" fill="currentColor" opacity="0.45"/>
          <rect x="27" y="30" width="46" height="2" fill="white" opacity="0.7"/>
          <rect x="27" y="36" width="42" height="2" fill="white" opacity="0.5"/>
        </svg>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-20">
        <div className="text-center max-w-5xl mx-auto animate-fade-in-up">
          <h1 className="font-headline text-5xl sm:text-6xl md:text-7xl font-bold mb-8 leading-[1.1] tracking-tight">
            <span className="text-primary animate-fade-in">
              Stop Competing on Price.
            </span>
            <br />
            <span className="text-primary">
              Start Dominating on Margin.
            </span>
          </h1>
          
          <p className="font-body text-2xl font-semibold text-foreground mb-6 max-w-3xl mx-auto leading-relaxed">
            Unleash 20%+ Net ROI on Amazon Book Resale with Telebook's Proprietary Sourcing.
          </p>
          
          <p className="font-body text-xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
            We cut out wholesalers and use AI to guarantee the lowest acquisition costs on profitable ASINs. Higher margins, lower risk, scalable inventory.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-20">
            <Button 
              size="lg" 
              className="text-lg px-10 py-7 text-base font-bold shadow-2xl hover:shadow-primary/40"
              onClick={() => {
                document.getElementById('pricing-engine')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Calculate My Profit Now
              <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-10 py-7 text-base font-semibold border-2"
              onClick={() => {
                document.getElementById('inventory')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              See Available High-Margin Inventory
            </Button>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="glass-strong p-8 rounded-2xl border border-border/20 hover:border-primary/30 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 group">
              <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-secondary to-secondary/80 rounded-xl mb-5 mx-auto shadow-lg shadow-secondary/20 group-hover:shadow-xl group-hover:shadow-secondary/30 transition-all">
                <TrendingUp className="h-7 w-7 text-white" strokeWidth={2.5} />
              </div>
              <h3 className="font-headline text-xl font-bold mb-3 text-foreground">Smart Pricing</h3>
              <p className="font-body text-sm text-muted-foreground leading-relaxed">AI-powered price optimization for maximum ROI</p>
            </div>
            
            <div className="glass-strong p-8 rounded-2xl border border-border/20 hover:border-secondary/30 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 group">
              <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-secondary to-secondary/80 rounded-xl mb-5 mx-auto shadow-lg shadow-secondary/20 group-hover:shadow-xl group-hover:shadow-secondary/30 transition-all">
                <ShieldCheck className="h-7 w-7 text-white" strokeWidth={2.5} />
              </div>
              <h3 className="font-headline text-xl font-bold mb-3 text-foreground">Verified Suppliers</h3>
              <p className="font-body text-sm text-muted-foreground leading-relaxed">Authentic sources with full documentation</p>
            </div>
            
            <div className="glass-strong p-8 rounded-2xl border border-border/20 hover:border-accent/30 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 group">
              <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-accent to-accent/80 rounded-xl mb-5 mx-auto shadow-lg shadow-accent/20 group-hover:shadow-xl group-hover:shadow-accent/30 transition-all">
                <Zap className="h-7 w-7 text-white" strokeWidth={2.5} />
              </div>
              <h3 className="font-headline text-xl font-bold mb-3 text-foreground">Real-Time Data</h3>
              <p className="font-body text-sm text-muted-foreground leading-relaxed">Live pricing from Amazon and publishers</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;

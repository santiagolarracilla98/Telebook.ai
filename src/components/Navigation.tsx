import { Button } from "@/components/ui/button";
import { BookOpen, LayoutDashboard, Calculator, Users } from "lucide-react";

const Navigation = () => {
  return (
    <nav className="bg-card border-b border-border sticky top-0 z-50 backdrop-blur-sm bg-card/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">BookWholesale</span>
          </div>
          
          <div className="hidden md:flex items-center gap-6">
            <Button 
              variant="ghost" 
              className="gap-2"
              onClick={() => {
                document.getElementById('inventory')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <LayoutDashboard className="w-4 h-4" />
              Inventory
            </Button>
            <Button 
              variant="ghost" 
              className="gap-2"
              onClick={() => {
                document.getElementById('inventory')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <Calculator className="w-4 h-4" />
              Price Engine
            </Button>
            <Button 
              variant="ghost" 
              className="gap-2"
              onClick={() => {
                document.getElementById('inventory')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <Users className="w-4 h-4" />
              Suppliers
            </Button>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline"
              onClick={() => alert('Sign in functionality coming soon!')}
            >
              Sign In
            </Button>
            <Button onClick={() => alert('Get started functionality coming soon!')}>
              Get Started
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;

import { Button } from "@/components/ui/button";
import { BookOpen, LayoutDashboard, Calculator, Users, LogOut, User as UserIcon, Briefcase, Settings } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { CartButton } from "@/components/Cart";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";

const Navigation = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isHost, setIsHost] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkHostStatus(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkHostStatus(session.user.id);
      } else {
        setIsHost(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkHostStatus = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();
    
    setIsHost(data?.role === 'host');
  };

  const handleLogout = async () => {
    setUser(null);
    setIsHost(false);
    await supabase.auth.signOut({ scope: 'local' });
    navigate('/auth');
  };

  return (
    <nav className="bg-card border-b border-border sticky top-0 z-50 backdrop-blur-sm bg-card/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">Telebook</span>
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
                document.getElementById('pricing-engine')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <Calculator className="w-4 h-4" />
              Price Engine
            </Button>
            <Button 
              variant="ghost" 
              className="gap-2"
              onClick={() => {
                document.getElementById('suppliers')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <Users className="w-4 h-4" />
              Suppliers
            </Button>
          </div>
          
          <div className="flex items-center gap-3">
            {user && <CartButton />}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <UserIcon className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-popover" align="end">
                  <DropdownMenuItem onClick={() => navigate('/my-business')} className="gap-2 cursor-pointer">
                    <Briefcase className="w-4 h-4" />
                    My Business
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/my-account')} className="gap-2 cursor-pointer">
                    <Settings className="w-4 h-4" />
                    My Account
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="gap-2 cursor-pointer">
                    <LogOut className="w-4 h-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button onClick={() => navigate('/auth')}>
                Sign/Log in
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen } from "lucide-react";
import { toast } from "sonner";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isHostMode, setIsHostMode] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        checkRoleAndRedirect(session.user.id);
      }
    });
  }, []);

  const checkRoleAndRedirect = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (data?.role === 'host') {
      navigate('/host-dashboard');
    } else {
      navigate('/client-dashboard');
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        if (isHostMode) {
          // Check if user has host role
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', data.user.id)
            .maybeSingle();

          if (roleData?.role === 'host') {
            toast.success("Welcome back, Host!");
            navigate('/host-dashboard');
          } else {
            toast.error("Access denied. Host credentials required.");
            await supabase.auth.signOut();
          }
        } else {
          toast.success("Welcome to Telebook!");
          navigate('/client-dashboard');
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { role: isHostMode ? 'host' : 'client' }
        }
      });

      if (error) throw error;
      toast.success("Account created! Please sign in.");
    } catch (error: any) {
      toast.error(error.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/5">
      <Button 
        variant="ghost" 
        className="absolute top-4 left-4"
        onClick={() => navigate('/')}
      >
        ← Back to Home
      </Button>
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <div className={`w-16 h-16 rounded-2xl ${isHostMode ? 'bg-gradient-to-br from-primary to-secondary' : 'bg-gradient-to-br from-secondary to-primary'} flex items-center justify-center`}>
              <BookOpen className="w-10 h-10 text-primary-foreground" />
            </div>
          </div>
          <div className="text-center">
            <CardTitle className="text-2xl">
              {isHostMode ? 'Host Portal' : 'Client Portal'}
            </CardTitle>
            <CardDescription>
              {isHostMode 
                ? 'Manage your book inventory' 
                : 'Browse and discover books'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isHostMode ? "host@telebook.com" : "client@telebook.com"}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
              <Button type="button" variant="outline" onClick={handleSignUp} disabled={loading}>
                Sign Up
              </Button>
            </div>
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setIsHostMode(!isHostMode)}
                className="text-sm text-primary hover:underline"
              >
                {isHostMode ? '← Back to client login' : 'Log in as host →'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;

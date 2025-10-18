import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail, Crown, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AccountInfo {
  email: string;
  tier: 'freemium' | 'premium';
}

const MyAccount = () => {
  const navigate = useNavigate();
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccountInfo();
  }, []);

  const fetchAccountInfo = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/auth');
        return;
      }

      const { data: tierData } = await supabase
        .from('account_tiers')
        .select('tier')
        .eq('user_id', session.user.id)
        .single();

      setAccountInfo({
        email: session.user.email || '',
        tier: (tierData?.tier as 'freemium' | 'premium') || 'freemium',
      });
    } catch (error) {
      console.error('Error fetching account info:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-card border-b border-border sticky top-0 z-50 backdrop-blur-sm bg-card/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Button variant="ghost" onClick={() => navigate('/')} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Main
            </Button>
            <h1 className="text-xl font-bold">My Account</h1>
            <div className="w-24" /> {/* Spacer for centering */}
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <Card>
            <CardContent className="p-8">
              <p className="text-muted-foreground text-center">Loading account information...</p>
            </CardContent>
          </Card>
        ) : accountInfo ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Account Information
                </CardTitle>
                <CardDescription>Your account details and subscription status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Email Address</p>
                      <p className="text-sm text-muted-foreground">{accountInfo.email}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Crown className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Account Tier</p>
                      <Badge 
                        variant={accountInfo.tier === 'premium' ? 'default' : 'secondary'}
                        className="mt-1"
                      >
                        {accountInfo.tier === 'premium' ? (
                          <span className="flex items-center gap-1">
                            <Crown className="w-3 h-3" />
                            Premium
                          </span>
                        ) : (
                          'Freemium'
                        )}
                      </Badge>
                    </div>
                  </div>
                </div>

                {accountInfo.tier === 'freemium' && (
                  <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                    <h3 className="font-semibold mb-2">Upgrade to Premium</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Get access to advanced features, priority support, and exclusive tools.
                    </p>
                    <Button>Upgrade Now</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Unable to load account information</p>
              <Button onClick={() => navigate('/')} className="mt-4">
                Return to Home
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default MyAccount;

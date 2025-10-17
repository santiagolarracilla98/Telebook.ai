import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, TrendingUp, Package, DollarSign, BarChart3, Loader2, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Book } from "@/data/mockBooks";
import SimilarBookCard from "./SimilarBookCard";

interface BookDetailsDialogProps {
  book: Book;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  marketplace?: 'usa' | 'uk' | 'both';
}

const BookDetailsDialog = ({ book, open, onOpenChange, marketplace = 'usa' }: BookDetailsDialogProps) => {
  const navigate = useNavigate();
  const [keepaData, setKeepaData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [similarBooks, setSimilarBooks] = useState<Book[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [selectedSimilarBook, setSelectedSimilarBook] = useState<Book | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      if (open && book.isbn) {
        // Check authentication first
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
        
        fetchKeepaData();
        fetchSimilarBooks();
      }
    };
    
    checkAuthAndFetch();
  }, [open, book.isbn, marketplace]);

  const fetchSimilarBooks = async () => {
    setLoadingSimilar(true);
    try {
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      
      if (!session) {
        setSimilarBooks([]);
        setLoadingSimilar(false);
        return;
      }

      // Build query - exclude current book by title and author to avoid UUID issues
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('category', book.category)
        .neq('title', book.title)
        .order('title')
        .limit(5);

      if (error) {
        console.error('Error fetching similar books:', error);
        throw error;
      }

      // Transform to Book interface
      const transformed = data?.map(b => ({
        id: b.id,
        title: b.title,
        author: b.author,
        isbn: b.us_asin || b.uk_asin || '',
        uk_asin: b.uk_asin,
        us_asin: b.us_asin,
        available_stock: b.available_stock,
        rrp: b.rrp,
        wholesale_price: b.wholesale_price,
        publisher: 'Various',
        category: b.category || 'Fiction',
        wholesalePrice: b.wholesale_price,
        suggestedPrice: b.roi_target_price || (b.wholesale_price * 1.2),
        amazonPrice: b.amazon_price || b.rrp,
        roi: b.wholesale_price > 0 ? Math.round(((b.amazon_price || b.rrp) - (b.wholesale_price * 1.15)) / b.wholesale_price * 100) : 0,
        verified: true,
        imageUrl: b.image_url || undefined,
        publisher_rrp: b.publisher_rrp,
        amazon_price: b.amazon_price,
        roi_target_price: b.roi_target_price,
        market_flag: b.market_flag,
        currency: b.currency,
      })) || [];

      setSimilarBooks(transformed);
    } catch (error) {
      console.error('Error fetching similar books:', error);
    } finally {
      setLoadingSimilar(false);
    }
  };

  const fetchKeepaData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (marketplace === 'both') {
        // Fetch data from both marketplaces using the appropriate ASIN
        const [usaResponse, ukResponse] = await Promise.all([
          supabase.functions.invoke('keepa-product', {
            body: { 
              isbn: book.us_asin || book.isbn,
              marketplace: 'usa'
            }
          }),
          supabase.functions.invoke('keepa-product', {
            body: { 
              isbn: book.uk_asin || book.isbn,
              marketplace: 'uk'
            }
          })
        ]);
        
        if (usaResponse.error && ukResponse.error) {
          throw new Error('Failed to fetch Amazon data from both marketplaces');
        }
        
        // Combine the data from both marketplaces
        setKeepaData({
          usa: usaResponse.data,
          uk: ukResponse.data,
          marketplace: 'both'
        });
      } else {
        // Fetch from single marketplace using the appropriate ASIN
        const asinToUse = marketplace === 'uk' ? (book.uk_asin || book.isbn) : (book.us_asin || book.isbn);
        const { data, error: functionError } = await supabase.functions.invoke('keepa-product', {
          body: { 
            isbn: asinToUse,
            marketplace: marketplace
          }
        });
        
        if (functionError) {
          throw new Error(functionError.message || 'Failed to fetch Amazon data');
        }
        
        console.log('Keepa response:', data);
        setKeepaData(data);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Could not load Amazon product data';
      setError(errorMessage);
      console.error('Keepa API error:', err);
    } finally {
      setLoading(false);
    }
  };

  const cost = book.publisher_rrp || book.wholesale_price || book.wholesalePrice || 0;
  const amazonPrice = book.amazon_price || book.amazonPrice || 0;
  const amazonFees = book.amazon_fee || (amazonPrice * 0.15);
  const targetPrice = book.roi_target_price || book.suggestedPrice || 0;
  
  // Calculate net profit and ROI at our smart target price (25% target)
  const targetFees = targetPrice * 0.15; // Approximate Amazon fees
  const netProfitAtTarget = targetPrice - targetFees - cost;
  const targetRoi = cost > 0 ? ((netProfitAtTarget / cost) * 100).toFixed(1) : '0.0';
  
  // Calculate net profit and ROI at Amazon's current price (for reference)
  const netProfitAtAmazon = amazonPrice > 0 ? amazonPrice - amazonFees - cost : 0;
  const amazonRoi = cost > 0 && amazonPrice > 0 ? ((netProfitAtAmazon / cost) * 100).toFixed(1) : '0.0';
  
  // Check if stored price is stale (>7 days old)
  const lastPriceCheck = (book as any).last_price_check ? new Date((book as any).last_price_check) : null;
  const isPriceStale = lastPriceCheck ? (Date.now() - lastPriceCheck.getTime()) > 7 * 24 * 60 * 60 * 1000 : true;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{book.title}</DialogTitle>
          <DialogDescription className="text-base">
            by {book.author}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="pricing">Pricing Analysis</TabsTrigger>
            <TabsTrigger value="amazon">Amazon Live Data</TabsTrigger>
            <TabsTrigger value="similar">Similar Books</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">ISBN</h4>
                  <p className="text-base font-mono">{book.isbn}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Author</h4>
                  <p className="text-base">{book.author}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Publisher</h4>
                  <p className="text-base">{book.publisher}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Category</h4>
                  <Badge variant="outline">{book.category}</Badge>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-4 h-4 text-muted-foreground" />
                    <h4 className="text-sm font-medium">Cost (Publisher)</h4>
                  </div>
                  <p className="text-2xl font-bold">
                    {cost > 0 ? `$${cost.toFixed(2)}` : 'NA'}
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-primary/10">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    <h4 className="text-sm font-medium">Smart Price (25% ROI)</h4>
                  </div>
                  <p className="text-2xl font-bold text-primary">
                    {targetPrice > 0 ? `$${targetPrice.toFixed(2)}` : 'Calculating...'}
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    <h4 className="text-sm font-medium">Amazon Price (Ref)</h4>
                  </div>
                  <p className="text-2xl font-bold">
                    {amazonPrice > 0 ? `$${amazonPrice.toFixed(2)}` : 'NA'}
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-success/10">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-success" />
                    <h4 className="text-sm font-medium">Target Net ROI</h4>
                  </div>
                  <p className="text-2xl font-bold text-success">{targetRoi}%</p>
                </div>

                {book.verified && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10">
                    <ShieldCheck className="w-5 h-5 text-success" />
                    <span className="font-medium text-success">Verified Supplier</span>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="pricing" className="space-y-4 mt-4">
            <div className="grid gap-4">
              {isPriceStale && amazonPrice > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    ⚠️ Stored price data is {lastPriceCheck ? `from ${lastPriceCheck.toLocaleDateString()}` : 'outdated'}. Check "Amazon Live Data" tab for current pricing.
                  </p>
                </div>
              )}
              
              <div className="p-4 rounded-lg border border-border space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-lg">Pricing Analysis</h3>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-muted-foreground">Cost (Publisher)</span>
                    <span className="font-semibold">
                      {cost > 0 ? `$${cost.toFixed(2)}` : 'NA'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-muted-foreground">Smart Price (25% ROI Target)</span>
                    <span className="font-semibold text-primary">
                      {targetPrice > 0 ? `$${targetPrice.toFixed(2)}` : 'Calculating...'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground">Amazon Stored Price</span>
                      {lastPriceCheck && (
                        <span className="text-xs text-muted-foreground">
                          Last checked: {lastPriceCheck.toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <span className="font-semibold">
                      {amazonPrice > 0 ? `$${amazonPrice.toFixed(2)}` : 'No data'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-muted-foreground">Est. Amazon Fees at Smart Price</span>
                    <span className="font-semibold text-warning">
                      {targetPrice > 0 ? `-$${targetFees.toFixed(2)}` : 'NA'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 bg-success/10 px-3 rounded-lg mt-2">
                    <span className="font-semibold">Net Profit (at Smart Price)</span>
                    <span className="font-bold text-success text-lg">
                      {netProfitAtTarget > 0 ? `$${netProfitAtTarget.toFixed(2)}` : 'NA'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 bg-primary/10 px-3 rounded-lg">
                    <span className="font-semibold">Target Net ROI (After Fees)</span>
                    <span className="font-bold text-primary text-lg">{targetRoi}%</span>
                  </div>
                  {amazonPrice > 0 && (
                    <div className="flex justify-between items-center py-3 bg-muted/50 px-3 rounded-lg mt-2">
                      <span className="font-medium text-sm">Current Amazon ROI (Reference)</span>
                      <span className="font-semibold">{amazonRoi}%</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-medium mb-2">💡 Strategy</h4>
                <p className="text-sm text-muted-foreground">
                  Your Smart Price is optimized for <strong>25% net ROI after Amazon fees</strong>.
                  {amazonPrice > 0 && targetPrice < amazonPrice && (
                    <> It's ${(amazonPrice - targetPrice).toFixed(2)} below Amazon's current price, giving you a competitive edge.</>
                  )}
                  {amazonPrice > 0 && targetPrice > amazonPrice && (
                    <> Amazon's price is currently lower, but your target maintains healthy margins.</>
                  )}
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="amazon" className="space-y-4 mt-4">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}

            {error && (
              <div className="p-4 rounded-lg bg-destructive/10 text-destructive">
                {error}
              </div>
            )}

            {!loading && !error && keepaData && (
              <div className="space-y-4">
                {keepaData.marketplace === 'both' ? (
                  // Display data from both marketplaces in tabs
                  <Tabs defaultValue="usa" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="usa">🇺🇸 USA</TabsTrigger>
                      <TabsTrigger value="uk">🇬🇧 UK</TabsTrigger>
                    </TabsList>
                    
                    {['usa', 'uk'].map((market) => {
                      const data = keepaData[market as 'usa' | 'uk'];
                      return (
                        <TabsContent key={market} value={market} className="space-y-4">
                          {data?.products && data.products.length > 0 && data.products[0] ? (
                            <div className="p-4 rounded-lg border border-border">
                              <h3 className="font-semibold text-lg mb-3">Amazon Product Data ({market.toUpperCase()})</h3>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between py-2 border-b border-border">
                                  <span className="text-muted-foreground">ASIN</span>
                                  <span className="font-mono">{data.products[0].asin || book.isbn.replace(/-/g, '')}</span>
                                </div>
                                {data.products[0].title && (
                                  <div className="py-2 border-b border-border">
                                    <span className="text-muted-foreground block mb-1">Amazon Title</span>
                                    <span className="text-foreground">{data.products[0].title}</span>
                                  </div>
                                )}
                                {data.products[0].stats && (
                                  <>
                                    <div className="flex justify-between py-2 border-b border-border">
                                      <span className="text-muted-foreground">Sales Rank (Current)</span>
                                      <span className="font-semibold">
                                        {data.products[0].stats.current?.[0] && data.products[0].stats.current[0] > 0 
                                          ? data.products[0].stats.current[0].toLocaleString() 
                                          : 'N/A'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-border">
                                      <span className="text-muted-foreground">Avg Sales Rank (180d)</span>
                                      <span className="font-semibold">
                                        {data.products[0].stats.avg?.[0] && data.products[0].stats.avg[0] > 0 
                                          ? data.products[0].stats.avg[0].toLocaleString() 
                                          : 'N/A'}
                                      </span>
                                    </div>
                                  </>
                                )}
                                {data.products[0].csv && Array.isArray(data.products[0].csv) && data.products[0].csv[0] && (
                                  <div className="py-2 border-b border-border">
                                    <span className="text-muted-foreground block mb-2">Current Amazon Price</span>
                                    {(() => {
                                      const priceValue = data.products[0].csv[0][data.products[0].csv[0].length - 1] || -1;
                                      return priceValue > 0 ? (
                                        <span className="font-semibold text-lg text-primary">
                                          {market === 'uk' ? '£' : '$'}{(priceValue / 100).toFixed(2)}
                                        </span>
                                      ) : (
                                        <span className="font-semibold text-muted-foreground">N/A</span>
                                      );
                                    })()}
                                  </div>
                                )}
                                <div className="mt-4">
                                  <a
                                    href={`https://www.amazon.${market === 'uk' ? 'co.uk' : 'com'}/dp/${data.products[0].asin || book.isbn.replace(/-/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center text-primary hover:underline font-medium"
                                  >
                                    View on Amazon ({market.toUpperCase()}) →
                                  </a>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="p-4 rounded-lg border border-border">
                              <h3 className="font-semibold text-lg mb-3">Amazon Product Data ({market.toUpperCase()})</h3>
                              <p className="text-muted-foreground mb-3">
                                No Amazon data found for ISBN: {book.isbn}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                This could mean the product is not available on Amazon {market.toUpperCase()}, or the ISBN doesn't match any Amazon listing.
                              </p>
                              <div className="mt-4">
                                <a
                                  href={`https://www.amazon.${market === 'uk' ? 'co.uk' : 'com'}/s?k=${book.isbn.replace(/-/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center text-primary hover:underline font-medium"
                                >
                                  Search on Amazon ({market.toUpperCase()}) →
                                </a>
                              </div>
                            </div>
                          )}
                        </TabsContent>
                      );
                    })}
                  </Tabs>
                ) : (
                  // Display data from single marketplace
                  keepaData.products && keepaData.products.length > 0 && keepaData.products[0] ? (
                    <div className="p-4 rounded-lg border border-border">
                      <h3 className="font-semibold text-lg mb-3">Amazon Product Data</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between py-2 border-b border-border">
                          <span className="text-muted-foreground">ASIN</span>
                          <span className="font-mono">{keepaData.products[0].asin || book.isbn.replace(/-/g, '')}</span>
                        </div>
                        {keepaData.products[0].title && (
                          <div className="py-2 border-b border-border">
                            <span className="text-muted-foreground block mb-1">Amazon Title</span>
                            <span className="text-foreground">{keepaData.products[0].title}</span>
                          </div>
                        )}
                        {keepaData.products[0].stats && (
                          <>
                            <div className="flex justify-between py-2 border-b border-border">
                              <span className="text-muted-foreground">Sales Rank (Current)</span>
                              <span className="font-semibold">
                                {keepaData.products[0].stats.current?.[0] && keepaData.products[0].stats.current[0] > 0 
                                  ? keepaData.products[0].stats.current[0].toLocaleString() 
                                  : 'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-border">
                              <span className="text-muted-foreground">Avg Sales Rank (180d)</span>
                              <span className="font-semibold">
                                {keepaData.products[0].stats.avg?.[0] && keepaData.products[0].stats.avg[0] > 0 
                                  ? keepaData.products[0].stats.avg[0].toLocaleString() 
                                  : 'N/A'}
                              </span>
                            </div>
                          </>
                        )}
                        {keepaData.products[0].csv && Array.isArray(keepaData.products[0].csv) && keepaData.products[0].csv[0] && (
                          <div className="py-2 border-b border-border">
                            <span className="text-muted-foreground block mb-2">Current Amazon Price</span>
                            {(() => {
                              const priceValue = keepaData.products[0].csv[0][keepaData.products[0].csv[0].length - 1] || -1;
                              return priceValue > 0 ? (
                                <span className="font-semibold text-lg text-primary">
                                  ${(priceValue / 100).toFixed(2)}
                                </span>
                              ) : (
                                <span className="font-semibold text-muted-foreground">N/A</span>
                              );
                            })()}
                          </div>
                        )}
                        <div className="mt-4">
                          <a
                            href={`https://www.amazon.${marketplace === 'uk' ? 'co.uk' : 'com'}/dp/${keepaData.products[0].asin || book.isbn.replace(/-/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-primary hover:underline font-medium"
                          >
                            View on Amazon ({marketplace.toUpperCase()}) →
                          </a>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg border border-border">
                      <h3 className="font-semibold text-lg mb-3">Amazon Product Data</h3>
                      <p className="text-muted-foreground mb-3">
                        No Amazon data found for ISBN: {book.isbn}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        This could mean the product is not available on Amazon, or the ISBN doesn't match any Amazon listing.
                      </p>
                      <div className="mt-4">
                        <a
                          href={`https://www.amazon.${marketplace === 'uk' ? 'co.uk' : 'com'}/s?k=${book.isbn.replace(/-/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-primary hover:underline font-medium"
                        >
                          Search on Amazon ({marketplace.toUpperCase()}) →
                        </a>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="similar" className="space-y-4 mt-4">
            {!isAuthenticated ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <LogIn className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Discover Similar Books</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Sign in to explore personalized book recommendations and unlock the full experience
                  </p>
                </div>
                <Button 
                  onClick={() => {
                    onOpenChange(false);
                    navigate('/auth');
                  }}
                  className="gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  Sign in for full experience
                </Button>
              </div>
            ) : loadingSimilar ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : similarBooks.length > 0 ? (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <Package className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-lg">Books in {book.category}</h3>
                </div>
                <div className="grid gap-3">
                  {similarBooks.map((similar) => (
                    <SimilarBookCard
                      key={similar.id}
                      title={similar.title}
                      author={similar.author}
                      roi={similar.roi}
                      suggestedPrice={similar.suggestedPrice}
                      imageUrl={similar.imageUrl}
                      market_flag={similar.market_flag}
                      onClick={() => setSelectedSimilarBook(similar)}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No similar books found in {book.category}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {selectedSimilarBook && (
          <BookDetailsDialog
            book={selectedSimilarBook}
            open={!!selectedSimilarBook}
            onOpenChange={(open) => !open && setSelectedSimilarBook(null)}
            marketplace={marketplace}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BookDetailsDialog;

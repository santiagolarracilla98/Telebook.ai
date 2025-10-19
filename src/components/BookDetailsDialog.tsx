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
import { ShieldCheck, TrendingUp, Package, DollarSign, BarChart3, Loader2, LogIn, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import type { Book } from "@/data/mockBooks";
import SimilarBookCard from "./SimilarBookCard";
import { PricingEngineCalculator } from "./PricingEngineCalculator";

interface BookDetailsDialogProps {
  book: Book;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  marketplace?: 'usa' | 'uk' | 'both';
}

const BookDetailsDialog = ({ book, open, onOpenChange, marketplace = 'usa' }: BookDetailsDialogProps) => {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [selectedMarket, setSelectedMarket] = useState<'usa' | 'uk'>('usa');
  const [keepaData, setKeepaData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [similarBooks, setSimilarBooks] = useState<Book[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [selectedSimilarBook, setSelectedSimilarBook] = useState<Book | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [liveAmazonPrices, setLiveAmazonPrices] = useState<{
    usa: number | null;
    uk: number | null;
  }>({ usa: null, uk: null });
  const [priceDataSource, setPriceDataSource] = useState<{
    usa: string | null;
    uk: string | null;
  }>({ usa: null, uk: null });

  // Function to strip HTML tags from description
  const stripHtmlTags = (html: string) => {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  };

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

  const savePriceToDatabase = async (livePrice: number) => {
    try {
      const { error } = await supabase
        .from('books')
        .update({
          amazon_price: livePrice,
          last_price_check: new Date().toISOString()
        })
        .eq('id', book.id);

      if (error) {
        console.error('Error saving price to database:', error);
      } else {
        console.log(`✅ Saved live price $${livePrice} to database`);
      }
    } catch (err) {
      console.error('Error updating book price:', err);
    }
  };

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
      // Helper function to extract price from Keepa product data
      const extractPrice = (product: any): number | null => {
        if (product?.csv?.[0]) {
          const priceValue = product.csv[0][product.csv[0].length - 1];
          if (priceValue > 0) {
            return priceValue / 100;
          }
        }
        return null;
      };

      // Helper function to fetch data for a single market with fallback
      const fetchMarketData = async (market: 'usa' | 'uk') => {
        const identifier = market === 'usa' ? (book.us_asin || book.isbn) : (book.uk_asin || book.isbn);
        
        console.log(`🔍 Layer 1: Trying Keepa with ${identifier} for ${market.toUpperCase()}`);
        
        // Layer 1: Try keepa-product with ISBN/ASIN
        const keepaResponse = await supabase.functions.invoke('keepa-product', {
          body: { isbn: identifier, marketplace: market }
        });
        
        let productData = keepaResponse.data;
        let price = extractPrice(productData?.products?.[0]);
        let dataSource = 'keepa-isbn';
        
        // Layer 2: If no data found, try search-amazon-product with title + author
        if (!price && book.title && book.author) {
          console.log(`🔍 Layer 2: No price from ISBN, trying title search for ${market.toUpperCase()}`);
          
          const searchResponse = await supabase.functions.invoke('search-amazon-product', {
            body: { 
              title: book.title,
              author: book.author,
              marketplace: market
            }
          });
          
          // Layer 3: If search found an ASIN, try keepa-product with that ASIN
          const foundAsin = searchResponse.data?.bestMatch?.asin || searchResponse.data?.asins?.[0];
          if (foundAsin) {
            console.log(`🔍 Layer 3: Found ASIN ${foundAsin}, fetching price data for ${market.toUpperCase()}`);
            
            const asinKeepaResponse = await supabase.functions.invoke('keepa-product', {
              body: { isbn: foundAsin, marketplace: market }
            });
            
            productData = asinKeepaResponse.data;
            price = extractPrice(productData?.products?.[0]);
            dataSource = 'keepa-search';
            
            if (price) {
              console.log(`✅ Found price via search: ${market === 'usa' ? '$' : '£'}${price} (${market.toUpperCase()})`);
            }
          }
        }
        
        if (price) {
          console.log(`✅ Live Amazon ${market.toUpperCase()} price: ${market === 'usa' ? '$' : '£'}${price} (source: ${dataSource})`);
        } else {
          console.log(`❌ No price found for ${market.toUpperCase()}`);
        }
        
        return { productData, price, dataSource };
      };

      // Fetch both markets in parallel
      const [usaResult, ukResult] = await Promise.all([
        fetchMarketData('usa'),
        fetchMarketData('uk')
      ]);
      
      // Combine the data from both marketplaces
      const combinedData = {
        usa: usaResult.productData,
        uk: ukResult.productData,
        marketplace: 'both'
      };
      setKeepaData(combinedData);
      
      // Set prices and data sources
      setLiveAmazonPrices({ 
        usa: usaResult.price, 
        uk: ukResult.price 
      });
      setPriceDataSource({
        usa: usaResult.dataSource,
        uk: ukResult.dataSource
      });
      
      // Save prices to database (prioritize market with data)
      if (usaResult.price || ukResult.price) {
        await savePriceToDatabase(usaResult.price || ukResult.price || 0);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Could not load Amazon product data';
      setError(errorMessage);
      console.error('Keepa API error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Market-aware pricing calculations
  const cost = book.wholesale_price || book.wholesalePrice || book.publisher_rrp || 0;
  const currency = selectedMarket === 'uk' ? '£' : '$';
  const marketLabel = selectedMarket === 'uk' ? 'UK' : 'US';
  const liveAmazonPrice = selectedMarket === 'uk' ? liveAmazonPrices.uk : liveAmazonPrices.usa;
  const amazonPrice = liveAmazonPrice || book.amazon_price || book.amazonPrice || 0;
  
  // Fee structure varies by market
  const feePercentage = selectedMarket === 'uk' ? 0.15 : 0.15;
  const fixedFee = selectedMarket === 'uk' ? 2 : 3;
  const amazonFees = amazonPrice * feePercentage + fixedFee;
  
  // Calculate smart target price ensuring 20% ROI
  const minROI = 0.20;
  const targetPrice = (cost * (1 + minROI) + fixedFee) / (1 - feePercentage);
  
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
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl">{book.title}</DialogTitle>
              <DialogDescription className="text-base">
                by {book.author}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={selectedMarket === 'usa' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedMarket('usa')}
              >
                🇺🇸 US
              </Button>
              <Button
                variant={selectedMarket === 'uk' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedMarket('uk')}
              >
                🇬🇧 UK
              </Button>
              <Button 
                size="lg"
                onClick={() => addItem({
                  id: book.id,
                  title: book.title,
                  author: book.author,
                  imageUrl: book.imageUrl,
                  price: targetPrice,
                  isbn: book.isbn,
                })}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Add to Cart
              </Button>
            </div>
          </div>
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
                {book.description && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
                    <p className="text-sm line-clamp-6">{stripHtmlTags(book.description)}</p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-4 h-4 text-muted-foreground" />
                    <h4 className="text-sm font-medium">Cost (Publisher)</h4>
                  </div>
                  <p className="text-2xl font-bold">
                    {cost > 0 ? `${currency}${cost.toFixed(2)}` : 'NA'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {book.currency === 'GBP' ? 'UK Publisher' : 'US Publisher'}
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-primary/10">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    <h4 className="text-sm font-medium">Smart Price (20% ROI)</h4>
                  </div>
                  <p className="text-2xl font-bold text-primary">
                    {targetPrice > 0 ? `${currency}${targetPrice.toFixed(2)}` : 'Calculating...'}
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    <h4 className="text-sm font-medium">Amazon Price ({marketLabel})</h4>
                  </div>
                  <p className="text-2xl font-bold">
                    {liveAmazonPrice ? `${currency}${liveAmazonPrice.toFixed(2)}` : (amazonPrice > 0 ? `${currency}${amazonPrice.toFixed(2)}` : 'NA')}
                  </p>
                  {liveAmazonPrice ? (
                    <p className="text-xs text-success mt-1">
                      ✓ Live from Amazon {marketLabel}
                      {priceDataSource[selectedMarket] === 'keepa-search' && ' (via title search)'}
                    </p>
                  ) : (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground">No live data found</p>
                      <a 
                        href={`https://www.amazon.${selectedMarket === 'uk' ? 'co.uk' : 'com'}/s?k=${encodeURIComponent(book.isbn || book.title)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        Search on Amazon {marketLabel} →
                      </a>
                    </div>
                  )}
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
            {!isAuthenticated ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-semibold">Use the ROI Calculator</h3>
                  <p className="text-muted-foreground max-w-md">
                    Sign in to access the ROI Calculator with pre-filled data for this book and analyze your profit potential.
                  </p>
                </div>
                <Button 
                  size="lg"
                  onClick={() => navigate('/auth')}
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In to Continue
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-sm font-medium">
                    📊 Use the ROI Calculator below with this book's data pre-filled to calculate your exact profit potential.
                  </p>
                </div>
                <PricingEngineCalculator 
                  prefilledBook={{
                    title: book.title,
                    author: book.author,
                    isbn: book.isbn,
                    cost: cost,
                    smartPrice: targetPrice,
                    amazonPrice: liveAmazonPrice || amazonPrice,
                    id: book.id,
                    imageUrl: book.imageUrl
                  }}
                  marketplace={selectedMarket}
                  currency={currency}
                />
              </div>
            )}
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
                {(() => {
                  // Show only data for the selected market
                  const data = keepaData[selectedMarket];
                  const marketDisplayLabel = marketLabel;
                  
                  if (data?.products && data.products.length > 0 && data.products[0]) {
                    return (
                      <div className="p-4 rounded-lg border border-border">
                        <h3 className="font-semibold text-lg mb-3">Amazon Product Data ({marketDisplayLabel})</h3>
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
                                    {currency}{(priceValue / 100).toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="font-semibold text-muted-foreground">N/A</span>
                                );
                              })()}
                            </div>
                          )}
                          <div className="mt-4">
                            <a
                              href={`https://www.amazon.${selectedMarket === 'uk' ? 'co.uk' : 'com'}/dp/${data.products[0].asin || book.isbn.replace(/-/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-primary hover:underline font-medium"
                            >
                              View on Amazon ({marketDisplayLabel}) →
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div className="p-4 rounded-lg border border-border">
                        <h3 className="font-semibold text-lg mb-3">Amazon Product Data ({marketDisplayLabel})</h3>
                        <p className="text-muted-foreground mb-3">
                          No Amazon data found for ISBN: {book.isbn}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          This could mean the product is not available on Amazon {marketDisplayLabel}, or the ISBN doesn't match any Amazon listing.
                        </p>
                        <div className="mt-4">
                          <a
                            href={`https://www.amazon.${selectedMarket === 'uk' ? 'co.uk' : 'com'}/s?k=${book.isbn.replace(/-/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-primary hover:underline font-medium"
                          >
                            Search on Amazon {marketDisplayLabel} →
                          </a>
                        </div>
                      </div>
                    );
                  }
                })()}
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

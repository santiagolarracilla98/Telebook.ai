import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, TrendingUp, Package, DollarSign, BarChart3, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Book } from "@/data/mockBooks";

interface BookDetailsDialogProps {
  book: Book;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  marketplace?: 'usa' | 'uk' | 'both';
}

const BookDetailsDialog = ({ book, open, onOpenChange, marketplace = 'usa' }: BookDetailsDialogProps) => {
  const [keepaData, setKeepaData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && book.isbn) {
      fetchKeepaData();
    }
  }, [open, book.isbn, marketplace]);

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

  const profit = book.suggestedPrice - book.wholesalePrice;
  const amazonFees = book.suggestedPrice * 0.15; // Approximate 15% Amazon fee
  const netProfit = profit - amazonFees;
  const netRoi = ((netProfit / book.wholesalePrice) * 100).toFixed(1);

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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="pricing">Pricing Analysis</TabsTrigger>
            <TabsTrigger value="amazon">Amazon Live Data</TabsTrigger>
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
                    <h4 className="text-sm font-medium">Wholesale Price</h4>
                  </div>
                  <p className="text-2xl font-bold">${book.wholesalePrice.toFixed(2)}</p>
                </div>

                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <h4 className="text-sm font-medium">Smart Price</h4>
                  </div>
                  <p className="text-2xl font-bold text-primary">${book.suggestedPrice.toFixed(2)}</p>
                </div>

                <div className="p-4 rounded-lg bg-success/10">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-success" />
                    <h4 className="text-sm font-medium">Expected ROI</h4>
                  </div>
                  <p className="text-2xl font-bold text-success">{book.roi}%</p>
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
              <div className="p-4 rounded-lg border border-border space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-lg">Cost Breakdown</h3>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-muted-foreground">Wholesale Cost</span>
                    <span className="font-semibold">${book.wholesalePrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-muted-foreground">Smart Price (Your Price)</span>
                    <span className="font-semibold text-primary">${book.suggestedPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-muted-foreground">Amazon Current Price</span>
                    <span className="font-semibold">${book.amazonPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-muted-foreground">Gross Profit</span>
                    <span className="font-semibold text-success">${profit.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-muted-foreground">Est. Amazon Fees (15%)</span>
                    <span className="font-semibold text-warning">-${amazonFees.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 bg-success/10 px-3 rounded-lg mt-2">
                    <span className="font-semibold">Net Profit</span>
                    <span className="font-bold text-success text-lg">${netProfit.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 bg-primary/10 px-3 rounded-lg">
                    <span className="font-semibold">Net ROI</span>
                    <span className="font-bold text-primary text-lg">{netRoi}%</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-medium mb-2">Price Positioning</h4>
                <p className="text-sm text-muted-foreground">
                  Your Smart Price is ${(book.amazonPrice - book.suggestedPrice).toFixed(2)} below Amazon's current price,
                  giving you a competitive edge while maintaining a strong {netRoi}% net ROI.
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
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default BookDetailsDialog;

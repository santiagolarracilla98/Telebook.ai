import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface GenreStats {
  category: string;
  avgRoi: number;
  avgPrice: number;
  bookCount: number;
}

const GenreAnalytics = () => {
  const [stats, setStats] = useState<GenreStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGenreStats();
  }, []);

  const fetchGenreStats = async () => {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('category, publisher_rrp, amazon_price, wholesale_price');

      if (error) throw error;

      // Aggregate data by category
      const categoryMap = new Map<string, { prices: number[], rois: number[], count: number }>();

      data?.forEach(book => {
        const category = book.category || 'Uncategorized';
        const publisherPrice = book.publisher_rrp || book.wholesale_price;
        const amazonPrice = book.amazon_price || 0;
        
        if (!categoryMap.has(category)) {
          categoryMap.set(category, { prices: [], rois: [], count: 0 });
        }

        const categoryData = categoryMap.get(category)!;
        categoryData.count++;

        if (amazonPrice > 0) {
          categoryData.prices.push(amazonPrice);
          
          // Calculate ROI
          if (publisherPrice > 0) {
            const margin = amazonPrice - (amazonPrice * 0.15) - publisherPrice;
            const roi = (margin / publisherPrice) * 100;
            categoryData.rois.push(roi);
          }
        }
      });

      // Convert to array and calculate averages
      const genreStats: GenreStats[] = Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        avgRoi: data.rois.length > 0 
          ? data.rois.reduce((sum, roi) => sum + roi, 0) / data.rois.length 
          : 0,
        avgPrice: data.prices.length > 0 
          ? data.prices.reduce((sum, price) => sum + price, 0) / data.prices.length 
          : 0,
        bookCount: data.count,
      }));

      // Sort by ROI descending
      genreStats.sort((a, b) => b.avgRoi - a.avgRoi);

      setStats(genreStats);
    } catch (error) {
      console.error('Error fetching genre stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  if (stats.length === 0) {
    return null;
  }

  const topGenres = stats.slice(0, 5);

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <CardTitle>Genre Performance Analytics</CardTitle>
        </div>
        <CardDescription>
          Top performing categories by average ROI
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {topGenres.map((genre, index) => (
            <div 
              key={genre.category}
              className="p-4 rounded-lg border border-border bg-card hover:bg-accent/5 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <Badge variant="outline" className="text-xs">
                  #{index + 1}
                </Badge>
                {genre.avgRoi > 20 && (
                  <TrendingUp className="w-4 h-4 text-success" />
                )}
              </div>
              <h4 className="font-semibold text-sm mb-3 line-clamp-2">
                {genre.category}
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Avg ROI</span>
                  <span className="font-semibold text-success">
                    {genre.avgRoi.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Avg Price</span>
                  <span className="font-semibold">
                    ${genre.avgPrice.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex items-center gap-1">
                    <Package className="w-3 h-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Books</span>
                  </div>
                  <span className="font-semibold">
                    {genre.bookCount}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default GenreAnalytics;

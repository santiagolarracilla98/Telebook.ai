import { useState, useEffect } from "react";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface AmazonPriceSparklineProps {
  asin?: string;
  isbn?: string;
  market: "US" | "UK";
  className?: string;
  height?: number;
  showLegend?: boolean;
  line?: "buyBox" | "lowestNew" | "lowestUsed";
}

interface PricePoint {
  t: string;
  price: number;
}

interface PriceData {
  asin: string;
  currency: string;
  series: {
    buyBox: PricePoint[];
    lowestNew: PricePoint[];
    lowestUsed: PricePoint[];
  };
  current: {
    buyBox: number | null;
    lowestNew: number | null;
    lowestUsed: number | null;
  };
}

export const AmazonPriceSparkline = ({
  asin,
  isbn,
  market,
  className = "",
  height = 48,
  showLegend = false,
  line = "buyBox",
}: AmazonPriceSparklineProps) => {
  const [data, setData] = useState<PriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPriceHistory = async () => {
      if (!asin && !isbn) {
        setError("No ASIN or ISBN provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data: priceData, error: functionError } = await supabase.functions.invoke(
          'keepa-price-history',
          {
            body: { asin, isbn, market }
          }
        );

        if (functionError) {
          throw new Error(functionError.message || 'Failed to fetch price history');
        }

        if (priceData?.error) {
          throw new Error(priceData.error);
        }

        setData(priceData);
      } catch (err) {
        console.error('Error fetching price history:', err);
        setError(err instanceof Error ? err.message : 'Failed to load price history');
      } finally {
        setLoading(false);
      }
    };

    fetchPriceHistory();
  }, [asin, isbn, market]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <span className="text-xs text-muted-foreground">No price history</span>
      </div>
    );
  }

  const series = data.series[line];
  
  if (!series || series.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <span className="text-xs text-muted-foreground">No data available</span>
      </div>
    );
  }

  // Convert price from cents to currency units
  const chartData = series.map(point => ({
    date: new Date(point.t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    fullDate: new Date(point.t).toLocaleString(),
    timestamp: new Date(point.t).getTime(),
    price: point.price / 100
  }));

  const currentPrice = data.current[line];
  const currencySymbol = data.currency === 'GBP' ? '£' : '$';
  
  // Show axes only if height is sufficient (not for mini sparklines)
  const showAxes = height >= 100;

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          {showAxes && (
            <>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                dataKey="date"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))" }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickFormatter={(value) => `${currencySymbol}${value.toFixed(0)}`}
                width={45}
              />
            </>
          )}
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const value = typeof payload[0].value === 'number' ? payload[0].value : parseFloat(payload[0].value as string);
                return (
                  <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                    <p className="text-xs text-muted-foreground">{payload[0].payload.fullDate}</p>
                    <p className="text-sm font-semibold">
                      {currencySymbol}{value.toFixed(2)}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            animationDuration={300}
          />
        </LineChart>
      </ResponsiveContainer>
      {showLegend && currentPrice !== null && (
        <div className="flex items-center justify-between mt-1 text-xs">
          <span className="text-muted-foreground">
            {line === 'buyBox' ? 'Buy Box' : line === 'lowestNew' ? 'Lowest New' : 'Lowest Used'}
          </span>
          <span className="font-semibold">
            Now: {currencySymbol}{(currentPrice / 100).toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
};

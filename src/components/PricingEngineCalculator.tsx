import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Calculator, TrendingUp } from "lucide-react";

const genres = [
  "Fiction",
  "Non-Fiction",
  "Business",
  "Self-Help",
  "Science Fiction",
  "Mystery",
  "Romance",
  "Children's Books",
  "Biography",
  "Technology"
];

// Mock Amazon data for different genres
const mockAmazonData = {
  "Fiction": [
    { priceRange: "$10-15", count: 320, avgMargin: 35 },
    { priceRange: "$15-20", count: 480, avgMargin: 38 },
    { priceRange: "$20-25", count: 290, avgMargin: 42 },
    { priceRange: "$25-30", count: 150, avgMargin: 40 },
  ],
  "Non-Fiction": [
    { priceRange: "$10-15", count: 250, avgMargin: 32 },
    { priceRange: "$15-20", count: 420, avgMargin: 36 },
    { priceRange: "$20-25", count: 380, avgMargin: 40 },
    { priceRange: "$25-30", count: 200, avgMargin: 43 },
  ],
  "Business": [
    { priceRange: "$15-20", count: 180, avgMargin: 38 },
    { priceRange: "$20-25", count: 340, avgMargin: 42 },
    { priceRange: "$25-30", count: 290, avgMargin: 45 },
    { priceRange: "$30-35", count: 160, avgMargin: 44 },
  ],
  "Self-Help": [
    { priceRange: "$10-15", count: 290, avgMargin: 34 },
    { priceRange: "$15-20", count: 450, avgMargin: 37 },
    { priceRange: "$20-25", count: 310, avgMargin: 41 },
    { priceRange: "$25-30", count: 140, avgMargin: 39 },
  ],
  "Science Fiction": [
    { priceRange: "$12-17", count: 340, avgMargin: 36 },
    { priceRange: "$17-22", count: 420, avgMargin: 39 },
    { priceRange: "$22-27", count: 260, avgMargin: 41 },
    { priceRange: "$27-32", count: 120, avgMargin: 38 },
  ],
  "Mystery": [
    { priceRange: "$10-15", count: 310, avgMargin: 35 },
    { priceRange: "$15-20", count: 470, avgMargin: 38 },
    { priceRange: "$20-25", count: 280, avgMargin: 40 },
    { priceRange: "$25-30", count: 130, avgMargin: 37 },
  ],
  "Romance": [
    { priceRange: "$8-12", count: 380, avgMargin: 33 },
    { priceRange: "$12-16", count: 520, avgMargin: 36 },
    { priceRange: "$16-20", count: 290, avgMargin: 38 },
    { priceRange: "$20-24", count: 140, avgMargin: 35 },
  ],
  "Children's Books": [
    { priceRange: "$8-12", count: 420, avgMargin: 40 },
    { priceRange: "$12-16", count: 540, avgMargin: 43 },
    { priceRange: "$16-20", count: 310, avgMargin: 45 },
    { priceRange: "$20-24", count: 160, avgMargin: 42 },
  ],
  "Biography": [
    { priceRange: "$15-20", count: 260, avgMargin: 37 },
    { priceRange: "$20-25", count: 390, avgMargin: 40 },
    { priceRange: "$25-30", count: 310, avgMargin: 43 },
    { priceRange: "$30-35", count: 170, avgMargin: 41 },
  ],
  "Technology": [
    { priceRange: "$25-35", count: 220, avgMargin: 42 },
    { priceRange: "$35-45", count: 340, avgMargin: 45 },
    { priceRange: "$45-55", count: 280, avgMargin: 48 },
    { priceRange: "$55-65", count: 150, avgMargin: 46 },
  ],
};

export const PricingEngineCalculator = () => {
  const [genre, setGenre] = useState<string>("Fiction");
  const [wholesalePrice, setWholesalePrice] = useState<string>("12.00");
  const [shippingCost, setShippingCost] = useState<string>("2.50");
  const [handlingFee, setHandlingFee] = useState<string>("1.00");
  const [targetMargin, setTargetMargin] = useState<string>("40");

  const calculatePricing = () => {
    const wholesale = parseFloat(wholesalePrice) || 0;
    const shipping = parseFloat(shippingCost) || 0;
    const handling = parseFloat(handlingFee) || 0;
    const margin = parseFloat(targetMargin) || 0;

    const totalCost = wholesale + shipping + handling;
    const retailPrice = totalCost / (1 - margin / 100);
    const profit = retailPrice - totalCost;
    const actualMargin = (profit / retailPrice) * 100;

    return {
      totalCost: totalCost.toFixed(2),
      retailPrice: retailPrice.toFixed(2),
      profit: profit.toFixed(2),
      actualMargin: actualMargin.toFixed(1),
    };
  };

  const pricing = calculatePricing();
  const amazonData = mockAmazonData[genre as keyof typeof mockAmazonData] || mockAmazonData["Fiction"];

  return (
    <section id="pricing-engine" className="py-16 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <Calculator className="h-8 w-8 text-primary" />
            <h2 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Pricing Engine Calculator
            </h2>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Calculate optimal pricing for your books based on genre, costs, and Amazon market data
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {/* Calculator Card */}
          <Card className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="genre">Book Genre</Label>
                <Select value={genre} onValueChange={setGenre}>
                  <SelectTrigger id="genre">
                    <SelectValue placeholder="Select genre" />
                  </SelectTrigger>
                  <SelectContent>
                    {genres.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="wholesale">Wholesale Price ($)</Label>
                <Input
                  id="wholesale"
                  type="number"
                  step="0.01"
                  value={wholesalePrice}
                  onChange={(e) => setWholesalePrice(e.target.value)}
                  placeholder="12.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shipping">Shipping Cost ($)</Label>
                <Input
                  id="shipping"
                  type="number"
                  step="0.01"
                  value={shippingCost}
                  onChange={(e) => setShippingCost(e.target.value)}
                  placeholder="2.50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="handling">Handling Fee ($)</Label>
                <Input
                  id="handling"
                  type="number"
                  step="0.01"
                  value={handlingFee}
                  onChange={(e) => setHandlingFee(e.target.value)}
                  placeholder="1.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="margin">Target Margin (%)</Label>
                <Input
                  id="margin"
                  type="number"
                  step="1"
                  value={targetMargin}
                  onChange={(e) => setTargetMargin(e.target.value)}
                  placeholder="40"
                />
              </div>
            </div>

            <div className="pt-4 border-t space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Cost:</span>
                <span className="font-semibold">${pricing.totalCost}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Suggested Retail Price:</span>
                <span className="font-semibold text-lg text-primary">${pricing.retailPrice}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Profit per Book:</span>
                <span className="font-semibold text-green-600">${pricing.profit}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Actual Margin:</span>
                <span className="font-semibold">{pricing.actualMargin}%</span>
              </div>
            </div>
          </Card>

          {/* Market Analysis Card */}
          <Card className="p-6 space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="text-xl font-semibold">Amazon Market Analysis - {genre}</h3>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium mb-3 text-muted-foreground">Price Distribution</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={amazonData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="priceRange" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px'
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" name="Number of Books" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-3 text-muted-foreground">Average Margins by Price Range</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={amazonData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="priceRange" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px'
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="avgMargin" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      name="Avg Margin (%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Market Insight:</strong> Based on Amazon data for {genre} books, 
                  the sweet spot appears to be in the {amazonData[1]?.priceRange || "$15-20"} range 
                  with an average margin of {amazonData[1]?.avgMargin || 38}%.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};
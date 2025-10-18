import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload } from "lucide-react";

interface Book {
  id: string;
  title: string;
  author: string;
  us_asin: string | null;
  uk_asin: string | null;
  publisher_rrp: number | null;
  currency: string | null;
}

export const ManualPriceEntry = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingBook, setEditingBook] = useState<string | null>(null);
  const [priceValue, setPriceValue] = useState("");
  const [currencyValue, setCurrencyValue] = useState("GBP");
  const { toast } = useToast();

  const fetchBooksWithoutPrices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("books")
        .select("id, title, author, us_asin, uk_asin, publisher_rrp, currency")
        .is("publisher_rrp", null)
        .order("title")
        .limit(100);

      if (error) throw error;

      setBooks(data || []);
      toast({
        title: "Books loaded",
        description: `Found ${data?.length || 0} books without publisher prices`,
      });
    } catch (error: any) {
      toast({
        title: "Error loading books",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSavePrice = async (bookId: string) => {
    if (!priceValue || isNaN(parseFloat(priceValue))) {
      toast({
        title: "Invalid price",
        description: "Please enter a valid number",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("books")
        .update({
          publisher_rrp: parseFloat(priceValue),
          currency: currencyValue,
        })
        .eq("id", bookId);

      if (error) throw error;

      toast({
        title: "Price updated",
        description: "Publisher price has been set successfully",
      });

      setBooks(books.filter(b => b.id !== bookId));
      setEditingBook(null);
      setPriceValue("");
    } catch (error: any) {
      toast({
        title: "Error updating price",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const text = await file.text();
      const rows = text.split("\n").slice(1); // Skip header
      let updated = 0;

      for (const row of rows) {
        const [isbn, price, currency] = row.split(",").map(s => s.trim());
        if (!isbn || !price) continue;

        const { error } = await supabase
          .from("books")
          .update({
            publisher_rrp: parseFloat(price),
            currency: currency || "GBP",
          })
          .or(`us_asin.eq.${isbn},uk_asin.eq.${isbn}`);

        if (!error) updated++;
      }

      toast({
        title: "CSV imported",
        description: `Successfully updated ${updated} books`,
      });

      fetchBooksWithoutPrices();
    } catch (error: any) {
      toast({
        title: "Error importing CSV",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manual Price Entry</CardTitle>
        <CardDescription>
          Set publisher prices for books that couldn't be found via APIs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={fetchBooksWithoutPrices} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Load Books Without Prices
          </Button>

          <div className="relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVImport}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={loading}
            />
            <Button variant="outline" disabled={loading}>
              <Upload className="mr-2 h-4 w-4" />
              Import CSV (ISBN, Price, Currency)
            </Button>
          </div>
        </div>

        {books.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {books.length} books found without publisher prices
            </p>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {books.map((book) => (
                <Card key={book.id}>
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <div>
                        <p className="font-medium">{book.title}</p>
                        <p className="text-sm text-muted-foreground">{book.author}</p>
                        <p className="text-xs text-muted-foreground">
                          ISBN: {book.uk_asin || book.us_asin || "N/A"}
                        </p>
                      </div>

                      {editingBook === book.id ? (
                        <div className="flex gap-2 items-end">
                          <div className="flex-1">
                            <Label htmlFor={`price-${book.id}`}>Price</Label>
                            <Input
                              id={`price-${book.id}`}
                              type="number"
                              step="0.01"
                              value={priceValue}
                              onChange={(e) => setPriceValue(e.target.value)}
                              placeholder="0.00"
                            />
                          </div>
                          <div className="w-32">
                            <Label htmlFor={`currency-${book.id}`}>Currency</Label>
                            <Select value={currencyValue} onValueChange={setCurrencyValue}>
                              <SelectTrigger id={`currency-${book.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="GBP">GBP</SelectItem>
                                <SelectItem value="USD">USD</SelectItem>
                                <SelectItem value="EUR">EUR</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button onClick={() => handleSavePrice(book.id)} disabled={loading}>
                            Save
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setEditingBook(null);
                              setPriceValue("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingBook(book.id);
                            setPriceValue("");
                            setCurrencyValue(book.currency || "GBP");
                          }}
                        >
                          Set Price
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

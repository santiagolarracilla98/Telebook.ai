import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Upload, 
  Download, 
  RefreshCw, 
  Database, 
  TrendingUp,
  BookOpen,
  Package,
  DollarSign,
  LogOut,
  Loader2
} from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface Dataset {
  id: string;
  name: string;
  source: string;
  created_at: string;
  created_by: string;
}

interface Book {
  id: string;
  title: string;
  author: string;
  available_stock: number;
  wholesale_price: number;
  rrp: number;
  publisher_rrp?: number;
  amazon_price?: number;
  roi_target_price?: number;
  market_flag?: string;
  dataset_id?: string;
}

const HostDashboardNew = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [loading, setLoading] = useState(true);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState({
    totalBooks: 0,
    totalStock: 0,
    inventoryValue: 0,
    avgRoi: 0
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        navigate('/host-auth');
        return;
      }

      setUser(session.user);

      // Check if user has host role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();

      if (roleError || roleData?.role !== 'host') {
        toast({
          title: "Access Denied",
          description: "You need host privileges to access this dashboard.",
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      setIsHost(true);
      await Promise.all([fetchDatasets(), fetchBooks(), fetchStats()]);
    } catch (error) {
      console.error('Auth check error:', error);
      navigate('/host-auth');
    } finally {
      setLoading(false);
    }
  };

  const fetchDatasets = async () => {
    const { data, error } = await supabase
      .from('datasets')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setDatasets(data);
    }
  };

  const fetchBooks = async () => {
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .order('title');

    if (!error && data) {
      setBooks(data);
    }
  };

  const fetchStats = async () => {
    const { data, error } = await supabase
      .from('books')
      .select('available_stock, wholesale_price, publisher_rrp, amazon_price');

    if (!error && data) {
      const totalBooks = data.length;
      const totalStock = data.reduce((sum, book) => sum + book.available_stock, 0);
      const inventoryValue = data.reduce((sum, book) => 
        sum + (book.wholesale_price * book.available_stock), 0
      );
      
      // Calculate average ROI
      const rois = data
        .filter(book => book.publisher_rrp && book.amazon_price)
        .map(book => {
          const fee = (book.amazon_price || 0) * 0.15;
          const margin = (book.amazon_price || 0) - fee - (book.publisher_rrp || 0);
          return (book.publisher_rrp || 0) > 0 ? (margin / (book.publisher_rrp || 0)) * 100 : 0;
        });
      
      const avgRoi = rois.length > 0 
        ? rois.reduce((sum, roi) => sum + roi, 0) / rois.length 
        : 0;

      setStats({
        totalBooks,
        totalStock,
        inventoryValue,
        avgRoi
      });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleSyncPublisherAPIs = async () => {
    setSyncing(true);
    try {
      toast({
        title: "Syncing Publisher Data",
        description: "Fetching prices from publisher APIs...",
      });

      await supabase.functions.invoke('fetch-publisher-prices');
      await supabase.functions.invoke('fetch-amazon-prices');
      await supabase.functions.invoke('calc-unit-econ', {
        body: { roiTarget: 0.20 }
      });

      toast({
        title: "Sync Complete",
        description: "All pricing data has been updated.",
      });

      await Promise.all([fetchBooks(), fetchStats()]);
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: "Sync Failed",
        description: "There was an error syncing publisher data.",
        variant: "destructive"
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleExportCSV = () => {
    const csv = [
      ['Title', 'Author', 'ISBN', 'Stock', 'Wholesale', 'Publisher RRP', 'Amazon Price', 'Target Price', 'Market Flag'].join(','),
      ...books.map(book => [
        `"${book.title}"`,
        `"${book.author}"`,
        book.id,
        book.available_stock,
        book.wholesale_price,
        book.publisher_rrp || '',
        book.amazon_price || '',
        book.roi_target_price || '',
        book.market_flag || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `books-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Your book data has been exported to CSV.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!isHost) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Telebook Host Dashboard</h1>
                <p className="text-sm text-muted-foreground">Manage your book inventory</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => navigate('/')}>
                View Public Site
              </Button>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="books">Books</TabsTrigger>
            <TabsTrigger value="datasets">Datasets</TabsTrigger>
            <TabsTrigger value="sync">Sync & Import</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Books</CardTitle>
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalBooks}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
                  <Package className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalStock}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${stats.inventoryValue.toFixed(2)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Avg ROI</CardTitle>
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.avgRoi.toFixed(1)}%</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Books Tab */}
          <TabsContent value="books">
            <Card>
              <CardHeader>
                <CardTitle>Book Inventory</CardTitle>
                <CardDescription>Manage your book catalog and pricing</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Wholesale</TableHead>
                      <TableHead>Amazon</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Flag</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {books.map((book) => (
                      <TableRow key={book.id}>
                        <TableCell className="font-medium">{book.title}</TableCell>
                        <TableCell>{book.author}</TableCell>
                        <TableCell>{book.available_stock}</TableCell>
                        <TableCell>${book.wholesale_price.toFixed(2)}</TableCell>
                        <TableCell>${book.amazon_price?.toFixed(2) || 'N/A'}</TableCell>
                        <TableCell>${book.roi_target_price?.toFixed(2) || 'N/A'}</TableCell>
                        <TableCell>
                          {book.market_flag && (
                            <Badge variant={
                              book.market_flag === 'below_market' ? 'destructive' :
                              book.market_flag === 'at_market' ? 'secondary' : 'default'
                            }>
                              {book.market_flag.replace('_', ' ')}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Datasets Tab */}
          <TabsContent value="datasets">
            <Card>
              <CardHeader>
                <CardTitle>Datasets</CardTitle>
                <CardDescription>View all uploaded and API-imported datasets</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {datasets.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No datasets yet. Upload your first dataset or sync with publisher APIs.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {datasets.map((dataset) => (
                        <div key={dataset.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <h4 className="font-medium">{dataset.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              Source: {dataset.source} • Created: {new Date(dataset.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant={dataset.source === 'upload' ? 'outline' : 'default'}>
                            {dataset.source}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sync & Import Tab */}
          <TabsContent value="sync" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Publisher API Sync</CardTitle>
                <CardDescription>
                  Fetch pricing data from Bowker, Nielsen, and other publisher APIs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={handleSyncPublisherAPIs} 
                  disabled={syncing}
                  className="w-full"
                >
                  {syncing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sync Publisher APIs
                    </>
                  )}
                </Button>
                <p className="text-sm text-muted-foreground">
                  This will fetch wholesale prices from publisher APIs, Amazon prices, and calculate unit economics for all books.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Export Data</CardTitle>
                <CardDescription>Download your book inventory as CSV</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleExportCSV} variant="outline" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download CSV Export
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Import CSV</CardTitle>
                <CardDescription>Upload a CSV file to add new books</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="csv-upload">CSV File</Label>
                    <Input 
                      id="csv-upload" 
                      type="file" 
                      accept=".csv"
                      className="mt-2"
                    />
                  </div>
                  <Button variant="outline" className="w-full" disabled>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload CSV (Coming Soon)
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default HostDashboardNew;

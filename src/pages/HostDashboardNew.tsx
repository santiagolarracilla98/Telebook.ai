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
  Loader2,
  Trash2
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { DeleteDatasetDialog } from "@/components/DeleteDatasetDialog";

interface Dataset {
  id: string;
  name: string;
  source: 'manual_upload' | 'google_books' | 'bowker_api' | 'onix_feed' | 'keepa_import' | 'isbndb';
  created_at: string;
  created_by: string;
  is_active: boolean;
  book_count: number;
  metadata?: any;
  last_synced_at?: string;
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
  const [importing, setImporting] = useState(false);
  const [googleQuery, setGoogleQuery] = useState('');
  const [googleMaxResults, setGoogleMaxResults] = useState(40);
  const [googleDatasetName, setGoogleDatasetName] = useState('');
  const [isbndbQuery, setIsbndbQuery] = useState('');
  const [isbndbPageSize, setIsbndbPageSize] = useState(20);
  const [isbndbDatasetName, setIsbndbDatasetName] = useState('');
  const [stats, setStats] = useState({
    totalBooks: 0,
    totalStock: 0,
    inventoryValue: 0,
    avgRoi: 0
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [datasetToDelete, setDatasetToDelete] = useState<Dataset | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  // Handle session expiry globally
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
        navigate('/host-auth');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const checkAuth = async () => {
    try {
      setLoading(true);
      // Refresh session to ensure it's valid
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
      
      if (sessionError || !session?.user) {
        console.error("Session validation failed:", sessionError);
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
        console.error("Error checking role:", roleError);
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
      .order('is_active', { ascending: false })
      .order('created_at', { ascending: false });

    if (!error && data) {
      setDatasets(data);
    }
  };

  const toggleDatasetActive = async (datasetId: string, currentState: boolean) => {
    const { error } = await supabase
      .from('datasets')
      .update({ is_active: !currentState })
      .eq('id', datasetId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update dataset status.",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Dataset Updated",
        description: `Dataset ${!currentState ? 'activated' : 'deactivated'} successfully.`,
      });
      await Promise.all([fetchDatasets(), fetchBooks(), fetchStats()]);
    }
  };

  const handleDeleteDataset = async () => {
    if (!datasetToDelete) return;

    try {
      // First delete all books in the dataset
      const { error: booksError } = await supabase
        .from('books')
        .delete()
        .eq('dataset_id', datasetToDelete.id);

      if (booksError) throw booksError;

      // Then delete the dataset
      const { error: datasetError } = await supabase
        .from('datasets')
        .delete()
        .eq('id', datasetToDelete.id);

      if (datasetError) throw datasetError;

      toast({
        title: "Dataset Deleted",
        description: `Successfully deleted "${datasetToDelete.name}" and all associated books.`,
      });

      await Promise.all([fetchDatasets(), fetchBooks(), fetchStats()]);
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete Failed",
        description: "There was an error deleting the dataset.",
        variant: "destructive"
      });
    }
  };

  const openDeleteDialog = (dataset: Dataset) => {
    setDatasetToDelete(dataset);
    setDeleteDialogOpen(true);
  };

  const handleImportGoogleBooks = async () => {
    // Force refresh session to ensure it's valid
    const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
    
    if (sessionError || !session) {
      toast({
        title: "Session Expired",
        description: "Please sign in again to import books.",
        variant: "destructive"
      });
      navigate('/host-auth');
      return;
    }

    if (!googleQuery.trim()) {
      toast({
        title: "Query Required",
        description: "Please enter a search query.",
        variant: "destructive"
      });
      return;
    }

    setImporting(true);
    try {
      toast({
        title: "Importing from Google Books",
        description: "Searching and importing books...",
      });

      const { data, error } = await supabase.functions.invoke('import-google-books', {
        body: {
          query: googleQuery,
          maxResults: googleMaxResults,
          territory: 'GB',
          datasetName: googleDatasetName || `Google Books - ${googleQuery}`
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      toast({
        title: "Import Complete",
        description: `Imported ${data.books_imported} books from Google Books API`,
      });

      setGoogleQuery('');
      setGoogleDatasetName('');
      await Promise.all([fetchDatasets(), fetchBooks(), fetchStats()]);
      
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: error.message || "There was an error importing books.",
        variant: "destructive"
      });
    } finally {
      setImporting(false);
    }
  };

  const handleImportISBNdb = async () => {
    // Force refresh session to ensure it's valid
    const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
    
    if (sessionError || !session) {
      toast({
        title: "Session Expired",
        description: "Please sign in again to import books.",
        variant: "destructive"
      });
      navigate('/host-auth');
      return;
    }

    if (!isbndbQuery.trim()) {
      toast({
        title: "Query Required",
        description: "Please enter a search query.",
        variant: "destructive"
      });
      return;
    }

    setImporting(true);
    try {
      toast({
        title: "Importing from ISBNdb",
        description: "Searching and importing books...",
      });

      const { data, error } = await supabase.functions.invoke('import-isbndb', {
        body: {
          query: isbndbQuery,
          pageSize: isbndbPageSize,
          territory: 'GB',
          datasetName: isbndbDatasetName || `ISBNdb - ${isbndbQuery}`
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      const skippedMsg = data.skipped_duplicates > 0 
        ? ` (${data.skipped_duplicates} skipped duplicates)` 
        : '';
      
      toast({
        title: "Import Complete",
        description: `Imported ${data.books_imported} books from ISBNdb API${skippedMsg}`,
      });

      setIsbndbQuery('');
      setIsbndbDatasetName('');
      await Promise.all([fetchDatasets(), fetchBooks(), fetchStats()]);
      
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: error.message || "There was an error importing books.",
        variant: "destructive"
      });
    } finally {
      setImporting(false);
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
        description: "Fetching prices from Google Books, ISBNdb, and publisher APIs...",
      });

      // Fetch publisher prices (Google Books → ISBNdb → Bowker → ONIX)
      const { data: pubData, error: pubError } = await supabase.functions.invoke('fetch-publisher-prices');
      if (pubError) throw pubError;
      
      // Fetch Amazon prices
      await supabase.functions.invoke('fetch-amazon-prices');
      
      // Calculate unit economics
      await supabase.functions.invoke('calc-unit-econ', {
        body: { roiTarget: 0.20 }
      });

      toast({
        title: "Sync Complete",
        description: `Updated ${pubData?.updated || 0} books with publisher pricing. All data refreshed.`,
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
                        <TableCell>{book.wholesale_price > 0 ? `$${book.wholesale_price.toFixed(2)}` : 'NA'}</TableCell>
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
          <TabsContent value="datasets" className="space-y-6">
            {/* Active Datasets */}
            <Card>
              <CardHeader>
                <CardTitle>Active Datasets</CardTitle>
                <CardDescription>Datasets visible to clients</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {datasets.filter(d => d.is_active).length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No active datasets. Import books or activate existing datasets below.
                    </p>
                  ) : (
                    datasets.filter(d => d.is_active).map((dataset) => (
                      <div key={dataset.id} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{dataset.name}</h4>
                            <Badge variant={dataset.source === 'google_books' ? 'default' : 'outline'}>
                              {dataset.source.replace('_', ' ')}
                            </Badge>
                            <Badge variant="secondary">{dataset.book_count} books</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Created: {new Date(dataset.created_at).toLocaleDateString()}
                            {dataset.last_synced_at && ` • Last synced: ${new Date(dataset.last_synced_at).toLocaleDateString()}`}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => toggleDatasetActive(dataset.id, dataset.is_active)}
                          >
                            Deactivate
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => openDeleteDialog(dataset)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Inactive Datasets */}
            {datasets.filter(d => !d.is_active).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Inactive Datasets</CardTitle>
                  <CardDescription>Hidden from clients</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {datasets.filter(d => !d.is_active).map((dataset) => (
                      <div key={dataset.id} className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                        <div className="flex-1 opacity-60">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{dataset.name}</h4>
                            <Badge variant="outline">{dataset.source.replace('_', ' ')}</Badge>
                            <Badge variant="secondary">{dataset.book_count} books</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Created: {new Date(dataset.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => toggleDatasetActive(dataset.id, dataset.is_active)}
                          >
                            Activate
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => openDeleteDialog(dataset)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Sync & Import Tab */}
          <TabsContent value="sync" className="space-y-6">
            {/* Google Books Import */}
            <Card>
              <CardHeader>
                <CardTitle>Import from Google Books</CardTitle>
                <CardDescription>
                  Search and import books from Google Books API
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="google-query">Search Query</Label>
                  <Input 
                    id="google-query"
                    placeholder="e.g., fiction bestsellers 2024, business books"
                    value={googleQuery}
                    onChange={(e) => setGoogleQuery(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="max-results">Maximum Results</Label>
                    <Input 
                      id="max-results"
                      type="number"
                      min="1"
                      max="40"
                      value={googleMaxResults}
                      onChange={(e) => setGoogleMaxResults(Number(e.target.value))}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dataset-name">Dataset Name (Optional)</Label>
                    <Input 
                      id="dataset-name"
                      placeholder="Auto-generated if empty"
                      value={googleDatasetName}
                      onChange={(e) => setGoogleDatasetName(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleImportGoogleBooks}
                  disabled={importing || !googleQuery.trim()}
                  className="w-full"
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4 mr-2" />
                      Import Books
                    </>
                  )}
                </Button>
                <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                  <p className="font-medium mb-1">ℹ️ How it works:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Creates a separate dataset you can toggle on/off</li>
                    <li>Imports book metadata (title, author, description, etc.)</li>
                    <li>Pricing fields default to zero (set manually or sync later)</li>
                    <li>Duplicate ISBNs are automatically skipped</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>ISBNdb Import</CardTitle>
                <CardDescription>
                  Search and import books from ISBNdb with detailed metadata
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="isbndb-query">Search Query</Label>
                  <Input 
                    id="isbndb-query"
                    placeholder="e.g., harry potter, stephen king, isbn:9780123456789"
                    value={isbndbQuery}
                    onChange={(e) => setIsbndbQuery(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="isbndb-page-size">Books Per Import</Label>
                    <Input 
                      id="isbndb-page-size"
                      type="number"
                      min="1"
                      max="100"
                      value={isbndbPageSize}
                      onChange={(e) => setIsbndbPageSize(Number(e.target.value))}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="isbndb-dataset-name">Dataset Name (Optional)</Label>
                    <Input 
                      id="isbndb-dataset-name"
                      placeholder="Auto-generated if empty"
                      value={isbndbDatasetName}
                      onChange={(e) => setIsbndbDatasetName(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleImportISBNdb}
                  disabled={importing || !isbndbQuery.trim()}
                  className="w-full"
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4 mr-2" />
                      Import from ISBNdb
                    </>
                  )}
                </Button>
                <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                  <p className="font-medium mb-1">ℹ️ ISBNdb Features:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Rich metadata including publisher MSRP</li>
                    <li>Multiple search types: title, author, ISBN, subject</li>
                    <li>High-quality cover images when available</li>
                    <li>Publisher information and detailed descriptions</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Publisher API Sync</CardTitle>
                <CardDescription>
                  Fetch pricing data from Google Books, ISBNdb, Bowker, and publisher APIs for all books missing cost data
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

      <DeleteDatasetDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        datasetName={datasetToDelete?.name || ''}
        onConfirmDelete={handleDeleteDataset}
      />
    </div>
  );
};

export default HostDashboardNew;

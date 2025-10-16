import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BookOpen, LogOut, Plus, Database, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Book {
  id: string;
  title: string;
  author: string;
  rrp: number;
  wholesale_price: number;
  available_stock: number;
  category: string;
  image_url: string | null;
}

const HostDashboard = () => {
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchBooks();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate('/host-auth');
      return;
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single();

    if (roleData?.role !== 'host') {
      toast.error("Access denied");
      navigate('/');
      return;
    }

    setIsHost(true);
  };

  const fetchBooks = async () => {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('title');

      if (error) throw error;
      setBooks(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch books");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate('/');
  };

  const handleDeleteBook = async (id: string) => {
    if (!confirm("Are you sure you want to delete this book?")) return;

    try {
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Book deleted successfully");
      fetchBooks();
    } catch (error: any) {
      toast.error("Failed to delete book");
    }
  };

  if (!isHost) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="bg-card border-b border-border sticky top-0 z-50 backdrop-blur-sm bg-card/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">Telebook Host</span>
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="books" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="books">Books</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="import">Import/Export</TabsTrigger>
          </TabsList>

          {/* Books Management */}
          <TabsContent value="books" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold">Book Inventory</h2>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Book
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">RRP</TableHead>
                      <TableHead className="text-right">Wholesale</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {books.map((book) => (
                      <TableRow key={book.id}>
                        <TableCell className="font-medium">{book.title}</TableCell>
                        <TableCell>{book.author}</TableCell>
                        <TableCell>{book.category}</TableCell>
                        <TableCell className="text-right">£{book.rrp.toFixed(2)}</TableCell>
                        <TableCell className="text-right">£{book.wholesale_price.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{book.available_stock}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="outline" size="sm">Edit</Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDeleteBook(book.id)}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics */}
          <TabsContent value="analytics" className="space-y-4">
            <h2 className="text-3xl font-bold">Analytics & Sales Data</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Total Books</CardTitle>
                  <CardDescription>In inventory</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{books.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Total Stock</CardTitle>
                  <CardDescription>Available units</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {books.reduce((sum, book) => sum + book.available_stock, 0)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Inventory Value</CardTitle>
                  <CardDescription>At wholesale price</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    £{books.reduce((sum, book) => sum + (book.wholesale_price * book.available_stock), 0).toFixed(2)}
                  </div>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>
                  <TrendingUp className="w-5 h-5 inline mr-2" />
                  Amazon Sales Integration
                </CardTitle>
                <CardDescription>Connect to Amazon Seller Central for detailed analytics</CardDescription>
              </CardHeader>
              <CardContent>
                <Button>Connect Amazon Account</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Import/Export */}
          <TabsContent value="import" className="space-y-4">
            <h2 className="text-3xl font-bold">Import/Export Data</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>
                    <Database className="w-5 h-5 inline mr-2" />
                    Import Books
                  </CardTitle>
                  <CardDescription>Upload CSV or Excel file to bulk import books</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button>Upload File</Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>
                    <Database className="w-5 h-5 inline mr-2" />
                    Export Books
                  </CardTitle>
                  <CardDescription>Download current inventory as CSV</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline">Download CSV</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default HostDashboard;

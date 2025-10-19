import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Book {
  id: string;
  title: string;
  author: string;
  category?: string;
  publisher?: string;
  publisher_rrp?: number;
  amazon_price?: number;
  price_source?: string;
  available_stock: number;
}

interface DatasetBooksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  books: Book[];
  title: string;
  description?: string;
}

export const DatasetBooksDialog = ({
  open,
  onOpenChange,
  books,
  title,
  description
}: DatasetBooksDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        
        <ScrollArea className="h-[60vh] w-full">
          <div className="min-w-max pr-4">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Category/Genre</TableHead>
                <TableHead>ISBN</TableHead>
                <TableHead>Publisher</TableHead>
                <TableHead>Publisher RRP</TableHead>
                <TableHead>Amazon Price</TableHead>
                <TableHead>Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {books.map((book) => (
                <TableRow key={book.id}>
                  <TableCell className="font-medium max-w-xs">
                    <div className="truncate" title={book.title}>
                      {book.title}
                    </div>
                  </TableCell>
                  <TableCell>{book.author}</TableCell>
                  <TableCell>
                    {book.category ? (
                      <Badge variant="secondary">{book.category}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">Uncategorized</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{book.id}</TableCell>
                  <TableCell>{book.publisher || 'N/A'}</TableCell>
                  <TableCell>
                    {book.publisher_rrp ? (
                      <div className="flex items-center gap-2">
                        <span>${book.publisher_rrp.toFixed(2)}</span>
                        {book.price_source && (
                          <Badge variant="outline" className="text-xs">
                            {book.price_source === 'isbndb' ? '📚' : 
                             book.price_source === 'google_books' ? '🔍' :
                             book.price_source === 'estimated' ? '📊' :
                             book.price_source === 'manual' ? '✏️' : ''}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Missing</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {book.amazon_price ? `$${book.amazon_price.toFixed(2)}` : 'N/A'}
                  </TableCell>
                  <TableCell>{book.available_stock}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

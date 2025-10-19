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
      <DialogContent className="max-w-[95vw] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        
        <div className="overflow-x-scroll overflow-y-auto max-h-[65vh] border rounded-md [&::-webkit-scrollbar]:h-3 [&::-webkit-scrollbar-track]:bg-muted [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50">
          <Table className="w-max min-w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap min-w-[300px]">Title</TableHead>
                <TableHead className="whitespace-nowrap min-w-[200px]">Author</TableHead>
                <TableHead className="whitespace-nowrap min-w-[150px]">Category/Genre</TableHead>
                <TableHead className="whitespace-nowrap min-w-[280px]">ISBN</TableHead>
                <TableHead className="whitespace-nowrap min-w-[150px]">Publisher</TableHead>
                <TableHead className="whitespace-nowrap min-w-[150px]">Publisher RRP</TableHead>
                <TableHead className="whitespace-nowrap min-w-[140px]">Amazon Price</TableHead>
                <TableHead className="whitespace-nowrap min-w-[80px]">Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {books.map((book) => (
                <TableRow key={book.id}>
                  <TableCell className="font-medium max-w-md">
                    <div className="truncate" title={book.title}>
                      {book.title}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{book.author}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {book.category ? (
                      <Badge variant="secondary">{book.category}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">Uncategorized</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs whitespace-nowrap">{book.id}</TableCell>
                  <TableCell className="whitespace-nowrap">{book.publisher || 'N/A'}</TableCell>
                  <TableCell className="whitespace-nowrap">
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
                  <TableCell className="whitespace-nowrap">
                    {book.amazon_price ? `$${book.amazon_price.toFixed(2)}` : 'N/A'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{book.available_stock}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
};

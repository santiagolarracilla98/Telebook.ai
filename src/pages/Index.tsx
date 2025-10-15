import { useState } from "react";
import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import FilterBar from "@/components/FilterBar";
import BookCard from "@/components/BookCard";
import { mockBooks } from "@/data/mockBooks";

const Index = () => {
  const [books] = useState(mockBooks);
  const [marketplace, setMarketplace] = useState<'usa' | 'uk' | 'both'>('usa');

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Hero />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" id="inventory">
        <FilterBar onMarketplaceChange={(value) => setMarketplace(value as 'usa' | 'uk' | 'both')} />
        
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Available Inventory</h2>
              <p className="text-muted-foreground mt-1">{books.length} books available</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {books.map((book) => (
              <BookCard key={book.id} {...book} marketplace={marketplace} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;

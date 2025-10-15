import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter } from "lucide-react";

interface FilterBarProps {
  onSearch?: (query: string) => void;
  onCategoryChange?: (category: string) => void;
  onPublisherChange?: (publisher: string) => void;
  onMarketplaceChange?: (marketplace: string) => void;
}

const FilterBar = ({ onSearch, onCategoryChange, onPublisherChange, onMarketplaceChange }: FilterBarProps) => {
  return (
    <div className="bg-card rounded-2xl shadow-md border border-border p-6 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Filter Inventory</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="md:col-span-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, author, or ISBN..."
              className="pl-10"
              onChange={(e) => onSearch?.(e.target.value)}
            />
          </div>
        </div>
        
        <Select onValueChange={onMarketplaceChange} defaultValue="usa">
          <SelectTrigger>
            <SelectValue placeholder="Marketplace" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="usa">🇺🇸 USA</SelectItem>
            <SelectItem value="uk">🇬🇧 UK</SelectItem>
          </SelectContent>
        </Select>
        
        <Select onValueChange={onCategoryChange}>
          <SelectTrigger>
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="fiction">Fiction</SelectItem>
            <SelectItem value="non-fiction">Non-Fiction</SelectItem>
            <SelectItem value="business">Business</SelectItem>
            <SelectItem value="self-help">Self-Help</SelectItem>
            <SelectItem value="technology">Technology</SelectItem>
            <SelectItem value="children">Children's Books</SelectItem>
          </SelectContent>
        </Select>
        
        <Select onValueChange={onPublisherChange}>
          <SelectTrigger>
            <SelectValue placeholder="Publisher" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Publishers</SelectItem>
            <SelectItem value="penguin">Penguin Random House</SelectItem>
            <SelectItem value="hachette">Hachette Book Group</SelectItem>
            <SelectItem value="simon">Simon & Schuster</SelectItem>
            <SelectItem value="harpercollins">HarperCollins</SelectItem>
            <SelectItem value="macmillan">Macmillan Publishers</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex gap-2 pt-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
            onCategoryChange?.('all');
            onPublisherChange?.('all');
            onMarketplaceChange?.('usa');
            onSearch?.('');
          }}
        >
          Reset Filters
        </Button>
        <Button 
          size="sm" 
          className="ml-auto"
          onClick={() => {
            console.log('Filters applied');
          }}
        >
          Apply Filters
        </Button>
      </div>
    </div>
  );
};

export default FilterBar;

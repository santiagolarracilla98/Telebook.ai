export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  uk_asin?: string | null;
  us_asin?: string | null;
  publisher: string;
  category: string;
  wholesalePrice: number;
  suggestedPrice: number;
  amazonPrice: number;
  roi: number;
  verified: boolean;
  imageUrl?: string;
}

export const mockBooks: Book[] = [
  {
    id: "1",
    title: "The Psychology of Money",
    author: "Morgan Housel",
    isbn: "978-0857197689",
    publisher: "Harriman House",
    category: "Business",
    wholesalePrice: 8.99,
    suggestedPrice: 16.99,
    amazonPrice: 18.99,
    roi: 42,
    verified: true,
  },
  {
    id: "2",
    title: "Atomic Habits",
    author: "James Clear",
    isbn: "978-0735211292",
    publisher: "Penguin Random House",
    category: "Self-Help",
    wholesalePrice: 10.50,
    suggestedPrice: 19.99,
    amazonPrice: 21.99,
    roi: 38,
    verified: true,
  },
  {
    id: "3",
    title: "The Midnight Library",
    author: "Matt Haig",
    isbn: "978-0525559474",
    publisher: "Penguin Random House",
    category: "Fiction",
    wholesalePrice: 9.25,
    suggestedPrice: 17.99,
    amazonPrice: 19.99,
    roi: 35,
    verified: true,
  },
  {
    id: "4",
    title: "Project Hail Mary",
    author: "Andy Weir",
    isbn: "978-0593135204",
    publisher: "Penguin Random House",
    category: "Fiction",
    wholesalePrice: 11.99,
    suggestedPrice: 21.99,
    amazonPrice: 23.99,
    roi: 40,
    verified: true,
  },
  {
    id: "5",
    title: "Thinking, Fast and Slow",
    author: "Daniel Kahneman",
    isbn: "978-0374533557",
    publisher: "Farrar, Straus and Giroux",
    category: "Non-Fiction",
    wholesalePrice: 8.75,
    suggestedPrice: 16.99,
    amazonPrice: 18.50,
    roi: 36,
    verified: true,
  },
  {
    id: "6",
    title: "The Lean Startup",
    author: "Eric Ries",
    isbn: "978-0307887894",
    publisher: "Crown Publishing",
    category: "Business",
    wholesalePrice: 9.50,
    suggestedPrice: 18.99,
    amazonPrice: 20.99,
    roi: 44,
    verified: true,
  },
  {
    id: "7",
    title: "Educated",
    author: "Tara Westover",
    isbn: "978-0399590504",
    publisher: "Penguin Random House",
    category: "Non-Fiction",
    wholesalePrice: 10.25,
    suggestedPrice: 19.99,
    amazonPrice: 21.50,
    roi: 38,
    verified: true,
  },
  {
    id: "8",
    title: "Clean Code",
    author: "Robert C. Martin",
    isbn: "978-0132350884",
    publisher: "Pearson",
    category: "Technology",
    wholesalePrice: 18.99,
    suggestedPrice: 34.99,
    amazonPrice: 37.99,
    roi: 42,
    verified: true,
  },
  {
    id: "9",
    title: "The Very Hungry Caterpillar",
    author: "Eric Carle",
    isbn: "978-0399226908",
    publisher: "Penguin Random House",
    category: "Children's Books",
    wholesalePrice: 5.99,
    suggestedPrice: 11.99,
    amazonPrice: 12.99,
    roi: 45,
    verified: true,
  },
];

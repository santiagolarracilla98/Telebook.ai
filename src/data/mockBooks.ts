import bookPsychologyMoney from "@/assets/book-psychology-money.jpg";
import bookAtomicHabits from "@/assets/book-atomic-habits.jpg";
import bookMidnightLibrary from "@/assets/book-midnight-library.jpg";
import bookProjectHailMary from "@/assets/book-project-hail-mary.jpg";
import bookThinkingFastSlow from "@/assets/book-thinking-fast-slow.jpg";
import bookLeanStartup from "@/assets/book-lean-startup.jpg";
import bookEducated from "@/assets/book-educated.jpg";
import bookCleanCode from "@/assets/book-clean-code.jpg";
import bookVeryHungryCaterpillar from "@/assets/book-very-hungry-caterpillar.jpg";

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  uk_asin?: string | null;
  us_asin?: string | null;
  available_stock: number;
  rrp: number;
  wholesale_price: number;
  publisher: string;
  category: string;
  wholesalePrice: number;
  suggestedPrice: number;
  amazonPrice: number;
  roi: number;
  verified: boolean;
  imageUrl?: string;
  publisher_rrp?: number;
  amazon_price?: number;
  amazon_fee?: number;
  roi_target_price?: number;
  market_flag?: string;
  currency?: string;
  last_price_check?: string | null;
}

export const mockBooks: Book[] = [
  {
    id: "1",
    title: "The Psychology of Money",
    author: "Morgan Housel",
    isbn: "978-0857197689",
    uk_asin: null,
    us_asin: null,
    available_stock: 25,
    rrp: 18.99,
    wholesale_price: 8.99,
    publisher: "Harriman House",
    category: "Business",
    wholesalePrice: 8.99,
    suggestedPrice: 16.99,
    amazonPrice: 18.99,
    roi: 42,
    verified: true,
    imageUrl: bookPsychologyMoney,
  },
  {
    id: "2",
    title: "Atomic Habits",
    author: "James Clear",
    isbn: "978-0735211292",
    uk_asin: null,
    us_asin: null,
    available_stock: 30,
    rrp: 21.99,
    wholesale_price: 4.49,
    publisher: "Penguin Random House",
    category: "Self-Help",
    wholesalePrice: 4.49,
    suggestedPrice: 16.99,
    amazonPrice: 21.99,
    roi: 82,
    verified: true,
    imageUrl: bookAtomicHabits,
  },
  {
    id: "3",
    title: "The Midnight Library",
    author: "Matt Haig",
    isbn: "978-0525559474",
    uk_asin: null,
    us_asin: null,
    available_stock: 20,
    rrp: 19.99,
    wholesale_price: 9.25,
    publisher: "Penguin Random House",
    category: "Fiction",
    wholesalePrice: 9.25,
    suggestedPrice: 17.99,
    amazonPrice: 19.99,
    roi: 35,
    verified: true,
    imageUrl: bookMidnightLibrary,
  },
  {
    id: "4",
    title: "Project Hail Mary",
    author: "Andy Weir",
    isbn: "978-0593135204",
    uk_asin: null,
    us_asin: null,
    available_stock: 15,
    rrp: 23.99,
    wholesale_price: 11.99,
    publisher: "Penguin Random House",
    category: "Fiction",
    wholesalePrice: 11.99,
    suggestedPrice: 21.99,
    amazonPrice: 23.99,
    roi: 40,
    verified: true,
    imageUrl: bookProjectHailMary,
  },
  {
    id: "5",
    title: "Thinking, Fast and Slow",
    author: "Daniel Kahneman",
    isbn: "978-0374533557",
    uk_asin: null,
    us_asin: null,
    available_stock: 18,
    rrp: 18.50,
    wholesale_price: 8.75,
    publisher: "Farrar, Straus and Giroux",
    category: "Non-Fiction",
    wholesalePrice: 8.75,
    suggestedPrice: 16.99,
    amazonPrice: 18.50,
    roi: 36,
    verified: true,
    imageUrl: bookThinkingFastSlow,
  },
  {
    id: "6",
    title: "The Lean Startup",
    author: "Eric Ries",
    isbn: "978-0307887894",
    uk_asin: null,
    us_asin: null,
    available_stock: 22,
    rrp: 20.99,
    wholesale_price: 9.50,
    publisher: "Crown Publishing",
    category: "Business",
    wholesalePrice: 9.50,
    suggestedPrice: 18.99,
    amazonPrice: 20.99,
    roi: 44,
    verified: true,
    imageUrl: bookLeanStartup,
  },
  {
    id: "7",
    title: "Educated",
    author: "Tara Westover",
    isbn: "978-0399590504",
    uk_asin: null,
    us_asin: null,
    available_stock: 28,
    rrp: 21.50,
    wholesale_price: 10.25,
    publisher: "Penguin Random House",
    category: "Non-Fiction",
    wholesalePrice: 10.25,
    suggestedPrice: 19.99,
    amazonPrice: 21.50,
    roi: 38,
    verified: true,
    imageUrl: bookEducated,
  },
  {
    id: "8",
    title: "Clean Code",
    author: "Robert C. Martin",
    isbn: "978-0132350884",
    uk_asin: null,
    us_asin: null,
    available_stock: 12,
    rrp: 37.99,
    wholesale_price: 18.99,
    publisher: "Pearson",
    category: "Technology",
    wholesalePrice: 18.99,
    suggestedPrice: 34.99,
    amazonPrice: 37.99,
    roi: 42,
    verified: true,
    imageUrl: bookCleanCode,
  },
  {
    id: "9",
    title: "The Very Hungry Caterpillar",
    author: "Eric Carle",
    isbn: "978-0399226908",
    uk_asin: null,
    us_asin: null,
    available_stock: 35,
    rrp: 12.99,
    wholesale_price: 5.99,
    publisher: "Penguin Random House",
    category: "Children's Books",
    wholesalePrice: 5.99,
    suggestedPrice: 11.99,
    amazonPrice: 12.99,
    roi: 45,
    verified: true,
    imageUrl: bookVeryHungryCaterpillar,
  },
];

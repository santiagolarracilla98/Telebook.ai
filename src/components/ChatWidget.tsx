import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Copy, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  books?: Array<{
    id: string;
    title: string;
    author: string;
    publisher: string;
    category: string;
    wholesale_price: number;
    amazon_price: number;
    available_stock: number;
  }>;
}

interface ChatWidgetProps {
  mode: "public" | "client";
}

const quickLinks = {
  public: [
    "What does this platform do?",
    "How does pricing work?",
    "What sources do you use?",
  ],
  client: [
    "Search for 'Atomic Habits'",
    "How do I select profitable books?",
    "What's ROI and how is it calculated?",
    "Find books by Stephen King",
  ],
};

export function ChatWidget({ mode }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Initial welcome message
      const welcomeMsg = mode === "public"
        ? "Welcome to Telemachus! I can help you understand how our book wholesaling platform works. Ask me about our features, pricing intelligence, or how to get started. **Note:** Log in to access personalized data and your book catalog."
        : "Welcome back! I'm here to help you navigate the platform. I can explain features, help you find books, or guide you through the pricing engine. What would you like to know?";
      
      setMessages([{ role: "assistant", content: welcomeMsg }]);
      
      // Analytics
      console.log("ai_chat_opened", { mode });
    }
  }, [isOpen, mode]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Analytics
    console.log("ai_chat_query_submitted", { mode, query_length: content.length });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke("client-chat", {
        body: {
          messages: [...messages, userMessage],
          mode,
          userId: user?.id,
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      // Parse book results if present
      let content = data.content;
      let books = undefined;
      
      const bookResultMatch = content.match(/\[BOOK_RESULTS:(.*?)\]/);
      if (bookResultMatch) {
        try {
          books = JSON.parse(bookResultMatch[1]);
          content = content.replace(/\[BOOK_RESULTS:.*?\]/, '').trim();
        } catch (e) {
          console.error('Failed to parse book results:', e);
        }
      }

      const assistantMessage: Message = {
        role: "assistant",
        content,
        books,
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message. Please try again.",
        variant: "destructive",
      });
      
      // Remove the user message if we failed
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLink = (question: string) => {
    console.log("ai_chat_topic_selected", { topic: question });
    sendMessage(question);
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied",
      description: "Message copied to clipboard",
    });
  };

  const handleFeedback = (messageIndex: number, type: "up" | "down") => {
    console.log("ai_chat_feedback", { type: type === "up" ? "thumbs_up" : "thumbs_down", messageIndex });
    toast({
      title: "Thanks for your feedback!",
      description: "Your input helps us improve the assistant.",
    });
  };

  return (
    <>
      {/* Floating button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        size="icon"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[600px] bg-background border rounded-lg shadow-2xl z-50 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b">
            <h3 className="font-semibold">Telemachus Help (Client)</h3>
            <p className="text-sm text-muted-foreground">
              {mode === "public" ? "Platform Guide" : "Your Personal Assistant"}
            </p>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex flex-col gap-2",
                    msg.role === "user" ? "items-end" : "items-start"
                  )}
                >
                  <div
                    className={cn(
                      "rounded-lg px-4 py-2 max-w-[85%]",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  
                  {/* Book results with action buttons */}
                  {msg.books && msg.books.length > 0 && (
                    <div className="w-full space-y-2 mt-2">
                      {msg.books.map((book) => {
                        const wholesalePrice = book.wholesale_price || 0;
                        const amazonPrice = book.amazon_price || 0;
                        const roi = wholesalePrice > 0 && amazonPrice > 0 
                          ? (((amazonPrice - wholesalePrice) / wholesalePrice) * 100).toFixed(1)
                          : null;
                        
                        return (
                          <div key={book.id} className="bg-background border rounded-lg p-3 space-y-2">
                            <div>
                              <p className="font-semibold text-sm">{book.title}</p>
                              <p className="text-xs text-muted-foreground">by {book.author}</p>
                            </div>
                            <div className="text-xs space-y-1">
                              {book.publisher && book.publisher !== 'Please check inventory' && (
                                <p><span className="text-muted-foreground">Publisher:</span> {book.publisher}</p>
                              )}
                              {wholesalePrice > 0 && (
                                <p><span className="text-muted-foreground">Cost:</span> ${wholesalePrice.toFixed(2)}</p>
                              )}
                              {amazonPrice > 0 && (
                                <p><span className="text-muted-foreground">Amazon:</span> ${amazonPrice.toFixed(2)}</p>
                              )}
                              {roi && (
                                <p><span className="text-muted-foreground">ROI:</span> {roi}%</p>
                              )}
                              <p><span className="text-muted-foreground">Stock:</span> {book.available_stock} units</p>
                            </div>
                            <Button
                              size="sm"
                              className="w-full"
                              onClick={() => {
                                // Trigger search on dashboard by updating URL with search param
                                const searchEvent = new CustomEvent('chatSearchBook', { 
                                  detail: { title: book.title } 
                                });
                                window.dispatchEvent(searchEvent);
                                setIsOpen(false);
                                toast({
                                  title: "Searching for book",
                                  description: `Looking for "${book.title}" in the dashboard`,
                                });
                              }}
                            >
                              View Book
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {msg.role === "assistant" && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyMessage(msg.content)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleFeedback(idx, "up")}
                      >
                        <ThumbsUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleFeedback(idx, "down")}
                      >
                        <ThumbsDown className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex items-start">
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Quick links */}
          {messages.length <= 1 && (
            <div className="p-4 border-t space-y-2">
              <p className="text-xs text-muted-foreground">Quick questions:</p>
              <div className="flex flex-wrap gap-2">
                {quickLinks[mode].map((question, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => handleQuickLink(question)}
                    disabled={isLoading}
                  >
                    {question}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question..."
                disabled={isLoading}
              />
              <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const clientGuide = {
  platform_purpose: "Telemachus is a book wholesaling platform that helps you discover profitable books to stock. It provides pricing intelligence from multiple sources (Amazon, publishers, ISBNdb) and calculates ROI to help you make informed purchasing decisions.",
  
  how_to: {
    pricing_engine: "The Pricing Engine shows you the acquisition cost (wholesale price), Amazon's current price, and calculates potential ROI. It uses real-time data from Amazon, publisher feeds, and ISBNdb to give you accurate pricing intelligence. Look for the 'ROI' column to see potential profit margins.",
    select_books: "To select profitable books: 1) Use the search and filters to narrow down by category, publisher, or marketplace (US/UK). 2) Look at the ROI column - higher percentages mean better margins. 3) Check the 'Smart Price' suggestion for optimal pricing. 4) Compare Amazon prices with wholesale costs. 5) Add profitable books to your cart.",
    upload_isbn: "You can upload a list of ISBNs to quickly import book data. The system will fetch pricing information from multiple sources automatically. Contact support for bulk upload features.",
    analytics: "The analytics section shows genre performance, ROI distributions, and helps you identify which categories are most profitable. Use this to guide your purchasing decisions and focus on high-margin categories.",
    orders: "Once you've selected books, add them to your cart and proceed to checkout. The platform tracks your orders and helps you manage inventory.",
    faq: "**Where do prices come from?** We aggregate data from Amazon (real-time marketplace prices), publishers (wholesale prices), and ISBNdb (MSRP data). **Can I change prices?** You can view suggested prices but cannot modify source data. **What's ROI?** Return on Investment shows your potential profit margin: (Amazon Price - Wholesale Cost - Fees) / Wholesale Cost. **Need help?** Contact support or use this chat for guidance."
  },
  
  glossary: {
    rrp: "Recommended Retail Price - the suggested selling price from the publisher",
    wholesale_price: "The cost you pay to acquire the book from the publisher or distributor",
    amazon_price: "Current selling price on Amazon marketplace",
    roi: "Return on Investment - your potential profit margin as a percentage",
    smart_price: "Our recommended selling price based on market analysis and fees",
    asin: "Amazon Standard Identification Number - unique product identifier on Amazon",
    isbn: "International Standard Book Number - unique book identifier",
    marketplace: "Either US or UK Amazon marketplace",
    category: "Book genre or subject classification"
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, mode = 'public', userId } = await req.json();
    console.log('Client chat request:', { mode, userId, messageCount: messages?.length });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // System prompt with guardrails
    const systemPrompt = mode === 'public' 
      ? `You are the Telemachus Client Help Assistant in PUBLIC mode. You help users understand what the platform does.

STRICT RULES:
- You are speaking to an ANONYMOUS user who is NOT logged in
- NEVER claim to see or access any user data, account details, or inventory
- NEVER mention host, admin, or internal features
- Your goal is to explain the platform's purpose and encourage login
- If asked about specific books, prices, or account features, say: "Please log in to access your personalized data and book catalog"
- DO NOT make up or hallucinate data
- Keep responses concise and friendly

KNOWLEDGE:
${JSON.stringify(clientGuide, null, 2)}

When the user asks about the platform, explain its purpose. When they ask about features, give a brief overview and suggest logging in for full access.`
      : `You are the Telemachus Client Help Assistant in CLIENT mode. You help authenticated users understand and use the platform.

STRICT RULES:
- You are a PRODUCT GUIDE, not a general AI assistant
- NEVER mention or explain host, admin, or internal features
- NEVER expose API keys or sensitive configuration
- You can ONLY READ data - never change, delete, or update anything
- If asked to modify data, say: "I can't make changes, but I can show you how to do it yourself"
- Use the available tools to answer questions about books and features
- Keep responses concise and actionable
- Focus on CLIENT features: browsing books, understanding pricing, using filters, analytics
- When users ask about specific books, ALWAYS use the searchBooks tool to find them
- Provide helpful book information including pricing and ROI to help users make decisions

KNOWLEDGE:
${JSON.stringify(clientGuide, null, 2)}

AVAILABLE TOOLS:
- searchBooks: Search for books by title, author, ISBN, or publisher (read-only)
- getHowTo: Get step-by-step guides for platform features
- getGlossary: Define platform-specific terms`;

    // Tool definitions for client mode
    const tools = mode === 'client' ? [
      {
        type: "function",
        function: {
          name: "searchBooks",
          description: "Search for books in the catalog by title, author, ISBN, or publisher. Returns matching books with pricing and availability.",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Search term - can be book title, author name, ISBN, or publisher"
              }
            },
            required: ["query"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "getHowTo",
          description: "Get a how-to guide for a specific feature",
          parameters: {
            type: "object",
            properties: {
              topic: {
                type: "string",
                enum: ["pricing_engine", "select_books", "upload_isbn", "analytics", "orders", "faq"],
                description: "The topic to get help with"
              }
            },
            required: ["topic"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "getGlossary",
          description: "Get the definition of a platform term",
          parameters: {
            type: "object",
            properties: {
              term: {
                type: "string",
                description: "The term to define"
              }
            },
            required: ["term"]
          }
        }
      }
    ] : [];

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        tools: tools.length > 0 ? tools : undefined,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "I'm experiencing high demand right now. Please try again in a moment." 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: "AI service temporarily unavailable. Please contact support." 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const choice = data.choices[0];
    let finalContent = choice.message.content;

    // Handle tool calls if present
    if (choice.message.tool_calls && mode === 'client') {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      const supabase = createClient(supabaseUrl!, supabaseKey!);

      for (const toolCall of choice.message.tool_calls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);
        
        console.log('Tool call:', functionName, args);

        if (functionName === 'searchBooks') {
          const { data: books } = await supabase
            .from('books')
            .select('id, title, author, publisher, wholesale_price, amazon_price, category, available_stock')
            .or(`title.ilike.%${args.query}%,author.ilike.%${args.query}%,publisher.ilike.%${args.query}%`)
            .limit(5);

          if (books && books.length > 0) {
            finalContent += `\n\n**Found ${books.length} book(s) in our inventory:**\n\n`;
            
            // Return structured data for button rendering
            const bookData = books.map(book => ({
              id: book.id,
              title: book.title,
              author: book.author,
              publisher: book.publisher || 'Please check inventory',
              category: book.category || 'Please check inventory',
              wholesale_price: book.wholesale_price,
              amazon_price: book.amazon_price,
              available_stock: book.available_stock || 0
            }));

            finalContent += `[BOOK_RESULTS:${JSON.stringify(bookData)}]`;
            finalContent += `\n\nClick "View Book" to see full details and add to your cart.`;
          } else {
            finalContent += `\n\nNo books found matching "${args.query}". Please check our inventory using the search bar for more options.`;
          }
        } else if (functionName === 'getHowTo') {
          const guide = clientGuide.how_to[args.topic as keyof typeof clientGuide.how_to];
          finalContent += `\n\n**${args.topic.replace('_', ' ').toUpperCase()}:**\n${guide}`;
        } else if (functionName === 'getGlossary') {
          const term = args.term.toLowerCase().replace(/\s+/g, '_');
          const definition = clientGuide.glossary[term as keyof typeof clientGuide.glossary];
          finalContent += `\n\n**${args.term}:** ${definition || 'Term not found in glossary.'}`;
        }
      }
    }

    // Security check: redact any potential API keys
    finalContent = finalContent.replace(/sk-[a-zA-Z0-9]{32,}/g, '[REDACTED]');
    finalContent = finalContent.replace(/[a-z0-9]{32,}/gi, (match: string) => {
      if (match.length > 30 && /^[a-f0-9]+$/i.test(match)) return '[REDACTED]';
      return match;
    });

    console.log('Response generated successfully');

    return new Response(JSON.stringify({ 
      content: finalContent,
      mode 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Client chat error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'An error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      account_tiers: {
        Row: {
          created_at: string
          id: string
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      books: {
        Row: {
          amazon_fee: number | null
          amazon_price: number | null
          author: string
          available_stock: number
          category: string | null
          created_at: string | null
          currency: string | null
          dataset_id: string | null
          description: string | null
          google_books_id: string | null
          id: string
          image_url: string | null
          info_link: string | null
          isbndb_binding: string | null
          isbndb_msrp: number | null
          isbndb_price_currency: string | null
          isbndb_price_date: string | null
          last_price_check: string | null
          market_flag: string | null
          page_count: number | null
          preview_link: string | null
          price_source: string | null
          published_date: string | null
          publisher: string | null
          publisher_rrp: number | null
          roi_target_price: number | null
          rrp: number | null
          title: string
          uk_asin: string | null
          updated_at: string | null
          us_asin: string | null
          wholesale_price: number | null
        }
        Insert: {
          amazon_fee?: number | null
          amazon_price?: number | null
          author: string
          available_stock?: number
          category?: string | null
          created_at?: string | null
          currency?: string | null
          dataset_id?: string | null
          description?: string | null
          google_books_id?: string | null
          id?: string
          image_url?: string | null
          info_link?: string | null
          isbndb_binding?: string | null
          isbndb_msrp?: number | null
          isbndb_price_currency?: string | null
          isbndb_price_date?: string | null
          last_price_check?: string | null
          market_flag?: string | null
          page_count?: number | null
          preview_link?: string | null
          price_source?: string | null
          published_date?: string | null
          publisher?: string | null
          publisher_rrp?: number | null
          roi_target_price?: number | null
          rrp?: number | null
          title: string
          uk_asin?: string | null
          updated_at?: string | null
          us_asin?: string | null
          wholesale_price?: number | null
        }
        Update: {
          amazon_fee?: number | null
          amazon_price?: number | null
          author?: string
          available_stock?: number
          category?: string | null
          created_at?: string | null
          currency?: string | null
          dataset_id?: string | null
          description?: string | null
          google_books_id?: string | null
          id?: string
          image_url?: string | null
          info_link?: string | null
          isbndb_binding?: string | null
          isbndb_msrp?: number | null
          isbndb_price_currency?: string | null
          isbndb_price_date?: string | null
          last_price_check?: string | null
          market_flag?: string | null
          page_count?: number | null
          preview_link?: string | null
          price_source?: string | null
          published_date?: string | null
          publisher?: string | null
          publisher_rrp?: number | null
          roi_target_price?: number | null
          rrp?: number | null
          title?: string
          uk_asin?: string | null
          updated_at?: string | null
          us_asin?: string | null
          wholesale_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "books_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      datasets: {
        Row: {
          book_count: number | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          last_synced_at: string | null
          metadata: Json | null
          name: string
          source: Database["public"]["Enums"]["dataset_source_type"] | null
        }
        Insert: {
          book_count?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          metadata?: Json | null
          name: string
          source?: Database["public"]["Enums"]["dataset_source_type"] | null
        }
        Update: {
          book_count?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          metadata?: Json | null
          name?: string
          source?: Database["public"]["Enums"]["dataset_source_type"] | null
        }
        Relationships: []
      }
      fee_schedules: {
        Row: {
          category: string
          closing_fee: number | null
          created_at: string | null
          fba_base: number | null
          id: string
          referral_pct: number
          territory: string
        }
        Insert: {
          category: string
          closing_fee?: number | null
          created_at?: string | null
          fba_base?: number | null
          id?: string
          referral_pct: number
          territory: string
        }
        Update: {
          category?: string
          closing_fee?: number | null
          created_at?: string | null
          fba_base?: number | null
          id?: string
          referral_pct?: number
          territory?: string
        }
        Relationships: []
      }
      publisher_prices: {
        Row: {
          created_at: string | null
          currency: string
          id: string
          isbn: string
          price_amount: number
          price_type: string | null
          raw: Json | null
          source: string
          territory: string
        }
        Insert: {
          created_at?: string | null
          currency: string
          id?: string
          isbn: string
          price_amount: number
          price_type?: string | null
          raw?: Json | null
          source: string
          territory: string
        }
        Update: {
          created_at?: string | null
          currency?: string
          id?: string
          isbn?: string
          price_amount?: number
          price_type?: string | null
          raw?: Json | null
          source?: string
          territory?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wishlist: {
        Row: {
          book_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "host" | "client"
      dataset_source_type:
        | "manual_upload"
        | "google_books"
        | "bowker_api"
        | "onix_feed"
        | "keepa_import"
        | "isbndb"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["host", "client"],
      dataset_source_type: [
        "manual_upload",
        "google_books",
        "bowker_api",
        "onix_feed",
        "keepa_import",
        "isbndb",
      ],
    },
  },
} as const

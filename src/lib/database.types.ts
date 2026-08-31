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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      contact_messages: {
        Row: {
          client_ip: string
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          message: string
          phone: string | null
          status: string
        }
        Insert: {
          client_ip?: string
          created_at?: string
          email: string
          first_name?: string
          id?: string
          last_name?: string
          message: string
          phone?: string | null
          status?: string
        }
        Update: {
          client_ip?: string
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          message?: string
          phone?: string | null
          status?: string
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          calories: number | null
          carbs_g: number | null
          category: string
          created_at: string
          description: string
          fat_g: number | null
          id: string
          image_url: string | null
          ingredients: string | null
          is_available: boolean
          name: string
          price: number
          protein_g: number | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          calories?: number | null
          carbs_g?: number | null
          category: string
          created_at?: string
          description?: string
          fat_g?: number | null
          id?: string
          image_url?: string | null
          ingredients?: string | null
          is_available?: boolean
          name: string
          price: number
          protein_g?: number | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          calories?: number | null
          carbs_g?: number | null
          category?: string
          created_at?: string
          description?: string
          fat_g?: number | null
          id?: string
          image_url?: string | null
          ingredients?: string | null
          is_available?: boolean
          name?: string
          price?: number
          protein_g?: number | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          email: string
          status: string
          subscribed_at: string
        }
        Insert: {
          email: string
          status?: string
          subscribed_at?: string
        }
        Update: {
          email?: string
          status?: string
          subscribed_at?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          art_key: string | null
          created_at: string
          description: string
          id: string
          image_url: string | null
          is_available: boolean
          name: string
          price: number
          sort_order: number
          spec: string
          updated_at: string
        }
        Insert: {
          art_key?: string | null
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          is_available?: boolean
          name: string
          price: number
          sort_order?: number
          spec?: string
          updated_at?: string
        }
        Update: {
          art_key?: string | null
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          is_available?: boolean
          name?: string
          price?: number
          sort_order?: number
          spec?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_ip_events: {
        Row: {
          created_at: string
          id: number
          ip: string
        }
        Insert: {
          created_at?: string
          id?: number
          ip: string
        }
        Update: {
          created_at?: string
          id?: number
          ip?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          item_name: string
          item_price: number
          menu_item_id: string | null
          object_id: string | null
          order_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_name: string
          item_price: number
          menu_item_id?: string | null
          object_id?: string | null
          order_id: string
          quantity: number
        }
        Update: {
          created_at?: string
          id?: string
          item_name?: string
          item_price?: number
          menu_item_id?: string | null
          object_id?: string | null
          order_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_object_id_fkey"
            columns: ["object_id"]
            isOneToOne: false
            referencedRelation: "objects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          id: string
          payment_method: string
          pickup_at: string | null
          status: string
          subtotal: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          id?: string
          payment_method?: string
          pickup_at?: string | null
          status?: string
          subtotal: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          id?: string
          payment_method?: string
          pickup_at?: string | null
          status?: string
          subtotal?: number
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      staff_members: {
        Row: {
          active: boolean
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          role?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      sellables: {
        Row: {
          id: string | null
          is_available: boolean | null
          kind: string | null
          name: string | null
          price: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_dashboard: { Args: never; Returns: Json }
      admin_update_contact_status: {
        Args: { p_message_id: string; p_status: string }
        Returns: boolean
      }
      admin_update_menu_availability: {
        Args: { p_is_available: boolean; p_menu_item_id: string }
        Returns: boolean
      }
      admin_update_newsletter_status: {
        Args: { p_email: string; p_status: string }
        Returns: boolean
      }
      admin_update_object_availability: {
        Args: { p_is_available: boolean; p_object_id: string }
        Returns: boolean
      }
      admin_update_order_status: {
        Args: { p_order_id: string; p_status: string }
        Returns: boolean
      }
      assert_valid_customer: {
        Args: {
          customer_email: string
          customer_name: string
          customer_phone: string
        }
        Returns: undefined
      }
      assert_valid_pickup: { Args: { pickup_at: string }; Returns: undefined }
      assert_within_rate_limits: {
        Args: { customer_email: string }
        Returns: string
      }
      is_staff: { Args: never; Returns: boolean }
      place_order: {
        Args: {
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          items: Json
          payment_method?: string
          pickup_at?: string
        }
        Returns: string
      }
      request_client_ip: { Args: never; Returns: string }
      submit_contact_message: {
        Args: {
          email: string
          first_name: string
          last_name: string
          message: string
          phone: string
        }
        Returns: string
      }
      subscribe_newsletter: {
        Args: { subscriber_email: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

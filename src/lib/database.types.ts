/*
 * GENERATED FILE — do not hand-edit.
 *
 * Produced from the live MANTEL CAFE project (llurzraacyoldqjwzbio) via the
 * Supabase type generator. Regenerate after every migration that changes a
 * table, view or function signature:
 *
 *   supabase gen types typescript --project-id llurzraacyoldqjwzbio
 *
 * Why it exists: supabase-js is generic over this type. Without it every query
 * result was `any` dressed up in a hand-written interface, and a column rename
 * in a migration would have gone unnoticed until it 404'd in a browser. With
 * it, `npm run typecheck` fails instead.
 *
 * Note what is absent: order_ip_events (005) has RLS on with zero policies and
 * zero grants, so PostgREST cannot see it and the generator does not emit it.
 * That absence is the lockdown working, not a generation error.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
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
      order_items: {
        Row: {
          created_at: string
          id: string
          item_name: string
          item_price: number
          menu_item_id: string | null
          order_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_name: string
          item_price: number
          menu_item_id?: string | null
          order_id: string
          quantity: number
        }
        Update: {
          created_at?: string
          id?: string
          item_name?: string
          item_price?: number
          menu_item_id?: string | null
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
          id: string
          payment_method: string
          status: string
          subtotal: number
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          id?: string
          payment_method?: string
          status?: string
          subtotal: number
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          id?: string
          payment_method?: string
          status?: string
          subtotal?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      place_order: {
        Args: {
          customer_email?: string
          customer_name?: string
          items: Json
          payment_method?: string
        }
        Returns: string
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

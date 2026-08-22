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
 * Current as of 009 (objects, sellables, pickup details).
 *
 * Two things to read carefully rather than trust:
 *
 *  - order_ip_events (005) is ABSENT. It has RLS on with zero policies and
 *    zero grants, so PostgREST cannot see it and the generator does not emit
 *    it. That absence is the lockdown working, not a generation error.
 *
 *  - The Functions block lists place_order and the three assert_* helpers, but
 *    the generator reads signatures, NOT grants. All four have EXECUTE revoked
 *    from anon. Appearing here does not make them callable: calling
 *    place_order today returns 42501 by design (004), which is the "forbidden"
 *    case in src/lib/api/errors.ts.
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
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

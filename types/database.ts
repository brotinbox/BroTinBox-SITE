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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: Database["public"]["Enums"]["actor_role"]
          after: Json | null
          before: Json | null
          created_at: string
          entity: string
          entity_id: string | null
          id: number
          ip: unknown
          user_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role: Database["public"]["Enums"]["actor_role"]
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: never
          ip?: unknown
          user_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["actor_role"]
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: never
          ip?: unknown
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      addons: {
        Row: {
          calories: number
          carbs: number
          created_at: string
          description: string | null
          fat: number
          id: string
          image_url: string | null
          is_active: boolean
          is_veg: boolean
          metadata: Json
          name: string
          price: number
          protein: number
          slug: string
          sort_order: number
          sugar_g: number | null
          tags: string[]
          type: Database["public"]["Enums"]["addon_type"]
          updated_at: string
          volume_ml: number | null
        }
        Insert: {
          calories?: number
          carbs?: number
          created_at?: string
          description?: string | null
          fat?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_veg?: boolean
          metadata?: Json
          name: string
          price: number
          protein?: number
          slug: string
          sort_order?: number
          sugar_g?: number | null
          tags?: string[]
          type: Database["public"]["Enums"]["addon_type"]
          updated_at?: string
          volume_ml?: number | null
        }
        Update: {
          calories?: number
          carbs?: number
          created_at?: string
          description?: string | null
          fat?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_veg?: boolean
          metadata?: Json
          name?: string
          price?: number
          protein?: number
          slug?: string
          sort_order?: number
          sugar_g?: number | null
          tags?: string[]
          type?: Database["public"]["Enums"]["addon_type"]
          updated_at?: string
          volume_ml?: number | null
        }
        Relationships: []
      }
      addresses: {
        Row: {
          area: string
          city: string
          created_at: string
          flat: string
          id: string
          instructions: string | null
          is_default: boolean
          label: string
          landmark: string | null
          lat: number | null
          lng: number | null
          phone: string
          pincode: string
          recipient_name: string
          street: string
          updated_at: string
          user_id: string
          zone_id: string | null
        }
        Insert: {
          area: string
          city?: string
          created_at?: string
          flat: string
          id?: string
          instructions?: string | null
          is_default?: boolean
          label?: string
          landmark?: string | null
          lat?: number | null
          lng?: number | null
          phone: string
          pincode: string
          recipient_name: string
          street: string
          updated_at?: string
          user_id: string
          zone_id?: string | null
        }
        Update: {
          area?: string
          city?: string
          created_at?: string
          flat?: string
          id?: string
          instructions?: string | null
          is_default?: boolean
          label?: string
          landmark?: string | null
          lat?: number | null
          lng?: number | null
          phone?: string
          pincode?: string
          recipient_name?: string
          street?: string
          updated_at?: string
          user_id?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "addresses_zone_fk"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "delivery_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string | null
          author_name: string | null
          author_role: string | null
          category_id: string | null
          content: string
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_featured: boolean
          macros_highlight: string | null
          og_image_url: string | null
          published_at: string | null
          read_minutes: number | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          tags: string[]
          title: string
          updated_at: string
          views: number
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          author_role?: string | null
          category_id?: string | null
          content?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_featured?: boolean
          macros_highlight?: string | null
          og_image_url?: string | null
          published_at?: string | null
          read_minutes?: number | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          tags?: string[]
          title: string
          updated_at?: string
          views?: number
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          author_role?: string | null
          category_id?: string | null
          content?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_featured?: boolean
          macros_highlight?: string | null
          og_image_url?: string | null
          published_at?: string | null
          read_minutes?: number | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          tags?: string[]
          title?: string
          updated_at?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          checkout_type: Database["public"]["Enums"]["plan_type"] | null
          config: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          checkout_type?: Database["public"]["Enums"]["plan_type"] | null
          config?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          checkout_type?: Database["public"]["Enums"]["plan_type"] | null
          config?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "carts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_redemptions: {
        Row: {
          amount: number
          coupon_id: string
          created_at: string
          id: string
          order_id: string
          user_id: string
        }
        Insert: {
          amount: number
          coupon_id: string
          created_at?: string
          id?: string
          order_id: string
          user_id: string
        }
        Update: {
          amount?: number
          coupon_id?: string
          created_at?: string
          id?: string
          order_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          first_order_only: boolean
          id: string
          is_active: boolean
          max_discount: number | null
          min_order: number
          per_user_limit: number
          plan_types: Database["public"]["Enums"]["plan_type"][] | null
          updated_at: string
          usage_limit: number | null
          valid_from: string
          valid_to: string | null
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          first_order_only?: boolean
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order?: number
          per_user_limit?: number
          plan_types?: Database["public"]["Enums"]["plan_type"][] | null
          updated_at?: string
          usage_limit?: number | null
          valid_from?: string
          valid_to?: string | null
          value: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          first_order_only?: boolean
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order?: number
          per_user_limit?: number
          plan_types?: Database["public"]["Enums"]["plan_type"][] | null
          updated_at?: string
          usage_limit?: number | null
          valid_from?: string
          valid_to?: string | null
          value?: number
        }
        Relationships: []
      }
      customer_notes: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          customer_id: string
          id: string
          pinned: boolean
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          customer_id: string
          id?: string
          pinned?: boolean
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          customer_id?: string
          id?: string
          pinned?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_tags: {
        Row: {
          created_at: string
          customer_id: string
          tag: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          tag: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_tags_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deliveries: {
        Row: {
          address_id: string | null
          address_snapshot: Json | null
          created_at: string
          delivered_at: string | null
          delivery_date: string
          diet: Database["public"]["Enums"]["diet_type"]
          double_main: boolean
          failure_reason: string | null
          id: string
          is_egg_free: boolean
          is_make_up: boolean
          kitchen_id: string
          menu_snapshot: Json | null
          metadata: Json
          order_id: string | null
          rider_id: string | null
          skip_legume: boolean
          slot: Database["public"]["Enums"]["meal_slot"]
          status: Database["public"]["Enums"]["delivery_status"]
          subscription_id: string
          updated_at: string
          user_id: string
          zone_id: string | null
        }
        Insert: {
          address_id?: string | null
          address_snapshot?: Json | null
          created_at?: string
          delivered_at?: string | null
          delivery_date: string
          diet: Database["public"]["Enums"]["diet_type"]
          double_main?: boolean
          failure_reason?: string | null
          id?: string
          is_egg_free?: boolean
          is_make_up?: boolean
          kitchen_id?: string
          menu_snapshot?: Json | null
          metadata?: Json
          order_id?: string | null
          rider_id?: string | null
          skip_legume?: boolean
          slot: Database["public"]["Enums"]["meal_slot"]
          status?: Database["public"]["Enums"]["delivery_status"]
          subscription_id: string
          updated_at?: string
          user_id: string
          zone_id?: string | null
        }
        Update: {
          address_id?: string | null
          address_snapshot?: Json | null
          created_at?: string
          delivered_at?: string | null
          delivery_date?: string
          diet?: Database["public"]["Enums"]["diet_type"]
          double_main?: boolean
          failure_reason?: string | null
          id?: string
          is_egg_free?: boolean
          is_make_up?: boolean
          kitchen_id?: string
          menu_snapshot?: Json | null
          metadata?: Json
          order_id?: string | null
          rider_id?: string | null
          skip_legume?: boolean
          slot?: Database["public"]["Enums"]["meal_slot"]
          status?: Database["public"]["Enums"]["delivery_status"]
          subscription_id?: string
          updated_at?: string
          user_id?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_kitchen_id_fkey"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "kitchens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "delivery_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_addons: {
        Row: {
          addon_id: string
          created_at: string
          delivery_id: string
          id: string
          order_id: string | null
          qty: number
          unit_price: number
        }
        Insert: {
          addon_id: string
          created_at?: string
          delivery_id: string
          id?: string
          order_id?: string | null
          qty?: number
          unit_price: number
        }
        Update: {
          addon_id?: string
          created_at?: string
          delivery_id?: string
          id?: string
          order_id?: string | null
          qty?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "delivery_addons_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_addons_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_addons_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_zones: {
        Row: {
          area: string
          avg_minutes: number | null
          created_at: string
          delivery_fee: number
          description: string | null
          distance_km: number | null
          id: string
          is_active: boolean
          kitchen_id: string
          lat: number | null
          lng: number | null
          pincode: string
          slots: string[]
          tier: Database["public"]["Enums"]["zone_tier"]
          updated_at: string
        }
        Insert: {
          area: string
          avg_minutes?: number | null
          created_at?: string
          delivery_fee?: number
          description?: string | null
          distance_km?: number | null
          id?: string
          is_active?: boolean
          kitchen_id?: string
          lat?: number | null
          lng?: number | null
          pincode: string
          slots?: string[]
          tier?: Database["public"]["Enums"]["zone_tier"]
          updated_at?: string
        }
        Update: {
          area?: string
          avg_minutes?: number | null
          created_at?: string
          delivery_fee?: number
          description?: string | null
          distance_km?: number | null
          id?: string
          is_active?: boolean
          kitchen_id?: string
          lat?: number | null
          lng?: number | null
          pincode?: string
          slots?: string[]
          tier?: Database["public"]["Enums"]["zone_tier"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_zones_kitchen_id_fkey"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "kitchens"
            referencedColumns: ["id"]
          },
        ]
      }
      domain_events: {
        Row: {
          attempts: number
          created_at: string
          entity: string | null
          entity_id: string | null
          id: number
          last_error: string | null
          payload: Json
          processed_at: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: never
          last_error?: string | null
          payload?: Json
          processed_at?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: never
          last_error?: string | null
          payload?: Json
          processed_at?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      enquiries: {
        Row: {
          area: string | null
          assigned_to: string | null
          converted_user_id: string | null
          created_at: string
          diet: string | null
          goal: string | null
          id: string
          ip_hash: string | null
          name: string
          note: string | null
          phone: string
          plan_interest: string | null
          preferred_slot: string | null
          source: string
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
        }
        Insert: {
          area?: string | null
          assigned_to?: string | null
          converted_user_id?: string | null
          created_at?: string
          diet?: string | null
          goal?: string | null
          id?: string
          ip_hash?: string | null
          name: string
          note?: string | null
          phone: string
          plan_interest?: string | null
          preferred_slot?: string | null
          source?: string
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Update: {
          area?: string | null
          assigned_to?: string | null
          converted_user_id?: string | null
          created_at?: string
          diet?: string | null
          goal?: string | null
          id?: string
          ip_hash?: string | null
          name?: string
          note?: string | null
          phone?: string
          plan_interest?: string | null
          preferred_slot?: string | null
          source?: string
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enquiries_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquiries_converted_user_id_fkey"
            columns: ["converted_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      faqs: {
        Row: {
          answer: string
          category: string | null
          created_at: string
          id: string
          is_active: boolean
          question: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          question: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          question?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      kitchen_closures: {
        Row: {
          closed_date: string
          created_at: string
          created_by: string | null
          id: string
          kitchen_id: string
          reason: string
        }
        Insert: {
          closed_date: string
          created_at?: string
          created_by?: string | null
          id?: string
          kitchen_id?: string
          reason: string
        }
        Update: {
          closed_date?: string
          created_at?: string
          created_by?: string | null
          id?: string
          kitchen_id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "kitchen_closures_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kitchen_closures_kitchen_id_fkey"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "kitchens"
            referencedColumns: ["id"]
          },
        ]
      }
      kitchens: {
        Row: {
          address: string | null
          city: string
          code: string
          created_at: string
          id: string
          is_active: boolean
          lat: number | null
          lng: number | null
          metadata: Json
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city: string
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          metadata?: Json
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          metadata?: Json
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      menu_item_costs: {
        Row: {
          cost_per_portion: number
          gas_cost: number
          menu_item_id: string
          updated_at: string
        }
        Insert: {
          cost_per_portion: number
          gas_cost?: number
          menu_item_id: string
          updated_at?: string
        }
        Update: {
          cost_per_portion?: number
          gas_cost?: number
          menu_item_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_costs_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: true
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          allergens: string[]
          calories: number
          carbs: number
          category: Database["public"]["Enums"]["menu_category"]
          code: string
          contains_egg: boolean
          cooked_state: string | null
          created_at: string
          description: string | null
          fat: number
          fiber: number
          grams: number
          id: string
          image_url: string | null
          is_active: boolean
          is_veg: boolean
          metadata: Json
          name: string
          protein: number
          updated_at: string
        }
        Insert: {
          allergens?: string[]
          calories: number
          carbs: number
          category: Database["public"]["Enums"]["menu_category"]
          code: string
          contains_egg?: boolean
          cooked_state?: string | null
          created_at?: string
          description?: string | null
          fat: number
          fiber?: number
          grams: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_veg: boolean
          metadata?: Json
          name: string
          protein: number
          updated_at?: string
        }
        Update: {
          allergens?: string[]
          calories?: number
          carbs?: number
          category?: Database["public"]["Enums"]["menu_category"]
          code?: string
          contains_egg?: boolean
          cooked_state?: string | null
          created_at?: string
          description?: string | null
          fat?: number
          fiber?: number
          grams?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_veg?: boolean
          metadata?: Json
          name?: string
          protein?: number
          updated_at?: string
        }
        Relationships: []
      }
      menu_overrides: {
        Row: {
          carb_id: string | null
          created_at: string
          created_by: string | null
          diet: Database["public"]["Enums"]["diet_type"]
          id: string
          kitchen_id: string
          legume_id: string | null
          main_id: string | null
          menu_date: string
          protein_side_id: string | null
          reason: string | null
          salad_id: string | null
          slot: Database["public"]["Enums"]["meal_slot"]
          updated_at: string
        }
        Insert: {
          carb_id?: string | null
          created_at?: string
          created_by?: string | null
          diet: Database["public"]["Enums"]["diet_type"]
          id?: string
          kitchen_id?: string
          legume_id?: string | null
          main_id?: string | null
          menu_date: string
          protein_side_id?: string | null
          reason?: string | null
          salad_id?: string | null
          slot: Database["public"]["Enums"]["meal_slot"]
          updated_at?: string
        }
        Update: {
          carb_id?: string | null
          created_at?: string
          created_by?: string | null
          diet?: Database["public"]["Enums"]["diet_type"]
          id?: string
          kitchen_id?: string
          legume_id?: string | null
          main_id?: string | null
          menu_date?: string
          protein_side_id?: string | null
          reason?: string | null
          salad_id?: string | null
          slot?: Database["public"]["Enums"]["meal_slot"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_overrides_carb_id_fkey"
            columns: ["carb_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_overrides_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_overrides_kitchen_id_fkey"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "kitchens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_overrides_legume_id_fkey"
            columns: ["legume_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_overrides_main_id_fkey"
            columns: ["main_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_overrides_protein_side_id_fkey"
            columns: ["protein_side_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_overrides_salad_id_fkey"
            columns: ["salad_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_rotation: {
        Row: {
          carb_id: string
          created_at: string
          day_number: number
          diet: Database["public"]["Enums"]["diet_type"]
          id: string
          kitchen_id: string
          legume_id: string
          main_id: string
          name: string | null
          protein_side_id: string
          salad_id: string
          slot: Database["public"]["Enums"]["meal_slot"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          carb_id: string
          created_at?: string
          day_number: number
          diet: Database["public"]["Enums"]["diet_type"]
          id?: string
          kitchen_id?: string
          legume_id: string
          main_id: string
          name?: string | null
          protein_side_id: string
          salad_id: string
          slot: Database["public"]["Enums"]["meal_slot"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          carb_id?: string
          created_at?: string
          day_number?: number
          diet?: Database["public"]["Enums"]["diet_type"]
          id?: string
          kitchen_id?: string
          legume_id?: string
          main_id?: string
          name?: string | null
          protein_side_id?: string
          salad_id?: string
          slot?: Database["public"]["Enums"]["meal_slot"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_rotation_carb_id_fkey"
            columns: ["carb_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_rotation_kitchen_id_fkey"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "kitchens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_rotation_legume_id_fkey"
            columns: ["legume_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_rotation_main_id_fkey"
            columns: ["main_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_rotation_protein_side_id_fkey"
            columns: ["protein_side_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_rotation_salad_id_fkey"
            columns: ["salad_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_rotation_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          channel: string
          created_at: string
          error: string | null
          id: string
          link: string | null
          read_at: string | null
          sent_at: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          channel: string
          created_at?: string
          error?: string | null
          id?: string
          link?: string | null
          read_at?: string | null
          sent_at?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          channel?: string
          created_at?: string
          error?: string | null
          id?: string
          link?: string | null
          read_at?: string | null
          sent_at?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          item_type: Database["public"]["Enums"]["order_item_type"]
          metadata: Json
          name: string
          order_id: string
          qty: number
          ref_id: string | null
          total: number
          unit_price: number
        }
        Insert: {
          id?: string
          item_type: Database["public"]["Enums"]["order_item_type"]
          metadata?: Json
          name: string
          order_id: string
          qty: number
          ref_id?: string | null
          total: number
          unit_price: number
        }
        Update: {
          id?: string
          item_type?: Database["public"]["Enums"]["order_item_type"]
          metadata?: Json
          name?: string
          order_id?: string
          qty?: number
          ref_id?: string | null
          total?: number
          unit_price?: number
        }
        Relationships: [
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
          address_snapshot: Json | null
          cf_order_id: string | null
          cf_payment_session_id: string | null
          coupon_id: string | null
          created_at: string
          currency: string
          delivery_fee: number
          discount: number
          expires_at: string
          id: string
          is_top_up: boolean
          metadata: Json
          order_number: string
          paid_at: string | null
          pricing_snapshot: Json
          status: Database["public"]["Enums"]["order_status"]
          subscription_id: string | null
          subtotal: number
          total: number
          type: Database["public"]["Enums"]["plan_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          address_snapshot?: Json | null
          cf_order_id?: string | null
          cf_payment_session_id?: string | null
          coupon_id?: string | null
          created_at?: string
          currency?: string
          delivery_fee?: number
          discount?: number
          expires_at?: string
          id?: string
          is_top_up?: boolean
          metadata?: Json
          order_number?: string
          paid_at?: string | null
          pricing_snapshot: Json
          status?: Database["public"]["Enums"]["order_status"]
          subscription_id?: string | null
          subtotal: number
          total: number
          type: Database["public"]["Enums"]["plan_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          address_snapshot?: Json | null
          cf_order_id?: string | null
          cf_payment_session_id?: string | null
          coupon_id?: string | null
          created_at?: string
          currency?: string
          delivery_fee?: number
          discount?: number
          expires_at?: string
          id?: string
          is_top_up?: boolean
          metadata?: Json
          order_number?: string
          paid_at?: string | null
          pricing_snapshot?: Json
          status?: Database["public"]["Enums"]["order_status"]
          subscription_id?: string | null
          subtotal?: number
          total?: number
          type?: Database["public"]["Enums"]["plan_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          bank_reference: string | null
          cf_payment_id: string | null
          created_at: string
          failure_reason: string | null
          id: string
          method: string | null
          order_id: string
          provider: string
          raw: Json
          status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          amount: number
          bank_reference?: string | null
          cf_payment_id?: string | null
          created_at?: string
          failure_reason?: string | null
          id?: string
          method?: string | null
          order_id: string
          provider?: string
          raw?: Json
          status: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          amount?: number
          bank_reference?: string | null
          cf_payment_id?: string | null
          created_at?: string
          failure_reason?: string | null
          id?: string
          method?: string | null
          order_id?: string
          provider?: string
          raw?: Json
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          badge: string | null
          created_at: string
          description: string | null
          features: Json
          id: string
          ideal_for: Json
          is_active: boolean
          is_popular: boolean
          meals_per_day: number
          metadata: Json
          name: string
          operating_days: number
          slug: string
          sort_order: number
          tagline: string | null
          type: Database["public"]["Enums"]["plan_type"]
          updated_at: string
        }
        Insert: {
          badge?: string | null
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          ideal_for?: Json
          is_active?: boolean
          is_popular?: boolean
          meals_per_day: number
          metadata?: Json
          name: string
          operating_days: number
          slug: string
          sort_order?: number
          tagline?: string | null
          type: Database["public"]["Enums"]["plan_type"]
          updated_at?: string
        }
        Update: {
          badge?: string | null
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          ideal_for?: Json
          is_active?: boolean
          is_popular?: boolean
          meals_per_day?: number
          metadata?: Json
          name?: string
          operating_days?: number
          slug?: string
          sort_order?: number
          tagline?: string | null
          type?: Database["public"]["Enums"]["plan_type"]
          updated_at?: string
        }
        Relationships: []
      }
      pricing_rules: {
        Row: {
          created_at: string
          created_by: string | null
          diet: Database["public"]["Enums"]["diet_type"]
          effective_from: string
          id: string
          plan_type: Database["public"]["Enums"]["plan_type"]
          price_per_meal: number
          second_meal_discount: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          diet: Database["public"]["Enums"]["diet_type"]
          effective_from?: string
          id?: string
          plan_type: Database["public"]["Enums"]["plan_type"]
          price_per_meal: number
          second_meal_discount?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          diet?: Database["public"]["Enums"]["diet_type"]
          effective_from?: string
          id?: string
          plan_type?: Database["public"]["Enums"]["plan_type"]
          price_per_meal?: number
          second_meal_discount?: number
        }
        Relationships: [
          {
            foreignKeyName: "pricing_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          activity_level: string | null
          allergies: string[]
          avatar_url: string | null
          created_at: string
          date_of_birth: string | null
          diet_type: string | null
          disliked_ingredients: string[]
          email: string | null
          full_name: string | null
          gender: string | null
          goal: string | null
          height_cm: number | null
          id: string
          is_blocked: boolean
          is_onboarded: boolean
          kitchen_id: string | null
          last_seen_at: string | null
          marketing_opt_in: boolean
          metadata: Json
          phone: string | null
          phone_verified: boolean
          referral_code: string | null
          referred_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          target_calories: number | null
          target_carbs: number | null
          target_fat: number | null
          target_protein: number | null
          target_weight_kg: number | null
          updated_at: string
          weight_kg: number | null
          whatsapp_opt_in: boolean
        }
        Insert: {
          activity_level?: string | null
          allergies?: string[]
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          diet_type?: string | null
          disliked_ingredients?: string[]
          email?: string | null
          full_name?: string | null
          gender?: string | null
          goal?: string | null
          height_cm?: number | null
          id: string
          is_blocked?: boolean
          is_onboarded?: boolean
          kitchen_id?: string | null
          last_seen_at?: string | null
          marketing_opt_in?: boolean
          metadata?: Json
          phone?: string | null
          phone_verified?: boolean
          referral_code?: string | null
          referred_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          target_calories?: number | null
          target_carbs?: number | null
          target_fat?: number | null
          target_protein?: number | null
          target_weight_kg?: number | null
          updated_at?: string
          weight_kg?: number | null
          whatsapp_opt_in?: boolean
        }
        Update: {
          activity_level?: string | null
          allergies?: string[]
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          diet_type?: string | null
          disliked_ingredients?: string[]
          email?: string | null
          full_name?: string | null
          gender?: string | null
          goal?: string | null
          height_cm?: number | null
          id?: string
          is_blocked?: boolean
          is_onboarded?: boolean
          kitchen_id?: string | null
          last_seen_at?: string | null
          marketing_opt_in?: boolean
          metadata?: Json
          phone?: string | null
          phone_verified?: boolean
          referral_code?: string | null
          referred_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          target_calories?: number | null
          target_carbs?: number | null
          target_fat?: number | null
          target_protein?: number | null
          target_weight_kg?: number | null
          updated_at?: string
          weight_kg?: number | null
          whatsapp_opt_in?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "profiles_kitchen_id_fkey"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "kitchens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      progress_logs: {
        Row: {
          calories: number | null
          created_at: string
          id: string
          log_date: string
          note: string | null
          protein: number | null
          updated_at: string
          user_id: string
          water_l: number | null
          weight_kg: number | null
        }
        Insert: {
          calories?: number | null
          created_at?: string
          id?: string
          log_date: string
          note?: string | null
          protein?: number | null
          updated_at?: string
          user_id: string
          water_l?: number | null
          weight_kg?: number | null
        }
        Update: {
          calories?: number | null
          created_at?: string
          id?: string
          log_date?: string
          note?: string | null
          protein?: number | null
          updated_at?: string
          user_id?: string
          water_l?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "progress_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount: number
          cf_refund_id: string | null
          created_at: string
          id: string
          initiated_by: string | null
          order_id: string
          payment_id: string | null
          raw: Json
          reason: string
          status: Database["public"]["Enums"]["refund_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          cf_refund_id?: string | null
          created_at?: string
          id?: string
          initiated_by?: string | null
          order_id: string
          payment_id?: string | null
          raw?: Json
          reason: string
          status?: Database["public"]["Enums"]["refund_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          cf_refund_id?: string | null
          created_at?: string
          id?: string
          initiated_by?: string | null
          order_id?: string
          payment_id?: string | null
          raw?: Json
          reason?: string
          status?: Database["public"]["Enums"]["refund_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          area: string | null
          avatar_url: string | null
          comment: string
          created_at: string
          goal: string | null
          id: string
          is_featured: boolean
          meals_delivered: number | null
          moderated_by: string | null
          name: string
          rating: number
          status: Database["public"]["Enums"]["review_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          area?: string | null
          avatar_url?: string | null
          comment: string
          created_at?: string
          goal?: string | null
          id?: string
          is_featured?: boolean
          meals_delivered?: number | null
          moderated_by?: string | null
          name: string
          rating: number
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          area?: string | null
          avatar_url?: string | null
          comment?: string
          created_at?: string
          goal?: string | null
          id?: string
          is_featured?: boolean
          meals_delivered?: number | null
          moderated_by?: string | null
          name?: string
          rating?: number
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_moderated_by_fkey"
            columns: ["moderated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          permission: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          permission?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          is_public: boolean
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          is_public?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          is_public?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "site_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          address_id: string | null
          auto_renew: boolean
          cancel_reason: string | null
          cancelled_at: string | null
          cf_subscription_id: string | null
          created_at: string
          diet: Database["public"]["Enums"]["diet_type"]
          end_date: string | null
          excluded_weekdays: number[]
          id: string
          kitchen_id: string
          meal_credits_issued: number
          meals_delivered: number
          meals_per_day: number
          meals_skipped: number
          meals_total: number
          metadata: Json
          paused_from: string | null
          paused_until: string | null
          payment_mode: Database["public"]["Enums"]["payment_mode"]
          plan_id: string | null
          preferences: Json
          slots: Database["public"]["Enums"]["meal_slot"][]
          start_date: string
          status: Database["public"]["Enums"]["subscription_status"]
          type: Database["public"]["Enums"]["plan_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          address_id?: string | null
          auto_renew?: boolean
          cancel_reason?: string | null
          cancelled_at?: string | null
          cf_subscription_id?: string | null
          created_at?: string
          diet: Database["public"]["Enums"]["diet_type"]
          end_date?: string | null
          excluded_weekdays?: number[]
          id?: string
          kitchen_id?: string
          meal_credits_issued?: number
          meals_delivered?: number
          meals_per_day: number
          meals_skipped?: number
          meals_total: number
          metadata?: Json
          paused_from?: string | null
          paused_until?: string | null
          payment_mode?: Database["public"]["Enums"]["payment_mode"]
          plan_id?: string | null
          preferences?: Json
          slots: Database["public"]["Enums"]["meal_slot"][]
          start_date: string
          status?: Database["public"]["Enums"]["subscription_status"]
          type: Database["public"]["Enums"]["plan_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          address_id?: string | null
          auto_renew?: boolean
          cancel_reason?: string | null
          cancelled_at?: string | null
          cf_subscription_id?: string | null
          created_at?: string
          diet?: Database["public"]["Enums"]["diet_type"]
          end_date?: string | null
          excluded_weekdays?: number[]
          id?: string
          kitchen_id?: string
          meal_credits_issued?: number
          meals_delivered?: number
          meals_per_day?: number
          meals_skipped?: number
          meals_total?: number
          metadata?: Json
          paused_from?: string | null
          paused_until?: string | null
          payment_mode?: Database["public"]["Enums"]["payment_mode"]
          plan_id?: string | null
          preferences?: Json
          slots?: Database["public"]["Enums"]["meal_slot"][]
          start_date?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          type?: Database["public"]["Enums"]["plan_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_kitchen_id_fkey"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "kitchens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          area: string | null
          created_at: string
          id: string
          notified_at: string | null
          phone: string
          pincode: string
        }
        Insert: {
          area?: string | null
          created_at?: string
          id?: string
          notified_at?: string | null
          phone: string
          pincode: string
        }
        Update: {
          area?: string | null
          created_at?: string
          id?: string
          notified_at?: string | null
          phone?: string
          pincode?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          error: string | null
          event_id: string
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          provider: string
          received_at: string
        }
        Insert: {
          error?: string | null
          event_id: string
          event_type: string
          id?: string
          payload: Json
          processed_at?: string | null
          provider: string
          received_at?: string
        }
        Update: {
          error?: string | null
          event_id?: string
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          provider?: string
          received_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _address_snapshot: { Args: { p_address: string }; Returns: Json }
      _append_make_up: {
        Args: {
          p_slot: Database["public"]["Enums"]["meal_slot"]
          p_sub: string
        }
        Returns: string
      }
      _can_manage_subscription: {
        Args: { s: Database["public"]["Tables"]["subscriptions"]["Row"] }
        Returns: boolean
      }
      _insert_delivery: {
        Args: {
          d: string
          p_make_up: boolean
          p_order: string
          p_slot: Database["public"]["Enums"]["meal_slot"]
          s: Database["public"]["Tables"]["subscriptions"]["Row"]
        }
        Returns: string
      }
      _next_sub_day: {
        Args: {
          after_date: string
          s: Database["public"]["Tables"]["subscriptions"]["Row"]
        }
        Returns: string
      }
      _remove_make_up: {
        Args: {
          p_slot: Database["public"]["Enums"]["meal_slot"]
          p_sub: string
        }
        Returns: boolean
      }
      _sub_day_ok: {
        Args: {
          d: string
          s: Database["public"]["Tables"]["subscriptions"]["Row"]
        }
        Returns: boolean
      }
      admin_add_meal_credit: {
        Args: {
          p_count: number
          p_reason: string
          p_slot: Database["public"]["Enums"]["meal_slot"]
          p_sub: string
        }
        Returns: Json
      }
      admin_cancel_order: {
        Args: { p_order: string; p_reason: string }
        Returns: undefined
      }
      admin_mark_order_paid: {
        Args: { p_method?: string; p_order: string; p_reference: string }
        Returns: {
          address_snapshot: Json | null
          cf_order_id: string | null
          cf_payment_session_id: string | null
          coupon_id: string | null
          created_at: string
          currency: string
          delivery_fee: number
          discount: number
          expires_at: string
          id: string
          is_top_up: boolean
          metadata: Json
          order_number: string
          paid_at: string | null
          pricing_snapshot: Json
          status: Database["public"]["Enums"]["order_status"]
          subscription_id: string | null
          subtotal: number
          total: number
          type: Database["public"]["Enums"]["plan_type"]
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_overview: { Args: never; Returns: Json }
      assign_rider: {
        Args: { p_delivery_ids: string[]; p_rider: string }
        Returns: number
      }
      cancel_subscription: {
        Args: { p_reason: string; p_sub: string }
        Returns: Json
      }
      cook_sheet: {
        Args: { p_date: string; p_kitchen?: string }
        Returns: {
          diet: Database["public"]["Enums"]["diet_type"]
          double_main: number
          egg_free: number
          make_up: number
          skip_legume: number
          slot: Database["public"]["Enums"]["meal_slot"]
          total: number
        }[]
      }
      cook_sheet_addons: {
        Args: { p_date: string; p_kitchen?: string }
        Returns: {
          addon_id: string
          name: string
          qty: number
          type: Database["public"]["Enums"]["addon_type"]
        }[]
      }
      create_checkout_order: {
        Args: {
          p_address: string
          p_coupon: string
          p_diet: Database["public"]["Enums"]["diet_type"]
          p_discount: number
          p_excluded: number[]
          p_expires_in?: string
          p_fee: number
          p_items: Json
          p_meals_total: number
          p_plan: string
          p_preferences: Json
          p_pricing: Json
          p_slots: Database["public"]["Enums"]["meal_slot"][]
          p_start: string
          p_subtotal: number
          p_total: number
          p_type: Database["public"]["Enums"]["plan_type"]
          p_user: string
        }
        Returns: {
          address_snapshot: Json | null
          cf_order_id: string | null
          cf_payment_session_id: string | null
          coupon_id: string | null
          created_at: string
          currency: string
          delivery_fee: number
          discount: number
          expires_at: string
          id: string
          is_top_up: boolean
          metadata: Json
          order_number: string
          paid_at: string | null
          pricing_snapshot: Json
          status: Database["public"]["Enums"]["order_status"]
          subscription_id: string | null
          subtotal: number
          total: number
          type: Database["public"]["Enums"]["plan_type"]
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_price: {
        Args: {
          p_diet: Database["public"]["Enums"]["diet_type"]
          p_plan_type: Database["public"]["Enums"]["plan_type"]
        }
        Returns: {
          price_per_meal: number
          second_meal_discount: number
        }[]
      }
      customer_summary: { Args: { p_customer: string }; Returns: Json }
      customise_delivery: {
        Args: {
          p_delivery: string
          p_is_egg_free?: boolean
          p_skip_legume?: boolean
        }
        Returns: {
          address_id: string | null
          address_snapshot: Json | null
          created_at: string
          delivered_at: string | null
          delivery_date: string
          diet: Database["public"]["Enums"]["diet_type"]
          double_main: boolean
          failure_reason: string | null
          id: string
          is_egg_free: boolean
          is_make_up: boolean
          kitchen_id: string
          menu_snapshot: Json | null
          metadata: Json
          order_id: string | null
          rider_id: string | null
          skip_legume: boolean
          slot: Database["public"]["Enums"]["meal_slot"]
          status: Database["public"]["Enums"]["delivery_status"]
          subscription_id: string
          updated_at: string
          user_id: string
          zone_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "deliveries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cutoff_for: { Args: { d: string }; Returns: string }
      daily_housekeeping: { Args: never; Returns: Json }
      default_kitchen_id: { Args: never; Returns: string }
      earliest_bookable_date: { Args: { p_kitchen?: string }; Returns: string }
      generate_deliveries: {
        Args: { p_order?: string; p_sub: string }
        Returns: number
      }
      get_menu_for_date: {
        Args: {
          p_date: string
          p_diet: Database["public"]["Enums"]["diet_type"]
          p_kitchen?: string
          p_slot: Database["public"]["Enums"]["meal_slot"]
        }
        Returns: {
          carb_id: string
          day_number: number
          is_closed: boolean
          is_override: boolean
          legume_id: string
          main_id: string
          menu_date: string
          name: string
          protein_side_id: string
          salad_id: string
        }[]
      }
      get_setting: { Args: { k: string }; Returns: Json }
      has_permission: { Args: { p: string }; Returns: boolean }
      increment_blog_view: { Args: { p_slug: string }; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      is_before_cutoff: { Args: { d: string }; Returns: boolean }
      is_feature_enabled: { Args: { flag: string }; Returns: boolean }
      is_operating_day: {
        Args: { d: string; p_kitchen?: string }
        Returns: boolean
      }
      is_staff: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      is_super_admin_permission: { Args: { p: string }; Returns: boolean }
      lock_deliveries: { Args: { p_date?: string }; Returns: number }
      log_activity: {
        Args: {
          p_action: string
          p_after?: Json
          p_before?: Json
          p_entity: string
          p_entity_id: string
          p_user: string
        }
        Returns: undefined
      }
      mark_order_failed: {
        Args: { p_order: string; p_raw?: Json; p_reason: string }
        Returns: undefined
      }
      mark_order_paid: {
        Args: {
          p_amount: number
          p_cf_payment_id: string
          p_method: string
          p_order: string
          p_raw?: Json
        }
        Returns: {
          address_snapshot: Json | null
          cf_order_id: string | null
          cf_payment_session_id: string | null
          coupon_id: string | null
          created_at: string
          currency: string
          delivery_fee: number
          discount: number
          expires_at: string
          id: string
          is_top_up: boolean
          metadata: Json
          order_number: string
          paid_at: string | null
          pricing_snapshot: Json
          status: Database["public"]["Enums"]["order_status"]
          subscription_id: string | null
          subtotal: number
          total: number
          type: Database["public"]["Enums"]["plan_type"]
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      menu_snapshot_json: {
        Args: {
          p_date: string
          p_diet: Database["public"]["Enums"]["diet_type"]
          p_kitchen: string
          p_slot: Database["public"]["Enums"]["meal_slot"]
        }
        Returns: Json
      }
      metric_meals_forecast: {
        Args: { p_days?: number }
        Returns: {
          day: string
          dinner: number
          lunch: number
          skipped: number
        }[]
      }
      metric_revenue_daily: {
        Args: { p_days?: number }
        Returns: {
          day: string
          orders: number
          revenue: number
        }[]
      }
      next_operating_day: {
        Args: { after_date: string; p_kitchen?: string }
        Returns: string
      }
      now_ist: { Args: never; Returns: string }
      pause_subscription: {
        Args: { p_from: string; p_sub: string; p_until: string }
        Returns: Json
      }
      record_payment_attempt: {
        Args: {
          p_amount: number
          p_cf_payment_id: string
          p_method: string
          p_order: string
          p_raw?: Json
          p_reason: string
          p_status: Database["public"]["Enums"]["payment_status"]
        }
        Returns: undefined
      }
      resume_subscription: { Args: { p_sub: string }; Returns: Json }
      rotation_day_number: { Args: { d: string }; Returns: number }
      set_staff_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_user: string
        }
        Returns: undefined
      }
      skip_delivery: { Args: { p_delivery: string }; Returns: Json }
      staff_user_by_email: { Args: { p_email: string }; Returns: string }
      submit_payment_reference: {
        Args: { p_order: string; p_reference: string }
        Returns: undefined
      }
      today_ist: { Args: never; Returns: string }
      unskip_delivery: { Args: { p_delivery: string }; Returns: Json }
      update_delivery_status: {
        Args: {
          p_delivery: string
          p_reason?: string
          p_status: Database["public"]["Enums"]["delivery_status"]
        }
        Returns: {
          address_id: string | null
          address_snapshot: Json | null
          created_at: string
          delivered_at: string | null
          delivery_date: string
          diet: Database["public"]["Enums"]["diet_type"]
          double_main: boolean
          failure_reason: string | null
          id: string
          is_egg_free: boolean
          is_make_up: boolean
          kitchen_id: string
          menu_snapshot: Json | null
          metadata: Json
          order_id: string | null
          rider_id: string | null
          skip_legume: boolean
          slot: Database["public"]["Enums"]["meal_slot"]
          status: Database["public"]["Enums"]["delivery_status"]
          subscription_id: string
          updated_at: string
          user_id: string
          zone_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "deliveries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
    }
    Enums: {
      actor_role:
        | "customer"
        | "admin"
        | "kitchen"
        | "rider"
        | "support"
        | "system"
        | "super_admin"
      addon_type: "side" | "drink"
      app_role:
        | "customer"
        | "admin"
        | "kitchen"
        | "rider"
        | "support"
        | "super_admin"
      content_status: "draft" | "scheduled" | "published" | "archived"
      delivery_status:
        | "scheduled"
        | "skipped"
        | "paused"
        | "locked"
        | "preparing"
        | "packed"
        | "out_for_delivery"
        | "delivered"
        | "failed"
        | "cancelled"
      diet_type: "veg" | "non_veg"
      discount_type: "flat" | "percentage"
      lead_status: "new" | "contacted" | "converted" | "lost"
      meal_slot: "lunch" | "dinner"
      menu_category: "main" | "protein_side" | "salad" | "legume" | "carb"
      order_item_type:
        | "meal"
        | "addon"
        | "bundle"
        | "fee"
        | "discount"
        | "top_up"
      order_status:
        | "created"
        | "pending_payment"
        | "paid"
        | "failed"
        | "cancelled"
        | "refunded"
        | "partially_refunded"
      payment_mode: "prepaid" | "autopay"
      payment_status:
        | "pending"
        | "success"
        | "failed"
        | "user_dropped"
        | "cancelled"
      plan_type: "trial" | "weekly" | "monthly" | "custom"
      refund_status: "pending" | "success" | "failed" | "cancelled"
      review_status: "pending" | "approved" | "rejected"
      subscription_status:
        | "pending_payment"
        | "active"
        | "paused"
        | "cancelled"
        | "completed"
        | "expired"
      zone_tier: "core" | "phase2"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      actor_role: [
        "customer",
        "admin",
        "kitchen",
        "rider",
        "support",
        "system",
        "super_admin",
      ],
      addon_type: ["side", "drink"],
      app_role: [
        "customer",
        "admin",
        "kitchen",
        "rider",
        "support",
        "super_admin",
      ],
      content_status: ["draft", "scheduled", "published", "archived"],
      delivery_status: [
        "scheduled",
        "skipped",
        "paused",
        "locked",
        "preparing",
        "packed",
        "out_for_delivery",
        "delivered",
        "failed",
        "cancelled",
      ],
      diet_type: ["veg", "non_veg"],
      discount_type: ["flat", "percentage"],
      lead_status: ["new", "contacted", "converted", "lost"],
      meal_slot: ["lunch", "dinner"],
      menu_category: ["main", "protein_side", "salad", "legume", "carb"],
      order_item_type: ["meal", "addon", "bundle", "fee", "discount", "top_up"],
      order_status: [
        "created",
        "pending_payment",
        "paid",
        "failed",
        "cancelled",
        "refunded",
        "partially_refunded",
      ],
      payment_mode: ["prepaid", "autopay"],
      payment_status: [
        "pending",
        "success",
        "failed",
        "user_dropped",
        "cancelled",
      ],
      plan_type: ["trial", "weekly", "monthly", "custom"],
      refund_status: ["pending", "success", "failed", "cancelled"],
      review_status: ["pending", "approved", "rejected"],
      subscription_status: [
        "pending_payment",
        "active",
        "paused",
        "cancelled",
        "completed",
        "expired",
      ],
      zone_tier: ["core", "phase2"],
    },
  },
} as const

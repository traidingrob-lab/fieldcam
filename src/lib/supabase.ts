import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️  Supabase no configurado. Copia .env.example a .env y agrega tus credenciales.')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
)

export type Database = {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          name: string
          description: string | null
          status: 'active' | 'complete' | 'pending' | 'archived'
          address: string | null
          city: string | null
          lat: number | null
          lng: number | null
          cover_photo_url: string | null
          owner_id: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['projects']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['projects']['Insert']>
      }
      photos: {
        Row: {
          id: string
          project_id: string
          user_id: string
          url: string
          thumbnail_url: string | null
          caption: string | null
          tags: string[]
          lat: number | null
          lng: number | null
          taken_at: string
          created_at: string
          ai_description: string | null
        }
        Insert: Omit<Database['public']['Tables']['photos']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['photos']['Insert']>
      }
      checklists: {
        Row: {
          id: string
          project_id: string
          title: string
          created_by: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['checklists']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['checklists']['Insert']>
      }
      checklist_items: {
        Row: {
          id: string
          checklist_id: string
          text: string
          completed: boolean
          assigned_to: string | null
          completed_at: string | null
          order_index: number
        }
        Insert: Omit<Database['public']['Tables']['checklist_items']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['checklist_items']['Insert']>
      }
      team_members: {
        Row: {
          id: string
          user_id: string
          org_id: string
          role: 'admin' | 'supervisor' | 'technician' | 'client'
          full_name: string
          avatar_url: string | null
          status: 'active' | 'away' | 'offline'
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['team_members']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['team_members']['Insert']>
      }
      invoices: {
        Row: {
          id: string
          project_id: string
          client_name: string
          amount: number
          status: 'paid' | 'pending' | 'overdue'
          due_date: string | null
          stripe_invoice_id: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['invoices']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['invoices']['Insert']>
      }
      reports: {
        Row: {
          id: string
          project_id: string
          title: string
          type: 'photo' | 'ai_summary' | 'client_gallery' | 'inspection'
          pdf_url: string | null
          share_token: string | null
          content: string | null
          created_by: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['reports']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['reports']['Insert']>
      }
    }
  }
}

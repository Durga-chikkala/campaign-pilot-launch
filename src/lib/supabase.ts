
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      campaigns: {
        Row: {
          id: string
          user_id: string
          name: string
          status: 'draft' | 'active' | 'completed' | 'paused'
          created_at: string
          updated_at: string
          csv_url?: string
          total_emails?: number
          sent_emails?: number
          failed_emails?: number
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          status?: 'draft' | 'active' | 'completed' | 'paused'
          created_at?: string
          updated_at?: string
          csv_url?: string
          total_emails?: number
          sent_emails?: number
          failed_emails?: number
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          status?: 'draft' | 'active' | 'completed' | 'paused'
          created_at?: string
          updated_at?: string
          csv_url?: string
          total_emails?: number
          sent_emails?: number
          failed_emails?: number
        }
      }
      email_templates: {
        Row: {
          id: string
          campaign_id: string
          user_id: string
          name: string
          subject: string
          body: string
          placeholders: string[]
          created_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          user_id: string
          name: string
          subject: string
          body: string
          placeholders?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          user_id?: string
          name?: string
          subject?: string
          body?: string
          placeholders?: string[]
          created_at?: string
        }
      }
      placeholder_mappings: {
        Row: {
          id: string
          campaign_id: string
          user_id: string
          placeholder: string
          csv_header: string
          created_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          user_id: string
          placeholder: string
          csv_header: string
          created_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          user_id?: string
          placeholder?: string
          csv_header?: string
          created_at?: string
        }
      }
      smtp_configs: {
        Row: {
          id: string
          campaign_id: string
          user_id: string
          host: string
          port: number
          sender_email: string
          sender_name: string
          created_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          user_id: string
          host: string
          port: number
          sender_email: string
          sender_name: string
          created_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          user_id?: string
          host?: string
          port?: number
          sender_email?: string
          sender_name?: string
          created_at?: string
        }
      }
      email_logs: {
        Row: {
          id: string
          campaign_id: string
          user_id: string
          recipient_email: string
          status: 'sent' | 'failed' | 'pending'
          error_message?: string
          sent_at?: string
          created_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          user_id: string
          recipient_email: string
          status: 'sent' | 'failed' | 'pending'
          error_message?: string
          sent_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          user_id?: string
          recipient_email?: string
          status?: 'sent' | 'failed' | 'pending'
          error_message?: string
          sent_at?: string
          created_at?: string
        }
      }
    }
  }
}

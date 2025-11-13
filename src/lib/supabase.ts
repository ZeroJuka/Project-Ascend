import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'

const supabaseUrl = Constants.expoConfig?.extra?.SUPABASE_URL || ''
const supabaseAnonKey = Constants.expoConfig?.extra?.SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          user_id: string | null
          name: string
          color: string
          icon: string
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          color?: string
          icon?: string
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          color?: string
          icon?: string
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string | null
          category_id: string | null
          amount: number
          description: string
          transaction_date: string
          type: 'income' | 'expense'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          category_id?: string | null
          amount: number
          description: string
          transaction_date?: string
          type: 'income' | 'expense'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          category_id?: string | null
          amount?: number
          description?: string
          transaction_date?: string
          type?: 'income' | 'expense'
          created_at?: string
          updated_at?: string
        }
      }
      goals: {
        Row: {
          id: string
          user_id: string | null
          title: string
          description: string | null
          target_amount: number
          current_amount: number
          goal_type: 'spend_less' | 'spend_more' | 'save'
          time_period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'one_time'
          start_date: string
          end_date: string | null
          is_recurring: boolean
          category_ids: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          title: string
          description?: string | null
          target_amount: number
          current_amount?: number
          goal_type: 'spend_less' | 'spend_more' | 'save'
          time_period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'one_time'
          start_date?: string
          end_date?: string | null
          is_recurring?: boolean
          category_ids?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          title?: string
          description?: string | null
          target_amount?: number
          current_amount?: number
          goal_type?: 'spend_less' | 'spend_more' | 'save'
          time_period?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'one_time'
          start_date?: string
          end_date?: string | null
          is_recurring?: boolean
          category_ids?: string[] | null
          created_at?: string
          updated_at?: string
        }
      }
      bills: {
        Row: {
          id: string
          user_id: string | null
          title: string
          amount: number
          due_date: string
          frequency: 'once' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
          category_id: string | null
          is_paid: boolean
          paid_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          title: string
          amount: number
          due_date: string
          frequency: 'once' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
          category_id?: string | null
          is_paid?: boolean
          paid_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          title?: string
          amount?: number
          due_date?: string
          frequency?: 'once' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
          category_id?: string | null
          is_paid?: boolean
          paid_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      chat_messages: {
        Row: {
          user_id: string
          conversation: any
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          conversation: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          conversation?: any
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

export type Tables = Database['public']['Tables']

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; user_id: string; email: string; full_name: string | null; avatar_url: string | null; currency: string | null; created_at: string | null; updated_at: string | null };
        Insert: { id: string; user_id: string; email: string; full_name?: string | null; avatar_url?: string | null; currency?: string | null; created_at?: string | null; updated_at?: string | null };
        Update: { id?: string; user_id?: string; email?: string; full_name?: string | null; avatar_url?: string | null; currency?: string | null; created_at?: string | null; updated_at?: string | null };
        Relationships: [];
      };
      categories: {
        Row: { id: string; user_id: string; name: string; type: string; color: string | null; icon: string | null; created_at: string | null; updated_at: string | null };
        Insert: { id?: string; user_id: string; name: string; type: string; color?: string | null; icon?: string | null; created_at?: string | null; updated_at?: string | null };
        Update: { id?: string; user_id?: string; name?: string; type?: string; color?: string | null; icon?: string | null; created_at?: string | null; updated_at?: string | null };
        Relationships: [];
      };
      expenses: {
        Row: { id: string; user_id: string; amount: number; category_id: string | null; category: string | null; date: string; vendor: string | null; payment_method: string | null; created_at: string | null; updated_at: string | null };
        Insert: { id?: string; user_id: string; amount: number; category_id?: string | null; category?: string | null; date: string; vendor?: string | null; payment_method?: string | null; created_at?: string | null; updated_at?: string | null };
        Update: { id?: string; user_id?: string; amount?: number; category_id?: string | null; category?: string | null; date?: string; vendor?: string | null; payment_method?: string | null; created_at?: string | null; updated_at?: string | null };
        Relationships: [];
      };
      income: {
        Row: { id: string; user_id: string; amount: number; category_id: string | null; category: string | null; date: string; source: string | null; payment_method: string | null; created_at: string | null; updated_at: string | null };
        Insert: { id?: string; user_id: string; amount: number; category_id?: string | null; category?: string | null; date: string; source?: string | null; payment_method?: string | null; created_at?: string | null; updated_at?: string | null };
        Update: { id?: string; user_id?: string; amount?: number; category_id?: string | null; category?: string | null; date?: string; source?: string | null; payment_method?: string | null; created_at?: string | null; updated_at?: string | null };
        Relationships: [];
      };
      transactions: {
        Row: { id: string; user_id: string; type: string; amount: number; category_id: string | null; category: string | null; date: string; reference_id: string | null; reference_type: string | null; payment_method: string | null; created_at: string | null; updated_at: string | null };
        Insert: { id?: string; user_id: string; type: string; amount: number; category_id?: string | null; category?: string | null; date: string; reference_id?: string | null; reference_type?: string | null; payment_method?: string | null; created_at?: string | null; updated_at?: string | null };
        Update: { id?: string; user_id?: string; type?: string; amount?: number; category_id?: string | null; category?: string | null; date?: string; reference_id?: string | null; reference_type?: string | null; payment_method?: string | null; created_at?: string | null; updated_at?: string | null };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];


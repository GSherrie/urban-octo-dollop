export type Json = string | number | boolean | null | object | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: { id: string; email: string; name: string | null; user_id: string; created_at: string | null; updated_at: string | null }
        Insert: { id?: string; email: string; name?: string | null; user_id: string; created_at?: string | null; updated_at?: string | null }
        Update: { id?: string; email?: string; name?: string | null; user_id?: string; created_at?: string | null; updated_at?: string | null }
        Relationships: []
      }
      expenses: {
        Row: { id: string; user_id: string; amount: number; description: string | null; category: string | null; date: string; created_at: string | null; updated_at: string | null }
        Insert: { id?: string; user_id: string; amount: number; description?: string | null; category?: string | null; date: string; created_at?: string | null; updated_at?: string | null }
        Update: { id?: string; user_id?: string; amount?: number; description?: string | null; category?: string | null; date?: string; created_at?: string | null; updated_at?: string | null }
        Relationships: [{ foreignKeyName: "expenses_user_id_fkey"; columns: ["user_id"]; referencedRelation: "users"; referencedColumns: ["id"] }]
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
        CompositeTypes: { [_ in never]: never }
  }
}

// Helper types for easier database access
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']


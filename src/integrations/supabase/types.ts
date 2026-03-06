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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_memory: {
        Row: {
          created_at: string
          data: Json
          id: string
          lottery: string
          memory_type: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          lottery: string
          memory_type: string
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          lottery?: string
          memory_type?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      api_tokens: {
        Row: {
          created_at: string
          id: string
          is_valid: boolean | null
          last_sync_at: string | null
          provider: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_valid?: boolean | null
          last_sync_at?: string | null
          provider?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_valid?: boolean | null
          last_sync_at?: string | null
          provider?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bets: {
        Row: {
          checked_at: string | null
          concurso: number
          confidence: number
          confirmed_at: string | null
          created_at: string
          draw_numbers: number[] | null
          hits: number | null
          id: string
          lottery: string
          numbers: number[]
          prize_amount: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          checked_at?: string | null
          concurso: number
          confidence?: number
          confirmed_at?: string | null
          created_at?: string
          draw_numbers?: number[] | null
          hits?: number | null
          id?: string
          lottery: string
          numbers: number[]
          prize_amount?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          checked_at?: string | null
          concurso?: number
          confidence?: number
          confirmed_at?: string | null
          created_at?: string
          draw_numbers?: number[] | null
          hits?: number | null
          id?: string
          lottery?: string
          numbers?: number[]
          prize_amount?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gate_config: {
        Row: {
          auto_approve: boolean
          created_at: string
          id: string
          min_confidence: number
          notify_on_gate: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_approve?: boolean
          created_at?: string
          id?: string
          min_confidence?: number
          notify_on_gate?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_approve?: boolean
          created_at?: string
          id?: string
          min_confidence?: number
          notify_on_gate?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gate_history: {
        Row: {
          concurso: number
          confidence: number
          created_at: string
          found_at: string
          gate_status: string
          id: string
          lottery: string
          numbers: number[]
          user_id: string
        }
        Insert: {
          concurso: number
          confidence: number
          created_at?: string
          found_at?: string
          gate_status?: string
          id?: string
          lottery: string
          numbers: number[]
          user_id: string
        }
        Update: {
          concurso?: number
          confidence?: number
          created_at?: string
          found_at?: string
          gate_status?: string
          id?: string
          lottery?: string
          numbers?: number[]
          user_id?: string
        }
        Relationships: []
      }
      result_checks: {
        Row: {
          bet_numbers: number[]
          checked_at: string
          concurso: number
          created_at: string
          data_concurso: string | null
          draw_numbers: number[]
          hits: number
          id: string
          lottery: string
          matched_numbers: number[]
          premiacao: Json | null
          prize_tier: string | null
          prize_value: number | null
          total_winners: number | null
          user_id: string
        }
        Insert: {
          bet_numbers?: number[]
          checked_at?: string
          concurso: number
          created_at?: string
          data_concurso?: string | null
          draw_numbers?: number[]
          hits?: number
          id?: string
          lottery: string
          matched_numbers?: number[]
          premiacao?: Json | null
          prize_tier?: string | null
          prize_value?: number | null
          total_winners?: number | null
          user_id: string
        }
        Update: {
          bet_numbers?: number[]
          checked_at?: string
          concurso?: number
          created_at?: string
          data_concurso?: string | null
          draw_numbers?: number[]
          hits?: number
          id?: string
          lottery?: string
          matched_numbers?: number[]
          premiacao?: Json | null
          prize_tier?: string | null
          prize_value?: number | null
          total_winners?: number | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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

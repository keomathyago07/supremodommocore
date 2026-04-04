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
      apostas_confirmadas: {
        Row: {
          aposta_pendente_id: string | null
          concurso: number | null
          concurso_verificado: number | null
          created_at: string | null
          custo_aposta: number
          data_sorteio: string | null
          descricao_faixa: string | null
          dominancia: number
          faixas_premio: Json | null
          horario_confirmacao: string
          id: string
          loteria: string
          numeros: number[]
          numeros_sorteados: number[] | null
          pontos_acertados: number | null
          precisao: number
          qtd_numeros_esperada: number
          range_max: number
          range_min: number
          status_verificacao: string
          user_id: string
          valor_premio: number | null
        }
        Insert: {
          aposta_pendente_id?: string | null
          concurso?: number | null
          concurso_verificado?: number | null
          created_at?: string | null
          custo_aposta?: number
          data_sorteio?: string | null
          descricao_faixa?: string | null
          dominancia?: number
          faixas_premio?: Json | null
          horario_confirmacao?: string
          id?: string
          loteria: string
          numeros: number[]
          numeros_sorteados?: number[] | null
          pontos_acertados?: number | null
          precisao?: number
          qtd_numeros_esperada?: number
          range_max?: number
          range_min?: number
          status_verificacao?: string
          user_id: string
          valor_premio?: number | null
        }
        Update: {
          aposta_pendente_id?: string | null
          concurso?: number | null
          concurso_verificado?: number | null
          created_at?: string | null
          custo_aposta?: number
          data_sorteio?: string | null
          descricao_faixa?: string | null
          dominancia?: number
          faixas_premio?: Json | null
          horario_confirmacao?: string
          id?: string
          loteria?: string
          numeros?: number[]
          numeros_sorteados?: number[] | null
          pontos_acertados?: number | null
          precisao?: number
          qtd_numeros_esperada?: number
          range_max?: number
          range_min?: number
          status_verificacao?: string
          user_id?: string
          valor_premio?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "apostas_confirmadas_aposta_pendente_id_fkey"
            columns: ["aposta_pendente_id"]
            isOneToOne: false
            referencedRelation: "apostas_pendentes"
            referencedColumns: ["id"]
          },
        ]
      }
      apostas_pendentes: {
        Row: {
          concurso: number | null
          created_at: string | null
          criterios_atendidos: Json | null
          dominancia: number
          horario_envio: string
          id: string
          loteria: string
          numeros: number[]
          precisao: number
          status: string
          user_id: string
        }
        Insert: {
          concurso?: number | null
          created_at?: string | null
          criterios_atendidos?: Json | null
          dominancia?: number
          horario_envio?: string
          id?: string
          loteria: string
          numeros: number[]
          precisao?: number
          status?: string
          user_id: string
        }
        Update: {
          concurso?: number | null
          created_at?: string | null
          criterios_atendidos?: Json | null
          dominancia?: number
          horario_envio?: string
          id?: string
          loteria?: string
          numeros?: number[]
          precisao?: number
          status?: string
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
      financeiro_premiacoes: {
        Row: {
          acertos: number
          aposta_confirmada_id: string | null
          concurso: number | null
          created_at: string | null
          data_lancamento: string
          descricao_faixa: string | null
          id: string
          loteria: string
          numeros_apostados: number[]
          numeros_sorteados: number[] | null
          observacoes: string | null
          status_pagamento: string
          user_id: string
          valor_bruto: number
          valor_liquido: number
        }
        Insert: {
          acertos?: number
          aposta_confirmada_id?: string | null
          concurso?: number | null
          created_at?: string | null
          data_lancamento?: string
          descricao_faixa?: string | null
          id?: string
          loteria: string
          numeros_apostados: number[]
          numeros_sorteados?: number[] | null
          observacoes?: string | null
          status_pagamento?: string
          user_id: string
          valor_bruto?: number
          valor_liquido?: number
        }
        Update: {
          acertos?: number
          aposta_confirmada_id?: string | null
          concurso?: number | null
          created_at?: string | null
          data_lancamento?: string
          descricao_faixa?: string | null
          id?: string
          loteria?: string
          numeros_apostados?: number[]
          numeros_sorteados?: number[] | null
          observacoes?: string | null
          status_pagamento?: string
          user_id?: string
          valor_bruto?: number
          valor_liquido?: number
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_premiacoes_aposta_confirmada_id_fkey"
            columns: ["aposta_confirmada_id"]
            isOneToOne: false
            referencedRelation: "apostas_confirmadas"
            referencedColumns: ["id"]
          },
        ]
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
      resultados_sorteios: {
        Row: {
          acumulado: boolean | null
          concurso: number
          created_at: string | null
          data_apuracao: string | null
          dezenas: number[]
          id: string
          loteria: string
          raw_response: Json | null
          valor_proximo: number | null
        }
        Insert: {
          acumulado?: boolean | null
          concurso: number
          created_at?: string | null
          data_apuracao?: string | null
          dezenas: number[]
          id?: string
          loteria: string
          raw_response?: Json | null
          valor_proximo?: number | null
        }
        Update: {
          acumulado?: boolean | null
          concurso?: number
          created_at?: string | null
          data_apuracao?: string | null
          dezenas?: number[]
          id?: string
          loteria?: string
          raw_response?: Json | null
          valor_proximo?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      vw_dashboard_loterias: {
        Row: {
          com_acertos: number | null
          loteria: string | null
          media_pontos: number | null
          total_apostas: number | null
          total_premio_liquido: number | null
          user_id: string | null
          verificadas: number | null
        }
        Relationships: []
      }
      vw_financeiro_resumo: {
        Row: {
          a_receber: number | null
          ja_recebido: number | null
          loteria: string | null
          media_acertos: number | null
          total_acertos: number | null
          total_bruto: number | null
          total_liquido: number | null
          total_premiadas: number | null
          user_id: string | null
        }
        Relationships: []
      }
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

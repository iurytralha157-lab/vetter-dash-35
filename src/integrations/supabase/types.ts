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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          alerta_saldo_baixo: number | null
          ativar_campanhas_meta: boolean | null
          budget_mensal_global: number | null
          budget_mensal_google: number | null
          budget_mensal_meta: number | null
          canais: string[]
          canal_relatorio: string | null
          centro_custo: string | null
          cliente_id: string | null
          contrato_inicio: string | null
          contrato_renovacao: string | null
          conversoes: string[] | null
          created_at: string
          email: string | null
          forma_pagamento: string | null
          ga4_stream_id: string | null
          gestor_id: string | null
          google_ads_id: string | null
          gtm_id: string | null
          horario_relatorio: string | null
          id: string
          id_grupo: string | null
          link_drive: string | null
          link_google: string | null
          link_meta: string | null
          meta_account_id: string | null
          meta_business_id: string | null
          meta_page_id: string | null
          modo_saldo_meta: string | null
          monitorar_saldo_meta: boolean | null
          nome_cliente: string
          nome_empresa: string
          notificacao_erro_sync: boolean | null
          notificacao_leads_diarios: boolean | null
          notificacao_saldo_baixo: boolean | null
          observacoes: string | null
          ocultar_ranking: boolean | null
          papel_padrao: string | null
          pixel_meta: string | null
          saldo_meta: number | null
          somar_metricas: boolean | null
          status: string
          telefone: string
          templates_padrao: string[] | null
          traqueamento_ativo: boolean | null
          typebot_ativo: boolean | null
          typebot_url: string | null
          updated_at: string
          url_crm: string | null
          usa_crm_externo: boolean | null
          usa_google_ads: boolean | null
          usa_meta_ads: boolean | null
          user_id: string
          usuarios_vinculados: string[] | null
          utm_padrao: string | null
          webhook_google: string | null
          webhook_meta: string | null
        }
        Insert: {
          alerta_saldo_baixo?: number | null
          ativar_campanhas_meta?: boolean | null
          budget_mensal_global?: number | null
          budget_mensal_google?: number | null
          budget_mensal_meta?: number | null
          canais?: string[]
          canal_relatorio?: string | null
          centro_custo?: string | null
          cliente_id?: string | null
          contrato_inicio?: string | null
          contrato_renovacao?: string | null
          conversoes?: string[] | null
          created_at?: string
          email?: string | null
          forma_pagamento?: string | null
          ga4_stream_id?: string | null
          gestor_id?: string | null
          google_ads_id?: string | null
          gtm_id?: string | null
          horario_relatorio?: string | null
          id?: string
          id_grupo?: string | null
          link_drive?: string | null
          link_google?: string | null
          link_meta?: string | null
          meta_account_id?: string | null
          meta_business_id?: string | null
          meta_page_id?: string | null
          modo_saldo_meta?: string | null
          monitorar_saldo_meta?: boolean | null
          nome_cliente: string
          nome_empresa: string
          notificacao_erro_sync?: boolean | null
          notificacao_leads_diarios?: boolean | null
          notificacao_saldo_baixo?: boolean | null
          observacoes?: string | null
          ocultar_ranking?: boolean | null
          papel_padrao?: string | null
          pixel_meta?: string | null
          saldo_meta?: number | null
          somar_metricas?: boolean | null
          status?: string
          telefone: string
          templates_padrao?: string[] | null
          traqueamento_ativo?: boolean | null
          typebot_ativo?: boolean | null
          typebot_url?: string | null
          updated_at?: string
          url_crm?: string | null
          usa_crm_externo?: boolean | null
          usa_google_ads?: boolean | null
          usa_meta_ads?: boolean | null
          user_id?: string
          usuarios_vinculados?: string[] | null
          utm_padrao?: string | null
          webhook_google?: string | null
          webhook_meta?: string | null
        }
        Update: {
          alerta_saldo_baixo?: number | null
          ativar_campanhas_meta?: boolean | null
          budget_mensal_global?: number | null
          budget_mensal_google?: number | null
          budget_mensal_meta?: number | null
          canais?: string[]
          canal_relatorio?: string | null
          centro_custo?: string | null
          cliente_id?: string | null
          contrato_inicio?: string | null
          contrato_renovacao?: string | null
          conversoes?: string[] | null
          created_at?: string
          email?: string | null
          forma_pagamento?: string | null
          ga4_stream_id?: string | null
          gestor_id?: string | null
          google_ads_id?: string | null
          gtm_id?: string | null
          horario_relatorio?: string | null
          id?: string
          id_grupo?: string | null
          link_drive?: string | null
          link_google?: string | null
          link_meta?: string | null
          meta_account_id?: string | null
          meta_business_id?: string | null
          meta_page_id?: string | null
          modo_saldo_meta?: string | null
          monitorar_saldo_meta?: boolean | null
          nome_cliente?: string
          nome_empresa?: string
          notificacao_erro_sync?: boolean | null
          notificacao_leads_diarios?: boolean | null
          notificacao_saldo_baixo?: boolean | null
          observacoes?: string | null
          ocultar_ranking?: boolean | null
          papel_padrao?: string | null
          pixel_meta?: string | null
          saldo_meta?: number | null
          somar_metricas?: boolean | null
          status?: string
          telefone?: string
          templates_padrao?: string[] | null
          traqueamento_ativo?: boolean | null
          typebot_ativo?: boolean | null
          typebot_url?: string | null
          updated_at?: string
          url_crm?: string | null
          usa_crm_externo?: boolean | null
          usa_google_ads?: boolean | null
          usa_meta_ads?: boolean | null
          user_id?: string
          usuarios_vinculados?: string[] | null
          utm_padrao?: string | null
          webhook_google?: string | null
          webhook_meta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_gestor_id_fkey"
            columns: ["gestor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_creatives: {
        Row: {
          ad_id: string
          avg_cpl: number | null
          avg_ctr: number | null
          avg_hold_rate: number | null
          avg_hook_rate: number | null
          campaign_id: string
          client_id: string
          created_at: string | null
          creative_id: string
          creative_name: string | null
          creative_type: string | null
          days_active: number | null
          first_seen_date: string | null
          id: string
          last_active_date: string | null
          thumbnail_url: string | null
          total_clicks: number | null
          total_impressions: number | null
          total_leads: number | null
          total_spend: number | null
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          ad_id: string
          avg_cpl?: number | null
          avg_ctr?: number | null
          avg_hold_rate?: number | null
          avg_hook_rate?: number | null
          campaign_id: string
          client_id: string
          created_at?: string | null
          creative_id: string
          creative_name?: string | null
          creative_type?: string | null
          days_active?: number | null
          first_seen_date?: string | null
          id?: string
          last_active_date?: string | null
          thumbnail_url?: string | null
          total_clicks?: number | null
          total_impressions?: number | null
          total_leads?: number | null
          total_spend?: number | null
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          ad_id?: string
          avg_cpl?: number | null
          avg_ctr?: number | null
          avg_hold_rate?: number | null
          avg_hook_rate?: number | null
          campaign_id?: string
          client_id?: string
          created_at?: string | null
          creative_id?: string
          creative_name?: string | null
          creative_type?: string | null
          days_active?: number | null
          first_seen_date?: string | null
          id?: string
          last_active_date?: string | null
          thumbnail_url?: string | null
          total_clicks?: number | null
          total_impressions?: number | null
          total_leads?: number | null
          total_spend?: number | null
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_creatives_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_creatives_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "leads_stats"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "campaign_creatives_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "relatorio_n8n_consolidated"
            referencedColumns: ["conta_id"]
          },
        ]
      }
      clientes: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          archived: boolean | null
          bairros_regioes: string[] | null
          budget_mensal: number | null
          campanhas_ativas: boolean | null
          cidade_regiao: string | null
          cidades: string[] | null
          cnpj: string | null
          cnpj_cpf: string | null
          contato_preferido: string | null
          created_at: string
          crm_url: string | null
          crm_utilizado: string | null
          distribuicao_sugerida: Json | null
          email: string | null
          estado: string | null
          estrutura_setores: Json | null
          gestor_comercial_email: string | null
          gestor_comercial_nome: string | null
          gestor_comercial_whatsapp: string | null
          gestor_marketing_email: string | null
          gestor_marketing_nome: string | null
          gestor_marketing_whatsapp: string | null
          google_ads_cid: string | null
          horarios_contato: string | null
          id: string
          instagram_handle: string | null
          lgpd_consent: boolean | null
          meta_bm_id: string | null
          nichos: string[] | null
          nome: string
          nome_fantasia: string | null
          observacoes_adicionais: string | null
          pixel_analytics_configurado: boolean | null
          qtd_corretores: number | null
          qtd_funcionarios: number | null
          qtd_sdr_total: number | null
          razao_social: string | null
          rejection_reason: string | null
          responsavel_cargo: string | null
          responsavel_email: string | null
          responsavel_nome: string | null
          responsavel_whatsapp: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          segmentos: string[] | null
          site: string | null
          site_url: string | null
          status: string | null
          telefone: string | null
          tem_corretor_funcionario: boolean | null
          tem_gestor_comercial: boolean | null
          tem_gestor_marketing: boolean | null
          tem_sdr: boolean | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          archived?: boolean | null
          bairros_regioes?: string[] | null
          budget_mensal?: number | null
          campanhas_ativas?: boolean | null
          cidade_regiao?: string | null
          cidades?: string[] | null
          cnpj?: string | null
          cnpj_cpf?: string | null
          contato_preferido?: string | null
          created_at?: string
          crm_url?: string | null
          crm_utilizado?: string | null
          distribuicao_sugerida?: Json | null
          email?: string | null
          estado?: string | null
          estrutura_setores?: Json | null
          gestor_comercial_email?: string | null
          gestor_comercial_nome?: string | null
          gestor_comercial_whatsapp?: string | null
          gestor_marketing_email?: string | null
          gestor_marketing_nome?: string | null
          gestor_marketing_whatsapp?: string | null
          google_ads_cid?: string | null
          horarios_contato?: string | null
          id?: string
          instagram_handle?: string | null
          lgpd_consent?: boolean | null
          meta_bm_id?: string | null
          nichos?: string[] | null
          nome: string
          nome_fantasia?: string | null
          observacoes_adicionais?: string | null
          pixel_analytics_configurado?: boolean | null
          qtd_corretores?: number | null
          qtd_funcionarios?: number | null
          qtd_sdr_total?: number | null
          razao_social?: string | null
          rejection_reason?: string | null
          responsavel_cargo?: string | null
          responsavel_email?: string | null
          responsavel_nome?: string | null
          responsavel_whatsapp?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          segmentos?: string[] | null
          site?: string | null
          site_url?: string | null
          status?: string | null
          telefone?: string | null
          tem_corretor_funcionario?: boolean | null
          tem_gestor_comercial?: boolean | null
          tem_gestor_marketing?: boolean | null
          tem_sdr?: boolean | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          archived?: boolean | null
          bairros_regioes?: string[] | null
          budget_mensal?: number | null
          campanhas_ativas?: boolean | null
          cidade_regiao?: string | null
          cidades?: string[] | null
          cnpj?: string | null
          cnpj_cpf?: string | null
          contato_preferido?: string | null
          created_at?: string
          crm_url?: string | null
          crm_utilizado?: string | null
          distribuicao_sugerida?: Json | null
          email?: string | null
          estado?: string | null
          estrutura_setores?: Json | null
          gestor_comercial_email?: string | null
          gestor_comercial_nome?: string | null
          gestor_comercial_whatsapp?: string | null
          gestor_marketing_email?: string | null
          gestor_marketing_nome?: string | null
          gestor_marketing_whatsapp?: string | null
          google_ads_cid?: string | null
          horarios_contato?: string | null
          id?: string
          instagram_handle?: string | null
          lgpd_consent?: boolean | null
          meta_bm_id?: string | null
          nichos?: string[] | null
          nome?: string
          nome_fantasia?: string | null
          observacoes_adicionais?: string | null
          pixel_analytics_configurado?: boolean | null
          qtd_corretores?: number | null
          qtd_funcionarios?: number | null
          qtd_sdr_total?: number | null
          razao_social?: string | null
          rejection_reason?: string | null
          responsavel_cargo?: string | null
          responsavel_email?: string | null
          responsavel_nome?: string | null
          responsavel_whatsapp?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          segmentos?: string[] | null
          site?: string | null
          site_url?: string | null
          status?: string | null
          telefone?: string | null
          tem_corretor_funcionario?: boolean | null
          tem_gestor_comercial?: boolean | null
          tem_gestor_marketing?: boolean | null
          tem_sdr?: boolean | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          campanha: string | null
          client_id: string
          created_at: string
          data_conversao: string | null
          email: string | null
          id: string
          interesse: string | null
          ip_address: unknown | null
          landing_page: string | null
          nome: string
          nota_qualificacao: number | null
          observacoes: string | null
          orcamento_max: number | null
          orcamento_min: number | null
          origem: string
          prazo: string | null
          proxima_acao: string | null
          qualificacao: string | null
          referrer: string | null
          responsavel_id: string | null
          status: string
          telefone: string | null
          ultima_interacao: string | null
          updated_at: string
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          valor_conversao: number | null
        }
        Insert: {
          campanha?: string | null
          client_id: string
          created_at?: string
          data_conversao?: string | null
          email?: string | null
          id?: string
          interesse?: string | null
          ip_address?: unknown | null
          landing_page?: string | null
          nome: string
          nota_qualificacao?: number | null
          observacoes?: string | null
          orcamento_max?: number | null
          orcamento_min?: number | null
          origem: string
          prazo?: string | null
          proxima_acao?: string | null
          qualificacao?: string | null
          referrer?: string | null
          responsavel_id?: string | null
          status?: string
          telefone?: string | null
          ultima_interacao?: string | null
          updated_at?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          valor_conversao?: number | null
        }
        Update: {
          campanha?: string | null
          client_id?: string
          created_at?: string
          data_conversao?: string | null
          email?: string | null
          id?: string
          interesse?: string | null
          ip_address?: unknown | null
          landing_page?: string | null
          nome?: string
          nota_qualificacao?: number | null
          observacoes?: string | null
          orcamento_max?: number | null
          orcamento_min?: number | null
          origem?: string
          prazo?: string | null
          proxima_acao?: string | null
          qualificacao?: string | null
          referrer?: string | null
          responsavel_id?: string | null
          status?: string
          telefone?: string | null
          ultima_interacao?: string | null
          updated_at?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          valor_conversao?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "leads_stats"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "leads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "relatorio_n8n_consolidated"
            referencedColumns: ["conta_id"]
          },
        ]
      }
      meta_sync_logs: {
        Row: {
          account_id: string | null
          campaigns_synced: number | null
          completed_at: string
          duration_seconds: number | null
          error_message: string | null
          id: string
          started_at: string
          status: string
          sync_type: string
          triggered_by: string | null
        }
        Insert: {
          account_id?: string | null
          campaigns_synced?: number | null
          completed_at?: string
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          started_at: string
          status: string
          sync_type: string
          triggered_by?: string | null
        }
        Update: {
          account_id?: string | null
          campaigns_synced?: number | null
          completed_at?: string
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          started_at?: string
          status?: string
          sync_type?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_sync_logs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_sync_logs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "leads_stats"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "meta_sync_logs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "relatorio_n8n_consolidated"
            referencedColumns: ["conta_id"]
          },
          {
            foreignKeyName: "meta_sync_logs_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean | null
          avatar_url: string | null
          cargo: string | null
          departamento: string | null
          email: string | null
          id: string
          name: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          telefone: string | null
          ultimo_acesso: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          avatar_url?: string | null
          cargo?: string | null
          departamento?: string | null
          email?: string | null
          id: string
          name?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          telefone?: string | null
          ultimo_acesso?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          avatar_url?: string | null
          cargo?: string | null
          departamento?: string | null
          email?: string | null
          id?: string
          name?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          telefone?: string | null
          ultimo_acesso?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      relatorio_config: {
        Row: {
          ativo_google: boolean | null
          ativo_meta: boolean | null
          client_id: string
          created_at: string
          dias_semana: number[] | null
          horario_disparo: string | null
          id: string
          updated_at: string
        }
        Insert: {
          ativo_google?: boolean | null
          ativo_meta?: boolean | null
          client_id: string
          created_at?: string
          dias_semana?: number[] | null
          horario_disparo?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          ativo_google?: boolean | null
          ativo_meta?: boolean | null
          client_id?: string
          created_at?: string
          dias_semana?: number[] | null
          horario_disparo?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "relatorio_config_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relatorio_config_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "leads_stats"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "relatorio_config_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "relatorio_n8n_consolidated"
            referencedColumns: ["conta_id"]
          },
        ]
      }
      relatorio_disparos: {
        Row: {
          client_id: string
          created_at: string
          dados_enviados: Json | null
          data_disparo: string
          horario_disparo: string
          id: string
          mensagem_erro: string | null
          status: string
          webhook_response: Json | null
        }
        Insert: {
          client_id: string
          created_at?: string
          dados_enviados?: Json | null
          data_disparo: string
          horario_disparo?: string
          id?: string
          mensagem_erro?: string | null
          status?: string
          webhook_response?: Json | null
        }
        Update: {
          client_id?: string
          created_at?: string
          dados_enviados?: Json | null
          data_disparo?: string
          horario_disparo?: string
          id?: string
          mensagem_erro?: string | null
          status?: string
          webhook_response?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "relatorio_disparos_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relatorio_disparos_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "leads_stats"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "relatorio_disparos_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "relatorio_n8n_consolidated"
            referencedColumns: ["conta_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_view"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      leads_stats: {
        Row: {
          client_id: string | null
          leads_contatados: number | null
          leads_convertidos: number | null
          leads_desqualificados: number | null
          leads_google: number | null
          leads_meta: number | null
          leads_novos: number | null
          leads_organico: number | null
          leads_qualificados: number | null
          nome_cliente: string | null
          nota_media: number | null
          total_leads: number | null
          valor_total_conversoes: number | null
        }
        Relationships: []
      }
      relatorio_n8n_consolidated: {
        Row: {
          ativo_google: boolean | null
          ativo_meta: boolean | null
          canal_relatorio: string | null
          cliente_status: string | null
          config_atualizado_em: string | null
          config_criado_em: string | null
          conta_id: string | null
          conta_nome: string | null
          dias_semana: number[] | null
          email: string | null
          google_ads_id: string | null
          horario_padrao: string | null
          id_grupo: string | null
          leads_convertidos_30d: number | null
          meta_account_id: string | null
          notificacao_erro_sync: boolean | null
          notificacao_leads_diarios: boolean | null
          notificacao_saldo_baixo: boolean | null
          telefone: string | null
          total_leads_30d: number | null
          ultimo_envio: string | null
          ultimo_erro: string | null
          ultimo_status: string | null
          valor_conversoes_30d: number | null
          webhook_google: string | null
          webhook_meta: string | null
        }
        Relationships: []
      }
      users_view: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          departamento: string | null
          email: string | null
          id: string | null
          last_sign_in_at: string | null
          name: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          telefone: string | null
          ultimo_acesso: string | null
          updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      create_admin_user: {
        Args: {
          admin_email: string
          admin_name?: string
          admin_password: string
        }
        Returns: Json
      }
      get_accounts_performance_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          account_id: string
          active_campaigns_count: number
          daily_leads: Json
          total_leads_30d: number
        }[]
      }
      get_relatorio_n8n_data: {
        Args: { client_id_param?: string; only_active?: boolean }
        Returns: {
          ativo: boolean
          canal_relatorio: string
          cliente_status: string
          config_atualizado_em: string
          config_criado_em: string
          conta_id: string
          conta_nome: string
          dias_semana: number[]
          email: string
          google_ads_id: string
          horario_padrao: string
          id_grupo: string
          leads_convertidos_30d: number
          meta_account_id: string
          notificacao_erro_sync: boolean
          notificacao_leads_diarios: boolean
          notificacao_saldo_baixo: boolean
          telefone: string
          total_leads_30d: number
          ultimo_envio: string
          ultimo_erro: string
          ultimo_status: string
          valor_conversoes_30d: number
          webhook_google: string
          webhook_meta: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: {
        Args: { _user_id: string }
        Returns: boolean
      }
      is_gestor: {
        Args: { _user_id: string }
        Returns: boolean
      }
      user_has_client_access: {
        Args: { _cliente_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "gestor" | "usuario"
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
    Enums: {
      app_role: ["admin", "gestor", "usuario"],
    },
  },
} as const

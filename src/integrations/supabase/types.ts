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
      account_health_scores: {
        Row: {
          account_id: string
          calculated_at: string | null
          created_at: string | null
          factors: Json | null
          id: string
          score: number | null
        }
        Insert: {
          account_id: string
          calculated_at?: string | null
          created_at?: string | null
          factors?: Json | null
          id?: string
          score?: number | null
        }
        Update: {
          account_id?: string
          calculated_at?: string | null
          created_at?: string | null
          factors?: Json | null
          id?: string
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "account_health_scores_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_health_scores_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "leads_stats"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "account_health_scores_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "relatorio_n8n_consolidated"
            referencedColumns: ["conta_id"]
          },
        ]
      }
      accounts: {
        Row: {
          active_campaigns: number | null
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
          dias_estimados_saldo: number | null
          email: string | null
          forma_pagamento: string | null
          ga4_stream_id: string | null
          gestor_id: string | null
          google_ads_id: string | null
          gtm_id: string | null
          horario_relatorio: string | null
          id: string
          id_grupo: string | null
          last_balance_check_google: string | null
          last_balance_check_meta: string | null
          last_sync_meta: string | null
          link_drive: string | null
          link_google: string | null
          link_meta: string | null
          media_gasto_diario: number | null
          meta_account_id: string | null
          meta_business_id: string | null
          meta_page_id: string | null
          modo_saldo_meta: string | null
          monitorar_saldo_meta: boolean | null
          nome_cliente: string
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
          total_campaigns: number | null
          total_leads_30d: number | null
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
          active_campaigns?: number | null
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
          dias_estimados_saldo?: number | null
          email?: string | null
          forma_pagamento?: string | null
          ga4_stream_id?: string | null
          gestor_id?: string | null
          google_ads_id?: string | null
          gtm_id?: string | null
          horario_relatorio?: string | null
          id?: string
          id_grupo?: string | null
          last_balance_check_google?: string | null
          last_balance_check_meta?: string | null
          last_sync_meta?: string | null
          link_drive?: string | null
          link_google?: string | null
          link_meta?: string | null
          media_gasto_diario?: number | null
          meta_account_id?: string | null
          meta_business_id?: string | null
          meta_page_id?: string | null
          modo_saldo_meta?: string | null
          monitorar_saldo_meta?: boolean | null
          nome_cliente: string
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
          total_campaigns?: number | null
          total_leads_30d?: number | null
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
          active_campaigns?: number | null
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
          dias_estimados_saldo?: number | null
          email?: string | null
          forma_pagamento?: string | null
          ga4_stream_id?: string | null
          gestor_id?: string | null
          google_ads_id?: string | null
          gtm_id?: string | null
          horario_relatorio?: string | null
          id?: string
          id_grupo?: string | null
          last_balance_check_google?: string | null
          last_balance_check_meta?: string | null
          last_sync_meta?: string | null
          link_drive?: string | null
          link_google?: string | null
          link_meta?: string | null
          media_gasto_diario?: number | null
          meta_account_id?: string | null
          meta_business_id?: string | null
          meta_page_id?: string | null
          modo_saldo_meta?: string | null
          monitorar_saldo_meta?: boolean | null
          nome_cliente?: string
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
          total_campaigns?: number | null
          total_leads_30d?: number | null
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
      ad_insights: {
        Row: {
          ad_id: string
          clicks: number | null
          conversions: number | null
          cpc: number | null
          cpl: number | null
          cpm: number | null
          created_at: string | null
          ctr: number | null
          date: string
          frequency: number | null
          id: string
          impressions: number | null
          leads: number | null
          reach: number | null
          spend: number | null
          updated_at: string | null
          video_p100_watched: number | null
          video_p25_watched: number | null
          video_p50_watched: number | null
          video_p75_watched: number | null
          video_views: number | null
        }
        Insert: {
          ad_id: string
          clicks?: number | null
          conversions?: number | null
          cpc?: number | null
          cpl?: number | null
          cpm?: number | null
          created_at?: string | null
          ctr?: number | null
          date: string
          frequency?: number | null
          id?: string
          impressions?: number | null
          leads?: number | null
          reach?: number | null
          spend?: number | null
          updated_at?: string | null
          video_p100_watched?: number | null
          video_p25_watched?: number | null
          video_p50_watched?: number | null
          video_p75_watched?: number | null
          video_views?: number | null
        }
        Update: {
          ad_id?: string
          clicks?: number | null
          conversions?: number | null
          cpc?: number | null
          cpl?: number | null
          cpm?: number | null
          created_at?: string | null
          ctr?: number | null
          date?: string
          frequency?: number | null
          id?: string
          impressions?: number | null
          leads?: number | null
          reach?: number | null
          spend?: number | null
          updated_at?: string | null
          video_p100_watched?: number | null
          video_p25_watched?: number | null
          video_p50_watched?: number | null
          video_p75_watched?: number | null
          video_views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_insights_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "meta_ads"
            referencedColumns: ["id"]
          },
        ]
      }
      adset_insights: {
        Row: {
          adset_id: string
          clicks: number | null
          conversions: number | null
          cpc: number | null
          cpl: number | null
          cpm: number | null
          created_at: string | null
          ctr: number | null
          date: string
          frequency: number | null
          id: string
          impressions: number | null
          leads: number | null
          reach: number | null
          spend: number | null
          updated_at: string | null
        }
        Insert: {
          adset_id: string
          clicks?: number | null
          conversions?: number | null
          cpc?: number | null
          cpl?: number | null
          cpm?: number | null
          created_at?: string | null
          ctr?: number | null
          date: string
          frequency?: number | null
          id?: string
          impressions?: number | null
          leads?: number | null
          reach?: number | null
          spend?: number | null
          updated_at?: string | null
        }
        Update: {
          adset_id?: string
          clicks?: number | null
          conversions?: number | null
          cpc?: number | null
          cpl?: number | null
          cpm?: number | null
          created_at?: string | null
          ctr?: number | null
          date?: string
          frequency?: number | null
          id?: string
          impressions?: number | null
          leads?: number | null
          reach?: number | null
          spend?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "adset_insights_adset_id_fkey"
            columns: ["adset_id"]
            isOneToOne: false
            referencedRelation: "meta_adsets"
            referencedColumns: ["id"]
          },
        ]
      }
      balance_history: {
        Row: {
          account_id: string
          balance_amount: number
          balance_type: string
          created_at: string | null
          id: string
          notes: string | null
          recorded_at: string
          recorded_by: string | null
        }
        Insert: {
          account_id: string
          balance_amount: number
          balance_type: string
          created_at?: string | null
          id?: string
          notes?: string | null
          recorded_at?: string
          recorded_by?: string | null
        }
        Update: {
          account_id?: string
          balance_amount?: number
          balance_type?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          recorded_at?: string
          recorded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "balance_history_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balance_history_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "leads_stats"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "balance_history_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "relatorio_n8n_consolidated"
            referencedColumns: ["conta_id"]
          },
          {
            foreignKeyName: "balance_history_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_creatives: {
        Row: {
          account_currency: string | null
          account_id: string | null
          account_name: string | null
          ad_creative_body: string | null
          ad_creative_link_url: string | null
          ad_creative_title: string | null
          ad_id: string
          ad_name: string | null
          ad_status: string | null
          adset_id: string | null
          adset_name: string | null
          adset_status: string | null
          age_gender_breakdown: Json | null
          avg_cpl: number | null
          avg_ctr: number | null
          avg_hold_rate: number | null
          avg_hook_rate: number | null
          buying_type: string | null
          call_to_action_type: string | null
          campaign_id: string
          campaign_name: string | null
          campaign_status: string | null
          catalog_segment_actions: Json | null
          catalog_segment_value: Json | null
          client_id: string
          conversion_rate_ranking: string | null
          conversion_values: number | null
          conversions: number | null
          cost_per_conversion: number | null
          cost_per_inline_link_click: number | null
          cost_per_landing_page_view: number | null
          cost_per_thruplay: number | null
          cost_per_unique_click: number | null
          cost_per_unique_outbound_click: number | null
          cpm: number | null
          cpp: number | null
          created_at: string | null
          creative_id: string
          creative_name: string | null
          creative_type: string | null
          date_start: string | null
          date_stop: string | null
          days_active: number | null
          device_platform_breakdown: Json | null
          engagement_rate_ranking: string | null
          first_seen_date: string | null
          frequency: number | null
          id: string
          instant_experience_clicks: number | null
          instant_experience_outbound_clicks: number | null
          landing_page_views: number | null
          last_active_date: string | null
          link_clicks: number | null
          messaging_conversations_started: number | null
          mobile_app_installs: number | null
          mobile_app_purchase_roas: number | null
          objective: string | null
          onsite_conversion_leads: number | null
          onsite_conversion_messaging: number | null
          outbound_clicks: number | null
          page_engagement: number | null
          page_likes: number | null
          photo_views: number | null
          placement_breakdown: Json | null
          post_comments: number | null
          post_engagement: number | null
          post_reactions: number | null
          post_saves: number | null
          post_shares: number | null
          purchase_roas: number | null
          quality_ranking: string | null
          reach: number | null
          region_breakdown: Json | null
          sync_date: string | null
          thumbnail_url: string | null
          total_clicks: number | null
          total_impressions: number | null
          total_leads: number | null
          total_spend: number | null
          unique_clicks: number | null
          unique_landing_page_views: number | null
          unique_link_clicks: number | null
          unique_outbound_clicks: number | null
          updated_at: string | null
          video_avg_time_watched_seconds: number | null
          video_continuous_2s_watched: number | null
          video_p100_watched: number | null
          video_p25_watched: number | null
          video_p50_watched: number | null
          video_p75_watched: number | null
          video_p95_watched: number | null
          video_plays: number | null
          video_plays_10s: number | null
          video_plays_15s: number | null
          video_plays_3s: number | null
          video_thruplay: number | null
          video_url: string | null
          website_purchase_roas: number | null
          website_purchases: number | null
          website_purchases_value: number | null
        }
        Insert: {
          account_currency?: string | null
          account_id?: string | null
          account_name?: string | null
          ad_creative_body?: string | null
          ad_creative_link_url?: string | null
          ad_creative_title?: string | null
          ad_id: string
          ad_name?: string | null
          ad_status?: string | null
          adset_id?: string | null
          adset_name?: string | null
          adset_status?: string | null
          age_gender_breakdown?: Json | null
          avg_cpl?: number | null
          avg_ctr?: number | null
          avg_hold_rate?: number | null
          avg_hook_rate?: number | null
          buying_type?: string | null
          call_to_action_type?: string | null
          campaign_id: string
          campaign_name?: string | null
          campaign_status?: string | null
          catalog_segment_actions?: Json | null
          catalog_segment_value?: Json | null
          client_id: string
          conversion_rate_ranking?: string | null
          conversion_values?: number | null
          conversions?: number | null
          cost_per_conversion?: number | null
          cost_per_inline_link_click?: number | null
          cost_per_landing_page_view?: number | null
          cost_per_thruplay?: number | null
          cost_per_unique_click?: number | null
          cost_per_unique_outbound_click?: number | null
          cpm?: number | null
          cpp?: number | null
          created_at?: string | null
          creative_id: string
          creative_name?: string | null
          creative_type?: string | null
          date_start?: string | null
          date_stop?: string | null
          days_active?: number | null
          device_platform_breakdown?: Json | null
          engagement_rate_ranking?: string | null
          first_seen_date?: string | null
          frequency?: number | null
          id?: string
          instant_experience_clicks?: number | null
          instant_experience_outbound_clicks?: number | null
          landing_page_views?: number | null
          last_active_date?: string | null
          link_clicks?: number | null
          messaging_conversations_started?: number | null
          mobile_app_installs?: number | null
          mobile_app_purchase_roas?: number | null
          objective?: string | null
          onsite_conversion_leads?: number | null
          onsite_conversion_messaging?: number | null
          outbound_clicks?: number | null
          page_engagement?: number | null
          page_likes?: number | null
          photo_views?: number | null
          placement_breakdown?: Json | null
          post_comments?: number | null
          post_engagement?: number | null
          post_reactions?: number | null
          post_saves?: number | null
          post_shares?: number | null
          purchase_roas?: number | null
          quality_ranking?: string | null
          reach?: number | null
          region_breakdown?: Json | null
          sync_date?: string | null
          thumbnail_url?: string | null
          total_clicks?: number | null
          total_impressions?: number | null
          total_leads?: number | null
          total_spend?: number | null
          unique_clicks?: number | null
          unique_landing_page_views?: number | null
          unique_link_clicks?: number | null
          unique_outbound_clicks?: number | null
          updated_at?: string | null
          video_avg_time_watched_seconds?: number | null
          video_continuous_2s_watched?: number | null
          video_p100_watched?: number | null
          video_p25_watched?: number | null
          video_p50_watched?: number | null
          video_p75_watched?: number | null
          video_p95_watched?: number | null
          video_plays?: number | null
          video_plays_10s?: number | null
          video_plays_15s?: number | null
          video_plays_3s?: number | null
          video_thruplay?: number | null
          video_url?: string | null
          website_purchase_roas?: number | null
          website_purchases?: number | null
          website_purchases_value?: number | null
        }
        Update: {
          account_currency?: string | null
          account_id?: string | null
          account_name?: string | null
          ad_creative_body?: string | null
          ad_creative_link_url?: string | null
          ad_creative_title?: string | null
          ad_id?: string
          ad_name?: string | null
          ad_status?: string | null
          adset_id?: string | null
          adset_name?: string | null
          adset_status?: string | null
          age_gender_breakdown?: Json | null
          avg_cpl?: number | null
          avg_ctr?: number | null
          avg_hold_rate?: number | null
          avg_hook_rate?: number | null
          buying_type?: string | null
          call_to_action_type?: string | null
          campaign_id?: string
          campaign_name?: string | null
          campaign_status?: string | null
          catalog_segment_actions?: Json | null
          catalog_segment_value?: Json | null
          client_id?: string
          conversion_rate_ranking?: string | null
          conversion_values?: number | null
          conversions?: number | null
          cost_per_conversion?: number | null
          cost_per_inline_link_click?: number | null
          cost_per_landing_page_view?: number | null
          cost_per_thruplay?: number | null
          cost_per_unique_click?: number | null
          cost_per_unique_outbound_click?: number | null
          cpm?: number | null
          cpp?: number | null
          created_at?: string | null
          creative_id?: string
          creative_name?: string | null
          creative_type?: string | null
          date_start?: string | null
          date_stop?: string | null
          days_active?: number | null
          device_platform_breakdown?: Json | null
          engagement_rate_ranking?: string | null
          first_seen_date?: string | null
          frequency?: number | null
          id?: string
          instant_experience_clicks?: number | null
          instant_experience_outbound_clicks?: number | null
          landing_page_views?: number | null
          last_active_date?: string | null
          link_clicks?: number | null
          messaging_conversations_started?: number | null
          mobile_app_installs?: number | null
          mobile_app_purchase_roas?: number | null
          objective?: string | null
          onsite_conversion_leads?: number | null
          onsite_conversion_messaging?: number | null
          outbound_clicks?: number | null
          page_engagement?: number | null
          page_likes?: number | null
          photo_views?: number | null
          placement_breakdown?: Json | null
          post_comments?: number | null
          post_engagement?: number | null
          post_reactions?: number | null
          post_saves?: number | null
          post_shares?: number | null
          purchase_roas?: number | null
          quality_ranking?: string | null
          reach?: number | null
          region_breakdown?: Json | null
          sync_date?: string | null
          thumbnail_url?: string | null
          total_clicks?: number | null
          total_impressions?: number | null
          total_leads?: number | null
          total_spend?: number | null
          unique_clicks?: number | null
          unique_landing_page_views?: number | null
          unique_link_clicks?: number | null
          unique_outbound_clicks?: number | null
          updated_at?: string | null
          video_avg_time_watched_seconds?: number | null
          video_continuous_2s_watched?: number | null
          video_p100_watched?: number | null
          video_p25_watched?: number | null
          video_p50_watched?: number | null
          video_p75_watched?: number | null
          video_p95_watched?: number | null
          video_plays?: number | null
          video_plays_10s?: number | null
          video_plays_15s?: number | null
          video_plays_3s?: number | null
          video_thruplay?: number | null
          video_url?: string | null
          website_purchase_roas?: number | null
          website_purchases?: number | null
          website_purchases_value?: number | null
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
      campaign_history: {
        Row: {
          account_id: string
          campaign_id: string
          campaign_name: string
          campaign_type: string | null
          clicks: number | null
          cpc: number | null
          cpl: number | null
          created_at: string | null
          ctr: number | null
          date: string
          id: string
          impressions: number | null
          leads: number | null
          spend: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          campaign_id: string
          campaign_name: string
          campaign_type?: string | null
          clicks?: number | null
          cpc?: number | null
          cpl?: number | null
          created_at?: string | null
          ctr?: number | null
          date: string
          id?: string
          impressions?: number | null
          leads?: number | null
          spend?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          campaign_id?: string
          campaign_name?: string
          campaign_type?: string | null
          clicks?: number | null
          cpc?: number | null
          cpl?: number | null
          created_at?: string | null
          ctr?: number | null
          date?: string
          id?: string
          impressions?: number | null
          leads?: number | null
          spend?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_history_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_history_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "leads_stats"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "campaign_history_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "relatorio_n8n_consolidated"
            referencedColumns: ["conta_id"]
          },
        ]
      }
      campaign_insights: {
        Row: {
          campaign_id: string
          clicks: number | null
          conversions: number | null
          cpc: number | null
          cpl: number | null
          cpm: number | null
          created_at: string | null
          ctr: number | null
          date: string
          frequency: number | null
          id: string
          impressions: number | null
          leads: number | null
          reach: number | null
          spend: number | null
          updated_at: string | null
        }
        Insert: {
          campaign_id: string
          clicks?: number | null
          conversions?: number | null
          cpc?: number | null
          cpl?: number | null
          cpm?: number | null
          created_at?: string | null
          ctr?: number | null
          date: string
          frequency?: number | null
          id?: string
          impressions?: number | null
          leads?: number | null
          reach?: number | null
          spend?: number | null
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string
          clicks?: number | null
          conversions?: number | null
          cpc?: number | null
          cpl?: number | null
          cpm?: number | null
          created_at?: string | null
          ctr?: number | null
          date?: string
          frequency?: number | null
          id?: string
          impressions?: number | null
          leads?: number | null
          reach?: number | null
          spend?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_insights_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_performance_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_insights_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "meta_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      client_onboarding: {
        Row: {
          automacoes_desejadas: string[] | null
          cidades_atuacao: string[] | null
          cliente_id: string | null
          created_at: string
          crm_utilizado: string | null
          email_integracoes: string | null
          email_principal: string
          emails_adicionais_relatorios: string | null
          etapas_funil: string | null
          facebook: string | null
          horario_atendimento: string | null
          horario_relatorios: string | null
          horario_reuniao_semanal: string | null
          id: string
          instagram: string | null
          link_drive_administrativo: string | null
          link_drive_criativos: string | null
          link_drive_criativos_acesso: string | null
          link_identidade_visual: string | null
          login_crm: string | null
          nome_imobiliaria: string
          nome_responsavel: string
          objetivo_principal: string | null
          observacoes: string | null
          pasta_fotos_videos: string | null
          possui_automacoes: boolean | null
          possui_banco_criativos: boolean | null
          possui_sdr: boolean | null
          qtd_corretores: number | null
          regioes_prioritarias: string | null
          senha_crm: string | null
          site: string | null
          status: string | null
          telefone_responsavel: string
          tipo_atuacao: string | null
          tipos_imoveis: string[] | null
          updated_at: string
          whatsapp_leads: string
        }
        Insert: {
          automacoes_desejadas?: string[] | null
          cidades_atuacao?: string[] | null
          cliente_id?: string | null
          created_at?: string
          crm_utilizado?: string | null
          email_integracoes?: string | null
          email_principal: string
          emails_adicionais_relatorios?: string | null
          etapas_funil?: string | null
          facebook?: string | null
          horario_atendimento?: string | null
          horario_relatorios?: string | null
          horario_reuniao_semanal?: string | null
          id?: string
          instagram?: string | null
          link_drive_administrativo?: string | null
          link_drive_criativos?: string | null
          link_drive_criativos_acesso?: string | null
          link_identidade_visual?: string | null
          login_crm?: string | null
          nome_imobiliaria: string
          nome_responsavel: string
          objetivo_principal?: string | null
          observacoes?: string | null
          pasta_fotos_videos?: string | null
          possui_automacoes?: boolean | null
          possui_banco_criativos?: boolean | null
          possui_sdr?: boolean | null
          qtd_corretores?: number | null
          regioes_prioritarias?: string | null
          senha_crm?: string | null
          site?: string | null
          status?: string | null
          telefone_responsavel: string
          tipo_atuacao?: string | null
          tipos_imoveis?: string[] | null
          updated_at?: string
          whatsapp_leads: string
        }
        Update: {
          automacoes_desejadas?: string[] | null
          cidades_atuacao?: string[] | null
          cliente_id?: string | null
          created_at?: string
          crm_utilizado?: string | null
          email_integracoes?: string | null
          email_principal?: string
          emails_adicionais_relatorios?: string | null
          etapas_funil?: string | null
          facebook?: string | null
          horario_atendimento?: string | null
          horario_relatorios?: string | null
          horario_reuniao_semanal?: string | null
          id?: string
          instagram?: string | null
          link_drive_administrativo?: string | null
          link_drive_criativos?: string | null
          link_drive_criativos_acesso?: string | null
          link_identidade_visual?: string | null
          login_crm?: string | null
          nome_imobiliaria?: string
          nome_responsavel?: string
          objetivo_principal?: string | null
          observacoes?: string | null
          pasta_fotos_videos?: string | null
          possui_automacoes?: boolean | null
          possui_banco_criativos?: boolean | null
          possui_sdr?: boolean | null
          qtd_corretores?: number | null
          regioes_prioritarias?: string | null
          senha_crm?: string | null
          site?: string | null
          status?: string | null
          telefone_responsavel?: string
          tipo_atuacao?: string | null
          tipos_imoveis?: string[] | null
          updated_at?: string
          whatsapp_leads?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_onboarding_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
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
          id_grupo: string | null
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
          id_grupo?: string | null
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
          id_grupo?: string | null
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
      community_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string | null
          id: string
          parent_comment_id: string | null
          post_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string | null
          id?: string
          parent_comment_id?: string | null
          post_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string | null
          id?: string
          parent_comment_id?: string | null
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "community_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      community_poll_votes: {
        Row: {
          created_at: string | null
          id: string
          option_index: number
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          option_index: number
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          option_index?: number
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_poll_votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          author_id: string
          comments_count: number | null
          content: string
          created_at: string | null
          edited_at: string | null
          id: string
          is_pinned: boolean | null
          likes_count: number | null
          media_urls: string[] | null
          organization_id: string | null
          poll_expires_at: string | null
          poll_options: Json | null
          post_category: string | null
          post_type: string | null
          updated_at: string | null
          visibility: string | null
        }
        Insert: {
          author_id: string
          comments_count?: number | null
          content: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
          is_pinned?: boolean | null
          likes_count?: number | null
          media_urls?: string[] | null
          organization_id?: string | null
          poll_expires_at?: string | null
          poll_options?: Json | null
          post_category?: string | null
          post_type?: string | null
          updated_at?: string | null
          visibility?: string | null
        }
        Update: {
          author_id?: string
          comments_count?: number | null
          content?: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
          is_pinned?: boolean | null
          likes_count?: number | null
          media_urls?: string[] | null
          organization_id?: string | null
          poll_expires_at?: string | null
          poll_options?: Json | null
          post_category?: string | null
          post_type?: string | null
          updated_at?: string | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      course_lessons: {
        Row: {
          content_html: string | null
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          module_id: string
          order_index: number
          title: string
          video_url: string | null
        }
        Insert: {
          content_html?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          module_id: string
          order_index?: number
          title: string
          video_url?: string | null
        }
        Update: {
          content_html?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          module_id?: string
          order_index?: number
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      course_modules: {
        Row: {
          course_id: string
          created_at: string | null
          description: string | null
          id: string
          order_index: number
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          order_index?: number
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          order_index?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          difficulty: string | null
          duration_hours: number | null
          id: string
          instructor_id: string | null
          is_published: boolean | null
          organization_id: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          duration_hours?: number | null
          id?: string
          instructor_id?: string | null
          is_published?: boolean | null
          organization_id?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          duration_hours?: number | null
          id?: string
          instructor_id?: string | null
          is_published?: boolean | null
          organization_id?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cpl_settings: {
        Row: {
          account_id: string | null
          cpl_alto: number | null
          cpl_mcmv: number | null
          cpl_medio: number | null
          created_at: string | null
          id: string
          margem_amarelo: number | null
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          cpl_alto?: number | null
          cpl_mcmv?: number | null
          cpl_medio?: number | null
          created_at?: string | null
          id?: string
          margem_amarelo?: number | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          cpl_alto?: number | null
          cpl_mcmv?: number | null
          cpl_medio?: number | null
          created_at?: string | null
          id?: string
          margem_amarelo?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cpl_settings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cpl_settings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "leads_stats"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "cpl_settings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "relatorio_n8n_consolidated"
            referencedColumns: ["conta_id"]
          },
        ]
      }
      daily_account_checks: {
        Row: {
          account_id: string
          check_date: string
          checked_google: boolean | null
          checked_meta: boolean | null
          created_at: string | null
          google_checked_at: string | null
          google_checked_by: string | null
          id: string
          meta_checked_at: string | null
          meta_checked_by: string | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          check_date?: string
          checked_google?: boolean | null
          checked_meta?: boolean | null
          created_at?: string | null
          google_checked_at?: string | null
          google_checked_by?: string | null
          id?: string
          meta_checked_at?: string | null
          meta_checked_by?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          check_date?: string
          checked_google?: boolean | null
          checked_meta?: boolean | null
          created_at?: string | null
          google_checked_at?: string | null
          google_checked_by?: string | null
          id?: string
          meta_checked_at?: string | null
          meta_checked_by?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_account_checks_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_account_checks_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "leads_stats"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "daily_account_checks_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "relatorio_n8n_consolidated"
            referencedColumns: ["conta_id"]
          },
          {
            foreignKeyName: "daily_account_checks_google_checked_by_fkey"
            columns: ["google_checked_by"]
            isOneToOne: false
            referencedRelation: "users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_account_checks_meta_checked_by_fkey"
            columns: ["meta_checked_by"]
            isOneToOne: false
            referencedRelation: "users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      demanda_arquivos: {
        Row: {
          created_at: string | null
          demanda_id: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          demanda_id: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          demanda_id?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demanda_arquivos_demanda_id_fkey"
            columns: ["demanda_id"]
            isOneToOne: false
            referencedRelation: "demandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demanda_arquivos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      demanda_historico: {
        Row: {
          alterado_em: string
          alterado_por: string | null
          demanda_id: string
          id: string
          observacao: string | null
          status_anterior: string | null
          status_novo: string
        }
        Insert: {
          alterado_em?: string
          alterado_por?: string | null
          demanda_id: string
          id?: string
          observacao?: string | null
          status_anterior?: string | null
          status_novo: string
        }
        Update: {
          alterado_em?: string
          alterado_por?: string | null
          demanda_id?: string
          id?: string
          observacao?: string | null
          status_anterior?: string | null
          status_novo?: string
        }
        Relationships: [
          {
            foreignKeyName: "demanda_historico_alterado_por_fkey"
            columns: ["alterado_por"]
            isOneToOne: false
            referencedRelation: "users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demanda_historico_demanda_id_fkey"
            columns: ["demanda_id"]
            isOneToOne: false
            referencedRelation: "demandas"
            referencedColumns: ["id"]
          },
        ]
      }
      demandas: {
        Row: {
          account_id: string
          concluido_at: string | null
          concluido_por: string | null
          created_at: string
          criado_por: string | null
          data_entrega: string | null
          descricao: string | null
          em_andamento_at: string | null
          em_andamento_por: string | null
          gestor_responsavel_id: string | null
          hora_entrega: string | null
          id: string
          link_criativos: string | null
          notificacao_enviada: boolean | null
          orcamento: number | null
          prioridade: string
          status: string
          tipo: string | null
          titulo: string
          updated_at: string
          urgencia: boolean | null
        }
        Insert: {
          account_id: string
          concluido_at?: string | null
          concluido_por?: string | null
          created_at?: string
          criado_por?: string | null
          data_entrega?: string | null
          descricao?: string | null
          em_andamento_at?: string | null
          em_andamento_por?: string | null
          gestor_responsavel_id?: string | null
          hora_entrega?: string | null
          id?: string
          link_criativos?: string | null
          notificacao_enviada?: boolean | null
          orcamento?: number | null
          prioridade?: string
          status?: string
          tipo?: string | null
          titulo: string
          updated_at?: string
          urgencia?: boolean | null
        }
        Update: {
          account_id?: string
          concluido_at?: string | null
          concluido_por?: string | null
          created_at?: string
          criado_por?: string | null
          data_entrega?: string | null
          descricao?: string | null
          em_andamento_at?: string | null
          em_andamento_por?: string | null
          gestor_responsavel_id?: string | null
          hora_entrega?: string | null
          id?: string
          link_criativos?: string | null
          notificacao_enviada?: boolean | null
          orcamento?: number | null
          prioridade?: string
          status?: string
          tipo?: string | null
          titulo?: string
          updated_at?: string
          urgencia?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "demandas_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandas_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "leads_stats"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "demandas_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "relatorio_n8n_consolidated"
            referencedColumns: ["conta_id"]
          },
          {
            foreignKeyName: "demandas_concluido_por_fkey"
            columns: ["concluido_por"]
            isOneToOne: false
            referencedRelation: "users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandas_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandas_em_andamento_por_fkey"
            columns: ["em_andamento_por"]
            isOneToOne: false
            referencedRelation: "users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandas_gestor_responsavel_id_fkey"
            columns: ["gestor_responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          ip_address: unknown
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
          ip_address?: unknown
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
          ip_address?: unknown
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
      meta_ads: {
        Row: {
          ad_id: string
          ad_name: string
          adset_id: string
          clicks: number | null
          conversions: number | null
          cpc: number | null
          cpl: number | null
          cpm: number | null
          created_at: string | null
          created_time: string | null
          creative_body: string | null
          creative_call_to_action: string | null
          creative_id: string | null
          creative_link_url: string | null
          creative_title: string | null
          creative_type: string | null
          ctr: number | null
          id: string
          impressions: number | null
          last_synced_at: string | null
          leads: number | null
          preview_url: string | null
          spend: number | null
          status: string
          thumbnail_url: string | null
          updated_at: string | null
          updated_time: string | null
          video_avg_watch_time: number | null
          video_p100_watched: number | null
          video_p25_watched: number | null
          video_p50_watched: number | null
          video_p75_watched: number | null
          video_views: number | null
        }
        Insert: {
          ad_id: string
          ad_name: string
          adset_id: string
          clicks?: number | null
          conversions?: number | null
          cpc?: number | null
          cpl?: number | null
          cpm?: number | null
          created_at?: string | null
          created_time?: string | null
          creative_body?: string | null
          creative_call_to_action?: string | null
          creative_id?: string | null
          creative_link_url?: string | null
          creative_title?: string | null
          creative_type?: string | null
          ctr?: number | null
          id?: string
          impressions?: number | null
          last_synced_at?: string | null
          leads?: number | null
          preview_url?: string | null
          spend?: number | null
          status: string
          thumbnail_url?: string | null
          updated_at?: string | null
          updated_time?: string | null
          video_avg_watch_time?: number | null
          video_p100_watched?: number | null
          video_p25_watched?: number | null
          video_p50_watched?: number | null
          video_p75_watched?: number | null
          video_views?: number | null
        }
        Update: {
          ad_id?: string
          ad_name?: string
          adset_id?: string
          clicks?: number | null
          conversions?: number | null
          cpc?: number | null
          cpl?: number | null
          cpm?: number | null
          created_at?: string | null
          created_time?: string | null
          creative_body?: string | null
          creative_call_to_action?: string | null
          creative_id?: string | null
          creative_link_url?: string | null
          creative_title?: string | null
          creative_type?: string | null
          ctr?: number | null
          id?: string
          impressions?: number | null
          last_synced_at?: string | null
          leads?: number | null
          preview_url?: string | null
          spend?: number | null
          status?: string
          thumbnail_url?: string | null
          updated_at?: string | null
          updated_time?: string | null
          video_avg_watch_time?: number | null
          video_p100_watched?: number | null
          video_p25_watched?: number | null
          video_p50_watched?: number | null
          video_p75_watched?: number | null
          video_views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_ads_adset_id_fkey"
            columns: ["adset_id"]
            isOneToOne: false
            referencedRelation: "meta_adsets"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_adsets: {
        Row: {
          adset_id: string
          adset_name: string
          bid_amount: number | null
          billing_event: string | null
          budget_remaining: number | null
          campaign_id: string
          clicks: number | null
          conversions: number | null
          cpc: number | null
          cpl: number | null
          cpm: number | null
          created_at: string | null
          created_time: string | null
          ctr: number | null
          daily_budget: number | null
          end_time: string | null
          id: string
          impressions: number | null
          last_synced_at: string | null
          leads: number | null
          lifetime_budget: number | null
          optimization_goal: string | null
          spend: number | null
          start_time: string | null
          status: string
          targeting: Json | null
          updated_at: string | null
          updated_time: string | null
        }
        Insert: {
          adset_id: string
          adset_name: string
          bid_amount?: number | null
          billing_event?: string | null
          budget_remaining?: number | null
          campaign_id: string
          clicks?: number | null
          conversions?: number | null
          cpc?: number | null
          cpl?: number | null
          cpm?: number | null
          created_at?: string | null
          created_time?: string | null
          ctr?: number | null
          daily_budget?: number | null
          end_time?: string | null
          id?: string
          impressions?: number | null
          last_synced_at?: string | null
          leads?: number | null
          lifetime_budget?: number | null
          optimization_goal?: string | null
          spend?: number | null
          start_time?: string | null
          status: string
          targeting?: Json | null
          updated_at?: string | null
          updated_time?: string | null
        }
        Update: {
          adset_id?: string
          adset_name?: string
          bid_amount?: number | null
          billing_event?: string | null
          budget_remaining?: number | null
          campaign_id?: string
          clicks?: number | null
          conversions?: number | null
          cpc?: number | null
          cpl?: number | null
          cpm?: number | null
          created_at?: string | null
          created_time?: string | null
          ctr?: number | null
          daily_budget?: number | null
          end_time?: string | null
          id?: string
          impressions?: number | null
          last_synced_at?: string | null
          leads?: number | null
          lifetime_budget?: number | null
          optimization_goal?: string | null
          spend?: number | null
          start_time?: string | null
          status?: string
          targeting?: Json | null
          updated_at?: string | null
          updated_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_adsets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_performance_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_adsets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "meta_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_campaigns: {
        Row: {
          account_id: string
          budget_remaining: number | null
          campaign_id: string
          campaign_name: string
          clicks: number | null
          conversions: number | null
          cpc: number | null
          cpl: number | null
          cpm: number | null
          created_at: string | null
          created_time: string | null
          ctr: number | null
          daily_budget: number | null
          id: string
          impressions: number | null
          last_synced_at: string | null
          leads: number | null
          lifetime_budget: number | null
          objective: string | null
          spend: number | null
          start_time: string | null
          status: string
          stop_time: string | null
          updated_at: string | null
          updated_time: string | null
        }
        Insert: {
          account_id: string
          budget_remaining?: number | null
          campaign_id: string
          campaign_name: string
          clicks?: number | null
          conversions?: number | null
          cpc?: number | null
          cpl?: number | null
          cpm?: number | null
          created_at?: string | null
          created_time?: string | null
          ctr?: number | null
          daily_budget?: number | null
          id?: string
          impressions?: number | null
          last_synced_at?: string | null
          leads?: number | null
          lifetime_budget?: number | null
          objective?: string | null
          spend?: number | null
          start_time?: string | null
          status: string
          stop_time?: string | null
          updated_at?: string | null
          updated_time?: string | null
        }
        Update: {
          account_id?: string
          budget_remaining?: number | null
          campaign_id?: string
          campaign_name?: string
          clicks?: number | null
          conversions?: number | null
          cpc?: number | null
          cpl?: number | null
          cpm?: number | null
          created_at?: string | null
          created_time?: string | null
          ctr?: number | null
          daily_budget?: number | null
          id?: string
          impressions?: number | null
          last_synced_at?: string | null
          leads?: number | null
          lifetime_budget?: number | null
          objective?: string | null
          spend?: number | null
          start_time?: string | null
          status?: string
          stop_time?: string | null
          updated_at?: string | null
          updated_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_campaigns_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_campaigns_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "leads_stats"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "meta_campaigns_account_id_fkey"
            columns: ["account_id"]
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
      organizations: {
        Row: {
          created_at: string | null
          favicon_url: string | null
          id: string
          logo_url: string | null
          name: string
          plan: string | null
          primary_color: string | null
          secondary_color: string | null
          sidebar_logo_url: string | null
          slug: string
          status: string | null
          updated_at: string | null
          webhook_secret: string | null
          webhook_url: string | null
          welcome_message: string | null
        }
        Insert: {
          created_at?: string | null
          favicon_url?: string | null
          id?: string
          logo_url?: string | null
          name: string
          plan?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          sidebar_logo_url?: string | null
          slug: string
          status?: string | null
          updated_at?: string | null
          webhook_secret?: string | null
          webhook_url?: string | null
          welcome_message?: string | null
        }
        Update: {
          created_at?: string | null
          favicon_url?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          plan?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          sidebar_logo_url?: string | null
          slug?: string
          status?: string | null
          updated_at?: string | null
          webhook_secret?: string | null
          webhook_url?: string | null
          welcome_message?: string | null
        }
        Relationships: []
      }
      performance_alerts: {
        Row: {
          account_id: string
          ad_id: string | null
          adset_id: string | null
          alert_type: string
          campaign_id: string | null
          created_at: string | null
          dismissed_at: string | null
          dismissed_by: string | null
          id: string
          message: string
          metadata: Json | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          account_id: string
          ad_id?: string | null
          adset_id?: string | null
          alert_type: string
          campaign_id?: string | null
          created_at?: string | null
          dismissed_at?: string | null
          dismissed_by?: string | null
          id?: string
          message: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          ad_id?: string | null
          adset_id?: string | null
          alert_type?: string
          campaign_id?: string | null
          created_at?: string | null
          dismissed_at?: string | null
          dismissed_by?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_alerts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_alerts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "leads_stats"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "performance_alerts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "relatorio_n8n_consolidated"
            referencedColumns: ["conta_id"]
          },
          {
            foreignKeyName: "performance_alerts_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "meta_ads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_alerts_adset_id_fkey"
            columns: ["adset_id"]
            isOneToOne: false
            referencedRelation: "meta_adsets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_alerts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_performance_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_alerts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "meta_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_alerts_dismissed_by_fkey"
            columns: ["dismissed_by"]
            isOneToOne: false
            referencedRelation: "users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          ativo: boolean | null
          avatar_url: string | null
          cargo: string | null
          departamento: string | null
          email: string | null
          id: string
          name: string | null
          organization_id: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          status: string | null
          telefone: string | null
          ultimo_acesso: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          ativo?: boolean | null
          avatar_url?: string | null
          cargo?: string | null
          departamento?: string | null
          email?: string | null
          id: string
          name?: string | null
          organization_id?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          status?: string | null
          telefone?: string | null
          ultimo_acesso?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          ativo?: boolean | null
          avatar_url?: string | null
          cargo?: string | null
          departamento?: string | null
          email?: string | null
          id?: string
          name?: string | null
          organization_id?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          status?: string | null
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
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      smart_alerts: {
        Row: {
          account_id: string | null
          alert_type: string
          created_at: string | null
          id: string
          is_resolved: boolean | null
          message: string
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
        }
        Insert: {
          account_id?: string | null
          alert_type: string
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          message: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
        }
        Update: {
          account_id?: string | null
          alert_type?: string
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          message?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "smart_alerts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smart_alerts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "leads_stats"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "smart_alerts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "relatorio_n8n_consolidated"
            referencedColumns: ["conta_id"]
          },
          {
            foreignKeyName: "smart_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      system_branding: {
        Row: {
          created_at: string | null
          favicon_url: string | null
          id: string
          logo_size: number | null
          logo_url: string | null
          name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          favicon_url?: string | null
          id?: string
          logo_size?: number | null
          logo_url?: string | null
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          favicon_url?: string | null
          id?: string
          logo_size?: number | null
          logo_url?: string | null
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string | null
          description: string | null
          enabled: boolean | null
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      user_course_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          id: string
          lesson_id: string
          progress_percent: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          lesson_id: string
          progress_percent?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          lesson_id?: string
          progress_percent?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_course_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_course_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_view"
            referencedColumns: ["id"]
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
      campaign_performance_summary: {
        Row: {
          account_id: string | null
          adsets_avg_cpl: number | null
          adsets_total_leads: number | null
          campaign_id: string | null
          campaign_name: string | null
          cpl: number | null
          ctr: number | null
          id: string | null
          leads: number | null
          objective: string | null
          spend: number | null
          status: string | null
          total_ads: number | null
          total_adsets: number | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_campaigns_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_campaigns_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "leads_stats"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "meta_campaigns_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "relatorio_n8n_consolidated"
            referencedColumns: ["conta_id"]
          },
        ]
      }
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
        Args: never
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
      get_user_org: { Args: { _user_id: string }; Returns: string }
      get_user_status: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_gestor: { Args: { _user_id: string }; Returns: boolean }
      is_org_admin: { Args: { _user_id: string }; Returns: boolean }
      is_vetter_admin: { Args: { _user_id: string }; Returns: boolean }
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

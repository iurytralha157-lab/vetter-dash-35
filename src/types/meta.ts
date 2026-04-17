export interface MetaInsights {
  impressions: number;
  reach: number;
  clicks: number;
  spend: number;
  ctr: number;
  cpc: number;
  cpm: number;
  conversions: number;
  cost_per_conversion?: number | null;
  followers?: number;
}

export interface MetaCampaign {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DELETED';
  objective: string;
  daily_budget?: number | null;
  lifetime_budget?: number | null;
  insights: MetaInsights | null;
}

export interface MetaAccountMetrics {
  total_spend: number;
  total_impressions: number;
  total_clicks: number;
  avg_ctr: number;
  avg_cpc: number;
  avg_cpm: number;
  total_conversions: number;
  total_followers?: number;
}

export interface MetaAccountBalance {
  balance: number;
  balance_raw: number;
  funds_amount: number | null;
  debt_amount: number;
  amount_spent: number;
  spend_cap: number | null;
  currency: string;
  account_name: string | null;
  account_status: number | null;
  disable_reason: number | null;
  is_prepay_account: boolean;
  funding_source_details: any | null;
  funding_source_type: string | null;
  balance_mode: 'funds' | 'card_ok' | 'card_failing' | 'card_and_funds' | 'prepay' | 'unknown';
  has_card: boolean;
  has_payment_issue: boolean;
}

export interface MetaAdsResponse {
  success: boolean;
  account_id: string;
  campaigns: MetaCampaign[];
  account_metrics: MetaAccountMetrics | null;
  account_balance: MetaAccountBalance | null;
  fetched_at: string;
  error?: string;
  error_code?: string;
}

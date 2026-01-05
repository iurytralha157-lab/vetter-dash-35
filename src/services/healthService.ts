import { supabase } from "@/integrations/supabase/client";

export interface HealthScore {
  id: string;
  account_id: string;
  score: number;
  factors: {
    saldo?: number;
    campanhas?: number;
    leads?: number;
    sync?: number;
  };
  calculated_at: string;
  created_at: string;
}

export interface SmartAlert {
  id: string;
  account_id: string | null;
  alert_type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  account?: {
    id: string;
    nome_cliente: string;
  };
}

export const healthService = {
  async getHealthScores(): Promise<HealthScore[]> {
    const { data, error } = await supabase
      .from('account_health_scores')
      .select('*')
      .order('calculated_at', { ascending: false });

    if (error) throw error;
    return (data || []) as HealthScore[];
  },

  async getLatestHealthScore(accountId: string): Promise<HealthScore | null> {
    const { data, error } = await supabase
      .from('account_health_scores')
      .select('*')
      .eq('account_id', accountId)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data as HealthScore | null;
  },

  async getAlerts(includeResolved = false): Promise<SmartAlert[]> {
    let query = supabase
      .from('smart_alerts')
      .select(`
        *,
        account:accounts!smart_alerts_account_id_fkey(id, nome_cliente)
      `)
      .order('created_at', { ascending: false });

    if (!includeResolved) {
      query = query.eq('is_resolved', false);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as SmartAlert[];
  },

  async resolveAlert(alertId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { error } = await supabase
      .from('smart_alerts')
      .update({
        is_resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: user.id
      })
      .eq('id', alertId);

    if (error) throw error;
  },

  async createAlert(alert: {
    account_id?: string;
    alert_type: string;
    severity: 'info' | 'warning' | 'critical';
    message: string;
  }): Promise<SmartAlert> {
    const { data, error } = await supabase
      .from('smart_alerts')
      .insert(alert)
      .select()
      .single();

    if (error) throw error;
    return data as SmartAlert;
  },

  async calculateHealthScore(accountId: string): Promise<HealthScore> {
    // Buscar dados da conta para calcular o score
    const { data: account } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (!account) throw new Error('Conta não encontrada');

    // Calcular fatores do score
    const factors: HealthScore['factors'] = {};
    
    // Fator: Saldo (se monitoramento ativo)
    if (account.monitorar_saldo_meta && account.saldo_meta !== null) {
      const alertaMin = account.alerta_saldo_baixo || 100;
      factors.saldo = account.saldo_meta >= alertaMin ? 100 : 
                      account.saldo_meta >= alertaMin / 2 ? 50 : 20;
    }

    // Fator: Campanhas ativas
    factors.campanhas = account.active_campaigns && account.active_campaigns > 0 ? 100 : 50;

    // Fator: Leads últimos 30 dias
    const leads30d = account.total_leads_30d || 0;
    factors.leads = leads30d >= 100 ? 100 : leads30d >= 50 ? 80 : leads30d >= 20 ? 60 : 40;

    // Fator: Última sincronização
    if (account.last_sync_meta) {
      const lastSync = new Date(account.last_sync_meta);
      const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
      factors.sync = hoursSinceSync <= 24 ? 100 : hoursSinceSync <= 48 ? 70 : 30;
    }

    // Calcular score geral (média dos fatores)
    const factorValues = Object.values(factors).filter(v => v !== undefined) as number[];
    const score = factorValues.length > 0 
      ? Math.round(factorValues.reduce((a, b) => a + b, 0) / factorValues.length)
      : 50;

    // Salvar score
    const { data, error } = await supabase
      .from('account_health_scores')
      .insert({
        account_id: accountId,
        score,
        factors
      })
      .select()
      .single();

    if (error) throw error;
    return data as HealthScore;
  }
};

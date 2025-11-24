import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  type: 'morning_reminder' | 'evening_pending';
  accounts: Array<{
    nome: string;
    pending_meta: boolean;
    pending_google: boolean;
  }>;
  total_pending: number;
  date: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { type = 'morning_reminder' } = await req.json().catch(() => ({}));
    const today = new Date().toISOString().split('T')[0];

    console.log(`Processando notificação: ${type} para data ${today}`);

    // Buscar contas ativas
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('id, nome_cliente, usa_meta_ads, usa_google_ads, meta_account_id, google_ads_id')
      .eq('status', 'Ativo');

    if (accountsError) {
      console.error('Erro ao buscar contas:', accountsError);
      throw accountsError;
    }

    // Buscar checks de hoje
    const { data: checks, error: checksError } = await supabase
      .from('daily_account_checks')
      .select('account_id, checked_meta, checked_google')
      .eq('check_date', today);

    if (checksError) {
      console.error('Erro ao buscar checks:', checksError);
      throw checksError;
    }

    const checksMap = new Map(checks?.map(c => [c.account_id, c]) || []);

    // Filtrar contas pendentes
    const pendingAccounts = accounts
      ?.filter(acc => {
        const check = checksMap.get(acc.id);
        const needsMetaCheck = acc.usa_meta_ads && acc.meta_account_id && !check?.checked_meta;
        const needsGoogleCheck = acc.usa_google_ads && acc.google_ads_id && !check?.checked_google;
        return needsMetaCheck || needsGoogleCheck;
      })
      .map(acc => {
        const check = checksMap.get(acc.id);
        return {
          nome: acc.nome_cliente,
          pending_meta: acc.usa_meta_ads && acc.meta_account_id && !check?.checked_meta,
          pending_google: acc.usa_google_ads && acc.google_ads_id && !check?.checked_google,
        };
      }) || [];

    const payload: NotificationPayload = {
      type,
      accounts: pendingAccounts,
      total_pending: pendingAccounts.length,
      date: today,
    };

    let message = '';
    
    if (type === 'morning_reminder') {
      message = `🌅 Bom dia! Há ${payload.total_pending} contas para verificar hoje.`;
    } else if (type === 'evening_pending') {
      if (payload.total_pending === 0) {
        message = '✅ Ótimo trabalho! Todas as contas foram verificadas hoje.';
      } else {
        message = `⚠️ Atenção! ${payload.total_pending} contas ainda não foram verificadas hoje:\n\n`;
        payload.accounts.forEach(acc => {
          const pending = [];
          if (acc.pending_meta) pending.push('Meta');
          if (acc.pending_google) pending.push('Google');
          message += `• ${acc.nome} (${pending.join(', ')})\n`;
        });
      }
    }

    console.log('Payload de notificação:', JSON.stringify(payload, null, 2));
    console.log('Mensagem:', message);

    // Aqui você pode integrar com seu webhook do N8N
    // const webhookUrl = Deno.env.get('N8N_WEBHOOK_URL');
    // if (webhookUrl) {
    //   await fetch(webhookUrl, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ ...payload, message }),
    //   });
    // }

    return new Response(
      JSON.stringify({
        success: true,
        payload,
        message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Erro na função:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

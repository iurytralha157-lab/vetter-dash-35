import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BALANCE_DATA_MAX_AGE_HOURS = 24;

function hasFreshBalanceData(lastBalanceCheck: string | null) {
  if (!lastBalanceCheck) return false;

  const lastCheckTime = new Date(lastBalanceCheck).getTime();
  if (Number.isNaN(lastCheckTime)) return false;

  const maxAgeMs = BALANCE_DATA_MAX_AGE_HOURS * 60 * 60 * 1000;
  return Date.now() - lastCheckTime <= maxAgeMs;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL')!;
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY')!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get the first linked WhatsApp instance
    const { data: instances } = await supabase
      .from('whatsapp_instances')
      .select('instance_name')
      .limit(1);

    const instanceName = instances?.[0]?.instance_name;
    if (!instanceName) {
      console.error('[balance-alert] Nenhuma instância WhatsApp vinculada');
      return new Response(JSON.stringify({ error: 'No WhatsApp instance linked' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch all active accounts with Meta Ads and a group configured
    const { data: accounts, error } = await supabase
      .from('accounts')
      .select('id, nome_cliente, saldo_meta, alerta_saldo_baixo, id_grupo, meta_account_id, modo_saldo_meta, notificacao_saldo_baixo, last_balance_check_meta')
      .eq('status', 'Ativo')
      .eq('usa_meta_ads', true)
      .not('id_grupo', 'is', null)
      .not('meta_account_id', 'is', null);

    if (error) {
      console.error('[balance-alert] Erro ao buscar contas:', error);
      throw error;
    }

    console.log(`[balance-alert] Verificando ${accounts?.length || 0} contas...`);

    const baseUrl = evolutionApiUrl.replace(/\/+$/, '');
    const alerts: { account: string; type: string; message: string }[] = [];
    const skipped: string[] = [];

    for (const acc of accounts || []) {
      if (acc.notificacao_saldo_baixo === false) {
        console.log(`[balance-alert] ⏭️ ${acc.nome_cliente} - alerta de saldo desativado manualmente`);
        skipped.push(`${acc.nome_cliente} (alerta desativado)`);
        continue;
      }

      const saldo = acc.saldo_meta ?? 0;
      const limiteAlerta = acc.alerta_saldo_baixo ?? 200;
      const modoSaldo = acc.modo_saldo_meta || 'unknown';
      const freshBalanceData = hasFreshBalanceData(acc.last_balance_check_meta ?? null);

      let message = '';
      let alertType = '';

      // ─── Smart alert logic based on account payment mode ───
      
      if (modoSaldo === 'card_ok') {
        // Card is working fine, no funds to monitor → SKIP
        console.log(`[balance-alert] ⏭️ ${acc.nome_cliente} - Cartão ativo e funcionando, sem alerta necessário`);
        skipped.push(`${acc.nome_cliente} (cartão OK)`);
        continue;
      }

      if (modoSaldo === 'card_failing') {
        // Card has payment issues → ALERT about card problem
        alertType = 'cartao_com_problema';
        message = `🚨 *Problema de Pagamento - Cartão*\n\n` +
          `A conta *${acc.nome_cliente}* está com *falha no cartão de crédito*.\n\n` +
          `⚠️ O Meta não conseguiu debitar o cartão cadastrado.\n` +
          `As campanhas podem ser pausadas se o problema persistir.\n\n` +
          `📋 Verifique o cartão no Gerenciador de Anúncios ou entre em contato com o banco.\n` +
          `Responda aqui se precisar de ajuda.`;
      } else if (modoSaldo === 'card_and_funds') {
        // Card is active, so do not alert for low/zero funds
        console.log(`[balance-alert] ⏭️ ${acc.nome_cliente} - Cartão ativo cobrindo a conta, sem alerta de saldo`);
        skipped.push(`${acc.nome_cliente} (cartão ativo + fundos)`);
        continue;
      } else {
        if (!freshBalanceData) {
          console.log(`[balance-alert] ⏭️ ${acc.nome_cliente} - sem leitura de saldo válida/recente`);
          skipped.push(`${acc.nome_cliente} (sem leitura válida)`);
          continue;
        }

        // Standard funds/prepay/unknown accounts → normal alert logic
        if (saldo <= 0) {
          alertType = 'saldo_zero';
          message = `🚨 *URGENTE - Saldo Zerado!*\n\n` +
            `A conta *${acc.nome_cliente}* está *sem saldo* no Meta Ads.\n\n` +
            `⚠️ As campanhas serão pausadas automaticamente.\n\n` +
            `💰 Podemos gerar o PIX para recarga?\n` +
            `Responda aqui para agilizarmos.`;
        } else if (saldo < limiteAlerta) {
          alertType = 'saldo_baixo';
          message = `⚠️ *Alerta de Saldo Baixo*\n\n` +
            `A conta *${acc.nome_cliente}* está com saldo abaixo do limite configurado.\n\n` +
            `💰 Saldo atual: *R$ ${saldo.toFixed(2).replace('.', ',')}*\n` +
            `🔔 Limite de alerta: *R$ ${limiteAlerta.toFixed(2).replace('.', ',')}*\n\n` +
            `📋 Podemos gerar o PIX para recarga?\n` +
            `Responda aqui para agilizarmos.`;
        }
      }

      if (message && acc.id_grupo) {
        try {
          const groupJid = acc.id_grupo!.includes('@') ? acc.id_grupo! : acc.id_grupo!.replace('-group', '@g.us');
          const payload = {
            number: groupJid,
            text: message,
          };
          console.log(`[balance-alert] Sending to ${acc.nome_cliente} (${modoSaldo}), type: ${alertType}`);

          const sendRes = await fetch(`${baseUrl}/message/sendText/${instanceName}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: evolutionApiKey,
            },
            body: JSON.stringify(payload),
          });

          const sendText = await sendRes.text();
          console.log(`[balance-alert] Response ${sendRes.status} for ${acc.nome_cliente}:`, sendText.slice(0, 500));
          
          if (sendRes.ok) {
            console.log(`[balance-alert] ✅ Alerta enviado para ${acc.nome_cliente} (${alertType})`);
            alerts.push({ account: acc.nome_cliente, type: alertType, message: 'sent' });
          } else {
            console.error(`[balance-alert] ❌ Erro ao enviar para ${acc.nome_cliente}:`, sendText);
            alerts.push({ account: acc.nome_cliente, type: alertType, message: `error: ${sendText}` });
          }
        } catch (sendErr) {
          console.error(`[balance-alert] ❌ Erro ao enviar para ${acc.nome_cliente}:`, sendErr);
          alerts.push({ account: acc.nome_cliente, type: alertType, message: `error: ${sendErr}` });
        }

        // Delay entre mensagens para evitar bloqueio do WhatsApp
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    // Also send a summary to admins if there are alerts
    if (alerts.length > 0) {
      const { data: admins } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      for (const admin of admins || []) {
        const zeroCount = alerts.filter(a => a.type === 'saldo_zero').length;
        const lowCount = alerts.filter(a => a.type === 'saldo_baixo').length;
        const cardFailCount = alerts.filter(a => a.type === 'cartao_com_problema').length;
        const fundsLowCardCount = alerts.filter(a => a.type === 'fundos_baixo_com_cartao').length;
        
        let title = '💰 Resumo de Saldo';
        const parts: string[] = [];
        
        if (zeroCount > 0) parts.push(`🚨 ${zeroCount} conta(s) sem saldo`);
        if (lowCount > 0) parts.push(`⚠️ ${lowCount} conta(s) com saldo baixo`);
        if (cardFailCount > 0) parts.push(`💳 ${cardFailCount} conta(s) com problema no cartão`);
        if (fundsLowCardCount > 0) parts.push(`ℹ️ ${fundsLowCardCount} conta(s) com fundos baixos (cartão ativo)`);

        await supabase.from('user_notifications').insert({
          user_id: admin.user_id,
          type: 'balance_alert',
          title,
          message: parts.join('. ') + '.',
          reference_type: 'balance',
        });
      }
    }

    console.log(`[balance-alert] Concluído. ${alerts.length} alertas enviados, ${skipped.length} contas puladas.`);

    return new Response(JSON.stringify({
      success: true,
      total_checked: accounts?.length || 0,
      alerts_sent: alerts.length,
      skipped_count: skipped.length,
      skipped_accounts: skipped,
      details: alerts,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[balance-alert] Erro:', err);
    return new Response(JSON.stringify({
      error: err instanceof Error ? err.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

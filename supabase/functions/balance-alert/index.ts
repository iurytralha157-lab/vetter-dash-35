import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      .select('id, nome_cliente, saldo_meta, alerta_saldo_baixo, id_grupo, meta_account_id, modo_saldo_meta')
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
      const saldo = acc.saldo_meta ?? 0;
      const limiteAlerta = acc.alerta_saldo_baixo ?? 200;
      const modoSaldo = acc.modo_saldo_meta || 'unknown';

      // CRITICAL: Skip card-only accounts - they don't have a real "balance" to monitor
      // The "balance" field for card accounts is "saldo devedor" (amount to be charged),
      // NOT available funds. We only alert for accounts with actual funds/prepaid balance.
      if (modoSaldo === 'card_only') {
        console.log(`[balance-alert] ⏭️ Pulando ${acc.nome_cliente} - conta com cartão (sem fundos para monitorar)`);
        skipped.push(acc.nome_cliente);
        continue;
      }

      let message = '';
      let alertType = '';

      if (saldo === 0 || saldo <= 0) {
        // URGENT: Zero balance
        alertType = 'saldo_zero';
        message = `🚨 *URGENTE - Saldo Zerado!*\n\n` +
          `A conta *${acc.nome_cliente}* está *sem saldo* no Meta Ads.\n\n` +
          `⚠️ As campanhas serão pausadas automaticamente.\n\n` +
          `💰 Podemos gerar o PIX para recarga?\n` +
          `Responda aqui para agilizarmos.`;
      } else if (saldo < limiteAlerta) {
        // Low balance warning
        alertType = 'saldo_baixo';
        message = `⚠️ *Alerta de Saldo Baixo*\n\n` +
          `A conta *${acc.nome_cliente}* está com saldo abaixo do limite configurado.\n\n` +
          `💰 Saldo atual: *R$ ${saldo.toFixed(2).replace('.', ',')}*\n` +
          `🔔 Limite de alerta: *R$ ${limiteAlerta.toFixed(2).replace('.', ',')}*\n\n` +
          `📋 Podemos gerar o PIX para recarga?\n` +
          `Responda aqui para agilizarmos.`;
      }

      if (message && acc.id_grupo) {
        try {
          const groupJid = acc.id_grupo!.includes('@') ? acc.id_grupo! : acc.id_grupo!.replace('-group', '@g.us');
          const payload = {
            number: groupJid,
            text: message,
          };
          console.log(`[balance-alert] Sending to ${acc.nome_cliente} (${modoSaldo}), group: ${acc.id_grupo}`);

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
        
        let title = '💰 Resumo de Saldo';
        let notifMessage = '';
        
        if (zeroCount > 0) {
          notifMessage += `🚨 ${zeroCount} conta(s) sem saldo. `;
        }
        if (lowCount > 0) {
          notifMessage += `⚠️ ${lowCount} conta(s) com saldo baixo.`;
        }

        await supabase.from('user_notifications').insert({
          user_id: admin.user_id,
          type: 'balance_alert',
          title,
          message: notifMessage.trim(),
          reference_type: 'balance',
        });
      }
    }

    console.log(`[balance-alert] Concluído. ${alerts.length} alertas enviados, ${skipped.length} contas com cartão puladas.`);

    return new Response(JSON.stringify({
      success: true,
      total_checked: accounts?.length || 0,
      alerts_sent: alerts.length,
      card_accounts_skipped: skipped.length,
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

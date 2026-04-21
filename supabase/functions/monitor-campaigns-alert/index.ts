import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Grupo "EQUIPE - TRAFEGO" (Sistema Tráfego)
const ALERT_GROUP_JID = '120363419496533710@g.us';
const WHATSAPP_INSTANCE = 'nova_cd868_73o';

// Map BRT date (YYYY-MM-DD)
function brtDate(offsetDays = 0): string {
  const now = new Date();
  // BRT = UTC-3
  const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  brt.setUTCDate(brt.getUTCDate() + offsetDays);
  return brt.toISOString().slice(0, 10);
}

function fmtBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
}

function classifyIdealCpl(campaignType: string | null, cplSettings: any): { ideal: number; margem: number } {
  const margem = cplSettings?.margem_amarelo ?? 20;
  switch (campaignType) {
    case 'mcmv': return { ideal: cplSettings?.cpl_mcmv ?? 30, margem };
    case 'medio': return { ideal: cplSettings?.cpl_medio ?? 50, margem };
    case 'alto': return { ideal: cplSettings?.cpl_alto ?? 80, margem };
    default: return { ideal: cplSettings?.cpl_medio ?? 50, margem };
  }
}

async function sendWhatsApp(message: string): Promise<{ ok: boolean; error?: string }> {
  const evolutionUrl = Deno.env.get('EVOLUTION_API_URL');
  const evolutionKey = Deno.env.get('EVOLUTION_API_KEY');
  if (!evolutionUrl || !evolutionKey) {
    return { ok: false, error: 'Evolution API not configured' };
  }
  try {
    const url = `${evolutionUrl.replace(/\/$/, '')}/message/sendText/${WHATSAPP_INSTANCE}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: evolutionKey },
      body: JSON.stringify({ number: ALERT_GROUP_JID, text: message }),
    });
    if (!res.ok) {
      const txt = await res.text();
      return { ok: false, error: `Evolution ${res.status}: ${txt}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const yesterday = brtDate(-1);
    const twoDaysAgo = brtDate(-2);
    const sevenDaysAgo = brtDate(-7);

    console.log(`[monitor-campaigns] Analyzing yesterday=${yesterday}, 2d=${twoDaysAgo}, 7d=${sevenDaysAgo}`);

    // 1) Fetch all active accounts with Meta Ads
    const { data: accounts, error: accErr } = await supabase
      .from('accounts')
      .select('id, nome_cliente, meta_account_id')
      .eq('status', 'Ativo')
      .not('meta_account_id', 'is', null);

    if (accErr) throw new Error(`accounts: ${accErr.message}`);
    console.log(`[monitor-campaigns] ${accounts?.length || 0} accounts to analyze`);

    // 2) Fetch global cpl_settings (account_id IS NULL = default)
    const { data: cplGlobal } = await supabase
      .from('cpl_settings')
      .select('*')
      .is('account_id', null)
      .maybeSingle();

    const { data: cplPerAccount } = await supabase
      .from('cpl_settings')
      .select('*')
      .not('account_id', 'is', null);

    const cplMap = new Map<string, any>();
    (cplPerAccount || []).forEach((c: any) => cplMap.set(c.account_id, c));

    type Alert = {
      account_name: string;
      campaign_name: string;
      reason: string;
      detail: string;
      severity: number; // higher = worse
    };
    const alerts: Alert[] = [];

    // 3) For each account, fetch campaign_history of last 7 days
    for (const acc of accounts || []) {
      const cplSettings = cplMap.get(acc.id) || cplGlobal;

      const { data: history, error: histErr } = await supabase
        .from('campaign_history')
        .select('campaign_id, campaign_name, status, date, spend, leads, cpl, campaign_type')
        .eq('account_id', acc.id)
        .gte('date', sevenDaysAgo)
        .order('date', { ascending: false });

      if (histErr) {
        console.warn(`history error for ${acc.nome_cliente}: ${histErr.message}`);
        continue;
      }
      if (!history || history.length === 0) continue;

      // Group by campaign_id
      const byCampaign = new Map<string, any[]>();
      for (const row of history) {
        const arr = byCampaign.get(row.campaign_id) || [];
        arr.push(row);
        byCampaign.set(row.campaign_id, arr);
      }

      for (const [campId, rows] of byCampaign) {
        const campaign = rows[0];
        // Skip non-active campaigns
        if (campaign.status && !['ACTIVE', 'ativa', 'Ativa'].includes(campaign.status)) continue;

        const yest = rows.find((r: any) => r.date === yesterday);
        const dayBefore = rows.find((r: any) => r.date === twoDaysAgo);

        const yestSpend = Number(yest?.spend || 0);
        const yestLeads = Number(yest?.leads || 0);
        const dayBeforeSpend = Number(dayBefore?.spend || 0);
        const dayBeforeLeads = Number(dayBefore?.leads || 0);

        // Critério 1: Gastou ontem e 0 leads (>= R$5 para evitar ruído)
        if (yestSpend >= 5 && yestLeads === 0) {
          alerts.push({
            account_name: acc.nome_cliente,
            campaign_name: campaign.campaign_name,
            reason: '🔴 Gastou e não gerou lead',
            detail: `Ontem: ${fmtBRL(yestSpend)} • 0 leads`,
            severity: 3,
          });
        }

        // Critério 2: 2+ dias sem leads (gastando)
        if (yestSpend >= 5 && yestLeads === 0 && dayBeforeSpend >= 5 && dayBeforeLeads === 0) {
          alerts.push({
            account_name: acc.nome_cliente,
            campaign_name: campaign.campaign_name,
            reason: '🚨 2+ dias sem leads',
            detail: `Ontem: ${fmtBRL(yestSpend)} • Anteontem: ${fmtBRL(dayBeforeSpend)} • Total: 0 leads`,
            severity: 4,
          });
        }

        // Critério 3: CPL muito acima do ideal
        if (yestLeads > 0) {
          const cplReal = yestSpend / yestLeads;
          const { ideal, margem } = classifyIdealCpl(campaign.campaign_type, cplSettings);
          const limite = ideal * (1 + margem / 100);
          if (cplReal > limite * 1.3) {
            // 30% acima do limite amarelo = alerta vermelho
            alerts.push({
              account_name: acc.nome_cliente,
              campaign_name: campaign.campaign_name,
              reason: '💸 CPL muito alto',
              detail: `CPL: ${fmtBRL(cplReal)} (ideal: ${fmtBRL(ideal)} • ${yestLeads} leads)`,
              severity: 2,
            });
          }
        }

        // Critério 4: Gasto diário muito acima da média 7d
        const last7 = rows.filter((r: any) => r.date !== yesterday).slice(0, 7);
        if (last7.length >= 3 && yestSpend > 0) {
          const avg7 = last7.reduce((s: number, r: any) => s + Number(r.spend || 0), 0) / last7.length;
          if (avg7 > 0 && yestSpend > avg7 * 2) {
            alerts.push({
              account_name: acc.nome_cliente,
              campaign_name: campaign.campaign_name,
              reason: '📈 Gasto fora do padrão',
              detail: `Ontem: ${fmtBRL(yestSpend)} • Média 7d: ${fmtBRL(avg7)} (${((yestSpend / avg7 - 1) * 100).toFixed(0)}% acima)`,
              severity: 1,
            });
          }
        }
      }
    }

    console.log(`[monitor-campaigns] ${alerts.length} alerts generated`);

    if (alerts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, alerts: 0, message: 'No alerts to send' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sort by severity desc, then group by account
    alerts.sort((a, b) => b.severity - a.severity);
    const byAccount = new Map<string, Alert[]>();
    for (const a of alerts) {
      const arr = byAccount.get(a.account_name) || [];
      arr.push(a);
      byAccount.set(a.account_name, arr);
    }

    // Build message
    const dateLabel = new Date(yesterday + 'T12:00:00').toLocaleDateString('pt-BR');
    let msg = `🚨 *MONITOR DE CAMPANHAS — ${dateLabel}*\n`;
    msg += `_Análise diária automática_\n\n`;
    msg += `📊 *${alerts.length} alertas em ${byAccount.size} contas*\n`;
    msg += `${'─'.repeat(28)}\n\n`;

    for (const [accName, accAlerts] of byAccount) {
      msg += `🏢 *${accName}*\n`;
      for (const a of accAlerts) {
        msg += `${a.reason}\n`;
        msg += `  └ ${a.campaign_name}\n`;
        msg += `  └ ${a.detail}\n\n`;
      }
    }

    msg += `${'─'.repeat(28)}\n`;
    msg += `_Vetter Monitor • ${new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}_`;

    // Split if too long (WhatsApp limit ~4096 chars, be safe with 3500)
    const MAX_LEN = 3500;
    const chunks: string[] = [];
    if (msg.length <= MAX_LEN) {
      chunks.push(msg);
    } else {
      // Split by account block
      let buf = `🚨 *MONITOR DE CAMPANHAS — ${dateLabel}* (1/?)\n\n`;
      for (const [accName, accAlerts] of byAccount) {
        let block = `🏢 *${accName}*\n`;
        for (const a of accAlerts) {
          block += `${a.reason}\n  └ ${a.campaign_name}\n  └ ${a.detail}\n\n`;
        }
        if (buf.length + block.length > MAX_LEN) {
          chunks.push(buf);
          buf = `🚨 *MONITOR (cont.)*\n\n` + block;
        } else {
          buf += block;
        }
      }
      if (buf.trim()) chunks.push(buf);
      // Fix numbering
      const total = chunks.length;
      for (let i = 0; i < chunks.length; i++) {
        chunks[i] = chunks[i].replace('(1/?)', `(${i + 1}/${total})`).replace('(cont.)', `(${i + 1}/${total})`);
      }
    }

    let sent = 0;
    let lastError: string | undefined;
    for (const chunk of chunks) {
      const r = await sendWhatsApp(chunk);
      if (r.ok) sent++;
      else lastError = r.error;
      // Mandatory 2s delay between WhatsApp messages
      if (chunks.length > 1) await new Promise((res) => setTimeout(res, 2500));
    }

    return new Response(
      JSON.stringify({
        success: sent > 0,
        alerts: alerts.length,
        accounts_with_alerts: byAccount.size,
        chunks_sent: sent,
        chunks_total: chunks.length,
        last_error: lastError,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('monitor-campaigns error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

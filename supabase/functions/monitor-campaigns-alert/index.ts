import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Grupo "EQUIPE - TRAFEGO" (Sistema Tráfego)
const ALERT_GROUP_JID = '120363419496533710@g.us';
const WHATSAPP_INSTANCE = 'nova_cd868_73o';

function brtDate(offsetDays = 0): string {
  const now = new Date();
  const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  brt.setUTCDate(brt.getUTCDate() + offsetDays);
  return brt.toISOString().slice(0, 10);
}

function fmtBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
}

function classifyCampaignType(name: string): string {
  const n = (name || '').toLowerCase();
  if (/mcmv|minha\s*casa/i.test(n)) return 'mcmv';
  if (/alto\s*padr|luxo|premium|high\s*end/i.test(n)) return 'alto';
  return 'medio';
}

function getIdealCpl(campaignType: string, cplSettings: any): { ideal: number; margem: number } {
  const margem = Number(cplSettings?.margem_amarelo ?? 20);
  switch (campaignType) {
    case 'mcmv': return { ideal: Number(cplSettings?.cpl_mcmv ?? 30), margem };
    case 'alto': return { ideal: Number(cplSettings?.cpl_alto ?? 80), margem };
    default: return { ideal: Number(cplSettings?.cpl_medio ?? 50), margem };
  }
}

async function sendWhatsApp(message: string): Promise<{ ok: boolean; error?: string }> {
  const evolutionUrl = Deno.env.get('EVOLUTION_API_URL');
  const evolutionKey = Deno.env.get('EVOLUTION_API_KEY');
  if (!evolutionUrl || !evolutionKey) return { ok: false, error: 'Evolution API not configured' };
  try {
    const url = `${evolutionUrl.replace(/\/$/, '')}/message/sendText/${WHATSAPP_INSTANCE}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: evolutionKey },
      body: JSON.stringify({ number: ALERT_GROUP_JID, text: message }),
    });
    if (!res.ok) return { ok: false, error: `Evolution ${res.status}: ${await res.text()}` };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Optional: allow a custom reference date via body for testing
    let refDate: string | undefined;
    let dryRun = false;
    try {
      const body = await req.json();
      refDate = body?.date;
      dryRun = body?.dry_run === true;
    } catch (_) {}

    const yesterday = refDate || brtDate(-1);
    const yDate = new Date(yesterday + 'T12:00:00Z');
    const twoDaysAgo = new Date(yDate.getTime() - 86400000).toISOString().slice(0, 10);
    const sevenDaysAgo = new Date(yDate.getTime() - 7 * 86400000).toISOString().slice(0, 10);

    console.log(`[monitor] yesterday=${yesterday} 2d=${twoDaysAgo} 7d=${sevenDaysAgo} dry=${dryRun}`);

    // 1) Active accounts with Meta Ads
    const { data: accounts, error: accErr } = await supabase
      .from('accounts')
      .select('id, nome_cliente, meta_account_id')
      .eq('status', 'Ativo')
      .not('meta_account_id', 'is', null);
    if (accErr) throw new Error(`accounts: ${accErr.message}`);
    const accMap = new Map<string, any>();
    (accounts || []).forEach((a: any) => accMap.set(a.id, a));

    // 2) CPL settings
    const { data: cplGlobal } = await supabase.from('cpl_settings').select('*').is('account_id', null).maybeSingle();
    const { data: cplPer } = await supabase.from('cpl_settings').select('*').not('account_id', 'is', null);
    const cplMap = new Map<string, any>();
    (cplPer || []).forEach((c: any) => cplMap.set(c.account_id, c));

    // 3) All dispatches for the last 7 days (one query, then group in memory)
    const accountIds = Array.from(accMap.keys());
    if (accountIds.length === 0) {
      return new Response(JSON.stringify({ success: true, alerts: 0, message: 'No accounts' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: dispatches, error: dErr } = await supabase
      .from('campaign_report_dispatches')
      .select('account_id, campaign_id, campaign_name, data_date, spend, leads, clicks')
      .in('account_id', accountIds)
      .gte('data_date', sevenDaysAgo)
      .lte('data_date', yesterday)
      .eq('status', 'sent');
    if (dErr) throw new Error(`dispatches: ${dErr.message}`);

    console.log(`[monitor] ${dispatches?.length || 0} dispatch rows in window`);

    // Group by (account_id, campaign_id) -> map<date, row>
    const grouped = new Map<string, { account_id: string; campaign_id: string; campaign_name: string; days: Map<string, any> }>();
    for (const row of dispatches || []) {
      const key = `${row.account_id}::${row.campaign_id}`;
      let g = grouped.get(key);
      if (!g) {
        g = { account_id: row.account_id, campaign_id: row.campaign_id, campaign_name: row.campaign_name || row.campaign_id, days: new Map() };
        grouped.set(key, g);
      }
      // If same date appears twice, keep the latest (highest spend usually = full-day)
      const existing = g.days.get(row.data_date);
      if (!existing || Number(row.spend || 0) >= Number(existing.spend || 0)) {
        g.days.set(row.data_date, row);
      }
    }

    type Alert = { account_name: string; campaign_name: string; reason: string; detail: string; severity: number };
    const alerts: Alert[] = [];

    for (const g of grouped.values()) {
      const acc = accMap.get(g.account_id);
      if (!acc) continue;
      const cplSettings = cplMap.get(g.account_id) || cplGlobal;

      const yest = g.days.get(yesterday);
      const dayBefore = g.days.get(twoDaysAgo);
      const yestSpend = Number(yest?.spend || 0);
      const yestLeads = Number(yest?.leads || 0);
      const dayBeforeSpend = Number(dayBefore?.spend || 0);
      const dayBeforeLeads = Number(dayBefore?.leads || 0);

      // Skip if no activity yesterday and the day before
      if (yestSpend < 5 && dayBeforeSpend < 5) continue;

      const campaignType = classifyCampaignType(g.campaign_name);

      // Critério 2: 2+ dias gastando sem leads (mais grave) — checa primeiro
      const twoDaysNoLeads = yestSpend >= 5 && yestLeads === 0 && dayBeforeSpend >= 5 && dayBeforeLeads === 0;
      if (twoDaysNoLeads) {
        alerts.push({
          account_name: acc.nome_cliente,
          campaign_name: g.campaign_name,
          reason: '🚨 2+ dias sem leads',
          detail: `Ontem ${fmtBRL(yestSpend)} • Anteontem ${fmtBRL(dayBeforeSpend)} • Total: 0 leads`,
          severity: 4,
        });
      } else if (yestSpend >= 5 && yestLeads === 0) {
        // Critério 1: gastou ontem e 0 leads
        alerts.push({
          account_name: acc.nome_cliente,
          campaign_name: g.campaign_name,
          reason: '🔴 Gastou e não gerou lead',
          detail: `Ontem: ${fmtBRL(yestSpend)} • 0 leads`,
          severity: 3,
        });
      }

      // Critério 3: CPL muito alto (só se teve leads)
      if (yestLeads > 0 && yestSpend > 0) {
        const cplReal = yestSpend / yestLeads;
        const { ideal, margem } = getIdealCpl(campaignType, cplSettings);
        const limite = ideal * (1 + margem / 100);
        if (cplReal > limite * 1.3) {
          alerts.push({
            account_name: acc.nome_cliente,
            campaign_name: g.campaign_name,
            reason: '💸 CPL muito alto',
            detail: `CPL ${fmtBRL(cplReal)} (ideal ${fmtBRL(ideal)} • ${yestLeads} lead${yestLeads > 1 ? 's' : ''})`,
            severity: 2,
          });
        }
      }

      // Critério 4: gasto ontem > 2x média 7d (excluindo ontem)
      const last7Rows = Array.from(g.days.entries())
        .filter(([d]) => d !== yesterday)
        .map(([_, r]) => Number(r.spend || 0))
        .filter((s) => s > 0);
      if (last7Rows.length >= 3 && yestSpend > 0) {
        const avg = last7Rows.reduce((s, n) => s + n, 0) / last7Rows.length;
        if (avg > 0 && yestSpend > avg * 2) {
          alerts.push({
            account_name: acc.nome_cliente,
            campaign_name: g.campaign_name,
            reason: '📈 Gasto fora do padrão',
            detail: `Ontem ${fmtBRL(yestSpend)} • Média 7d ${fmtBRL(avg)} (${((yestSpend / avg - 1) * 100).toFixed(0)}% acima)`,
            severity: 1,
          });
        }
      }
    }

    console.log(`[monitor] ${alerts.length} alerts generated`);

    if (alerts.length === 0) {
      return new Response(JSON.stringify({ success: true, alerts: 0, message: 'No alerts to send', date: yesterday }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Sort by severity desc and group by account
    alerts.sort((a, b) => b.severity - a.severity);
    const byAccount = new Map<string, Alert[]>();
    for (const a of alerts) {
      const arr = byAccount.get(a.account_name) || [];
      arr.push(a);
      byAccount.set(a.account_name, arr);
    }

    const dateLabel = new Date(yesterday + 'T12:00:00').toLocaleDateString('pt-BR');
    const sep = '─'.repeat(28);
    const buildHeader = () =>
      `🚨 *MONITOR DE CAMPANHAS — ${dateLabel}*\n_Análise diária automática_\n\n📊 *${alerts.length} alertas em ${byAccount.size} contas*\n${sep}\n\n`;
    const footer = `${sep}\n_Vetter Monitor • ${new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}_`;

    // Build chunks
    const MAX_LEN = 3500;
    const chunks: string[] = [];
    let buf = buildHeader();
    let isFirst = true;
    for (const [accName, accAlerts] of byAccount) {
      let block = `🏢 *${accName}*\n`;
      for (const a of accAlerts) {
        block += `${a.reason}\n  └ ${a.campaign_name}\n  └ ${a.detail}\n\n`;
      }
      if ((buf + block + footer).length > MAX_LEN) {
        chunks.push(buf + footer);
        buf = `🚨 *MONITOR (cont.)*\n\n` + block;
        isFirst = false;
      } else {
        buf += block;
      }
    }
    if (buf.trim()) chunks.push(buf + footer);

    if (dryRun) {
      return new Response(JSON.stringify({ success: true, dry_run: true, alerts: alerts.length, accounts: byAccount.size, chunks: chunks.length, preview: chunks }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let sent = 0;
    let lastError: string | undefined;
    for (const chunk of chunks) {
      const r = await sendWhatsApp(chunk);
      if (r.ok) sent++;
      else lastError = r.error;
      if (chunks.length > 1) await new Promise((res) => setTimeout(res, 2500));
    }

    return new Response(
      JSON.stringify({
        success: sent > 0,
        date: yesterday,
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
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

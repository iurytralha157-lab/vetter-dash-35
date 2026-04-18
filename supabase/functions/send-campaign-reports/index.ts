// Disparo automático de relatórios de campanha Meta no WhatsApp.
// Substitui o N8N. Roda diariamente às 08h BRT via pg_cron, ou
// pode ser invocado manualmente com { account_id } / { dry_run: true }.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const META_API_VERSION = 'v21.0';
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

interface CampaignInsight {
  id: string;
  name: string;
  status: string;
  objective: string;
  spend: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpm: number;
  leads: number;        // ações de "lead"
  messages: number;     // mensagens iniciadas no WhatsApp
}

interface DispatchSummary {
  account_id: string;
  account_name: string;
  campaigns_total: number;
  campaigns_with_spend: number;
  sent: number;
  failed: number;
  skipped: number;
  errors: string[];
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatInt(value: number): string {
  return value.toLocaleString('pt-BR');
}

function formatDateBR(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function yesterdayInSaoPaulo(): string {
  // Data de "ontem" no fuso BRT
  const now = new Date();
  const sp = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  sp.setDate(sp.getDate() - 1);
  const y = sp.getFullYear();
  const m = String(sp.getMonth() + 1).padStart(2, '0');
  const d = String(sp.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function nowInSaoPaulo(): Date {
  const now = new Date();
  return new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
}

function isMondayInSaoPaulo(): boolean {
  return nowInSaoPaulo().getDay() === 1; // 0=domingo, 1=segunda
}

function lastWeekRangeSaoPaulo(): { start: string; end: string } {
  // Segunda a domingo da semana anterior, no fuso BRT
  const sp = nowInSaoPaulo();
  const dow = sp.getDay(); // 1 = segunda
  // Domingo passado = hoje (segunda) - 1 dia
  const sunday = new Date(sp);
  sunday.setDate(sp.getDate() - (dow === 0 ? 7 : dow));
  const monday = new Date(sunday);
  monday.setDate(sunday.getDate() - 6);
  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  return { start: fmt(monday), end: fmt(sunday) };
}

function todayInSaoPaulo(): string {
  const now = new Date();
  const sp = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const y = sp.getFullYear();
  const m = String(sp.getMonth() + 1).padStart(2, '0');
  const d = String(sp.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function buildMessage(params: {
  accountName: string;
  dataDate: string;
  campaign: CampaignInsight;
  weekly?: { start: string; end: string };
}): string {
  const { accountName, dataDate, campaign, weekly } = params;
  const isMessaging = campaign.objective === 'OUTCOME_ENGAGEMENT' || campaign.objective === 'MESSAGES';
  const conversionCount = isMessaging ? campaign.messages : campaign.leads;
  const conversionLabel = isMessaging ? 'Mensagens' : 'Leads';
  const costPer = conversionCount > 0 ? campaign.spend / conversionCount : 0;

  const lines: string[] = [];
  if (weekly) {
    lines.push('📊 *RELATÓRIO SEMANAL DE CAMPANHA*');
    lines.push(`👤 Conta de Anúncio: ${accountName}`);
    lines.push(`📅 Período: ${formatDateBR(weekly.start)} a ${formatDateBR(weekly.end)}`);
  } else {
    lines.push('📊 *RELATÓRIO DE CAMPANHA*');
    lines.push(`👤 Conta de Anúncio: ${accountName}`);
    lines.push(`📅 Data: ${formatDateBR(dataDate)}`);
  }
  lines.push('');
  lines.push('🎯 *CAMPANHA:*');
  lines.push(campaign.name);
  lines.push('');
  lines.push(weekly ? '💰 *INVESTIMENTO & RESULTADOS (7 DIAS):*' : '💰 *INVESTIMENTO & RESULTADOS:*');
  lines.push(`• Gasto: R$ ${formatBRL(campaign.spend)}`);
  lines.push(`• ${conversionLabel}: ${formatInt(conversionCount)}`);
  lines.push(`• Custo por ${conversionLabel}: R$ ${formatBRL(costPer)}`);
  lines.push(`• Alcance: ${formatInt(campaign.reach)}`);
  lines.push(`• Cliques no link: ${formatInt(campaign.clicks)}`);
  lines.push(`• CTR: ${campaign.ctr.toFixed(2).replace('.', ',')}%`);
  lines.push(`• CPM: R$ ${formatBRL(campaign.cpm)}`);

  if (isMessaging && campaign.messages > 0) {
    lines.push('');
    lines.push('🔍 *DETALHES DE CONVERSÃO:*');
    lines.push(`• Mensagens (WhatsApp): ${formatInt(campaign.messages)}`);
  }

  // Pergunta de qualificação só aparece quando há conversões
  if (conversionCount > 0) {
    lines.push('');
    lines.push('❓ Como está a qualificação desses leads?');
  }

  return lines.join('\n');
}

async function fetchCampaignInsights(
  metaAccountId: string,
  accessToken: string,
  range: { type: 'yesterday' } | { type: 'range'; since: string; until: string }
): Promise<CampaignInsight[]> {
  const formattedAccountId = metaAccountId.startsWith('act_') ? metaAccountId : `act_${metaAccountId}`;

  const campaignsUrl = `${META_BASE_URL}/${formattedAccountId}/campaigns?fields=id,name,status,objective&limit=200&access_token=${accessToken}`;
  const campaignsRes = await fetch(campaignsUrl);
  if (!campaignsRes.ok) {
    throw new Error(`Meta API campaigns error: ${campaignsRes.status} - ${await campaignsRes.text()}`);
  }
  const campaignsData = await campaignsRes.json();
  const campaigns = campaignsData.data || [];

  const dateParam = range.type === 'yesterday'
    ? 'date_preset=yesterday'
    : `time_range=${encodeURIComponent(JSON.stringify({ since: range.since, until: range.until }))}`;

  const insightsPromises = campaigns.map(async (c: any): Promise<CampaignInsight | null> => {
    try {
      const insightsUrl = `${META_BASE_URL}/${c.id}/insights?fields=spend,reach,clicks,ctr,cpm,actions&${dateParam}&access_token=${accessToken}`;
      const r = await fetch(insightsUrl);
      if (!r.ok) return null;
      const data = await r.json();
      const ins = data.data?.[0];
      if (!ins) return null;

      const actions = ins.actions || [];
      const leadAction = actions.find((a: any) =>
        a.action_type === 'lead' ||
        a.action_type === 'onsite_conversion.lead' ||
        a.action_type === 'offsite_conversion.fb_pixel_lead'
      );
      const messagesAction = actions.find((a: any) =>
        a.action_type === 'onsite_conversion.messaging_conversation_started_7d'
      );

      return {
        id: c.id,
        name: c.name,
        status: c.status,
        objective: c.objective,
        spend: parseFloat(ins.spend || '0'),
        reach: parseInt(ins.reach || '0'),
        clicks: parseInt(ins.clicks || '0'),
        ctr: parseFloat(ins.ctr || '0'),
        cpm: parseFloat(ins.cpm || '0'),
        leads: leadAction ? parseInt(leadAction.value || '0') : 0,
        messages: messagesAction ? parseInt(messagesAction.value || '0') : 0,
      };
    } catch (e) {
      console.error(`Insights error for campaign ${c.id}:`, e);
      return null;
    }
  });

  const results = await Promise.all(insightsPromises);
  return results.filter((c): c is CampaignInsight => c !== null);
}

async function sendWhatsAppMessage(params: {
  evolutionUrl: string;
  evolutionKey: string;
  instanceName: string;
  groupJid: string;
  text: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { evolutionUrl, evolutionKey, instanceName, groupJid, text } = params;
  try {
    const res = await fetch(`${evolutionUrl.replace(/\/+$/, '')}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: evolutionKey,
      },
      body: JSON.stringify({ number: groupJid, text }),
    });
    if (!res.ok) {
      return { ok: false, error: `Evolution API ${res.status}: ${await res.text()}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

async function findInstanceForGroup(supabase: any, groupJid: string): Promise<string | null> {
  // Procura em whatsapp_groups para descobrir qual instância tem este grupo
  const { data } = await supabase
    .from('whatsapp_groups')
    .select('instance_name')
    .eq('group_jid', groupJid)
    .limit(1)
    .maybeSingle();
  if (data?.instance_name) return data.instance_name;

  // Fallback: pega a primeira instância vinculada
  const { data: anyInstance } = await supabase
    .from('whatsapp_instances')
    .select('instance_name')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return anyInstance?.instance_name || null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const accessToken = Deno.env.get('META_ACCESS_TOKEN');
    const evolutionUrl = Deno.env.get('EVOLUTION_API_URL');
    const evolutionKey = Deno.env.get('EVOLUTION_API_KEY');

    if (!accessToken) throw new Error('META_ACCESS_TOKEN not configured');
    if (!evolutionUrl || !evolutionKey) throw new Error('Evolution API not configured');

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Body é opcional (cron envia { trigger: 'cron' })
    let body: any = {};
    try {
      const text = await req.text();
      if (text) body = JSON.parse(text);
    } catch {
      body = {};
    }

    const targetAccountId: string | undefined = body.account_id;
    const dryRun: boolean = body.dry_run === true;

    console.log('[send-campaign-reports] Trigger:', body.trigger || 'manual', 'targetAccount:', targetAccountId, 'dryRun:', dryRun);

    // 1. Buscar contas elegíveis
    let accountsQuery = supabase
      .from('accounts')
      .select('id, nome_cliente, meta_account_id, id_grupo, status, enviar_relatorio_meta')
      .eq('status', 'Ativo')
      .eq('enviar_relatorio_meta', true)
      .not('meta_account_id', 'is', null)
      .not('id_grupo', 'is', null);

    if (targetAccountId) {
      accountsQuery = accountsQuery.eq('id', targetAccountId);
    }

    const { data: accounts, error: accountsError } = await accountsQuery;
    if (accountsError) throw new Error(`Failed to load accounts: ${accountsError.message}`);

    if (!accounts || accounts.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No eligible accounts found',
        accounts_processed: 0,
        summaries: [],
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const dataDate = yesterdayInSaoPaulo();
    const dispatchDate = todayInSaoPaulo();
    const summaries: DispatchSummary[] = [];
    const previewMessages: Array<{ account: string; campaign: string; text: string }> = [];

    // 2. Processar cada conta SEQUENCIALMENTE
    for (const account of accounts) {
      const summary: DispatchSummary = {
        account_id: account.id,
        account_name: account.nome_cliente,
        campaigns_total: 0,
        campaigns_with_spend: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
        errors: [],
      };

      try {
        const campaigns = await fetchYesterdayCampaigns(account.meta_account_id!, accessToken, dataDate);
        summary.campaigns_total = campaigns.length;

        // Filtrar apenas campanhas COM gasto > 0 no dia anterior
        const eligible = campaigns.filter((c) => c.spend > 0);
        summary.campaigns_with_spend = eligible.length;

        if (eligible.length === 0) {
          console.log(`[${account.nome_cliente}] No campaigns with spend yesterday, skipping`);
          summaries.push(summary);
          continue;
        }

        const instanceName = await findInstanceForGroup(supabase, account.id_grupo!);
        if (!instanceName && !dryRun) {
          summary.errors.push('No WhatsApp instance available for this group');
          summary.failed = eligible.length;
          summaries.push(summary);
          continue;
        }

        // 3. Para cada campanha elegível: enviar mensagem com pausa
        for (const campaign of eligible) {
          // Idempotência: já foi disparada hoje?
          const { data: existing } = await supabase
            .from('campaign_report_dispatches')
            .select('id')
            .eq('account_id', account.id)
            .eq('campaign_id', campaign.id)
            .eq('dispatch_date', dispatchDate)
            .maybeSingle();

          if (existing && !dryRun) {
            console.log(`[${account.nome_cliente}] Campaign ${campaign.name} already dispatched today, skipping`);
            summary.skipped++;
            continue;
          }

          const messageText = buildMessage({
            accountName: account.nome_cliente,
            dataDate,
            campaign,
          });

          if (dryRun) {
            previewMessages.push({
              account: account.nome_cliente,
              campaign: campaign.name,
              text: messageText,
            });
            summary.sent++;
            continue;
          }

          // Enviar
          const sendResult = await sendWhatsAppMessage({
            evolutionUrl,
            evolutionKey,
            instanceName: instanceName!,
            groupJid: account.id_grupo!,
            text: messageText,
          });

          // Registrar log (sucesso ou falha)
          await supabase.from('campaign_report_dispatches').insert({
            account_id: account.id,
            campaign_id: campaign.id,
            campaign_name: campaign.name,
            dispatch_date: dispatchDate,
            data_date: dataDate,
            whatsapp_group_id: account.id_grupo,
            whatsapp_instance: instanceName,
            status: sendResult.ok ? 'sent' : 'failed',
            error_message: sendResult.error || null,
            spend: campaign.spend,
            leads: campaign.leads,
            messages: campaign.messages,
            reach: campaign.reach,
            clicks: campaign.clicks,
            ctr: campaign.ctr,
            cpm: campaign.cpm,
            message_text: messageText,
          });

          if (sendResult.ok) {
            summary.sent++;
            console.log(`[${account.nome_cliente}] Sent campaign ${campaign.name}`);
          } else {
            summary.failed++;
            summary.errors.push(`${campaign.name}: ${sendResult.error}`);
            console.error(`[${account.nome_cliente}] Failed campaign ${campaign.name}: ${sendResult.error}`);
          }

          // Pausa 3-5s aleatório entre mensagens
          const delay = Math.floor(Math.random() * 2000) + 3000;
          await sleep(delay);
        }
      } catch (e) {
        console.error(`[${account.nome_cliente}] Error processing account:`, e);
        summary.errors.push(e instanceof Error ? e.message : 'Unknown error');
      }

      summaries.push(summary);
    }

    return new Response(JSON.stringify({
      success: true,
      dry_run: dryRun,
      data_date: dataDate,
      dispatch_date: dispatchDate,
      accounts_processed: accounts.length,
      summaries,
      preview_messages: dryRun ? previewMessages : undefined,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (e) {
    console.error('[send-campaign-reports] Fatal:', e);
    return new Response(JSON.stringify({
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const evolutionUrl = Deno.env.get("EVOLUTION_API_URL")!.replace(/\/+$/, "");
  const evolutionKey = Deno.env.get("EVOLUTION_API_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const payload = await req.json();
    console.log("[whatsapp-webhook] Received:", JSON.stringify(payload).slice(0, 500));

    const event = payload.event;
    if (event !== "messages.upsert") {
      return new Response(JSON.stringify({ ignored: true, event }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = payload.data;
    if (!data) {
      return new Response(JSON.stringify({ ignored: true, reason: "no data" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const message = data.message;
    const key = data.key;
    const instanceName = payload.instance;

    if (!key || !message) {
      return new Response(JSON.stringify({ ignored: true, reason: "no key/message" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const remoteJid = key.remoteJid || "";
    const isGroup = remoteJid.endsWith("@g.us");
    if (!isGroup) {
      return new Response(JSON.stringify({ ignored: true, reason: "not a group" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (key.fromMe) {
      return new Response(JSON.stringify({ ignored: true, reason: "own message" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const text = (
      message.conversation ||
      message.extendedTextMessage?.text ||
      ""
    ).trim();

    if (!text || !text.startsWith("#")) {
      return new Response(JSON.stringify({ ignored: true, reason: "not a command" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const groupNumber = remoteJid.replace("@g.us", "");
    const possibleFormats = [groupNumber, `${groupNumber}-group`, remoteJid];

    let account: any = null;
    for (const fmt of possibleFormats) {
      const { data } = await supabase
        .from("accounts")
        .select("id, nome_cliente, meta_account_id, cliente_id")
        .eq("id_grupo", fmt)
        .single();
      if (data) {
        account = data;
        break;
      }
    }

    if (!account) {
      console.log("[whatsapp-webhook] No account linked to group:", groupNumber);
      return new Response(JSON.stringify({ ignored: true, reason: "no linked account" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const senderName = data.pushName || key.participant || "Desconhecido";

    return await processCommand(text, account, remoteJid, instanceName, evolutionUrl, evolutionKey, supabase, senderName);
  } catch (err) {
    console.error("[whatsapp-webhook] Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function processCommand(
  text: string,
  account: { id: string; nome_cliente: string; meta_account_id: string | null },
  groupJid: string,
  instanceName: string,
  evolutionUrl: string,
  evolutionKey: string,
  supabase: any,
  senderName: string
) {
  const cmd = text.toLowerCase().trim();
  let responseText = "";

  try {
    if (cmd.startsWith("#followup")) {
      responseText = await handleFollowup(text, account, groupJid, senderName, supabase);
    } else if (cmd.startsWith("#feedback")) {
      responseText = await handleFeedback(text, account, groupJid, senderName, supabase);
    } else if (cmd === "#saldo") {
      responseText = await handleSaldo(account, supabase);
    } else if (cmd.startsWith("#gasto")) {
      responseText = await handleGasto(text, account, supabase);
    } else if (cmd === "#funil") {
      responseText = await handleFunil(account, supabase);
    } else if (cmd === "#campanhas") {
      responseText = await handleCampanhas(account, supabase);
    } else if (cmd === "#relatorio") {
      // Send individual reports for each active campaign with delay
      return await handleRelatorioAll(account, groupJid, instanceName, evolutionUrl, evolutionKey, supabase);
    } else if (cmd.startsWith("#campanha")) {
      const num = parseInt(cmd.replace("#campanha", "").trim());
      responseText = await handleCampanhaDetail(account, num, supabase);
    } else if (cmd === "#leads") {
      responseText = await handleLeads(account, supabase);
    } else if (cmd.startsWith("#leads")) {
      const campaignRef = cmd.replace("#leads", "").trim();
      responseText = await handleLeadsCampaign(account, campaignRef, supabase);
    } else if (cmd === "#resumo") {
      responseText = await handleResumo(account, supabase);
    } else if (cmd === "#ajuda" || cmd === "#help") {
      responseText = getHelpText(account.nome_cliente);
    } else {
      responseText = `❓ Comando não reconhecido.\n\nDigite *#ajuda* para ver os comandos disponíveis.`;
    }
  } catch (err) {
    console.error("[whatsapp-webhook] Command error:", err);
    responseText = `⚠️ Erro ao processar comando. Tente novamente.`;
  }

  await sendEvolutionMessage(evolutionUrl, evolutionKey, instanceName, groupJid, responseText);

  return new Response(JSON.stringify({ success: true, command: cmd }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

// ─── Feedback Parser ───

function parseFeedbackText(text: string): {
  data_referencia: string | null;
  leads_gerados: number;
  conversa_iniciada: number;
  lead_qualificado: number;
  em_atendimento: number;
  perdido: number;
  visita: number;
  venda: number;
} {
  const result = {
    data_referencia: null as string | null,
    leads_gerados: 0,
    conversa_iniciada: 0,
    lead_qualificado: 0,
    em_atendimento: 0,
    perdido: 0,
    visita: 0,
    venda: 0,
  };

  // Extract date - formats: dd/mm, dd/mm/yyyy, dd/mm/yy
  const dateMatch = text.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (dateMatch) {
    const day = parseInt(dateMatch[1]);
    const month = parseInt(dateMatch[2]);
    const yearStr = dateMatch[3];
    const nowBRT = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    let year = nowBRT.getFullYear();
    if (yearStr) {
      year = yearStr.length === 2 ? 2000 + parseInt(yearStr) : parseInt(yearStr);
    }
    result.data_referencia = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const lower = text.toLowerCase();

  // Pattern: look for numbers near keywords
  // Split into lines for better parsing
  const lines = lower.split(/[\n,;.]+/);

  for (const line of lines) {
    const numbersInLine = line.match(/\d+/g);
    if (!numbersInLine) continue;

    for (const numStr of numbersInLine) {
      const num = parseInt(numStr);
      if (num > 9999) continue; // skip dates/IDs

      // Check context around the number
      if (matchKeyword(line, ["lead", "leads", "recebi", "recebemos", "gerado", "gerados", "geramos"])) {
        if (result.leads_gerados === 0) result.leads_gerados = num;
      }
      if (matchKeyword(line, ["conversa iniciada", "conversas iniciadas", "contato", "contatamos", "entramos em contato", "contato novamente"])) {
        if (result.conversa_iniciada === 0) result.conversa_iniciada = num;
      }
      if (matchKeyword(line, ["qualificou", "qualificaram", "qualificado", "qualificados", "qualifica"])) {
        if (result.lead_qualificado === 0) result.lead_qualificado = num;
      }
      if (matchKeyword(line, ["atendimento", "atendendo", "aguardando", "retorno", "em andamento"])) {
        if (result.em_atendimento === 0) result.em_atendimento = num;
      }
      if (matchKeyword(line, ["perdido", "perdidos", "não deu", "nao deu", "desistiu", "desistiram", "sem andamento", "não andamento", "nao andamento"])) {
        if (result.perdido === 0) result.perdido = num;
      }
      if (matchKeyword(line, ["visita", "visitas", "visitou", "visitaram", "agendada", "agendadas"])) {
        if (result.visita === 0) result.visita = num;
      }
      if (matchKeyword(line, ["venda", "vendas", "vendeu", "venderam", "fechou", "fecharam", "comprar", "comprou"])) {
        if (result.venda === 0) result.venda = num;
      }
    }
  }

  return result;
}

function matchKeyword(text: string, keywords: string[]): boolean {
  return keywords.some((kw) => text.includes(kw));
}

async function handleFeedback(
  text: string,
  account: any,
  groupJid: string,
  senderName: string,
  supabase: any
): Promise<string> {
  // Remove the #feedback prefix - keep the body (tipo_funil + campaigns)
  const feedbackBody = text.replace(/^#feedback\s*/i, "").trim();

  if (!feedbackBody || feedbackBody.length < 5) {
    return `⚠️ *Feedback vazio!*\n\nEnvie no formato:\n*#feedback*\nterceiros\n\nreferente à campanha REF47\nrecebidos 2\natendimento SDR 2\n\nDigite *#ajuda* para mais informações.`;
  }

  // Call the process-feedback edge function
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const response = await fetch(`${supabaseUrl}/functions/v1/process-feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        mensagem_original: text, // full message including #feedback
        account_id: account.id,
        id_grupo: groupJid,
        numero_grupo: groupJid,
        telefone_origem: null,
        nome_origem: senderName,
        usuario_origem: senderName,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      console.error("[whatsapp-webhook] process-feedback error:", result);
      return `⚠️ Erro ao processar feedback: ${result.error || "erro desconhecido"}`;
    }

    if (result.duplicado) {
      return `⚠️ Essa mensagem já foi processada anteriormente.`;
    }

    let msg = `✅ *Feedback registrado com sucesso!*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `👤 Enviado por: *${senderName}*\n`;
    msg += `🏢 Conta: *${account.nome_cliente}*\n`;
    msg += `📋 Tipo: *${result.tipo_funil === "terceiros" ? "Terceiros" : "Lançamento"}*\n\n`;
    msg += `📊 *${result.campanhas_count} campanha(s) registrada(s):*\n`;

    if (result.campanhas && Array.isArray(result.campanhas)) {
      for (const c of result.campanhas) {
        msg += `   • ${c.nome} — ${c.recebidos} recebidos\n`;
      }
    }

    msg += `\n💡 Use *#funil* para ver o funil consolidado.`;
    return msg;
  } catch (err) {
    console.error("[whatsapp-webhook] Feedback processing error:", err);
    return `⚠️ Erro ao processar feedback. Tente novamente.`;
  }
}

async function handleFunil(account: any, supabase: any): Promise<string> {
  // Get last 30 days of feedback
  const thirtyDaysAgo = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: feedbacks } = await supabase
    .from("feedback_funnel")
    .select("*")
    .eq("account_id", account.id)
    .gte("data_referencia", thirtyDaysAgo.toISOString().split("T")[0])
    .order("data_referencia", { ascending: false });

  if (!feedbacks || feedbacks.length === 0) {
    return `📊 *Funil - ${account.nome_cliente}*\n\nNenhum feedback registrado nos últimos 30 dias.\n\nEnvie *#feedback* seguido do relatório para registrar.`;
  }

  // Aggregate
  const totals = feedbacks.reduce(
    (acc: any, f: any) => ({
      leads_gerados: acc.leads_gerados + (f.leads_gerados || 0),
      conversa_iniciada: acc.conversa_iniciada + (f.conversa_iniciada || 0),
      lead_qualificado: acc.lead_qualificado + (f.lead_qualificado || 0),
      em_atendimento: acc.em_atendimento + (f.em_atendimento || 0),
      perdido: acc.perdido + (f.perdido || 0),
      visita: acc.visita + (f.visita || 0),
      venda: acc.venda + (f.venda || 0),
    }),
    { leads_gerados: 0, conversa_iniciada: 0, lead_qualificado: 0, em_atendimento: 0, perdido: 0, visita: 0, venda: 0 }
  );

  // Also get Meta leads for comparison
  let metaLeads = 0;
  if (account.meta_account_id) {
    const { data: campaigns } = await supabase
      .from("meta_campaigns")
      .select("leads")
      .eq("account_id", account.meta_account_id);
    if (campaigns) {
      metaLeads = campaigns.reduce((s: number, c: any) => s + (c.leads || 0), 0);
    }
  }

  const convRate = totals.leads_gerados > 0 ? ((totals.venda / totals.leads_gerados) * 100).toFixed(1) : "0";
  const qualRate = totals.leads_gerados > 0 ? ((totals.lead_qualificado / totals.leads_gerados) * 100).toFixed(1) : "0";

  let msg = `📊 *Funil de Vendas - ${account.nome_cliente}*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📅 Últimos 30 dias (${feedbacks.length} feedbacks)\n\n`;

  msg += `🔽 *FUNIL*\n`;
  msg += `┌─────────────────────────\n`;
  if (metaLeads > 0) {
    msg += `│ 📢 Leads Meta Ads: *${metaLeads}*\n`;
  }
  msg += `│ 👥 Leads Gerados: *${totals.leads_gerados}*\n`;
  msg += `│ 💬 Conversa Iniciada: *${totals.conversa_iniciada}*\n`;
  msg += `│ ✅ Qualificados: *${totals.lead_qualificado}* (${qualRate}%)\n`;
  msg += `│ 🔄 Em Atendimento: *${totals.em_atendimento}*\n`;
  msg += `│ ❌ Perdidos: *${totals.perdido}*\n`;
  msg += `│ 🏠 Visitas: *${totals.visita}*\n`;
  msg += `│ 🎉 Vendas: *${totals.venda}* (${convRate}%)\n`;
  msg += `└─────────────────────────\n`;

  // Last 5 feedbacks
  msg += `\n📋 *Últimos registros:*\n`;
  feedbacks.slice(0, 5).forEach((f: any) => {
    const date = formatDateBR(f.data_referencia);
    msg += `   ${date} - ${f.enviado_por}: 👥${f.leads_gerados} ✅${f.lead_qualificado} 🎉${f.venda}\n`;
  });

  return msg;
}

// ─── Existing Command Handlers ───

async function fetchMetaCampaignInsights(
  metaAccountId: string,
  accessToken: string
): Promise<any[]> {
  const formattedId = metaAccountId.startsWith('act_') ? metaAccountId : `act_${metaAccountId}`;
  const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const url = `https://graph.facebook.com/v21.0/${formattedId}/campaigns?fields=name,status,insights.time_range({"since":"${todayStr}","until":"${todayStr}"}){spend,impressions,reach,clicks,cpm,ctr,actions}&filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE","PAUSED"]}]&limit=50&access_token=${accessToken}`;

  const res = await fetch(url);
  if (!res.ok) {
    const errText = await res.text();
    console.error('[whatsapp-webhook] Meta campaigns API error:', errText.slice(0, 300));
    throw new Error('Erro ao consultar campanhas no Meta');
  }

  const result = await res.json();
  return result.data || [];
}

function buildCampaignReport(
  accountName: string,
  campaign: any,
  dateStr: string
): string {
  const insights = campaign.insights?.data?.[0];
  const spend = insights ? parseFloat(insights.spend || '0') : 0;
  const impressions = insights ? parseInt(insights.impressions || '0') : 0;
  const reach = insights ? parseInt(insights.reach || '0') : 0;
  const clicks = insights ? parseInt(insights.clicks || '0') : 0;
  const ctr = insights ? parseFloat(insights.ctr || '0') : 0;
  const cpm = insights ? parseFloat(insights.cpm || '0') : 0;

  // Extract leads from actions
  let leads = 0;
  let leadType = '';
  if (insights?.actions) {
    for (const action of insights.actions) {
      if (action.action_type === 'onsite_conversion.messaging_conversation_started_7d') {
        leads += parseInt(action.value || '0');
        leadType = 'Mensagens (WhatsApp)';
      } else if (action.action_type === 'lead') {
        leads += parseInt(action.value || '0');
        leadType = leadType || 'Formulário';
      }
    }
  }

  const fmtCurrency = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;
  const costPerLead = leads > 0 ? spend / leads : 0;

  let msg = `📊 *RELATÓRIO DE CAMPANHA*\n`;
  msg += `   Conta de Anúncio: ${accountName}\n`;
  msg += `📅 Data: ${dateStr}\n\n`;
  msg += `⚙️ *CAMPANHA:*\n`;
  msg += `   ${campaign.name}\n\n`;
  msg += `💲 *INVESTIMENTO & RESULTADOS:*\n`;
  msg += `  · Gasto: ${fmtCurrency(spend)}\n`;
  msg += `  · Mensagens: ${leads}\n`;
  msg += `  · Custo por Mensagens: ${fmtCurrency(costPerLead)}\n`;
  msg += `  · Alcance: ${reach.toLocaleString('pt-BR')}\n`;
  msg += `  · Cliques no link: ${clicks.toLocaleString('pt-BR')}\n`;
  msg += `  · CTR: ${ctr.toFixed(2)}%\n`;
  msg += `  · CPM: ${fmtCurrency(cpm)}`;

  if (leads > 0) {
    msg += `\n\n📊 *DETALHES DE CONVERSÃO:*\n`;
    msg += `  · ${leadType}: ${leads}\n\n`;
    msg += `❓ *Como está a qualificação desses leads?*`;
  }

  return msg;
}

async function handleCampanhas(account: any, supabase: any): Promise<string> {
  if (!account.meta_account_id) {
    return `⚠️ *${account.nome_cliente}*\nConta sem Meta Ads configurado.`;
  }

  const accessToken = Deno.env.get('META_ACCESS_TOKEN');
  if (!accessToken) {
    return `⚠️ Token do Meta não configurado.`;
  }

  try {
    const campaigns = await fetchMetaCampaignInsights(account.meta_account_id, accessToken);

    if (campaigns.length === 0) {
      return `📊 *${account.nome_cliente}*\n\nNenhuma campanha encontrada.`;
    }

    // Sort by spend descending
    campaigns.sort((a: any, b: any) => {
      const spendA = a.insights?.data?.[0] ? parseFloat(a.insights.data[0].spend || '0') : 0;
      const spendB = b.insights?.data?.[0] ? parseFloat(b.insights.data[0].spend || '0') : 0;
      return spendB - spendA;
    });

    const activeCampaigns = campaigns.filter((c: any) => c.status === 'ACTIVE');
    const fmtCurrency = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

    let msg = `📊 *Campanhas - ${account.nome_cliente}*\n\n`;
    msg += `✅ Ativas: ${activeCampaigns.length} | 📋 Total: ${campaigns.length}\n\n`;

    campaigns.forEach((c: any, i: number) => {
      const statusIcon = c.status === 'ACTIVE' ? '🟢' : '🔴';
      const insights = c.insights?.data?.[0];
      const spend = insights ? parseFloat(insights.spend || '0') : 0;

      let leads = 0;
      if (insights?.actions) {
        for (const action of insights.actions) {
          if (action.action_type === 'lead' || action.action_type === 'onsite_conversion.messaging_conversation_started_7d') {
            leads += parseInt(action.value || '0');
          }
        }
      }

      const cpl = leads > 0 ? fmtCurrency(spend / leads) : 'N/A';
      msg += `${statusIcon} *${i + 1}.* ${c.name}\n`;
      msg += `   💰 ${fmtCurrency(spend)} | 👥 ${leads} leads | CPL: ${cpl}\n\n`;
    });

    msg += `💡 *#campanha{N}* — Relatório detalhado\n`;
    msg += `💡 *#relatorio* — Relatório de todas`;

    return msg;
  } catch (err) {
    console.error('[whatsapp-webhook] #campanhas error:', err);
    return `⚠️ Erro ao consultar campanhas. Tente novamente.`;
  }
}

async function handleCampanhaDetail(account: any, num: number, supabase: any): Promise<string> {
  if (!account.meta_account_id) {
    return `⚠️ *${account.nome_cliente}*\nConta sem Meta Ads configurado.`;
  }

  const accessToken = Deno.env.get('META_ACCESS_TOKEN');
  if (!accessToken) {
    return `⚠️ Token do Meta não configurado.`;
  }

  try {
    const campaigns = await fetchMetaCampaignInsights(account.meta_account_id, accessToken);

    if (campaigns.length === 0) {
      return `📊 *${account.nome_cliente}*\n\nNenhuma campanha encontrada.`;
    }

    // Sort by spend descending (same order as #campanhas)
    campaigns.sort((a: any, b: any) => {
      const spendA = a.insights?.data?.[0] ? parseFloat(a.insights.data[0].spend || '0') : 0;
      const spendB = b.insights?.data?.[0] ? parseFloat(b.insights.data[0].spend || '0') : 0;
      return spendB - spendA;
    });

    if (isNaN(num) || num < 1 || num > campaigns.length) {
      return `⚠️ Campanha #${num} não encontrada.\n\nUse *#campanhas* para ver a lista (1 a ${campaigns.length}).`;
    }

    const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

    return buildCampaignReport(account.nome_cliente, campaigns[num - 1], dateStr);
  } catch (err) {
    console.error('[whatsapp-webhook] #campanha detail error:', err);
    return `⚠️ Erro ao consultar campanha. Tente novamente.`;
  }
}

async function handleRelatorioAll(
  account: any,
  groupJid: string,
  instanceName: string,
  evolutionUrl: string,
  evolutionKey: string,
  supabase: any
): Promise<Response> {
  if (!account.meta_account_id) {
    const msg = `⚠️ *${account.nome_cliente}*\nConta sem Meta Ads configurado.`;
    await sendEvolutionMessage(evolutionUrl, evolutionKey, instanceName, groupJid, msg);
    return new Response(JSON.stringify({ success: true, command: '#relatorio' }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  const accessToken = Deno.env.get('META_ACCESS_TOKEN');
  if (!accessToken) {
    const msg = `⚠️ Token do Meta não configurado.`;
    await sendEvolutionMessage(evolutionUrl, evolutionKey, instanceName, groupJid, msg);
    return new Response(JSON.stringify({ success: true, command: '#relatorio' }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  try {
    const campaigns = await fetchMetaCampaignInsights(account.meta_account_id, accessToken);

    // Only active campaigns with spend
    const activeCampaigns = campaigns.filter((c: any) => {
      if (c.status !== 'ACTIVE') return false;
      const spend = c.insights?.data?.[0] ? parseFloat(c.insights.data[0].spend || '0') : 0;
      return spend > 0;
    });

    if (activeCampaigns.length === 0) {
      const msg = `📊 *${account.nome_cliente}*\n\nNenhuma campanha ativa com gasto hoje.`;
      await sendEvolutionMessage(evolutionUrl, evolutionKey, instanceName, groupJid, msg);
      return new Response(JSON.stringify({ success: true, command: '#relatorio' }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

    // Send header message
    await sendEvolutionMessage(
      evolutionUrl, evolutionKey, instanceName, groupJid,
      `📊 *Relatório de Campanhas - ${account.nome_cliente}*\n\n📅 ${dateStr}\n✅ ${activeCampaigns.length} campanha(s) ativa(s) com gasto\n\n_Enviando relatórios individuais..._`
    );

    // Send each campaign report with delay
    for (let i = 0; i < activeCampaigns.length; i++) {
      await new Promise(r => setTimeout(r, 2000)); // 2s delay between messages
      const report = buildCampaignReport(account.nome_cliente, activeCampaigns[i], dateStr);
      await sendEvolutionMessage(evolutionUrl, evolutionKey, instanceName, groupJid, report);
    }
  } catch (err) {
    console.error('[whatsapp-webhook] #relatorio error:', err);
    await sendEvolutionMessage(
      evolutionUrl, evolutionKey, instanceName, groupJid,
      `⚠️ Erro ao gerar relatório. Tente novamente.`
    );
  }

  return new Response(JSON.stringify({ success: true, command: '#relatorio' }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

async function handleLeads(account: any, supabase: any): Promise<string> {
  const { data: campaigns } = await supabase
    .from("meta_campaigns")
    .select("campaign_name, status, leads, spend, cpl")
    .eq("account_id", account.meta_account_id)
    .order("leads", { ascending: false });

  if (!campaigns || campaigns.length === 0) {
    return `👥 *Leads - ${account.nome_cliente}*\n\nNenhum dado disponível.`;
  }

  const totalLeads = campaigns.reduce((sum: number, c: any) => sum + (c.leads || 0), 0);
  const totalSpend = campaigns.reduce((sum: number, c: any) => sum + (c.spend || 0), 0);
  const avgCpl = totalLeads > 0 ? totalSpend / totalLeads : 0;

  let msg = `👥 *Leads - ${account.nome_cliente}*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📊 Total de leads: *${totalLeads}*\n`;
  msg += `💰 Investimento total: *${formatCurrency(totalSpend)}*\n`;
  msg += `📉 CPL médio: *${formatCurrency(avgCpl)}*\n\n`;

  msg += `📋 *Por campanha:*\n`;
  campaigns.filter((c: any) => (c.leads || 0) > 0).forEach((c: any) => {
    const statusIcon = c.status === "ACTIVE" ? "🟢" : "🔴";
    msg += `${statusIcon} ${c.campaign_name}\n`;
    msg += `   👥 ${c.leads} leads | CPL: ${c.cpl ? formatCurrency(c.cpl) : "N/A"}\n`;
  });

  return msg;
}

async function handleLeadsCampaign(account: any, ref: string, supabase: any): Promise<string> {
  const num = parseInt(ref);

  const { data: campaigns } = await supabase
    .from("meta_campaigns")
    .select("id, campaign_name, leads, spend, cpl, status")
    .eq("account_id", account.meta_account_id)
    .order("spend", { ascending: false });

  if (!campaigns || campaigns.length === 0) {
    return `👥 Nenhuma campanha encontrada para *${account.nome_cliente}*.`;
  }

  let campaign: any = null;
  if (!isNaN(num) && num >= 1 && num <= campaigns.length) {
    campaign = campaigns[num - 1];
  } else {
    campaign = campaigns.find((c: any) =>
      c.campaign_name.toLowerCase().includes(ref.toLowerCase())
    );
  }

  if (!campaign) {
    return `⚠️ Campanha "${ref}" não encontrada. Use *#campanhas* para ver a lista.`;
  }

  const { data: insights } = await supabase
    .from("campaign_insights")
    .select("date, leads, spend")
    .eq("campaign_id", campaign.id)
    .order("date", { ascending: false })
    .limit(14);

  let msg = `👥 *Leads - ${campaign.campaign_name}*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📊 Total: *${campaign.leads || 0}* leads\n`;
  msg += `💰 Gasto: *${formatCurrency(campaign.spend || 0)}*\n`;
  msg += `📉 CPL: *${campaign.cpl ? formatCurrency(campaign.cpl) : "N/A"}*\n`;

  if (insights && insights.length > 0) {
    msg += `\n📅 *Histórico diário:*\n`;
    insights.reverse().forEach((d: any) => {
      const date = new Date(d.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      msg += `   ${date}: 👥 ${d.leads || 0} leads | 💰 ${formatCurrency(d.spend || 0)}\n`;
    });
  }

  return msg;
}

async function handleResumo(account: any, supabase: any): Promise<string> {
  const { data: campaigns } = await supabase
    .from("meta_campaigns")
    .select("status, spend, leads, impressions, clicks, cpl")
    .eq("account_id", account.meta_account_id);

  if (!campaigns || campaigns.length === 0) {
    return `📊 *Resumo - ${account.nome_cliente}*\n\nNenhum dado disponível.`;
  }

  const active = campaigns.filter((c: any) => c.status === "ACTIVE");
  const totalSpend = campaigns.reduce((s: number, c: any) => s + (c.spend || 0), 0);
  const totalLeads = campaigns.reduce((s: number, c: any) => s + (c.leads || 0), 0);
  const totalImpressions = campaigns.reduce((s: number, c: any) => s + (c.impressions || 0), 0);
  const totalClicks = campaigns.reduce((s: number, c: any) => s + (c.clicks || 0), 0);
  const avgCpl = totalLeads > 0 ? totalSpend / totalLeads : 0;
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions * 100) : 0;

  let msg = `📊 *Resumo Geral - ${account.nome_cliente}*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `✅ Campanhas ativas: *${active.length}*\n`;
  msg += `📋 Total de campanhas: *${campaigns.length}*\n\n`;
  msg += `💰 Investimento: *${formatCurrency(totalSpend)}*\n`;
  msg += `👥 Leads: *${totalLeads}*\n`;
  msg += `📉 CPL médio: *${formatCurrency(avgCpl)}*\n`;
  msg += `👁️ Impressões: *${formatNumber(totalImpressions)}*\n`;
  msg += `👆 Cliques: *${formatNumber(totalClicks)}*\n`;
  msg += `📊 CTR médio: *${avgCtr.toFixed(2)}%*\n`;

  return msg;
}

function getHelpText(clientName: string): string {
  return `🤖 *Comandos - ${clientName}*\n\n` +
    `💰 *#saldo* — Saldo em tempo real\n` +
    `💸 *#gasto* — Investimento por período\n` +
    `   Ex: #gasto 7, #gasto 30, #gasto março\n\n` +
    `📊 *#campanhas* — Lista campanhas\n` +
    `📋 *#campanha{N}* — Relatório da campanha N\n` +
    `📑 *#relatorio* — Relatório de todas as campanhas\n\n` +
    `👥 *#leads* — Resumo de leads\n` +
    `👥 *#leads{N}* — Leads da campanha N\n\n` +
    `📊 *#resumo* — Resumo geral\n` +
    `📝 *#feedback* — Registrar feedback\n` +
    `📊 *#funil* — Funil consolidado\n` +
    `🔄 *#followup* — Registrar follow-up\n\n` +
    `❓ *#ajuda* — Esta mensagem`;
}

// ─── Saldo Handler ───

async function handleSaldo(
  account: { id: string; nome_cliente: string; meta_account_id: string | null },
  supabase: any
): Promise<string> {
  if (!account.meta_account_id) {
    return `⚠️ *${account.nome_cliente}*\nConta sem Meta Ads configurado.`;
  }

  const accessToken = Deno.env.get('META_ACCESS_TOKEN');
  if (!accessToken) {
    return `⚠️ Token do Meta não configurado. Contate o administrador.`;
  }

  const formattedId = account.meta_account_id.startsWith('act_')
    ? account.meta_account_id
    : `act_${account.meta_account_id}`;

  try {
    const url = `https://graph.facebook.com/v21.0/${formattedId}?fields=balance,spend_cap,funding_source_details,is_prepay_account,currency&access_token=${accessToken}`;
    const res = await fetch(url);

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[whatsapp-webhook] #saldo Meta API error for ${account.nome_cliente}:`, errText.slice(0, 300));
      return `⚠️ Erro ao consultar saldo. Tente novamente.`;
    }

    const data = await res.json();

    const isPrepay = data.is_prepay_account === true;
    const fundingType = data.funding_source_details?.type;
    const displayString = data.funding_source_details?.display_string || '';
    const isCardAccount = fundingType === 1 || fundingType === 2;

    let fundsAmount: number | null = null;
    const balanceMatch = displayString.match(/R\$\s?([\d.,]+)/);
    if (balanceMatch) {
      fundsAmount = parseFloat(balanceMatch[1].replace(/\./g, '').replace(',', '.'));
    }

    const balanceRaw = parseFloat(data.balance || '0') / 100;
    const spendCap = data.spend_cap ? parseFloat(data.spend_cap) / 100 : null;

    const fmtCurrency = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

    let msg = `💰 *Saldo - ${account.nome_cliente}*\n\n`;

    if (fundsAmount !== null && fundsAmount > 0) {
      msg += `💰 Fundos: *${fmtCurrency(fundsAmount)}*\n`;
      if (isCardAccount && balanceRaw > 0) {
        msg += `💳 Devedor: *${fmtCurrency(balanceRaw)}*\n`;
      }
    } else if (isPrepay) {
      msg += `💰 Pré-pago: *${fmtCurrency(balanceRaw)}*\n`;
    } else if (isCardAccount) {
      msg += `💳 Devedor: *${fmtCurrency(balanceRaw)}*\n`;
      msg += `📋 ${displayString}\n`;
      msg += `_Cartão - cobrado automaticamente_\n`;
    } else {
      msg += `💰 Saldo: *${fmtCurrency(balanceRaw)}*\n`;
    }

    if (spendCap && spendCap > 0) {
      msg += `🔒 Limite: *${fmtCurrency(spendCap)}*\n`;
    }

    // Estimation
    const { data: accData } = await supabase
      .from('accounts')
      .select('media_gasto_diario')
      .eq('id', account.id)
      .single();

    if (accData?.media_gasto_diario && accData.media_gasto_diario > 0) {
      const saldoAtual = fundsAmount ?? (isPrepay ? balanceRaw : null);
      if (saldoAtual !== null && saldoAtual > 0) {
        const diasEstimados = Math.floor(saldoAtual / accData.media_gasto_diario);
        msg += `⏳ ~${diasEstimados} dia(s) restante(s)\n`;
      }
    }

    msg += `\n🕐 _Tempo real_`;

    return msg;
  } catch (err) {
    console.error(`[whatsapp-webhook] #saldo error:`, err);
    return `⚠️ Erro ao consultar saldo. Tente novamente.`;
  }
}

// ─── Gasto Handler ───

async function handleGasto(
  text: string,
  account: { id: string; nome_cliente: string; meta_account_id: string | null },
  supabase: any
): Promise<string> {
  if (!account.meta_account_id) {
    return `⚠️ *${account.nome_cliente}*\nConta sem Meta Ads configurado.`;
  }

  const accessToken = Deno.env.get('META_ACCESS_TOKEN');
  if (!accessToken) {
    return `⚠️ Token do Meta não configurado.`;
  }

  const formattedId = account.meta_account_id.startsWith('act_')
    ? account.meta_account_id
    : `act_${account.meta_account_id}`;

  const arg = text.toLowerCase().replace('#gasto', '').trim();

  let since: string;
  let until: string;
  let periodLabel: string;

  // Usar horário de Brasília
  const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const monthNames: Record<string, number> = {
    janeiro: 0, fevereiro: 1, 'março': 2, marco: 2, abril: 3, maio: 4, junho: 5,
    julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11,
  };

  const monthLabels = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  const monthMatch = arg.match(/^(janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s*(?:de\s*)?(\d{4})?$/i);
  const rangeMatch = arg.match(/^(\d{1,2}\/\d{1,2}\/\d{4})\s*(?:a|ate|até)\s*(\d{1,2}\/\d{1,2}\/\d{4})$/i);
  const daysMatch = arg.match(/^(\d+)$/);

  if (monthMatch) {
    const mName = monthMatch[1].toLowerCase().replace('ç', 'c');
    const monthIdx = monthNames[mName] ?? monthNames[monthMatch[1].toLowerCase()];
    if (monthIdx === undefined) {
      return `⚠️ Mês não reconhecido.`;
    }
    const year = monthMatch[2] ? parseInt(monthMatch[2]) : (monthIdx <= today.getMonth() ? today.getFullYear() : today.getFullYear() - 1);
    const start = new Date(year, monthIdx, 1);
    const end = new Date(year, monthIdx + 1, 0);
    if (end > today) end.setTime(today.getTime());
    since = fmt(start);
    until = fmt(end);
    periodLabel = `${monthLabels[monthIdx]}/${year}`;
  } else if (rangeMatch) {
    const parseDate = (s: string) => {
      const [d, m, y] = s.split('/').map(Number);
      return new Date(y, m - 1, d);
    };
    const start = parseDate(rangeMatch[1]);
    const end = parseDate(rangeMatch[2]);
    since = fmt(start);
    until = fmt(end);
    periodLabel = `${rangeMatch[1]} a ${rangeMatch[2]}`;
  } else if (daysMatch) {
    const days = parseInt(daysMatch[1]);
    const start = new Date(today);
    start.setDate(start.getDate() - days + 1);
    since = fmt(start);
    until = fmt(today);
    periodLabel = `Últimos ${days} dias`;
  } else if (!arg) {
    const start = new Date(today);
    start.setDate(start.getDate() - 29);
    since = fmt(start);
    until = fmt(today);
    periodLabel = `Últimos 30 dias`;
  } else {
    return `💸 *Como usar #gasto:*\n\n` +
      `▸ *#gasto* — Últimos 30 dias\n` +
      `▸ *#gasto 7* — Últimos 7 dias\n` +
      `▸ *#gasto 15* — Últimos 15 dias\n` +
      `▸ *#gasto março* — Mês de março\n` +
      `▸ *#gasto janeiro 2025* — Jan/2025\n` +
      `▸ *#gasto 01/03/2025 a 15/03/2025*`;
  }

  try {
    const url = `https://graph.facebook.com/v21.0/${formattedId}/insights?fields=spend,impressions,clicks,actions&time_range={"since":"${since}","until":"${until}"}&access_token=${accessToken}`;
    const res = await fetch(url);

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[whatsapp-webhook] #gasto Meta API error:`, errText.slice(0, 300));
      return `⚠️ Erro ao consultar gastos. Tente novamente.`;
    }

    const result = await res.json();
    const insights = result.data?.[0];

    if (!insights) {
      return `💸 *Investimento - ${account.nome_cliente}*\n\n📅 ${periodLabel}\n\nSem dados neste período.`;
    }

    const spend = parseFloat(insights.spend || '0');
    const impressions = parseInt(insights.impressions || '0');
    const clicks = parseInt(insights.clicks || '0');
    const ctr = impressions > 0 ? (clicks / impressions * 100) : 0;

    let leads = 0;
    if (insights.actions) {
      for (const action of insights.actions) {
        if (action.action_type === 'lead' || action.action_type === 'onsite_conversion.messaging_conversation_started_7d') {
          leads += parseInt(action.value || '0');
        }
      }
    }

    const fmtCurrency = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;
    const cpl = leads > 0 ? spend / leads : 0;

    let msg = `💸 *Investimento - ${account.nome_cliente}*\n\n`;
    msg += `📅 ${periodLabel}\n\n`;
    msg += `💰 Investido: *${fmtCurrency(spend)}*\n`;
    msg += `👀 Impressões: *${impressions.toLocaleString('pt-BR')}*\n`;
    msg += `🖱️ Cliques: *${clicks.toLocaleString('pt-BR')}*\n`;
    msg += `📊 CTR: *${ctr.toFixed(2)}%*\n`;

    if (leads > 0) {
      msg += `👥 Leads: *${leads}*\n`;
      msg += `💵 CPL: *${fmtCurrency(cpl)}*\n`;
    }

    msg += `\n🕐 _Tempo real_`;

    return msg;
  } catch (err) {
    console.error(`[whatsapp-webhook] #gasto error:`, err);
    return `⚠️ Erro ao consultar gastos. Tente novamente.`;
  }
}


// ─── Helpers ───

function formatCurrency(value: number): string {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatNumber(value: number): string {
  return value.toLocaleString("pt-BR");
}

function formatDateBR(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

// ─── Follow-up Handler (isolated module) ───

async function handleFollowup(
  text: string,
  account: any,
  groupJid: string,
  senderName: string,
  supabase: any
): Promise<string> {
  const followupBody = text.replace(/^#followup\s*/i, "").trim();

  if (!followupBody || followupBody.length < 5) {
    return `⚠️ *Follow-up vazio!*\n\nEnvie no formato:\n*#followup* João ligou, quer visitar apt 3Q no sábado\n\nDigite *#ajuda* para mais informações.`;
  }

  const groupNumber = groupJid.replace("@g.us", "");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const response = await fetch(`${supabaseUrl}/functions/v1/process-followup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        mensagem_original: followupBody,
        account_id: account.id,
        cliente_id: account.cliente_id || null,
        id_grupo: account.id_grupo || groupNumber,
        numero_grupo: groupNumber,
        telefone_origem: null,
        nome_origem: senderName,
        usuario_origem: senderName,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("[whatsapp-webhook] Follow-up process error:", result);
      return `⚠️ Erro ao processar follow-up. Tente novamente.`;
    }

    if (result.duplicado) {
      return `⚠️ *Follow-up duplicado!*\n\nEssa mensagem já foi registrada anteriormente.`;
    }

    const dados = result.dados || {};

    let msg = `✅ *Follow-up registrado!*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `👤 Enviado por: *${senderName}*\n`;
    msg += `🏢 Conta: *${account.nome_cliente}*\n\n`;

    if (dados.lead_nome) msg += `👤 Lead: *${dados.lead_nome}*\n`;
    if (dados.etapa_funil) msg += `📊 Etapa: *${dados.etapa_funil.replace(/_/g, " ")}*\n`;
    if (dados.status_lead) msg += `📋 Status: *${dados.status_lead.replace(/_/g, " ")}*\n`;
    if (dados.temperatura_lead) msg += `🌡️ Temperatura: *${dados.temperatura_lead}*\n`;
    if (dados.resumo) msg += `\n📝 *Resumo:* ${dados.resumo}\n`;
    if (dados.proxima_acao) msg += `➡️ *Próxima ação:* ${dados.proxima_acao}\n`;
    if (dados.data_proxima_acao) msg += `📅 *Data:* ${dados.data_proxima_acao}\n`;

    if (dados.confianca) {
      const conf = Math.round(dados.confianca * 100);
      msg += `\n🎯 Confiança da IA: ${conf}%\n`;
    }

    return msg;
  } catch (err) {
    console.error("[whatsapp-webhook] Follow-up error:", err);
    return `⚠️ Erro ao processar follow-up. Tente novamente.`;
  }
}

async function sendEvolutionMessage(baseUrl: string, apiKey: string, instanceName: string, groupJid: string, text: string) {
  const url = `${baseUrl}/message/sendText/${instanceName}`;
  console.log("[whatsapp-webhook] Sending to:", groupJid, "via", instanceName);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: apiKey,
    },
    body: JSON.stringify({ number: groupJid, text }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[whatsapp-webhook] Send error:", errText);
    throw new Error(`Failed to send: ${res.status}`);
  }

  return await res.json();
}

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
    } else if (cmd === "#funil") {
      responseText = await handleFunil(account, supabase);
    } else if (cmd === "#campanhas") {
      responseText = await handleCampanhas(account, supabase);
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
    let year = new Date().getFullYear();
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
  // Remove the #feedback prefix
  const feedbackBody = text.replace(/^#feedback\s*/i, "").trim();

  if (!feedbackBody || feedbackBody.length < 5) {
    return `⚠️ *Feedback vazio!*\n\nEnvie no formato:\n*#feedback*\nLEADS DE 09/04\nRecebi 21 leads, 9 Qualificaram...\n\nDigite *#ajuda* para mais informações.`;
  }

  const parsed = parseFeedbackText(feedbackBody);

  // Default date to today if not found
  const dataRef = parsed.data_referencia || new Date().toISOString().split("T")[0];

  const { error } = await supabase.from("feedback_funnel").insert({
    account_id: account.id,
    data_referencia: dataRef,
    leads_gerados: parsed.leads_gerados,
    conversa_iniciada: parsed.conversa_iniciada,
    lead_qualificado: parsed.lead_qualificado,
    em_atendimento: parsed.em_atendimento,
    perdido: parsed.perdido,
    visita: parsed.visita,
    venda: parsed.venda,
    mensagem_original: feedbackBody,
    enviado_por: senderName,
    grupo_jid: groupJid,
  });

  if (error) {
    console.error("[whatsapp-webhook] Feedback insert error:", error);
    return `⚠️ Erro ao salvar feedback. Tente novamente.`;
  }

  let msg = `✅ *Feedback registrado com sucesso!*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📅 Data: *${formatDateBR(dataRef)}*\n`;
  msg += `👤 Enviado por: *${senderName}*\n`;
  msg += `🏢 Conta: *${account.nome_cliente}*\n\n`;
  msg += `📊 *Dados capturados:*\n`;
  if (parsed.leads_gerados > 0) msg += `   👥 Leads gerados: *${parsed.leads_gerados}*\n`;
  if (parsed.conversa_iniciada > 0) msg += `   💬 Conversa iniciada: *${parsed.conversa_iniciada}*\n`;
  if (parsed.lead_qualificado > 0) msg += `   ✅ Qualificados: *${parsed.lead_qualificado}*\n`;
  if (parsed.em_atendimento > 0) msg += `   🔄 Em atendimento: *${parsed.em_atendimento}*\n`;
  if (parsed.perdido > 0) msg += `   ❌ Perdidos: *${parsed.perdido}*\n`;
  if (parsed.visita > 0) msg += `   🏠 Visitas: *${parsed.visita}*\n`;
  if (parsed.venda > 0) msg += `   🎉 Vendas: *${parsed.venda}*\n`;

  msg += `\n💡 Use *#funil* para ver o funil consolidado.`;

  return msg;
}

async function handleFunil(account: any, supabase: any): Promise<string> {
  // Get last 30 days of feedback
  const thirtyDaysAgo = new Date();
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

async function handleCampanhas(account: any, supabase: any): Promise<string> {
  const { data: campaigns } = await supabase
    .from("meta_campaigns")
    .select("campaign_name, status, spend, leads, impressions, clicks, cpl")
    .eq("account_id", account.meta_account_id)
    .order("spend", { ascending: false });

  if (!campaigns || campaigns.length === 0) {
    return `📊 *${account.nome_cliente}*\n\nNenhuma campanha encontrada.`;
  }

  const activeCampaigns = campaigns.filter((c: any) => c.status === "ACTIVE");

  let msg = `📊 *Campanhas - ${account.nome_cliente}*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `✅ Ativas: ${activeCampaigns.length} | 📋 Total: ${campaigns.length}\n\n`;

  campaigns.forEach((c: any, i: number) => {
    const statusIcon = c.status === "ACTIVE" ? "🟢" : "🔴";
    const spend = formatCurrency(c.spend || 0);
    const leads = c.leads || 0;
    const cpl = c.cpl ? formatCurrency(c.cpl) : "N/A";
    msg += `${statusIcon} *${i + 1}.* ${c.campaign_name}\n`;
    msg += `   💰 Gasto: ${spend} | 👥 Leads: ${leads} | CPL: ${cpl}\n\n`;
  });

  msg += `\n💡 Use *#campanha{número}* para ver detalhes`;
  return msg;
}

async function handleCampanhaDetail(account: any, num: number, supabase: any): Promise<string> {
  const { data: campaigns } = await supabase
    .from("meta_campaigns")
    .select("*")
    .eq("account_id", account.meta_account_id)
    .order("spend", { ascending: false });

  if (!campaigns || campaigns.length === 0) {
    return `📊 *${account.nome_cliente}*\n\nNenhuma campanha encontrada.`;
  }

  if (isNaN(num) || num < 1 || num > campaigns.length) {
    return `⚠️ Campanha #${num} não encontrada.\n\nUse *#campanhas* para ver a lista (1 a ${campaigns.length}).`;
  }

  const c = campaigns[num - 1];
  const statusIcon = c.status === "ACTIVE" ? "🟢 Ativa" : "🔴 Pausada";

  let msg = `📋 *Detalhes da Campanha #${num}*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📌 *${c.campaign_name}*\n`;
  msg += `📊 Status: ${statusIcon}\n`;
  msg += `🎯 Objetivo: ${c.objective || "N/A"}\n\n`;
  msg += `💰 *Investimento*\n`;
  msg += `   Gasto total: ${formatCurrency(c.spend || 0)}\n`;
  msg += `   Orçamento diário: ${c.daily_budget ? formatCurrency(c.daily_budget) : "N/A"}\n\n`;
  msg += `📈 *Desempenho*\n`;
  msg += `   👁️ Impressões: ${formatNumber(c.impressions || 0)}\n`;
  msg += `   👆 Cliques: ${formatNumber(c.clicks || 0)}\n`;
  msg += `   📊 CTR: ${c.ctr ? (c.ctr).toFixed(2) + "%" : "N/A"}\n`;
  msg += `   💵 CPC: ${c.cpc ? formatCurrency(c.cpc) : "N/A"}\n\n`;
  msg += `👥 *Leads*\n`;
  msg += `   Total: ${c.leads || 0}\n`;
  msg += `   CPL: ${c.cpl ? formatCurrency(c.cpl) : "N/A"}\n`;

  const { data: insights } = await supabase
    .from("campaign_insights")
    .select("date, spend, leads, clicks, impressions")
    .eq("campaign_id", c.id)
    .order("date", { ascending: false })
    .limit(7);

  if (insights && insights.length > 0) {
    msg += `\n📅 *Últimos ${insights.length} dias*\n`;
    insights.reverse().forEach((d: any) => {
      const date = new Date(d.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      msg += `   ${date}: 💰${formatCurrency(d.spend || 0)} | 👥${d.leads || 0} leads | 👆${d.clicks || 0} cliques\n`;
    });
  }

  return msg;
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
  return `🤖 *Comandos disponíveis - ${clientName}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `📊 *#campanhas* — Lista todas as campanhas\n` +
    `📋 *#campanha{N}* — Detalhes da campanha N\n` +
    `   Ex: #campanha1, #campanha2\n\n` +
    `👥 *#leads* — Resumo de leads por campanha\n` +
    `👥 *#leads{N}* — Leads detalhados da campanha N\n\n` +
    `📊 *#resumo* — Resumo geral da conta\n\n` +
    `📝 *#feedback* — Registrar feedback do funil\n` +
    `   Ex: #feedback\n` +
    `   LEADS DE 09/04\n` +
    `   Recebi 21 leads, 9 Qualificaram...\n\n` +
    `📊 *#funil* — Ver funil consolidado (30 dias)\n\n` +
    `🔄 *#followup* — Registrar follow-up de lead\n` +
    `   Ex: #followup João ligou, quer visitar apt 3Q\n\n` +
    `❓ *#ajuda* — Mostra esta mensagem\n`;
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

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

    // Evolution API sends different event types
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

    // Extract message info
    const message = data.message;
    const key = data.key;
    const instanceName = payload.instance;

    if (!key || !message) {
      return new Response(JSON.stringify({ ignored: true, reason: "no key/message" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only process group messages
    const remoteJid = key.remoteJid || "";
    const isGroup = remoteJid.endsWith("@g.us");
    if (!isGroup) {
      return new Response(JSON.stringify({ ignored: true, reason: "not a group" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Don't respond to our own messages
    if (key.fromMe) {
      return new Response(JSON.stringify({ ignored: true, reason: "own message" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract text content
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

    // Normalize the group JID (remove @g.us suffix for matching)
    const groupJidClean = remoteJid.replace("@g.us", "");

    // Find account linked to this group
    const { data: account, error: accErr } = await supabase
      .from("accounts")
      .select("id, nome_cliente, meta_account_id")
      .eq("id_grupo", groupJidClean)
      .single();

    if (accErr || !account) {
      // Also try with full JID format
      const { data: account2 } = await supabase
        .from("accounts")
        .select("id, nome_cliente, meta_account_id")
        .eq("id_grupo", remoteJid)
        .single();

      if (!account2) {
        console.log("[whatsapp-webhook] No account linked to group:", groupJidClean);
        return new Response(JSON.stringify({ ignored: true, reason: "no linked account" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Use account2
      return await processCommand(text, account2, remoteJid, instanceName, evolutionUrl, evolutionKey, supabase);
    }

    return await processCommand(text, account, remoteJid, instanceName, evolutionUrl, evolutionKey, supabase);
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
  supabase: any
) {
  const cmd = text.toLowerCase().trim();
  let responseText = "";

  try {
    if (cmd === "#campanhas") {
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

  // Send response via Evolution API
  await sendEvolutionMessage(evolutionUrl, evolutionKey, instanceName, groupJid, responseText);

  return new Response(JSON.stringify({ success: true, command: cmd }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

// ─── Command Handlers ───

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
  const allCampaigns = campaigns;

  let msg = `📊 *Campanhas - ${account.nome_cliente}*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `✅ Ativas: ${activeCampaigns.length} | 📋 Total: ${allCampaigns.length}\n\n`;

  allCampaigns.forEach((c: any, i: number) => {
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

  // Get recent daily data
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
  campaigns.filter((c: any) => (c.leads || 0) > 0).forEach((c: any, i: number) => {
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
    // Search by name
    campaign = campaigns.find((c: any) =>
      c.campaign_name.toLowerCase().includes(ref.toLowerCase())
    );
  }

  if (!campaign) {
    return `⚠️ Campanha "${ref}" não encontrada. Use *#campanhas* para ver a lista.`;
  }

  // Get daily leads
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
    `👥 *#leads{N}* — Leads detalhados da campanha N\n` +
    `   Ex: #leads1, #leads2\n\n` +
    `📊 *#resumo* — Resumo geral da conta\n` +
    `❓ *#ajuda* — Mostra esta mensagem\n`;
}

// ─── Helpers ───

function formatCurrency(value: number): string {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatNumber(value: number): string {
  return value.toLocaleString("pt-BR");
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

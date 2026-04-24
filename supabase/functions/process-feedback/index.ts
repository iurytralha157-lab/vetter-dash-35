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
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body = await req.json();
    const {
      mensagem_original,
      account_id,
      id_grupo,
      numero_grupo,
      telefone_origem,
      nome_origem,
      usuario_origem,
      force_update,
      dry_run,
    } = body;

    if (!mensagem_original || mensagem_original.trim().length < 5) {
      return new Response(JSON.stringify({ error: "mensagem_original é obrigatória (mínimo 5 chars)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!account_id) {
      return new Response(JSON.stringify({ error: "account_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const msg = mensagem_original.trim();

    // Generate hash for dedup
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(msg.toLowerCase()));
    const mensagem_hash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

    // Check duplicate (exact message) — skip in dry_run mode
    if (!force_update && !dry_run) {
      const { data: existing } = await supabase
        .from("feedback_campanha")
        .select("id")
        .eq("mensagem_hash", mensagem_hash)
        .maybeSingle();

      if (existing) {
        return new Response(JSON.stringify({ success: true, duplicado: true, message: "Mensagem já processada" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const sharedFields = {
      account_id,
      mensagem_original: msg,
      mensagem_hash,
      id_grupo: id_grupo || null,
      numero_grupo: numero_grupo || null,
      telefone_origem: telefone_origem || null,
      nome_origem: nome_origem || null,
      usuario_origem: usuario_origem || null,
    };

    // === Fetch real Meta campaigns for this account to classify tipo_funil per campaign ===
    let metaCampaigns: Array<{ campaign_name: string; campaign_id: string }> = [];
    try {
      const { data: campRows } = await supabase
        .from("campaign_history")
        .select("campaign_name, campaign_id")
        .eq("account_id", account_id)
        .order("date", { ascending: false })
        .limit(200);

      if (campRows && campRows.length > 0) {
        // Deduplicate by campaign_id
        const seen = new Set<string>();
        for (const r of campRows) {
          if (!seen.has(r.campaign_id)) {
            seen.add(r.campaign_id);
            metaCampaigns.push({ campaign_name: r.campaign_name, campaign_id: r.campaign_id });
          }
        }
      }
      console.log(`[process-feedback] Found ${metaCampaigns.length} distinct Meta campaigns for account`);
    } catch (e) {
      console.error("[process-feedback] Error fetching Meta campaigns:", e);
    }

    // Call AI to parse the message into campaigns
    let campaigns: CampaignData[] = [];
    let tipoFunil = "";
    let aiModel = "google/gemini-3-flash-preview";
    let processamentoStatus = "pendente";
    let processamentoErro: string | null = null;
    let aiJson: any = null;
    let dataInicio: string | null = null;
    let dataFim: string | null = null;
    let periodoDetectado = false;

    // Build campaign list context for AI
    const campaignListForAI = metaCampaigns.length > 0
      ? metaCampaigns.map(c => c.campaign_name).join("\n")
      : "";

    if (lovableApiKey) {
      try {
        const result = await callAI(msg, lovableApiKey, aiModel, campaignListForAI);
        tipoFunil = result.tipo_funil;
        campaigns = result.campanhas;
        dataInicio = result.data_inicio || null;
        dataFim = result.data_fim || null;
        periodoDetectado = !!(dataInicio);
        aiJson = result;
        processamentoStatus = "processado";
      } catch (err) {
        console.error("[process-feedback] AI error:", err);
        processamentoStatus = "erro";
        processamentoErro = err instanceof Error ? err.message : "AI processing failed";
      }
    } else {
      processamentoStatus = "erro";
      processamentoErro = "LOVABLE_API_KEY not configured";
    }

    // === PER-CAMPAIGN tipo_funil classification based on Meta campaign names ===
    if (campaigns.length > 0 && metaCampaigns.length > 0) {
      for (const camp of campaigns) {
        // If the AI already set per-campaign tipo_funil, respect it
        if (camp.tipo_funil && ["lancamento", "terceiros"].includes(camp.tipo_funil)) {
          continue;
        }

        // Try to match this campaign to a real Meta campaign
        const matched = matchCampaignToMeta(camp.campanha_nome, camp.campanha_codigo_curto, metaCampaigns);
        if (matched) {
          // Update campaign name to the real Meta name for consistency
          camp._matched_meta_name = matched.campaign_name;
          camp._matched_meta_id = matched.campaign_id;

          // Classify based on Meta campaign name
          camp.tipo_funil = classifyCampaignType(matched.campaign_name);
          console.log(`[process-feedback] Campaign "${camp.campanha_nome}" matched to Meta "${matched.campaign_name}" → tipo_funil: ${camp.tipo_funil}`);
        } else {
          // No match found — use AI's global tipo_funil or default
          camp.tipo_funil = tipoFunil || "lancamento";
          console.log(`[process-feedback] Campaign "${camp.campanha_nome}" no Meta match, using: ${camp.tipo_funil}`);
        }
      }
    } else if (campaigns.length > 0) {
      // No Meta campaigns available — use AI's classification
      for (const camp of campaigns) {
        if (!camp.tipo_funil) {
          camp.tipo_funil = tipoFunil || classifyCampaignType(camp.campanha_nome);
        }
      }
    }

    // If no date detected, default to yesterday
    if (!dataInicio) {
      const nowBRT = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
      const yesterday = new Date(nowBRT);
      yesterday.setDate(yesterday.getDate() - 1);
      dataInicio = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
      dataFim = dataInicio;
    }
    if (!dataFim) {
      dataFim = dataInicio;
    }

    // === RULE 3: Check existing feedback for same account + date (skip in dry_run) ===
    if (!force_update && !dry_run) {
      const { data: existingFeedback } = await supabase
        .from("feedback_campanha")
        .select("id, campanha_nome, quantidade_recebida, quantidade_descartado, quantidade_aguardando_retorno, quantidade_atendimento, quantidade_passou_corretor, quantidade_visita, quantidade_proposta, quantidade_venda, tipo_funil, data_referencia")
        .eq("account_id", account_id)
        .gte("data_referencia", dataInicio)
        .lte("data_referencia", dataFim)
        .neq("campanha_nome", "desconhecida");

      if (existingFeedback && existingFeedback.length > 0) {
        return new Response(JSON.stringify({
          success: true,
          existing_feedback: true,
          message: "Já existe feedback registrado para esse período. Deseja atualizar?",
          existing_data: existingFeedback,
          data_inicio: dataInicio,
          data_fim: dataFim,
          periodo_detectado: periodoDetectado,
          new_parsed: {
            tipo_funil: tipoFunil,
            campanhas: campaigns,
          },
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // === If force_update, apply stage protection rules ===
    if (force_update) {
      const isAdmin = body.is_admin === true;

      const { data: existingRows } = await supabase
        .from("feedback_campanha")
        .select("campanha_nome, quantidade_passou_corretor, quantidade_visita, quantidade_proposta, quantidade_venda, quantidade_descartado, quantidade_atendimento")
        .eq("account_id", account_id)
        .gte("data_referencia", dataInicio)
        .lte("data_referencia", dataFim)
        .neq("campanha_nome", "desconhecida");

      if (!isAdmin && existingRows && existingRows.length > 0) {
        const advancedStages = ["quantidade_passou_corretor", "quantidade_visita", "quantidade_proposta", "quantidade_venda"] as const;

        for (const camp of campaigns) {
          const existingCamp = existingRows.find((r: any) =>
            r.campanha_nome?.toLowerCase() === camp.campanha_nome?.toLowerCase()
          );
          if (!existingCamp) continue;

          for (const stage of advancedStages) {
            const existingVal = existingCamp[stage] || 0;
            const newVal = camp[stage] ?? null;
            if (existingVal > 0 && (newVal === null || newVal < existingVal)) {
              (camp as any)[stage] = existingVal;
              console.log(`[process-feedback] Protected stage "${stage}" for "${camp.campanha_nome}": kept ${existingVal} (user tried ${newVal})`);
            }
          }

          const hasAdvanced = advancedStages.some(s => (existingCamp[s] || 0) > 0);
          if (hasAdvanced) {
            const existingDescartado = existingCamp.quantidade_descartado || 0;
            const existingAtendimento = existingCamp.quantidade_atendimento || 0;

            if (camp.quantidade_descartado != null && camp.quantidade_descartado > existingDescartado) {
              camp.quantidade_descartado = existingDescartado;
            }
            if (camp.quantidade_atendimento != null && camp.quantidade_atendimento > existingAtendimento) {
              camp.quantidade_atendimento = existingAtendimento;
            }
          }
        }
      }

      const { error: deleteError } = await supabase
        .from("feedback_campanha")
        .delete()
        .eq("account_id", account_id)
        .gte("data_referencia", dataInicio)
        .lte("data_referencia", dataFim);

      if (deleteError) {
        console.error("[process-feedback] Delete old feedback error:", deleteError);
      }
    }

    // === RULE 1: Fetch Meta leads for reference (informational only) ===
    let metaTotalLeads: number | null = null;
    const campaignMetaLeads: Record<string, number> = {};

    try {
      let query = supabase
        .from("campaign_history")
        .select("leads, campaign_name, campaign_id")
        .eq("account_id", account_id);

      if (dataInicio === dataFim) {
        query = query.eq("date", dataInicio);
      } else {
        query = query.gte("date", dataInicio).lte("date", dataFim);
      }

      const { data: campData } = await query;
      if (campData && campData.length > 0) {
        metaTotalLeads = campData.reduce((s: number, c: any) => s + (c.leads || 0), 0);
        
        // Map leads per campaign for more surgical validation
        campData.forEach((c: any) => {
          const name = c.campaign_name?.toLowerCase() || "";
          campaignMetaLeads[name] = (campaignMetaLeads[name] || 0) + (c.leads || 0);
        });
      }
    } catch (e) {
      console.error("[process-feedback] Meta leads query error:", e);
    }

    // We no longer FORCE-CAP the leads to Meta total, as Meta can be delayed or wrong.
    // Instead, we keep the user's reported numbers but we'll provide the Meta number for reference.
    if (metaTotalLeads !== null && metaTotalLeads > 0) {
      console.log(`[process-feedback] Meta total leads for period: ${metaTotalLeads}`);
    }

    // === RULE 2: Normalize + validate funnel totals ===
    const buildCampaignSummary = (camp: CampaignData) => ({
      nome: camp.campanha_nome,
      tipo_funil: camp.tipo_funil || tipoFunil || "lancamento",
      recebidos: camp.quantidade_recebida,
      descartado: camp.quantidade_descartado,
      aguardando_retorno: camp.quantidade_aguardando_retorno,
      atendimento: camp.quantidade_atendimento,
      passou_corretor: camp.quantidade_passou_corretor,
      visita: camp.quantidade_visita,
      proposta: camp.quantidade_proposta,
      venda: camp.quantidade_venda,
      nao_recebido: camp.quantidade_nao_recebido,
    });

    const totais = {
      recebidos: 0,
      descartado: 0,
      atendimento: 0,
      passou_corretor: 0,
      visita: 0,
      proposta: 0,
      venda: 0,
      nao_recebido: 0,
    };

    const invalidCampaigns: Array<{
      campanha_nome: string;
      recebidos: number;
      no_funil: number;
    }> = [];

    for (const camp of campaigns) {
      if ((camp.quantidade_aguardando_retorno || 0) > 0) {
        const migrated = camp.quantidade_aguardando_retorno || 0;
        camp.quantidade_atendimento = (camp.quantidade_atendimento || 0) + migrated;
        camp.quantidade_aguardando_retorno = null;
      }

      if (camp.quantidade_recebida != null && camp.quantidade_recebida > 0) {
        // Sum includes "não recebido" (gap entre Meta e WhatsApp)
        let subStagesSum =
          (camp.quantidade_descartado || 0) +
          (camp.quantidade_atendimento || 0) +
          (camp.quantidade_passou_corretor || 0) +
          (camp.quantidade_visita || 0) +
          (camp.quantidade_proposta || 0) +
          (camp.quantidade_venda || 0) +
          (camp.quantidade_nao_recebido || 0);

        // Auto-fill gap as "não recebido" when funil é menor que recebidos
        // (lead que o Meta registrou mas não chegou no WhatsApp)
        if (subStagesSum < camp.quantidade_recebida) {
          const gap = camp.quantidade_recebida - subStagesSum;
          camp.quantidade_nao_recebido = (camp.quantidade_nao_recebido || 0) + gap;
          subStagesSum += gap;
        }

        if (subStagesSum !== camp.quantidade_recebida) {
          invalidCampaigns.push({
            campanha_nome: camp.campanha_nome,
            recebidos: camp.quantidade_recebida,
            no_funil: subStagesSum,
          });
        }
      }

      totais.recebidos += camp.quantidade_recebida || 0;
      totais.descartado += camp.quantidade_descartado || 0;
      totais.atendimento += camp.quantidade_atendimento || 0;
      totais.passou_corretor += camp.quantidade_passou_corretor || 0;
      totais.visita += camp.quantidade_visita || 0;
      totais.proposta += camp.quantidade_proposta || 0;
      totais.venda += camp.quantidade_venda || 0;
      totais.nao_recebido += camp.quantidade_nao_recebido || 0;
    }

    const totalNoFunil =
      totais.descartado +
      totais.atendimento +
      totais.passou_corretor +
      totais.visita +
      totais.proposta +
      totais.venda +
      totais.nao_recebido;

    // Determine if there are mixed funnel types
    const hasLancamento = campaigns.some(c => (c.tipo_funil || tipoFunil) === "lancamento");
    const hasTerceiros = campaigns.some(c => (c.tipo_funil || tipoFunil) === "terceiros");
    const mixedFunnel = hasLancamento && hasTerceiros;

    if (invalidCampaigns.length > 0 || (totais.recebidos > 0 && totalNoFunil !== totais.recebidos)) {
      return new Response(JSON.stringify({
        success: true,
        invalid_funnel: true,
        processamento_status: processamentoStatus,
        tipo_funil: mixedFunnel ? "misto" : tipoFunil,
        mixed_funnel: mixedFunnel,
        campanhas_count: campaigns.length,
        campanhas: campaigns.map(buildCampaignSummary),
        totals: {
          ...totais,
          no_funil: totalNoFunil,
        },
        validation_errors: invalidCampaigns,
        periodo_detectado: periodoDetectado,
        data_inicio: dataInicio,
        data_fim: dataFim,
        meta_total_leads: metaTotalLeads,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === DRY RUN: return parsed data without saving ===
    if (dry_run) {
      return new Response(JSON.stringify({
        success: true,
        dry_run: true,
        processamento_status: processamentoStatus,
        tipo_funil: mixedFunnel ? "misto" : tipoFunil,
        mixed_funnel: mixedFunnel,
        campanhas_count: campaigns.length,
        campanhas: campaigns.map(buildCampaignSummary),
        totals: {
          ...totais,
          no_funil: totalNoFunil,
        },
        periodo_detectado: periodoDetectado,
        data_inicio: dataInicio,
        data_fim: dataFim,
        meta_total_leads: metaTotalLeads,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If AI failed, save a raw record
    if (campaigns.length === 0) {
      const { error: insertError } = await supabase.from("feedback_campanha").insert({
        ...sharedFields,
        tipo_funil: tipoFunil || "lancamento",
        campanha_nome: "desconhecida",
        data_referencia: dataInicio,
        processamento_status: processamentoStatus,
        processamento_erro: processamentoErro,
        ai_modelo: aiModel,
        ai_json: aiJson,
      });

      if (insertError) console.error("[process-feedback] Insert error:", insertError);

      return new Response(JSON.stringify({
        success: true,
        processamento_status: processamentoStatus,
        campanhas_count: 0,
        periodo_detectado: periodoDetectado,
        data_inicio: dataInicio,
        data_fim: dataFim,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert one record per campaign — each with its own tipo_funil
    const inserted: any[] = [];
    for (const camp of campaigns) {
      const campDataRef = camp.data_referencia || dataInicio;
      const campTipoFunil = camp.tipo_funil || tipoFunil || "lancamento";

      // Validate tipo_funil
      const validTipoFunil = ["lancamento", "terceiros"].includes(campTipoFunil) ? campTipoFunil : "lancamento";

      const record = {
        ...sharedFields,
        tipo_funil: validTipoFunil,
        campanha_nome: camp.campanha_nome || "desconhecida",
        campanha_codigo_curto: camp.campanha_codigo_curto ?? null,
        data_referencia: campDataRef,
        quantidade_recebida: camp.quantidade_recebida ?? null,
        quantidade_descartado: camp.quantidade_descartado ?? null,
        quantidade_aguardando_retorno: null,
        quantidade_atendimento: camp.quantidade_atendimento ?? null,
        quantidade_passou_corretor: camp.quantidade_passou_corretor ?? null,
        quantidade_visita: camp.quantidade_visita ?? null,
        quantidade_proposta: camp.quantidade_proposta ?? null,
        quantidade_venda: camp.quantidade_venda ?? null,
        quantidade_nao_recebido: camp.quantidade_nao_recebido ?? null,
        processamento_status: processamentoStatus,
        processamento_erro: processamentoErro,
        ai_modelo: aiModel,
        ai_json: aiJson,
      };

      const { error: insertError } = await supabase.from("feedback_campanha").insert(record);
      if (insertError) {
        console.error("[process-feedback] Insert error:", insertError);
      } else {
        inserted.push({ ...record, _tipo_funil: validTipoFunil });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      processamento_status: processamentoStatus,
      tipo_funil: mixedFunnel ? "misto" : (campaigns[0]?.tipo_funil || tipoFunil),
      mixed_funnel: mixedFunnel,
      campanhas_count: inserted.length,
      campanhas: campaigns.map(buildCampaignSummary),
      totals: {
        ...totais,
        no_funil: totalNoFunil,
      },
      periodo_detectado: periodoDetectado,
      data_inicio: dataInicio,
      data_fim: dataFim,
      meta_total_leads: metaTotalLeads,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[process-feedback] Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

interface CampaignData {
  campanha_nome: string;
  campanha_codigo_curto?: string | null;
  data_referencia?: string | null;
  tipo_funil?: string;
  _matched_meta_name?: string;
  _matched_meta_id?: string;
  quantidade_recebida: number | null;
  quantidade_descartado: number | null;
  quantidade_aguardando_retorno: number | null;
  quantidade_atendimento: number | null;
  quantidade_passou_corretor: number | null;
  quantidade_visita: number | null;
  quantidade_proposta: number | null;
  quantidade_venda: number | null;
  quantidade_nao_recebido: number | null;
}

interface AIResult {
  tipo_funil: string;
  campanhas: CampaignData[];
  data_inicio: string | null;
  data_fim: string | null;
}

// === Campaign matching and classification ===

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function classifyCampaignType(campaignName: string): string {
  const n = normalize(campaignName);
  // Check for explicit markers in campaign name
  if (n.includes("lancamento") || n.includes("lançamento") || n.includes("lanc")) return "lancamento";
  if (n.includes("terceiro") || n.includes("terceiros") || n.includes("terc")) return "terceiros";
  // Check for WPP (WhatsApp) + terceiro pattern
  if (n.includes("wpp") && (n.includes("terceiro") || n.includes("terc"))) return "terceiros";
  return "lancamento"; // default
}

function matchCampaignToMeta(
  parsedName: string,
  parsedCode: string | null | undefined,
  metaCampaigns: Array<{ campaign_name: string; campaign_id: string }>
): { campaign_name: string; campaign_id: string } | null {
  const normalizedParsed = normalize(parsedName);
  const normalizedCode = parsedCode ? normalize(parsedCode) : null;

  // 1. Exact match (normalized)
  for (const mc of metaCampaigns) {
    if (normalize(mc.campaign_name) === normalizedParsed) return mc;
  }

  // 2. Match by code (e.g. "REF698" matches "KK | LANÇAMENTO | REF698 | TAPETY")
  if (normalizedCode) {
    for (const mc of metaCampaigns) {
      if (normalize(mc.campaign_name).includes(normalizedCode)) return mc;
    }
  }

  // 3. Match by parsed name as substring of Meta campaign name
  if (normalizedParsed.length >= 3) {
    for (const mc of metaCampaigns) {
      const normalizedMeta = normalize(mc.campaign_name);
      if (normalizedMeta.includes(normalizedParsed)) return mc;
    }
  }

  // 4. Match by any significant word from parsed name in Meta campaign name
  // Split parsed name into words, try matching longer segments first
  const words = normalizedParsed.split(/[\s|,\-_]+/).filter(w => w.length >= 3);
  if (words.length > 0) {
    // Try matching all words first
    for (const mc of metaCampaigns) {
      const normalizedMeta = normalize(mc.campaign_name);
      if (words.every(w => normalizedMeta.includes(w))) return mc;
    }

    // Try matching any significant word (skip common words)
    const skipWords = new Set(["kk", "ref", "campanha", "leads", "lead", "com", "para", "que", "dos", "das", "wpp"]);
    const significantWords = words.filter(w => !skipWords.has(w) && w.length >= 4);
    if (significantWords.length > 0) {
      for (const mc of metaCampaigns) {
        const normalizedMeta = normalize(mc.campaign_name);
        if (significantWords.some(w => normalizedMeta.includes(w))) return mc;
      }
    }
  }

  // 5. Match code patterns like "47", "AP0145", "REF698" extracted from parsed name
  const codePattern = normalizedParsed.match(/(?:ref|ap|cac|cod)?\.?\s*(\d{2,})/);
  if (codePattern) {
    const codeNum = codePattern[0].replace(/\s/g, "");
    for (const mc of metaCampaigns) {
      if (normalize(mc.campaign_name).includes(codeNum)) return mc;
    }
  }

  return null;
}

async function callAI(mensagem: string, apiKey: string, model: string, campaignList: string): Promise<AIResult> {
  const campaignContext = campaignList
    ? `\n\nCAMPANHAS ATIVAS DESTA CONTA (do Meta Ads):\n${campaignList}\n\nIMPORTANTE: Use esses nomes reais como referência. Quando o usuário mencionar uma campanha por nome parcial, código ou apelido, tente identificar qual campanha real corresponde e use o NOME COMPLETO dela no campo campanha_nome. Por exemplo, se o usuário diz "Itapety" e existe "KK | LANÇAMENTO | REF698 | TAPETY", use "KK | LANÇAMENTO | REF698 | TAPETY" como campanha_nome.\n\nCLASSIFICAÇÃO LANÇAMENTO vs TERCEIROS:\n- Olhe para o NOME REAL da campanha no Meta para classificar.\n- Se o nome contém "LANÇAMENTO" ou "LANC", é tipo "lancamento".\n- Se o nome contém "TERCEIRO" ou "TERCEIROS" ou "TERC", é tipo "terceiros".\n- Cada campanha pode ter seu próprio tipo de funil! Uma mesma mensagem pode conter campanhas de lançamento E terceiros misturadas.\n- O campo tipo_funil no nível raiz deve ser o tipo predominante, mas cada campanha individual deve ter seu próprio tipo correto no campo tipo_funil.\n`
    : "";

  const systemPrompt = `Você é um assistente que interpreta mensagens de feedback de vendas imobiliárias enviadas via WhatsApp.

A mensagem segue o formato:
#feedback
<texto do feedback com campanhas e números>

O tipo do funil (lançamento ou terceiros) agora é determinado PELO NOME DA CAMPANHA no Meta Ads, não pelo que o usuário escreve na mensagem. Se o usuário escrever "terceiros" ou "lançamento" na mensagem, use como DICA, mas o nome real da campanha tem prioridade.
${campaignContext}
Pode haver MÚLTIPLAS campanhas na mesma mensagem, identificadas por códigos como "47:", "ap0145:", "REF47", nomes parciais, etc.

MAPEAMENTO DE ETAPAS (CRÍTICO — leia com atenção):

| O que o usuário escreve | Campo correto |
|---|---|
| "lead recebido", "recebidos", "chegou" | quantidade_recebida |
| "descartado", "descarte", "lixo" | quantidade_descartado |
| "não recebido", "não chegou", "não veio mensagem", "não chegou no whatsapp", "lead que não chegou", "perdido na entrega", "sem contato" | quantidade_nao_recebido |
| "aguardando retorno", "sem resposta", "não respondeu", "atendimento SDR", "em atendimento" (sem mencionar corretor) | quantidade_atendimento |
| "passou para corretor", "com o corretor", "em atendimento com o corretor", "corretor atendendo", "atendimento corretor" | quantidade_passou_corretor |
| "visita", "visitou" | quantidade_visita |
| "proposta", "enviou proposta" | quantidade_proposta |
| "venda", "vendeu", "fechou" | quantidade_venda |

REGRA CRÍTICA sobre "corretor":
- Qualquer menção a CORRETOR indica "quantidade_passou_corretor", NUNCA "quantidade_atendimento".
- "em atendimento com o corretor" = quantidade_passou_corretor
- "atendimento SDR", "aguardando retorno", "sem resposta", "não respondeu" ou apenas "em atendimento" (SEM mencionar corretor) = quantidade_atendimento
- NUNCA use quantidade_aguardando_retorno. Esse status não existe no funil atual e esse campo deve voltar sempre como null.

REGRA sobre "não recebido" (CRÍTICO para campanhas de WhatsApp):
- Em campanhas de WhatsApp, às vezes o lead clica no anúncio mas NUNCA envia mensagem para a equipe.
- Esses leads aparecem no Meta mas não chegam no time. Use quantidade_nao_recebido para registrar isso.
- Exemplos: "2 não chegaram", "3 não receberam mensagem", "1 lead não veio", "2 não chegaram pra gente".

REGRA sobre leads recebidos:
- "quantidade_recebida" é o total de leads que o Meta registrou, independente do status posterior (incluindo os que não chegaram via WhatsApp).

REGRA CRÍTICA de valores:
- Extraia SOMENTE os campos explicitamente mencionados na mensagem.
- Se um campo NÃO foi mencionado, retorne null para esse campo. NÃO retorne 0.
- NÃO invente, assuma ou estime valores.
- Somente retorne um número quando ele estiver explícito na mensagem.

REGRA IMPORTANTE sobre coerência:
- Se o usuário informou "X leads recebidos" e depois deu o status de cada um, a SOMA dos status (incluindo quantidade_nao_recebido) deve bater com X.
- Se a soma dos status informados for MENOR que os leads recebidos, os restantes que NÃO foram identificados devem ser colocados como "Atendimento SDR" (quantidade_atendimento), A NÃO SER que o usuário tenha mencionado explicitamente "não recebido" / "não chegou" — nesse caso use quantidade_nao_recebido.
- Se a soma do funil ficar MAIOR que os leads recebidos, isso é inválido e deve ser corrigido.
- Se nenhum campo "leads recebidos" for informado explicitamente, NÃO invente — retorne null.

PERÍODO/DATA:
- Extraia datas ou períodos mencionados na mensagem.
- Formatos aceitos: "ontem", "hoje", "dd/mm", "dd/mm/yyyy", "dia tal ao dia tal", "últimos 7 dias", "semana passada", "mês passado", etc.
- Se for um intervalo (ex: "01/07 a 10/07"), extraia data_inicio e data_fim.
- Se for uma data única (ex: "ontem", "10/07"), use a mesma data para data_inicio e data_fim.
- Se NENHUMA data ou período for mencionado, retorne null para ambos.
- Use formato YYYY-MM-DD. Considere o ano atual (${new Date().getFullYear()}) se não especificado.
- "ontem" = dia anterior à data atual.
- "hoje" = data atual.

Extraia:
1. tipo_funil: o tipo predominante ("lancamento" ou "terceiros") — será sobrescrito por campanha individual se necessário
2. data_inicio e data_fim: o período do feedback (null se não mencionado)
3. Para cada campanha mencionada:
   - campanha_nome: o NOME COMPLETO da campanha real do Meta se possível, senão o nome/código informado pelo usuário
   - tipo_funil: "lancamento" ou "terceiros" baseado no nome real da campanha
   - Quantidades explicitamente informadas

Retorne usando a tool extract_feedback_campaigns.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: mensagem },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_feedback_campaigns",
            description: "Extract campaign-level feedback data from a WhatsApp message, including date/period. Each campaign can have its own tipo_funil.",
            parameters: {
              type: "object",
              properties: {
                tipo_funil: {
                  type: "string",
                  enum: ["lancamento", "terceiros"],
                  description: "Tipo predominante do funil (será sobrescrito por campanha individual se necessário)",
                },
                data_inicio: {
                  type: ["string", "null"],
                  description: "Data início do período do feedback no formato YYYY-MM-DD. null se não mencionado.",
                },
                data_fim: {
                  type: ["string", "null"],
                  description: "Data fim do período do feedback no formato YYYY-MM-DD. null se não mencionado.",
                },
                campanhas: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      campanha_nome: { type: "string", description: "Nome completo da campanha (preferencialmente o nome real do Meta Ads)" },
                      campanha_codigo_curto: { type: ["string", "null"], description: "Código curto se houver (ex: REF47, AP0145). null se não mencionado." },
                      tipo_funil: { type: "string", enum: ["lancamento", "terceiros"], description: "Tipo do funil desta campanha específica, baseado no nome real da campanha" },
                      quantidade_recebida: { type: ["integer", "null"], description: "Leads recebidos. null se não mencionado." },
                      quantidade_descartado: { type: ["integer", "null"], description: "Leads descartados. null se não mencionado." },
                      quantidade_aguardando_retorno: { type: ["integer", "null"], description: "Aguardando retorno. null se não mencionado." },
                      quantidade_atendimento: { type: ["integer", "null"], description: "Em atendimento / Atendimento SDR. null se não mencionado." },
                      quantidade_passou_corretor: { type: ["integer", "null"], description: "Passou para corretor. null se não mencionado." },
                      quantidade_visita: { type: ["integer", "null"], description: "Visitas. null se não mencionado." },
                      quantidade_proposta: { type: ["integer", "null"], description: "Propostas. null se não mencionado." },
                      quantidade_venda: { type: ["integer", "null"], description: "Vendas. null se não mencionado." },
                      quantidade_nao_recebido: { type: ["integer", "null"], description: "Leads que o Meta registrou mas não chegaram via WhatsApp (ex: 'não chegou', 'não veio mensagem', 'não recebido'). null se não mencionado." },
                    },
                    required: ["campanha_nome"],
                  },
                },
              },
              required: ["tipo_funil", "campanhas"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "extract_feedback_campaigns" } },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI Gateway error ${response.status}: ${errText}`);
  }

  const result = await response.json();
  const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

  if (toolCall?.function?.arguments) {
    const parsed = JSON.parse(toolCall.function.arguments);
    return {
      tipo_funil: parsed.tipo_funil || "lancamento",
      campanhas: Array.isArray(parsed.campanhas) ? parsed.campanhas : [],
      data_inicio: parsed.data_inicio || null,
      data_fim: parsed.data_fim || null,
    };
  }

  // Fallback: parse content
  const content = result.choices?.[0]?.message?.content;
  if (content) {
    const parsed = JSON.parse(content);
    return {
      tipo_funil: parsed.tipo_funil || "lancamento",
      campanhas: Array.isArray(parsed.campanhas) ? parsed.campanhas : [],
      data_inicio: parsed.data_inicio || null,
      data_fim: parsed.data_fim || null,
    };
  }

  throw new Error("No AI response");
}

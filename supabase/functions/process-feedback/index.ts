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

    // Check duplicate (exact message)
    if (!force_update) {
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

    if (lovableApiKey) {
      try {
        const result = await callAI(msg, lovableApiKey, aiModel);
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

    // === RULE 3: Check existing feedback for same account + date ===
    if (!force_update) {
      const { data: existingFeedback } = await supabase
        .from("feedback_campanha")
        .select("id, campanha_nome, quantidade_recebida, quantidade_descartado, quantidade_aguardando_retorno, quantidade_atendimento, quantidade_passou_corretor, quantidade_visita, quantidade_proposta, quantidade_venda, tipo_funil, data_referencia")
        .eq("account_id", account_id)
        .gte("data_referencia", dataInicio)
        .lte("data_referencia", dataFim)
        .neq("campanha_nome", "desconhecida");

      if (existingFeedback && existingFeedback.length > 0) {
        // There's already feedback for this day — return existing data and ask for confirmation
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

      // Fetch existing feedback for this period
      const { data: existingRows } = await supabase
        .from("feedback_campanha")
        .select("campanha_nome, quantidade_passou_corretor, quantidade_visita, quantidade_proposta, quantidade_venda, quantidade_descartado, quantidade_atendimento")
        .eq("account_id", account_id)
        .gte("data_referencia", dataInicio)
        .lte("data_referencia", dataFim)
        .neq("campanha_nome", "desconhecida");

      // RULE: Once a campaign has advanced stages (corretor, visita, proposta, venda),
      // non-admin users cannot set those values to 0 or move leads back to descartado/atendimento SDR
      if (!isAdmin && existingRows && existingRows.length > 0) {
        const advancedStages = ["quantidade_passou_corretor", "quantidade_visita", "quantidade_proposta", "quantidade_venda"] as const;

        for (const camp of campaigns) {
          const existingCamp = existingRows.find((r: any) =>
            r.campanha_nome?.toLowerCase() === camp.campanha_nome?.toLowerCase()
          );
          if (!existingCamp) continue;

          // Preserve advanced stage values — cannot reduce them
          for (const stage of advancedStages) {
            const existingVal = existingCamp[stage] || 0;
            const newVal = camp[stage] ?? null;
            if (existingVal > 0 && (newVal === null || newVal < existingVal)) {
              (camp as any)[stage] = existingVal;
              console.log(`[process-feedback] Protected stage "${stage}" for "${camp.campanha_nome}": kept ${existingVal} (user tried ${newVal})`);
            }
          }

          // Cannot increase descartado or atendimento if advanced stages exist
          const hasAdvanced = advancedStages.some(s => (existingCamp[s] || 0) > 0);
          if (hasAdvanced) {
            const existingDescartado = existingCamp.quantidade_descartado || 0;
            const existingAtendimento = existingCamp.quantidade_atendimento || 0;

            if (camp.quantidade_descartado != null && camp.quantidade_descartado > existingDescartado) {
              camp.quantidade_descartado = existingDescartado;
              console.log(`[process-feedback] Blocked descartado increase for "${camp.campanha_nome}" (has advanced stages)`);
            }
            if (camp.quantidade_atendimento != null && camp.quantidade_atendimento > existingAtendimento) {
              camp.quantidade_atendimento = existingAtendimento;
              console.log(`[process-feedback] Blocked atendimento increase for "${camp.campanha_nome}" (has advanced stages)`);
            }
          }
        }
      }

      // Delete old records to replace with new
      const { error: deleteError } = await supabase
        .from("feedback_campanha")
        .delete()
        .eq("account_id", account_id)
        .gte("data_referencia", dataInicio)
        .lte("data_referencia", dataFim);

      if (deleteError) {
        console.error("[process-feedback] Delete old feedback error:", deleteError);
      } else {
        console.log("[process-feedback] Deleted old feedback for update");
      }
    }

    // === RULE 1: Cap leads_recebidos to Meta total leads ===
    let metaTotalLeads: number | null = null;
    try {
      let query = supabase
        .from("campaign_history")
        .select("leads")
        .eq("account_id", account_id);

      if (dataInicio === dataFim) {
        query = query.eq("date", dataInicio);
      } else {
        query = query.gte("date", dataInicio).lte("date", dataFim);
      }

      const { data: campData } = await query;
      if (campData && campData.length > 0) {
        metaTotalLeads = campData.reduce((s: number, c: any) => s + (c.leads || 0), 0);
      }
    } catch (e) {
      console.error("[process-feedback] Meta leads query error:", e);
    }

    // Apply cap: total quantidade_recebida across all campaigns cannot exceed metaTotalLeads
    if (metaTotalLeads !== null && metaTotalLeads > 0 && campaigns.length > 0) {
      const totalRecebida = campaigns.reduce((s, c) => s + (c.quantidade_recebida || 0), 0);
      if (totalRecebida > metaTotalLeads) {
        // Proportionally cap each campaign's quantidade_recebida
        const ratio = metaTotalLeads / totalRecebida;
        let remaining = metaTotalLeads;
        for (let i = 0; i < campaigns.length; i++) {
          if (campaigns[i].quantidade_recebida != null) {
            if (i === campaigns.length - 1) {
              campaigns[i].quantidade_recebida = remaining;
            } else {
              const capped = Math.round((campaigns[i].quantidade_recebida || 0) * ratio);
              campaigns[i].quantidade_recebida = capped;
              remaining -= capped;
            }
          }
        }
        console.log(`[process-feedback] Capped leads_recebidos from ${totalRecebida} to ${metaTotalLeads} (Meta total)`);
      }
    }

    // === RULE 2: Validate sub-stages sum per campaign ===
    // The sum of sub-stages should not exceed quantidade_recebida
    for (const camp of campaigns) {
      if (camp.quantidade_recebida != null && camp.quantidade_recebida > 0) {
        const subStagesSum =
          (camp.quantidade_descartado || 0) +
          (camp.quantidade_aguardando_retorno || 0) +
          (camp.quantidade_atendimento || 0) +
          (camp.quantidade_passou_corretor || 0) +
          (camp.quantidade_visita || 0) +
          (camp.quantidade_proposta || 0) +
          (camp.quantidade_venda || 0);

        // If sub-stages don't add up and there's a gap, add the difference to aguardando_retorno
        if (subStagesSum < camp.quantidade_recebida) {
          const gap = camp.quantidade_recebida - subStagesSum;
          camp.quantidade_aguardando_retorno = (camp.quantidade_aguardando_retorno || 0) + gap;
          console.log(`[process-feedback] Campaign "${camp.campanha_nome}": added ${gap} to aguardando_retorno to match leads_recebidos`);
        }
      }
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

    // Validate tipo_funil
    if (!["lancamento", "terceiros"].includes(tipoFunil)) {
      tipoFunil = "lancamento";
    }

    // Insert one record per campaign
    const inserted: any[] = [];
    for (const camp of campaigns) {
      const campDataRef = camp.data_referencia || dataInicio;

      const record = {
        ...sharedFields,
        tipo_funil: tipoFunil,
        campanha_nome: camp.campanha_nome || "desconhecida",
        campanha_codigo_curto: camp.campanha_codigo_curto ?? null,
        data_referencia: campDataRef,
        quantidade_recebida: camp.quantidade_recebida ?? null,
        quantidade_descartado: camp.quantidade_descartado ?? null,
        quantidade_aguardando_retorno: camp.quantidade_aguardando_retorno ?? null,
        quantidade_atendimento: camp.quantidade_atendimento ?? null,
        quantidade_passou_corretor: camp.quantidade_passou_corretor ?? null,
        quantidade_visita: camp.quantidade_visita ?? null,
        quantidade_proposta: camp.quantidade_proposta ?? null,
        quantidade_venda: camp.quantidade_venda ?? null,
        processamento_status: processamentoStatus,
        processamento_erro: processamentoErro,
        ai_modelo: aiModel,
        ai_json: aiJson,
      };

      const { error: insertError } = await supabase.from("feedback_campanha").insert(record);
      if (insertError) {
        console.error("[process-feedback] Insert error:", insertError);
      } else {
        inserted.push(record);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      processamento_status: processamentoStatus,
      tipo_funil: tipoFunil,
      campanhas_count: inserted.length,
      campanhas: inserted.map(c => ({ nome: c.campanha_nome, recebidos: c.quantidade_recebida })),
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
  quantidade_recebida: number | null;
  quantidade_descartado: number | null;
  quantidade_aguardando_retorno: number | null;
  quantidade_atendimento: number | null;
  quantidade_passou_corretor: number | null;
  quantidade_visita: number | null;
  quantidade_proposta: number | null;
  quantidade_venda: number | null;
}

interface AIResult {
  tipo_funil: string;
  campanhas: CampaignData[];
  data_inicio: string | null;
  data_fim: string | null;
}

async function callAI(mensagem: string, apiKey: string, model: string): Promise<AIResult> {
  const systemPrompt = `Você é um assistente que interpreta mensagens de feedback de vendas imobiliárias enviadas via WhatsApp.

A mensagem segue o formato:
#feedback
<tipo_funil> (lancamento ou terceiros — se não informado, infira pelo contexto; se menciona SDR ou corretor, é "terceiros"; se não mencionar, é "lancamento")

Pode haver MÚLTIPLAS campanhas na mesma mensagem, identificadas por códigos como "47:", "ap0145:", "REF47", etc.

MAPEAMENTO DE ETAPAS (CRÍTICO — leia com atenção):

| O que o usuário escreve | Campo correto |
|---|---|
| "lead recebido", "recebidos", "chegou" | quantidade_recebida |
| "descartado", "descarte", "lixo" | quantidade_descartado |
| "aguardando retorno", "sem resposta", "não respondeu" | quantidade_aguardando_retorno |
| "atendimento SDR", "em atendimento" (sem mencionar corretor) | quantidade_atendimento |
| "passou para corretor", "com o corretor", "em atendimento com o corretor", "corretor atendendo", "atendimento corretor" | quantidade_passou_corretor |
| "visita", "visitou" | quantidade_visita |
| "proposta", "enviou proposta" | quantidade_proposta |
| "venda", "vendeu", "fechou" | quantidade_venda |

REGRA CRÍTICA sobre "corretor":
- Qualquer menção a CORRETOR indica "quantidade_passou_corretor", NUNCA "quantidade_atendimento".
- "em atendimento com o corretor" = quantidade_passou_corretor
- "atendimento SDR" ou apenas "em atendimento" (SEM mencionar corretor) = quantidade_atendimento

REGRA sobre leads recebidos:
- "quantidade_recebida" é o total de leads que chegaram naquela campanha, independente do status posterior.

REGRA CRÍTICA de valores:
- Extraia SOMENTE os campos explicitamente mencionados na mensagem.
- Se um campo NÃO foi mencionado, retorne null para esse campo. NÃO retorne 0.
- NÃO invente, assuma ou estime valores.
- Somente retorne um número quando ele estiver explícito na mensagem.

REGRA IMPORTANTE sobre coerência:
- Se o usuário informou "X leads recebidos" e depois deu o status de cada um, a SOMA dos status deve bater com X.
- Se a soma dos status informados for MENOR que os leads recebidos, os restantes devem ficar como "aguardando retorno" (quantidade_aguardando_retorno).
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
1. tipo_funil: "lancamento" ou "terceiros"
2. data_inicio e data_fim: o período do feedback (null se não mencionado)
3. Para cada campanha mencionada, extraia APENAS as quantidades explicitamente informadas

EXEMPLO:
Mensagem: "47: 2 lead recebido, aguardando retorno / ap0145: 3 lead recebido, 2 em atendimento com o corretor"
Resultado esperado:
- tipo_funil: "terceiros" (mencionou corretor)
- campanha "47": quantidade_recebida=2, quantidade_aguardando_retorno=2
- campanha "ap0145": quantidade_recebida=3, quantidade_passou_corretor=2, quantidade_aguardando_retorno=1

Note no exemplo acima: campanha ap0145 tem 3 recebidos, 2 com corretor. O 1 restante vai para aguardando_retorno automaticamente.

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
            description: "Extract campaign-level feedback data from a WhatsApp message, including date/period",
            parameters: {
              type: "object",
              properties: {
                tipo_funil: {
                  type: "string",
                  enum: ["lancamento", "terceiros"],
                  description: "Tipo do funil, extraído da linha após #feedback",
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
                      campanha_nome: { type: "string", description: "Nome completo da campanha" },
                      campanha_codigo_curto: { type: ["string", "null"], description: "Código curto se houver (ex: REF47, AP0145). null se não mencionado." },
                      quantidade_recebida: { type: ["integer", "null"], description: "Leads recebidos. null se não mencionado." },
                      quantidade_descartado: { type: ["integer", "null"], description: "Leads descartados. null se não mencionado." },
                      quantidade_aguardando_retorno: { type: ["integer", "null"], description: "Aguardando retorno. null se não mencionado." },
                      quantidade_atendimento: { type: ["integer", "null"], description: "Em atendimento / Atendimento SDR. null se não mencionado." },
                      quantidade_passou_corretor: { type: ["integer", "null"], description: "Passou para corretor. null se não mencionado." },
                      quantidade_visita: { type: ["integer", "null"], description: "Visitas. null se não mencionado." },
                      quantidade_proposta: { type: ["integer", "null"], description: "Propostas. null se não mencionado." },
                      quantidade_venda: { type: ["integer", "null"], description: "Vendas. null se não mencionado." },
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

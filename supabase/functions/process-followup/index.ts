import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Valid enum values
const VALID_ETAPA_FUNIL = [
  "lead_novo", "contato_iniciado", "sem_resposta", "atendimento",
  "visita_agendada", "visita_realizada", "proposta", "venda", "perdido"
];
const VALID_STATUS_LEAD = ["aberto", "em_andamento", "ganho", "perdido"];
const VALID_TEMPERATURA = ["frio", "morno", "quente"];

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
      cliente_id,
      id_grupo,
      numero_grupo,
      telefone_origem,
      nome_origem,
      usuario_origem,
    } = body;

    if (!mensagem_original || mensagem_original.trim().length < 5) {
      return new Response(JSON.stringify({ error: "mensagem_original é obrigatória (mínimo 5 caracteres)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate hash
    const encoder = new TextEncoder();
    const data = encoder.encode(mensagem_original.trim().toLowerCase());
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const mensagem_hash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    // Check for duplicates
    const { data: existing } = await supabase
      .from("feedback_funnel")
      .select("id")
      .eq("mensagem_hash", mensagem_hash)
      .maybeSingle();

    if (existing) {
      await supabase.from("feedback_funnel").insert({
        mensagem_original: mensagem_original.trim(),
        mensagem_hash,
        duplicado: true,
        processamento_status: "duplicado",
        account_id: account_id || null,
        cliente_id: cliente_id || null,
        id_grupo: id_grupo || null,
        numero_grupo: numero_grupo || null,
        telefone_origem: telefone_origem || null,
        nome_origem: nome_origem || null,
        usuario_origem: usuario_origem || null,
        hashtag: "followup",
        origem: "whatsapp_grupo",
      });

      return new Response(JSON.stringify({ success: true, duplicado: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Shared metadata for all records
    const sharedFields = {
      mensagem_original: mensagem_original.trim(),
      mensagem_hash,
      duplicado: false,
      account_id: account_id || null,
      cliente_id: cliente_id || null,
      id_grupo: id_grupo || null,
      numero_grupo: numero_grupo || null,
      telefone_origem: telefone_origem || null,
      nome_origem: nome_origem || null,
      usuario_origem: usuario_origem || null,
      hashtag: "followup",
      origem: "whatsapp_grupo",
    };

    // Call AI to interpret the message - try multi-lead first
    let aiResults: any[] = [];
    let aiModel = "google/gemini-3-flash-preview";
    let promptVersion = "v2";
    let processamentoStatus = "pendente";
    let processamentoErro: string | null = null;

    if (lovableApiKey) {
      try {
        aiResults = await callAIMultiLead(mensagem_original, lovableApiKey, aiModel);
        processamentoStatus = "processado";
      } catch (err) {
        console.error("[process-followup] AI error:", err);
        processamentoStatus = "erro";
        processamentoErro = err instanceof Error ? err.message : "AI processing failed";
      }
    } else {
      processamentoStatus = "erro";
      processamentoErro = "LOVABLE_API_KEY not configured";
    }

    // If AI failed or returned empty, insert a single raw record
    if (aiResults.length === 0) {
      const { error: insertError } = await supabase.from("feedback_funnel").insert({
        ...sharedFields,
        processamento_status: processamentoStatus,
        processamento_erro: processamentoErro,
        ai_modelo: aiModel,
        ai_prompt_versao: promptVersion,
      });

      if (insertError) {
        console.error("[process-followup] Insert error:", insertError);
        return new Response(JSON.stringify({ error: "Failed to save" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        processamento_status: processamentoStatus,
        leads_count: 0,
        dados: [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert one record per lead
    const insertedLeads: any[] = [];
    for (const leadResult of aiResults) {
      const sanitized = sanitizeAIResult(leadResult);
      const { error: insertError } = await supabase.from("feedback_funnel").insert({
        ...sharedFields,
        processamento_status: processamentoStatus,
        processamento_erro: processamentoErro,
        ai_modelo: aiModel,
        ai_prompt_versao: promptVersion,
        ai_json: leadResult,
        ...sanitized,
      });

      if (insertError) {
        console.error("[process-followup] Insert error for lead:", insertError);
      } else {
        insertedLeads.push(sanitized);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      processamento_status: processamentoStatus,
      leads_count: insertedLeads.length,
      dados: insertedLeads,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[process-followup] Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function callAIMultiLead(mensagem: string, apiKey: string, model: string): Promise<any[]> {
  const systemPrompt = `Você é um assistente especializado em interpretar mensagens de follow-up de vendas imobiliárias enviadas via WhatsApp.

IMPORTANTE: Uma mensagem pode conter informações sobre MÚLTIPLOS leads. Você DEVE identificar CADA lead mencionado separadamente.

REGRA CRÍTICA:
- Extraia SOMENTE informações explicitamente presentes na mensagem.
- Se um campo NÃO foi mencionado, retorne null. NÃO invente valores.
- NÃO assuma, estime ou complete informações ausentes.
- Prefira dados incompletos a dados incorretos.

Analise a mensagem e extraia informações estruturadas para CADA lead identificado. Retorne um ARRAY JSON com um objeto por lead.

Campos de cada objeto (retorne null se não mencionado):
- mensagem_normalizada: resumo específico deste lead
- lead_nome: nome do lead (se não mencionado, use "Lead 1", "Lead 2", etc.)
- lead_telefone: telefone do lead se mencionado, senão null
- etapa_funil: uma de [lead_novo, contato_iniciado, sem_resposta, atendimento, visita_agendada, visita_realizada, proposta, venda, perdido]
- status_lead: um de [aberto, em_andamento, ganho, perdido]
- temperatura_lead: um de [frio, morno, quente] — null se não inferível
- resumo: resumo curto da situação DESTE lead específico
- proxima_acao: próxima ação sugerida para ESTE lead, null se não inferível
- data_proxima_acao: data sugerida (YYYY-MM-DD), null se não mencionada
- responsavel_sugerido: nome do responsável se mencionado, senão null
- campanha_nome: nome da campanha se mencionado, senão null
- campaign_id: ID da campanha se mencionado, senão null
- confianca: nível de confiança da interpretação (0.0 a 1.0)
- score_intencao: score de intenção de compra (0 a 100), null se não inferível

Se a mensagem fala de apenas 1 lead, retorne um array com 1 objeto.
Se fala de 3 leads, retorne um array com 3 objetos.

Responda SOMENTE com o JSON array, sem markdown, sem explicações.`;

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
            name: "extract_multiple_leads",
            description: "Extract structured follow-up data for each lead mentioned in a WhatsApp message. Returns an array of leads.",
            parameters: {
              type: "object",
              properties: {
                leads: {
                  type: "array",
                  description: "Array of leads extracted from the message. One object per lead.",
                  items: {
                    type: "object",
                    properties: {
                      mensagem_normalizada: { type: "string" },
                      lead_nome: { type: "string" },
                      lead_telefone: { type: "string" },
                      etapa_funil: { type: "string", enum: VALID_ETAPA_FUNIL },
                      status_lead: { type: "string", enum: VALID_STATUS_LEAD },
                      temperatura_lead: { type: "string", enum: VALID_TEMPERATURA },
                      resumo: { type: "string" },
                      proxima_acao: { type: "string" },
                      data_proxima_acao: { type: "string" },
                      responsavel_sugerido: { type: "string" },
                      campanha_nome: { type: "string" },
                      campaign_id: { type: "string" },
                      confianca: { type: "number" },
                      score_intencao: { type: "integer" },
                    },
                    required: ["mensagem_normalizada", "etapa_funil", "status_lead", "resumo", "lead_nome"],
                  },
                },
              },
              required: ["leads"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "extract_multiple_leads" } },
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
    // The tool returns { leads: [...] }
    if (parsed.leads && Array.isArray(parsed.leads)) {
      return parsed.leads;
    }
    // Fallback: if it returned a single object, wrap it
    if (parsed.etapa_funil) {
      return [parsed];
    }
    return [];
  }

  // Fallback: try to parse content as JSON
  const content = result.choices?.[0]?.message?.content;
  if (content) {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
      if (parsed.leads && Array.isArray(parsed.leads)) return parsed.leads;
      if (parsed.etapa_funil) return [parsed];
    } catch {
      throw new Error("AI did not return valid JSON");
    }
  }

  throw new Error("No AI response");
}

function sanitizeAIResult(result: any) {
  if (!result) return {};

  return {
    mensagem_normalizada: typeof result.mensagem_normalizada === "string" ? result.mensagem_normalizada : null,
    lead_nome: typeof result.lead_nome === "string" ? result.lead_nome : null,
    lead_telefone: typeof result.lead_telefone === "string" ? result.lead_telefone : null,
    etapa_funil: VALID_ETAPA_FUNIL.includes(result.etapa_funil) ? result.etapa_funil : null,
    status_lead: VALID_STATUS_LEAD.includes(result.status_lead) ? result.status_lead : null,
    temperatura_lead: VALID_TEMPERATURA.includes(result.temperatura_lead) ? result.temperatura_lead : null,
    resumo: typeof result.resumo === "string" ? result.resumo : null,
    proxima_acao: typeof result.proxima_acao === "string" ? result.proxima_acao : null,
    data_proxima_acao: typeof result.data_proxima_acao === "string" ? result.data_proxima_acao : null,
    responsavel_sugerido: typeof result.responsavel_sugerido === "string" ? result.responsavel_sugerido : null,
    campanha_nome: typeof result.campanha_nome === "string" ? result.campanha_nome : null,
    campaign_id: typeof result.campaign_id === "string" ? result.campaign_id : null,
    confianca: typeof result.confianca === "number" ? result.confianca : null,
    score_intencao: typeof result.score_intencao === "number" ? Math.round(result.score_intencao) : null,
  };
}

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

    // Check duplicate
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
      // Use campaign-level date if provided, otherwise use global date
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
- campanha "ap0145": quantidade_recebida=3, quantidade_passou_corretor=2

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

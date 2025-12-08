import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  evento: string;
  [key: string]: unknown;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { event_type, data } = await req.json();
    
    console.log(`[send-webhook-notification] Received event: ${event_type}`);
    console.log(`[send-webhook-notification] Data:`, JSON.stringify(data));

    // Map event types to webhook URL keys
    const eventToUrlKey: Record<string, string> = {
      'demanda_criada': 'webhook_demandas_url',
      'demanda_concluida': 'webhook_demandas_url',
      'checklist_lembrete': 'webhook_checklist_url',
      'checklist_relatorio': 'webhook_checklist_url',
      'novo_cliente': 'webhook_clientes_url',
    };

    // Map event types to enabled toggle keys
    const eventToEnabledKey: Record<string, string> = {
      'demanda_criada': 'webhook_demandas_criada',
      'demanda_concluida': 'webhook_demandas_concluida',
      'checklist_lembrete': 'webhook_checklist_lembrete_manha',
      'checklist_relatorio': 'webhook_checklist_relatorio_tarde',
      'novo_cliente': 'webhook_clientes_novo_cadastro',
    };

    const urlKey = eventToUrlKey[event_type];
    const enabledKey = eventToEnabledKey[event_type];

    if (!urlKey || !enabledKey) {
      console.log(`[send-webhook-notification] Unknown event type: ${event_type}`);
      return new Response(
        JSON.stringify({ success: false, error: 'Unknown event type' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Fetch settings from database
    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('key, value, enabled')
      .in('key', [urlKey, enabledKey]);

    if (settingsError) {
      console.error('[send-webhook-notification] Error fetching settings:', settingsError);
      throw settingsError;
    }

    const urlSetting = settings?.find(s => s.key === urlKey);
    const enabledSetting = settings?.find(s => s.key === enabledKey);

    // Check if notification is enabled
    if (!enabledSetting?.enabled) {
      console.log(`[send-webhook-notification] Notification disabled for ${event_type}`);
      return new Response(
        JSON.stringify({ success: false, message: 'Notification disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if URL is configured
    const webhookUrl = urlSetting?.value;
    if (!webhookUrl) {
      console.log(`[send-webhook-notification] No webhook URL configured for ${event_type}`);
      return new Response(
        JSON.stringify({ success: false, message: 'No webhook URL configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the payload based on event type
    let payload: WebhookPayload;

    switch (event_type) {
      case 'demanda_criada':
        payload = {
          evento: 'demanda_criada',
          demanda: {
            id: data.demanda_id,
            titulo: data.titulo,
            conta: data.conta_nome,
            prioridade: data.prioridade,
            data_entrega: data.data_entrega,
            hora_entrega: data.hora_entrega,
            descricao: data.descricao,
            link_criativos: data.link_criativos,
            orcamento: data.orcamento,
          },
          responsavel: {
            nome: data.gestor_nome,
            email: data.gestor_email,
          },
          criado_por: data.criado_por_nome,
          timestamp: new Date().toISOString(),
        };
        break;

      case 'demanda_concluida':
        payload = {
          evento: 'demanda_concluida',
          demanda: {
            id: data.demanda_id,
            titulo: data.titulo,
            conta: data.conta_nome,
            tempo_total: data.tempo_total,
          },
          concluido_por: {
            nome: data.concluido_por_nome,
            email: data.concluido_por_email,
          },
          admins_para_notificar: data.admins || [],
          timestamp: new Date().toISOString(),
        };
        break;

      case 'novo_cliente':
        payload = {
          evento: 'novo_cliente',
          cliente: {
            nome: data.nome,
            email: data.email,
            telefone: data.telefone,
            responsavel: data.responsavel_nome,
          },
          timestamp: new Date().toISOString(),
        };
        break;

      case 'checklist_lembrete':
      case 'checklist_relatorio':
        payload = {
          evento: event_type,
          contas_pendentes: data.contas_pendentes || [],
          total_pendentes: data.total_pendentes || 0,
          timestamp: new Date().toISOString(),
        };
        break;

      default:
        payload = {
          evento: event_type,
          ...data,
          timestamp: new Date().toISOString(),
        };
    }

    console.log(`[send-webhook-notification] Sending webhook to: ${webhookUrl}`);
    console.log(`[send-webhook-notification] Payload:`, JSON.stringify(payload));

    // Send the webhook
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseStatus = webhookResponse.status;
    console.log(`[send-webhook-notification] Webhook response status: ${responseStatus}`);

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error(`[send-webhook-notification] Webhook error: ${errorText}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Webhook request failed', 
          status: responseStatus 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[send-webhook-notification] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
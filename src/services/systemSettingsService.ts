import { supabase } from "@/integrations/supabase/client";

export interface SystemSetting {
  id: string;
  key: string;
  value: string | null;
  enabled: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export const systemSettingsService = {
  async getSettings(): Promise<SystemSetting[]> {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .order('key');

    if (error) throw error;
    return data as SystemSetting[];
  },

  async getSetting(key: string): Promise<SystemSetting | null> {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .eq('key', key)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data as SystemSetting | null;
  },

  async updateSetting(key: string, value: string | null, enabled?: boolean): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    const updates: Record<string, unknown> = { 
      value,
      updated_by: user?.id 
    };
    
    if (enabled !== undefined) {
      updates.enabled = enabled;
    }

    const { error } = await supabase
      .from('system_settings')
      .update(updates)
      .eq('key', key);

    if (error) throw error;
  },

  async updateSettingEnabled(key: string, enabled: boolean): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('system_settings')
      .update({ 
        enabled,
        updated_by: user?.id 
      })
      .eq('key', key);

    if (error) throw error;
  },

  async testWebhook(webhookUrl: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          evento: 'teste',
          mensagem: 'Teste de conexão do MetaFlow',
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        return { success: true, message: 'Webhook testado com sucesso!' };
      } else {
        return { success: false, message: `Erro: Status ${response.status}` };
      }
    } catch (error) {
      return { success: false, message: `Erro ao testar: ${error instanceof Error ? error.message : 'Erro desconhecido'}` };
    }
  },
};

// Helper function to send webhook notifications
export async function sendWebhookNotification(
  eventType: string, 
  data: Record<string, unknown>
): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('send-webhook-notification', {
      body: { event_type: eventType, data },
    });

    if (error) {
      console.error('[sendWebhookNotification] Error:', error);
    }
  } catch (error) {
    console.error('[sendWebhookNotification] Error:', error);
  }
}
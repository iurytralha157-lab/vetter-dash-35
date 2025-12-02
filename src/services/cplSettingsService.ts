import { supabase } from "@/integrations/supabase/client";

export interface CPLSettings {
  id: string;
  account_id: string | null;
  cpl_mcmv: number | null;
  cpl_medio: number | null;
  cpl_alto: number | null;
  margem_amarelo: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export const DEFAULT_CPL_SETTINGS = {
  cpl_mcmv: 30,
  cpl_medio: 50,
  cpl_alto: 80,
  margem_amarelo: 20,
};

export const cplSettingsService = {
  /**
   * Get CPL settings for a specific account (or global if null)
   */
  async getCPLSettings(accountId: string | null = null): Promise<CPLSettings | null> {
    const { data, error } = await supabase
      .from("cpl_settings")
      .select("*")
      .eq("account_id", accountId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching CPL settings:", error);
      throw error;
    }

    // If no account-specific settings, try to get global settings
    if (!data && accountId) {
      const { data: globalData, error: globalError } = await supabase
        .from("cpl_settings")
        .select("*")
        .is("account_id", null)
        .maybeSingle();

      if (globalError) {
        console.error("Error fetching global CPL settings:", globalError);
        throw globalError;
      }

      return globalData;
    }

    return data;
  },

  /**
   * Create or update CPL settings
   */
  async upsertCPLSettings(settings: Partial<CPLSettings>): Promise<CPLSettings> {
    const { data, error } = await supabase
      .from("cpl_settings")
      .upsert(settings, {
        onConflict: "account_id",
      })
      .select()
      .single();

    if (error) {
      console.error("Error upserting CPL settings:", error);
      throw error;
    }

    return data;
  },

  /**
   * Get campaign health status based on CPL
   */
  getCampaignHealth(
    campaignType: string | null,
    cpl: number | null,
    leads: number | null,
    spend: number | null,
    settings: CPLSettings | null
  ): "green" | "yellow" | "red" {
    // Red if campaign has spend but no leads
    if (spend && spend > 0 && (!leads || leads === 0)) {
      return "red";
    }

    // Green if no spend or no CPL data yet
    if (!cpl || cpl === 0) {
      return "green";
    }

    // Use default settings if none provided
    const effectiveSettings = settings || {
      ...DEFAULT_CPL_SETTINGS,
      id: "",
      account_id: null,
      created_at: null,
      updated_at: null,
    };

    let idealCPL: number;
    switch (campaignType) {
      case "mcmv":
        idealCPL = effectiveSettings.cpl_mcmv || DEFAULT_CPL_SETTINGS.cpl_mcmv;
        break;
      case "medio":
        idealCPL = effectiveSettings.cpl_medio || DEFAULT_CPL_SETTINGS.cpl_medio;
        break;
      case "alto":
        idealCPL = effectiveSettings.cpl_alto || DEFAULT_CPL_SETTINGS.cpl_alto;
        break;
      default:
        // For unclassified campaigns, use a reasonable threshold
        idealCPL = effectiveSettings.cpl_medio || DEFAULT_CPL_SETTINGS.cpl_medio;
    }

    const marginPercent = effectiveSettings.margem_amarelo || DEFAULT_CPL_SETTINGS.margem_amarelo;
    const yellowThreshold = idealCPL * (1 + marginPercent / 100);

    if (cpl <= idealCPL) {
      return "green";
    } else if (cpl <= yellowThreshold) {
      return "yellow";
    } else {
      return "red";
    }
  },
};

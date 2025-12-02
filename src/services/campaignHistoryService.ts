import { supabase } from "@/integrations/supabase/client";

export interface CampaignHistoryRecord {
  id: string;
  account_id: string;
  campaign_id: string;
  campaign_name: string;
  campaign_type: string | null;
  date: string;
  spend: number | null;
  leads: number | null;
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  cpc: number | null;
  cpl: number | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export const campaignHistoryService = {
  /**
   * Get campaign history for a specific account
   */
  async getCampaignHistory(accountId: string, days: number = 30): Promise<CampaignHistoryRecord[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from("campaign_history")
      .select("*")
      .eq("account_id", accountId)
      .gte("date", startDate.toISOString().split("T")[0])
      .order("date", { ascending: false });

    if (error) {
      console.error("Error fetching campaign history:", error);
      throw error;
    }

    return data || [];
  },

  /**
   * Get history for a specific campaign
   */
  async getCampaignHistoryById(campaignId: string, days: number = 30): Promise<CampaignHistoryRecord[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from("campaign_history")
      .select("*")
      .eq("campaign_id", campaignId)
      .gte("date", startDate.toISOString().split("T")[0])
      .order("date", { ascending: false });

    if (error) {
      console.error("Error fetching campaign history:", error);
      throw error;
    }

    return data || [];
  },

  /**
   * Update campaign classification
   */
  async updateCampaignType(
    accountId: string,
    campaignId: string,
    campaignType: string
  ): Promise<void> {
    const { error } = await supabase
      .from("campaign_history")
      .update({ campaign_type: campaignType })
      .eq("account_id", accountId)
      .eq("campaign_id", campaignId);

    if (error) {
      console.error("Error updating campaign type:", error);
      throw error;
    }
  },

  /**
   * Get latest record for each campaign in an account
   */
  async getLatestCampaigns(accountId: string): Promise<CampaignHistoryRecord[]> {
    const { data, error } = await supabase
      .from("campaign_history")
      .select("*")
      .eq("account_id", accountId)
      .order("date", { ascending: false });

    if (error) {
      console.error("Error fetching latest campaigns:", error);
      throw error;
    }

    // Group by campaign_id and get the most recent record
    const latestByCampaign = new Map<string, CampaignHistoryRecord>();
    data?.forEach((record) => {
      if (!latestByCampaign.has(record.campaign_id)) {
        latestByCampaign.set(record.campaign_id, record);
      }
    });

    return Array.from(latestByCampaign.values());
  },
};

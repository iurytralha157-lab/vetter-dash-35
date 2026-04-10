import { supabase } from "@/integrations/supabase/client";

async function callEvolution(action: string, params: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("evolution-api", {
    body: { action, ...params },
  });

  if (error) throw new Error(error.message || "Evolution API call failed");
  if (data?.error) throw new Error(data.error);
  return data;
}

export interface LinkedInstance {
  id: string;
  instance_name: string;
  display_name: string | null;
  linked_by: string | null;
  created_at: string;
}

export const evolutionApiService = {
  /** List only instances linked to this system */
  async listLinkedInstances(): Promise<LinkedInstance[]> {
    return callEvolution("list-linked");
  },

  /** List ALL instances from Evolution API (for linking dialog) */
  async listAllEvolutionInstances() {
    return callEvolution("list-all-evolution");
  },

  /** Link an existing Evolution instance to this system */
  async linkInstance(instanceName: string, displayName?: string) {
    return callEvolution("link-instance", { instanceName, displayName });
  },

  /** Unlink an instance from this system */
  async unlinkInstance(instanceName: string) {
    return callEvolution("unlink-instance", { instanceName });
  },

  async getInstanceStatus(instanceName: string) {
    return callEvolution("instance-status", { instanceName });
  },

  async createInstance(instanceName: string, number?: string) {
    return callEvolution("create-instance", { instanceName, number, qrcode: true });
  },

  async connectInstance(instanceName: string) {
    return callEvolution("connect-instance", { instanceName });
  },

  async listGroups(instanceName: string) {
    return callEvolution("list-groups", { instanceName });
  },

  async getGroupParticipants(instanceName: string, groupJid: string) {
    return callEvolution("group-participants", { instanceName, groupJid });
  },

  async sendText(instanceName: string, number: string, text: string) {
    return callEvolution("send-text", { instanceName, number, text });
  },

  async sendGroupMessage(instanceName: string, groupJid: string, text: string) {
    return callEvolution("send-group", { instanceName, groupJid, text });
  },

  /** Sync groups from Evolution API to DB */
  async syncGroups(instanceName: string) {
    return callEvolution("sync-groups", { instanceName });
  },

  /** List saved groups from DB */
  async listSavedGroups(): Promise<{ id: string; instance_name: string; group_jid: string; group_name: string; size: number }[]> {
    return callEvolution("list-saved-groups");
  },

  async sendMedia(
    instanceName: string,
    number: string,
    mediatype: "image" | "document" | "video" | "audio",
    media: string,
    caption?: string,
    fileName?: string
  ) {
    return callEvolution("send-media", {
      instanceName, number, mediatype, media, caption, fileName,
    });
  },
};

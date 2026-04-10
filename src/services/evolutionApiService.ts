import { supabase } from "@/integrations/supabase/client";

async function callEvolution(action: string, params: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("evolution-api", {
    body: { action, ...params },
  });

  if (error) throw new Error(error.message || "Evolution API call failed");
  if (data?.error) throw new Error(data.error);
  return data;
}

export const evolutionApiService = {
  /** List all connected WhatsApp instances */
  async listInstances() {
    return callEvolution("list-instances");
  },

  /** Get connection status of an instance */
  async getInstanceStatus(instanceName: string) {
    return callEvolution("instance-status", { instanceName });
  },

  /** List all groups for an instance */
  async listGroups(instanceName: string) {
    return callEvolution("list-groups", { instanceName });
  },

  /** Get participants of a group */
  async getGroupParticipants(instanceName: string, groupJid: string) {
    return callEvolution("group-participants", { instanceName, groupJid });
  },

  /** Send a text message to a number */
  async sendText(instanceName: string, number: string, text: string) {
    return callEvolution("send-text", { instanceName, number, text });
  },

  /** Send a text message to a group */
  async sendGroupMessage(instanceName: string, groupJid: string, text: string) {
    return callEvolution("send-group", { instanceName, groupJid, text });
  },

  /** Send media (image, document, etc.) */
  async sendMedia(
    instanceName: string,
    number: string,
    mediatype: "image" | "document" | "video" | "audio",
    media: string, // URL or base64
    caption?: string,
    fileName?: string
  ) {
    return callEvolution("send-media", {
      instanceName,
      number,
      mediatype,
      media,
      caption,
      fileName,
    });
  },
};

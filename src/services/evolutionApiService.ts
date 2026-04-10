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
  async listInstances() {
    return callEvolution("list-instances");
  },

  async getInstanceStatus(instanceName: string) {
    return callEvolution("instance-status", { instanceName });
  },

  /** Create a new WhatsApp instance */
  async createInstance(instanceName: string, number?: string) {
    return callEvolution("create-instance", { instanceName, number, qrcode: true });
  },

  /** Get QR code / connect an instance */
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

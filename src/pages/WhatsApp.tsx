import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { evolutionApiService } from "@/services/evolutionApiService";
import { WhatsAppInstanceCard } from "@/components/whatsapp/WhatsAppInstanceCard";
import { WhatsAppGroupsList } from "@/components/whatsapp/WhatsAppGroupsList";
import { WhatsAppSendDialog } from "@/components/whatsapp/WhatsAppSendDialog";
import { AddInstanceDialog } from "@/components/whatsapp/AddInstanceDialog";
import { ConnectInstanceDialog } from "@/components/whatsapp/ConnectInstanceDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MessageSquare, Plus, Unplug, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function WhatsApp() {
  const queryClient = useQueryClient();
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [sendTarget, setSendTarget] = useState<{ type: "number" | "group"; id: string; name: string } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [connectInstance, setConnectInstance] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const { data: linkedInstances, isLoading } = useQuery({
    queryKey: ["whatsapp-linked-instances"],
    queryFn: () => evolutionApiService.listLinkedInstances(),
  });

  const handleSendMessage = (type: "number" | "group", id: string, name: string) => {
    setSendTarget({ type, id, name });
    setSendDialogOpen(true);
  };

  const handleUnlink = async (instanceName: string) => {
    try {
      await evolutionApiService.unlinkInstance(instanceName);
      toast.success(`Instância "${instanceName}" desvinculada`);
      if (selectedInstance === instanceName) setSelectedInstance(null);
      queryClient.invalidateQueries({ queryKey: ["whatsapp-linked-instances"] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSyncGroups = async () => {
    setSyncing(true);
    try {
      for (const inst of instances) {
        await evolutionApiService.syncGroups(inst.instance_name);
      }
      toast.success("Grupos sincronizados com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao sincronizar: " + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleInstanceAdded = async () => {
    queryClient.invalidateQueries({ queryKey: ["whatsapp-linked-instances"] });
    // Auto-sync groups after adding instance
    setTimeout(async () => {
      try {
        const result = await evolutionApiService.listLinkedInstances();
        for (const inst of result) {
          await evolutionApiService.syncGroups(inst.instance_name);
        }
      } catch (e) {
        console.warn("Auto-sync failed:", e);
      }
    }, 1000);
  };

  const instances = linkedInstances || [];

  return (
    <AppLayout>
      <PageHeader
        title="WhatsApp"
        subtitle="Gerencie instâncias vinculadas, grupos e envie mensagens"
      />

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Instâncias Vinculadas ({instances.length})
          </h2>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Conectar Instância
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : instances.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <Unplug className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">
              Nenhuma instância vinculada ao sistema.
            </p>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Conectar Instância
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {instances.map((inst) => (
              <WhatsAppInstanceCard
                key={inst.id}
                instance={inst}
                isSelected={selectedInstance === inst.instance_name}
                onSelect={(name) => setSelectedInstance(prev => prev === name ? null : name)}
                onConnect={(name) => setConnectInstance(name)}
                onUnlink={handleUnlink}
              />
            ))}
          </div>
        )}
      </div>

      {selectedInstance && (
        <WhatsAppGroupsList
          instanceName={selectedInstance}
          onSendMessage={(groupJid, groupName) => handleSendMessage("group", groupJid, groupName)}
        />
      )}

      <WhatsAppSendDialog
        open={sendDialogOpen}
        onOpenChange={setSendDialogOpen}
        instanceName={selectedInstance || ""}
        target={sendTarget}
      />

      <AddInstanceDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdded={() => queryClient.invalidateQueries({ queryKey: ["whatsapp-linked-instances"] })}
      />

      {connectInstance && (
        <ConnectInstanceDialog
          open={!!connectInstance}
          onOpenChange={(open) => { if (!open) setConnectInstance(null); }}
          instanceName={connectInstance}
        />
      )}
    </AppLayout>
  );
}

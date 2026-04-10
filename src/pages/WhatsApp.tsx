import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { evolutionApiService } from "@/services/evolutionApiService";
import { WhatsAppInstanceCard } from "@/components/whatsapp/WhatsAppInstanceCard";
import { WhatsAppGroupsList } from "@/components/whatsapp/WhatsAppGroupsList";
import { WhatsAppSendDialog } from "@/components/whatsapp/WhatsAppSendDialog";
import { CreateInstanceDialog } from "@/components/whatsapp/CreateInstanceDialog";
import { ConnectInstanceDialog } from "@/components/whatsapp/ConnectInstanceDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MessageSquare, Plus } from "lucide-react";

export default function WhatsApp() {
  const queryClient = useQueryClient();
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [sendTarget, setSendTarget] = useState<{ type: "number" | "group"; id: string; name: string } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [connectInstance, setConnectInstance] = useState<string | null>(null);

  const { data: instances, isLoading: loadingInstances } = useQuery({
    queryKey: ["evolution-instances"],
    queryFn: () => evolutionApiService.listInstances(),
  });

  const handleSendMessage = (type: "number" | "group", id: string, name: string) => {
    setSendTarget({ type, id, name });
    setSendDialogOpen(true);
  };

  const instanceList = Array.isArray(instances) ? instances : instances ? [instances] : [];

  return (
    <AppLayout>
      <PageHeader
        title="WhatsApp"
        subtitle="Gerencie instâncias, grupos e envie mensagens via Evolution API"
      />

      {/* Instances */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Instâncias ({instanceList.length})
          </h2>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Nova Instância
          </Button>
        </div>

        {loadingInstances ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2].map(i => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : instanceList.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
            Nenhuma instância encontrada. Clique em "Nova Instância" para criar uma.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {instanceList.map((inst: any, idx: number) => (
              <WhatsAppInstanceCard
                key={inst?.instance?.instanceName || inst?.instanceName || idx}
                instance={inst}
                isSelected={selectedInstance === (inst?.instance?.instanceName || inst?.instanceName)}
                onSelect={(name) => setSelectedInstance(prev => prev === name ? null : name)}
                onConnect={(name) => setConnectInstance(name)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Groups */}
      {selectedInstance && (
        <WhatsAppGroupsList
          instanceName={selectedInstance}
          onSendMessage={(groupJid, groupName) => handleSendMessage("group", groupJid, groupName)}
        />
      )}

      {/* Dialogs */}
      <WhatsAppSendDialog
        open={sendDialogOpen}
        onOpenChange={setSendDialogOpen}
        instanceName={selectedInstance || ""}
        target={sendTarget}
      />

      <CreateInstanceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ["evolution-instances"] })}
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

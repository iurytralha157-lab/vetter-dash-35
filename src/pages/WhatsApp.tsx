import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { evolutionApiService } from "@/services/evolutionApiService";
import { toast } from "sonner";
import { WhatsAppInstanceCard } from "@/components/whatsapp/WhatsAppInstanceCard";
import { WhatsAppGroupsList } from "@/components/whatsapp/WhatsAppGroupsList";
import { WhatsAppSendDialog } from "@/components/whatsapp/WhatsAppSendDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare } from "lucide-react";

export default function WhatsApp() {
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [sendTarget, setSendTarget] = useState<{ type: "number" | "group"; id: string; name: string } | null>(null);

  const { data: instances, isLoading: loadingInstances } = useQuery({
    queryKey: ["evolution-instances"],
    queryFn: () => evolutionApiService.listInstances(),
  });

  const handleSendMessage = (type: "number" | "group", id: string, name: string) => {
    setSendTarget({ type, id, name });
    setSendDialogOpen(true);
  };

  return (
    <AppLayout>
      <PageHeader
        title="WhatsApp"
        subtitle="Gerencie instâncias, grupos e envie mensagens via Evolution API"
      />

      {/* Instances */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Instâncias
        </h2>
        {loadingInstances ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2].map(i => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : !instances || (Array.isArray(instances) && instances.length === 0) ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
            Nenhuma instância encontrada. Verifique sua Evolution API.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(Array.isArray(instances) ? instances : [instances]).map((inst: any) => (
              <WhatsAppInstanceCard
                key={inst.instance?.instanceName || inst.instanceName || JSON.stringify(inst)}
                instance={inst}
                isSelected={selectedInstance === (inst.instance?.instanceName || inst.instanceName)}
                onSelect={(name) => setSelectedInstance(prev => prev === name ? null : name)}
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

      {/* Send Dialog */}
      <WhatsAppSendDialog
        open={sendDialogOpen}
        onOpenChange={setSendDialogOpen}
        instanceName={selectedInstance || ""}
        target={sendTarget}
      />
    </AppLayout>
  );
}

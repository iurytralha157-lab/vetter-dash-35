import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChecklistTab } from "@/components/demandas/ChecklistTab";
import { DemandasTab } from "@/components/demandas/DemandasTab";
import { ClipboardCheck, Kanban } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Demandas() {
  const [activeTab, setActiveTab] = useState("checklist");

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Demandas"
          breadcrumb="Gestão de Tarefas"
          subtitle={format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
          icon={<Kanban className="h-6 w-6" />}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="checklist" className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Checklist Diário
            </TabsTrigger>
            <TabsTrigger value="demandas" className="flex items-center gap-2">
              <Kanban className="h-4 w-4" />
              Quadro de Demandas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="checklist">
            <ChecklistTab />
          </TabsContent>

          <TabsContent value="demandas">
            <DemandasTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

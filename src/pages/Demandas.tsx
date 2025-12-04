import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChecklistTab } from "@/components/demandas/ChecklistTab";
import { DemandasTab } from "@/components/demandas/DemandasTab";
import { ClipboardCheck, Kanban, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Demandas() {
  const [activeTab, setActiveTab] = useState("checklist");

  return (
    <AppLayout>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Kanban className="h-6 w-6 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Demandas
          </h1>
        </div>
        <p className="text-muted-foreground">
          {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

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
    </AppLayout>
  );
}

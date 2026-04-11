import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { FunnelSummaryCards } from "@/components/feedbackFunnel/FunnelSummaryCards";
import { FunnelFilters } from "@/components/feedbackFunnel/FunnelFilters";
import { FunnelTable } from "@/components/feedbackFunnel/FunnelTable";
import { FunnelDetailDialog } from "@/components/feedbackFunnel/FunnelDetailDialog";
import { fetchFeedbackFunnel, fetchFeedbackFunnelStats, fetchAccountsMap, type FeedbackFunnelFilters } from "@/services/feedbackFunnelService";
import { MessageSquareText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function FeedbackFunnel() {
  const [filters, setFilters] = useState<FeedbackFunnelFilters>({});
  const [selectedRow, setSelectedRow] = useState<any | null>(null);

  const { data: accountsMap = {} } = useQuery({
    queryKey: ["accounts-map"],
    queryFn: fetchAccountsMap,
    staleTime: 60_000,
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["feedback-funnel", filters],
    queryFn: () => fetchFeedbackFunnel(filters),
  });

  const { data: stats } = useQuery({
    queryKey: ["feedback-funnel-stats", filters.account_id],
    queryFn: () => fetchFeedbackFunnelStats(filters.account_id),
  });

  // Enrich rows with account name
  const enrichedRows = rows.map((r: any) => ({
    ...r,
    _account_name: r.account_id ? accountsMap[r.account_id] || "—" : "—",
  }));

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Follow-up Funil"
          breadcrumb="Feedback de Vendas"
          subtitle="Mensagens de follow-up interpretadas pela IA"
          icon={<MessageSquareText className="h-6 w-6" />}
        />

        {stats && <FunnelSummaryCards stats={stats} />}

        <FunnelFilters filters={filters} onChange={setFilters} accountsMap={accountsMap} />

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (
          <FunnelTable rows={enrichedRows} onViewDetail={setSelectedRow} />
        )}

        <FunnelDetailDialog
          row={selectedRow}
          open={!!selectedRow}
          onOpenChange={(open) => !open && setSelectedRow(null)}
        />
      </div>
    </AppLayout>
  );
}

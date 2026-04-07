import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { MetaStatusBadge } from "./MetaStatusBadge";
import { MetaCampaignCard } from "./MetaCampaignCard";
import { MetaCampaignDetailDialog } from "./MetaCampaignDetailDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import type { MetaCampaign } from "@/types/meta";

interface MetaCampaignTableProps {
  campaigns: MetaCampaign[];
  loading: boolean;
}

export function MetaCampaignTable({ campaigns, loading }: MetaCampaignTableProps) {
  const isMobile = useIsMobile();
  const [selectedCampaign, setSelectedCampaign] = useState<MetaCampaign | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCampaignClick = (campaign: MetaCampaign) => {
    setSelectedCampaign(campaign);
    setDialogOpen(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const getPerformanceIndicator = (ctr: number) => {
    if (ctr >= 2) {
      return <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />;
    } else if (ctr >= 1) {
      return <Minus className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />;
    } else {
      return <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />;
    }
  };

  const openInMetaAdsManager = (campaignId: string) => {
    window.open(`https://business.facebook.com/adsmanager/manage/campaigns?act=${campaignId}`, '_blank');
  };

  if (loading) {
    if (isMobile) {
      return (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-2">Nenhuma campanha encontrada</p>
        <p className="text-sm text-muted-foreground">
          Verifique se o ID da conta Meta está correto nas configurações
        </p>
      </div>
    );
  }

  // Mobile view - cards
  if (isMobile) {
    return (
      <>
        <div className="space-y-3">
          {campaigns.map((campaign) => (
            <div key={campaign.id} onClick={() => handleCampaignClick(campaign)} className="cursor-pointer">
              <MetaCampaignCard campaign={campaign} />
            </div>
          ))}
        </div>
        <MetaCampaignDetailDialog 
          campaign={selectedCampaign}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      </>
    );
  }

  // Desktop view - table
  return (
    <>
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Campanha</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Orçamento</TableHead>
              <TableHead className="text-right">Gasto</TableHead>
              <TableHead className="text-right">Impressões</TableHead>
              <TableHead className="text-right">Cliques</TableHead>
              <TableHead className="text-right">Hookrate</TableHead>
                <TableCell className="text-right font-semibold">
                  {campaign.insights ? formatNumber(campaign.insights.conversions) : '-'}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      openInMetaAdsManager(campaign.id);
                    }}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <MetaCampaignDetailDialog 
        campaign={selectedCampaign}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}

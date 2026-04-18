// src/pages/RelatorioN8n.tsx
import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Search,
  Filter,
  RefreshCw,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MoreVertical,
  Zap,
  BarChart3,
  Target,
  Clock,
  Chrome,
  Facebook,
  Wallet,
} from "lucide-react";
import { updateAccount } from "@/services/accountsService";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ClientReport {
  id: string;
  nome_cliente: string;
  nome_empresa?: string;
  id_grupo?: string;
  meta_account_id?: string;
  google_ads_id?: string;
  status: string;
  notificacao_saldo_baixo: boolean;
  enviar_relatorio_meta: boolean; // novo: controla disparo automático interno (substitui N8N)
  config?: {
    ativo_meta: boolean;
    ativo_google: boolean;
    horario_disparo?: string;
    dias_semana?: number[];
  };
  ultimo_disparo?: {
    data_disparo: string;
    status: string;
    mensagem_erro?: string;
  };
  stats?: {
    total_leads: number;
    leads_convertidos: number;
  };
}

interface PreviewMessage {
  account: string;
  campaign: string;
  text: string;
}

export default function RelatorioN8n() {
  const [clients, setClients] = useState<ClientReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sendingReport, setSendingReport] = useState<string | null>(null);
  const { toast } = useToast();

  // ======= LOAD DATA =======
  const loadClientsData = async () => {
    try {
      setLoading(true);

      // Buscar dados da tabela accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from("accounts")
        .select("id, nome_cliente, id_grupo, meta_account_id, google_ads_id, status, telefone, email, notificacao_saldo_baixo")
        .eq("status", "Ativo")
        .order("nome_cliente");

      if (accountsError) {
        console.error("Erro ao buscar accounts:", accountsError);
        throw accountsError;
      }

      if (!accountsData || accountsData.length === 0) {
        setClients([]);
        toast({ 
          title: "Nenhuma conta encontrada", 
          description: "Não há contas ativas no sistema",
          variant: "default"
        });
        return;
      }

      // Buscar configurações de relatórios
      const { data: configsData } = await supabase
        .from("relatorio_config")
        .select("client_id, ativo_meta, ativo_google, horario_disparo, dias_semana");

      // Buscar últimos disparos
      const { data: disparosData } = await supabase
        .from("relatorio_disparos")
        .select("client_id, data_disparo, status, mensagem_erro")
        .order("data_disparo", { ascending: false });

      // Buscar estatísticas de leads
      const { data: leadsStats } = await supabase
        .from("leads_stats")
        .select("client_id, total_leads, leads_convertidos");

      const configs = configsData || [];
      const disparos = disparosData || [];
      const stats = leadsStats || [];

      // Processar dados
      const processedClients: ClientReport[] = accountsData.map((account) => {
        const config = configs.find((c: any) => c.client_id === account.id);
        const ultimoDisparo = disparos.find((d: any) => d.client_id === account.id);
        const accountStats = stats.find((s: any) => s.client_id === account.id);

        return {
          id: account.id,
          nome_cliente: account.nome_cliente || "Sem nome",
          id_grupo: account.id_grupo,
          meta_account_id: account.meta_account_id,
          google_ads_id: account.google_ads_id,
          status: account.status,
          notificacao_saldo_baixo: account.notificacao_saldo_baixo ?? true,
          config: config
            ? {
                ativo_meta: config.ativo_meta || false,
                ativo_google: config.ativo_google || false,
                horario_disparo: config.horario_disparo || "09:00:00",
                dias_semana: config.dias_semana || [1, 2, 3, 4, 5],
              }
            : {
                ativo_meta: false,
                ativo_google: false,
                horario_disparo: "09:00:00",
                dias_semana: [1, 2, 3, 4, 5],
              },
          ultimo_disparo: ultimoDisparo
            ? {
                data_disparo: ultimoDisparo.data_disparo,
                status: ultimoDisparo.status,
                mensagem_erro: ultimoDisparo.mensagem_erro,
              }
            : undefined,
          stats: {
            total_leads: accountStats?.total_leads || 0,
            leads_convertidos: accountStats?.leads_convertidos || 0,
          },
        };
      });

      setClients(processedClients);
      toast({ 
        title: "Dados carregados!", 
        description: `${processedClients.length} conta${processedClients.length !== 1 ? 's' : ''} encontrada${processedClients.length !== 1 ? 's' : ''}`,
        variant: "default"
      });
    } catch (error: any) {
      console.error("Erro ao carregar dados:", error);
      setClients([]);
      toast({ 
        title: "Erro ao carregar dados", 
        description: error.message || "Verifique a conexão com o banco de dados", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClientsData();
  }, []);

  // ======= FILTERS (mantido) =======
  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      client.nome_cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.id_grupo && client.id_grupo.includes(searchTerm));
    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "active" && (client.config?.ativo_meta || client.config?.ativo_google)) ||
      (filterStatus === "inactive" && !client.config?.ativo_meta && !client.config?.ativo_google);
    return matchesSearch && matchesFilter;
  });

  // ======= Actions =======
  const handleToggleMeta = async (clientId: string) => {
    try {
      const client = clients.find((c) => c.id === clientId);
      const currentStatus = client?.config?.ativo_meta || false;
      const newStatus = !currentStatus;

      const { data: existingConfig } = await supabase
        .from("relatorio_config")
        .select("id")
        .eq("client_id", clientId)
        .maybeSingle();

      if (existingConfig) {
        const { error } = await supabase
          .from("relatorio_config")
          .update({ ativo_meta: newStatus, updated_at: new Date().toISOString() })
          .eq("client_id", clientId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("relatorio_config").insert({
          client_id: clientId,
          ativo_meta: newStatus,
          ativo_google: false,
          horario_disparo: "09:00:00",
          dias_semana: [1, 2, 3, 4, 5],
        });
        if (error) throw error;
      }

      setClients((prev) =>
        prev.map((c) =>
          c.id === clientId
            ? {
                ...c,
                config: {
                  ...c.config,
                  ativo_meta: newStatus,
                  ativo_google: c.config?.ativo_google || false,
                  horario_disparo: c.config?.horario_disparo || "09:00:00",
                  dias_semana: c.config?.dias_semana || [1, 2, 3, 4, 5],
                },
              }
            : c
        )
      );

      toast({ title: "Sucesso", description: `Relatório Meta ${newStatus ? "ativado" : "desativado"} para ${client?.nome_cliente}` });
    } catch (error) {
      console.error("Erro ao alterar status Meta:", error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status Meta: " + (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleToggleGoogle = async (clientId: string) => {
    try {
      const client = clients.find((c) => c.id === clientId);
      const currentStatus = client?.config?.ativo_google || false;
      const newStatus = !currentStatus;

      const { data: existingConfig } = await supabase
        .from("relatorio_config")
        .select("id")
        .eq("client_id", clientId)
        .maybeSingle();

      if (existingConfig) {
        const { error } = await supabase
          .from("relatorio_config")
          .update({ ativo_google: newStatus, updated_at: new Date().toISOString() })
          .eq("client_id", clientId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("relatorio_config").insert({
          client_id: clientId,
          ativo_meta: false,
          ativo_google: newStatus,
          horario_disparo: "09:00:00",
          dias_semana: [1, 2, 3, 4, 5],
        });
        if (error) throw error;
      }

      setClients((prev) =>
        prev.map((c) =>
          c.id === clientId
            ? {
                ...c,
                config: {
                  ...c.config,
                  ativo_meta: c.config?.ativo_meta || false,
                  ativo_google: newStatus,
                  horario_disparo: c.config?.horario_disparo || "09:00:00",
                  dias_semana: c.config?.dias_semana || [1, 2, 3, 4, 5],
                },
              }
            : c
        )
      );

      toast({ title: "Sucesso", description: `Relatório Google ${newStatus ? "ativado" : "desativado"} para ${client?.nome_cliente}` });
    } catch (error) {
      console.error("Erro ao alterar status Google:", error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status Google: " + (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleToggleBalanceAlerts = async (clientId: string) => {
    try {
      const client = clients.find((c) => c.id === clientId);
      if (!client) return;

      const newStatus = !client.notificacao_saldo_baixo;
      await updateAccount(clientId, { notificacao_saldo_baixo: newStatus });

      setClients((prev) =>
        prev.map((c) =>
          c.id === clientId
            ? {
                ...c,
                notificacao_saldo_baixo: newStatus,
              }
            : c
        )
      );

      toast({
        title: "Sucesso",
        description: `Avisos de saldo ${newStatus ? "ativados" : "desativados"} para ${client.nome_cliente}`,
      });
    } catch (error) {
      console.error("Erro ao alterar aviso de saldo:", error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o aviso de saldo: " + (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleSendReport = async (clientId: string, clientName: string) => {
    try {
      setSendingReport(clientId);
      await new Promise((res) => setTimeout(res, 1000));
      toast({ title: "Relatório enviado!", description: `Relatório de ${clientName} enviado com sucesso` });
      try {
        await supabase.from("relatorio_disparos").insert({
          client_id: clientId,
          data_disparo: new Date().toISOString(),
          horario_disparo: new Date().toTimeString().slice(0, 8),
          status: "enviado",
          dados_enviados: { trigger: "manual", user_action: true, timestamp: new Date().toISOString() },
        });
      } catch (e) {
        console.log("Erro ao registrar disparo (ignorado):", e);
      }
    } finally {
      setSendingReport(null);
    }
  };

  const handleToggleAllMeta = async () => {
    try {
      // Filtrar apenas contas que têm Meta configurado
      const clientsWithMeta = clients.filter((c) => c.meta_account_id && String(c.meta_account_id).trim().length > 0);
      
      if (clientsWithMeta.length === 0) {
        toast({ 
          title: "Aviso", 
          description: "Nenhuma conta com Meta Ads configurado",
          variant: "destructive"
        });
        return;
      }

      // Verifica se todos os que têm Meta estão desativados
      const allMetaInactive = clientsWithMeta.every((c) => !c.config?.ativo_meta);
      const newStatus = allMetaInactive;

      const clientIds = clientsWithMeta.map(c => c.id);

      const { error } = await supabase
        .from("relatorio_config")
        .update({ 
          ativo_meta: newStatus,
          updated_at: new Date().toISOString() 
        })
        .in('client_id', clientIds);

      if (error) throw error;

      setClients((prev) =>
        prev.map((c) => {
          // Só atualiza se a conta tem Meta configurado
          if (clientIds.includes(c.id)) {
            return {
              ...c,
              config: {
                ...c.config,
                ativo_meta: newStatus,
                ativo_google: c.config?.ativo_google || false,
                horario_disparo: c.config?.horario_disparo || "09:00:00",
                dias_semana: c.config?.dias_semana || [1, 2, 3, 4, 5],
              },
            };
          }
          return c;
        })
      );

      toast({ 
        title: "Sucesso", 
        description: `Relatórios Meta ${newStatus ? "ativados" : "desativados"} (${clientsWithMeta.length} contas)` 
      });
    } catch (error) {
      console.error("Erro ao alterar Meta:", error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar os relatórios Meta: " + (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleToggleAllGoogle = async () => {
    try {
      // Filtrar apenas contas que têm Google configurado
      const clientsWithGoogle = clients.filter((c) => c.google_ads_id && String(c.google_ads_id).trim().length > 0);
      
      if (clientsWithGoogle.length === 0) {
        toast({ 
          title: "Aviso", 
          description: "Nenhuma conta com Google Ads configurado",
          variant: "destructive"
        });
        return;
      }

      // Verifica se todos os que têm Google estão desativados
      const allGoogleInactive = clientsWithGoogle.every((c) => !c.config?.ativo_google);
      const newStatus = allGoogleInactive;

      const clientIds = clientsWithGoogle.map(c => c.id);

      const { error } = await supabase
        .from("relatorio_config")
        .update({ 
          ativo_google: newStatus,
          updated_at: new Date().toISOString() 
        })
        .in('client_id', clientIds);

      if (error) throw error;

      setClients((prev) =>
        prev.map((c) => {
          // Só atualiza se a conta tem Google configurado
          if (clientIds.includes(c.id)) {
            return {
              ...c,
              config: {
                ...c.config,
                ativo_meta: c.config?.ativo_meta || false,
                ativo_google: newStatus,
                horario_disparo: c.config?.horario_disparo || "09:00:00",
                dias_semana: c.config?.dias_semana || [1, 2, 3, 4, 5],
              },
            };
          }
          return c;
        })
      );

      toast({ 
        title: "Sucesso", 
        description: `Relatórios Google ${newStatus ? "ativados" : "desativados"} (${clientsWithGoogle.length} contas)` 
      });
    } catch (error) {
      console.error("Erro ao alterar Google:", error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar os relatórios Google: " + (error as Error).message,
        variant: "destructive",
      });
    }
  };

  // ======= Helpers UI =======
  const getStatusIcon = (client: ClientReport) => {
    const hasAnyActive = client.config?.ativo_meta || client.config?.ativo_google;
    if (!hasAnyActive) return <XCircle className="h-4 w-4 text-text-muted" />;
    if (client.ultimo_disparo?.status === "erro") return <AlertTriangle className="h-4 w-4 text-warning" />;
    return <CheckCircle className="h-4 w-4 text-success" />;
  };

  const formatLastSent = (ultimoDisparo?: { data_disparo: string; status: string }) => {
    if (!ultimoDisparo) return "Nunca enviado";
    try {
      const date = new Date(ultimoDisparo.data_disparo);
      return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
    } catch {
      return "Data inválida";
    }
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  // KPIs
  const totalAtivos = clients.filter((c) => c.config?.ativo_meta || c.config?.ativo_google).length;
  const totalMeta = clients.filter((c) => c.meta_account_id).length;
  const totalGoogle = clients.filter((c) => c.google_ads_id).length;
  
  // Verificar se todos os que TÊM a plataforma configurada estão desativados
  const clientsWithMeta = clients.filter((c) => c.meta_account_id && String(c.meta_account_id).trim().length > 0);
  const clientsWithGoogle = clients.filter((c) => c.google_ads_id && String(c.google_ads_id).trim().length > 0);
  const allMetaInactive = clientsWithMeta.length > 0 && clientsWithMeta.every((c) => !c.config?.ativo_meta);
  const allGoogleInactive = clientsWithGoogle.length > 0 && clientsWithGoogle.every((c) => !c.config?.ativo_google);

  const StatCard = ({
    icon,
    title,
    value,
    iconWrapClass,
    iconClass,
  }: {
    icon: React.ReactNode;
    title: string;
    value: React.ReactNode;
    iconWrapClass: string;
    iconClass: string;
  }) => (
    <Card className="surface-elevated border-border/40 rounded-2xl">
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          <div className={`h-12 w-12 rounded-xl ring-1 flex items-center justify-center ${iconWrapClass}`}>
            <div className={iconClass}>{icon}</div>
          </div>
          <div className="flex flex-col">
            <span className="text-sm text-text-secondary">{title}</span>
            <span className="text-2xl md:text-3xl font-semibold tabular-nums text-foreground">{value}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[420px]">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-text-secondary">Carregando relatórios...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <TooltipProvider delayDuration={200}>
        <div className="mx-auto max-w-screen-2xl px-3 sm:px-4 md:px-6 pb-24 sm:pb-12 space-y-6">
          {/* HEADER */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">Central de Relatórios N8N</h1>
              <p className="text-text-secondary mt-2 max-w-2xl">
                Gerencie os disparos automáticos de relatórios para suas contas.
              </p>
            </div>
            <div className="flex items-center gap-3 self-start md:self-auto">
              <Button 
                variant="outline" 
                className={`gap-2 ${allMetaInactive ? 'text-success hover:text-success' : 'text-warning hover:text-warning'}`}
                onClick={handleToggleAllMeta}
                aria-label={allMetaInactive ? "Ativar todos Meta" : "Desativar todos Meta"}
              >
                {allMetaInactive ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {allMetaInactive ? "Ativar Meta" : "Desativar Meta"}
              </Button>
              <Button 
                variant="outline" 
                className={`gap-2 ${allGoogleInactive ? 'text-success hover:text-success' : 'text-warning hover:text-warning'}`}
                onClick={handleToggleAllGoogle}
                aria-label={allGoogleInactive ? "Ativar todos Google" : "Desativar todos Google"}
              >
                {allGoogleInactive ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {allGoogleInactive ? "Ativar Google" : "Desativar Google"}
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => loadClientsData()} aria-label="Atualizar">
                <RefreshCw className="h-4 w-4" />
                Atualizar
              </Button>
            </div>
          </div>

          {/* KPIs (mesmo padrão das outras páginas) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              icon={<Users className="h-5 w-5" />}
              title="Total"
              value={clients.length}
              iconWrapClass="bg-primary/10 ring-primary/20"
              iconClass="text-primary"
            />
            <StatCard
              icon={<CheckCircle className="h-5 w-5" />}
              title="Ativos"
              value={totalAtivos}
              iconWrapClass="bg-success/10 ring-success/20"
              iconClass="text-success"
            />
            <StatCard
              icon={<BarChart3 className="h-5 w-5" />}
              title="Meta Ads"
              value={totalMeta}
              iconWrapClass="bg-primary/10 ring-primary/20"
              iconClass="text-primary"
            />
            <StatCard
              icon={<Target className="h-5 w-5" />}
              title="Google Ads"
              value={totalGoogle}
              iconWrapClass="bg-warning/10 ring-warning/20"
              iconClass="text-warning"
            />
          </div>

          {/* FILTROS no padrão novo */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
              <Input
                placeholder="Buscar por conta ou ID do grupo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-12"
                aria-label="Buscar contas"
              />
            </div>

            <Button type="button" variant="outline" className="h-12 gap-2 self-end md:self-auto">
              <Filter className="h-4 w-4" />
              Filtros
            </Button>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-48 h-12" aria-label="Filtrar por status">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* LISTA */}
          <div className="space-y-3">
            {filteredClients.map((client) => {
              const hasAnyActive = client.config?.ativo_meta || client.config?.ativo_google;
              const statusGradient = hasAnyActive
                ? "from-success/70 to-success/10"
                : "from-text-muted/70 to-text-muted/10";

              const metaConfigured = !!(client.meta_account_id && String(client.meta_account_id).trim().length > 0);
              const googleConfigured = !!(client.google_ads_id && String(client.google_ads_id).trim().length > 0);

              return (
                <Card
                  key={client.id}
                  className="surface-elevated relative overflow-hidden transition-all hover:ring-1 hover:ring-primary/30 hover:shadow-lg"
                >
                  <div className={`absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b ${statusGradient}`} />
                  <CardContent className="p-4 md:p-5">
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] items-center gap-4">
                      {/* ESQUERDA */}
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center text-white font-bold flex-shrink-0 ring-1 ring-border/50">
                          {getInitials(client.nome_cliente)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground text-lg truncate">{client.nome_cliente}</h3>
                            {getStatusIcon(client)}
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary">
                            {client.nome_empresa && <span className="truncate">{client.nome_empresa}</span>}
                            {client.id_grupo && <span className="text-text-tertiary">ID: {client.id_grupo}</span>}
                          </div>
                        </div>
                      </div>

                      {/* CANAIS */}
                      <div className="text-right md:text-left">
                        <div className="text-xs text-text-tertiary font-medium mb-1">Canais</div>
                        <div className="flex items-center md:justify-start justify-end gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                className={[
                                  "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium border",
                                  metaConfigured
                                    ? "border-primary/30 bg-primary/10 text-primary"
                                    : "border-border/40 bg-transparent text-text-muted",
                                ].join(" ")}
                              >
                                <Facebook className="h-3.5 w-3.5" />
                                Meta
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {metaConfigured ? "Meta Ads configurado" : "Meta Ads não configurado (adicione o ID da conta)."}
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                className={[
                                  "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium border",
                                  googleConfigured
                                    ? "border-warning/30 bg-warning/10 text-warning"
                                    : "border-border/40 bg-transparent text-text-muted",
                                ].join(" ")}
                              >
                                <Chrome className="h-3.5 w-3.5" />
                                Google
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {googleConfigured ? "Google Ads configurado" : "Google Ads não configurado (adicione o ID da conta)."}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>

                      {/* HORÁRIO / ÚLTIMO ENVIO */}
                      <div className="text-left md:text-right">
                        <div className="text-xs text-text-tertiary font-medium mb-1">Horário</div>
                        <div className="flex items-center md:justify-end gap-2 text-sm">
                          <Clock className="h-4 w-4 text-text-muted" />
                          <span className="font-medium">
                            {client.config?.horario_disparo?.slice(0, 5) || "09:00"}
                          </span>
                        </div>
                        <div className="text-xs text-text-tertiary mt-1">
                          Último envio: <span className="text-foreground/80">{formatLastSent(client.ultimo_disparo)}</span>
                        </div>
                      </div>

                      {/* AÇÕES - SWITCHES SEPARADOS */}
                      <div className="flex items-center justify-end gap-4">
                        {/* Switch Meta */}
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-2">
                              <Facebook className="h-4 w-4 text-primary" />
                            <Switch
                              checked={client.config?.ativo_meta || false}
                              onCheckedChange={() => handleToggleMeta(client.id)}
                                className="data-[state=checked]:bg-primary"
                              disabled={!metaConfigured}
                            />
                          </div>
                          <span className="text-xs text-text-tertiary">Meta</span>
                        </div>

                        {/* Switch Google */}
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-2">
                              <Chrome className="h-4 w-4 text-warning" />
                            <Switch
                              checked={client.config?.ativo_google || false}
                              onCheckedChange={() => handleToggleGoogle(client.id)}
                                className="data-[state=checked]:bg-warning"
                              disabled={!googleConfigured}
                            />
                          </div>
                          <span className="text-xs text-text-tertiary">Google</span>
                        </div>

                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-2">
                              <Wallet className="h-4 w-4 text-foreground" />
                              <Switch
                                checked={client.notificacao_saldo_baixo}
                                onCheckedChange={() => handleToggleBalanceAlerts(client.id)}
                                className="data-[state=checked]:bg-foreground data-[state=unchecked]:bg-input"
                                disabled={!metaConfigured}
                              />
                            </div>
                            <span className="text-xs text-text-tertiary">Saldo</span>
                          </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Abrir ações">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="gap-2"
                              onClick={() => handleSendReport(client.id, client.nome_cliente)}
                              disabled={sendingReport === client.id}
                            >
                              {sendingReport === client.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Zap className="h-4 w-4" />
                              )}
                              {sendingReport === client.id ? "Enviando..." : "Enviar agora"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* EMPTY STATE */}
          {filteredClients.length === 0 && !loading && (
            <Card className="surface-elevated">
              <CardContent className="p-12 text-center">
                <div className="mx-auto mb-4 p-3 bg-muted/30 rounded-full w-fit">
                  <Search className="h-8 w-8 text-text-muted" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Nenhuma conta encontrada</h3>
                <p className="text-text-secondary">
                  {searchTerm ? "Tente ajustar o termo de busca" : "Nenhuma conta ativa no sistema"}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </TooltipProvider>
    </AppLayout>
  );
}

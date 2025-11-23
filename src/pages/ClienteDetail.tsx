import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  Edit,
  Phone,
  Mail,
  Instagram,
  Globe,
  Building2,
  Plus,
  Eye,
  Users,
  Calendar,
  Activity,
  ExternalLink,
  FolderOpen,
  MapPin,
  DollarSign,
  UserCheck,
  Briefcase,
  Settings,
  CheckCircle,
  Clock,
  Pause,
  Play,
  AlertTriangle,
  Target,
  BarChart3,
  TrendingUp,
  Hash,
  FileText,
  Link as LinkIcon,
  Shield,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ClienteStatus = "Ativo" | "Pausado" | "Aguardando confirmação";

interface Cliente {
  id: string;
  nome: string;
  cnpj?: string | null;
  email?: string | null;
  telefone?: string | null;
  instagram_handle?: string | null;
  site?: string | null;
  id_grupo?: string | null;
  status: ClienteStatus;
  created_at: string;
  updated_at: string;

  // Campos do formulário completo
  razao_social?: string | null;
  nome_fantasia?: string | null;
  cnpj_cpf?: string | null;
  site_url?: string | null;
  responsavel_nome?: string | null;
  responsavel_email?: string | null;
  responsavel_whatsapp?: string | null;
  responsavel_cargo?: string | null;
  tem_gestor_marketing?: boolean;
  gestor_marketing_nome?: string | null;
  gestor_marketing_email?: string | null;
  gestor_marketing_whatsapp?: string | null;
  tem_gestor_comercial?: boolean;
  gestor_comercial_nome?: string | null;
  gestor_comercial_email?: string | null;
  gestor_comercial_whatsapp?: string | null;
  nichos?: string[] | null;
  segmentos?: string[] | null;
  cidades?: string[] | null;
  bairros_regioes?: string[] | null;
  estado?: string | null;
  cidade_regiao?: string | null;
  tem_corretor_funcionario?: boolean;
  qtd_corretores?: number | null;
  qtd_funcionarios?: number | null;
  estrutura_setores?: any;
  tem_sdr?: boolean;
  qtd_sdr_total?: number | null;
  budget_mensal?: number | null;
  distribuicao_sugerida?: any;
  crm_url?: string | null;
  crm_utilizado?: string | null;
  meta_bm_id?: string | null;
  google_ads_cid?: string | null;
  contato_preferido?: string | null;
  horarios_contato?: string | null;
  lgpd_consent?: boolean;
  observacoes_adicionais?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  archived?: boolean;
  pixel_analytics_configurado?: boolean;
  campanhas_ativas?: boolean;
  user_id?: string | null;
  role?: string | null;
}

interface Account {
  id: string;
  nome_cliente: string;
  status: string;
  meta_account_id?: string | null;
  google_ads_id?: string | null;
  usa_meta_ads?: boolean;
  usa_google_ads?: boolean;
  traqueamento_ativo?: boolean;
  saldo_meta?: number | null;
  budget_mensal_meta?: number | null;
  budget_mensal_google?: number | null;
  link_drive?: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_CONFIG = {
  Ativo: {
    color: "bg-success/20 text-success border-success/30",
    icon: CheckCircle,
    label: "Ativo",
  },
  Pausado: {
    color: "bg-warning/20 text-warning border-warning/30",
    icon: Pause,
    label: "Pausado",
  },
  "Aguardando confirmação": {
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    icon: Clock,
    label: "Aguardando Confirmação",
  },
};

export default function ClienteDetailCompleta() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadClienteData = async () => {
    if (!id) return;

    try {
      setLoading(true);

      // Buscar cliente completo
      const { data: clienteData, error: clienteError } = await supabase
        .from("clientes")
        .select("*")
        .eq("id", id)
        .single();

      if (clienteError) throw clienteError;

      // Buscar contas do cliente
      const { data: accountsData, error: accountsError } = await supabase
        .from("accounts")
        .select("*")
        .eq("cliente_id", id)
        .order("created_at", { ascending: false });

      if (accountsError) console.warn("Accounts not found:", accountsError);

      setCliente(clienteData as Cliente);
      setAccounts(accountsData || []);
    } catch (error) {
      console.error("Erro ao carregar cliente:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do cliente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: ClienteStatus) => {
    if (!cliente) return;

    try {
      const { error } = await supabase.from("clientes").update({ status: newStatus }).eq("id", cliente.id);

      if (error) throw error;

      setCliente((prev) => (prev ? { ...prev, status: newStatus } : null));

      toast({
        title: "Sucesso",
        description: `Status alterado para ${newStatus}`,
      });
    } catch (error) {
      console.error("Erro ao alterar status:", error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadClienteData();
  }, [id]);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Activity className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-text-secondary">Carregando dados do cliente...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!cliente) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2">Cliente não encontrado</h2>
            <p className="text-text-secondary">O cliente que você está procurando não existe.</p>
            <Button onClick={() => navigate("/clientes")} className="mt-4 gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar aos Clientes
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const StatusIcon = STATUS_CONFIG[cliente.status].icon;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate("/clientes")} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {getInitials(cliente.nome)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{cliente.nome}</h1>
                <p className="text-text-secondary">Cliente desde {formatDate(cliente.created_at)}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status Badge */}
            <Badge className={STATUS_CONFIG[cliente.status].color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {STATUS_CONFIG[cliente.status].label}
            </Badge>

            {/* Botões de Status */}
            <div className="flex gap-1">
              {cliente.status !== "Ativo" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-success hover:bg-success/10"
                  onClick={() => handleStatusChange("Ativo")}
                >
                  <Play className="h-3 w-3 mr-1" />
                  Ativar
                </Button>
              )}

              {cliente.status !== "Pausado" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-warning hover:bg-warning/10"
                  onClick={() => handleStatusChange("Pausado")}
                >
                  <Pause className="h-3 w-3 mr-1" />
                  Pausar
                </Button>
              )}
            </div>

            <Button onClick={() => navigate(`/clientes/${cliente.id}/editar`)} className="gap-2">
              <Edit className="h-4 w-4" />
              Editar
            </Button>
          </div>
        </div>

        {/* Conteúdo em Tabs */}
        <Tabs defaultValue="geral" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="geral">Informações Gerais</TabsTrigger>
            <TabsTrigger value="contatos">Contatos & Responsáveis</TabsTrigger>
            <TabsTrigger value="estrutura">Estrutura & Operação</TabsTrigger>
            <TabsTrigger value="contas">Contas de Anúncio ({accounts.length})</TabsTrigger>
          </TabsList>

          {/* ABA 1: INFORMAÇÕES GERAIS */}
          <TabsContent value="geral" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Dados Básicos */}
              <Card className="surface-elevated">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Dados da Empresa
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="text-sm font-medium text-text-secondary">Nome/Razão Social</label>
                      <p className="text-foreground font-medium">{cliente.razao_social || cliente.nome}</p>
                    </div>

                    {cliente.nome_fantasia && (
                      <div>
                        <label className="text-sm font-medium text-text-secondary">Nome Fantasia</label>
                        <p className="text-foreground">{cliente.nome_fantasia}</p>
                      </div>
                    )}

                    {cliente.cnpj && (
                      <div>
                        <label className="text-sm font-medium text-text-secondary">CNPJ</label>
                        <p className="text-foreground font-mono">{cliente.cnpj}</p>
                      </div>
                    )}

                    {cliente.id_grupo && (
                      <div>
                        <label className="text-sm font-medium text-text-secondary">ID do Grupo</label>
                        <p className="text-foreground font-mono">{cliente.id_grupo}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Contatos Básicos */}
              <Card className="surface-elevated">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    Contatos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cliente.telefone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-text-secondary" />
                      <div>
                        <p className="text-foreground font-medium">{cliente.telefone}</p>
                        <p className="text-xs text-text-secondary">Telefone principal</p>
                      </div>
                    </div>
                  )}

                  {cliente.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-text-secondary" />
                      <div>
                        <p className="text-foreground font-medium">{cliente.email}</p>
                        <p className="text-xs text-text-secondary">Email principal</p>
                      </div>
                    </div>
                  )}

                  {cliente.instagram_handle && (
                    <div className="flex items-center gap-3">
                      <Instagram className="h-4 w-4 text-text-secondary" />
                      <div>
                        <p className="text-foreground font-medium">@{cliente.instagram_handle}</p>
                        <p className="text-xs text-text-secondary">Instagram</p>
                      </div>
                    </div>
                  )}

                  {(cliente.site || cliente.site_url) && (
                    <div className="flex items-center gap-3">
                      <Globe className="h-4 w-4 text-text-secondary" />
                      <div>
                        <a
                          href={cliente.site || cliente.site_url || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1 font-medium"
                        >
                          {(cliente.site || cliente.site_url || "").replace(/^https?:\/\//, "")}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <p className="text-xs text-text-secondary">Website</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Localização */}
              {(cliente.estado || cliente.cidade_regiao || cliente.cidades?.length) && (
                <Card className="surface-elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Localização
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {cliente.estado && (
                      <div>
                        <label className="text-sm font-medium text-text-secondary">Estado</label>
                        <p className="text-foreground">{cliente.estado}</p>
                      </div>
                    )}

                    {cliente.cidade_regiao && (
                      <div>
                        <label className="text-sm font-medium text-text-secondary">Cidade/Região</label>
                        <p className="text-foreground">{cliente.cidade_regiao}</p>
                      </div>
                    )}

                    {cliente.cidades && cliente.cidades.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-text-secondary">Cidades de Atuação</label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {cliente.cidades.map((cidade, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {cidade}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {cliente.bairros_regioes && cliente.bairros_regioes.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-text-secondary">Bairros/Regiões</label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {cliente.bairros_regioes.map((bairro, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {bairro}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Segmentação */}
              {(cliente.nichos?.length || cliente.segmentos?.length) && (
                <Card className="surface-elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Segmentação
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {cliente.nichos && cliente.nichos.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-text-secondary">Nichos</label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {cliente.nichos.map((nicho, index) => (
                            <Badge key={index} className="bg-primary/10 text-primary border-primary/30">
                              {nicho}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {cliente.segmentos && cliente.segmentos.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-text-secondary">Segmentos</label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {cliente.segmentos.map((segmento, index) => (
                            <Badge key={index} className="bg-success/10 text-success border-success/30">
                              {segmento}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ABA 2: CONTATOS & RESPONSÁVEIS */}
          <TabsContent value="contatos" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Responsável Principal */}
              {(cliente.responsavel_nome || cliente.responsavel_email || cliente.responsavel_whatsapp) && (
                <Card className="surface-elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserCheck className="h-5 w-5" />
                      Responsável Principal
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {cliente.responsavel_nome && (
                      <div>
                        <label className="text-sm font-medium text-text-secondary">Nome</label>
                        <p className="text-foreground font-medium">{cliente.responsavel_nome}</p>
                      </div>
                    )}

                    {cliente.responsavel_cargo && (
                      <div>
                        <label className="text-sm font-medium text-text-secondary">Cargo</label>
                        <p className="text-foreground">{cliente.responsavel_cargo}</p>
                      </div>
                    )}

                    {cliente.responsavel_email && (
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-text-secondary" />
                        <div>
                          <p className="text-foreground">{cliente.responsavel_email}</p>
                          <p className="text-xs text-text-secondary">Email</p>
                        </div>
                      </div>
                    )}

                    {cliente.responsavel_whatsapp && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-text-secondary" />
                        <div>
                          <p className="text-foreground">{cliente.responsavel_whatsapp}</p>
                          <p className="text-xs text-text-secondary">WhatsApp</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Gestor de Marketing */}
              {cliente.tem_gestor_marketing && (
                <Card className="surface-elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Gestor de Marketing
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {cliente.gestor_marketing_nome && (
                      <div>
                        <label className="text-sm font-medium text-text-secondary">Nome</label>
                        <p className="text-foreground font-medium">{cliente.gestor_marketing_nome}</p>
                      </div>
                    )}

                    {cliente.gestor_marketing_email && (
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-text-secondary" />
                        <div>
                          <p className="text-foreground">{cliente.gestor_marketing_email}</p>
                          <p className="text-xs text-text-secondary">Email</p>
                        </div>
                      </div>
                    )}

                    {cliente.gestor_marketing_whatsapp && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-text-secondary" />
                        <div>
                          <p className="text-foreground">{cliente.gestor_marketing_whatsapp}</p>
                          <p className="text-xs text-text-secondary">WhatsApp</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Gestor Comercial */}
              {cliente.tem_gestor_comercial && (
                <Card className="surface-elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5" />
                      Gestor Comercial
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {cliente.gestor_comercial_nome && (
                      <div>
                        <label className="text-sm font-medium text-text-secondary">Nome</label>
                        <p className="text-foreground font-medium">{cliente.gestor_comercial_nome}</p>
                      </div>
                    )}

                    {cliente.gestor_comercial_email && (
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-text-secondary" />
                        <div>
                          <p className="text-foreground">{cliente.gestor_comercial_email}</p>
                          <p className="text-xs text-text-secondary">Email</p>
                        </div>
                      </div>
                    )}

                    {cliente.gestor_comercial_whatsapp && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-text-secondary" />
                        <div>
                          <p className="text-foreground">{cliente.gestor_comercial_whatsapp}</p>
                          <p className="text-xs text-text-secondary">WhatsApp</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Preferências de Contato */}
              {(cliente.contato_preferido || cliente.horarios_contato) && (
                <Card className="surface-elevated">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Preferências de Contato
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {cliente.contato_preferido && (
                      <div>
                        <label className="text-sm font-medium text-text-secondary">Canal Preferido</label>
                        <p className="text-foreground">{cliente.contato_preferido}</p>
                      </div>
                    )}

                    {cliente.horarios_contato && (
                      <div>
                        <label className="text-sm font-medium text-text-secondary">Horários</label>
                        <p className="text-foreground">{cliente.horarios_contato}</p>
                      </div>
                    )}

                    {cliente.lgpd_consent && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span className="text-sm text-foreground">Consentimento LGPD</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ABA 3: ESTRUTURA & OPERAÇÃO */}
          <TabsContent value="estrutura" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Estrutura da Equipe */}
              <Card className="surface-elevated">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Estrutura da Equipe
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cliente.tem_corretor_funcionario && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-text-secondary">Corretores</label>
                        <p className="text-2xl font-bold text-foreground">{cliente.qtd_corretores || 0}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-text-secondary">Funcionários</label>
                        <p className="text-2xl font-bold text-foreground">{cliente.qtd_funcionarios || 0}</p>
                      </div>
                    </div>
                  )}

                  {cliente.tem_sdr && (
                    <div>
                      <label className="text-sm font-medium text-text-secondary">SDRs Total</label>
                      <p className="text-2xl font-bold text-foreground">{cliente.qtd_sdr_total || 0}</p>
                    </div>
                  )}

                  {cliente.estrutura_setores && Object.keys(cliente.estrutura_setores).length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-text-secondary">Estrutura por Setores</label>
                      <div className="mt-2 p-3 bg-muted/50 rounded-lg">
                        <pre className="text-xs text-foreground">
                          {JSON.stringify(cliente.estrutura_setores, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Financeiro */}
              <Card className="surface-elevated">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Informações Financeiras
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cliente.budget_mensal && (
                    <div>
                      <label className="text-sm font-medium text-text-secondary">Budget Mensal</label>
                      <p className="text-2xl font-bold text-foreground">{formatCurrency(cliente.budget_mensal)}</p>
                    </div>
                  )}

                  {cliente.distribuicao_sugerida && Object.keys(cliente.distribuicao_sugerida).length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-text-secondary">Distribuição Sugerida</label>
                      <div className="mt-2 p-3 bg-muted/50 rounded-lg">
                        <pre className="text-xs text-foreground">
                          {JSON.stringify(cliente.distribuicao_sugerida, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* CRM e Ferramentas */}
              <Card className="surface-elevated">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    CRM e Ferramentas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cliente.crm_utilizado && (
                    <div>
                      <label className="text-sm font-medium text-text-secondary">CRM Utilizado</label>
                      <p className="text-foreground font-medium">{cliente.crm_utilizado}</p>
                    </div>
                  )}

                  {cliente.crm_url && (
                    <div>
                      <label className="text-sm font-medium text-text-secondary">URL do CRM</label>
                      <a
                        href={cliente.crm_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        {cliente.crm_url}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}

                  <div className="space-y-2">
                    {cliente.pixel_analytics_configurado && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span className="text-sm text-foreground">Pixel Analytics Configurado</span>
                      </div>
                    )}

                    {cliente.campanhas_ativas && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span className="text-sm text-foreground">Campanhas Ativas</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* IDs de Integração */}
              <Card className="surface-elevated">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Hash className="h-5 w-5" />
                    IDs de Integração
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cliente.meta_bm_id && (
                    <div>
                      <label className="text-sm font-medium text-text-secondary">Meta Business Manager ID</label>
                      <p className="text-foreground font-mono text-sm">{cliente.meta_bm_id}</p>
                    </div>
                  )}

                  {cliente.google_ads_cid && (
                    <div>
                      <label className="text-sm font-medium text-text-secondary">Google Ads Customer ID</label>
                      <p className="text-foreground font-mono text-sm">{cliente.google_ads_cid}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Observações */}
              {cliente.observacoes_adicionais && (
                <Card className="surface-elevated lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Observações Adicionais
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground whitespace-pre-wrap">{cliente.observacoes_adicionais}</p>
                  </CardContent>
                </Card>
              )}

              {/* Informações de Aprovação */}
              {(cliente.approved_at || cliente.rejection_reason) && (
                <Card className="surface-elevated lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Status de Aprovação
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {cliente.approved_at && (
                      <div>
                        <label className="text-sm font-medium text-text-secondary">Aprovado em</label>
                        <p className="text-foreground">{formatDate(cliente.approved_at)}</p>
                      </div>
                    )}

                    {cliente.rejection_reason && (
                      <div>
                        <label className="text-sm font-medium text-text-secondary">Motivo da Rejeição</label>
                        <p className="text-destructive">{cliente.rejection_reason}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ABA 4: CONTAS DE ANÚNCIO */}
          <TabsContent value="contas" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Contas de Anúncio</h3>
                <p className="text-text-secondary">{accounts.length} conta(s) vinculada(s) a este cliente</p>
              </div>
              <Button onClick={() => navigate("/contas?cliente=" + cliente.id)} className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Conta
              </Button>
            </div>

            {accounts.length > 0 ? (
              <div className="space-y-4">
                {accounts.map((account) => (
                  <Card key={account.id} className="surface-elevated">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                              {getInitials(account.nome_cliente)}
                            </AvatarFallback>
                          </Avatar>

                          <div>
                            <h4 className="font-semibold text-foreground">
                              {account.nome_cliente}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge
                                className={
                                  account.status === "Ativo"
                                    ? "bg-success/20 text-success"
                                    : account.status === "Pausado"
                                      ? "bg-warning/20 text-warning"
                                      : "bg-muted text-muted-foreground"
                                }
                              >
                                {account.status}
                              </Badge>

                              {account.usa_meta_ads && (
                                <Badge variant="outline" className="text-xs border-blue-500 text-blue-500">
                                  Meta
                                </Badge>
                              )}

                              {account.usa_google_ads && (
                                <Badge variant="outline" className="text-xs border-green-500 text-green-500">
                                  Google
                                </Badge>
                              )}

                              {account.traqueamento_ativo && (
                                <Badge variant="outline" className="text-xs border-purple-500 text-purple-500">
                                  Tracking
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          {/* Saldo Meta */}
                          {account.saldo_meta && (
                            <div className="text-right">
                              <p className="text-sm text-text-secondary">Saldo Meta</p>
                              <p className="font-semibold text-foreground">{formatCurrency(account.saldo_meta)}</p>
                            </div>
                          )}

                          {/* Budgets */}
                          {(account.budget_mensal_meta || account.budget_mensal_google) && (
                            <div className="text-right">
                              <p className="text-sm text-text-secondary">Budget Mensal</p>
                              <div className="space-y-1">
                                {account.budget_mensal_meta && (
                                  <p className="text-xs text-foreground">
                                    Meta: {formatCurrency(account.budget_mensal_meta)}
                                  </p>
                                )}
                                {account.budget_mensal_google && (
                                  <p className="text-xs text-foreground">
                                    Google: {formatCurrency(account.budget_mensal_google)}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Link Drive */}
                          {account.link_drive && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-2"
                              onClick={() => window.open(account.link_drive!, "_blank")}
                            >
                              <FolderOpen className="h-4 w-4" />
                              Drive
                            </Button>
                          )}

                          {/* Ver Conta */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2"
                            onClick={() => navigate(`/contas/${account.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                            Ver
                          </Button>
                        </div>
                      </div>

                      {/* IDs das Contas */}
                      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
                        {account.meta_account_id && (
                          <div>
                            <label className="text-xs text-text-secondary">Meta Account ID</label>
                            <p className="text-sm font-mono text-foreground">{account.meta_account_id}</p>
                          </div>
                        )}

                        {account.google_ads_id && (
                          <div>
                            <label className="text-xs text-text-secondary">Google Ads ID</label>
                            <p className="text-sm font-mono text-foreground">{account.google_ads_id}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="surface-elevated">
                <CardContent className="p-12 text-center">
                  <Building2 className="h-12 w-12 mx-auto mb-4 text-text-tertiary" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma conta encontrada</h3>
                  <p className="text-text-secondary mb-4">
                    Este cliente ainda não possui contas de anúncio vinculadas.
                  </p>
                  <Button onClick={() => navigate("/contas?cliente=" + cliente.id)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Criar Primeira Conta
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Informações de Sistema (Footer) */}
        <Card className="surface-elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm text-text-secondary">
              <div className="flex items-center gap-4">
                <span>ID: {cliente.id}</span>
                <span>•</span>
                <span>Criado: {formatDate(cliente.created_at)}</span>
                <span>•</span>
                <span>Atualizado: {formatDate(cliente.updated_at)}</span>
              </div>
              {cliente.archived && (
                <Badge variant="destructive" className="text-xs">
                  Arquivado
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { 
  Search, 
  Plus, 
  Users, 
  Building2,
  UserCheck,
  Calendar,
  RefreshCw,
  MoreVertical,
  Edit,
  Eye,
  Archive,
  ArchiveRestore,
  Phone,
  Mail,
  Target,
  BarChart3,
  DollarSign,
  Activity
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface ClientData {
  id: string;
  nome_cliente: string;
  nome_empresa: string;
  telefone: string;
  email: string | null;
  canais: string[];
  status: string;
  observacoes: string | null;
  usa_meta_ads: boolean;
  usa_google_ads: boolean;
  traqueamento_ativo: boolean;
  saldo_meta: number | null;
  meta_account_id: string | null;
  google_ads_id: string | null;
  created_at: string;
  updated_at: string;
  gestor_name?: string;
  stats?: {
    total_leads: number;
    conversoes: number;
    gasto_total: number;
  };
}

const STATUS_OPTIONS = [
  { value: 'Ativo', label: 'Ativo', color: 'bg-success', textColor: 'text-success' },
  { value: 'Pausado', label: 'Pausado', color: 'bg-warning', textColor: 'text-warning' },
  { value: 'Arquivado', label: 'Arquivado', color: 'bg-text-muted', textColor: 'text-text-muted' }
];

const CANAIS_OPTIONS = ['Meta', 'Google', 'TikTok', 'LinkedIn', 'Orgânico'];

export default function Clients() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientData[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterManager, setFilterManager] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClientData, setNewClientData] = useState({
    nome_cliente: '',
    nome_empresa: '',
    telefone: '',
    email: '',
    canais: [] as string[],
    status: 'Ativo'
  });
  const { toast } = useToast();
  const { isAdmin, isGestor, userId, loading: roleLoading } = useUserRole();

  // Carregar clientes e gestores do banco
  const loadClientsData = async () => {
    try {
      setLoading(true);

      // As políticas RLS já filtram automaticamente os dados conforme a role do usuário
      // Admins veem tudo, gestores veem apenas suas contas, usuários veem apenas suas próprias
      const { data: clientsData, error: clientsError } = await supabase
        .from('accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (clientsError) throw clientsError;

      // Buscar usuários responsáveis
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, name, email');

      if (usersError) console.warn('Users not found:', usersError);

      // Buscar stats de leads (se disponível)
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads_stats')
        .select('client_id, total_leads, leads_convertidos, valor_total_conversoes');

      if (leadsError) console.warn('Leads stats not available:', leadsError);

      // Processar dados combinados
      const processedClients: ClientData[] = (clientsData || []).map(client => {
        const user = usersData?.find(u => u.id === (client as any).user_id);
        const stats = leadsData?.find(s => s.client_id === client.id);

        return {
          ...client,
          gestor_name: user?.name || user?.email || 'Sem responsável',
          stats: stats ? {
            total_leads: stats.total_leads || 0,
            conversoes: stats.leads_convertidos || 0,
            gasto_total: stats.valor_total_conversoes || 0
          } : undefined
        };
      });

      setClients(processedClients);
      setManagers(usersData?.map(u => ({ id: u.id, name: u.name || u.email || 'Sem nome' })) || []);

    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os clientes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Criar novo cliente
  const handleCreateClient = async () => {
    try {
      if (!newClientData.nome_cliente || !newClientData.telefone) {
        toast({
          title: "Erro",
          description: "Preencha nome e telefone",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('accounts')
        .insert({
          ...newClientData,
          email: newClientData.email || null
        });

      if (error) throw error;

      await loadClientsData();
      setShowCreateModal(false);
      setNewClientData({
        nome_cliente: '',
        nome_empresa: '',
        telefone: '',
        email: '',
        canais: [],
        status: 'Ativo'
      });

      toast({
        title: "Sucesso",
        description: `Cliente ${newClientData.nome_cliente} criado`,
      });

    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o cliente",
        variant: "destructive",
      });
    }
  };

  // Alterar status do cliente
  const handleChangeStatus = async (clientId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('accounts')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', clientId);

      if (error) throw error;

      await loadClientsData();

      toast({
        title: "Sucesso",
        description: `Status do cliente alterado para ${newStatus}`,
      });

    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status",
        variant: "destructive",
      });
    }
  };

  // Navegar para detalhes do cliente
  const handleViewClient = (clientId: string) => {
    navigate(`/contas/${clientId}`);
  };

  useEffect(() => {
    loadClientsData();
  }, []);

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.nome_cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.nome_empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.telefone.includes(searchTerm) ||
                         client.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || client.status === filterStatus;
    const matchesManager = filterManager === "all" || true; // Removido gestor_id
    
    return matchesSearch && matchesStatus && matchesManager;
  });

  // Stats gerais
  const totalClients = clients.length;
  const activeClients = clients.filter(c => c.status === 'Ativo').length;
  const pausedClients = clients.filter(c => c.status === 'Pausado').length;
  const metaClients = clients.filter(c => c.usa_meta_ads || c.canais.includes('Meta')).length;
  const googleClients = clients.filter(c => c.usa_google_ads || c.canais.includes('Google')).length;
  const totalBalance = clients.reduce((sum, c) => sum + ((c.saldo_meta || 0) / 100), 0);

  const getStatusBadge = (status: string) => {
    const statusInfo = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
    return (
      <Badge className={`text-xs text-white ${statusInfo.color}`}>
        {statusInfo.label}
      </Badge>
    );
  };

  const getChannelBadges = (channels: string[]) => {
    return channels.map(channel => (
      <Badge 
        key={channel}
        variant="outline" 
        className={`text-xs ${
          channel === 'Meta' ? 'border-primary text-primary' : 
          channel === 'Google' ? 'border-warning text-warning' :
          'border-accent text-accent'
        }`}
      >
        {channel}
      </Badge>
    ));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-text-secondary">Carregando clientes...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestão de Clientes</h1>
            <p className="text-text-secondary mt-1">
              Controle completo da sua carteira de clientes
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              className="gap-2" 
              onClick={loadClientsData}
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
            <Button 
              className="gap-2"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="h-4 w-4" />
              Novo Cliente
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card className="surface-elevated">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-text-secondary text-sm">Total</p>
                  <p className="text-2xl font-bold text-foreground">{totalClients}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="surface-elevated">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <UserCheck className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-text-secondary text-sm">Ativos</p>
                  <p className="text-2xl font-bold text-foreground">{activeClients}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="surface-elevated">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <Activity className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-text-secondary text-sm">Pausados</p>
                  <p className="text-2xl font-bold text-foreground">{pausedClients}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="surface-elevated">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-text-secondary text-sm">Meta</p>
                  <p className="text-2xl font-bold text-foreground">{metaClients}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="surface-elevated">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <Target className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-text-secondary text-sm">Google</p>
                  <p className="text-2xl font-bold text-foreground">{googleClients}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="surface-elevated">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <DollarSign className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-text-secondary text-sm">Saldo Total</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(totalBalance)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="surface-elevated">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                <Input
                  placeholder="Buscar por nome, empresa, telefone ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  {STATUS_OPTIONS.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterManager} onValueChange={setFilterManager}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filtrar por gestor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Gestores</SelectItem>
                  {managers.map(manager => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {manager.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Clients List */}
        <div className="space-y-4">
          {filteredClients.map((client) => (
            <Card key={client.id} className="surface-elevated hover:shadow-lg transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  {/* Client Info */}
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-gradient-primary text-white font-bold">
                        {client.nome_cliente.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground text-lg">
                          {client.nome_cliente}
                        </h3>
                        {getStatusBadge(client.status)}
                        <div className="flex gap-1">
                          {getChannelBadges(client.canais)}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-text-secondary">
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {client.nome_empresa}
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {client.telefone}
                        </div>
                        {client.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {client.email}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <UserCheck className="h-3 w-3" />
                          {client.gestor_name}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(client.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats & Actions */}
                  <div className="flex items-center gap-6">
                    {/* Quick Stats */}
                    {client.stats && (
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-center">
                          <p className="font-semibold text-foreground">{client.stats.total_leads}</p>
                          <p className="text-text-muted text-xs">Leads</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-success">{client.stats.conversoes}</p>
                          <p className="text-text-muted text-xs">Conversões</p>
                        </div>
                        {client.saldo_meta && (
                          <div className="text-center">
                            <p className="font-semibold text-primary">{formatCurrency((client.saldo_meta || 0) / 100)}</p>
                            <p className="text-text-muted text-xs">Saldo</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          className="gap-2"
                          onClick={() => handleViewClient(client.id)}
                        >
                          <Eye className="h-4 w-4" />
                          Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2">
                          <Edit className="h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {client.status === 'Ativo' ? (
                          <DropdownMenuItem 
                            className="gap-2"
                            onClick={() => handleChangeStatus(client.id, 'Pausado')}
                          >
                            <Archive className="h-4 w-4" />
                            Pausar
                          </DropdownMenuItem>
                        ) : client.status === 'Pausado' ? (
                          <>
                            <DropdownMenuItem 
                              className="gap-2"
                              onClick={() => handleChangeStatus(client.id, 'Ativo')}
                            >
                              <ArchiveRestore className="h-4 w-4" />
                              Reativar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="gap-2"
                              onClick={() => handleChangeStatus(client.id, 'Arquivado')}
                            >
                              <Archive className="h-4 w-4" />
                              Arquivar
                            </DropdownMenuItem>
                          </>
                        ) : (
                          <DropdownMenuItem 
                            className="gap-2"
                            onClick={() => handleChangeStatus(client.id, 'Ativo')}
                          >
                            <ArchiveRestore className="h-4 w-4" />
                            Desarquivar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {filteredClients.length === 0 && !loading && (
          <Card className="surface-elevated">
            <CardContent className="p-12 text-center">
              <div className="mx-auto mb-4 p-3 bg-muted/30 rounded-full w-fit">
                <Users className="h-8 w-8 text-text-muted" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Nenhum cliente encontrado</h3>
              <p className="text-text-secondary">
                {searchTerm ? "Tente ajustar os filtros de busca" : "Nenhum cliente cadastrado no sistema"}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Modal de Criação */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Novo Cliente</DialogTitle>
              <DialogDescription>
                Criar uma nova conta de cliente no sistema
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome_cliente">Nome do Cliente</Label>
                <Input
                  id="nome_cliente"
                  value={newClientData.nome_cliente}
                  onChange={(e) => setNewClientData(prev => ({ ...prev, nome_cliente: e.target.value }))}
                  placeholder="Ex: Casa & Cia Imóveis"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nome_empresa">Nome da Empresa</Label>
                <Input
                  id="nome_empresa"
                  value={newClientData.nome_empresa}
                  onChange={(e) => setNewClientData(prev => ({ ...prev, nome_empresa: e.target.value }))}
                  placeholder="Ex: Casa & Cia Ltda"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={newClientData.telefone}
                  onChange={(e) => setNewClientData(prev => ({ ...prev, telefone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newClientData.email}
                  onChange={(e) => setNewClientData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="contato@empresa.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gestor">Responsável</Label>
                <Select 
                  value="" 
                  onValueChange={(value) => {/* Não há mais gestor_id */}}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um gestor" />
                  </SelectTrigger>
                  <SelectContent>
                    {managers.map(manager => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowCreateModal(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleCreateClient}>
                Criar Cliente
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
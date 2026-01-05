import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, Clock, Building2, RefreshCw, UserPlus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/hooks/useUserContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PendingUser {
  id: string;
  name: string | null;
  email: string | null;
  updated_at: string;
  status: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
}

export default function UserApprovals() {
  const navigate = useNavigate();
  const { isVetterAdmin, loading: contextLoading } = useUserContext();
  
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Approval Dialog
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [newOrgName, setNewOrgName] = useState('');
  const [approving, setApproving] = useState(false);

  // Redirect non-admins
  useEffect(() => {
    if (!contextLoading && !isVetterAdmin) {
      navigate('/dashboard');
    }
  }, [contextLoading, isVetterAdmin, navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load pending users
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, name, email, updated_at, status')
        .eq('status', 'pending')
        .order('updated_at', { ascending: false });

      if (usersError) throw usersError;
      setPendingUsers(users || []);

      // Load organizations
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .eq('status', 'active')
        .order('name');

      if (orgsError) throw orgsError;
      setOrganizations(orgs || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar usuários pendentes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isVetterAdmin) {
      loadData();
    }
  }, [isVetterAdmin]);

  const openApprovalDialog = (user: PendingUser) => {
    setSelectedUser(user);
    setSelectedOrg('');
    setNewOrgName('');
    setApprovalDialog(true);
  };

  const handleApprove = async () => {
    if (!selectedUser) return;
    
    setApproving(true);
    try {
      let orgId = selectedOrg;

      // Create new organization if needed
      if (selectedOrg === 'new' && newOrgName.trim()) {
        const slug = newOrgName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        
        const { data: newOrg, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: newOrgName.trim(),
            slug: `${slug}-${Date.now()}`,
          })
          .select('id')
          .single();

        if (orgError) throw orgError;
        orgId = newOrg.id;
      }

      // Get current user for approved_by
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      // Update user profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          status: 'active',
          organization_id: orgId || null,
          approved_at: new Date().toISOString(),
          approved_by: currentUser?.id,
        })
        .eq('id', selectedUser.id);

      if (updateError) throw updateError;

      toast.success(`${selectedUser.name || selectedUser.email} foi aprovado!`);
      setApprovalDialog(false);
      loadData();
    } catch (error) {
      console.error('Erro ao aprovar usuário:', error);
      toast.error('Erro ao aprovar usuário');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async (user: PendingUser) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'blocked' })
        .eq('id', user.id);

      if (error) throw error;

      toast.success(`${user.name || user.email} foi rejeitado`);
      loadData();
    } catch (error) {
      console.error('Erro ao rejeitar usuário:', error);
      toast.error('Erro ao rejeitar usuário');
    }
  };

  const filteredUsers = pendingUsers.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower)
    );
  });

  if (contextLoading) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Aprovação de Usuários"
        breadcrumb="Admin"
        subtitle="Aprovações"
        actions={
          <Button onClick={loadData} variant="outline" size="sm" className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        }
      />

      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingUsers.length}</p>
                  <p className="text-sm text-muted-foreground">Pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{organizations.length}</p>
                  <p className="text-sm text-muted-foreground">Organizações</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <UserPlus className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">-</p>
                  <p className="text-sm text-muted-foreground">Aprovados Hoje</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Pending Users List */}
        <Card>
          <CardHeader>
            <CardTitle>Usuários Aguardando Aprovação</CardTitle>
            <CardDescription>
              Aprove ou rejeite os cadastros pendentes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Nenhum usuário pendente</p>
                <p className="text-sm">Novos cadastros aparecerão aqui</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map(user => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {(user.name || user.email || '?')[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{user.name || 'Sem nome'}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <Badge variant="outline" className="mb-1">Pendente</Badge>
                        <p className="text-xs text-muted-foreground">Atualizado em
                          {format(new Date(user.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleReject(user)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          className="gap-1"
                          onClick={() => openApprovalDialog(user)}
                        >
                          <Check className="h-4 w-4" />
                          Aprovar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Approval Dialog */}
      <Dialog open={approvalDialog} onOpenChange={setApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar Usuário</DialogTitle>
            <DialogDescription>
              Selecione a organização para {selectedUser?.name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Organização</Label>
              <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma organização" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem organização (Vetter Admin)</SelectItem>
                  {organizations.map(org => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="new">+ Criar nova organização</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedOrg === 'new' && (
              <div className="space-y-2">
                <Label>Nome da nova organização</Label>
                <Input
                  placeholder="Ex: Imobiliária XYZ"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                />
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleApprove} 
              disabled={approving || (selectedOrg === 'new' && !newOrgName.trim())}
            >
              {approving ? 'Aprovando...' : 'Aprovar Usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

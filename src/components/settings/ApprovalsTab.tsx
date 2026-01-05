import { useState, useEffect } from 'react';
import { Check, X, Clock, Building2, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PendingUser {
  id: string;
  name: string | null;
  email: string | null;
  updated_at: string;
  status: string;
}

interface Account {
  id: string;
  nome_cliente: string;
  email: string | null;
}

export function ApprovalsTab() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [approving, setApproving] = useState(false);

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

      // Load accounts (clientes/contas) - trazer todos independente do status
      const { data: accs, error: accsError } = await supabase
        .from('accounts')
        .select('id, nome_cliente, email, status')
        .order('nome_cliente');

      if (accsError) throw accsError;
      setAccounts(accs || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar usuários pendentes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openApprovalDialog = (user: PendingUser) => {
    setSelectedUser(user);
    setSelectedAccounts([]);
    setApprovalDialog(true);
  };

  const toggleAccountSelection = (accountId: string) => {
    setSelectedAccounts(prev => 
      prev.includes(accountId) 
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  const handleApprove = async () => {
    if (!selectedUser) return;
    
    setApproving(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      // Update user profile status
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          status: 'active',
          approved_at: new Date().toISOString(),
          approved_by: currentUser?.id,
        })
        .eq('id', selectedUser.id);

      if (updateError) throw updateError;

      // Assign selected accounts to user (update accounts.usuarios_vinculados)
      if (selectedAccounts.length > 0) {
        for (const accountId of selectedAccounts) {
          const { data: account } = await supabase
            .from('accounts')
            .select('usuarios_vinculados')
            .eq('id', accountId)
            .single();
          
          const currentUsers = account?.usuarios_vinculados || [];
          if (!currentUsers.includes(selectedUser.id)) {
            await supabase
              .from('accounts')
              .update({
                usuarios_vinculados: [...currentUsers, selectedUser.id]
              })
              .eq('id', accountId);
          }
        }
      }

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-amber-500" />
          <h3 className="font-semibold">Aprovação de Usuários</h3>
          {pendingUsers.length > 0 && (
            <Badge variant="secondary" className="bg-amber-500/10 text-amber-500">
              {pendingUsers.length} pendente{pendingUsers.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xl font-bold">{pendingUsers.length}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold">{accounts.length}</p>
                <p className="text-xs text-muted-foreground">Contas</p>
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
          className="pl-10 h-9"
        />
      </div>

      {/* Pending Users List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Aguardando Aprovação</CardTitle>
          <CardDescription className="text-sm">
            Aprove ou rejeite os cadastros pendentes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Nenhum usuário pendente</p>
              <p className="text-sm">Novos cadastros aparecerão aqui</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map(user => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {(user.name || user.email || '?')[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{user.name || 'Sem nome'}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {format(new Date(user.updated_at), "dd/MM/yy", { locale: ptBR })}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleReject(user)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 gap-1"
                      onClick={() => openApprovalDialog(user)}
                    >
                      <Check className="h-4 w-4" />
                      <span className="hidden sm:inline">Aprovar</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={approvalDialog} onOpenChange={setApprovalDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Aprovar Usuário</DialogTitle>
            <DialogDescription>
              Selecione as contas/clientes para {selectedUser?.name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4 max-h-[300px] overflow-y-auto">
            <Label>Contas/Clientes</Label>
            {accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma conta disponível</p>
            ) : (
              <div className="space-y-2">
                {accounts.map(account => (
                  <div
                    key={account.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 cursor-pointer"
                    onClick={() => toggleAccountSelection(account.id)}
                  >
                    <Checkbox
                      checked={selectedAccounts.includes(account.id)}
                      onCheckedChange={() => toggleAccountSelection(account.id)}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{account.nome_cliente}</p>
                      {account.email && (
                        <p className="text-xs text-muted-foreground">{account.email}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {selectedAccounts.length} conta{selectedAccounts.length !== 1 ? 's' : ''} selecionada{selectedAccounts.length !== 1 ? 's' : ''}
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleApprove} disabled={approving}>
              {approving ? 'Aprovando...' : 'Aprovar Usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

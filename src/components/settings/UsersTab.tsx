import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Search,
  Plus,
  Users as UsersIcon,
  MoreVertical,
  Edit,
  Trash2,
  RefreshCw
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Usuario {
  id: string;
  email: string;
  name: string | null;
  role: "admin" | "gestor" | "usuario";
  ativo: boolean;
  ultimo_acesso: string | null;
  last_sign_in_at: string | null;
  created_at: string;
  telefone: string | null;
  departamento: string | null;
  updated_at: string;
  avatar_url?: string | null;
}

export function UsersTab() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("todos");
  const [filterStatus, setFilterStatus] = useState("todos");

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);
  const [creatingUser, setCreatingUser] = useState(false);

  const [editFormData, setEditFormData] = useState({
    name: "",
    telefone: "",
    departamento: "",
  });

  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "usuario",
  });

  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    loadCurrentUser();
    loadUsuarios();
  }, []);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: userRole } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", user.id)
        .single() as any;
      setIsAdmin(userRole?.role === "admin");
    }
  };

  const loadUsuarios = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('list-users');
      if (error) throw error;
      const list = ((data as any)?.users) || [];
      setUsuarios(list);
    } catch (error: any) {
      console.error("Error loading users:", error);
      toast({
        title: "Erro ao carregar usuários",
        description: error?.message || "Não foi possível carregar a lista",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateRole = async (userId: string, newRole: string) => {
    if (!isAdmin) return;
    try {
      await supabase.from("user_roles").delete().eq("user_id", userId) as any;
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole } as any) as any;
      if (error) throw error;
      toast({ title: "Cargo atualizado" });
      loadUsuarios();
    } catch (error) {
      toast({ title: "Erro ao atualizar cargo", variant: "destructive" });
    }
  };

  const toggleStatus = async (userId: string, ativo: boolean) => {
    if (!isAdmin) return;
    try {
      const { error } = await supabase.from("profiles").update({ ativo } as any).eq("id", userId) as any;
      if (error) throw error;
      toast({ title: `Usuário ${ativo ? "ativado" : "desativado"}` });
      loadUsuarios();
    } catch (error) {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    }
  };

  const openEditModal = (user: Usuario) => {
    setSelectedUser(user);
    setEditFormData({
      name: user.name || "",
      telefone: user.telefone || "",
      departamento: user.departamento || "",
    });
    setShowEditModal(true);
  };

  const saveUserEdits = async () => {
    if (!selectedUser) return;
    try {
      const { error } = await supabase.from("profiles").update({
        name: editFormData.name,
        telefone: editFormData.telefone,
        departamento: editFormData.departamento,
        updated_at: new Date().toISOString(),
      } as any).eq("id", selectedUser.id) as any;
      if (error) throw error;
      toast({ title: "Usuário atualizado" });
      setShowEditModal(false);
      loadUsuarios();
    } catch (error) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const confirmDelete = async () => {
    if (!selectedUser) return;
    try {
      const { error } = await supabase.from("profiles").update({ ativo: false } as any).eq("id", selectedUser.id) as any;
      if (error) throw error;
      toast({ title: "Usuário desativado" });
      setShowDeleteModal(false);
      loadUsuarios();
    } catch (error) {
      toast({ title: "Erro ao desativar", variant: "destructive" });
    }
  };

  const handleCreateUser = async () => {
    if (!isAdmin || !createForm.name.trim() || !createForm.email.trim()) return;
    try {
      setCreatingUser(true);
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: createForm.email.trim(),
          name: createForm.name.trim(),
          role: createForm.role,
          password: createForm.password || undefined,
        },
      });
      if (error) throw new Error((data as any)?.error || error.message);
      toast({ title: 'Usuário criado' });
      setShowCreateModal(false);
      setCreateForm({ name: '', email: '', password: '', role: 'usuario' });
      loadUsuarios();
    } catch (error: any) {
      toast({ title: 'Erro ao criar usuário', description: error?.message, variant: 'destructive' });
    } finally {
      setCreatingUser(false);
    }
  };

  const filteredUsuarios = usuarios.filter((user) => {
    const matchSearch = !searchTerm || user.name?.toLowerCase().includes(searchTerm.toLowerCase()) || user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = filterRole === "todos" || user.role === filterRole;
    const matchStatus = filterStatus === "todos" || (filterStatus === "ativo" && user.ativo) || (filterStatus === "inativo" && !user.ativo);
    return matchSearch && matchRole && matchStatus;
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin": return <Badge className="bg-purple-500 text-white">Admin</Badge>;
      case "gestor": return <Badge className="bg-blue-500 text-white">Gestor</Badge>;
      default: return <Badge variant="secondary">Usuário</Badge>;
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return "Nunca";
    return format(new Date(date), "dd/MM/yy HH:mm", { locale: ptBR });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UsersIcon className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Gestão de Usuários</h3>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadUsuarios} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          {isAdmin && (
            <Button size="sm" onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-1" /> Novo
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." className="pl-9 h-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="h-9"><SelectValue placeholder="Cargo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os cargos</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="gestor">Gestor</SelectItem>
            <SelectItem value="usuario">Usuário</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ativo">Ativos</SelectItem>
            <SelectItem value="inativo">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Último Acesso</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsuarios.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">{(user.name || user.email)[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{user.name || "Sem nome"}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {isAdmin ? (
                        <Select value={user.role} onValueChange={(v) => updateRole(user.id, v)}>
                          <SelectTrigger className="h-7 w-24">{getRoleBadge(user.role)}</SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="gestor">Gestor</SelectItem>
                            <SelectItem value="usuario">Usuário</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : getRoleBadge(user.role)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.ativo ? "default" : "secondary"} className={user.ativo ? "bg-green-500" : ""}>
                        {user.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(user.last_sign_in_at)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditModal(user)}><Edit className="h-4 w-4 mr-2" />Editar</DropdownMenuItem>
                          {isAdmin && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => toggleStatus(user.id, !user.ativo)}>
                                {user.ativo ? "Desativar" : "Ativar"}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => { setSelectedUser(user); setShowDeleteModal(true); }}>
                                <Trash2 className="h-4 w-4 mr-2" />Remover
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
            <DialogDescription>Criar um novo usuário no sistema</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Senha (opcional)</Label>
              <Input type="password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Cargo</Label>
              <Select value={createForm.role} onValueChange={(v) => setCreateForm({ ...createForm, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="gestor">Gestor</SelectItem>
                  <SelectItem value="usuario">Usuário</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
            <Button onClick={handleCreateUser} disabled={creatingUser}>{creatingUser ? "Criando..." : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={editFormData.telefone} onChange={(e) => setEditFormData({ ...editFormData, telefone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Departamento</Label>
              <Input value={editFormData.departamento} onChange={(e) => setEditFormData({ ...editFormData, departamento: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancelar</Button>
            <Button onClick={saveUserEdits}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desativar Usuário</DialogTitle>
            <DialogDescription>Tem certeza que deseja desativar {selectedUser?.name || selectedUser?.email}?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete}>Desativar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

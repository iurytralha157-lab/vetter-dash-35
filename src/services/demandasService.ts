import { supabase } from "@/integrations/supabase/client";

export type DemandaPrioridade = 'alta' | 'media' | 'baixa';
export type DemandaStatus = 'pendente' | 'em_andamento' | 'concluido';

export interface Demanda {
  id: string;
  titulo: string;
  descricao: string | null;
  account_id: string;
  gestor_responsavel_id: string | null;
  criado_por: string | null;
  orcamento: number | null;
  link_criativos: string | null;
  data_entrega: string | null;
  prioridade: DemandaPrioridade;
  status: DemandaStatus;
  created_at: string;
  updated_at: string;
  // Joined fields
  account?: {
    nome_cliente: string;
    gestor_id: string | null;
  };
  gestor?: {
    name: string | null;
    email: string | null;
  };
}

export interface CreateDemandaInput {
  titulo: string;
  descricao?: string;
  account_id: string;
  gestor_responsavel_id?: string;
  orcamento?: number;
  link_criativos?: string;
  data_entrega?: string;
  prioridade?: DemandaPrioridade;
}

export const demandasService = {
  async getDemandas(): Promise<Demanda[]> {
    const { data, error } = await supabase
      .from('demandas')
      .select(`
        *,
        account:accounts(nome_cliente, gestor_id),
        gestor:profiles!demandas_gestor_responsavel_id_fkey(name, email)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as unknown as Demanda[];
  },

  async createDemanda(input: CreateDemandaInput): Promise<Demanda> {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('demandas')
      .insert({
        ...input,
        criado_por: user?.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Demanda;
  },

  async updateDemanda(id: string, updates: Partial<Demanda>): Promise<Demanda> {
    const { data, error } = await supabase
      .from('demandas')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Demanda;
  },

  async updateStatus(id: string, status: DemandaStatus): Promise<void> {
    const { error } = await supabase
      .from('demandas')
      .update({ status })
      .eq('id', id);

    if (error) throw error;
  },

  async deleteDemanda(id: string): Promise<void> {
    const { error } = await supabase
      .from('demandas')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

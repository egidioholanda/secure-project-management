import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Team, TeamMember, TeamMemberRole, Resource, ResourceStatus } from '@/types/teams';

export const useTeams = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchTeams = useCallback(async () => {
    const { data: teamsData, error: teamsError } = await supabase
      .from('teams')
      .select('*')
      .order('name');

    if (teamsError) {
      toast({ title: 'Erro ao carregar equipes', description: teamsError.message, variant: 'destructive' });
      return;
    }

    const { data: membersData, error: membersError } = await supabase
      .from('team_members')
      .select('*, profile:profiles(user_id, full_name, email)');

    if (membersError) {
      toast({ title: 'Erro ao carregar membros', description: membersError.message, variant: 'destructive' });
      return;
    }

    const { data: resourcesData, error: resourcesError } = await supabase
      .from('resources')
      .select('*')
      .order('name');

    if (resourcesError) {
      toast({ title: 'Erro ao carregar recursos', description: resourcesError.message, variant: 'destructive' });
      return;
    }

    const allResources = (resourcesData ?? []) as Resource[];
    setResources(allResources);

    const enriched: Team[] = (teamsData ?? []).map((t) => ({
      ...t,
      members: (membersData ?? [])
        .filter((m: any) => m.team_id === t.id)
        .map((m: any) => ({
          id: m.id,
          team_id: m.team_id,
          user_id: m.user_id,
          role: m.role as TeamMemberRole,
          created_at: m.created_at,
          profile: m.profile
            ? { user_id: m.profile.user_id, full_name: m.profile.full_name, email: m.profile.email }
            : undefined,
        })),
      resources: allResources.filter((r) => r.team_id === t.id),
    }));

    setTeams(enriched);
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  // --- Teams CRUD ---

  const createTeam = async (name: string, description: string) => {
    const { data, error } = await supabase
      .from('teams')
      .insert({ name: name.trim(), description: description.trim() || null })
      .select()
      .single();

    if (error) {
      toast({ title: 'Erro ao criar equipe', description: error.message, variant: 'destructive' });
      return null;
    }

    await fetchTeams();
    toast({ title: 'Equipe criada', description: `${name} foi criada com sucesso.` });
    return data;
  };

  const updateTeam = async (id: string, name: string, description: string) => {
    const { error } = await supabase
      .from('teams')
      .update({ name: name.trim(), description: description.trim() || null })
      .eq('id', id);

    if (error) {
      toast({ title: 'Erro ao atualizar equipe', description: error.message, variant: 'destructive' });
      return;
    }

    await fetchTeams();
    toast({ title: 'Equipe atualizada' });
  };

  const deleteTeam = async (id: string) => {
    const { error } = await supabase.from('teams').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir equipe', description: error.message, variant: 'destructive' });
      return;
    }
    await fetchTeams();
    toast({ title: 'Equipe excluída' });
  };

  const toggleTeamActive = async (id: string, active: boolean) => {
    const { error } = await supabase.from('teams').update({ active }).eq('id', id);
    if (error) {
      toast({ title: 'Erro ao alterar status', description: error.message, variant: 'destructive' });
      return;
    }
    await fetchTeams();
  };

  // --- Members CRUD ---

  const addMember = async (teamId: string, userId: string, role: TeamMemberRole) => {
    // Replace responsavel if one already exists
    if (role === 'responsavel') {
      const team = teams.find((t) => t.id === teamId);
      const existing = team?.members?.find((m) => m.role === 'responsavel');
      if (existing) {
        await supabase.from('team_members').delete().eq('id', existing.id);
      }
    }

    const { error } = await supabase
      .from('team_members')
      .insert({ team_id: teamId, user_id: userId, role });

    if (error) {
      toast({ title: 'Erro ao adicionar membro', description: error.message, variant: 'destructive' });
      return;
    }

    await fetchTeams();
    toast({ title: 'Membro adicionado' });
  };

  const removeMember = async (memberId: string) => {
    const { error } = await supabase.from('team_members').delete().eq('id', memberId);
    if (error) {
      toast({ title: 'Erro ao remover membro', description: error.message, variant: 'destructive' });
      return;
    }
    await fetchTeams();
    toast({ title: 'Membro removido' });
  };

  const changeMemberRole = async (memberId: string, newRole: TeamMemberRole, teamId: string) => {
    if (newRole === 'responsavel') {
      const team = teams.find((t) => t.id === teamId);
      const existing = team?.members?.find((m) => m.role === 'responsavel' && m.id !== memberId);
      if (existing) {
        await supabase.from('team_members').update({ role: 'tecnico' }).eq('id', existing.id);
      }
    }

    const { error } = await supabase.from('team_members').update({ role: newRole }).eq('id', memberId);
    if (error) {
      toast({ title: 'Erro ao alterar papel', description: error.message, variant: 'destructive' });
      return;
    }
    await fetchTeams();
  };

  // --- Resources CRUD ---

  const createResource = async (payload: {
    name: string;
    type: string;
    description?: string;
    team_id?: string | null;
  }) => {
    const { error } = await supabase.from('resources').insert({
      name: payload.name.trim(),
      type: payload.type,
      description: payload.description?.trim() || null,
      team_id: payload.team_id || null,
      status: 'disponivel',
    });

    if (error) {
      toast({ title: 'Erro ao criar recurso', description: error.message, variant: 'destructive' });
      return;
    }

    await fetchTeams();
    toast({ title: 'Recurso cadastrado' });
  };

  const updateResource = async (id: string, payload: {
    name?: string;
    type?: string;
    description?: string | null;
    status?: ResourceStatus;
    team_id?: string | null;
  }) => {
    const { error } = await supabase.from('resources').update(payload).eq('id', id);
    if (error) {
      toast({ title: 'Erro ao atualizar recurso', description: error.message, variant: 'destructive' });
      return;
    }
    await fetchTeams();
    toast({ title: 'Recurso atualizado' });
  };

  const deleteResource = async (id: string) => {
    const { error } = await supabase.from('resources').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir recurso', description: error.message, variant: 'destructive' });
      return;
    }
    await fetchTeams();
    toast({ title: 'Recurso excluído' });
  };

  return {
    teams,
    resources,
    isLoading,
    refetch: fetchTeams,
    createTeam,
    updateTeam,
    deleteTeam,
    toggleTeamActive,
    addMember,
    removeMember,
    changeMemberRole,
    createResource,
    updateResource,
    deleteResource,
  };
};

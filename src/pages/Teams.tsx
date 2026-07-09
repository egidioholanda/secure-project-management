import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Users, Plus, Wrench, Car, Package2, LayoutGrid, Loader2,
} from 'lucide-react';
import { useTeams } from '@/hooks/useTeams';
import { useProjects } from '@/hooks/useProjects';
import { useAuthContext } from '@/contexts/AuthContext';
import TeamCard from '@/components/Teams/TeamCard';
import AddTeamDialog from '@/components/Teams/AddTeamDialog';
import AddMemberDialog from '@/components/Teams/AddMemberDialog';
import AddResourceDialog from '@/components/Teams/AddResourceDialog';
import TeamAvailabilityGrid from '@/components/Teams/TeamAvailabilityGrid';
import type { Team, TeamMember, TeamMemberRole, Resource, ResourceStatus } from '@/types/teams';
import { RESOURCE_TYPE_LABELS, RESOURCE_STATUS_LABELS } from '@/types/teams';
import { supabase } from '@/integrations/supabase/client';

const RESOURCE_ICONS = {
  veiculo: Car,
  ferramenta: Wrench,
  equipamento: Package2,
};

const STATUS_COLORS: Record<ResourceStatus, string> = {
  disponivel: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  em_uso: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  manutencao: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

interface RawTask {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  team_id: string | null;
  project_id: string | null;
  project_name: string | null;
  progress: number;
}

const Teams = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') ?? 'equipes';
  const { allowedClientIds, allowedClientGroupIds } = useAuthContext();
  const {
    teams, resources, isLoading,
    createTeam, updateTeam, deleteTeam, toggleTeamActive,
    addMember, removeMember, changeMemberRole,
    createResource, updateResource, deleteResource,
  } = useTeams();
  const { projects } = useProjects(allowedClientIds, allowedClientGroupIds);
  const validProjectIds = useMemo(() => new Set(projects.map((p) => p.id)), [projects]);

  const handleAvailabilityDayClick = useCallback((day: Date) => {
    navigate(`/cronogramas?date=${format(day, 'yyyy-MM-dd')}`);
  }, [navigate]);

  const [scheduleTasks, setScheduleTasks] = useState<RawTask[]>([]);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [memberDialogTeam, setMemberDialogTeam] = useState<Team | null>(null);
  const [resourceDialogOpen, setResourceDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [resourceFilter, setResourceFilter] = useState<string>('all');

  useEffect(() => {
    supabase
      .from('schedule_tasks')
      .select('id, name, start_date, end_date, team_id, project_name, progress, project_id, projects!inner(id)')
      .not('team_id', 'is', null)
      .then(({ data }) => setScheduleTasks((data as RawTask[]) ?? []));
  }, [teams]);

  const mappedTasks = useMemo(
    () =>
      scheduleTasks
        .filter((t) => t.project_id && validProjectIds.has(t.project_id))
        .map((t) => ({
          id: t.id,
          name: t.name,
          startDate: new Date(t.start_date + 'T00:00:00'),
          endDate: new Date(t.end_date + 'T00:00:00'),
          team_id: t.team_id,
          projectName: t.project_name ?? '',
          progress: t.progress ?? 0,
        })),
    [scheduleTasks, validProjectIds],
  );

  const filteredResources = resources.filter((r) => {
    if (resourceFilter === 'all') return true;
    if (resourceFilter === 'unassigned') return !r.team_id;
    return r.type === resourceFilter || r.status === resourceFilter;
  });

  const handleSaveTeam = async (name: string, description: string) => {
    if (editingTeam) {
      await updateTeam(editingTeam.id, name, description);
    } else {
      await createTeam(name, description);
    }
    setEditingTeam(null);
  };

  const handleSaveResource = async (payload: {
    name: string; type: string; description?: string; status: ResourceStatus; team_id?: string | null;
  }) => {
    if (editingResource) {
      await updateResource(editingResource.id, payload);
    } else {
      await createResource(payload);
    }
    setEditingResource(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <Tabs defaultValue={initialTab}>
        <div className="flex items-center justify-end gap-3 flex-wrap">
          <TabsList>
            <TabsTrigger value="equipes" className="gap-1.5">
              <Users className="h-4 w-4" /> Equipes
            </TabsTrigger>
            <TabsTrigger value="recursos" className="gap-1.5">
              <Wrench className="h-4 w-4" /> Recursos
            </TabsTrigger>
            <TabsTrigger value="disponibilidade" className="gap-1.5">
              <LayoutGrid className="h-4 w-4" /> Disponibilidade
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── EQUIPES ── */}
        <TabsContent value="equipes" className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {teams.filter((t) => t.active).length} ativa{teams.filter((t) => t.active).length !== 1 ? 's' : ''}
                {teams.filter((t) => !t.active).length > 0 &&
                  ` · ${teams.filter((t) => !t.active).length} inativa${teams.filter((t) => !t.active).length !== 1 ? 's' : ''}`}
              </span>
            </div>
            <Button onClick={() => { setEditingTeam(null); setTeamDialogOpen(true); }} size="sm">
              <Plus className="h-4 w-4 mr-1.5" /> Nova equipe
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : teams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Users className="h-10 w-10 opacity-30" />
              <p className="text-sm">Nenhuma equipe cadastrada.</p>
              <Button variant="outline" size="sm" onClick={() => setTeamDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" /> Criar primeira equipe
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {teams.map((team) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  onEdit={(t) => { setEditingTeam(t); setTeamDialogOpen(true); }}
                  onDelete={deleteTeam}
                  onToggleActive={toggleTeamActive}
                  onAddMember={(t) => setMemberDialogTeam(t)}
                  onRemoveMember={removeMember}
                  onChangeRole={(memberId, role, teamId) => changeMemberRole(memberId, role, teamId)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── RECURSOS ── */}
        <TabsContent value="recursos" className="mt-6">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={resourceFilter} onValueChange={setResourceFilter}>
                <SelectTrigger className="h-8 w-44">
                  <SelectValue placeholder="Filtrar por..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os recursos</SelectItem>
                  <SelectItem value="unassigned">Sem equipe</SelectItem>
                  <SelectItem value="veiculo">Veículos</SelectItem>
                  <SelectItem value="ferramenta">Ferramentas</SelectItem>
                  <SelectItem value="equipamento">Equipamentos</SelectItem>
                  <SelectItem value="disponivel">Disponíveis</SelectItem>
                  <SelectItem value="em_uso">Em uso</SelectItem>
                  <SelectItem value="manutencao">Em manutenção</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">
                {filteredResources.length} recurso{filteredResources.length !== 1 ? 's' : ''}
              </span>
            </div>
            <Button
              size="sm"
              onClick={() => { setEditingResource(null); setResourceDialogOpen(true); }}
            >
              <Plus className="h-4 w-4 mr-1.5" /> Novo recurso
            </Button>
          </div>

          {filteredResources.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Package2 className="h-10 w-10 opacity-30" />
              <p className="text-sm">Nenhum recurso encontrado.</p>
              <Button variant="outline" size="sm" onClick={() => setResourceDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" /> Cadastrar recurso
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredResources.map((r) => {
                const Icon = RESOURCE_ICONS[r.type];
                const assignedTeam = teams.find((t) => t.id === r.team_id);
                return (
                  <Card key={r.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{r.name}</p>
                            <p className="text-xs text-muted-foreground">{RESOURCE_TYPE_LABELS[r.type]}</p>
                          </div>
                        </div>
                        <Badge className={`text-xs flex-shrink-0 ${STATUS_COLORS[r.status]}`} variant="outline">
                          {RESOURCE_STATUS_LABELS[r.status]}
                        </Badge>
                      </div>

                      {r.description && (
                        <p className="text-xs text-muted-foreground mt-2 truncate">{r.description}</p>
                      )}

                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-muted-foreground">
                          {assignedTeam ? (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" /> {assignedTeam.name}
                            </span>
                          ) : (
                            'Sem equipe'
                          )}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => { setEditingResource(r); setResourceDialogOpen(true); }}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                            onClick={() => deleteResource(r.id)}
                          >
                            Excluir
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── DISPONIBILIDADE ── */}
        <TabsContent value="disponibilidade" className="mt-6">
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              Próximos 30 dias — blocos indicam tarefas do cronograma vinculadas à equipe.
            </p>
          </div>
          <TeamAvailabilityGrid teams={teams} tasks={mappedTasks} onDayClick={handleAvailabilityDayClick} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AddTeamDialog
        open={teamDialogOpen}
        onClose={() => { setTeamDialogOpen(false); setEditingTeam(null); }}
        onSave={handleSaveTeam}
        initial={editingTeam ? { name: editingTeam.name, description: editingTeam.description ?? '' } : undefined}
      />

      {memberDialogTeam && (
        <AddMemberDialog
          open={!!memberDialogTeam}
          onClose={() => setMemberDialogTeam(null)}
          onSave={(userId, role) => addMember(memberDialogTeam.id, userId, role)}
          existingMembers={memberDialogTeam.members ?? []}
        />
      )}

      <AddResourceDialog
        open={resourceDialogOpen}
        onClose={() => { setResourceDialogOpen(false); setEditingResource(null); }}
        onSave={handleSaveResource}
        teams={teams}
        initial={editingResource ?? undefined}
      />
    </div>
  );
};

export default Teams;

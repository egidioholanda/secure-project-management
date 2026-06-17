import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  UserCheck, Users, Wrench, Car, Package2, Plus, Trash2,
  MoreVertical, Pencil, UserPlus, Power,
} from 'lucide-react';
import type { Team, TeamMember, TeamMemberRole } from '@/types/teams';
import { ROLE_LABELS, RESOURCE_TYPE_LABELS } from '@/types/teams';

const RESOURCE_ICONS = {
  veiculo: Car,
  ferramenta: Wrench,
  equipamento: Package2,
};

const STATUS_COLORS = {
  disponivel: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  em_uso: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  manutencao: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

interface Props {
  team: Team;
  onEdit: (team: Team) => void;
  onDelete: (teamId: string) => void;
  onToggleActive: (teamId: string, active: boolean) => void;
  onAddMember: (team: Team) => void;
  onRemoveMember: (memberId: string) => void;
  onChangeRole: (memberId: string, role: TeamMemberRole, teamId: string) => void;
}

const memberName = (m: TeamMember) =>
  m.profile?.full_name ?? m.profile?.email ?? 'Usuário';

const TeamCard = ({
  team, onEdit, onDelete, onToggleActive, onAddMember, onRemoveMember, onChangeRole,
}: Props) => {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const responsavel = team.members?.find((m) => m.role === 'responsavel');
  const tecnicos = team.members?.filter((m) => m.role === 'tecnico') ?? [];
  const memberCount = team.members?.length ?? 0;

  return (
    <Card className={`transition-opacity ${team.active ? '' : 'opacity-60'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-base truncate">{team.name}</h3>
              <Badge variant={team.active ? 'default' : 'secondary'} className="text-xs">
                {team.active ? 'Ativa' : 'Inativa'}
              </Badge>
            </div>
            {team.description && (
              <p className="text-sm text-muted-foreground mt-0.5 truncate">{team.description}</p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(team)}>
                <Pencil className="h-4 w-4 mr-2" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddMember(team)}>
                <UserPlus className="h-4 w-4 mr-2" /> Adicionar membro
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleActive(team.id, !team.active)}>
                <Power className="h-4 w-4 mr-2" /> {team.active ? 'Desativar' : 'Ativar'}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Responsável */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            <UserCheck className="h-3.5 w-3.5" />
            Responsável
          </div>
          {responsavel ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                  {memberName(responsavel).charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium">{memberName(responsavel)}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={() => onRemoveMember(responsavel.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full border-dashed h-8 text-muted-foreground"
              onClick={() => onAddMember(team)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Definir responsável
            </Button>
          )}
        </div>

        <Separator />

        {/* Técnicos */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <Users className="h-3.5 w-3.5" />
              Técnicos ({tecnicos.length})
            </div>
            {memberCount < 3 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onAddMember(team)}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <div className="space-y-1.5">
            {tecnicos.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                    {memberName(m).charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm">{memberName(m)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground"
                    onClick={() => onChangeRole(m.id, 'responsavel', team.id)}
                    title="Tornar responsável"
                  >
                    <UserCheck className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemoveMember(m.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
            {tecnicos.length === 0 && (
              <p className="text-sm text-muted-foreground italic">Nenhum técnico</p>
            )}
          </div>
        </div>

        {/* Recursos */}
        {(team.resources?.length ?? 0) > 0 && (
          <>
            <Separator />
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                <Package2 className="h-3.5 w-3.5" />
                Recursos ({team.resources!.length})
              </div>
              <div className="space-y-1.5">
                {team.resources!.map((r) => {
                  const Icon = RESOURCE_ICONS[r.type];
                  return (
                    <div key={r.id} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">{r.name}</span>
                      </div>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status]}`}>
                        {r.status === 'disponivel' ? 'Ok' : r.status === 'em_uso' ? 'Em uso' : 'Manutenção'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Confirm delete */}
        {confirmDelete && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-2">
            <p className="text-sm text-destructive font-medium">Confirmar exclusão da equipe?</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                className="h-7 text-xs"
                onClick={() => { onDelete(team.id); setConfirmDelete(false); }}
              >
                Excluir
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => setConfirmDelete(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TeamCard;

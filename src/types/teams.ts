export type TeamMemberRole = 'responsavel' | 'tecnico';
export type ResourceType = 'veiculo' | 'ferramenta' | 'equipamento';
export type ResourceStatus = 'disponivel' | 'em_uso' | 'manutencao';

export interface TeamMemberProfile {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamMemberRole;
  created_at: string;
  profile?: TeamMemberProfile;
}

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  description?: string | null;
  status: ResourceStatus;
  team_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  members?: TeamMember[];
  resources?: Resource[];
}

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  veiculo: 'Veículo',
  ferramenta: 'Ferramenta',
  equipamento: 'Equipamento',
};

export const RESOURCE_STATUS_LABELS: Record<ResourceStatus, string> = {
  disponivel: 'Disponível',
  em_uso: 'Em uso',
  manutencao: 'Em manutenção',
};

export const ROLE_LABELS: Record<TeamMemberRole, string> = {
  responsavel: 'Responsável',
  tecnico: 'Técnico',
};

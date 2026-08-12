/**
 * Fonte única das etapas comerciais.
 *
 * Antes isto vivia triplicado — colunas do Kanban em Opportunities.tsx,
 * badge em OpportunityCard.tsx e funil em DashboardComercial.tsx — e as
 * cores já tinham divergido entre as cópias.
 *
 * O funil comercial responde "vamos vender?". Assim que existe pedido do
 * cliente o negócio é `ganha`, vira projeto, e a partir daí quem responde
 * "quando recebemos?" é o pipeline de faturamento do Financeiro
 * (project_phases). Por isso NÃO existe aqui nenhuma etapa de faturamento:
 * o produto é faturado na fase 5 e o serviço na fase 10, lá.
 */

export type SalesStage =
  | "qualificacao"
  | "proposta"
  | "negociacao"
  | "ganha"
  | "perdida";

export interface StageDef {
  key: SalesStage;
  label: string;
  description: string;
  color: string;
  /** classes do badge no card */
  badgeClass: string;
  /** dias na etapa a partir dos quais o card acende */
  slaDays: number;
}

/** As 4 colunas do quadro, na ordem. `perdida` fica fora — é estado terminal. */
export const STAGES: StageDef[] = [
  {
    key: "qualificacao",
    label: "Qualificação",
    description: "Demanda existe, escopo e valor ainda não são confiáveis",
    color: "#6366f1",
    badgeClass: "bg-muted text-muted-foreground",
    slaDays: 14,
  },
  {
    key: "proposta",
    label: "Proposta Enviada",
    description: "Documento formal com o cliente, com produto e serviço discriminados",
    color: "#f59e0b",
    badgeClass: "bg-amber-500/10 text-amber-500",
    slaDays: 15,
  },
  {
    key: "negociacao",
    label: "Negociação",
    description: "Cliente respondeu; ajuste de preço, escopo ou prazo",
    color: "#f97316",
    badgeClass: "bg-orange-500/10 text-orange-500",
    slaDays: 10,
  },
  {
    key: "ganha",
    label: "Ganha",
    description: "Pedido do cliente recebido — abrir o projeto",
    color: "#10b981",
    badgeClass: "bg-emerald-500/10 text-emerald-500",
    slaDays: 2,
  },
];

export const LOST_STAGE: StageDef = {
  key: "perdida",
  label: "Perdida",
  description: "Negócio encerrado sem venda",
  color: "#ef4444",
  badgeClass: "bg-destructive/10 text-destructive",
  slaDays: 0,
};

export const ALL_STAGES: StageDef[] = [...STAGES, LOST_STAGE];

export const getStage = (key: string): StageDef =>
  ALL_STAGES.find((s) => s.key === key) ?? STAGES[0];

export const stageRank = (key: string): number =>
  STAGES.findIndex((s) => s.key === key);

/** Motivos de perda — obrigatórios, para a taxa de ganho significar algo */
export const LOSS_REASONS = [
  "Preço",
  "Prazo",
  "Concorrente",
  "Cliente adiou",
  "Escopo inviável",
  "Sem resposta",
  "Outro",
];

/** Sistemas vendidos. Estava duplicado em 3 arquivos como ALL_TYPES/SERVICE_TYPES. */
export const SYSTEM_TYPES = [
  "CFTV",
  "Controle de Acesso",
  "Alarme Perimetral",
  "Sistema Integrado",
  "Automação",
];

// ── Dinheiro ─────────────────────────────────────────────────────────────────
// Os valores agora são numeric no banco. Estes helpers existem para a UI e
// para tolerar registros legados que ainda cheguem como texto.

export const toNumber = (v: number | string | null | undefined): number => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (!v) return 0;
  const n = parseFloat(
    String(v).replace(/[^\d.,]/g, "").replace(/\./g, "").replace(",", "."),
  );
  return isNaN(n) ? 0 : n;
};

export const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export const formatCompact = (v: number): string => {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(2).replace(".", ",")} mi`;
  if (v >= 1_000) return `R$ ${Math.round(v / 1_000)} mil`;
  return BRL.format(v);
};

/** Detecta o hábito antigo de batizar a oportunidade de "X - Produtos" */
const SUFFIX_RE = /\s*[-–]\s*(produtos?|prdutos?|servi[cç]os?)\s*$/i;

export const hasProductServiceSuffix = (title: string): boolean =>
  SUFFIX_RE.test(title.trim());

export const stripSuffix = (title: string): string =>
  title.trim().replace(SUFFIX_RE, "").trim();

/** Chave de comparação para achar negócios repetidos do mesmo cliente */
export const dealKey = (title: string, client: string): string =>
  `${stripSuffix(title).toLowerCase()}|${client.trim().toLowerCase()}`;

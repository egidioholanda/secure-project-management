/**
 * Filtro de período mês a mês.
 *
 * Antes as três telas tinham a mesma lista de "últimos 3/6 meses", que só
 * responde "quanto veio desde então" — não dá para comparar julho com agosto,
 * nem fechar um mês. Agora cada mês é uma opção, e só aparecem os meses que
 * têm dados, para a lista não encher de meses vazios.
 */

export const ALL_PERIODS = "all";

/** "2026-07" */
export const monthKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

const toDate = (v: string | Date | null | undefined): Date | null => {
  if (!v) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  // "2026-08-01" é lido como UTC pelo construtor, e em UTC-3 volta para 31/07 —
  // colunas `date` (closed_at) cairiam no mês anterior. Parse como data local.
  const m = DATE_ONLY.exec(v);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** "2026-07" -> "Julho 2026" */
export const monthLabel = (key: string): string => {
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) return key;
  const mes = new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long" });
  return `${mes.charAt(0).toUpperCase()}${mes.slice(1)} ${y}`;
};

export interface PeriodOption {
  value: string;
  label: string;
}

/**
 * Opções a partir das datas de referência existentes, da mais recente para a
 * mais antiga. A data de referência é escolhida por cada tela: no comercial é
 * o fechamento do negócio; no financeiro, o faturamento.
 */
export function buildMonthOptions(
  dates: (string | Date | null | undefined)[],
): PeriodOption[] {
  const keys = new Set<string>();
  for (const raw of dates) {
    const d = toDate(raw);
    if (d) keys.add(monthKey(d));
  }
  return [
    { value: ALL_PERIODS, label: "Todos os períodos" },
    ...Array.from(keys)
      .sort((a, b) => b.localeCompare(a))
      .map((k) => ({ value: k, label: monthLabel(k) })),
  ];
}

/** A data cai no período selecionado? */
export function matchesPeriod(
  date: string | Date | null | undefined,
  period: string,
): boolean {
  if (period === ALL_PERIODS) return true;
  const d = toDate(date);
  // sem data de referência o registro não pertence a mês nenhum
  if (!d) return false;
  return monthKey(d) === period;
}

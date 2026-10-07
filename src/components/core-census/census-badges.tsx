import type { CensusTier, RecordOutcome } from "@/lib/core-census/tier";
import { RECORD_OUTCOME_LABEL } from "@/lib/core-census/tier";
import type { RequirementStatus } from "@/lib/core-census/requirements";

const TIER_CLASS: Record<CensusTier, string> = {
  S: "border-amber-400/60 bg-amber-400/10 text-amber-300",
  A: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
  B: "border-rose-500/50 bg-rose-500/10 text-rose-400",
};

export const TIER_HINT: Record<CensusTier, string> = {
  S: "No faltó a ningún evento del mes y estuvo siempre en Discord",
  A: "Faltó 1 o 2 veces en el mes",
  B: "Faltó 3 veces o más en el mes",
};

export function TierBadge({ tier }: { tier: CensusTier | null }) {
  if (!tier) return <span className="text-xs text-muted">Sin datos</span>;
  return (
    <span
      title={TIER_HINT[tier]}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-md border text-sm font-bold ${TIER_CLASS[tier]}`}
    >
      {tier}
    </span>
  );
}

export const REQUIREMENT_STATUS_CLASS: Record<RequirementStatus, string> = {
  ok: "text-emerald-400",
  fail: "text-rose-400",
  pending: "text-muted",
  neutral: "text-foreground",
};

const OUTCOME_CLASS: Record<RecordOutcome, string> = {
  ATTENDED: "text-emerald-400 border-emerald-500/40",
  NO_DISCORD: "text-rose-400 border-rose-500/40",
  ABSENT: "text-rose-400 border-rose-500/40",
  JUSTIFIED: "text-sky-400 border-sky-500/40",
};

export function OutcomeBadge({ outcome }: { outcome: RecordOutcome }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${OUTCOME_CLASS[outcome]}`}>
      {RECORD_OUTCOME_LABEL[outcome]}
    </span>
  );
}

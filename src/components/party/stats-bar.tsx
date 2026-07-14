import type { Player, Party } from "@/types/party";

interface StatCardProps {
  label: string;
  value: number;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="stat-card">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  );
}

interface StatsBarProps {
  players: Player[];
  parties: Party[];
  unassignedCount: number;
  completeCount: number;
}

export function StatsBar({ players, parties, unassignedCount, completeCount }: StatsBarProps) {
  return (
    <div className="stats-bar">
      <StatCard label="Jugadores" value={players.length} />
      <StatCard label="Parties" value={parties.length} />
      <StatCard label="Sin asignar" value={unassignedCount} />
      <StatCard label="Completas" value={completeCount} />
    </div>
  );
}

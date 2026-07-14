"use client";

import type { ReactNode } from "react";
import { Swords, Crown, Info } from "lucide-react";
import type { EventType } from "@/types/party";

interface EventCardProps {
  icon: ReactNode;
  title: string;
  tooltip: string;
  onClick: () => void;
}

function EventCard({ icon, title, tooltip, onClick }: EventCardProps) {
  return (
    <button className="event-card" onClick={onClick} type="button">
      <div className="event-card-tooltip-wrap">
        <Info size={16} className="event-card-info" />
        <div className="event-card-tooltip">{tooltip}</div>
      </div>
      <div className="event-card-icon">{icon}</div>
      <span className="event-card-title">{title}</span>
    </button>
  );
}

interface EventSelectorProps {
  onSelect: (event: EventType) => void;
}

export function EventSelector({ onSelect }: EventSelectorProps) {
  return (
    <div className="event-selector">
      <h1 className="app-title heading-gradient">Party Builder</h1>
      <p className="event-selector-subtitle">¿Para qué tipo de evento quieres armar parties?</p>
      <div className="event-grid">
        <EventCard
          icon={<Swords size={36} />}
          title="Guild League"
          tooltip="40 jugadores Élite participan en el Campo Principal, donde se decide la victoria. El resto entra al Campo Secundario, derrotando monstruos para dar buffs a los compañeros. Al reaparecer pueden recibir efectos aleatorios que cambian el resultado de la pelea."
          onClick={() => onSelect("guild")}
        />
        <EventCard
          icon={<Crown size={36} />}
          title="Emperium Overrun"
          tooltip="Objetivo: controlar la mayor cantidad de ciudades posible. El mapa tiene 27 ciudades en 3 niveles. Cada gremio puede controlar hasta 5 ciudades; las de mayor nivel dan más puntos. Aparecen Glory Bounties con enfrentamientos masivos y acceso a MVP exclusivos."
          onClick={() => onSelect("emperium")}
        />
      </div>
    </div>
  );
}

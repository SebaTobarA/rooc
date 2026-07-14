"use client";

import { useState, type KeyboardEvent } from "react";
import { Upload } from "lucide-react";
import { Campo } from "@/components/party/campo";
import { SlotPicker } from "@/components/party/slot-picker";
import { useCampo } from "@/lib/party/use-campo";
import type { SlotLabel } from "@/types/party";

const PLACEHOLDER = "Nick1,Crusader;Nick2,Wizard";

export function GuildLeague({ canManageParty }: { canManageParty: boolean }) {
  const campo1 = useCampo(undefined, { maxPlayers: 40 });
  const campo2 = useCampo(undefined, { maxPlayers: 40 });

  const [raw1, setRaw1] = useState("");
  const [raw2, setRaw2] = useState("");
  const [importMsg, setImportMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [copySlots, setCopySlots] = useState(true);

  function handleImport() {
    const t1 = raw1.trim();
    const t2 = raw2.trim();
    if (!t1 && !t2) return;

    let totalAdded = 0;
    const allSkipped: string[] = [];
    let r1, r2;

    if (t1) {
      r1 = campo1.importPlayers(t1);
      totalAdded += r1.added;
      allSkipped.push(...r1.skipped);
      setRaw1("");
    }
    if (t2) {
      r2 = campo2.importPlayers(t2);
      totalAdded += r2.added;
      allSkipped.push(...r2.skipped);
      setRaw2("");
    }

    const limitErrors = [r1?.limitError, r2?.limitError].filter(Boolean).join(" ");

    if (totalAdded > 0) {
      const msg = `${totalAdded} jugador(es) importado(s)${allSkipped.length ? `. Omitidos: ${allSkipped.join(", ")}` : ""}${limitErrors ? ` ⚠ ${limitErrors}` : ""}.`;
      setImportMsg({ text: msg, ok: true });
    } else if (limitErrors) {
      setImportMsg({ text: `⚠ ${limitErrors}`, ok: false });
    } else {
      setImportMsg({ text: `Sin resultados válidos. Omitidos: ${allSkipped.join(", ")}`, ok: false });
    }
    setTimeout(() => setImportMsg(null), 4000);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleImport();
  }

  function handleComps1(comps: SlotLabel[][]) {
    campo1.setCompositions(comps);
    if (copySlots) campo2.setCompositions(comps);
  }

  function handleCopySlots(checked: boolean) {
    setCopySlots(checked);
    if (checked) campo2.setCompositions(campo1.compositions);
  }

  return (
    <div className="guild-layout">
      {/* ── Sección de importación dual ── */}
      <div className="gl-import-section">
        <p className="import-hint">
          Pega tu lista desde Excel o escribe: <code>Nick,Clase;Nick,Clase</code>
        </p>
        <div className="gl-import-grid">
          <div className="gl-import-col">
            <p className="gl-import-heading">Campo Principal (Élite)</p>
            <textarea
              className="import-textarea"
              rows={4}
              placeholder={PLACEHOLDER}
              value={raw1}
              onChange={(e) => setRaw1(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="gl-import-col">
            <p className="gl-import-heading">Campo Secundario</p>
            <textarea
              className="import-textarea"
              rows={4}
              placeholder={PLACEHOLDER}
              value={raw2}
              onChange={(e) => setRaw2(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>
        <div className="import-actions">
          <button className="btn btn-primary" onClick={handleImport}>
            <Upload size={14} />
            Importar ambos campos
          </button>
        </div>
        {importMsg && (
          <p className={`import-message ${importMsg.ok ? "success" : "error"}`}>{importMsg.text}</p>
        )}
      </div>

      {/* ── Composición Campo Principal ── */}
      <SlotPicker
        title="Composición de Party para campo principal"
        compositions={campo1.compositions}
        onChange={handleComps1}
        extraFooter={
          <label className="copy-slots-label">
            <input
              type="checkbox"
              checked={copySlots}
              onChange={(e) => handleCopySlots(e.target.checked)}
            />
            <span>Aplicar misma composición al Campo Secundario</span>
          </label>
        }
      />

      {/* ── Campo Principal ── */}
      <Campo
        label="Campo Principal (Élite)"
        campo={campo1}
        showSlotsImmediately
        hideImport
        hideSlotPicker
        saveTemplate={{ event: "GUILD_LEAGUE", canManageParty }}
      />

      <hr className="campo-divider" />

      {/* ── Campo Secundario ── */}
      <Campo
        label="Campo Secundario"
        campo={campo2}
        showSlotsImmediately
        hideImport
        hideSlotPicker={copySlots}
        saveTemplate={{ event: "GUILD_LEAGUE", canManageParty }}
      />
    </div>
  );
}

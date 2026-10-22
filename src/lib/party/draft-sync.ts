/**
 * Sincronización del borrador compartido en el navegador, un canal por tipo
 * de evento. Guarda el último borrador confirmado por el servidor y las
 * operaciones propias que todavía no se confirman; lo que se ve es el
 * confirmado con esas operaciones aplicadas encima, así cada cambio se ve al
 * instante aunque el envío tarde, y lo que llega de otros oficiales no borra
 * lo que uno está haciendo.
 *
 * Las operaciones se envían en lotes, de a un lote a la vez y en orden. Si
 * un envío falla se reintenta: las operaciones son idempotentes, así que
 * reenviarlas no duplica nada. Se usa con useSyncExternalStore.
 */

import { applyPartyDraftOps } from "@/lib/actions/party-templates";
import { applyDraftOps, type DraftBoard, type DraftEventType, type DraftOp, type DraftPayload } from "@/lib/party/draft-ops";

export type DraftSyncStatus = "saved" | "saving" | "retrying";

export interface DraftView {
  /** Tablero a mostrar: el confirmado más los cambios propios en camino. */
  board: DraftBoard;
  /** El último borrador confirmado por el servidor. */
  confirmed: DraftPayload;
  status: DraftSyncStatus;
  /** true si el borrador (con los cambios en camino) difiere de lo publicado. */
  unpublished: boolean;
}

const MAX_RETRIES = 4;

export class DraftChannel {
  private confirmed: DraftPayload;
  private inflight: DraftOp[] = [];
  private queue: DraftOp[] = [];
  private failures = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private view: DraftView;
  private listeners = new Set<() => void>();

  constructor(
    private readonly event: DraftEventType,
    initial: DraftPayload,
    /** Avisos para mostrar: cambios que el servidor no pudo aplicar o envíos fallidos. */
    private readonly onProblem: (text: string) => void,
    /** false para quien solo mira: nunca envía nada. */
    private readonly editable: boolean
  ) {
    this.confirmed = initial;
    this.view = this.buildView();
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): DraftView => this.view;

  get version(): number {
    return this.confirmed.version;
  }

  /** true mientras quedan cambios propios sin confirmar. */
  get busy(): boolean {
    return this.inflight.length > 0 || this.queue.length > 0;
  }

  private buildView(): DraftView {
    const pending = [...this.inflight, ...this.queue];
    return {
      board: pending.length > 0 ? applyDraftOps(this.confirmed.board, pending) : this.confirmed.board,
      confirmed: this.confirmed,
      status: this.retryTimer ? "retrying" : pending.length > 0 ? "saving" : "saved",
      unpublished: pending.length > 0 || this.confirmed.version !== this.confirmed.publishedVersion,
    };
  }

  private emit() {
    this.view = this.buildView();
    for (const listener of this.listeners) listener();
  }

  /** Aplica un cambio propio: se ve de inmediato y se envía al servidor. */
  push(op: DraftOp) {
    if (!this.editable) return;
    // Al escribir un nombre cada tecla es un cambio: basta con el último.
    const last = this.queue.at(-1);
    if (last && (op.kind === "renameParty" || op.kind === "renameRaid") && last.kind === op.kind && last.id === op.id) {
      this.queue[this.queue.length - 1] = op;
    } else {
      this.queue.push(op);
    }
    this.emit();
    void this.flush();
  }

  /** Un borrador recibido del servidor (consulta periódica o respuesta a un envío). */
  receive(payload: DraftPayload) {
    if (payload.version < this.confirmed.version) return;
    if (
      payload.version === this.confirmed.version &&
      payload.publishedVersion === this.confirmed.publishedVersion &&
      payload.publishedAt === this.confirmed.publishedAt
    ) {
      return;
    }
    this.confirmed = payload;
    this.emit();
  }

  private async flush(): Promise<void> {
    if (this.inflight.length > 0 || this.queue.length === 0 || this.retryTimer) return;
    this.inflight = this.queue;
    this.queue = [];
    try {
      const result = await applyPartyDraftOps(this.event, this.inflight);
      this.inflight = [];
      this.failures = 0;
      // La respuesta ya incluye estos cambios: se acepta aunque la versión
      // no haya subido (todo se rechazó o no cambiaba nada).
      if (result.draft.version >= this.confirmed.version) this.confirmed = result.draft;
      if (result.errors.length > 0) this.onProblem([...new Set(result.errors)].join(" "));
      this.emit();
    } catch (err) {
      this.failures++;
      if (this.failures > MAX_RETRIES) {
        // Sin conexión hace rato o el servidor rechaza el lote: se descarta
        // para no quedar trabado, y se avisa.
        this.inflight = [];
        this.failures = 0;
        this.onProblem(
          `No se pudo guardar un cambio en el borrador: ${err instanceof Error ? err.message : "error de conexión"}.`
        );
        this.emit();
      } else {
        // Se reintenta el mismo lote (más lo que se haya sumado) en un rato.
        this.queue = [...this.inflight, ...this.queue];
        this.inflight = [];
        this.retryTimer = setTimeout(() => {
          this.retryTimer = null;
          this.emit();
          void this.flush();
        }, 1000 * this.failures);
        this.emit();
        return;
      }
    }
    void this.flush();
  }

  /** Espera a que no queden cambios propios sin confirmar. */
  idle(): Promise<void> {
    return new Promise((resolve) => {
      const check = () => {
        if (!this.busy) {
          unsubscribe();
          resolve();
        }
      };
      const unsubscribe = this.subscribe(check);
      check();
    });
  }

  /** Marca localmente como publicada una versión (la respuesta de "Guardar composición"). */
  markPublished(version: number) {
    if (version !== this.confirmed.version) return;
    // Quién publicó llega con la próxima consulta del borrador.
    this.confirmed = { ...this.confirmed, publishedVersion: version, publishedAt: new Date().toISOString() };
    this.emit();
  }
}
